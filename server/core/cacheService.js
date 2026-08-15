const { CONFIG } = require('./config');
const { logger, metrics } = require('./logger');

let redisClient = null;
let redisAvailable = false;

async function getRedis() {
  if (redisClient) return redisClient;
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(CONFIG.redis.url, {
      keyPrefix: CONFIG.redis.keyPrefix,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 100, 2000),
      enableOfflineQueue: false,
    });
    await redisClient.connect().catch(() => {});
    redisClient.on('error', (err) => {
      redisAvailable = false;
      logger.warn('Redis connection lost', { error: err.message });
    });
    redisClient.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected for caching');
    });
    await redisClient.ping().then(() => { redisAvailable = true; }).catch(() => { redisAvailable = false; });
  } catch (err) {
    redisAvailable = false;
    logger.warn('Redis unavailable, cache disabled', { error: err.message });
  }
  return redisClient;
}

function hashKey(input) {
  let hash = 0;
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash:' + Math.abs(hash).toString(36);
}

function normalizeForCache(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

const cacheService = {
  _ready: false,
  _memoryCache: new Map(),
  _memoryTTL: 300000,

  isRedisAvailable() { return redisAvailable; },

  async init() {
    await getRedis();
    this._ready = true;
    setInterval(() => this._evictExpired(), 60000);
  },

  _evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this._memoryCache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this._memoryCache.delete(key);
      }
    }
  },

  async get(key) {
    const memEntry = this._memoryCache.get(key);
    if (memEntry && (!memEntry.expiresAt || memEntry.expiresAt > Date.now())) {
      metrics.trackCacheHit();
      return memEntry.value;
    }
    if (memEntry) this._memoryCache.delete(key);

    if (!redisAvailable) {
      metrics.trackCacheMiss();
      return null;
    }
    try {
      const client = redisClient || await getRedis();
      if (!client) { metrics.trackCacheMiss(); return null; }
      const val = await client.get(key).catch(() => null);
      if (val) {
        metrics.trackCacheHit();
        try {
          const parsed = JSON.parse(val);
          this._memoryCache.set(key, { value: parsed, expiresAt: Date.now() + 60000 });
          return parsed;
        } catch { return val; }
      }
    } catch {}
    metrics.trackCacheMiss();
    return null;
  },

  async set(key, value, ttlSeconds = CONFIG.redis.cacheTTL) {
    this._memoryCache.set(key, { value, expiresAt: Date.now() + (ttlSeconds * 1000) });
    if (!redisAvailable) return;
    try {
      const client = redisClient || await getRedis();
      if (!client) return;
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      await client.setex(key, ttlSeconds, val).catch(() => {});
    } catch {}
  },

  async incrementCounter(key, windowMs) {
    if (redisAvailable) {
      try {
        const client = redisClient || await getRedis();
        const result = await client.multi()
          .incr(key)
          .pexpire(key, windowMs, 'NX')
          .exec();
        const count = Number(result?.[0]?.[1] || 0);
        const ttl = await client.pttl(key);
        return { count, resetTime: Date.now() + Math.max(ttl, windowMs) };
      } catch {}
    }
    if (!this._counterCache) this._counterCache = new Map();
    const now = Date.now();
    let entry = this._counterCache.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      this._counterCache.set(key, entry);
    }
    entry.count += 1;
    return entry;
  },

  resetCounter(key) {
    if (this._counterCache) this._counterCache.delete(key);
  },

  async getResponseCache(prompt, systemPrompt, taskType) {
    const key = 'resp:' + hashKey(normalizeForCache(prompt) + '|' + normalizeForCache(systemPrompt || '') + '|' + (taskType || 'default'));
    return this.get(key);
  },

  async setResponseCache(prompt, systemPrompt, taskType, response) {
    const key = 'resp:' + hashKey(normalizeForCache(prompt) + '|' + normalizeForCache(systemPrompt || '') + '|' + (taskType || 'default'));
    await this.set(key, response, CONFIG.redis.responseCacheTTL);
  },

  async getSemanticCache(query, threshold = 0.85) {
    const key = 'sem:' + hashKey(normalizeForCache(query));
    return this.get(key);
  },

  async setSemanticCache(query, response) {
    const key = 'sem:' + hashKey(normalizeForCache(query));
    await this.set(key, response, CONFIG.redis.semanticCacheTTL);
  },

  async invalidate(pattern) {
    if (!redisAvailable) {
      for (const key of this._memoryCache.keys()) {
        if (key.includes(pattern)) this._memoryCache.delete(key);
      }
      return;
    }
    try {
      const client = redisClient || await getRedis();
      if (!client) return;
      const keys = await client.keys(`${CONFIG.redis.keyPrefix}*${pattern}*`).catch(() => []);
      if (keys.length > 0) {
        await client.del(...keys).catch(() => {});
      }
    } catch {}
  },

  async getPromptCache(prompt, taskType) {
    const key = 'prompt:' + hashKey(normalizeForCache(prompt) + '|' + (taskType || 'default'));
    return this.get(key);
  },

  async setPromptCache(prompt, taskType, processed) {
    const key = 'prompt:' + hashKey(normalizeForCache(prompt) + '|' + (taskType || 'default'));
    await this.set(key, processed, CONFIG.redis.cacheTTL);
  },

  async healthCheck() {
    if (!redisAvailable) return { status: 'memory_only', memoryEntries: this._memoryCache.size };
    try {
      const client = redisClient || await getRedis();
      if (!client) return { status: 'memory_only' };
      await client.ping();
      return { status: 'ok', memoryEntries: this._memoryCache.size };
    } catch {
      return { status: 'memory_only' };
    }
  },
};

module.exports = cacheService;
