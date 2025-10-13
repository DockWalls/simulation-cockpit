require('./config.js');
const { Storage } = require('@google-cloud/storage');

function getBucket() {
    const storage = new Storage({projectId: process.env.GCP_PROJECT});
    return storage.bucket(process.env.GCS_BUCKET);
}

async function putObjectWithHold(objectName, data, contentType) {
  const bucket = getBucket();
  const file = bucket.file(objectName);
  await file.save(data, {
    contentType,
    resumable: false,
    metadata: { eventBasedHold: true }, // WORM hold
    validation: 'crc32c',
  });
  return { objectName, hold: true };
}

async function holdObject(objectName) {
  const bucket = getBucket();
  const file = bucket.file(objectName);
  await file.setMetadata({ eventBasedHold: true });
}

async function getSignedUploadUrl({
  tenant, traceId, sha256
}) {
  const bucket = getBucket();
  const filename = `evidence/${tenant}/${traceId}/${sha256}.glb`;
  const file = bucket.file(filename);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType: 'model/gltf-binary'
  });

  return { url, objectPath: filename };
}

async function getObjectBytes(objectPath) {
  const bucket = getBucket();
  const [buf] = await bucket.file(objectPath).download();
  return buf;
}

async function readObject(objectPath) {
    const bucket = getBucket();
    const [buf] = await bucket.file(objectPath).download();
    return buf.toString('utf8');
}

module.exports = { putObjectWithHold, holdObject, getSignedUploadUrl, getObjectBytes, readObject };