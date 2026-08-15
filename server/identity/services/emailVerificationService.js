const User = require('../../models/User');
const EmailVerification = require('../models/EmailVerification');
const { IDENTITY_CONFIG } = require('../config/identityConfig');
const IdentityError = require('../errors/IdentityError');
const { generateVerificationToken } = require('../utils/crypto');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');
const emailService = require('./emailService');

const EmailVerificationService = {
  async createVerification(userId, email) {
    const existingToken = await EmailVerification.findOne({
      user: userId,
      isUsed: false,
      verifiedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (existingToken) {
      const cooldown = IDENTITY_CONFIG.emailVerification.cooldownMs;
      const elapsed = Date.now() - new Date(existingToken.createdAt).getTime();
      if (elapsed < cooldown) {
        const remaining = Math.ceil((cooldown - elapsed) / 1000);
        throw new IdentityError(`Please wait ${remaining} seconds before resending`, 'VERIFICATION_COOLDOWN', 429);
      }

      existingToken.isUsed = true;
      await existingToken.save();
    }

    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + IDENTITY_CONFIG.emailVerification.tokenExpiry);

    await EmailVerification.create({
      user: userId,
      email: email.toLowerCase().trim(),
      token,
      expiresAt,
    });

    await logEvent({
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      userId,
      metadata: { email },
    });

    const delivery = await emailService.sendVerificationEmail(email, token);
    return { token, email, delivery };
  },

  async verifyEmail(token) {
    const verification = await EmailVerification.findOne({ token, isUsed: false });
    if (!verification) throw new IdentityError('Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN', 400);

    verification.attempts += 1;
    if (verification.attempts > IDENTITY_CONFIG.emailVerification.maxAttempts) {
      verification.isUsed = true;
      await verification.save();
      throw new IdentityError('Verification token exhausted. Request a new one.', 'VERIFICATION_EXHAUSTED', 429);
    }

    if (verification.isExpired()) {
      await verification.save();
      throw new IdentityError('Verification token has expired', 'VERIFICATION_EXPIRED', 400);
    }

    verification.isUsed = true;
    verification.verifiedAt = new Date();
    await verification.save();

    const user = await User.findById(verification.user);
    if (!user) throw IdentityError.userNotFound();

    if (verification.type === 'email_change' && verification.newEmail) {
      user.email = verification.newEmail;
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.roles = user.roles || ['user'];
    if (!user.roles.includes('verified')) {
      user.roles.push('verified');
    }
    await user.save();

    await logEvent({
      action: AUDIT_ACTIONS.EMAIL_VERIFIED,
      userId: user._id,
      metadata: { email: verification.email },
    });

    return { message: 'Email verified successfully' };
  },

  async getVerificationStatus(userId) {
    const user = await User.findById(userId).select('email emailVerified emailVerifiedAt roles');
    if (!user) throw IdentityError.userNotFound();

    return {
      email: user.email,
      verified: user.emailVerified || false,
      verifiedAt: user.emailVerifiedAt || null,
      isVerified: user.roles?.includes('verified') || false,
    };
  },
};

module.exports = EmailVerificationService;
