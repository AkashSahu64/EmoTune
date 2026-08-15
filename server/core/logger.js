const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL] !== undefined ? LEVELS[process.env.LOG_LEVEL] : LEVELS.debug;

const METRICS = {
  aiCalls: 0,
  aiErrors: 0,
  aiLatencyMs: [],
  cacheHits: 0,
  cacheMisses: 0,
  providerCalls: {},
  providerErrors: {},
  providerLatency: {},
};

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return ' [circular]';
  }
}

const logger = {
  error: (msg, meta) => {
    if (CURRENT_LEVEL >= LEVELS.error) {
      console.error(`[ERROR] ${new Date().toISOString()} ${msg}${formatMeta(meta)}`);
    }
  },
  warn: (msg, meta) => {
    if (CURRENT_LEVEL >= LEVELS.warn) {
      console.warn(`[WARN] ${new Date().toISOString()} ${msg}${formatMeta(meta)}`);
    }
  },
  info: (msg, meta) => {
    if (CURRENT_LEVEL >= LEVELS.info) {
      console.log(`[INFO] ${new Date().toISOString()} ${msg}${formatMeta(meta)}`);
    }
  },
  debug: (msg, meta) => {
    if (CURRENT_LEVEL >= LEVELS.debug) {
      console.log(`[DEBUG] ${new Date().toISOString()} ${msg}${formatMeta(meta)}`);
    }
  },
};

const metrics = {
  trackAiCall: (provider, model, latencyMs, success) => {
    METRICS.aiCalls++;
    if (!success) METRICS.aiErrors++;
    METRICS.aiLatencyMs.push(latencyMs);
    if (METRICS.aiLatencyMs.length > 1000) METRICS.aiLatencyMs.shift();

    const key = `${provider}:${model}`;
    METRICS.providerCalls[key] = (METRICS.providerCalls[key] || 0) + 1;
    if (!success) METRICS.providerErrors[key] = (METRICS.providerErrors[key] || 0) + 1;

    if (!METRICS.providerLatency[key]) METRICS.providerLatency[key] = [];
    METRICS.providerLatency[key].push(latencyMs);
    if (METRICS.providerLatency[key].length > 100) METRICS.providerLatency[key].shift();
  },
  trackCacheHit: () => { METRICS.cacheHits++; },
  trackCacheMiss: () => { METRICS.cacheMisses++; },
  getReport: () => {
    const avgLatency = METRICS.aiLatencyMs.length > 0
      ? METRICS.aiLatencyMs.reduce((a, b) => a + b, 0) / METRICS.aiLatencyMs.length
      : 0;
    const cacheHitRate = (METRICS.cacheHits + METRICS.cacheMisses) > 0
      ? (METRICS.cacheHits / (METRICS.cacheHits + METRICS.cacheMisses) * 100).toFixed(1)
      : '0.0';
    return {
      aiCalls: METRICS.aiCalls,
      aiErrors: METRICS.aiErrors,
      avgLatencyMs: Math.round(avgLatency),
      cacheHitRate: cacheHitRate + '%',
      cacheHits: METRICS.cacheHits,
      cacheMisses: METRICS.cacheMisses,
      providerCalls: { ...METRICS.providerCalls },
      providerErrors: { ...METRICS.providerErrors },
    };
  },
  reset: () => {
    Object.assign(METRICS, {
      aiCalls: 0, aiErrors: 0, aiLatencyMs: [],
      cacheHits: 0, cacheMisses: 0, providerCalls: {}, providerErrors: {}, providerLatency: {},
    });
  },
};

module.exports = { logger, metrics };
