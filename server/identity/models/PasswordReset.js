const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
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
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  otp: {
    type: String,
  },
  otpAttempts: { type: Number, default: 0 },
  otpMaxAttempts: { type: Number, default: 5 },
  identifier: { type: String },
  identifierType: {
    type: String,
    enum: ['email', 'username', 'phone'],
  },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
  isUsed: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  ip: { type: String },
  userAgent: { type: String },
  resetAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetSchema.index({ user: 1, createdAt: -1 });

passwordResetSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

passwordResetSchema.methods.isValid = function () {
  return !this.isUsed && !this.isExpired() && this.attempts < this.maxAttempts;
};

passwordResetSchema.methods.isOTPValid = function () {
  return !this.isUsed && !this.isExpired() && !this.isVerified && this.otpAttempts < this.otpMaxAttempts;
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
