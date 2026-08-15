const LoginHistory = require('../models/LoginHistory');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const LoginHistoryService = {
  async recordLoginAttempt(userId, action, options = {}) {
    return LoginHistory.create({
      user: userId,
      action,
      ip: options.ip,
      userAgent: options.userAgent,
      deviceFingerprint: options.deviceFingerprint,
      deviceId: options.deviceId,
      sessionId: options.sessionId,
      method: options.method,
      riskScore: options.riskScore,
      riskFactors: options.riskFactors || [],
      success: options.success !== false,
      failureReason: options.failureReason,
      metadata: options.metadata,
    });
  },

  async getRecentAttempts(userId, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return LoginHistory.find({
      user: userId,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });
  },

  async getFailedAttempts(userId, since = null) {
    const filter = {
      user: userId,
      action: 'login_failure',
    };
    if (since) filter.createdAt = { $gte: since };

    return LoginHistory.countDocuments(filter);
  },

  async getLoginHistory(userId, limit = 50, skip = 0) {
    return LoginHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  async getRecentLoginHistoryByIp(ip, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return LoginHistory.find({
      ip,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });
  },

  async isAccountLocked(userId) {
    const cfg = IDENTITY_CONFIG.login;
    const since = new Date(Date.now() - cfg.lockoutDurationMs);
    const failedCount = await this.getFailedAttempts(userId, since);
    return failedCount >= cfg.maxAttempts;
  },

  async getRemainingLockoutTime(userId) {
    const cfg = IDENTITY_CONFIG.login;
    const recentFailures = await LoginHistory.find({
      user: userId,
      action: 'login_failure',
      createdAt: { $gte: new Date(Date.now() - cfg.lockoutDurationMs) },
    }).sort({ createdAt: -1 }).limit(cfg.maxAttempts);

    if (recentFailures.length < cfg.maxAttempts) return 0;

    const oldestInWindow = recentFailures[recentFailures.length - 1];
    const lockoutEnd = new Date(oldestInWindow.createdAt.getTime() + cfg.lockoutDurationMs);
    const remaining = lockoutEnd.getTime() - Date.now();

    return Math.max(0, Math.ceil(remaining / 1000 / 60));
  },

  async getLoginStats(userId) {
    const totalLogins = await LoginHistory.countDocuments({ user: userId, action: 'login_success' });
    const totalFailures = await LoginHistory.countDocuments({ user: userId, action: 'login_failure' });
    const lastLogin = await LoginHistory.findOne({ user: userId, action: 'login_success' })
      .sort({ createdAt: -1 });

    return {
      totalLogins,
      totalFailures,
      lastLogin: lastLogin?.createdAt || null,
      lastLoginIp: lastLogin?.ip || null,
      lastLoginMethod: lastLogin?.method || null,
    };
  },
};

module.exports = LoginHistoryService;
