const Session = require('../models/Session');
const LoginHistory = require('../models/LoginHistory');
const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityError = require('../errors/IdentityError');
const { generateSessionToken, hashRefreshToken } = require('../utils/crypto');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

const SessionService = {
  async createSession(user, refreshToken, device, options = {}) {
    const sessionId = generateSessionToken();
    const family = require('./jwtService').generateTokenFamily();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const maxSessions = IDENTITY_CONFIG.session.maxConcurrent;
    await Session.updateMany({ user: user._id, isActive: true, isCurrent: true }, { isCurrent: false });
    const activeCount = await Session.countDocuments({ user: user._id, isActive: true });

    if (activeCount >= maxSessions) {
      const oldestSession = await Session.findOne({ user: user._id, isActive: true })
        .sort({ lastActivity: 1 });

      if (oldestSession) {
        oldestSession.isActive = false;
        oldestSession.loggedOutAt = new Date();
        oldestSession.logoutReason = 'force_logout_other';
        await oldestSession.save();
      }
    }

    const session = await Session.create({
      user: user._id,
      sessionId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      refreshTokenFamily: family,
      refreshTokenVersion: 1,
      device: device?._id,
      deviceName: options.deviceName || device?.name || 'Unknown',
      deviceFingerprint: options.deviceFingerprint,
      platform: options.platform || 'unknown',
      browser: options.browser || 'unknown',
      os: options.os || 'unknown',
      ip: options.ip,
      userAgent: options.userAgent,
      isActive: true,
      isCurrent: true,
      lastActivity: new Date(),
      expiresAt,
    });

    await logEvent({
      action: AUDIT_ACTIONS.SESSION_CREATED,
      userId: user._id,
      sessionId,
      deviceId: device?.deviceId,
      ip: options.ip,
      userAgent: options.userAgent,
    });

    return session;
  },

  async getActiveSessions(userId) {
    return Session.find({ user: userId, isActive: true })
      .sort({ lastActivity: -1 })
      .lean();
  },

  async getUserSessions(userId) {
    return this.getActiveSessions(userId);
  },

  async getSessionById(sessionId) {
    return Session.findOne({ sessionId });
  },

  async terminateSession(sessionId, reason = 'user_logout') {
    const session = await Session.findOne({ sessionId });
    if (!session) throw IdentityError.invalidSession();

    session.isActive = false;
    session.loggedOutAt = new Date();
    session.logoutReason = reason;
    await session.save();

    try {
      require('../../socketRegistry').disconnectSession(sessionId, reason);
    } catch {}

    await logEvent({
      action: reason === 'admin_terminated' ? AUDIT_ACTIONS.SESSION_TERMINATED_ADMIN : AUDIT_ACTIONS.SESSION_TERMINATED,
      userId: session.user,
      sessionId,
      metadata: { reason },
    });

    return session;
  },

  async terminateOtherSessions(userId, currentSessionId) {
    const result = await Session.updateMany(
      { user: userId, isActive: true, sessionId: { $ne: currentSessionId } },
      { isActive: false, loggedOutAt: new Date(), logoutReason: 'force_logout_other' }
    );

    await logEvent({
      action: AUDIT_ACTIONS.SESSION_TERMINATED_ADMIN,
      userId,
      metadata: { terminatedCount: result.modifiedCount, reason: 'user_initiated' },
    });

    return result;
  },

  async terminateAllSessions(userId, excludeSessionId = null, reason = 'user_logout') {
    const reasons = new Set(['user_logout', 'expired', 'admin_terminated', 'password_changed', 'reuse_detected', 'force_logout_other', 'account_blocked', 'account_deletion', 'admin_deletion']);
    if (reasons.has(excludeSessionId)) {
      reason = excludeSessionId;
      excludeSessionId = null;
    }
    const filter = { user: userId, isActive: true };
    if (excludeSessionId) {
      filter.sessionId = { $ne: excludeSessionId };
    }

    const sessions = await Session.find(filter).select('sessionId');
    const result = await Session.updateMany(
      filter,
      { isActive: false, loggedOutAt: new Date(), logoutReason: reasons.has(reason) ? reason : 'user_logout' }
    );
    try {
      require('../../socketRegistry').disconnectUser(userId.toString(), excludeSessionId);
      for (const session of sessions) {
        if (session.sessionId !== excludeSessionId) {
          require('../../socketRegistry').disconnectSession(session.sessionId, 'session_revoked');
        }
      }
    } catch {}
    return result;
  },

  async updateActivity(sessionId, ip) {
    const update = { lastActivity: new Date() };
    if (ip) update.lastActivityIp = ip;

    await Session.updateOne({ sessionId }, { $set: update });
  },

  async validateSession(sessionId) {
    const session = await Session.findOne({ sessionId, isActive: true });
    if (!session) throw IdentityError.sessionExpired();
    if (session.isExpired()) {
      session.isActive = false;
      session.loggedOutAt = new Date();
      session.logoutReason = 'expired';
      await session.save();
      throw IdentityError.sessionExpired();
    }
    return session;
  },
};

module.exports = SessionService;
