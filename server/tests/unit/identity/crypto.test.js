const crypto = require('../../../identity/utils/crypto');

describe('Crypto Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await crypto.hashPassword('testPassword123!');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('testPassword123!');
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await crypto.hashPassword('testPassword123!');
      const hash2 = await crypto.hashPassword('testPassword123!');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should match correct password', async () => {
      const hash = await crypto.hashPassword('testPassword123!');
      const match = await crypto.comparePassword('testPassword123!', hash);
      expect(match).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await crypto.hashPassword('testPassword123!');
      const match = await crypto.comparePassword('wrongPassword456@', hash);
      expect(match).toBe(false);
    });
  });

  describe('hashRefreshToken', () => {
    it('should return a SHA-256 hash', () => {
      const hash = crypto.hashRefreshToken('my-refresh-token-value');
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const hash1 = crypto.hashRefreshToken('same-token');
      const hash2 = crypto.hashRefreshToken('same-token');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = crypto.hashRefreshToken('token-a');
      const hash2 = crypto.hashRefreshToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a hex string of expected length', () => {
      const token = crypto.generateSessionToken();
      expect(token).toBeDefined();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(crypto.generateSessionToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a hex string', () => {
      const token = crypto.generateVerificationToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(20);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('generateOTP', () => {
    it('should generate a numeric OTP of specified length', () => {
      const otp = crypto.generateOTP(6);
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = crypto.generateOTP(6);
      const otp2 = crypto.generateOTP(6);
      expect(otp1).not.toBe(otp2);
    });

    it('should default to 6 digits', () => {
      const otp = crypto.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });
  });
});
