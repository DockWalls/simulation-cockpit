const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const jwks = jwksRsa({
  jwksUri: process.env.JWKS_URI,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

function getKey(header, cb) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return cb(err);
    }
    const signingKey = key ? key.getPublicKey() : undefined;
    cb(null, signingKey);
  });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing token' });

  jwt.verify(token, getKey, {
    audience: process.env.JWT_AUD,
    issuer: process.env.JWT_ISS,
    algorithms: ['RS256'],
    clockTolerance: 5, // seconds
  }, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'invalid token' });
    // Enforce RBAC from claims
    const { t: tenant, sub: actor, r: role } = decoded;
    if (!tenant || !actor || !role) return res.status(403).json({ error: 'missing claims' });
    req.ctx = { tenant, actor, role };
    return next();
  });
}

module.exports = { requireAuth };