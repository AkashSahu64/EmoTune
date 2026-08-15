const { IDENTITY_CONFIG } = require('../config/identityConfig');
const cacheService = require('../../core/cacheService');

const memoryStore = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000);
cleanupInterval.unref?.();

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || IDENTITY_CONFIG.security.rateLimit.windowMs;
    this.maxRequests = options.max || IDENTITY_CONFIG.security.rateLimit.max;
    this.message = options.message || 'Too many requests, please try again later';
    this.keyGenerator = options.keyGenerator || ((req) => req.ip);
    this.skip = options.skip || (() => false);
  }

  middleware() {
    return async (req, res, next) => {
      if (this.skip(req)) return next();

      const key = this.keyGenerator(req);
      const now = Date.now();

      let entry;
      if (cacheService.isRedisAvailable()) {
        entry = await cacheService.incrementCounter(`identity:ratelimit:${key}`, this.windowMs);
      } else {
        entry = memoryStore.get(key);
        if (!entry || now > entry.resetTime) {
          entry = { count: 0, resetTime: now + this.windowMs };
          memoryStore.set(key, entry);
        }
        entry.count += 1;
      }

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

      if (entry.count > this.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);

        return res.status(429).json({
          success: false,
          error: this.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        });
      }

      next();
    };
  }

  static resetKey(key) {
    memoryStore.delete(key);
    cacheService.resetCounter(`identity:ratelimit:${key}`);
  }

  static getKey(key) {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    return {
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }
}

const authRateLimiter = new RateLimiter({
  windowMs: IDENTITY_CONFIG.security.rateLimit.auth.windowMs,
  max: IDENTITY_CONFIG.security.rateLimit.auth.max,
  message: 'Too many authentication attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.username || req.ip;
    return `auth:${identifier}`;
  },
});

const signupRateLimiter = new RateLimiter({
  windowMs: IDENTITY_CONFIG.security.rateLimit.auth.windowMs,
  max: Math.floor(IDENTITY_CONFIG.security.rateLimit.auth.max / 2),
  message: 'Too many signup attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    return `signup:${req.ip}`;
  },
});

const otpRateLimiter = new RateLimiter({
  windowMs: IDENTITY_CONFIG.security.rateLimit.auth.windowMs,
  max: IDENTITY_CONFIG.security.rateLimit.auth.max,
  message: 'Too many OTP requests. Please wait before trying again.',
  keyGenerator: (req) => {
    return `otp:${req.ip}`;
  },
});

const apiRateLimiter = new RateLimiter({
  windowMs: IDENTITY_CONFIG.security.rateLimit.api.windowMs,
  max: IDENTITY_CONFIG.security.rateLimit.api.max,
  message: 'API rate limit exceeded',
});

const sensitiveRateLimiter = new RateLimiter({
  windowMs: 3600000,
  max: 20,
  message: 'Too many sensitive operations. Please try again later.',
  keyGenerator: (req) => `sensitive:${req.user?.id || req.ip}`,
});

module.exports = {
  RateLimiter,
  authRateLimiter,
  signupRateLimiter,
  otpRateLimiter,
  apiRateLimiter,
  sensitiveRateLimiter,
};
