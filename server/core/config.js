const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CONFIG = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/emotune',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'emotune:',
    cacheTTL: parseInt(process.env.CACHE_TTL, 10) || 3600,
    responseCacheTTL: parseInt(process.env.RESPONSE_CACHE_TTL, 10) || 300,
    semanticCacheTTL: parseInt(process.env.SEMANTIC_CACHE_TTL, 10) || 86400,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
    expiry: process.env.JWT_EXPIRY || '7d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },

  ai: {
    timeout: parseInt(process.env.AI_TIMEOUT, 10) || 4000,
    retries: parseInt(process.env.AI_RETRIES, 10) || 1,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 500,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,

    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      models: (process.env.GEMINI_MODELS || '').split(',').filter(Boolean),
      defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
      timeout: parseInt(process.env.GEMINI_TIMEOUT, 10) || 4000,
      retries: parseInt(process.env.GEMINI_RETRIES, 10) || 1,
    },

    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      models: (process.env.GROQ_MODELS || '').split(',').filter(Boolean),
      defaultModel: process.env.GROQ_DEFAULT_MODEL || 'deepseek-r1-distill-llama-70b',
      timeout: parseInt(process.env.GROQ_TIMEOUT, 10) || 5000,
      retries: parseInt(process.env.GROQ_RETRIES, 10) || 1,
    },

    huggingface: {
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      baseUrl: process.env.HF_BASE_URL || 'https://api-inference.huggingface.co/models',
      defaultModel: process.env.HF_DEFAULT_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct',
      timeout: parseInt(process.env.HF_TIMEOUT, 10) || 8000,
      retries: 0,
    },
  },

  apis: {
    giphy: { apiKey: process.env.GIPHY_API_KEY || '' },
    klipy: {
      apiKey: process.env.KLIPY_API_KEY || '',
      baseUrl: process.env.KLIPY_API_URL || 'https://api.klipy.com/v2/search',
    },
    stipop: {
      apiKey: process.env.STIPOP_API_KEY || '',
      baseUrl: process.env.STIPOP_API_URL || 'https://messenger.stipop.io/v1/search',
    },
    youtube: { apiKey: process.env.YOUTUBE_API_KEY || '' },
    pexels: { apiKey: process.env.PEXELS_API_KEY || '' },
    pixabay: { apiKey: process.env.PIXABAY_API_KEY || '' },
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    },
    libreTranslate: { url: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de' },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
  },

  rateLimit: {
    aiRequestsPerMin: parseInt(process.env.AI_REQUESTS_PER_MIN, 10) || 20,
    burstSize: parseInt(process.env.AI_BURST_SIZE, 10) || 5,
    refillRate: parseInt(process.env.AI_REFILL_RATE, 10) || 1,
    refillIntervalMs: parseInt(process.env.AI_REFILL_INTERVAL_MS, 10) || 3000,
  },

  circuitBreaker: {
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD, 10) || 3,
    successThreshold: parseInt(process.env.CB_SUCCESS_THRESHOLD, 10) || 2,
    halfOpenMaxRequests: parseInt(process.env.CB_HALF_OPEN_MAX, 10) || 1,
    openTimeoutMs: parseInt(process.env.CB_OPEN_TIMEOUT_MS, 10) || 30000,
    healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS, 10) || 60000,
  },
};

const GEMINI_MODEL_PRIORITY = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

const GROQ_MODEL_PRIORITY = [
  'deepseek-r1-distill-llama-70b',
  'llama-4-scout-17b-16e-instruct',
  'qwen-2.5-72b',
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
];

const TASK_MODEL_ROUTING = {
  coding: ['gemini', 'deepseek-r1-distill-llama-70b'],
  reasoning: ['gemini', 'llama-4-scout-17b-16e-instruct'],
  creative: ['gemini', 'qwen-2.5-72b'],
  translation: ['gemini', 'qwen-2.5-72b'],
  general: ['gemini', 'llama-3.3-70b-versatile'],
  long_context: ['gemini', 'llama-3.3-70b-versatile'],
  math: ['gemini', 'deepseek-r1-distill-llama-70b'],
  emotion: ['gemini', 'llama-3.3-70b-versatile'],
  intent: ['gemini', 'llama-3.3-70b-versatile'],
  truth: ['gemini', 'mixtral-8x7b-32768'],
  persona: ['gemini', 'llama-3.3-70b-versatile'],
  decide: ['gemini', 'llama-3.3-70b-versatile'],
  default: ['gemini', 'llama-3.3-70b-versatile'],
};

const TASK_TEMPERATURE = {
  coding: 0.2,
  reasoning: 0.3,
  creative: 0.9,
  translation: 0.3,
  general: 0.7,
  emotion: 0.7,
  intent: 0.3,
  truth: 0.2,
  persona: 0.8,
  decide: 0.5,
  default: 0.7,
};

const TASK_MAX_TOKENS = {
  coding: 1024,
  reasoning: 1024,
  creative: 500,
  translation: 400,
  general: 500,
  emotion: 500,
  intent: 150,
  truth: 200,
  persona: 300,
  decide: 600,
  default: 500,
};

function getActiveProviders() {
  const providers = [];
  if (CONFIG.ai.gemini.apiKey) providers.push('gemini');
  if (CONFIG.ai.groq.apiKey) providers.push('groq');
  if (CONFIG.ai.huggingface.apiKey) providers.push('huggingface');
  return providers;
}

function getGeminiModels() {
  if (CONFIG.ai.gemini.models.length > 0) return CONFIG.ai.gemini.models;
  return GEMINI_MODEL_PRIORITY;
}

function getGroqModels() {
  if (CONFIG.ai.groq.models.length > 0) return CONFIG.ai.groq.models;
  return GROQ_MODEL_PRIORITY;
}

function getModelsForTask(taskType) {
  return TASK_MODEL_ROUTING[taskType] || TASK_MODEL_ROUTING.default;
}

function getTemperatureForTask(taskType) {
  return TASK_TEMPERATURE[taskType] || TASK_TEMPERATURE.default;
}

function getMaxTokensForTask(taskType) {
  return TASK_MAX_TOKENS[taskType] || TASK_MAX_TOKENS.default;
}

const TASK_JSON_MODE = new Set(['emotion', 'intent', 'truth', 'persona', 'decide']);

function needsJsonMode(taskType) {
  return TASK_JSON_MODE.has(taskType);
}

module.exports = {
  CONFIG,
  GEMINI_MODEL_PRIORITY,
  GROQ_MODEL_PRIORITY,
  TASK_MODEL_ROUTING,
  TASK_TEMPERATURE,
  TASK_MAX_TOKENS,
  TASK_JSON_MODE,
  getActiveProviders,
  getGeminiModels,
  getGroqModels,
  getModelsForTask,
  getTemperatureForTask,
  getMaxTokensForTask,
  needsJsonMode,
};
