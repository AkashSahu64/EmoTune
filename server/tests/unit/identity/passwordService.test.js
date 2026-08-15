const User = require('../../../models/User');
const PasswordHistory = require('../../../identity/models/PasswordHistory');
const PasswordReset = require('../../../identity/models/PasswordReset');

jest.mock('../../../models/User');
jest.mock('../../../identity/models/PasswordHistory');
jest.mock('../../../identity/models/PasswordReset');

const passwordService = require('../../../identity/services/passwordService');

const mockQuery = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockResolvedValue([]),
};

PasswordHistory.find.mockReturnValue(mockQuery);

describe('Password Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PasswordHistory.find.mockReturnValue(mockQuery);
  });

  describe('validatePasswordStrength', () => {
    it('should return no errors for a strong password', () => {
      const errors = passwordService.validatePasswordStrength('StrongP@ss1');
      expect(errors).toHaveLength(0);
    });

    it('should return errors for a short password', () => {
      const errors = passwordService.validatePasswordStrength('Ab1!');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('characters');
    });

    it('should return errors for password missing uppercase', () => {
      const errors = passwordService.validatePasswordStrength('weakpass1!');
      expect(errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('should return errors for password missing number', () => {
      const errors = passwordService.validatePasswordStrength('WeakPass!');
      expect(errors.some(e => e.includes('number'))).toBe(true);
    });
  });

  describe('checkPasswordHistory', () => {
    it('should skip check if history count is 0', async () => {
      PasswordHistory.find.mockClear();
      const result = await passwordService.checkPasswordHistory('user123', 'password', 0);
      expect(result).toBe(true);
      expect(PasswordHistory.find).not.toHaveBeenCalled();
    });

    it('should return true if no history exists', async () => {
      const result = await passwordService.checkPasswordHistory('user123', 'NewP@ss1');
      expect(result).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should throw if user not found', async () => {
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(
        passwordService.changePassword('nonexistent', 'oldPass1!', 'newPass2@')
      ).rejects.toThrow('User not found');
    });

    it('should throw if current password is wrong', async () => {
      const mockUser = { _id: 'user123', password: '$2a$12$hashedpassword', save: jest.fn() };
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      jest.spyOn(require('../../../identity/utils/crypto'), 'comparePassword')
        .mockResolvedValue(false);

      await expect(
        passwordService.changePassword('user123', 'wrongPass1!', 'newPass2@')
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
