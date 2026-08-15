const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityService = require('../services/identityService');
const passwordService = require('../services/passwordService');
const sessionService = require('../services/sessionService');
const emailVerificationService = require('../services/emailVerificationService');
const loginHistoryService = require('../services/loginHistoryService');
const auditService = require('../services/auditService');
const IdentityError = require('../errors/IdentityError');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');
const User = require('../../models/User');

const authController = {
  async signup(req, res, next) {
    try {
      const { username, email, password, fullName, phone, countryCode, deviceName, timezone, language } = req.body;

      const result = await IdentityService.signup({
        username,
        email,
        password,
        fullName,
        phone,
        countryCode,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.headers['x-device-fingerprint'],
        deviceName,
        timezone,
        language,
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
        maxAge: IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAge,
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          session: result.session,
        },
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        });
      }
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, username, phone, password, rememberMe, countryCode, deviceName } = req.body;

      const result = await IdentityService.login({
        email,
        username,
        phone,
        password,
        countryCode,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.headers['x-device-fingerprint'],
        deviceName,
      });

      const cookieMaxAge = rememberMe
        ? IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAge
        : IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAgeSession;

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
        maxAge: cookieMaxAge,
      });

      const response = {
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          session: result.session,
        },
      };

      if (result.risk && result.risk.score > 0) {
        response.data.risk = result.risk;
      }

      res.json(response);
    } catch (error) {
      if (error instanceof IdentityError) {
        const statusCode = error.statusCode || 401;
        return res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        });
      }
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      const sessionId = req.user?.sessionId;
      const refreshToken = req.cookies?.refreshToken;

      const result = await IdentityService.logout(req.user?.id, sessionId, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
      });

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required',
          code: 'REFRESH_TOKEN_REQUIRED',
        });
      }

      const result = await IdentityService.refreshTokens(refreshToken, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
        maxAge: IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAge,
      });

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        const statusCode = error.statusCode || 401;
        if (statusCode === 401) {
          res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: IDENTITY_CONFIG.security.secureCookies,
            sameSite: 'strict',
            path: '/api/identity/auth',
          });
        }
        return res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email, username, phone } = req.body;
      let user = null;
      let identifier = null;
      let identifierType = 'email';

      if (email) {
        identifier = email.toLowerCase().trim();
        user = await User.findOne({ email: identifier });
        identifierType = 'email';
      } else if (username) {
        identifier = username.trim();
        user = await User.findOne({ username: identifier });
        identifierType = 'username';
      } else if (phone) {
        identifier = phone.replace(/\s/g, '');
        user = await User.findOne({ phone: identifier });
        identifierType = 'phone';
      }

      if (!user || !identifier) {
        return res.json({
          success: true,
          message: 'If an account exists with that information, a password reset code has been sent.',
        });
      }

      const userEmail = user.email;
      const result = await passwordService.initiatePasswordReset(
        user._id, userEmail, identifierType,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      res.json({
        success: true,
        message: 'If an account exists with that information, a password reset code has been sent.',
        data: {
          email: result.email,
          devMode: result.devMode || false,
          ...(result.devMode && { otp: result.otp }),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyResetCode(req, res, next) {
    try {
      const { email, otp } = req.body;

      const result = await passwordService.verifyResetOTP(email, otp);

      res.json({
        success: true,
        message: 'Code verified successfully',
        data: {
          verificationToken: result.verificationToken,
        },
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { verificationToken, password } = req.body;

      const result = await passwordService.completePasswordReset(verificationToken, password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const result = await passwordService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      await sessionService.terminateAllSessions(req.user.id, 'password_changed');

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      const result = await emailVerificationService.verifyEmail(token);

      if (result) {
        await User.findByIdAndUpdate(result.userId, { emailVerified: true });
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async resendVerification(req, res, next) {
    try {
      const email = req.body?.email || req.user?.email;
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'EMAIL_REQUIRED',
        });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      if (user.emailVerified) {
        return res.json({
          success: true,
          message: 'Email is already verified',
        });
      }

      await emailVerificationService.sendVerificationEmail(user, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async getOAuthProviders(req, res, next) {
    try {
      const { getEnabledOAuthProviders } = require('../oauth/index');
      const providers = getEnabledOAuthProviders();
      res.json({
        success: true,
        data: { providers },
      });
    } catch (error) {
      next(error);
    }
  },

  async oauthCallback(req, res, next) {
    try {
      const { provider, code } = req.body;
      const { state } = req.body;
      const { verifyState } = require('../oauth/oauthState');
      if (!verifyState(state, provider)) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OAuth state', code: 'OAUTH_STATE_INVALID' });
      }
      const { getOAuthProvider } = require('../oauth/index');

      const oauthProvider = getOAuthProvider(provider);
      if (!oauthProvider || !oauthProvider.isEnabled()) {
        return res.status(400).json({
          success: false,
          error: 'OAuth provider not available',
          code: 'OAUTH_PROVIDER_UNAVAILABLE',
        });
      }

      const tokenData = await oauthProvider.exchangeCode(code);
      if (provider === 'google' && tokenData.id_token) {
        await oauthProvider.verifyIdToken(tokenData.id_token, state);
      }
      const profile = await oauthProvider.getUserProfile(tokenData.access_token || tokenData.id_token);

      let user = await User.findOne({ email: profile.email.toLowerCase() });
      if (!user) {
        user = await User.create({
          email: profile.email.toLowerCase(),
          username: profile.username || profile.email.split('@')[0],
          displayName: profile.name,
          avatar: profile.avatar,
          emailVerified: profile.verified || false,
          roles: ['user'],
          oauthProviders: [{ provider, id: profile.id, email: profile.email }],
        });
      } else {
        const existingProvider = user.oauthProviders?.find(p => p.provider === provider);
        if (!existingProvider) {
          user.oauthProviders = user.oauthProviders || [];
          user.oauthProviders.push({ provider, id: profile.id, email: profile.email });
        }
        if (profile.avatar && !user.avatar) {
          user.avatar = profile.avatar;
        }
        if (profile.verified && !user.emailVerified) {
          user.emailVerified = true;
        }
        await user.save({ validateBeforeSave: false });
      }

      const result = await IdentityService._createSessionAndTokens(user, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.headers['x-device-fingerprint'],
      });

      await IdentityService._initAIProfile(user._id, {
        timezone: req.body.timezone,
        language: req.body.language || user.language,
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
        maxAge: IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAge,
      });

      await logEvent({
        action: AUDIT_ACTIONS.OAUTH_LOGIN,
        userId: user._id,
        sessionId: result.session.sessionId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { provider },
      });

      res.json({
        success: true,
        message: 'OAuth login successful',
        data: {
          user: user.toPublicJSON(),
          accessToken: result.accessToken,
          session: { id: result.session.sessionId },
        },
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async linkOAuthProvider(req, res, next) {
    try {
      const { provider, code } = req.body;
      const { state } = req.body;
      const { verifyState } = require('../oauth/oauthState');
      if (!verifyState(state, provider)) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OAuth state', code: 'OAUTH_STATE_INVALID' });
      }
      const { getOAuthProvider } = require('../oauth/index');

      const oauthProvider = getOAuthProvider(provider);
      if (!oauthProvider || !oauthProvider.isEnabled()) {
        return res.status(400).json({
          success: false,
          error: 'OAuth provider not available',
          code: 'OAUTH_PROVIDER_UNAVAILABLE',
        });
      }

      const tokenData = await oauthProvider.exchangeCode(code);
      const profile = await oauthProvider.getUserProfile(tokenData.access_token || tokenData.id_token);

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      const existingProvider = user.oauthProviders?.find(p => p.provider === provider);
      if (existingProvider) {
        return res.status(409).json({
          success: false,
          error: `OAuth provider "${provider}" already linked`,
          code: 'OAUTH_PROVIDER_ALREADY_LINKED',
        });
      }

      user.oauthProviders = user.oauthProviders || [];
      user.oauthProviders.push({ provider, id: profile.id, email: profile.email });
      await user.save({ validateBeforeSave: false });

      res.json({
        success: true,
        message: `OAuth provider "${provider}" linked successfully`,
        code: 'OAUTH_PROVIDER_LINKED',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async unlinkOAuthProvider(req, res, next) {
    try {
      const { provider } = req.params;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      const existingLength = user.oauthProviders?.length || 0;
      if (existingLength <= 1 && !user.password) {
        return res.status(400).json({
          success: false,
          error: 'Cannot unlink the only authentication method. Set a password first.',
          code: 'LAST_AUTH_METHOD',
        });
      }

      user.oauthProviders = (user.oauthProviders || []).filter(p => p.provider !== provider);
      await user.save({ validateBeforeSave: false });

      res.json({
        success: true,
        message: `OAuth provider "${provider}" unlinked successfully`,
        code: 'OAUTH_PROVIDER_UNLINKED',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },
};

module.exports = authController;
