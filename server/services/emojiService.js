const axios = require('axios');
const { logger } = require('../core/logger');
const { parallelFallback, parallelFetchAll } = require('./parallelFallback');
const { searchLottieAnimations } = require('./lottieService');
const { emojiToMood } = require('../core/emotionPipeline');
const { CONFIG } = require('../core/config');

const STATIC_EMOJIS = [
  { emoji: '😊', name: 'smile', keywords: ['happy', 'smile', 'joy', 'glad', 'pleased', 'delighted', 'cheerful', 'merry'] },
  { emoji: '😂', name: 'joy', keywords: ['laugh', 'funny', 'hilarious', 'rofl', 'lol', 'haha', 'joke', 'comedy'] },
  { emoji: '❤️', name: 'heart', keywords: ['love', 'heart', 'affection', 'care', 'adore', 'cherish', 'devotion'] },
  { emoji: '😍', name: 'heart_eyes', keywords: ['love', 'beautiful', 'cute', 'adorable', 'crush', 'pretty', 'gorgeous'] },
  { emoji: '😢', name: 'cry', keywords: ['sad', 'cry', 'tears', 'upset', 'heartbroken', 'weep', 'sob'] },
  { emoji: '😭', name: 'sob', keywords: ['crying', 'sad', 'devastated', 'sobbing', 'bawling', 'wailing'] },
  { emoji: '😔', name: 'pensive', keywords: ['sad', 'disappointed', 'upset', 'regret', 'remorseful', 'pensive'] },
  { emoji: '😡', name: 'angry', keywords: ['angry', 'mad', 'furious', 'rage', 'annoyed', 'livid', 'irate'] },
  { emoji: '🤬', name: 'face_with_symbols', keywords: ['angry', 'furious', 'cursing', 'swearing', 'cuss'] },
  { emoji: '🥺', name: 'pleading', keywords: ['pleading', 'sad', 'puppy', 'begging', 'innocent', 'pitiful'] },
  { emoji: '😨', name: 'fearful', keywords: ['scared', 'fear', 'anxious', 'worried', 'nervous', 'terrified'] },
  { emoji: '😰', name: 'anxious', keywords: ['anxious', 'nervous', 'worried', 'stress', 'uneasy', 'distress'] },
  { emoji: '🤔', name: 'thinking', keywords: ['think', 'thought', 'ponder', 'wonder', 'curious', 'contemplate'] },
  { emoji: '👍', name: 'thumbsup', keywords: ['good', 'great', 'approve', 'like', 'agree', 'ok', 'awesome', 'nice'] },
  { emoji: '👎', name: 'thumbsdown', keywords: ['bad', 'disapprove', 'dislike', 'disagree', 'terrible', 'awful'] },
  { emoji: '🎉', name: 'party', keywords: ['celebrate', 'party', 'congrats', 'congratulations', 'tada', 'yay'] },
  { emoji: '🔥', name: 'fire', keywords: ['hot', 'fire', 'awesome', 'amazing', 'lit', 'dope', 'sick'] },
  { emoji: '💯', name: '100', keywords: ['perfect', 'awesome', 'amazing', 'excellent', 'flawless', '100'] },
  { emoji: '✨', name: 'sparkles', keywords: ['magic', 'beautiful', 'sparkle', 'shine', 'pretty', 'glitter'] },
  { emoji: '💪', name: 'muscle', keywords: ['strong', 'power', 'effort', 'workout', 'determined', 'strength'] },
  { emoji: '🙏', name: 'pray', keywords: ['pray', 'please', 'hope', 'thankful', 'grateful', 'bless', 'thanks'] },
  { emoji: '👋', name: 'wave', keywords: ['hello', 'hi', 'wave', 'bye', 'goodbye', 'hey', 'greetings'] },
  { emoji: '🎶', name: 'notes', keywords: ['music', 'song', 'melody', 'tune', 'rhythm', 'sing'] },
  { emoji: '💬', name: 'speech_balloon', keywords: ['chat', 'message', 'talk', 'conversation', 'speech'] },
  { emoji: '🥳', name: 'partying_face', keywords: ['celebrate', 'birthday', 'party', 'congratulations', 'tada'] },
  { emoji: '😴', name: 'sleeping', keywords: ['sleep', 'tired', 'boring', 'sleepy', 'yawn', 'nap'] },
  { emoji: '🤩', name: 'star_struck', keywords: ['amazing', 'wow', 'awesome', 'starstruck', 'cool', 'fantastic'] },
  { emoji: '😎', name: 'sunglasses', keywords: ['cool', 'chill', 'style', 'confident', 'boss', 'smooth'] },
  { emoji: '😏', name: 'smirk', keywords: ['smirk', 'mischievous', 'confident', 'sly', 'smug'] },
  { emoji: '😌', name: 'relieved', keywords: ['relieved', 'calm', 'peaceful', 'relaxed', 'serene'] },
];

const EMOJI_MOOD_MAP = {
  happy: ['😊', '😄', '😂', '🥳', '😎', '😍', '🤩', '😁', '😆', '🥰'],
  sad: ['😢', '😭', '😔', '🥺', '😞', '😿', '😔', '💔'],
  angry: ['😡', '🤬', '😤', '👿', '💢', '😠', '🤯'],
  love: ['❤️', '😍', '🥰', '💕', '💖', '💗', '😘', '💝', '💓'],
  fearful: ['😨', '😰', '😱', '😖', '😣', '😧', '😦'],
  surprised: ['😮', '😲', '🤯', '😳', '🙀', '😯', '😧'],
  neutral: ['😐', '🤔', '😶', '🤷', '💬', '😑'],
  celebrate: ['🎉', '🥳', '🎊', '✨', '🎈', '💫', '🎆', '🎇'],
  agree: ['👍', '✅', '💯', '🙌', '👏', '🤝', '✌️'],
  disagree: ['👎', '❌', '🚫', '🙅', '😒', '😤'],
  love_nature: ['🌹', '🌸', '🌺', '🌻', '🌷', '💐', '🌿'],
  food: ['🍕', '🍔', '🌮', '🍦', '🍰', '☕', '🍩', '🍪'],
  funny: ['😂', '🤣', '😅', '😆', '😜', '🤪', '🤡'],
};

const SYNONYMS = {
  happy: ['cheerful', 'delighted', 'elated', 'joyful', 'merry', 'upbeat', 'euphoric', 'thrilled', 'ecstatic'],
  sad: ['unhappy', 'down', 'gloomy', 'melancholy', 'somber', 'woeful', 'dismal', 'dejected', 'mournful'],
  angry: ['irate', 'livid', 'outraged', 'irritated', 'exasperated', 'incensed', 'wrathful'],
  love: ['adore', 'cherish', 'treasure', 'worship', 'idolize', 'admire', 'devoted'],
  fearful: ['frightened', 'terrified', 'alarmed', 'panicked', 'petrified', 'horrified'],
  surprised: ['astonished', 'astounded', 'dumbfounded', 'startled', 'stunned', 'flabbergasted'],
};

function expandKeywords(word) {
  const lower = word.toLowerCase();
  for (const [mood, syns] of Object.entries(SYNONYMS)) {
    if (syns.includes(lower) || mood === lower) return [lower, ...syns];
  }
  return [lower];
}

function matchEmojisByText(text, count = 8) {
  if (!text) return STATIC_EMOJIS.slice(0, count).map((e) => e.emoji);

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const scored = STATIC_EMOJIS.map((e) => {
    let score = 0;
    for (const word of words) {
      const expanded = expandKeywords(word);
      for (const exp of expanded) {
        for (const kw of e.keywords) {
          if (kw.includes(exp) || exp.includes(kw)) score += 2;
          if (kw === exp) score += 4;
        }
      }
      if (e.name.includes(word)) score += 3;
    }
    for (const [mood, emojis] of Object.entries(EMOJI_MOOD_MAP)) {
      if (emojis.includes(e.emoji) && (lower.includes(mood) || words.some((w) => mood.includes(w) || w.includes(mood) || SYNONYMS[mood]?.some((s) => w.includes(s) || s.includes(w))))) {
        score += 5;
      }
    }
    return { emoji: e.emoji, score, name: e.name };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).map((s) => s.emoji);
  const remaining = STATIC_EMOJIS.map((e) => e.emoji).filter((e) => !top.includes(e));

  return [...top, ...remaining].slice(0, count);
}

function getEmojisByMood(mood, count = 8) {
  const moodKey = (mood || 'neutral').toLowerCase().trim();
  const exact = EMOJI_MOOD_MAP[moodKey];
  if (exact) return exact.slice(0, count);

  for (const [key, emojis] of Object.entries(EMOJI_MOOD_MAP)) {
    if (moodKey.includes(key) || key.includes(moodKey)) return emojis.slice(0, count);
  }

  return STATIC_EMOJIS.slice(0, count).map((e) => e.emoji);
}

function normalizeGiphyItem(item, type, provider = 'giphy') {
  const images = item.images || {};
  const rendition = images.fixed_height || images.fixed_width || images.downsized_medium || images.original;
  if (!item.id || !rendition?.url) return null;
  return {
    id: `${provider}:${item.id}`,
    provider,
    sourceId: item.id,
    type,
    url: rendition.url,
    preview: (images.fixed_height_small || images.fixed_width_small || rendition).url || rendition.url,
    title: item.title || type.toUpperCase(),
    width: Number(rendition.width) || undefined,
    height: Number(rendition.height) || undefined,
  };
}

async function searchGiphy(query, limit = 8, type = 'gif') {
  const apiKey = CONFIG.apis.giphy.apiKey;
  if (!apiKey) return [];

  const endpoint = type === 'sticker'
    ? 'https://api.giphy.com/v1/stickers/search'
    : 'https://api.giphy.com/v1/gifs/search';
  const response = await axios.get(endpoint, {
    params: { api_key: apiKey, q: String(query || 'reaction').slice(0, 50), limit, rating: 'g' },
    timeout: 4000,
  });

  return (response.data?.data || [])
    .map((item) => normalizeGiphyItem(item, type))
    .filter(Boolean);
}

function getKlipyMedia(item, type) {
  const media = item.media_formats || item.media || item.content || {};
  const rendition = media.gif || media.mediumgif || media.tinygif || media.sticker || media.webp || media.jpg || media.image || media;
  const url = rendition?.url || rendition?.src || item.url || item.image_url;
  if (!item.id && !url) return null;
  return {
    id: `klipy:${item.id || url}`,
    provider: 'klipy',
    sourceId: item.id || url,
    type,
    url,
    preview: media.tinygif?.url || media.nanogif?.url || media.tinywebp?.url || url,
    title: item.content_description || item.title || type.toUpperCase(),
  };
}

async function searchKlipy(query, limit = 8, type = 'gif') {
  const { apiKey, baseUrl } = CONFIG.apis.klipy;
  if (!apiKey) return [];
  const response = await axios.get(baseUrl, {
    params: {
      key: apiKey,
      q: String(query || 'reaction').slice(0, 50),
      limit,
      contentfilter: 'high',
      media_filter: type === 'sticker' ? 'sticker' : 'gif,tinygif',
    },
    timeout: 4000,
  });
  const results = response.data?.results || response.data?.data || [];
  return results.map((item) => getKlipyMedia(item, type)).filter((item) => item?.url);
}

async function searchStipop(query, limit = 8, userId = 'emotune-server') {
  const { apiKey, baseUrl } = CONFIG.apis.stipop;
  if (!apiKey) return [];
  const response = await axios.get(baseUrl, {
    headers: { apikey: apiKey },
    params: {
      userId,
      q: String(query || 'reaction').slice(0, 80),
      lang: 'en',
      countryCode: 'US',
      pageNumber: 1,
      limit: Math.min(limit, 50),
    },
    timeout: 4000,
  });
  return (response.data?.body?.stickerList || []).map((item) => ({
    id: `stipop:${item.stickerId}`,
    provider: 'stipop',
    sourceId: String(item.stickerId),
    type: 'sticker',
    url: item.stickerImg,
    preview: item.stickerImg,
    title: item.keyword || 'Sticker',
  })).filter((item) => item.url);
}

function mergeByProviderPriority(groups, limit) {
  const seen = new Set();
  return groups.flatMap((group) => group || []).filter((item) => {
    const key = item.url || item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

const CURATED_STICKER_PACKS = {
  love: [
    ['XO', '#ff5c8a', '#ffe1ea'],
    ['HEART', '#ff3366', '#fff0f5'],
    ['MISS U', '#d946ef', '#fce7f3'],
    ['HUG', '#fb7185', '#ffe4e6'],
  ],
  kiss: [
    ['KISS', '#ec4899', '#fdf2f8'],
    ['MUAH', '#f43f5e', '#ffe4e6'],
    ['XOXO', '#db2777', '#fae8ff'],
    ['LOVE', '#ef4444', '#fee2e2'],
  ],
  cute: [
    ['CUTE', '#a78bfa', '#f5f3ff'],
    ['AWW', '#60a5fa', '#eff6ff'],
    ['SOFT', '#34d399', '#ecfdf5'],
    ['SMOL', '#fbbf24', '#fffbeb'],
  ],
  happy: [
    ['YAY', '#f59e0b', '#fffbeb'],
    ['LOL', '#22c55e', '#f0fdf4'],
    ['WOW', '#06b6d4', '#ecfeff'],
    ['COOL', '#6366f1', '#eef2ff'],
  ],
  sad: [
    ['SAD', '#64748b', '#f1f5f9'],
    ['CRY', '#38bdf8', '#e0f2fe'],
    ['SORRY', '#818cf8', '#eef2ff'],
    ['HMM', '#94a3b8', '#f8fafc'],
  ],
  animals: [
    ['MEOW', '#f97316', '#fff7ed'],
    ['PAW', '#92400e', '#fef3c7'],
    ['WOOF', '#84cc16', '#f7fee7'],
    ['BIRD', '#0ea5e9', '#e0f2fe'],
  ],
  trending: [
    ['FIRE', '#ef4444', '#fee2e2'],
    ['VIBE', '#8b5cf6', '#f5f3ff'],
    ['OK', '#22c55e', '#f0fdf4'],
    ['OMG', '#f59e0b', '#fffbeb'],
  ],
};

function getStickerPack(query) {
  const lower = String(query || '').toLowerCase();
  const key = Object.keys(CURATED_STICKER_PACKS).find((pack) => lower.includes(pack));
  return CURATED_STICKER_PACKS[key || 'trending'];
}

function createStickerSvgUrl(label, foreground, background, index) {
  const tilt = [-8, 5, -3, 7][index % 4];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="58" fill="${background}"/>
      <circle cx="74" cy="68" r="26" fill="${foreground}" opacity="0.18"/>
      <circle cx="186" cy="190" r="34" fill="${foreground}" opacity="0.16"/>
      <path d="M63 168 C85 207 173 207 193 168 C177 230 79 231 63 168Z" fill="${foreground}" opacity="0.22"/>
      <g transform="rotate(${tilt} 128 128)">
        <rect x="36" y="74" width="184" height="92" rx="36" fill="white" opacity="0.92"/>
        <text x="128" y="133" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="${label.length > 5 ? 35 : 43}"
          font-weight="900" fill="${foreground}">${label}</text>
      </g>
    </svg>
  `.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getCuratedStickers(query, limit = 24) {
  const pack = getStickerPack(query);
  return Array.from({ length: limit }, (_, index) => {
    const [label, foreground, background] = pack[index % pack.length];
    return {
      id: `curated-sticker:${String(query || 'trending').toLowerCase()}:${index}`,
      provider: 'curated',
      sourceId: `curated-${index}`,
      type: 'image/svg+xml',
      url: createStickerSvgUrl(label, foreground, background, index),
      preview: createStickerSvgUrl(label, foreground, background, index),
      title: `${label} sticker`,
    };
  });
}

async function getUnifiedMedia(query, limit = 24, userId = 'emotune-server') {
  const providers = [
    {
      name: 'giphy',
      run: async () => {
        const [gifs, stickers] = await Promise.allSettled([
          searchGiphy(query, limit, 'gif'),
          searchGiphy(query, limit, 'sticker'),
        ]);
        return {
          gifs: gifs.status === 'fulfilled' ? gifs.value : [],
          stickers: stickers.status === 'fulfilled' ? stickers.value : [],
        };
      },
    },
    {
      name: 'klipy',
      run: async () => {
        const [gifs, stickers] = await Promise.allSettled([
          searchKlipy(query, limit, 'gif'),
          searchKlipy(query, limit, 'sticker'),
        ]);
        return {
          gifs: gifs.status === 'fulfilled' ? gifs.value : [],
          stickers: stickers.status === 'fulfilled' ? stickers.value : [],
        };
      },
    },
    {
      name: 'stipop',
      run: async () => ({ gifs: [], stickers: await searchStipop(query, limit, userId) }),
    },
  ];
  const settled = await Promise.allSettled(providers.map((provider) => provider.run()));
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn('Media provider failed; continuing with remaining providers', {
        provider: providers[index].name,
        error: result.reason?.message || 'Unknown provider error',
      });
    }
  });
  const results = settled.map((result) => result.status === 'fulfilled' ? result.value : { gifs: [], stickers: [] });
  const gifs = mergeByProviderPriority(results.map((result) => result.gifs), limit);
  const stickers = mergeByProviderPriority(results.map((result) => result.stickers), limit);
  return {
    gifs,
    stickers: stickers.length ? stickers : getCuratedStickers(query, limit),
  };
}

const CIL = require('../intelligence/conversationIntelligenceLayer');

async function getEmojiSuggestions(chatId, messageText, count = 8) {
  const recs = await CIL.getRecommendations(chatId);
  const emojis = recs?.emoji?.suggestions || matchEmojisByText(messageText, count);
  return { emojis: emojis.slice(0, count), mood: 'auto' };
}

async function getGifSuggestions(chatId, query, count = 8) {
  const { results } = await parallelFetchAll([
    { name: 'giphy', fn: () => searchGiphy(query || 'reaction', count), timeout: 4000 },
    { name: 'lottie', fn: () => searchLottieAnimations(query || 'reaction', count), timeout: 6000 },
  ]);

  const uniqueGifs = [];
  const seen = new Set();
  for (const gif of results) {
    if (!seen.has(gif.url)) {
      seen.add(gif.url);
      uniqueGifs.push(gif);
    }
  }
  return uniqueGifs.slice(0, count);
}

async function getStickerSuggestions(query, count = 8) {
  const stickers = await searchLottieAnimations(query || 'reaction', count);
  return stickers.slice(0, count);
}

module.exports = {
  getEmojiSuggestions,
  getGifSuggestions,
  getUnifiedMedia,
  searchKlipy,
  searchStipop,
  getStickerSuggestions,
  matchEmojisByText,
  getEmojisByMood,
  searchGiphy,
  STATIC_EMOJIS,
  EMOJI_MOOD_MAP,
};
