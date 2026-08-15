const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
  },
  refreshTokenFamily: {
    type: String,
    required: true,
    index: true,
  },
  refreshTokenVersion: {
    type: Number,
    default: 1,
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
  },
  deviceName: { type: String, default: 'Unknown' },
  deviceFingerprint: { type: String },
  platform: { type: String, default: 'unknown' },
  browser: { type: String, default: 'unknown' },
  os: { type: String, default: 'unknown' },
  ip: { type: String },
  location: {
    country: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  userAgent: { type: String },
  isActive: { type: Boolean, default: true },
  isCurrent: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  lastActivityIp: { type: String },
  expiresAt: { type: Date, required: true },
  loggedOutAt: { type: Date },
  logoutReason: {
    type: String,
    enum: ['user_logout', 'expired', 'admin_terminated', 'password_changed', 'reuse_detected', 'force_logout_other', 'account_blocked', 'account_deletion', 'admin_deletion', 'session_revoked'],
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ refreshTokenFamily: 1, refreshTokenVersion: 1 });

sessionSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

module.exports = mongoose.model('Session', sessionSchema);
