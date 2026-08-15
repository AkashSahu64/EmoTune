const fallbackConfig = {
  providers: [
    {
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 4000,
      retries: 1,
      priority: 1,
    },
    {
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY || '',
      endpoint: 'https://api.groq.com/openai/v1',
      timeout: 5000,
      retries: 1,
      priority: 2,
    },
    {
      name: 'huggingface',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      endpoint: 'https://api-inference.huggingface.co/models',
      timeout: 8000,
      retries: 0,
      priority: 3,
    },
  ],

  embeddingProviders: [
    {
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'embedding-gecko-001',
      timeout: 4000,
      priority: 1,
    },
  ],

  defaults: {
    timeout: 3000,
    retries: 1,
  },
};

function getProviderList() {
  return fallbackConfig.providers.filter((p) => p.apiKey);
}

function getEmbeddingProviderList() {
  return fallbackConfig.embeddingProviders.filter((p) => p.apiKey);
}

function getNextProvider(currentIndex, providerList) {
  const providers = providerList || getProviderList();
  const nextIndex = currentIndex + 1;
  if (nextIndex >= providers.length) return null;
  return providers[nextIndex];
}

function getPrimaryProvider() {
  const providers = getProviderList();
  return providers.length > 0 ? providers[0] : null;
}

function getPrimaryEmbeddingProvider() {
  const providers = getEmbeddingProviderList();
  return providers.length > 0 ? providers[0] : null;
}

module.exports = {
  fallbackConfig,
  getProviderList,
  getEmbeddingProviderList,
  getNextProvider,
  getPrimaryProvider,
  getPrimaryEmbeddingProvider,
};
