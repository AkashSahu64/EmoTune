const jwtService = require('../services/jwtService');
const sessionService = require('../services/sessionService');
const IdentityError = require('../errors/IdentityError');
const User = require('../../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new IdentityError('Access token required', 'ACCESS_TOKEN_REQUIRED', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtService.verifyAccessToken(token);

    const session = await sessionService.getSessionById(decoded.sessionId);
    if (!session) {
      throw new IdentityError('Session not found', 'SESSION_NOT_FOUND', 401);
    }

    if (!session.isActive) {
      throw new IdentityError('Session has been revoked', 'SESSION_REVOKED', 401);
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      await sessionService.terminateSession(decoded.sessionId, 'session_expired');
      throw new IdentityError('Session expired', 'SESSION_EXPIRED', 401);
    }

    if (session.user.toString() !== decoded.userId.toString()) {
      throw new IdentityError('Session does not belong to user', 'SESSION_USER_MISMATCH', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) throw new IdentityError('User not found', 'USER_NOT_FOUND', 401);
    if (user.deletedAt || user.status === 'deleted') {
      throw new IdentityError('Account deleted', 'ACCOUNT_DELETED', 401);
    }
    if (user.status === 'blocked') {
      throw new IdentityError('Account blocked', 'ACCOUNT_BLOCKED', 403);
    }

    const roles = Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : (decoded.roles || ['user']);
    if (decoded.deviceId && session.device && session.device.toString() !== decoded.deviceId.toString()) {
      throw new IdentityError('Device mismatch', 'DEVICE_MISMATCH', 401);
    }

    user.sessionId = decoded.sessionId;
    user.roles = roles;
    user.permissions = decoded.permissions || [];
    req.user = user;
    // Compatibility fields for existing application controllers during migration.
    req.userDocument = user;
    req.userId = user._id;
    req.userModel = user;
    req.session = session;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
        code: 'INVALID_ACCESS_TOKEN',
      });
    }

    if (error instanceof IdentityError) {
      return res.status(error.statusCode || 401).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.session = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtService.verifyAccessToken(token);

    const session = await sessionService.getSessionById(decoded.sessionId);
    if (session && session.isActive) {
      const user = await User.findById(decoded.userId);
      if (!user || user.deletedAt || user.status === 'deleted' || user.status === 'blocked') {
        req.user = null;
        req.session = null;
        return next();
      }
      user.sessionId = decoded.sessionId;
      user.roles = user.roles || decoded.roles || ['user'];
      user.permissions = decoded.permissions || [];
      req.user = user;
      req.userId = user._id;
      req.userDocument = user;
      req.userModel = user;
      req.session = session;
    } else {
      req.user = null;
      req.session = null;
    }
  } catch {
    req.user = null;
    req.session = null;
  }

  next();
};

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authMiddleware: authenticate,
  optionalAuth,
  requireRoles,
};
