const { getEmbeddingProviderList } = require('../config/fallback');
const constants = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');

const embeddingHandlers = {
  gemini: async (text, provider) => {
    const axios = require('axios');
    const modelName = provider.model || 'embedding-gecko-001';
    const response = await axios.post(
      `${constants.ENDPOINTS.GEMINI_EMBED}/${modelName}:embedContent?key=${provider.apiKey}`,
      {
        content: { parts: [{ text }] },
      },
      { timeout: provider.timeout || 4000 }
    );
    return response.data.embedding?.values || [];
  },
};

async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  const cleanText = text.trim().slice(0, 8000);
  const providers = getEmbeddingProviderList();

  if (providers.length === 0) {
    throw new Error('No embedding providers configured. Check your .env file.');
  }

  const errors = [];

  for (const provider of providers) {
    const handler = embeddingHandlers[provider.name];
    if (!handler) {
      errors.push({ provider: provider.name, error: 'No handler available' });
      continue;
    }

    try {
      await rateLimiter.waitForToken();
      const embedding = await handler(cleanText, provider);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Empty embedding returned');
      }

      return embedding;
    } catch (error) {
      errors.push({ provider: provider.name, error: error.message });
    }
  }

  const fallbackDimension = constants.EMBEDDING_DIMENSIONS || 768;
  console.warn(`All embedding providers failed. Returning zero-vector fallback. Errors: ${JSON.stringify(errors)}`);
  return new Array(fallbackDimension).fill(0);
}

module.exports = {
  generateEmbedding,
};
