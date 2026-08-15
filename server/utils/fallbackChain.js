const path = require('path');
require('module').globalPaths.push(path.resolve(__dirname, '../../server/node_modules'));

const { chatCompletion } = require('../core/providerManager');
const { generateEmbedding } = require('../../ml/models/embeddingModel');
const { classifyIntent } = require('../../ml/pipelines/intentPipeline');

async function executeWithFallback(prompt, systemPrompt, options = {}) {
  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant for Emotune chat app.' },
    { role: 'user', content: prompt },
  ];
  const result = await chatCompletion(messages, {
    taskType: 'default',
    responseFormat: 'json_object',
    ...options,
  });
  return typeof result === 'string' ? result : JSON.stringify(result);
}

async function generateEmbeddingFallback(text) {
  return generateEmbedding(text);
}

async function classifyIntentFallback(text) {
  return classifyIntent(text);
}

module.exports = {
  executeWithFallback,
  generateEmbeddingFallback,
  classifyIntentFallback,
};
