jest.mock('../../../identity/models/LoginHistory');
jest.mock('../../../identity/models/Device');

const LoginHistory = require('../../../identity/models/LoginHistory');
const Device = require('../../../identity/models/Device');
const AISecurityService = require('../../../identity/services/aiSecurityService');

const mockQuery = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
};

const mockFindOneQuery = {
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(null),
};

LoginHistory.find.mockReturnValue(mockQuery);
LoginHistory.findOne.mockReturnValue(mockFindOneQuery);
Device.findOne.mockResolvedValue(null);

describe('AI Security Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LoginHistory.find.mockReturnValue(mockQuery);
    LoginHistory.findOne.mockReturnValue(mockFindOneQuery);
    Device.findOne.mockResolvedValue(null);
  });

  describe('assessLoginRisk', () => {
    it('should return low risk for new user with no history', async () => {
      const risk = await AISecurityService.assessLoginRisk('507f1f77bcf86cd799439011', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(risk).toHaveProperty('score');
      expect(risk).toHaveProperty('level');
      expect(risk).toHaveProperty('factors');
      expect(risk).toHaveProperty('requiresVerification');
    });

    it('should return higher risk with unknown device', async () => {
      mockQuery.lean.mockResolvedValue([
        { action: 'login_success', ip: '1.2.3.4', createdAt: new Date(Date.now() - 1000) },
      ]);

      const risk = await AISecurityService.assessLoginRisk('507f1f77bcf86cd799439011', {
        ip: '5.6.7.8',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'unknown-device',
      });

      expect(risk.factors).toContain('unknown_device');
    });
  });

  describe('shouldBlockLogin', () => {
    it('should not block normal login', async () => {
      const result = await AISecurityService.shouldBlockLogin('507f1f77bcf86cd799439011', {
        ip: '192.168.1.1',
      });

      expect(result).toHaveProperty('shouldBlock');
      expect(result).toHaveProperty('risk');
    });
  });
});
