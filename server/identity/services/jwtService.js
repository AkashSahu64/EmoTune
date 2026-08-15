const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityError = require('../errors/IdentityError');
const { hashRefreshToken } = require('../utils/crypto');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

const JWTSession = require('../models/Session');

const JWTService = {
  generateAccessToken(userId, sessionId, options = {}) {
    const cfg = IDENTITY_CONFIG.jwt.accessToken;
    const payload = {
      userId: userId.toString(),
      sessionId,
      jti: crypto.randomBytes(16).toString('hex'),
      iss: cfg.issuer,
      aud: cfg.audience,
      iat: Math.floor(Date.now() / 1000),
      type: 'access',
      version: options.version || 1,
      ...options.additionalPayload,
    };

    return jwt.sign(payload, cfg.secret, { expiresIn: cfg.expiry });
  },

  generateRefreshToken(userId, sessionId, family, version = 1, options = {}) {
    const cfg = IDENTITY_CONFIG.jwt.refreshToken;
    const payload = {
      userId: userId.toString(),
      sessionId,
      family,
      version,
      jti: crypto.randomBytes(16).toString('hex'),
      iss: cfg.issuer,
      aud: cfg.audience,
      iat: Math.floor(Date.now() / 1000),
      type: 'refresh',
      ...options.additionalPayload,
    };

    return jwt.sign(payload, cfg.secret, { expiresIn: cfg.expiry });
  },

  verifyAccessToken(token) {
    try {
      const cfg = IDENTITY_CONFIG.jwt.accessToken;
      const decoded = jwt.verify(token, cfg.secret, {
        issuer: cfg.issuer,
        audience: cfg.audience,
      });

      if (decoded.type !== 'access') {
        throw IdentityError.tokenInvalid('Invalid token type');
      }

      return decoded;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw IdentityError.tokenExpired();
      }
      if (err instanceof IdentityError) throw err;
      throw IdentityError.tokenInvalid();
    }
  },

  verifyRefreshToken(token) {
    try {
      const cfg = IDENTITY_CONFIG.jwt.refreshToken;
      const decoded = jwt.verify(token, cfg.secret, {
        issuer: cfg.issuer,
        audience: cfg.audience,
      });

      if (decoded.type !== 'refresh') {
        throw IdentityError.refreshTokenInvalid();
      }

      return decoded;
    } catch (err) {
      if (err instanceof IdentityError) throw err;
      throw IdentityError.refreshTokenInvalid();
    }
  },

  generateTokenFamily() {
    return crypto.randomBytes(24).toString('hex');
  },

  async rotateRefreshToken(oldToken, user, options = {}) {
    const decoded = this.verifyRefreshToken(oldToken);
    const oldHash = hashRefreshToken(oldToken);

    let session = await JWTSession.findOne({
      sessionId: decoded.sessionId,
      refreshTokenFamily: decoded.family,
    });

    if (!session) {
      throw IdentityError.refreshTokenInvalid();
    }

    if (!session.isActive) {
      throw IdentityError.sessionExpired();
    }

    if (session.refreshTokenHash !== oldHash) {
      await this._handleReuseAttack(session, user, decoded);
      throw IdentityError.refreshTokenReused();
    }

    const newVersion = (decoded.version || 1) + 1;
    if (newVersion > IDENTITY_CONFIG.jwt.refreshToken.maxFamilySize) {
      session.isActive = false;
      session.logoutReason = 'reuse_detected';
      await session.save();
      throw IdentityError.refreshTokenInvalid('Refresh token family exhausted');
    }

    const newRefreshToken = this.generateRefreshToken(
      user._id,
      decoded.sessionId,
      decoded.family,
      newVersion,
      options
    );

    const newAccessToken = this.generateAccessToken(
      user._id,
      decoded.sessionId,
      options
    );

    const rotated = await JWTSession.findOneAndUpdate(
      {
        _id: session._id,
        isActive: true,
        refreshTokenHash: oldHash,
        refreshTokenVersion: decoded.version || 1,
      },
      {
        $set: {
          refreshTokenHash: hashRefreshToken(newRefreshToken),
          refreshTokenVersion: newVersion,
          lastActivity: new Date(),
          ...(options.ip ? { lastActivityIp: options.ip } : {}),
        },
      },
      { new: true }
    );
    if (!rotated) {
      await this._handleReuseAttack(session, user, decoded);
      throw IdentityError.refreshTokenReused();
    }
    session = rotated;

    await logEvent({
      action: AUDIT_ACTIONS.REFRESH_TOKEN_ROTATED,
      userId: user._id,
      sessionId: decoded.sessionId,
      ip: options.ip,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, session };
  },

  async _handleReuseAttack(session, user, decoded) {
    session.isActive = false;
    session.logoutReason = 'reuse_detected';
    await session.save();

    await JWTSession.updateMany(
      { user: user._id, isActive: true, _id: { $ne: session._id } },
      { isActive: false, loggedOutAt: new Date(), logoutReason: 'reuse_detected' }
    );

    await logEvent({
      action: AUDIT_ACTIONS.REFRESH_TOKEN_REUSE_DETECTED,
      userId: user._id,
      sessionId: decoded.sessionId,
      metadata: { family: decoded.family, version: decoded.version },
      severity: 'critical',
    });

    if (typeof user.refreshToken !== 'undefined') {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
    }
  },

  async decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  },
};

module.exports = JWTService;
