const AuditEvent = require('../models/AuditEvent');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SIGNUP: 'SIGNUP',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  EMAIL_VERIFICATION_SENT: 'EMAIL_VERIFICATION_SENT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  REFRESH_TOKEN_ROTATED: 'REFRESH_TOKEN_ROTATED',
  REFRESH_TOKEN_REUSE_DETECTED: 'REFRESH_TOKEN_REUSE_DETECTED',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_TERMINATED: 'SESSION_TERMINATED',
  SESSION_TERMINATED_ADMIN: 'SESSION_TERMINATED_ADMIN',
  DEVICE_TRUSTED: 'DEVICE_TRUSTED',
  DEVICE_UNTRUSTED: 'DEVICE_UNTRUSTED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  PHONE_CHANGED: 'PHONE_CHANGED',
  SUSPICIOUS_LOGIN_DETECTED: 'SUSPICIOUS_LOGIN_DETECTED',
  IMPOSSIBLE_TRAVEL_DETECTED: 'IMPOSSIBLE_TRAVEL_DETECTED',
  OAUTH_LOGIN: 'OAUTH_LOGIN',
  OAUTH_ACCOUNT_LINKED: 'OAUTH_ACCOUNT_LINKED',
  RBAC_CHANGE: 'RBAC_CHANGE',
  FORCED_LOGOUT: 'FORCED_LOGOUT',
  PHONE_VERIFIED: 'PHONE_VERIFIED',
  TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
};

const logEvent = async (event) => {
  if (!IDENTITY_CONFIG.audit.logAuthEvents) return;

  try {
    await AuditEvent.create({
      action: event.action,
      userId: event.userId,
      sessionId: event.sessionId,
      deviceId: event.deviceId,
      ip: event.ip,
      userAgent: event.userAgent,
      metadata: event.metadata || {},
      severity: event.severity || 'info',
      riskScore: event.riskScore,
      success: event.success !== undefined ? event.success : true,
      location: event.location,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const createAuditLogger = (req) => {
  return {
    log: async (action, metadata = {}) => {
      await logEvent({
        action,
        userId: req.userId || req.user?._id,
        sessionId: req.sessionId,
        deviceId: req.deviceId,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
        metadata,
        severity: metadata.severity || 'info',
        success: metadata.success,
      });
    },
  };
};

module.exports = { AUDIT_ACTIONS, logEvent, createAuditLogger };
