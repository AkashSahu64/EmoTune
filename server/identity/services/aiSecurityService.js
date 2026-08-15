const { IDENTITY_CONFIG } = require('../config/identityConfig');
const LoginHistory = require('../models/LoginHistory');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

const AISecurityService = {
  async assessLoginRisk(userId, options = {}) {
    if (!IDENTITY_CONFIG.aiSecurity.enabled) {
      return { score: 0, level: 'low', factors: [], requiresVerification: false };
    }

    const factors = [];
    let score = 0;

    const [deviceRisk, locationRisk, timingRisk, behaviorRisk, travelRisk] = await Promise.all([
      this._assessDeviceRisk(userId, options.deviceFingerprint),
      this._assessLocationRisk(userId, options.ip, options.location),
      this._assessTimingRisk(userId),
      this._assessBehaviorRisk(userId, options),
      this._checkImpossibleTravel(userId, options.ip, options.location),
    ]);
    score += deviceRisk.score;
    if (deviceRisk.factor) factors.push(deviceRisk.factor);
    score += locationRisk.score;
    if (locationRisk.factor) factors.push(locationRisk.factor);
    score += timingRisk.score;
    if (timingRisk.factor) factors.push(timingRisk.factor);
    score += behaviorRisk.score;
    if (behaviorRisk.factor) factors.push(behaviorRisk.factor);
    score += travelRisk.score;
    if (travelRisk.factor) factors.push(travelRisk.factor);

    score = Math.min(100, Math.max(0, score));

    const level = score < 30 ? 'low' : score < 60 ? 'medium' : score < 80 ? 'high' : 'critical';
    const requiresVerification = score >= IDENTITY_CONFIG.aiSecurity.riskThreshold;

    if (score >= 50) {
      const severity = score >= 80 ? 'critical' : 'warning';
      await logEvent({
        action: score >= 80 ? AUDIT_ACTIONS.SUSPICIOUS_LOGIN_DETECTED : AUDIT_ACTIONS.LOGIN_FAILURE,
        userId,
        ip: options.ip,
        userAgent: options.userAgent,
        riskScore: score,
        metadata: { factors, level },
        severity,
      });
    }

    return { score, level, factors, requiresVerification };
  },

  async _assessDeviceRisk(userId, fingerprint) {
    if (!fingerprint) return { score: 0, factor: null };

    const Device = require('../models/Device');
    const device = await Device.findOne({ user: userId, fingerprint, isActive: true });

    if (!device) {
      return { score: 25, factor: 'unknown_device' };
    }

    if (!device.isTrusted) {
      return { score: 15, factor: 'untrusted_device' };
    }

    if (device.isTrustExpired()) {
      return { score: 10, factor: 'trust_expired' };
    }

    return { score: 0, factor: null };
  },

  async _assessLocationRisk(userId, ip, location) {
    if (!ip) return { score: 0, factor: null };

    const recentLogins = await LoginHistory.find({
      userId,
      action: 'login_success',
    }).sort({ createdAt: -1 }).limit(5).lean();

    if (recentLogins.length === 0) return { score: 5, factor: 'first_login' };

    const knownIps = new Set(recentLogins.map(l => l.ip));
    if (!knownIps.has(ip)) {
      return { score: 15, factor: 'new_ip_address' };
    }

    return { score: 0, factor: null };
  },

  async _assessTimingRisk(userId) {
    const hour = new Date().getHours();
    const recentLogins = await LoginHistory.find({
      userId,
      action: 'login_success',
    }).sort({ createdAt: -1 }).limit(10).lean();

    if (recentLogins.length < 3) return { score: 0, factor: null };

    const activeHours = new Set(recentLogins.map(l => new Date(l.createdAt).getHours()));
    if (!activeHours.has(hour) && activeHours.size >= 3) {
      return { score: 10, factor: 'unusual_login_time' };
    }

    return { score: 0, factor: null };
  },

  async _assessBehaviorRisk(userId, options) {
    const recentHistory = await LoginHistory.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).sort({ createdAt: -1 }).limit(20).lean();

    if (recentHistory.length === 0) return { score: 5, factor: 'no_recent_history' };

    const recentFailures = recentHistory.filter(h => h.action === 'login_failure').length;
    if (recentFailures >= 3) {
      return { score: 20, factor: 'multiple_recent_failures' };
    }

    const browsers = new Set(recentHistory.filter(h => h.userAgent).map(h => h.userAgent?.split('/')[0]));
    if (options.userAgent && browsers.size >= 3) {
      const currentBrowser = options.userAgent?.split('/')[0];
      if (![...browsers].some(b => b && currentBrowser && b.includes(currentBrowser))) {
        return { score: 5, factor: 'browser_change' };
      }
    }

    return { score: 0, factor: null };
  },

  async _checkImpossibleTravel(userId, currentIp, currentLocation) {
    if (!currentIp) return { score: 0, factor: null };

    const lastLogin = await LoginHistory.findOne({
      userId,
      action: 'login_success',
    }).sort({ createdAt: -1 }).lean();

    if (!lastLogin || !lastLogin.ip) return { score: 0, factor: null };

    if (lastLogin.ip === currentIp) return { score: 0, factor: null };

    const timeDiff = Date.now() - new Date(lastLogin.createdAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 1) {
      return { score: 30, factor: 'impossible_travel' };
    }

    return { score: 0, factor: null };
  },

  async shouldBlockLogin(userId, options = {}) {
    const risk = await this.assessLoginRisk(userId, options);

    const LoginHistoryService = require('./loginHistoryService');
    const isLocked = await LoginHistoryService.isAccountLocked(userId);

    return {
      shouldBlock: isLocked || (risk.score >= 90),
      requiresVerification: risk.requiresVerification,
      risk,
      isLocked,
    };
  },
};

module.exports = AISecurityService;
