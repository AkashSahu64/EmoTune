const constants = require('../config/constants');

class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || constants.RATE_LIMIT.BURST_SIZE;
    this.tokens = options.initialTokens || this.capacity;
    this.refillRate = options.refillRate || constants.RATE_LIMIT.REFILL_RATE;
    this.refillInterval = options.refillInterval || constants.RATE_LIMIT.REFILL_INTERVAL_MS;
    this.lastRefill = Date.now();
    this.waiting = [];
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async consume(count = 1) {
    this._refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    const waitTime = this.refillInterval / this.refillRate;
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return this.consume(count);
  }

  tryConsume(count = 1) {
    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  getTokenCount() {
    this._refill();
    return this.tokens;
  }

  reset() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

class MultiProviderRateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  getBucket(provider) {
    if (!this.buckets.has(provider)) {
      this.buckets.set(provider, new TokenBucket({
        capacity: constants.RATE_LIMIT.BURST_SIZE,
        refillRate: constants.RATE_LIMIT.REFILL_RATE,
        refillInterval: constants.RATE_LIMIT.REFILL_INTERVAL_MS,
      }));
    }
    return this.buckets.get(provider);
  }

  async waitForToken(provider = 'default') {
    const bucket = this.getBucket(provider);
    await bucket.consume(1);
  }

  tryGetToken(provider = 'default') {
    const bucket = this.getBucket(provider);
    return bucket.tryConsume(1);
  }

  resetProvider(provider = 'default') {
    const bucket = this.getBucket(provider);
    if (bucket) bucket.reset();
  }

  resetAll() {
    this.buckets.forEach((bucket) => bucket.reset());
  }
}

const defaultLimiter = new MultiProviderRateLimiter();

function waitForToken(provider = 'default') {
  return defaultLimiter.waitForToken(provider);
}

function tryGetToken(provider = 'default') {
  return defaultLimiter.tryGetToken(provider);
}

module.exports = {
  TokenBucket,
  MultiProviderRateLimiter,
  waitForToken,
  tryGetToken,
  defaultLimiter,
};
