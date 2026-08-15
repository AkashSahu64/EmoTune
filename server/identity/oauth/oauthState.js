const crypto = require('crypto');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const secret = () => IDENTITY_CONFIG.jwt.accessToken.secret;

function encodeState(provider) {
  const payload = Buffer.from(JSON.stringify({
    provider,
    nonce: crypto.randomBytes(24).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyState(state, provider) {
  if (!state || typeof state !== 'string') return false;
  const [payload, signature] = state.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  return Boolean(decoded.provider === provider && decoded.exp > Date.now() && decoded.nonce);
}

function getStatePayload(state) {
  const [payload] = String(state || '').split('.');
  if (!payload) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
}

module.exports = { encodeState, verifyState, getStatePayload };
