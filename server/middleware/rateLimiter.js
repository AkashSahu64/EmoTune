const { RateLimiter } = require('../identity/middleware/rateLimiter');

const createRateLimiter = (windowMs = 60000, max = 20, message = 'Too many requests') => {
  return new RateLimiter({ windowMs, max, message }).middleware();
};

const aiRateLimiter = createRateLimiter(60000, 20, 'AI request limit reached. Try again in a minute.');
const mediaRateLimiter = createRateLimiter(60000, 120, 'Media picker request limit reached. Try again in a minute.');
const authRateLimiter = createRateLimiter(60000, 10, 'Too many auth attempts. Try again later.');
const apiRateLimiter = createRateLimiter(60000, 100, 'API rate limit exceeded.');

module.exports = { createRateLimiter, aiRateLimiter, mediaRateLimiter, authRateLimiter, apiRateLimiter };
