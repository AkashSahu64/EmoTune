const { CONFIG } = require('../core/config');
const { chatCompletion } = require('../core/providerManager');
const { logger } = require('../core/logger');
const cacheService = require('../core/cacheService');
const prompts = require('../../ml/config/prompts');
const { truncateMessages } = require('../../ml/utils/textPreprocessor');

const EMOTION_KEYWORDS = {
  happy: { words: ['happy', 'joy', 'glad', 'wonderful', 'great', 'amazing', 'awesome', 'fantastic', 'yay', 'woohoo', 'hurray', 'smile', 'laugh', 'excellent', 'fun', 'exciting', 'celebrate', 'cheers', 'delighted', 'thrilled', 'overjoyed', 'elated'], weight: 2 },
  sad: { words: ['sad', 'cry', 'upset', 'heartbroken', 'depressed', 'grief', 'sorry', 'lonely', 'miss', 'pain', 'hurt', 'disappointed', 'unhappy', 'miserable', 'devastated', 'hopeless', 'gloomy', 'tears', 'sorrow', 'mourn', 'regret'], weight: 2 },
  angry: { words: ['angry', 'mad', 'furious', 'annoyed', 'rage', 'irritated', 'frustrated', 'hate', 'terrible', 'awful', 'livid', 'outraged', 'hostile', 'aggressive', 'fuming', 'boiling'], weight: 2 },
  love: { words: ['love', 'heart', 'romance', 'crush', 'adore', 'care', 'affection', 'sweet', 'baby', 'hug', 'kiss', 'darling', 'dear', 'passion', 'cherish', 'treasure', 'beautiful'], weight: 2 },
  fearful: { words: ['scared', 'fear', 'anxious', 'nervous', 'worried', 'panic', 'afraid', 'terrified', 'terrifying', 'horror', 'horrible', 'frightened', 'alarmed', 'shaky', 'uneasy', 'distressed', 'spooky', 'creepy'], weight: 2 },
  surprised: { words: ['shock', 'surprise', 'surprised', 'wow', 'unexpected', 'amazed', 'amazing', 'stun', 'stunning', 'gasp', 'omg', 'astonished', 'staggered', 'speechless', 'dumbfounded', 'startled'], weight: 2 },
  neutral: { words: ['okay', 'fine', 'hmm', 'well', 'anyway', 'hello', 'hi', 'thanks', 'maybe', 'sure', 'right', 'true', 'agreed', 'understood'], weight: 1 },
};

const EMOJI_KEYWORDS = {
  happy: ['😊', '😂', '🥳', '🤩', '😄', '😁', '😆', '🎉', '✨'],
  sad: ['😢', '😭', '😔', '🥺', '😞', '😿', '💔'],
  angry: ['😡', '🤬', '😤', '💢', '👿', '😠'],
  love: ['😍', '❤️', '🥰', '💕', '💖', '😘', '💗', '💝', '💓'],
  fearful: ['😨', '😰', '😱', '😖', '😣', '😧', '😦'],
  surprised: ['😮', '😲', '🤯', '😳', '🙀', '😯'],
  neutral: ['😐', '🤔', '😶', '🤷', '💬', '😑'],
};

const GREETING_WORDS = new Set(['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon', 'namaste', 'namaskar', 'sup', 'howdy', 'greetings', 'welcome']);
const GRATITUDE_WORDS = new Set(['thanks', 'thank you', 'thankyou', 'thank', 'grateful', 'appreciate', 'bless', 'dhanyavaad', 'shukriya']);

const EMOTION_EMOJI_MAP = {
  happy: '😊', sad: '😢', angry: '😡', love: '😍', fearful: '😨', surprised: '😮', neutral: '💬',
};

const EMOTION_SONG_MAP = {
  happy: 'Happy', sad: 'Someone Like You', angry: 'Break Stuff', love: 'Perfect',
  fearful: 'Radioactive', surprised: 'Wow', neutral: 'Let It Be',
};

const EMOTION_VIDEO_MAP = {
  happy: 'happy celebration moments', sad: 'peaceful rainy scenery', angry: 'calm ocean waves',
  love: 'romantic sunset couple', fearful: 'relaxing nature sounds', surprised: 'amazing nature compilation',
  neutral: 'peaceful conversation background',
};

const EMOTION_SHAYARI_MAP = {
  happy: 'Muskurahat hai toh duniya hai,\nHar pal khushi ka rang hai.',
  sad: 'Aansu bhi kehte hain kuch,\nDard bhi hai zubaan.',
  angry: 'Gussa bhi kya cheez hai,\nDil ko jala deta hai.',
  love: 'Pyaar mein humne yeh seekha,\nDhadkanon se baat karna.',
  fearful: 'Dar lagta hai iss mann ko,\nKahan kho jaaye na tum.',
  surprised: 'Yakeen nahi hota,\nAisa bhi hota hai.',
  neutral: 'Baaton ka safar jaari hai,\nDil ki baatein alfaaz mein dhalti hain.',
};

function classifyByRule(messages) {
  if (!messages || messages.length === 0) {
    return { emotion: 'neutral', confidence: 1, emoji: '💬', reasons: ['empty input'] };
  }

  let combinedText = messages
    .map((m) => (typeof m === 'string' ? m : m.content || ''))
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!combinedText) return { emotion: 'neutral', confidence: 1, emoji: '💬', reasons: ['no text'] };

  const lower = combinedText.toLowerCase();

  const isGreeting = [...GREETING_WORDS].some((g) => lower.startsWith(g));
  if (isGreeting) {
    return { emotion: 'neutral', confidence: 0.9, emoji: '👋', reasons: ['greeting detected'] };
  }

  const hasQuestion = lower.includes('?');
  const isGratitude = [...GRATITUDE_WORDS].some((g) => lower.includes(g));
  if (isGratitude) {
    return { emotion: 'happy', confidence: 0.85, emoji: '🙏', reasons: ['gratitude detected'] };
  }

  const scores = {};
  let totalWeight = 0;
  const words = lower.split(/\s+/).map((w) => w.replace(/[^a-zA-Z0-9]/g, ''));

  for (const [emotion, data] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const kw of data.words) {
      if (kw.length <= 2) continue;
      for (const word of words) {
        if (word === kw) {
          score += data.weight;
        }
      }
    }
    scores[emotion] = score;
    totalWeight += score;
  }

  for (const [emotion, emojis] of Object.entries(EMOJI_KEYWORDS)) {
    for (const emoji of emojis) {
      if (combinedText.includes(emoji)) {
        scores[emotion] = (scores[emotion] || 0) + 3;
        totalWeight += 3;
      }
    }
  }

  if (totalWeight === 0) {
    if (hasQuestion) {
      return { emotion: 'neutral', confidence: 0.7, emoji: '🤔', reasons: ['question detected'] };
    }
    return { emotion: 'neutral', confidence: 0.6, emoji: '💬', reasons: ['no strong signal'] };
  }

  let bestEmotion = 'neutral';
  let bestScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion;
    }
  }

  const confidence = Math.min(bestScore / (totalWeight || 1), 0.95);
  return {
    emotion: bestEmotion,
    confidence,
    emoji: EMOTION_EMOJI_MAP[bestEmotion] || '💬',
    reasons: [`keyword match: ${bestEmotion} (${bestScore}/${totalWeight})`],
  };
}

async function analyzeEmotion(messages, options = {}) {
  if (!messages || messages.length === 0) {
    return { emoji: '💬', shayari: 'Baaton ka safar jaari hai...', song: 'Perfect', video_query: 'peaceful conversation' };
  }

  const ruleResult = classifyByRule(messages);

  if (ruleResult.confidence >= 0.9 && !options.forceAI) {
    logger.debug('Emotion: rule engine high confidence', { emotion: ruleResult.emotion, confidence: ruleResult.confidence });
    return {
      emoji: ruleResult.emoji,
      shayari: EMOTION_SHAYARI_MAP[ruleResult.emotion] || EMOTION_SHAYARI_MAP.neutral,
      song: EMOTION_SONG_MAP[ruleResult.emotion] || EMOTION_SONG_MAP.neutral,
      video_query: EMOTION_VIDEO_MAP[ruleResult.emotion] || EMOTION_VIDEO_MAP.neutral,
    };
  }

  try {
    const cleanedMessages = truncateMessages(messages, 2000);
    const conversationText = cleanedMessages
      .map((msg) => (typeof msg === 'string' ? msg : msg.content || ''))
      .filter(Boolean)
      .join('\n');

    if (!conversationText.trim()) {
      return { emoji: '💬', shayari: 'Baaton ka safar jaari hai...', song: 'Perfect', video_query: 'peaceful conversation' };
    }

    const cachedResult = await cacheService.getSemanticCache('emotion:' + conversationText.slice(0, 200));
    if (cachedResult) {
      logger.debug('Emotion: semantic cache hit');
      return cachedResult;
    }

    const result = await chatCompletion(
      [
        { role: 'system', content: prompts.emotion },
        { role: 'user', content: conversationText },
      ],
      { taskType: 'emotion', responseFormat: 'json_object', ...options }
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    const output = {
      emoji: parsed.emoji || ruleResult.emoji || '💬',
      shayari: parsed.shayari || EMOTION_SHAYARI_MAP[ruleResult.emotion] || EMOTION_SHAYARI_MAP.neutral,
      song: parsed.song || EMOTION_SONG_MAP[ruleResult.emotion] || 'Perfect',
      video_query: parsed.video_query || EMOTION_VIDEO_MAP[ruleResult.emotion] || 'peaceful conversation',
    };

    await cacheService.setSemanticCache('emotion:' + conversationText.slice(0, 200), output);
    return output;
  } catch (error) {
    logger.error('Emotion pipeline error, falling back to rule result', { error: error.message });
    return {
      emoji: ruleResult.emoji || '💬',
      shayari: EMOTION_SHAYARI_MAP[ruleResult.emotion] || EMOTION_SHAYARI_MAP.neutral,
      song: EMOTION_SONG_MAP[ruleResult.emotion] || 'Perfect',
      video_query: EMOTION_VIDEO_MAP[ruleResult.emotion] || 'peaceful conversation',
    };
  }
}

async function analyzeEmotionBulk(messageBatches, onProgress) {
  const results = [];
  for (let i = 0; i < messageBatches.length; i++) {
    results.push(await analyzeEmotion(messageBatches[i]));
    if (onProgress) onProgress((i + 1) / messageBatches.length);
  }
  return results;
}

function emojiToMood(emoji) {
  for (const [mood, emojis] of Object.entries(EMOJI_KEYWORDS)) {
    if (emojis.includes(emoji)) return mood;
  }
  return 'neutral';
}

module.exports = { analyzeEmotion, analyzeEmotionBulk, classifyByRule, EMOTION_KEYWORDS, emojiToMood };
