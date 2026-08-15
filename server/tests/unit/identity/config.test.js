const { IDENTITY_CONFIG } = require('../../../identity/config/identityConfig');

describe('Identity Config', () => {
  it('should define JWT configuration', () => {
    expect(IDENTITY_CONFIG.jwt).toBeDefined();
    expect(IDENTITY_CONFIG.jwt.accessToken).toBeDefined();
    expect(IDENTITY_CONFIG.jwt.accessToken.secret).toBeDefined();
    expect(IDENTITY_CONFIG.jwt.accessToken.expiry).toBeDefined();
    expect(IDENTITY_CONFIG.jwt.refreshToken).toBeDefined();
  });

  it('should define security configuration', () => {
    expect(IDENTITY_CONFIG.security).toBeDefined();
    expect(IDENTITY_CONFIG.security.rateLimit).toBeDefined();
    expect(IDENTITY_CONFIG.security.rateLimit.auth).toBeDefined();
    expect(IDENTITY_CONFIG.security.rateLimit.api).toBeDefined();
    expect(IDENTITY_CONFIG.security.csrf).toBeDefined();
    expect(IDENTITY_CONFIG.security.secureCookies).toBeDefined();
  });

  it('should define password policy', () => {
    expect(IDENTITY_CONFIG.password).toBeDefined();
    expect(IDENTITY_CONFIG.password.minLength).toBeGreaterThanOrEqual(8);
    expect(IDENTITY_CONFIG.password.historyCount).toBeGreaterThanOrEqual(0);
  });

  it('should define session configuration', () => {
    expect(IDENTITY_CONFIG.session).toBeDefined();
    expect(IDENTITY_CONFIG.session.maxActivePerUser).toBeGreaterThan(0);
  });

  it('should define OAuth configuration', () => {
    expect(IDENTITY_CONFIG.oauth).toBeDefined();
    expect(IDENTITY_CONFIG.oauth.google).toBeDefined();
    expect(IDENTITY_CONFIG.oauth.apple).toBeDefined();
    expect(IDENTITY_CONFIG.oauth.microsoft).toBeDefined();
  });

  it('should define OTP configuration', () => {
    expect(IDENTITY_CONFIG.otp).toBeDefined();
    expect(IDENTITY_CONFIG.otp.length).toBeDefined();
    expect(IDENTITY_CONFIG.otp.expiryMs).toBeGreaterThan(0);
    expect(IDENTITY_CONFIG.otp.provider).toBeDefined();
  });

  it('should define AI security configuration', () => {
    expect(IDENTITY_CONFIG.aiSecurity).toBeDefined();
    expect(IDENTITY_CONFIG.aiSecurity.enabled).toBeDefined();
    expect(IDENTITY_CONFIG.aiSecurity.riskThreshold).toBeGreaterThanOrEqual(0);
  });

  it('should define email verification configuration', () => {
    expect(IDENTITY_CONFIG.emailVerification).toBeDefined();
    expect(IDENTITY_CONFIG.emailVerification.tokenExpiry).toBeGreaterThan(0);
  });

  it('should define device configuration', () => {
    expect(IDENTITY_CONFIG.device).toBeDefined();
    expect(IDENTITY_CONFIG.device.fingerprintEnabled).toBeDefined();
  });

  it('should define rateLimit configuration', () => {
    expect(IDENTITY_CONFIG.rateLimit).toBeDefined();
    expect(IDENTITY_CONFIG.rateLimit.auth).toBeDefined();
    expect(IDENTITY_CONFIG.rateLimit.api).toBeDefined();
  });

  it('should define login configuration', () => {
    expect(IDENTITY_CONFIG.login).toBeDefined();
    expect(IDENTITY_CONFIG.login.maxAttempts).toBeGreaterThan(0);
  });
});
