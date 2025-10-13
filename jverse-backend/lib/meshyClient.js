const axios = require('axios');

const MESHY_BASE = 'https://api.meshy.ai/v2'; // adjust if needed
const API_KEY = process.env.MESHY_API_KEY;

const http = axios.create({
  baseURL: MESHY_BASE,
  headers: { Authorization: `Bearer ${API_KEY}` },
  timeout: 60_000,
});

// naive retry helper (Jitter + backoff)
async function withRetry(fn, { tries = 5, baseMs = 1500 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } 
    catch (e) {
      lastErr = e;
      const wait = baseMs * Math.pow(2, i) + Math.floor(Math.random() * 250);
      if (i < tries - 1) await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/**
 * Start an image->3D job at Meshy
 * @param {Buffer} pngBytes
 * @param {object} opts { rigged: boolean, polyTarget?: 'low'|'mid'|'high' }
 * @returns {Promise<{jobId: string}>}
 */
async function createImageTo3D(pngBytes, opts = { rigged: true }) {
  return withRetry(async () => {
    const form = new (require('form-data'))();
    form.append('image', pngBytes, { filename: 'source.png', contentType: 'image/png' });
    form.append('options', JSON.stringify({ rigged: !!opts.rigged, polyTarget: opts.polyTarget || 'mid' }));

    const { data } = await http.post('/image-to-3d', form, { headers: form.getHeaders() });
    return { jobId: data.id };
  });
}

/**
 * Poll a job until done/failed
 * @param {string} jobId 
 * @param {object} opts { intervalMs?: number, timeoutMs?: number }
 */
async function pollJob(jobId, opts = {}) {
  const intervalMs = opts.intervalMs ?? 4000;
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000;

  const start = Date.now();
  while (true) {
    const { data } = await withRetry(() => http.get(`/jobs/${jobId}`));
    if (data.status === 'succeeded') return data;
    if (data.status === 'failed') throw new Error(`Meshy job failed: ${data.error || 'unknown'}`);
    if (Date.now() - start > timeoutMs) throw new Error('Meshy job polling timeout');
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

/**
 * Download the GLB resulting asset
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
async function downloadAsset(url) {
  const { data } = await withRetry(() =>
    axios.get(url, { responseType: 'arraybuffer', timeout: 120_000 })
  );
  return Buffer.from(data);
}

module.exports = { createImageTo3D, pollJob, downloadAsset };
