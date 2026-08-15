const jwt = require('jsonwebtoken');

jest.mock('../../../identity/models/Session');

const JWTService = require('../../../identity/services/jwtService');

describe('JWT Service', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockSessionId = 'sess_test123';

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = JWTService.generateAccessToken(mockUserId, mockSessionId);
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('userId', mockUserId);
      expect(decoded).toHaveProperty('sessionId', mockSessionId);
      expect(decoded).toHaveProperty('type', 'access');
      expect(decoded).toHaveProperty('jti');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const family = JWTService.generateTokenFamily();
      const token = JWTService.generateRefreshToken(mockUserId, mockSessionId, family, 1);
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('userId', mockUserId);
      expect(decoded).toHaveProperty('sessionId', mockSessionId);
      expect(decoded).toHaveProperty('family', family);
      expect(decoded).toHaveProperty('version', 1);
      expect(decoded).toHaveProperty('type', 'refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = JWTService.generateAccessToken(mockUserId, mockSessionId);
      const decoded = JWTService.verifyAccessToken(token);
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.sessionId).toBe(mockSessionId);
    });

    it('should reject an expired token', () => {
      expect(() => JWTService.verifyAccessToken('expired.token.here')).toThrow();
    });

    it('should reject a refresh token used as access token', () => {
      const family = JWTService.generateTokenFamily();
      const token = JWTService.generateRefreshToken(mockUserId, mockSessionId, family, 1);
      expect(() => JWTService.verifyAccessToken(token)).toThrow();
    });
  });

  describe('generateTokenFamily', () => {
    it('should generate unique families', () => {
      const families = new Set();
      for (let i = 0; i < 100; i++) {
        families.add(JWTService.generateTokenFamily());
      }
      expect(families.size).toBe(100);
    });
  });
});
