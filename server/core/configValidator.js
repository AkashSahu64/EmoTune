const { CONFIG, getActiveProviders } = require('./config');

const validations = [
  {
    name: 'PORT',
    condition: () => CONFIG.port !== undefined && CONFIG.port !== null,
    critical: true,
    message: 'PORT is not set. Defaulting to 5000.',
  },
  {
    name: 'PORT_TYPE',
    condition: () => {
      const port = parseInt(process.env.PORT, 10);
      return !process.env.PORT || (Number.isInteger(port) && port > 0 && port <= 65535);
    },
    critical: true,
    message: 'PORT must be a valid number between 1 and 65535.',
  },
  {
    name: 'MONGO_URI',
    condition: () => !!CONFIG.mongodb.uri,
    critical: true,
    message: 'MONGO_URI is not set. MongoDB connection will fail.',
  },
  {
    name: 'MONGO_URI_FORMAT',
    condition: () => {
      try {
        const uri = CONFIG.mongodb.uri;
        if (!uri) return false;
        new URL(uri);
        return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
      } catch {
        return false;
      }
    },
    critical: true,
    message: 'MONGO_URI format is invalid. Must start with mongodb:// or mongodb+srv:// and be a valid URI.',
  },
  {
    name: 'JWT_SECRET',
    condition: () => !!CONFIG.jwt.secret && CONFIG.jwt.secret !== 'change-me-in-production',
    critical: true,
    message: 'JWT_SECRET is not set or is still using the default value. Set a secure secret in production.',
  },
  {
    name: 'JWT_REFRESH_SECRET',
    condition: () => !!CONFIG.jwt.refreshSecret && CONFIG.jwt.refreshSecret !== 'change-me-refresh',
    critical: true,
    message: 'JWT_REFRESH_SECRET is not set or is still using the default value. Set a secure refresh secret in production.',
  },
  {
    name: 'EMAIL_VERIFICATION_DELIVERY',
    condition: () => process.env.EMAIL_VERIFICATION_REQUIRED !== 'true' || (!!process.env.EMAIL_HOST && !!process.env.EMAIL_USER),
    critical: true,
    message: 'Email verification is required but SMTP delivery is not configured.',
  },
  {
    name: 'AI_PROVIDER',
    condition: () => {
      const providers = getActiveProviders();
      return providers.length > 0;
    },
    critical: true,
    message: 'No AI providers configured. Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, or HUGGINGFACE_API_KEY.',
  },
  {
    name: 'NODE_ENV',
    condition: () => !!process.env.NODE_ENV,
    critical: false,
    message: 'NODE_ENV is not set. Defaulting to development.',
  },
  {
    name: 'REDIS_URL',
    condition: () => !!process.env.REDIS_URL,
    critical: false,
    message: 'REDIS_URL is not set. Cache will operate in memory-only mode.',
  },
  {
    name: 'CLIENT_URL',
    condition: () => !!process.env.CLIENT_URL,
    critical: false,
    message: 'CLIENT_URL is not set. Defaulting to http://localhost:5173. CORS may not work correctly in production.',
  },
  {
    name: 'JWT_EXPIRY',
    condition: () => !!process.env.JWT_EXPIRY,
    critical: false,
    message: 'JWT_EXPIRY is not set. Defaulting to 7d.',
  },
  {
    name: 'CLOUDINARY_CONFIG',
    condition: () => {
      const c = CONFIG.apis.cloudinary;
      return !c.cloudName || (c.cloudName && c.apiKey && c.apiSecret);
    },
    critical: false,
    message: 'Cloudinary is partially configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET for media uploads.',
  },
];

function validateConfig() {
  const errors = [];
  const warnings = [];

  for (const validation of validations) {
    const passed = validation.condition();
    if (!passed) {
      if (validation.critical) {
        errors.push(validation.message);
      } else {
        warnings.push(validation.message);
      }
    }
  }

  return { errors, warnings };
}

function printResults(results) {
  if (results.errors.length > 0) {
    console.error('========================================');
    console.error('  CONFIGURATION ERRORS');
    console.error('========================================');
    for (const err of results.errors) {
      console.error(`  [CRITICAL] ${err}`);
    }
    console.error('========================================');
    console.error('Please fix the above configuration errors and restart.');
    console.error('========================================');
    process.exit(1);
  }

  if (results.warnings.length > 0) {
    console.warn('========================================');
    console.warn('  CONFIGURATION WARNINGS');
    console.warn('========================================');
    for (const warn of results.warnings) {
      console.warn(`  [WARN] ${warn}`);
    }
    console.warn('========================================');
  }
}

function validateAndExit() {
  const results = validateConfig();
  printResults(results);
  return results;
}

module.exports = {
  validateConfig,
  validateAndExit,
};
