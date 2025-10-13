const { createImageTo3D, pollJob, downloadAsset } = require('../../lib/meshyClient');
const { validateGLB } = require('../../lib/validator');
const { saveBuffer, saveJSON } = require('../../lib/storage');
const { sha256 } = require('../../lib/hash');

/**
 * Job data:
 * {
 *   pngBytes: Buffer,
 *   filename: string,      // original PNG filename
 *   tenant: string,
 *   actor: string,
 *   role: string,
 *   options?: { polyTarget?: 'low'|'mid'|'high' }
 * }
 */
const { execSync } = require('child_process');

module.exports = async function meshFromPng(job) {
  const free = execSync('df -h / | tail -1 | awk \'{print $4}\'').toString().trim();
  if (parseInt(free) < 500) throw new Error('Disk space critically low');

  const { pngBytes, filename, tenant, actor, role, options } = job.data;

  // 1) Meshy: create job
  const { jobId } = await createImageTo3D(pngBytes, { rigged: true, polyTarget: options?.polyTarget });
  await job.updateProgress({ stage: 'meshy_submitted', jobId });

  // 2) Poll
  const result = await pollJob(jobId);
  await job.updateProgress({ stage: 'meshy_completed', asset: result.asset });

  // 3) Download GLB
  const glbBuf = await downloadAsset(result.asset.url);
  const glbHash = sha256(glbBuf);

  // 4) Validate
  const validation = await validateGLB(glbBuf);
  if (!validation.passed) {
    // TODO: auto-rig fallback or texture transcode fallback if needed
    throw new Error(`Validation failed: ${validation.report.alerts?.join('; ') || 'unknown'}`);
  }

  // 5) Persist (GLB + evidence sidecar) — mock GCS
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basePath = `tenants/${tenant}/avatars/${stamp}-${glbHash.slice(0,8)}`;
  const glbUri = await saveBuffer(`${basePath}/avatar.glb`, glbBuf);

  const evidence = {
    _schema: 'jverse.avatar.evidence.v1',
    ts: new Date().toISOString(),
    tenant, actor, role,
    trace_id: job.id,
    inputs: {
      png_name: filename,
      png_sha256: sha256(pngBytes),
    },
    outputs: {
      glb_sha256: glbHash,
      size_bytes: glbBuf.length,
      extensions: validation.report?.report?.extensions || [],
      uri: glbUri,
    },
    validator: {
      passed: validation.passed,
      report: validation.report,
      tool: '@jallybean/avatar-validator',
      version: '0.1.0',
    },
    policy: { clause: 'avatar.generate', decision: 'allow', reasons: [] },
  };

  await saveJSON(`${basePath}/evidence.json`, evidence);

  // 6) Post evidence to your backend (HMAC/JWT/RBAC path)
  const { postEvidence } = require('../../lib/evidence');
  const resp = await postEvidence({
    trace_id: job.id,
    ts: evidence.ts,
    tenant, actor, role,
    inputs: { png_sha256: evidence.inputs.png_sha256, png_name: filename },
    outputs: { glb_sha256: glbHash, size_bytes: glbBuf.length, extensions: evidence.outputs.extensions },
    validator: { passed: validation.passed, report: validation.report, tool: '@jallybean/avatar-validator', version: '0.1.0' },
    policy: { clause: 'avatar.generate', decision: 'allow', reasons: [] },
  });

  return {
    glbUri,
    glbSha256: glbHash,
    evidence: resp, // includes signedLedgerEntry from your server
  };
};