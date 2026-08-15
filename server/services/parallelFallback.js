const axios = require('axios');
const logger = require('../utils/logger');

async function parallelFallback(providers, options = {}) {
  const { timeout = 5000 } = options;

  const results = await Promise.allSettled(
    providers.map((provider) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), provider.timeout || timeout)
      );
      return Promise.race([provider.fn(), timeoutPromise]);
    })
  );

  const successful = results
    .map((r, i) => ({ index: i, status: r.status, value: r.status === 'fulfilled' ? r.value : null, reason: r.status === 'rejected' ? r.reason?.message || 'Unknown error' : null }))
    .filter((r) => r.status === 'fulfilled' && r.value !== null && r.value !== undefined);

  const failures = results.filter((r) => r.status === 'rejected');

  if (failures.length > 0) {
    logger.debug(`Parallel fallback: ${failures.length}/${providers.length} providers failed`, {
      errors: failures.map((f) => f.reason?.message || 'Unknown').join('; '),
    });
  }

  return { results: successful.map((r) => r.value), all: successful.map((r) => r.value), first: successful[0]?.value || null, hasResults: successful.length > 0 };
}

async function parallelFetchAll(providers, options = {}) {
  const { timeout = 5000 } = options;

  const results = await Promise.allSettled(
    providers.map((provider) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), provider.timeout || timeout)
      );
      return Promise.race([provider.fn(), timeoutPromise]);
    })
  );

  const collected = [];
  const errors = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      if (Array.isArray(r.value)) {
        collected.push(...r.value);
      } else {
        collected.push(r.value);
      }
    } else if (r.status === 'rejected') {
      errors.push({ provider: providers[i]?.name || `provider_${i}`, error: r.reason?.message || 'Unknown' });
    }
  });

  if (errors.length > 0) {
    logger.debug(`parallelFetchAll: ${errors.length}/${providers.length} providers failed`, { errors: errors.map((e) => `${e.provider}: ${e.error}`).join('; ') });
  }

  return { results: collected, errors };
}

module.exports = { parallelFallback, parallelFetchAll };
