// Thin wrapper; call your packaged validator (or WASM) here.
const { validateAvatar } = require('@jallybean/avatar-validator'); // if locally linked
const { sha256 } = require('./hash');

async function validateGLB(glbBuf) {
  const report = await validateAvatar(glbBuf.buffer); // if it expects ArrayBuffer
  return {
    sha256: sha256(glbBuf),
    passed: report.passed,
    report,
  };
}

module.exports = { validateGLB };
