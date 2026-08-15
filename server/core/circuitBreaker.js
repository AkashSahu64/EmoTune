const { CONFIG } = require('./config');
const { logger } = require('./logger');

const STATE = { CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' };

const breakerStates = new Map();

function getState(provider, model) {
  const key = `${provider}:${model}`;
  if (!breakerStates.has(key)) {
    breakerStates.set(key, {
      state: STATE.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      openedAt: 0,
      halfOpenAttempts: 0,
    });
  }
  return breakerStates.get(key);
}

function isOpen(provider, model) {
  const s = getState(provider, model);
  if (s.state === STATE.CLOSED) return false;
  if (s.state === STATE.OPEN) {
    const elapsed = Date.now() - s.openedAt;
    if (elapsed >= CONFIG.circuitBreaker.openTimeoutMs) {
      logger.debug(`Circuit half-opening for ${provider}:${model}`, { elapsed });
      s.state = STATE.HALF_OPEN;
      s.halfOpenAttempts = 0;
      return false;
    }
    return true;
  }
  if (s.state === STATE.HALF_OPEN) {
    if (s.halfOpenAttempts >= CONFIG.circuitBreaker.halfOpenMaxRequests) {
      return true;
    }
    s.halfOpenAttempts++;
    return false;
  }
  return false;
}

function recordSuccess(provider, model) {
  const s = getState(provider, model);
  s.successes++;
  s.lastSuccessTime = Date.now();
  s.failures = 0;

  if (s.state === STATE.HALF_OPEN) {
    if (s.successes >= CONFIG.circuitBreaker.successThreshold) {
      logger.info(`Circuit closing for ${provider}:${model}`, { successes: s.successes });
      s.state = STATE.CLOSED;
      s.successes = 0;
      s.halfOpenAttempts = 0;
    }
  }
}

function recordFailure(provider, model) {
  const s = getState(provider, model);
  s.failures++;
  s.lastFailureTime = Date.now();
  s.successes = 0;

  if (s.failures >= CONFIG.circuitBreaker.failureThreshold) {
    logger.warn(`Circuit opening for ${provider}:${model}`, { failures: s.failures });
    s.state = STATE.OPEN;
    s.openedAt = Date.now();
  }
}

function getStatus(provider, model) {
  const s = getState(provider, model);
  return {
    provider,
    model,
    state: s.state,
    failures: s.failures,
    successes: s.successes,
    lastFailureTime: s.lastFailureTime,
    lastSuccessTime: s.lastSuccessTime,
  };
}

function getAllStatuses() {
  const statuses = [];
  for (const [key, s] of breakerStates) {
    const [provider, ...rest] = key.split(':');
    statuses.push({ provider, model: rest.join(':'), ...s });
  }
  return statuses;
}

module.exports = {
  isOpen,
  recordSuccess,
  recordFailure,
  getStatus,
  getAllStatuses,
  STATE,
};
