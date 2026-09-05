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
const authPerf = require('../utils/authPerf');

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
    const totalPerf = authPerf.start('login_controller_total');

    let user;
    const lookupPerf = authPerf.start('user_find_one');
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    } else if (phone) {
      user = await User.findOne({ phone }).select('+password');
    } else if (username) {
      user = await User.findOne({ username: username.trim() }).select('+password');
    }
    authPerf.end(lookupPerf);

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
      const bcryptPerf = authPerf.start('bcrypt_compare');
      const isMatch = await comparePassword(password, user.password);
      authPerf.end(bcryptPerf);
      if (!isMatch) {
        await loginHistoryService.recordLoginAttempt(user._id, 'login_failure', {
          ip, userAgent, deviceFingerprint, method: email ? 'email_password' : 'username_password',
          failureReason: 'wrong_password', success: false,
        });
        await this._checkAndLockAccount(user._id);
        throw IdentityError.invalidCredentials();
      }
    }

    const lockPerf = authPerf.start('account_lock_check');
    const isLocked = await loginHistoryService.isAccountLocked(user._id);
    authPerf.end(lockPerf);
    if (isLocked) {
      const remaining = await loginHistoryService.getRemainingLockoutTime(user._id);
      throw IdentityError.accountLocked(remaining);
    }

    const riskPerf = authPerf.start('ai_risk_analysis');
    const risk = await aiSecurityService.shouldBlockLogin(user._id, {
      ip, userAgent, deviceFingerprint, location, isLocked,
    });
    authPerf.end(riskPerf);

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

    const userUpdatePerf = authPerf.start('user_status_update');
    await User.updateOne({ _id: user._id }, { $set: { status: 'online', lastActive: new Date() } });
    authPerf.end(userUpdatePerf);

    const sessionPerf = authPerf.start('device_and_session_creation');
    const tokens = await this._createSessionAndTokens(user, {
      ip, userAgent, deviceFingerprint, deviceName, location,
    });
    authPerf.end(sessionPerf);

    if (tokens.device && deviceFingerprint && !tokens.device.isTrusted && !risk.requiresVerification) {
      if (IDENTITY_CONFIG.device.fingerprintEnabled) {
        await deviceService.trustDevice(tokens.device.deviceId, user._id);
      }
    }

    const historyPerf = authPerf.start('login_history');
    await loginHistoryService.recordLoginAttempt(user._id, 'login_success', {
      ip, userAgent, deviceFingerprint,
      deviceId: tokens.device?.deviceId,
      sessionId: tokens.session.sessionId,
      method: email ? 'email_password' : phone ? 'phone_password' : 'username_password',
      riskScore: risk.risk.score,
      riskFactors: risk.risk.factors,
      success: true,
    });
    authPerf.end(historyPerf);

    const auditPerf = authPerf.start('login_audit_event');
    await logEvent({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      userId: user._id,
      sessionId: tokens.session.sessionId,
      deviceId: tokens.device?.deviceId,
      ip, userAgent,
      riskScore: risk.risk.score,
    });
    authPerf.end(auditPerf);

    const result = {
      user: user.toPublicJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      session: {
        id: tokens.session.sessionId,
        deviceName: tokens.session.deviceName,
      },
      risk: risk.risk,
    };
    authPerf.end(totalPerf);
    return result;
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

    // Keep session restoration focused on the profile needed by the app shell.
    // Login analytics belongs to the dedicated history endpoint and must not
    // block dashboard startup with multiple aggregate queries.
    return user.toPublicJSON();
  },

  async updateProfile(userId, updates) {
    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!user) throw IdentityError.userNotFound();
    return user.toPublicJSON();
  },

  async _createSessionAndTokens(user, options = {}) {
    const family = jwtService.generateTokenFamily();
    const sessionId = require('../utils/crypto').generateSessionToken();

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

    const finalRefreshToken = jwtService.generateRefreshToken(user._id, sessionId, family, 1, {
      additionalPayload: {
        roles: user.roles || ['user'],
        deviceId: device?._id?.toString(),
      },
    });

    const session = await sessionService.createSession(user, finalRefreshToken, device, {
      sessionId,
      refreshTokenFamily: family,
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
