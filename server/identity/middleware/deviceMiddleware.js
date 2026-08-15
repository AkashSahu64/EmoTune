const deviceService = require('../services/deviceService');

const extractDeviceInfo = (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const platform = extractPlatform(ua);
  const browser = extractBrowser(ua);
  const os = extractOS(ua);

  req.deviceInfo = {
    'user-agent': ua,
    platform,
    browser,
    os,
    fingerprint: req.headers['x-device-fingerprint'] || null,
    deviceName: req.headers['x-device-name'] || null,
  };

  next();
};

const validateDevice = async (req, res, next) => {
  if (!req.user) return next();

  const fingerprint = req.deviceInfo?.fingerprint || req.headers['x-device-fingerprint'];
  if (!fingerprint) return next();

  try {
    const device = await deviceService.getDeviceByFingerprint(req.user.id, fingerprint);
    if (device && device.isBlocked) {
      return res.status(403).json({
        success: false,
        error: 'This device has been blocked. Contact support.',
        code: 'DEVICE_BLOCKED',
        blockedAt: device.blockedAt,
      });
    }

    req.device = device || null;
  } catch {
    req.device = null;
  }

  next();
};

const checkNewDevice = async (req, res, next) => {
  if (!req.user || !req.deviceInfo?.fingerprint) return next();

  try {
    const device = await deviceService.getDeviceByFingerprint(req.user.id, req.deviceInfo.fingerprint);

    if (!device && req.user) {
      req.isNewDevice = true;
    } else {
      req.isNewDevice = false;
    }
  } catch {
    req.isNewDevice = false;
  }

  next();
};

function extractPlatform(ua) {
  if (!ua) return 'unknown';
  if (ua.includes('Android')) return 'android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
  if (ua.includes('Windows')) return 'windows';
  if (ua.includes('Mac OS')) return 'macos';
  if (ua.includes('Linux')) return 'linux';
  return 'unknown';
}

function extractBrowser(ua) {
  if (!ua) return 'unknown';
  if (ua.includes('Edg')) return 'edge';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'opera';
  return 'unknown';
}

function extractOS(ua) {
  if (!ua) return 'unknown';
  if (ua.includes('Windows NT 10')) return 'Windows 10';
  if (ua.includes('Windows NT 11')) return 'Windows 11';
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    return match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
  }
  if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+\.?\d*)/);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (ua.includes('iPhone')) {
    const match = ua.match(/iPhone OS (\d+_\d+)/);
    return match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
  }
  if (ua.includes('Linux')) return 'Linux';
  return 'unknown';
}

module.exports = {
  extractDeviceInfo,
  validateDevice,
  checkNewDevice,
};
