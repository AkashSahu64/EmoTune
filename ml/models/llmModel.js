const { chatCompletion, streamCompletion } = require('../../server/core/providerManager');

const MODEL_MAP = {
  emotion: { model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 500 },
  intent: { model: 'gemini-2.5-flash', temperature: 0.3, maxTokens: 150 },
  truth: { model: 'gemini-2.5-flash', temperature: 0.2, maxTokens: 200 },
  persona: { model: 'gemini-2.5-flash', temperature: 0.8, maxTokens: 300 },
  decide: { model: 'gemini-2.5-flash', temperature: 0.5, maxTokens: 600 },
  default: { model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 500 },
};

module.exports = { chatCompletion, streamCompletion, MODEL_MAP };
