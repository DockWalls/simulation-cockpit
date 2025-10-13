const fs = require('fs');
const { importSPKI, exportJWK } = require('jose');

(async () => {
  try {
    const spki = fs.readFileSync('keys/public.pem', 'utf8');
    const key = await importSPKI(spki, 'RS256');
    const jwk = await exportJWK(key);
    jwk.kid = 'dev-1';
    if (!fs.existsSync('jverse-backend/public/.well-known')) {
      fs.mkdirSync('jverse-backend/public/.well-known', { recursive: true });
    }
    fs.writeFileSync('jverse-backend/public/.well-known/jwks.json', JSON.stringify({ keys: [jwk] }, null, 2));
    console.log('jwks.json generated successfully.');
  } catch (error) {
    console.error('Error generating jwks.json:', error);
  }
})();
