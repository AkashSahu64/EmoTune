const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

function encryptVector(vector, key) {
  if (!vector) return { encrypted: vector, iv: '', salt: '' };
  if (!key || key.length === 0) return { encrypted: vector, iv: '', salt: '', note: 'No encryption key provided' };

  try {
    const salt = crypto.randomBytes(16);
    const derivedKey = deriveKey(key, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    const vectorStr = JSON.stringify(vector);
    let encrypted = cipher.update(vectorStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: ALGORITHM,
    };
  } catch (error) {
    console.error('Vector encryption error:', error.message);
    return { encrypted: JSON.stringify(vector), iv: '', salt: '', error: error.message };
  }
}

function decryptVector(encryptedData, key, ivHex, saltHex, authTagHex) {
  if (!encryptedData || !key) return encryptedData;
  if (!ivHex || !saltHex) {
    try {
      return JSON.parse(encryptedData);
    } catch {
      return encryptedData;
    }
  }

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const derivedKey = deriveKey(key, salt);
    const authTag = authTagHex ? Buffer.from(authTagHex, 'hex') : null;

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    if (authTag) decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Vector decryption error:', error.message);
    return null;
  }
}

function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

function hashForIndexing(text) {
  if (!text) return '';
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function obfuscateVector(vector) {
  if (!vector || !Array.isArray(vector)) return vector;
  const noise = crypto.randomBytes(vector.length).reduce((sum, b) => sum + (b % 3 - 1), 0) / 10000;
  return vector.map((v) => v + noise);
}

module.exports = {
  encryptVector,
  decryptVector,
  generateEncryptionKey,
  hashForIndexing,
  obfuscateVector,
};
