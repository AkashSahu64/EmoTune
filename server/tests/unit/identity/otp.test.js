const { getOTPProvider, MockOTPProvider, BaseOTPProvider } = require('../../../identity/otp/index');

describe('OTP Providers', () => {
  describe('BaseOTPProvider', () => {
    it('should throw when sendOTP is called directly', async () => {
      const provider = new BaseOTPProvider({});
      await expect(provider.sendOTP('+1234567890', '123456')).rejects.toThrow('Not implemented');
    });
  });

  describe('MockOTPProvider', () => {
    it('should return success response', async () => {
      const provider = new MockOTPProvider();
      const result = await provider.sendOTP('+1234567890', '123456');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('mock');
      expect(result.messageId).toBeDefined();
    });

    it('should generate OTP of correct length', () => {
      const provider = new MockOTPProvider();
      const otp = provider.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe('getOTPProvider', () => {
    it('should return a provider instance', () => {
      const provider = getOTPProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.sendOTP).toBe('function');
    });
  });
});
