const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const hashRefreshToken = (token) => {
  const hash = crypto.createHmac('sha256', IDENTITY_CONFIG.encryption.refreshTokenHash.salt);
  hash.update(token);
  return hash.digest('hex');
};

const generateDeviceFingerprint = (headers) => {
  const components = [
    headers['user-agent'] || '',
    headers['accept-language'] || '',
    headers['sec-ch-ua'] || '',
    headers['sec-ch-ua-platform'] || '',
    headers['sec-ch-ua-mobile'] || '',
  ];
  const raw = components.join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
};

const generateSessionToken = () => {
  return crypto.randomBytes(48).toString('hex');
};

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, IDENTITY_CONFIG.password.bcryptRounds);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashRefreshToken,
  generateDeviceFingerprint,
  generateSessionToken,
  generateVerificationToken,
  generateOTP,
  generateCsrfToken,
  hashPassword,
  comparePassword,
};
