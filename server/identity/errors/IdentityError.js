class IdentityError extends Error {
  constructor(message, code = 'IDENTITY_ERROR', statusCode = 400, details = null) {
    super(message);
    this.name = 'IdentityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static invalidCredentials(msg = 'Invalid email or password') {
    return new IdentityError(msg, 'INVALID_CREDENTIALS', 401);
  }

  static accountLocked(minutes) {
    return new IdentityError(`Account locked. Try again in ${minutes} minutes.`, 'ACCOUNT_LOCKED', 423);
  }

  static tokenExpired() {
    return new IdentityError('Token expired', 'TOKEN_EXPIRED', 401);
  }

  static tokenInvalid(msg = 'Invalid token') {
    return new IdentityError(msg, 'TOKEN_INVALID', 401);
  }

  static sessionExpired() {
    return new IdentityError('Session expired', 'SESSION_EXPIRED', 401);
  }

  static refreshTokenInvalid() {
    return new IdentityError('Invalid refresh token', 'REFRESH_TOKEN_INVALID', 401);
  }

  static refreshTokenReused() {
    return new IdentityError('Refresh token reuse detected. All sessions terminated for security.', 'REFRESH_TOKEN_REUSE', 401);
  }

  static emailNotVerified() {
    return new IdentityError('Email not verified', 'EMAIL_NOT_VERIFIED', 403);
  }

  static phoneNotVerified() {
    return new IdentityError('Phone not verified', 'PHONE_NOT_VERIFIED', 403);
  }

  static insufficientPermissions() {
    return new IdentityError('Insufficient permissions', 'FORBIDDEN', 403);
  }

  static rateLimited(retryAfter) {
    return new IdentityError(`Too many requests. Try again in ${retryAfter} seconds.`, 'RATE_LIMITED', 429);
  }

  static userNotFound() {
    return new IdentityError('User not found', 'USER_NOT_FOUND', 404);
  }

  static duplicateResource(field) {
    return new IdentityError(`Account with this ${field} already exists`, 'DUPLICATE_RESOURCE', 409);
  }

  static passwordMismatch() {
    return new IdentityError('Current password is incorrect', 'PASSWORD_MISMATCH', 400);
  }

  static passwordReused() {
    return new IdentityError('Password has been used recently. Choose a different password.', 'PASSWORD_REUSED', 400);
  }

  static sessionLimitExceeded() {
    return new IdentityError('Maximum active sessions reached. Logout from another device first.', 'SESSION_LIMIT_EXCEEDED', 429);
  }

  static invalidSession() {
    return new IdentityError('Session not found or expired', 'INVALID_SESSION', 404);
  }

  static deviceNotTrusted() {
    return new IdentityError('Device not recognized. Verification required.', 'DEVICE_NOT_TRUSTED', 403);
  }

  static verificationRequired() {
    return new IdentityError('Additional verification required.', 'VERIFICATION_REQUIRED', 403);
  }

  static csrfTokenInvalid() {
    return new IdentityError('Invalid CSRF token', 'CSRF_INVALID', 403);
  }

  static accountDeleted() {
    return new IdentityError('Account has been deleted', 'ACCOUNT_DELETED', 410);
  }

  static invalidPhone() {
    return new IdentityError('Invalid phone number format', 'INVALID_PHONE', 400);
  }

  static invalidCountryCode() {
    return new IdentityError('Invalid country code', 'INVALID_COUNTRY_CODE', 400);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      ...(this.details && { details: this.details }),
    };
  }
}

module.exports = IdentityError;
