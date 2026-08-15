const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const PasswordHistory = require('../models/PasswordHistory');
const PasswordReset = require('../models/PasswordReset');
const Session = require('../models/Session');
const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityError = require('../errors/IdentityError');
const { hashPassword, comparePassword, generateVerificationToken, generateOTP } = require('../utils/crypto');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');
const emailService = require('./emailService');

const PasswordService = {
  validatePasswordStrength(password) {
    const errors = [];
    const cfg = IDENTITY_CONFIG.password;

    if (password.length < cfg.minLength) {
      errors.push(`Password must be at least ${cfg.minLength} characters`);
    }
    if (password.length > cfg.maxLength) {
      errors.push(`Password must be at most ${cfg.maxLength} characters`);
    }
    if (cfg.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (cfg.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain a lowercase letter');
    }
    if (cfg.requireNumber && !/\d/.test(password)) {
      errors.push('Password must contain a number');
    }
    if (cfg.requireSpecial && !/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
      errors.push('Password must contain a special character');
    }

    return errors;
  },

  async checkPasswordHistory(userId, newPassword, count = null) {
    const historyCount = count !== null ? count : IDENTITY_CONFIG.password.historyCount;
    if (historyCount <= 0) return true;

    const history = await PasswordHistory.find({ user: userId })
      .sort({ changedAt: -1 })
      .limit(historyCount)
      .select('passwordHash');

    for (const entry of history) {
      const match = await comparePassword(newPassword, entry.passwordHash);
      if (match) {
        throw IdentityError.passwordReused();
      }
    }
    return true;
  },

  async addPasswordHistory(userId, passwordHash, changedBy = 'user') {
    await PasswordHistory.create({
      user: userId,
      passwordHash,
      changedBy,
    });

    const maxHistory = IDENTITY_CONFIG.password.historyCount;
    const count = await PasswordHistory.countDocuments({ user: userId });
    if (count > maxHistory) {
      const oldest = await PasswordHistory.find({ user: userId })
        .sort({ changedAt: 1 })
        .limit(count - maxHistory);
      const ids = oldest.map(o => o._id);
      if (ids.length > 0) {
        await PasswordHistory.deleteMany({ _id: { $in: ids } });
      }
    }
  },

  async changePassword(userId, currentPassword, newPassword, options = {}) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw IdentityError.userNotFound();

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) throw IdentityError.passwordMismatch();

    const errors = this.validatePasswordStrength(newPassword);
    if (errors.length > 0) {
      throw new IdentityError(errors.join('. '), 'WEAK_PASSWORD', 400, errors);
    }

    await this.checkPasswordHistory(userId, newPassword);

    user.password = newPassword;
    await user.save();

    await this.addPasswordHistory(userId, user.password, 'user');

    await logEvent({
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      userId,
      sessionId: options.sessionId,
      metadata: { changedBy: 'user' },
      severity: 'warning',
    });

    return { message: 'Password changed successfully' };
  },

  async requestPasswordReset(email, options = {}) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const existingResets = await PasswordReset.countDocuments({
      user: user._id,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });
    if (existingResets >= 3) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + IDENTITY_CONFIG.password.resetTokenExpiry);

    await PasswordReset.create({
      user: user._id,
      email: email.toLowerCase().trim(),
      token,
      expiresAt,
      ip: options.ip,
      userAgent: options.userAgent,
    });

    await logEvent({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      userId: user._id,
      ip: options.ip,
      userAgent: options.userAgent,
    });

    return {
      message: 'If an account with that email exists, a reset link has been sent.',
      resetToken: token,
      email: email,
    };
  },

  async initiatePasswordReset(userId, email, identifierType, options = {}) {
    const user = await User.findById(userId);
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const existingResets = await PasswordReset.countDocuments({
      user: user._id,
      isUsed: false,
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });
    if (existingResets >= 3) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const token = generateVerificationToken();
    const otp = generateOTP(6);
    const expiresAt = new Date(Date.now() + IDENTITY_CONFIG.password.resetTokenExpiry);

    await PasswordReset.create({
      user: user._id,
      email: email.toLowerCase().trim(),
      token,
      otp,
      identifier: email,
      identifierType: identifierType || 'email',
      expiresAt,
      ip: options.ip,
      userAgent: options.userAgent,
    });

    const emailResult = await emailService.sendPasswordResetOTP(email, otp);

    await logEvent({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      userId: user._id,
      ip: options.ip,
      userAgent: options.userAgent,
      metadata: { method: 'otp' },
    });

    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
      a + '*'.repeat(Math.min(b.length, 4)) + c
    );

    return {
      message: 'If an account with that email exists, a reset link has been sent.',
      email: maskedEmail,
      devMode: emailResult.devMode || false,
      ...(emailResult.devMode && { otp }),
    };
  },

  async verifyResetOTP(email, otp) {
    const resetDoc = await PasswordReset.findOne({
      email: email.toLowerCase().trim(),
      isUsed: false,
      isVerified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!resetDoc) {
      throw new IdentityError('No valid password reset request found. Please request a new code.', 'NO_RESET_REQUEST', 400);
    }

    resetDoc.otpAttempts += 1;
    if (resetDoc.otpAttempts >= resetDoc.otpMaxAttempts) {
      resetDoc.isUsed = true;
      await resetDoc.save();
      throw new IdentityError('Too many incorrect attempts. Please request a new code.', 'OTP_EXHAUSTED', 429);
    }

    if (resetDoc.otp !== otp) {
      await resetDoc.save();
      throw new IdentityError('Invalid verification code. Please try again.', 'INVALID_OTP', 400);
    }

    const verificationJwtSecret = process.env.JWT_ACCESS_SECRET || 'emotune-jwt-secret-v2';
    const verificationToken = jwt.sign(
      {
        purpose: 'password_reset',
        prId: resetDoc._id.toString(),
        email: resetDoc.email,
        userId: resetDoc.user.toString(),
      },
      verificationJwtSecret,
      { expiresIn: '10m' }
    );

    resetDoc.isVerified = true;
    resetDoc.verifiedAt = new Date();
    resetDoc.verificationToken = verificationToken;
    await resetDoc.save();

    await logEvent({
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      userId: resetDoc.user,
      ip: resetDoc.ip,
      metadata: { step: 'otp_verified' },
    });

    return {
      message: 'Code verified successfully',
      verificationToken,
      userId: resetDoc.user,
    };
  },

  // Compatibility alias for older callers. The OTP verification-token flow is
  // the sole password-reset implementation.
  async resetPassword(verificationToken, newPassword, options = {}) {
    return this.completePasswordReset(verificationToken, newPassword, options);
  },

  async completePasswordReset(verificationToken, newPassword, options = {}) {
    let decoded;
    try {
      const verificationJwtSecret = process.env.JWT_ACCESS_SECRET || 'emotune-jwt-secret-v2';
      decoded = jwt.verify(verificationToken, verificationJwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new IdentityError('Verification session expired. Please start the password reset process again.', 'VERIFICATION_EXPIRED', 400);
      }
      throw new IdentityError('Invalid verification token', 'INVALID_VERIFICATION_TOKEN', 400);
    }

    if (decoded.purpose !== 'password_reset' || !decoded.prId) {
      throw new IdentityError('Invalid verification token purpose', 'INVALID_VERIFICATION_TOKEN', 400);
    }

    const resetDoc = await PasswordReset.findById(decoded.prId);
    if (!resetDoc) throw new IdentityError('Password reset request not found', 'RESET_REQUEST_NOT_FOUND', 404);
    if (resetDoc.isUsed) throw new IdentityError('This reset request has already been used', 'RESET_ALREADY_USED', 400);
    if (resetDoc.isExpired()) throw new IdentityError('Reset session has expired', 'RESET_EXPIRED', 400);
    if (!resetDoc.isVerified) throw new IdentityError('OTP not verified', 'OTP_NOT_VERIFIED', 400);
    if (resetDoc.verificationToken !== verificationToken) {
      throw new IdentityError('Invalid verification token', 'INVALID_VERIFICATION_TOKEN', 400);
    }

    const errors = this.validatePasswordStrength(newPassword);
    if (errors.length > 0) {
      throw new IdentityError(errors.join('. '), 'WEAK_PASSWORD', 400, errors);
    }

    const user = await User.findById(resetDoc.user).select('+password');
    if (!user) throw IdentityError.userNotFound();

    await this.checkPasswordHistory(user._id, newPassword);

    user.password = newPassword;
    await user.save();

    await this.addPasswordHistory(user._id, user.password, 'reset');

    resetDoc.isUsed = true;
    resetDoc.resetAt = new Date();
    await resetDoc.save();

    await Session.updateMany(
      { user: user._id, isActive: true },
      { isActive: false, loggedOutAt: new Date(), logoutReason: 'password_changed' }
    );

    await emailService.sendPasswordResetConfirmation(user.email);

    await logEvent({
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      userId: user._id,
      ip: options.ip,
      userAgent: options.userAgent,
      metadata: { method: 'otp_flow' },
      severity: 'warning',
    });

    return { message: 'Password has been reset successfully. Please login with your new password.' };
  },
};

module.exports = PasswordService;
