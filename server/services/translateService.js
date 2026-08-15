const axios = require('axios');
const { logger } = require('../core/logger');
const { parallelFallback } = require('./parallelFallback');
const { chatCompletion } = require('../core/providerManager');

const LANG_NAMES = {
  hi: 'Hindi', ur: 'Urdu', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
  ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese',
  zh: 'Chinese', ru: 'Russian', ar: 'Arabic', pt: 'Portuguese', it: 'Italian',
  ko: 'Korean', nl: 'Dutch', tr: 'Turkish', vi: 'Vietnamese', th: 'Thai',
};

const AI_TRANSLATE_PROMPT = `Translate the following text from {sourceLang} to {targetLang}.

Rules:
- Preserve the original meaning and tone
- Keep emojis and special characters as-is
- If the text is already in the target language, return it unchanged

Return ONLY valid JSON with these exact keys:
{
  "original": "original text",
  "translated": "translated text",
  "detectedLanguage": "language code or 'unknown'"
}`;

async function translateWithAI(text, targetLang) {
  try {
    const prompt = `Source text: "${text}"\n\nTarget language: ${LANG_NAMES[targetLang] || targetLang}\n\nTranslate this to ${LANG_NAMES[targetLang] || targetLang}. Return the translation only.`;
    const systemMsg = `You are a translator. Translate the user's text to ${LANG_NAMES[targetLang] || targetLang}. If it's already in that language, return it unchanged. Return ONLY the translated text, no other text or JSON.`;

    const result = await chatCompletion(
      [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }],
      { taskType: 'default', temperature: 0.3 }
    );
    const translated = result.replace(/```/g, '').replace(/[""]/g, '').trim();

    return { original: text, translated: translated || text, detectedLanguage: 'unknown', targetLanguage: targetLang };
  } catch (error) {
    logger.warn('AI translation failed', { error: error.message });
    return null;
  }
}

async function translateWithLibre(text, targetLang) {
  try {
    const serverUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de';
    const response = await axios.post(
      `${serverUrl}/translate`,
      { q: text, source: 'auto', target: targetLang, format: 'text' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    if (response.data?.translatedText) {
      return { original: text, translated: response.data.translatedText, detectedLanguage: response.data.detectedLanguage?.language || 'unknown', targetLanguage: targetLang };
    }
    return null;
  } catch (error) {
    logger.warn('LibreTranslate failed', { error: error.message });
    return null;
  }
}

async function translateWithMyMemory(text, targetLang) {
  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text.slice(0, 500), langpair: `en|${targetLang}` },
      timeout: 4000,
    });
    if (response.data?.responseData?.translatedText) {
      return { original: text, translated: response.data.responseData.translatedText, detectedLanguage: response.data.responseData.detectedLanguage || 'unknown', targetLanguage: targetLang, source: 'mymemory' };
    }
    return null;
  } catch (error) {
    logger.warn('MyMemory translation failed', { error: error.message });
    return null;
  }
}

function detectLanguageRule(text) {
  if (!text) return 'unknown';
  const scripts = {
    hi: /[\u0900-\u097F]/,
    ur: /[\u0600-\u06FF\u0750-\u077F]/,
    bn: /[\u0980-\u09FF]/,
    te: /[\u0C00-\u0C7F]/,
    mr: /[\u0900-\u097F]/,
    ta: /[\u0B80-\u0BFF]/,
    gu: /[\u0A80-\u0AFF]/,
    kn: /[\u0C80-\u0CFF]/,
    ml: /[\u0D00-\u0D7F]/,
    pa: /[\u0A00-\u0A7F]/,
    ja: /[\u3040-\u309F\u30A0-\u30FF]/,
    zh: /[\u4E00-\u9FFF]/,
    ar: /[\u0600-\u06FF]/,
    ru: /[\u0400-\u04FF]/,
    ko: /[\uAC00-\uD7AF]/,
  };
  for (const [lang, regex] of Object.entries(scripts)) {
    if (regex.test(text)) return lang;
  }
  if (/^[a-zA-Z0-9\s.,!?;:'"()-]+$/.test(text)) return 'en';
  return 'unknown';
}

async function translateMessage(text, targetLang = 'en') {
  if (!text || !text.trim()) {
    return { original: '', translated: '', detectedLanguage: 'unknown', targetLanguage: targetLang };
  }

  const detected = detectLanguageRule(text);
  if (detected === targetLang) {
    return { original: text, translated: text, detectedLanguage: targetLang, targetLanguage: targetLang, note: 'Already in target language' };
  }

  const { results } = await parallelFallback([
    { name: 'libre', fn: () => translateWithLibre(text, targetLang), timeout: 5000 },
    { name: 'mymemory', fn: () => translateWithMyMemory(text, targetLang), timeout: 4000 },
    { name: 'ai', fn: () => translateWithAI(text, targetLang), timeout: 8000 },
  ]);

  if (results.length > 0) return results[0];

  return { original: text, translated: text, detectedLanguage: 'unknown', targetLanguage: targetLang, note: 'Translation services unavailable' };
}

function getSupportedLanguages() {
  return Object.entries(LANG_NAMES).map(([code, name]) => ({ code, name }));
}

module.exports = { translateMessage, translateWithAI, translateWithLibre, translateWithMyMemory, getSupportedLanguages, LANG_NAMES, detectLanguageRule };
