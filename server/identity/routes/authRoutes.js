const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authRateLimiter, signupRateLimiter } = require('../middleware/rateLimiter');
const { extractDeviceInfo } = require('../middleware/deviceMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  sendVerificationEmailSchema,
  oauthCallbackSchema,
} = require('../validators/authValidators');

router.post(
  '/signup',
  signupRateLimiter.middleware(),
  extractDeviceInfo,
  validate(signupSchema),
  authController.signup
);

router.post(
  '/login',
  authRateLimiter.middleware(),
  extractDeviceInfo,
  validate(loginSchema),
  authController.login
);

router.post(
  '/logout',
  authenticate,
  authController.logout
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Backward-compatible legacy path; both routes use the identity implementation.
router.post(
  '/refresh-token',
  authController.refreshToken
);

router.post(
  '/forgot-password',
  authRateLimiter.middleware(),
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/verify-reset-code',
  authRateLimiter.middleware(),
  validate(verifyResetCodeSchema),
  authController.verifyResetCode
);

router.post(
  '/reset-password',
  authRateLimiter.middleware(),
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

router.post(
  '/verify-email',
  authenticate,
  validate(verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  authenticate,
  validate(sendVerificationEmailSchema),
  authController.resendVerification
);

router.get(
  '/oauth/providers',
  authController.getOAuthProviders
);

router.post(
  '/oauth/callback',
  authRateLimiter.middleware(),
  extractDeviceInfo,
  validate(oauthCallbackSchema),
  authController.oauthCallback
);

router.post(
  '/oauth/link',
  authenticate,
  validate(oauthCallbackSchema),
  authController.linkOAuthProvider
);

router.delete(
  '/oauth/unlink/:provider',
  authenticate,
  authController.unlinkOAuthProvider
);

router.get(
  '/me',
  authenticate,
  profileController.getProfile
);

router.patch(
  '/me',
  authenticate,
  profileController.updateProfile
);

// Legacy profile path retained as an identity-backed alias.
router.get('/profile', authenticate, profileController.getProfile);
router.patch('/profile', authenticate, profileController.updateProfile);

router.delete(
  '/me',
  authenticate,
  profileController.deleteAccount
);

router.get(
  '/me/login-history',
  authenticate,
  profileController.getLoginHistory
);

router.get(
  '/me/sessions',
  authenticate,
  profileController.getActiveSessions
);

router.get(
  '/me/devices',
  authenticate,
  profileController.getDevices
);

router.get(
  '/me/status',
  authenticate,
  profileController.getStatus
);

router.patch(
  '/me/status',
  authenticate,
  profileController.updateStatus
);

module.exports = router;
