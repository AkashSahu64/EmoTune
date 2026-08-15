const User = require('../../models/User');
const ConversationDNA = require('../../models/ConversationDNA');
const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityError = require('../errors/IdentityError');
const jwtService = require('./jwtService');
const sessionService = require('./sessionService');
const deviceService = require('./deviceService');
const loginHistoryService = require('./loginHistoryService');
const aiSecurityService = require('./aiSecurityService');
const passwordService = require('./passwordService');
const { hashPassword, comparePassword } = require('../utils/crypto');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { ROLE_PERMISSIONS } = require('../rbac/permissions');

const IdentityService = {
  async signup(options = {}) {
    const { username, email, password, fullName, phone, countryCode, ip, userAgent, deviceFingerprint, deviceName } = options;

    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase().trim() },
        { username: username?.trim() },
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (existingUser) {
      if (existingUser.email === email?.toLowerCase().trim()) {
        throw IdentityError.duplicateResource('email');
      }
      if (existingUser.username === username?.trim()) {
        throw IdentityError.duplicateResource('username');
      }
      if (phone && existingUser.phone === phone) {
        throw IdentityError.duplicateResource('phone number');
      }
      throw IdentityError.duplicateResource('email or username');
    }

    if (password) {
      const errors = passwordService.validatePasswordStrength(password);
      if (errors.length > 0) {
        throw new IdentityError(errors.join('. '), 'WEAK_PASSWORD', 400, errors);
      }
    }

    const userData = {
      username,
      email: email?.toLowerCase().trim(),
      password,
      ...(fullName && { fullName }),
      ...(phone && { phone }),
      ...(countryCode && { countryCode }),
      roles: ['user'],
    };

    const user = await User.create(userData);

    if (password) {
      await passwordService.addPasswordHistory(user._id, user.password, 'user');
    }

    if (email) {
      const verification = await require('./emailVerificationService').createVerification(user._id, email);
      if (IDENTITY_CONFIG.emailVerification.required && !verification.delivery?.sent) {
        throw new IdentityError('Email verification delivery is unavailable', 'VERIFICATION_DELIVERY_UNAVAILABLE', 503);
      }
    }

    const tokens = await this._createSessionAndTokens(user, { ip, userAgent, deviceFingerprint, deviceName });

    await loginHistoryService.recordLoginAttempt(user._id, 'signup', {
      ip, userAgent, deviceFingerprint,
      method: email ? 'email_password' : phone ? 'phone_password' : 'username_password',
      success: true,
      sessionId: tokens.session.sessionId,
    });

    await this._initAIProfile(user._id, options);

    await logEvent({
      action: AUDIT_ACTIONS.SIGNUP,
      userId: user._id,
      ip,
      userAgent,
      metadata: { method: 'email_password' },
    });

    return {
      user: user.toPublicJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      session: {
        id: tokens.session.sessionId,
        deviceName: tokens.session.deviceName,
      },
    };
  },

  async login(options = {}) {
    const { email, phone, username, password, ip, userAgent, deviceFingerprint, deviceName, location } = options;

    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    } else if (phone) {
      user = await User.findOne({ phone }).select('+password');
    } else if (username) {
      user = await User.findOne({ username: username.trim() }).select('+password');
    }

    if (!user) {
      throw IdentityError.invalidCredentials();
    }

    if (user.deletedAt) {
      throw IdentityError.accountDeleted();
    }

    if (IDENTITY_CONFIG.emailVerification.required && !user.emailVerified) {
      throw IdentityError.emailNotVerified();
    }

    if (password) {
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        await loginHistoryService.recordLoginAttempt(user._id, 'login_failure', {
          ip, userAgent, deviceFingerprint, method: email ? 'email_password' : 'username_password',
          failureReason: 'wrong_password', success: false,
        });
        await this._checkAndLockAccount(user._id);
        throw IdentityError.invalidCredentials();
      }
    }

    const isLocked = await loginHistoryService.isAccountLocked(user._id);
    if (isLocked) {
      const remaining = await loginHistoryService.getRemainingLockoutTime(user._id);
      throw IdentityError.accountLocked(remaining);
    }

    const risk = await aiSecurityService.shouldBlockLogin(user._id, {
      ip, userAgent, deviceFingerprint, location,
    });

    if (risk.shouldBlock) {
      await loginHistoryService.recordLoginAttempt(user._id, 'login_failure', {
        ip, userAgent, deviceFingerprint,
        method: email ? 'email_password' : 'username_password',
        failureReason: 'blocked_by_ai_security', success: false,
        riskScore: risk.risk.score,
        riskFactors: risk.risk.factors,
      });
      throw IdentityError.verificationRequired();
    }

    user.status = 'online';
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    const tokens = await this._createSessionAndTokens(user, {
      ip, userAgent, deviceFingerprint, deviceName, location,
    });

    if (tokens.device && deviceFingerprint && !tokens.device.isTrusted && !risk.requiresVerification) {
      if (IDENTITY_CONFIG.device.fingerprintEnabled) {
        await deviceService.trustDevice(tokens.device.deviceId, user._id);
      }
    }

    await loginHistoryService.recordLoginAttempt(user._id, 'login_success', {
      ip, userAgent, deviceFingerprint,
      deviceId: tokens.device?.deviceId,
      sessionId: tokens.session.sessionId,
      method: email ? 'email_password' : phone ? 'phone_password' : 'username_password',
      riskScore: risk.risk.score,
      riskFactors: risk.risk.factors,
      success: true,
    });

    await logEvent({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      userId: user._id,
      sessionId: tokens.session.sessionId,
      deviceId: tokens.device?.deviceId,
      ip, userAgent,
      riskScore: risk.risk.score,
    });

    return {
      user: user.toPublicJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      session: {
        id: tokens.session.sessionId,
        deviceName: tokens.session.deviceName,
      },
      risk: risk.risk,
    };
  },

  async logout(userId, sessionId, options = {}) {
    if (sessionId) {
      await sessionService.terminateSession(sessionId, 'user_logout');
    } else {
      await sessionService.terminateAllSessions(userId);
    }

    try {
      const user = await User.findById(userId);
      if (user) {
        user.status = 'offline';
        user.lastActive = new Date();
        await user.save({ validateBeforeSave: false });
      }
    } catch {}

    await loginHistoryService.recordLoginAttempt(userId, 'logout', {
      ip: options.ip,
      userAgent: options.userAgent,
      sessionId,
      success: true,
    });

    return { message: 'Logged out successfully' };
  },

  async refreshTokens(refreshTokenStr, options = {}) {
    if (!refreshTokenStr) {
      throw new IdentityError('Refresh token required', 'REFRESH_TOKEN_REQUIRED', 400);
    }

    const decoded = jwtService.verifyRefreshToken(refreshTokenStr);
    const user = await User.findById(decoded.userId);
    if (!user) throw IdentityError.userNotFound();
    if (user.deletedAt) throw IdentityError.accountDeleted();

    const result = await jwtService.rotateRefreshToken(refreshTokenStr, user, {
      ip: options.ip,
      userAgent: options.userAgent,
    });

    await sessionService.updateActivity(decoded.sessionId, options.ip);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  },

  async getProfile(userId) {
    const user = await User.findById(userId).select('-refreshToken -refreshTokens -encryptionKey');
    if (!user) throw IdentityError.userNotFound();

    const loginStats = await loginHistoryService.getLoginStats(userId);

    return {
      ...user.toPublicJSON(),
      loginStats,
    };
  },

  async updateProfile(userId, updates) {
    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!user) throw IdentityError.userNotFound();
    return user.toPublicJSON();
  },

  async _createSessionAndTokens(user, options = {}) {
    const family = jwtService.generateTokenFamily();
    const accessToken = jwtService.generateAccessToken(user._id, 'pending');
    const refreshToken = require('../utils/crypto').generateSessionToken();

    let device = null;
    if (options.deviceFingerprint) {
      device = await deviceService.getOrCreateDevice(user._id, {
        'user-agent': options.userAgent,
      }, {
        fingerprint: options.deviceFingerprint,
        deviceName: options.deviceName,
        ip: options.ip,
      });
    }

    const session = await sessionService.createSession(user, refreshToken, device, {
      deviceName: options.deviceName,
      deviceFingerprint: options.deviceFingerprint,
      platform: device?.platform,
      browser: device?.browser,
      os: device?.os,
      ip: options.ip,
      userAgent: options.userAgent,
    });

    const permissions = [...new Set((user.roles || ['user'])
      .flatMap(role => ROLE_PERMISSIONS[role] || []))];
    const tokenContext = {
      additionalPayload: {
        roles: user.roles || ['user'],
        permissions,
        deviceId: device?._id?.toString(),
      },
    };
    const finalAccessToken = jwtService.generateAccessToken(user._id, session.sessionId, tokenContext);
    const finalRefreshToken = require('jsonwebtoken').sign(
      {
        userId: user._id.toString(),
        sessionId: session.sessionId,
        family: session.refreshTokenFamily,
        version: 1,
        jti: require('crypto').randomBytes(16).toString('hex'),
        iss: IDENTITY_CONFIG.jwt.refreshToken.issuer,
        aud: IDENTITY_CONFIG.jwt.refreshToken.audience,
        iat: Math.floor(Date.now() / 1000),
        type: 'refresh',
        roles: user.roles || ['user'],
        deviceId: device?._id?.toString(),
      },
      IDENTITY_CONFIG.jwt.refreshToken.secret,
      { expiresIn: IDENTITY_CONFIG.jwt.refreshToken.expiry }
    );

    session.refreshTokenHash = require('../utils/crypto').hashRefreshToken(finalRefreshToken);
    await session.save();

    return { accessToken: finalAccessToken, refreshToken: finalRefreshToken, session, device };
  },

  async _checkAndLockAccount(userId) {
    const isLocked = await loginHistoryService.isAccountLocked(userId);
    if (isLocked) {
      await logEvent({
        action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
        userId,
        severity: 'warning',
      });
      return true;
    }
    return false;
  },

  async _initAIProfile(userId, options) {
    try {
      const existingDNA = await ConversationDNA.findOne({ user: userId });
      if (!existingDNA) {
        const tz = options.timezone || 'UTC';
        const lang = options.language || 'en';
        const region = options.region || 'US';

        await ConversationDNA.create({
          user: userId,
          language: {
            primary: lang,
            confidence: 1.0,
          },
          behavioralPatterns: {
            activeHours: [new Date().getHours()],
            timeBuckets: [{
              hour: new Date().getHours(),
              messageCount: 0,
              avgLength: 0,
              topEmotions: [],
            }],
          },
          metadata: {
            firstMessageAt: new Date(),
            lastMessageAt: new Date(),
            totalConversations: 0,
            totalMessages: 0,
            lastUpdated: new Date(),
            updateCount: 0,
          },
        });
      }
    } catch (err) {
      console.error('Failed to initialize AI profile:', err.message);
    }
  },
};

module.exports = IdentityService;
