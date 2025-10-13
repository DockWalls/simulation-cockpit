require('./config.js');
console.log('Server script started!');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { z } = require('zod');
const { requireAuth } = require('./auth');
const crypto = require('crypto');
const { getSignedUploadUrl, getObjectBytes, putObjectWithHold, holdObject, readObject } = require('./gcs.js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { redis } = require('./redis');
const { verifyWithAnyKey } = require('./crypto/evidence');
const { BigQuery } = require('@google-cloud/bigquery');
const { queue, defaultJobOptions } = require('./jobs/queue');
const multer = require('multer');
const path = require('path');
const fs   = require('fs');

// Multer in-memory storage + sane limits (adjust as needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,   // 12MB max
    files: 1,
    fields: 10
  }
});

// PNG magic bytes
const PNG_SIG = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

const app = express();
const server = http.createServer(app);

const bq = new BigQuery({ projectId: process.env.GCP_PROJECT });

const io = socketIO(server, {
  cors: {
    origin: "https://simulation-cockpit.web.app",
    methods: ["GET", "POST"]
  }
});

app.use(helmet({
  contentSecurityPolicy: false, // keep off if you inject inline dev; we’ll set CSP below
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cors({ origin: [/^https:\/\/(dev|stg|prod)\.jverse\.yourco\.com$/], credentials: true }));

const evidenceLimiter = rateLimit({
  windowMs: 60_000,          // 1 minute
  limit: 30,                 // 30 evidence posts/min/tenant
  keyGenerator: (req) => req.ctx?.tenant || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/evidence/avatars', evidenceLimiter);

app.use(express.static('public'));
app.use(express.json({ limit: '25mb' }));

// Serve /.well-known/* from the backend's public folder
app.use('/.well-known', express.static(
  path.join(__dirname, 'public/.well-known')
));

app.get('/healthz', (_req,res)=>res.json({ok:true, ts:new Date().toISOString()}));
app.get('/readyz', async (_req, res) => {
  try {
    // Redis ping
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error('redis');

    // GCS test (metadata for a non-existent object is overkill—just bucket access)
    await getSignedUploadUrl({ tenant: 'system', traceId: 'readyz', sha256: '0'.repeat(64) });

    // BigQuery test
    await bq.dataset(process.env.BQ_DATASET || 'jverse_audit').table(process.env.BQ_TABLE || 'avatar_evidence_v1').getMetadata();


    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});


const EvidenceSchema = z.object({
  trace_id: z.string().min(3),
  ts: z.string().datetime(),
  tenant: z.string().min(1),
  actor: z.string().min(1),
  role: z.string().min(1),
  inputs: z.object({
    png_sha256: z.string().length(64).regex(/^[0-9a-f]+$/),
    png_name: z.string().min(1)
  }),
  outputs: z.object({
    glb_sha256: z.string().length(64).regex(/^[0-9a-f]+$/),
    size_bytes: z.number().int().positive(),
    extensions: z.array(z.string())
  }),
  validator: z.object({
    passed: z.boolean(),
    report: z.record(z.any()),
    tool: z.string(),
    version: z.string()
  }),
  policy: z.object({
    clause: z.literal('avatar.generate'),
    decision: z.enum(['allow','deny']),
    reasons: z.array(z.string()).optional()
  })
});

async function writeLedgerRow({ req, evidencePath }) {
  const datasetId = process.env.BQ_DATASET || 'jverse_audit';
  const tableId   = process.env.BQ_TABLE   || 'avatar_evidence_v1';
  const table = bq.dataset(datasetId).table(tableId);

  const row = {
    ts:        new Date().toISOString(),
    tenant:    req.ctx.tenant,       // from JWT middleware
    actor:     req.ctx.actor,
    role:      req.ctx.role,
    trace_id:  req.body.trace_id,
    decision:  req.body.policy?.decision || 'unknown',
    glb_sha256:req.body.outputs?.glb_sha256 || null,
    size_bytes:req.body.outputs?.size || req.body.outputs?.size_bytes || null,
    hold:      true,
    evidence_gcs: `gs://${process.env.GCS_BUCKET}/${evidencePath}`
  };

  // insertId enables best-effort dedupe for streaming inserts
  const insert = { insertId: `trace:${row.trace_id}`, json: row };

  try {
    await table.insert([insert], {
      raw: false,
      ignoreUnknownValues: true,   // forward-compatible schema
      skipInvalidRows: false
    });
    return { ok: true };
  } catch (err) {
    // BigQuery streaming returns an array of insertErrors
    // Treat duplicate insertId as idempotent success.
    const msg = (err && err.errors && JSON.stringify(err.errors)) || err.message || String(err);
    if (msg.includes('duplicate') || msg.includes('already exists')) {
      return { ok: true, duplicate: true };
    }
    throw err;
  }
}


// In-memory job store (mock)
const jobs = new Map();

// Start: issues a fake signed URL + jobId
app.post('/api/autorig/start', requireAuth, (req, res) => {
  const jobId = `jr_${Math.random().toString(36).slice(2)}`;
  console.log(JSON.stringify({ message: 'Auto-rig job started', jobId, ...req.ctx }));
  // In real life, generate a pre-signed PUT URL to your storage.
  const uploadUrl = `/api/autorig/upload/${jobId}`; // mock
  jobs.set(jobId, { status: 'waiting_upload', riggedUrl: null });
  res.json({ jobId, uploadUrl });
});

// Mock upload sink (stores the uploaded GLB in memory and "processes" it)
app.put('/api/autorig/upload/:jobId', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).end();

  console.log(JSON.stringify({ message: 'Auto-rig file uploaded', jobId, size: req.body.length }));
  // Pretend to process and produce a rigged file; here we just echo the bytes.
  // In real life, call your provider, then store to object storage and keep a signed GET URL.
  const riggedKey = Buffer.from(req.body); // placeholder
  job.status = 'succeeded';
  // Expose a temporary GET endpoint for the rigged data.
  job.riggedUrl = `/api/autorig/rigged/${jobId}`;
  job._riggedBytes = riggedKey;
  jobs.set(jobId, job);
  res.status(200).end();
});

// Download rigged result
app.get('/api/autorig/rigged/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || !job._riggedBytes) return res.status(404).end();
  res.setHeader('Content-Type', 'model/gltf-binary');
  res.send(job._riggedBytes);
});

// Poll status
app.get('/api/autorig/status', requireAuth, (req, res) => {
  const job = jobs.get(req.query.jobId);
  if (!job) return res.json({ status: 'not_found' });
  res.json({ status: job.status, riggedUrl: job.riggedUrl || null });
});

app.post('/api/evidence/uploads', requireAuth, async (req, res) => {
  try {
    const { trace_id, glb_sha256 } = req.body || {};
    if (!trace_id || !/^[0-9a-f]{64}$/.test(glb_sha256 || '')) {
      return res.status(400).json({ error: 'trace_id and valid glb_sha256 are required' });
    }
    const { tenant } = req.ctx;
    const { url, objectPath } = await getSignedUploadUrl({
      tenant, traceId: trace_id, sha256: glb_sha256
    });
    res.status(200).json({ url, objectPath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'signed url error' });
  }
});

// Endpoint to receive evidence bundles
app.post('/api/evidence/avatars', requireAuth, async (req, res) => {
  const { tenant, actor, role } = req.ctx;
  const { trace_id } = req.body;
  if (!trace_id) return res.status(400).json({ error: 'trace_id required' });

  const idemKey = `evidence:${tenant}:${trace_id}`;
  const reserved = await redis.set(idemKey, 'reserved', 'NX', 'EX', process.env.IDEM_TTL_SEC || 900);
  if (!reserved) return res.status(409).json({ error: 'duplicate trace_id' });

  try {
    // Fill server-side identity
    const enriched = {
      ...req.body,
      tenant,
      actor,
      role,
    };

    // Validate schema
    const parsed = EvidenceSchema.safeParse(enriched);
    if (!parsed.success) {
      await redis.del(idemKey); // allow retry
      return res.status(400).json({ error: parsed.error.issues });
    }

    const evidence = parsed.data;

    // Re-hash the uploaded GLB and verify integrity
    const glbPath = `evidence/${evidence.tenant}/${evidence.trace_id}/${evidence.outputs.glb_sha256}.glb`;
    const bytes = await getObjectBytes(glbPath).catch(() => null);
    if (!bytes) {
      await redis.del(idemKey); // allow retry
      return res.status(404).json({ error: 'GLB not uploaded' });
    }

    const actual = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actual !== evidence.outputs.glb_sha256) {
      await redis.del(idemKey); // allow retry
      return res.status(409).json({ error: 'hash mismatch' });
    }

    const trustedEvidence = {
      _schema: 'https://schemas.jverse/avatars/evidence/v1',
      ts: new Date().toISOString(),
      tenant,
      actor,
      role,
      payload: evidence,
    };

    const { canonical, sig } = signEvidence(trustedEvidence);

    // Sidecar path next to GLB:
    const sidecarPath = glbPath.replace(/\.glb$/i, '.evidence.json');
    const sigPath = glbPath.replace(/\.glb$/i, '.evidence.sig');


    await holdObject(glbPath); // GLB WORM
    await putObjectWithHold(sidecarPath, canonical, 'application/json');
    await putObjectWithHold(sigPath, sig, 'text/plain');

    console.log(`evidence sidecar WORM-held at gs://${process.env.GCS_BUCKET}/${sidecarPath}`);

    const ledger = await writeLedgerRow({ req, evidencePath: sidecarPath });
    if (!ledger.ok) {
      // If you want strict atomicity with GCS commit, log+metric and 500:
      // throw new Error('Ledger write failed');
      // Or soft-fail: continue but surface a WARN metric
    }


    await redis.set(idemKey, 'committed', 'XX', 'EX', 7 * 24 * 3600); // only if exists

    res.status(201).json({
      message: 'Evidence stored (WORM).',
      signedLedgerEntry: { trace_id, signature: sig },
    });
  } catch (e) {
    await redis.del(idemKey); // allow retry
    console.error(e);
    res.status(503).json({ error: 'storage_failed' });
  }
});

app.get('/api/evidence/verify', requireAuth, async (req, res) => {
  try {
    const { trace_id } = req.query;
    if (!trace_id) return res.status(400).json({ error: 'trace_id required' });

    const base = `tenants/${req.ctx.tenant}/evidence/${trace_id}`;
    const jsonStr = await readObject(`${base}/final.evidence.json`); // mocked GCS OK
    const sigStr  = (await readObject(`${base}/final.evidence.sig`)).trim();

    const keys = [process.env.EVIDENCE_HMAC_KEY, process.env.EVIDENCE_HMAC_KEY_PREV].filter(Boolean);
    const ok = verifyWithAnyKey(JSON.parse(jsonStr), sigStr, keys);

    return res.json({ trace_id, ok });
  } catch (e) {
    console.error('verify failed', e);
    return res.status(500).json({ error: 'verify_failed' });
  }
});

app.post('/api/autogen/avatars', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Missing file field "file".' });
    }

    const buf = req.file.buffer;

    // --- DEBUG: print size + first16 bytes (hex) ---
    console.log('[UPLOAD]', {
      field: req.file.fieldname,
      size: buf.length,
      mime: req.file.mimetype,
      first16: [...buf.slice(0,16)].map(b => b.toString(16).padStart(2,'0')).join(' ')
    });

    // Quick PNG signature check
    const isPng = buf.slice(0,8).equals(PNG_SIG);

    const job = await queue.add('meshFromPng', {
      pngBytes: buf,
      filename: req.file.originalname,
      tenant: req.ctx.tenant,
      actor: req.ctx.actor,
      role: req.ctx.role,
    }, defaultJobOptions());

    return res.json({ ok: true, bytes: buf.length, isPng, jobId: job.id });
  } catch (err) {
    console.error('autogen error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});


app.get('/api/jobs/:id', requireAuth, async (req, res) => {
  const job = await queue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  const st = await job.getState();
  const pr = await job.getProgress();
  const rt = await job.returnvalue; // populated on completed
  res.json({ state: st, progress: pr, result: rt });
});


io.on('connection', (socket) => {
  console.log(JSON.stringify({ message: 'Client connected', socketId: socket.id }));
  socket.emit('simulation-update', {
    simState: 'idle',
    newsFeed: 'Welcome to J-Verse Simulation!',
    ethicsAlert: 'No immediate threats detected.'
  });

  setInterval(() => {
    const news = [
      "New mission parameters received.",
      "Anomaly detected in sector 7.",
      "System diagnostics complete.",
      "Incoming transmission from command."
    ];
    const randomNews = news[Math.floor(Math.random() * news.length)];

    socket.emit('simulation-update', {
      newsFeed: randomNews,
      ethicsAlert: Math.random() > 0.7 ? "Potential ethical dilemma identified." : null
    });
  }, 5000);
});

server.listen(8080, () => {
  console.log('Simulation backend running on port 8080');
});