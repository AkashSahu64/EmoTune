const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  fingerprint: {
    type: String,
    required: true,
  },
  name: { type: String, default: 'Unknown Device' },
  type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown',
  },
  platform: { type: String, default: 'unknown' },
  browser: { type: String, default: 'unknown' },
  os: { type: String, default: 'unknown' },
  isTrusted: { type: Boolean, default: false },
  trustedAt: { type: Date },
  trustExpiresAt: { type: Date },
  lastUsedAt: { type: Date, default: Date.now },
  lastIp: { type: String },
  firstSeenAt: { type: Date, default: Date.now },
  sessionCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

deviceSchema.index({ user: 1, fingerprint: 1 }, { unique: true });
deviceSchema.index({ user: 1, isTrusted: 1 });
deviceSchema.index({ isActive: 1 });

deviceSchema.methods.isTrustExpired = function () {
  return this.trustExpiresAt && this.trustExpiresAt < new Date();
};

module.exports = mongoose.model('Device', deviceSchema);
