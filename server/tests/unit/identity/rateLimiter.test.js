jest.mock('../../../identity/models/LoginHistory');
jest.mock('../../../identity/models/Device');
jest.mock('../../../identity/models/Session');

const { RateLimiter } = require('../../../identity/middleware/rateLimiter');

describe('Rate Limiter', () => {
  afterEach(() => {
    RateLimiter.resetKey('test-key');
  });

  it('should allow requests under the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
    const req = { ip: '127.0.0.1' };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    limiter.middleware()(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should block requests over the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60000, max: 2 });
    const req = { ip: '127.0.0.2' };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    limiter.middleware()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    limiter.middleware()(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    limiter.middleware()(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('should set rate limit headers', () => {
    const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
    const req = { ip: '127.0.0.3' };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    limiter.middleware()(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });

  it('should use custom key generator', () => {
    const keyGen = jest.fn().mockReturnValue('custom-key');
    const limiter = new RateLimiter({ windowMs: 60000, max: 3, keyGenerator: keyGen });
    const req = { body: { email: 'test@example.com' }, ip: '127.0.0.4' };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    limiter.middleware()(req, res, next);
    expect(keyGen).toHaveBeenCalledWith(req);
  });

  it('should skip rate limiting when skip function returns true', () => {
    const limiter = new RateLimiter({ windowMs: 60000, max: 1, skip: () => true });
    const req = { ip: '127.0.0.5' };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    limiter.middleware()(req, res, next);
    limiter.middleware()(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
