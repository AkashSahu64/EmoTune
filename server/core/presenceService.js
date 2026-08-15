const Redis = require('ioredis');
const { CONFIG } = require('./config');
const { logger } = require('./logger');

const memory = new Map();
let redis;
let redisReady = false;

function getRedis() {
  if (redis) return redis;
  try {
    redis = new Redis(CONFIG.redis.url, { keyPrefix: `${CONFIG.redis.keyPrefix}presence:`, lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    redis.connect().then(() => { redisReady = true; }).catch(() => { redisReady = false; });
    redis.on('error', (error) => { redisReady = false; logger.warn('Presence Redis unavailable', { error: error.message }); });
    redis.on('ready', () => { redisReady = true; });
  } catch (error) { logger.warn('Presence initialization failed', { error: error.message }); }
  return redis;
}

async function markOnline(userId, socketId, ttlSeconds = 90) {
  const uid = String(userId);
  const set = memory.get(uid) || new Set();
  set.add(socketId);
  memory.set(uid, set);
  const client = getRedis();
  if (redisReady && client) {
    await client.sadd(`user:${uid}`, socketId).catch(() => {});
    await client.expire(`user:${uid}`, ttlSeconds).catch(() => {});
  }
}

async function markOffline(userId, socketId) {
  const uid = String(userId);
  const set = memory.get(uid);
  if (set) { set.delete(socketId); if (!set.size) memory.delete(uid); }
  const client = getRedis();
  if (redisReady && client) {
    await client.srem(`user:${uid}`, socketId).catch(() => {});
    const count = await client.scard(`user:${uid}`).catch(() => 0);
    if (!count) await client.del(`user:${uid}`).catch(() => {});
  }
}

async function isOnline(userId) {
  const uid = String(userId);
  const client = getRedis();
  if (redisReady && client) return (await client.exists(`user:${uid}`).catch(() => 0)) === 1;
  return Boolean(memory.get(uid)?.size);
}

async function getOnlineUserIds() {
  const ids = new Set([...memory.entries()].filter(([, sockets]) => sockets.size).map(([uid]) => uid));
  const client = getRedis();
  if (redisReady && client) {
    const keys = await client.keys('user:*').catch(() => []);
    keys.forEach((key) => ids.add(key.slice('user:'.length)));
  }
  return [...ids];
}

module.exports = { markOnline, markOffline, isOnline, getOnlineUserIds };
