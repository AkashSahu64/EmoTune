const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['verification', 'email_change', 'magic_link'],
    default: 'verification',
  },
  newEmail: { type: String, lowercase: true, trim: true },
  expiresAt: { type: Date, required: true },
  verifiedAt: { type: Date },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  isUsed: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailVerificationSchema.index({ user: 1, type: 1 });

emailVerificationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

emailVerificationSchema.methods.canResend = function () {
  if (this.isUsed) return false;
  if (this.verifiedAt) return false;
  const cooldown = 60 * 1000;
  return !this.createdAt || (Date.now() - this.createdAt.getTime() > cooldown);
};

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
