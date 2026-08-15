const { chatCompletion } = require('../core/providerManager');
const { logger } = require('../core/logger');
const CIL = require('../intelligence/conversationIntelligenceLayer');

async function analyzeAndSuggest(chatId, message, options = {}) {
  const analysis = await CIL.analyze(chatId, message, { useAI: options.useAI });
  const recommendations = await CIL.getRecommendations(chatId, options);
  return { analysis, recommendations };
}

async function getChatContext(chatId) {
  return CIL.getContext(chatId);
}

async function getPredictions(chatId) {
  return CIL.getPredictions(chatId);
}

async function getCompressedHistory(chatId) {
  return CIL.getCompressedPrompt(chatId);
}

module.exports = { analyzeAndSuggest, getChatContext, getPredictions, getCompressedHistory };
