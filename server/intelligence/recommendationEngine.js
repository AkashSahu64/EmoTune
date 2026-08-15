const RECENCY_PENALTY = 0.15;
const MAX_RECOMMENDATION_AGE = 5;
const RECOMMENDATION_TYPES = ['emoji', 'gif', 'sticker', 'song', 'video', 'shayari', 'reply', 'action'];

const EMOJI_MOOD_MAP = {
  joyful: ['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🎆', '🎇', '🥳', '🎯'],
  excited: ['🔥', '⚡', '🚀', '💥', '🎯', '🤩', '💪', '🙌', '👏', '🎬'],
  happy: ['😊', '😄', '😁', '🙂', '😌', '😇', '☺️', '😊', '🥰', '😋'],
  grateful: ['🙏', '💝', '❤️', '🥹', '✨', '🌸', '🎀', '💗', '🌟', '☀️'],
  loved: ['💕', '💖', '💗', '💓', '💘', '💝', '🩷', '♥️', '❤️‍🔥', '🥰'],
  romantic: ['💕', '💋', '💗', '🌹', '💐', '💞', '💖', '🥰', '😘', '💝'],
  flirty: ['😉', '😘', '💋', '💕', '😏', '🔥', '🌹', '💝', '🫦', '💅'],
  neutral: ['👍', '👌', '🙂', '💯', '✅', '📌', '✨', '👀', '🤷', '🧐'],
  confused: ['🤔', '🧐', '🤨', '😕', '🤷', '🙄', '😶', '🤯', '🫤', '❓'],
  surprised: ['😮', '😯', '😲', '🤯', '😳', '🫢', '😱', '🤭', '🫨', '💥'],
  anxious: ['😰', '😥', '😟', '😬', '🥺', '😣', '😖', '😩', '🫣', '💀'],
  worried: ['😟', '😥', '😰', '🥺', '😔', '😣', '😕', '🫤', '🤞', '🙏'],
  bored: ['😐', '😑', '😴', '🥱', '😒', '🙄', '😶', '🫤', '💤', '😮‍💨'],
  sad: ['😢', '😭', '🥺', '💔', '😞', '😔', '😥', '😪', '🫂', '🤧'],
  angry: ['😠', '😡', '🤬', '💢', '😤', '👿', '💀', '🔪', '🗯️', '💥'],
  frustrated: ['😤', '😩', '😫', '😒', '🙄', '💢', '🤦', '😮‍💨', '🔫', '💣'],
  annoyed: ['😒', '🙄', '😤', '💢', '😑', '😐', '🤨', '🤷', '😮‍💨', '💅'],
  hurt: ['💔', '😢', '🥺', '😞', '😔', '💧', '😭', '💀', '💤', '😮‍💨'],
  guilty: ['😞', '😔', '🥺', '💔', '😢', '😣', '😥', '🫂', '😮‍💨', '🤧'],
  apologetic: ['🥺', '🙏', '💔', '😢', '🤝', '💝', '😔', '😥', '🫂', '😭'],
  hopeful: ['🤞', '🙏', '✨', '🌟', '💫', '🌈', '🌅', '🌞', '⭐', '🕯️'],
  supportive: ['🤗', '🫂', '💪', '❤️', '🤝', '💗', '🌟', '🙌', '✨', '💖'],
  thankful: ['🙏', '💝', '❤️', '🥹', '✨', '🌸', '🎀', '💗', '🌟', '☀️'],
};

const STICKER_MOOD_MAP = {
  happy: 'happy', sad: 'sad', love: 'romantic', angry: 'angry', celebrate: 'celebration',
  hug: 'support', wink: 'flirty', cry: 'sad', laugh: 'joyful', wave: 'greeting',
};

const RELATIONSHIP_WEIGHTS = {
  friend: { casual: 1.0, romantic: 0.1, formal: 0.2, supportive: 0.6 },
  best_friend: { casual: 1.0, romantic: 0.4, formal: 0.1, supportive: 1.0 },
  romantic: { casual: 0.8, romantic: 1.0, formal: 0.1, supportive: 1.0 },
  spouse: { casual: 0.9, romantic: 1.0, formal: 0.1, supportive: 1.0 },
  family: { casual: 0.9, romantic: 0.2, formal: 0.3, supportive: 1.0 },
  sibling: { casual: 1.0, romantic: 0.1, formal: 0.2, supportive: 0.9 },
  parent: { casual: 0.7, romantic: 0.1, formal: 0.6, supportive: 0.9 },
  colleague: { casual: 0.5, romantic: 0.1, formal: 0.9, supportive: 0.5 },
  boss: { casual: 0.3, romantic: 0.0, formal: 1.0, supportive: 0.4 },
  client: { casual: 0.2, romantic: 0.0, formal: 1.0, supportive: 0.3 },
  teacher: { casual: 0.4, romantic: 0.0, formal: 0.9, supportive: 0.5 },
  unknown: { casual: 0.6, romantic: 0.1, formal: 0.7, supportive: 0.5 },
};

const STATE_EMOJI_MAP = {
  greeting: ['👋', '🙋', '😊', '💁', '✨'],
  celebration: ['🎉', '🎊', '🥳', '🎯', '🌟'],
  flirting: ['😉', '💕', '💋', '🌹', '😘'],
  argument: ['🤝', '🕊️', '💙', '😔', '🙏'],
  apology: ['🥺', '🙏', '💔', '🫂', '❤️‍🩹'],
  support: ['🫂', '🤗', '💪', '❤️', '🌟'],
  planning: ['📅', '📍', '📝', '🤝', '✅'],
  ending: ['👋', '🙋', '💁', '✌️', '🖐️'],
  discussion: ['💭', '🤔', '🧠', '💡', '🗣️'],
  small_talk: ['😊', '🙂', '✨', '💬', '👀'],
  professional: ['💼', '📊', '✅', '📌', '🤝'],
};

class RecommendationEngine {
  constructor() {
    this.recent = new Map();
  }

  getRecommendations(analysis, preferences = {}) {
    const {
      currentEmotion = { emotion: 'neutral', confidence: 0.5 },
      emotionTimeline = [],
      conversationState = 'small_talk',
      relationshipType = 'unknown',
      relationshipScore = 0,
      momentum = {},
      topics = [],
      predictions = {},
    } = analysis;

    const state = conversationState;
    const emotion = currentEmotion.emotion;
    const chatId = preferences.chatId || 'default';
    const recentKey = `${chatId}_${state}_${emotion}`;

    const weightFactors = this._calculateWeightFactors(analysis, preferences);
    const freshness = this._calculateFreshness(recentKey);

    const emojiScore = this._scoreType('emoji', weightFactors, freshness);
    const gifScore = this._scoreType('gif', weightFactors, freshness);
    const stickerScore = this._scoreType('sticker', weightFactors, freshness);
    const shayariScore = this._scoreType('shayari', weightFactors, freshness);
    const songScore = this._scoreType('song', weightFactors, freshness);
    const replyScore = this._scoreType('reply', weightFactors, freshness);

    const emojis = this._getEmojiSuggestions(emotion, state, relationshipType, pickCount(emojiScore));
    const stickers = this._getStickerSuggestions(emotion, state, relationshipType, pickCount(stickerScore));
    const shayari = this._getShayariSuggestions(emotion, state, relationshipType, pickCount(shayariScore));
    const songs = this._getSongSuggestions(emotion, state, relationshipType, pickCount(songScore));
    const replies = predictions?.suggestedReplies?.slice(0, pickCount(replyScore)) || [];

    this._markRecommended(recentKey);

    return {
      emoji: { suggestions: emojis, score: emojiScore },
      sticker: { suggestions: stickers, score: stickerScore },
      shayari: { suggestions: shayari, score: shayariScore },
      song: { suggestions: songs, score: songScore },
      reply: { suggestions: replies, score: replyScore },
      weightedScores: {
        emoji: emojiScore, sticker: stickerScore, shayari: shayariScore,
        song: songScore, reply: replyScore,
      },
      primary: this._getPrimaryRecommendation({ emoji: emojiScore, sticker: stickerScore, shayari: shayariScore, song: songScore, reply: replyScore }),
    };
  }

  _calculateWeightFactors(analysis, preferences) {
    const { currentEmotion, conversationState, relationshipType, relationshipScore, momentum, topics } = analysis;
    const relWeights = RELATIONSHIP_WEIGHTS[relationshipType] || RELATIONSHIP_WEIGHTS.unknown;

    let emotionStrength = currentEmotion.confidence || 0.5;
    let stateRelevance = 0.6;
    let relationshipRelevance = (relationshipScore || 0) / 100;
    let topicRelevance = topics?.length > 0 ? 0.3 : 0.1;
    let momentumRelevance = momentum.isActive ? 0.4 : momentum.isDead ? 0.1 : 0.3;
    let excitementBoost = momentum.isExciting ? 0.3 : 0;
    let volatilityPenalty = analysis.emotionVolatility > 0.5 ? -0.2 : 0;

    return {
      emotion: emotionStrength,
      state: stateRelevance,
      relationship: relationshipRelevance,
      topic: topicRelevance,
      momentum: momentumRelevance,
      excitement: excitementBoost,
      volatility: volatilityPenalty,
      casual: relWeights.casual,
      romantic: relWeights.romantic,
      formal: relWeights.formal,
      supportive: relWeights.supportive,
    };
  }

  _scoreType(type, factors, freshness) {
    const baseScores = {
      emoji: 0.7, sticker: 0.5, shayari: 0.4, song: 0.3, reply: 0.8,
    };
    const typeModifiers = {
      emoji: { emotion: 0.4, state: 0.2, relationship: 0.1, casual: 0.3 },
      sticker: { emotion: 0.3, state: 0.3, relationship: 0.2, casual: 0.2 },
      shayari: { emotion: 0.4, state: 0.1, relationship: 0.3, romantic: 0.3, casual: -0.1 },
      song: { emotion: 0.3, state: 0.1, relationship: 0.3, romantic: 0.4, casual: -0.1 },
      reply: { emotion: 0.2, state: 0.3, relationship: 0.2, topic: 0.2, casual: 0.1 },
    };
    const mods = typeModifiers[type] || { emotion: 0.2, state: 0.2 };
    let score = baseScores[type] || 0.5;
    for (const [factor, weight] of Object.entries(mods)) {
      score += (factors[factor] || 0) * weight;
    }
    score += freshness;
    score += factors.excitement * (type === 'emoji' ? 0.2 : type === 'song' ? 0.3 : 0.1);
    score += factors.volatility;
    return Math.max(0.1, Math.min(1.0, score));
  }

  _calculateFreshness(key) {
    const last = this.recent.get(key);
    if (!last) return 0.1;
    const elapsed = Date.now() - last;
    const hoursSince = elapsed / 3600000;
    if (hoursSince < 1) return -0.3;
    if (hoursSince < 3) return -0.1;
    if (hoursSince < 6) return 0;
    if (hoursSince < 12) return 0.1;
    return 0.15;
  }

  _markRecommended(key) {
    this.recent.set(key, Date.now());
    if (this.recent.size > 1000) {
      const firstKey = this.recent.keys().next().value;
      this.recent.delete(firstKey);
    }
  }

  _getEmojiSuggestions(emotion, state, relationship, count) {
    const emotionEmojis = EMOJI_MOOD_MAP[emotion] || EMOJI_MOOD_MAP.neutral;
    const stateEmojis = STATE_EMOJI_MAP[state] || [];
    const all = [...emotionEmojis, ...stateEmojis];
    const unique = [...new Set(all)];
    unique.sort(() => Math.random() - 0.5);
    return unique.slice(0, Math.max(2, count));
  }

  _getStickerSuggestions(emotion, state, relationship, count) {
    const stickerMap = {
      happy: ['happy', 'celebrate', 'love'], sad: ['sad', 'cry', 'hug'],
      angry: ['angry', 'frustrated'], joyful: ['celebrate', 'happy', 'excited'],
      romantic: ['love', 'romantic', 'kiss'], flirty: ['wink', 'love', 'flirty'],
      neutral: ['wave', 'ok', 'smile'], excited: ['celebrate', 'party', 'fire'],
      grateful: ['thank', 'hug', 'love'], supportive: ['hug', 'support', 'love'],
      apology: ['sorry', 'hug', 'cry'], celebration: ['celebrate', 'party', 'confetti'],
    };
    const types = stickerMap[emotion] || ['smile', 'wave', 'ok'];
    return types.slice(0, count).map(t => ({ type: t, confidence: 0.7 }));
  }

  _getShayariSuggestions(emotion, state, relationship, count) {
    const sources = ['romantic', 'sad', 'motivational', 'friendship', 'love'];
    if (['romantic', 'loved', 'flirty'].includes(emotion)) return ['romantic', 'love'].slice(0, count);
    if (['sad', 'hurt', 'lonely'].includes(emotion)) return ['sad', 'motivational'].slice(0, count);
    if (['happy', 'joyful', 'celebrate'].includes(emotion)) return ['friendship', 'motivational'].slice(0, count);
    return sources.slice(0, count);
  }

  _getSongSuggestions(emotion, state, relationship, count) {
    const genreMap = {
      happy: 'upbeat pop', sad: 'melancholy acoustic', romantic: 'love ballads',
      angry: 'rock', excited: 'dance electronic', neutral: 'chill lo-fi',
      flirty: 'rnb', supportive: 'inspirational', celebration: 'party',
    };
    const genre = genreMap[emotion] || 'pop';
    return genre.slice(0, count).split(' ').slice(0, count);
  }

  _getPrimaryRecommendation(scores) {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'emoji';
  }
}

function pickCount(score) {
  if (score > 0.8) return 5;
  if (score > 0.6) return 4;
  if (score > 0.4) return 3;
  return 2;
}

module.exports = new RecommendationEngine();
