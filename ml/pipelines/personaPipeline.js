const { chatCompletion } = require('../models/llmModel');
const prompts = require('../config/prompts');
const { cleanText } = require('../utils/textPreprocessor');
const constants = require('../config/constants');

async function rewriteTone(text, targetTone, customPrompt = '') {
  if (!text || !text.trim()) {
    return { original: '', rewritten: '', changes: 'No text provided' };
  }

  if (!targetTone) {
    return { original: text, rewritten: text, changes: 'No tone specified' };
  }

  const validTones = ['professional', 'casual', 'romantic', 'humorous', 'custom'];
  if (!validTones.includes(targetTone)) {
    return { original: text, rewritten: text, changes: `Invalid tone: ${targetTone}` };
  }

  try {
    const cleaned = cleanText(text).slice(0, constants.PERSONA_MAX_INPUT_LENGTH);
    const prompt = `Original message: "${cleaned}"\n\nTarget tone: ${targetTone}\n${customPrompt ? `Additional instructions: ${customPrompt}` : ''}`;

    const result = await chatCompletion(
      [
        { role: 'system', content: prompts.personaRewrite },
        { role: 'user', content: prompt },
      ],
      {
        taskType: 'persona',
        temperature: constants.PERSONA_TEMPERATURE,
        responseFormat: 'json_object',
      }
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;

    return {
      original: parsed.original || text,
      rewritten: parsed.rewritten || text,
      changes: parsed.changes || 'Tone adjusted to ' + targetTone,
    };
  } catch (error) {
    console.error('Persona pipeline error:', error.message);
    return {
      original: text,
      rewritten: text,
      changes: 'Rewrite failed, returning original',
    };
  }
}

function detectConversationTone(messages) {
  const text = messages
    .map((m) => (typeof m === 'string' ? m : m.content || ''))
    .join(' ')
    .toLowerCase();

  const romanticWords = ['love', 'miss', 'heart', 'beautiful', 'cute', 'darling', 'sweet'];
  const professionalWords = ['meeting', 'project', 'deadline', 'report', 'schedule', 'budget'];
  const humorousWords = ['lol', 'haha', 'funny', 'joke', 'hilarious', '😂', '🤣'];

  const romanticScore = romanticWords.filter((w) => text.includes(w)).length;
  const professionalScore = professionalWords.filter((w) => text.includes(w)).length;
  const humorousScore = humorousWords.filter((w) => text.includes(w)).length;

  if (romanticScore > professionalScore && romanticScore > humorousScore) return 'romantic';
  if (professionalScore > romanticScore && professionalScore > humorousScore) return 'professional';
  if (humorousScore > romanticScore && humorousScore > professionalScore) return 'humorous';
  return 'casual';
}

module.exports = {
  rewriteTone,
  detectConversationTone,
};
