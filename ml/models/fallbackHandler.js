const logger = { info: console.log, warn: console.warn, error: console.error };

async function executeWithFallback(providerList, callFn, options = {}) {
  const { timeout = 3000, retries = 1, timeoutFallback = true } = options;
  const errors = [];

  if (!providerList || providerList.length === 0) {
    throw new Error('No providers provided to fallback handler');
  }

  for (let i = 0; i < providerList.length; i++) {
    const provider = providerList[i];
    const providerRetries = provider.retries !== undefined ? provider.retries : retries;

    for (let attempt = 0; attempt <= providerRetries; attempt++) {
      try {
        const result = await Promise.race([
          callFn(provider),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Provider "${provider.name}" timed out after ${timeout}ms`)), timeout)
          ),
        ]);
        return result;
      } catch (error) {
        errors.push({
          provider: provider.name,
          attempt: attempt + 1,
          error: error.message,
        });

        logger.warn(`Fallback: ${provider.name} attempt ${attempt + 1}/${providerRetries + 1} failed: ${error.message}`);

        if (attempt < providerRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    if (i < providerList.length - 1) {
      logger.info(`Falling back from "${providerList[i].name}" to "${providerList[i + 1].name}"`);
    }
  }

  throw new Error(`All providers exhausted. Errors: ${JSON.stringify(errors)}`);
}

async function executeWithTimeout(fn, timeoutMs, context = '') {
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${context ? context + ' ' : ''}Timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
    return result;
  } catch (error) {
    throw error;
  }
}

function isProviderAvailable(provider) {
  return provider && provider.apiKey && provider.apiKey.length > 0;
}

module.exports = {
  executeWithFallback,
  executeWithTimeout,
  isProviderAvailable,
};
