const crypto = require('crypto');

function stableStringify(obj) { return JSON.stringify(sortDeep(obj)); }
function sortDeep(x){ if(Array.isArray(x))return x.map(sortDeep);
  if(x&&typeof x==='object'){return Object.keys(x).sort().reduce((o,k)=>{o[k]=sortDeep(x[k]);return o;},{});} return x; }

function signWithKey(obj, keyB64) {
  const canonical = stableStringify(obj);
  const sig = crypto.createHmac('sha256', Buffer.from(keyB64, 'base64'))
    .update(canonical).digest('base64');
  return { canonical, sig };
}

function verifyWithAnyKey(obj, sigB64, keysB64=[]) {
  const canonical = stableStringify(obj);
  return keysB64.some(k=>{
    const exp = crypto.createHmac('sha256', Buffer.from(k, 'base64'))
      .update(canonical).digest('base64');
    const a = Buffer.from(exp, 'base64'); const b = Buffer.from(sigB64||'', 'base64');
    return a.length===b.length && crypto.timingSafeEqual(a,b);
  });
}

module.exports = { stableStringify, signWithKey, verifyWithAnyKey };