const logger = require('../utils/logger');

const CURATED_LOTTIE = [
  { id: 'lf_addphoto', url: 'https://lottie.host/960c9da5-cadc-4a97-993e-2f4321bffb57/aowBzkxVWs.json', preview: '', name: 'Add Photo', mood: 'happy' },
  { id: 'lf_addphoto_2', url: 'https://lottie.host/960c9da5-cadc-4a97-993e-2f4321bffb57/aowBzkxVWs.json', preview: '', name: 'Capture', mood: 'surprised' },
  { id: 'lf_demo', url: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie', preview: '', name: 'Animation', mood: 'celebrate' },
  { id: 'lf_demo_2', url: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie', preview: '', name: 'Motion', mood: 'love' },
  { id: 'lf_paperplane', url: 'https://assets3.lottiefiles.com/packages/lf20_x62chJ.json', preview: '', name: 'Paper Plane', mood: 'neutral' },
  { id: 'lf_paperplane_2', url: 'https://assets3.lottiefiles.com/packages/lf20_x62chJ.json', preview: '', name: 'Fly High', mood: 'happy' },
  { id: 'lf_desktop', url: 'https://assets3.lottiefiles.com/packages/lf20_zhl8lan4.json', preview: '', name: 'Desktop', mood: 'neutral' },
  { id: 'lf_desktop_2', url: 'https://assets3.lottiefiles.com/packages/lf20_zhl8lan4.json', preview: '', name: 'Work', mood: 'neutral' },
];

const MOOD_KEYWORDS = {
  happy: ['happy', 'joy', 'glad', 'cheer', 'excited', 'great', 'awesome', 'wonderful', 'fun', 'laugh', 'smile', 'celebrate', 'party', 'dance', 'cool', 'love', 'amazing', 'beautiful', 'wow', 'nice', 'good'],
  sad: ['sad', 'cry', 'upset', 'heartbroken', 'depressed', 'grief', 'sorry', 'lonely', 'alone', 'miss', 'pain', 'hurt', 'disappoint'],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'rage', 'irritated', 'frustrated', 'hate', 'terrible', 'bad'],
  love: ['love', 'heart', 'romance', 'crush', 'adore', 'care', 'affection', 'sweet', 'baby', 'kiss', 'hug'],
  fearful: ['scared', 'fear', 'anxious', 'nervous', 'worried', 'panic', 'afraid', 'terrified', 'horror'],
  surprised: ['shock', 'surprise', 'wow', 'unexpected', 'amazed', 'stun', 'gasp', 'omg', 'oh'],
  celebrate: ['congrat', 'celebrate', 'party', 'win', 'success', 'achievement', 'tada', 'fireworks', 'confetti', 'birthday', 'merry', 'happy new year'],
  neutral: ['ok', 'okay', 'fine', 'think', 'thought', 'maybe', 'hmm', 'well', 'anyway', 'so'],
};

function getMoodKeywords(query) {
  const lower = (query || '').toLowerCase().trim();
  if (!lower) return 'neutral';

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw) || kw.includes(lower)) return mood;
    }
  }
  return 'neutral';
}

async function searchLottieFiles(query, limit = 8) {
  try {
    const axios = require('axios');
    const response = await axios.get('https://lottiefiles.com/api/guest/search', {
      params: { q: query || 'reaction', limit: Math.min(limit, 20) },
      timeout: 4000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    const animations = response.data?.data || response.data?.results || [];
    if (!animations.length) return [];

    return animations.slice(0, limit).map((anim) => ({
      id: anim.id || 'lf_' + Math.random().toString(36).slice(2),
      url: anim.lottie_url || anim.json_url || '',
      preview: anim.poster_url || anim.image_url || anim.thumbnail_url || '',
      title: anim.name || anim.title || anim.description || query,
      source: 'lottie',
      type: 'lottie',
    })).filter((a) => a.url);
  } catch (err) {
    logger.warn('LottieFiles API unavailable, using curated collection', { error: err.message });
    return [];
  }
}

function getCuratedAnimations(query, limit = 8) {
  const mood = getMoodKeywords(query);

  const byMood = CURATED_LOTTIE.filter((a) => a.mood === mood);
  const shuffled = [...byMood].sort(() => Math.random() - 0.5);

  if (shuffled.length >= limit) return shuffled.slice(0, limit).map(toResult);

  const others = CURATED_LOTTIE.filter((a) => a.mood !== mood);
  const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
  const combined = [...shuffled, ...shuffledOthers];

  return combined.slice(0, limit).map(toResult);
}

function toResult(anim) {
  return {
    id: anim.id,
    url: anim.url,
    preview: anim.preview || '',
    title: anim.name,
    source: 'lottie',
    type: 'lottie',
  };
}

async function searchLottieAnimations(query, limit = 8) {
  const apiResults = await searchLottieFiles(query, limit);
  if (apiResults.length > 0) return apiResults.slice(0, limit);
  return getCuratedAnimations(query, limit);
}

module.exports = { searchLottieAnimations, searchLottieFiles, getCuratedAnimations, CURATED_LOTTIE };
