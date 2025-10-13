// Minimal helpers. You can wire @google-cloud/storage for real GCS.
const path = require('path');
const fs = require('fs/promises');

const ROOT = path.resolve('/tmp', 'var-artifacts'); // local mock folder

async function ensureRoot() {
  await fs.mkdir(ROOT, { recursive: true });
}

/**
 * Save buffer at a logical path (mock); return "gs://" like URI
 */
async function saveBuffer(relPath, buf) {
  await ensureRoot();
  const full = path.join(ROOT, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return `gs://${process.env.GCS_BUCKET}/${relPath}`;
}

/**
 * Save JSON sidecar
 */
async function saveJSON(relPath, obj) {
  return saveBuffer(relPath, Buffer.from(JSON.stringify(obj, null, 2)));
}

module.exports = { saveBuffer, saveJSON };
