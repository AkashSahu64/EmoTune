const { CONFIG } = require('../../core/config');

const IDENTITY_CONFIG = {
  jwt: {
    accessToken: {
      secret: process.env.JWT_ACCESS_SECRET || CONFIG.jwt.secret,
      expiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      issuer: process.env.JWT_ISSUER || 'emotune',
      audience: process.env.JWT_AUDIENCE || 'emotune-api',
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET || CONFIG.jwt.refreshSecret,
      expiry: process.env.JWT_REFRESH_EXPIRY || '30d',
      issuer: process.env.JWT_ISSUER || 'emotune',
      audience: process.env.JWT_AUDIENCE || 'emotune-api',
      rotation: true,
      familyTracking: true,
      maxFamilySize: 10,
      cookieMaxAge: 30 * 24 * 60 * 60 * 1000,
      cookieMaxAgeSession: 24 * 60 * 60 * 1000,
    },
  },

  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    historyCount: 5,
    expiryDays: 0,
    bcryptRounds: 12,
    resetTokenExpiry: 60 * 60 * 1000,
  },

  session: {
    maxActivePerUser: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 10,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 10,
    inactiveTimeout: parseInt(process.env.SESSION_INACTIVE_TIMEOUT) || 30 * 24 * 60 * 60 * 1000,
    extendOnActivity: true,
  },

  emailVerification: {
    required: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
    tokenExpiry: 24 * 60 * 60 * 1000,
    maxAttempts: 5,
    cooldownMs: 60 * 1000,
  },

  login: {
    maxAttempts: process.env.MAX_LOGIN_ATTEMPTS || 5,
    lockoutDurationMs: process.env.LOCKOUT_DURATION_MS || 15 * 60 * 1000,
    progressiveDelay: true,
    progressiveDelayBase: 1000,
  },

  rateLimit: {
    windowMs: 60000,
    max: 100,
    auth: { windowMs: 60000, max: 10 },
    login: { windowMs: 60000, max: 5 },
    signup: { windowMs: 60000, max: 3 },
    passwordReset: { windowMs: 60000, max: 2 },
    api: { windowMs: 60000, max: 100 },
  },

  security: {
    rateLimit: {
      windowMs: 60000,
      max: 100,
      auth: { windowMs: 60000, max: 10 },
      login: { windowMs: 60000, max: 5 },
      signup: { windowMs: 60000, max: 3 },
      passwordReset: { windowMs: 60000, max: 2 },
      api: { windowMs: 60000, max: 100 },
    },
    csrf: {
      enabled: process.env.CSRF_ENABLED !== 'false',
      cookieName: 'XSRF-TOKEN',
      headerName: 'x-xsrf-token',
    },
    bcrypt: {
      rounds: 12,
    },
    secureCookies: process.env.NODE_ENV !== 'development',
    cookieSameSite: 'strict',
  },

  oauth: {
    google: { enabled: !!process.env.GOOGLE_OAUTH_CLIENT_ID, clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '', clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '' },
    apple: { enabled: false, clientId: '', clientSecret: '' },
    microsoft: { enabled: false, clientId: '', clientSecret: '' },
  },

  otp: {
    provider: process.env.OTP_PROVIDER || 'mock',
    expiryMs: 5 * 60 * 1000,
    length: 6,
    maxAttempts: 3,
    cooldownMs: 60 * 1000,
  },

  aiSecurity: {
    enabled: true,
    riskThreshold: 70,
    impossibleTravelSpeedKmh: 800,
    requireVerificationOnRisk: true,
  },

  device: {
    trustExpiryDays: 30,
    maxDevices: 10,
    fingerprintEnabled: true,
  },

  audit: {
    logAuthEvents: true,
    logTokenEvents: true,
    logAdminEvents: true,
    retentionDays: 90,
  },

  encryption: {
    refreshTokenHash: {
      algorithm: 'sha256',
      salt: process.env.REFRESH_TOKEN_HASH_SALT || 'emotune-refresh-salt',
    },
  },
};

module.exports = { IDENTITY_CONFIG };
