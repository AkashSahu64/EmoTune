const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login_success', 'login_failure', 'logout', 'signup',
      'token_refresh', 'password_change', 'email_change',
      'phone_change', 'suspicious_activity', 'account_lock',
      'password_reset_request', 'password_reset_complete',
      'oauth_login', 'forced_logout',
    ],
  },
  ip: { type: String },
  userAgent: { type: String },
  deviceFingerprint: { type: String },
  deviceId: { type: String },
  sessionId: { type: String },
  location: {
    country: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  method: {
    type: String,
    enum: ['email_password', 'phone_password', 'username_password', 'google', 'apple', 'magic_link', 'otp', 'refresh_token'],
  },
  riskScore: { type: Number, min: 0, max: 100 },
  riskFactors: [String],
  success: { type: Boolean, default: true },
  failureReason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

loginHistorySchema.index({ user: 1, createdAt: -1 });
loginHistorySchema.index({ user: 1, action: 1, createdAt: -1 });
loginHistorySchema.index({ ip: 1, createdAt: -1 });
loginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
