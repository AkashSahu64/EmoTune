const crypto = require('crypto');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-xsrf-token';

const generateCsrfToken = (req) => {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
};

const csrfProtection = (req, res, next) => {
  if (!IDENTITY_CONFIG.security.csrf.enabled) return next();

  const csrfMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (!csrfMethods.includes(req.method)) return next();

  const headerToken = req.headers[CSRF_HEADER_NAME];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  if (headerToken !== cookieToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token mismatch',
      code: 'CSRF_TOKEN_MISMATCH',
    });
  }

  next();
};

const setCsrfCookie = (req, res, next) => {
  if (!IDENTITY_CONFIG.security.csrf.enabled) return next();

  if (req.cookies?.[CSRF_COOKIE_NAME]) return next();

  const token = generateCsrfToken(req);
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: IDENTITY_CONFIG.security.secureCookies,
    sameSite: 'strict',
    path: '/',
  });

  next();
};

const doubleSubmitCookie = (req, res, next) => {
  csrfProtection(req, res, next);
};

module.exports = {
  csrfProtection,
  setCsrfCookie,
  doubleSubmitCookie,
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
