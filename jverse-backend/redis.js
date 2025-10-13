const IORedis = require('ioredis');
const redis = new IORedis(process.env.REDIS_URL, { lazyConnect: false });

async function claimOnce(key, ttlSec = Number(process.env.IDEM_TTL_SEC || 900)) {
  // NX: only set if not exists, EX: seconds to expire
  const ok = await redis.set(key, '1', 'NX', 'EX', ttlSec);
  return ok === 'OK';
}

module.exports = { redis, claimOnce };
