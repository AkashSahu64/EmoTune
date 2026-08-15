const { chatCompletion } = require('../models/llmModel');
const prompts = require('../config/prompts');
const { cleanText } = require('../utils/textPreprocessor');

const INTENT_OPTIONS = [
  'task',
  'social',
  'question',
  'idea',
  'reminder',
  'important',
  'memory',
];

async function classifyIntent(messageText) {
  if (!messageText || !messageText.trim()) {
    return ['social'];
  }

  try {
    const cleaned = cleanText(messageText).slice(0, 500);

    const result = await chatCompletion(
      [
        { role: 'system', content: prompts.intent },
        { role: 'user', content: cleaned },
      ],
      {
        taskType: 'intent',
        temperature: 0.3,
        responseFormat: 'json_object',
      }
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    const intents = parsed.intents || [];

    const validIntents = intents.filter((i) => INTENT_OPTIONS.includes(i));
    return validIntents.length > 0 ? validIntents : ['social'];
  } catch (error) {
    console.error('Intent pipeline error:', error.message);

    if (messageText.includes('?')) return ['question'];
    if (messageText.toLowerCase().includes('remember') || messageText.toLowerCase().includes('remind')) return ['reminder'];
    if (messageText.toLowerCase().includes('should') || messageText.toLowerCase().includes('let\'s')) return ['idea', 'social'];
    if (messageText.toLowerCase().includes('done') || messageText.toLowerCase().includes('finished')) return ['task'];

    return ['social'];
  }
}

async function classifyMessageBatch(messages) {
  const results = await Promise.allSettled(
    messages.map((msg) => classifyIntent(typeof msg === 'string' ? msg : msg.content))
  );
  return results.map((r) => (r.status === 'fulfilled' ? r.value : ['social']));
}

module.exports = {
  classifyIntent,
  classifyMessageBatch,
  INTENT_OPTIONS,
};
