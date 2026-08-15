const Device = require('../models/Device');
const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityError = require('../errors/IdentityError');
const { generateDeviceFingerprint } = require('../utils/crypto');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

const DeviceService = {
  async getOrCreateDevice(userId, headers, options = {}) {
    const fingerprint = options.fingerprint || generateDeviceFingerprint(headers);
    const userAgent = headers['user-agent'] || '';
    const parsedUA = this._parseUserAgent(userAgent);

    let device = await Device.findOne({ user: userId, fingerprint });

    if (!device) {
      const deviceId = require('crypto').randomBytes(16).toString('hex');

      device = await Device.create({
        user: userId,
        deviceId,
        fingerprint,
        name: options.deviceName || parsedUA.name || 'Unknown Device',
        type: parsedUA.type || 'unknown',
        platform: options.platform || parsedUA.platform || 'unknown',
        browser: parsedUA.browser || 'unknown',
        os: parsedUA.os || 'unknown',
        isTrusted: options.trust !== false && false,
        lastUsedAt: new Date(),
        lastIp: options.ip,
        sessionCount: 1,
      });
    } else {
      device.lastUsedAt = new Date();
      device.lastIp = options.ip;
      device.sessionCount += 1;

      if (device.name === 'Unknown Device' && options.deviceName) {
        device.name = options.deviceName;
      }

      await device.save();
    }

    return device;
  },

  async trustDevice(deviceId, userId) {
    const device = await Device.findOne({ deviceId, user: userId });
    if (!device) throw new IdentityError('Device not found', 'DEVICE_NOT_FOUND', 404);

    device.isTrusted = true;
    device.trustedAt = new Date();
    device.trustExpiresAt = new Date(Date.now() + IDENTITY_CONFIG.device.trustExpiryDays * 24 * 60 * 60 * 1000);
    await device.save();

    await logEvent({
      action: AUDIT_ACTIONS.DEVICE_TRUSTED,
      userId,
      deviceId,
    });

    return device;
  },

  async untrustDevice(deviceId, userId) {
    const device = await Device.findOne({ deviceId, user: userId });
    if (!device) throw new IdentityError('Device not found', 'DEVICE_NOT_FOUND', 404);

    device.isTrusted = false;
    device.trustedAt = null;
    device.trustExpiresAt = null;
    await device.save();

    await logEvent({
      action: AUDIT_ACTIONS.DEVICE_UNTRUSTED,
      userId,
      deviceId,
    });

    return device;
  },

  async getUserDevices(userId) {
    return Device.find({ user: userId, isActive: true })
      .sort({ lastUsedAt: -1 })
      .lean();
  },

  async removeDevice(deviceId, userId) {
    const device = await Device.findOne({ deviceId, user: userId });
    if (!device) throw new IdentityError('Device not found', 'DEVICE_NOT_FOUND', 404);

    device.isActive = false;
    await device.save();

    await Session.updateMany(
      { device: device._id, isActive: true },
      { isActive: false, loggedOutAt: new Date(), logoutReason: 'user_logout' }
    );
    try {
      require('../../socketRegistry').disconnectUser(userId.toString());
    } catch {}

    return device;
  },

  async isDeviceTrusted(userId, fingerprint) {
    const device = await Device.findOne({ user: userId, fingerprint, isActive: true });
    if (!device) return false;
    if (!device.isTrusted) return false;
    if (device.isTrustExpired()) return false;
    return true;
  },

  _parseUserAgent(ua) {
    const result = { name: 'Unknown Device', type: 'unknown', platform: 'unknown', browser: 'unknown', os: 'unknown' };

    if (!ua) return result;

    if (/mobile|android|iphone|ipad/i.test(ua)) {
      result.type = /ipad/i.test(ua) ? 'tablet' : 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      result.type = 'tablet';
    } else {
      result.type = 'desktop';
    }

    if (/windows/i.test(ua)) result.os = 'Windows';
    else if (/macintosh|mac os/i.test(ua)) result.os = 'macOS';
    else if (/linux/i.test(ua)) result.os = 'Linux';
    else if (/android/i.test(ua)) result.os = 'Android';
    else if (/iphone|ipad/i.test(ua)) result.os = 'iOS';

    if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) result.browser = 'Chrome';
    else if (/firefox/i.test(ua)) result.browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) result.browser = 'Safari';
    else if (/edge|edg/i.test(ua)) result.browser = 'Edge';

    result.name = `${result.browser} on ${result.os}`;

    return result;
  },
};

const Session = require('../models/Session');

module.exports = DeviceService;
