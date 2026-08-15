const oldEngine = require('./recommendationEngine');
const TimeIntelligence = require('./timeIntelligence');

const EMOJI_MOOD_MAP = {
  joyful: ['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🎆', '🎇', '🥳', '🎯'],
  excited: ['🔥', '⚡', '🚀', '💥', '🎯', '🤩', '💪', '🙌', '👏', '🎬'],
  happy: ['😊', '😄', '😁', '🙂', '😌', '😇', '☺️', '😊', '🥰', '😋'],
  grateful: ['🙏', '💝', '❤️', '🥹', '✨', '🌸', '🎀', '💗', '🌟', '☀️'],
  loved: ['💕', '💖', '💗', '💓', '💘', '💝', '🩷', '♥️', '❤️‍🔥', '🥰'],
  romantic: ['💕', '💋', '💗', '🌺', '💐', '💞', '💖', '🥰', '😘', '💝'],
  flirty: ['😉', '😘', '💋', '💕', '😏', '🔥', '🌹', '💝', '🫦', '💅'],
  neutral: ['👍', '👌', '🙂', '💯', '✅', '📌', '✨', '👀', '🤷', '🧐'],
  confused: ['🤔', '🧐', '🤨', '😕', '🤷', '🙄', '😶', '🤯', '🫤', '❓'],
  surprised: ['😮', '😯', '😲', '🤯', '😳', '🫢', '😱', '🤭', '🫨', '💥'],
  anxious: ['😰', '😥', '😟', '😬', '🥺', '😣', '😖', '😫', '🫣', '💀'],
  worried: ['😟', '😥', '😰', '🥺', '😔', '😣', '😕', '🫤', '🤞', '🙏'],
  bored: ['😐', '😑', '😴', '🥱', '😒', '🙄', '😶', '🫤', '💤', '😮‍💨'],
  sad: ['😢', '😭', '🥺', '💔', '😞', '😔', '😥', '😪', '🫂', '🤧'],
  angry: ['😠', '😡', '🤬', '💢', '😤', '👿', '💀', '💥', '😒', '🙄'],
  supportive: ['🤗', '🫂', '💪', '❤️', '🤝', '💗', '🌟', '🙌', '✨', '💖'],
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

const SCORING_WEIGHTS = {
  emotion: 0.20, relationship: 0.15, topic: 0.10, goal: 0.15,
  dna: 0.10, state: 0.08, momentum: 0.05, memory: 0.05,
  time: 0.05, freshness: 0.02, acceptanceRate: 0.03,
  popularity: 0.01, confidence: 0.01, randomness: 0.00
};

const SUGGESTION_TEMPLATES = {
  greeting: ['Hey! How are you?', 'Hello! What\'s up?', 'Hi there!'],
  small_talk: ['That\'s cool! Tell me more.', 'I see, what else?', 'Interesting!'],
  celebration: ['Congratulations! 🎉', 'That\'s amazing! 🥳', 'So happy for you!'],
  flirting: ['You\'re so cute 😘', 'I love that! 💕', 'You make me smile 😊'],
  support: ['I\'m here for you ❤️', 'You\'ve got this 💪', 'Stay strong ✨'],
  argument: ['Let\'s take a breath', 'I understand your point', 'Maybe we can find common ground'],
  apology: ['It\'s okay, I understand', 'Thank you for saying that', 'I forgive you ❤️'],
  planning: ['Sounds like a plan!', 'Let me know what works', 'I\'ll be there!'],
  professional: ['I agree with that approach', 'Let me review and get back', 'That makes sense'],
  ending: ['Take care! 😊', 'Talk to you later!', 'Goodbye! It was great talking'],
  discussion: ['What do you think?', 'I see your perspective', 'That\'s a good point'],
};

const COMPUTATION_TIME_WARNING_MS = 50;

class AdaptiveRecommendationEngine {
  constructor(options = {}) {
    this.weights = { ...SCORING_WEIGHTS, ...options.weights };
    this.oldEngine = oldEngine;
    this.recentSuggestions = new Map();
    this.dnaPreferences = new Map();
    this.feedbackScores = new Map();
    this.topEmojiCache = ['😂', '❤️', '😊', '👍', '😍', '🙏', '💕', '🔥', '😭', '✨'];
    this.maxRecentTracked = options.maxRecentTracked || 1000;
    this.diversityMinScore = options.diversityMinScore || 0.3;
  }

  getRecommendations(context, options = {}) {
    const startTime = Date.now();
    const { currentEmotion = {}, conversationState, relationshipType, goals = {},
            timeContext, momentum, topics, userDNA, chatId } = context;
    const userId = options.userId || context.userId || 'default';
    const emotionId = currentEmotion.emotion || 'neutral';
    const emotionConfidence = currentEmotion.confidence || 0.5;
    const state = conversationState || 'small_talk';
    const relType = relationshipType || 'unknown';
    const randomness = options.randomness ?? this.weights.randomness;
    const now = Date.now();

    const candidateEmojis = this._getEmojiCandidates(context);
    const candidateGifs = this._getGifCandidates(context);
    const candidateStickers = this._getStickerCandidates(context);
    const candidateShayaris = this._getShayariCandidates(context);
    const candidateSongs = this._getSongCandidates(context);
    const candidateVideos = this._getVideoCandidates(context);
    const candidateSuggestions = this._getSuggestionCandidates(context);

    const ctxMap = {
      emotionId, emotionConfidence, state, relType, goals, timeContext,
      momentum, topics, userDNA, chatId: options.chatId || context.chatId || 'default',
      userId, options, now, randomness,
    };

    const scoredEmojis = this._sortAndRank(candidateEmojis.map(item => this._enrich(item, 'emoji', ctxMap)), ctxMap);
    const scoredGifs = this._sortAndRank(candidateGifs.map(item => this._enrich(item, 'gif', ctxMap)), ctxMap);
    const scoredStickers = this._sortAndRank(candidateStickers.map(item => this._enrich(item, 'sticker', ctxMap)), ctxMap);
    const scoredShayaris = this._sortAndRank(candidateShayaris.map(item => this._enrich(item, 'shayari', ctxMap)), ctxMap);
    const scoredSongs = this._sortAndRank(candidateSongs.map(item => this._enrich(item, 'song', ctxMap)), ctxMap);
    const scoredVideos = this._sortAndRank(candidateVideos.map(item => this._enrich(item, 'video', ctxMap)), ctxMap);
    const scoredSuggestions = this._sortAndRank(candidateSuggestions.map(item => this._enrich(item, 'suggestion', ctxMap)), ctxMap);

    const limit = options.limit || 5;
    const emojis = scoredEmojis.slice(0, limit);
    const gifs = scoredGifs.slice(0, limit);
    const stickers = scoredStickers.slice(0, limit);
    const shayaris = scoredShayaris.slice(0, limit);
    const songs = scoredSongs.slice(0, limit);
    const videos = scoredVideos.slice(0, limit);
    const suggestions = scoredSuggestions.slice(0, Math.max(3, Math.min(8, limit)));

    this._markRecommended(ctxMap.chatId, state, emotionId, emojis, 'emoji');
    this._markRecommended(ctxMap.chatId, state, emotionId, gifs, 'gif');
    this._markRecommended(ctxMap.chatId, state, emotionId, suggestions, 'suggestion');

    const allScores = [...emojis, ...gifs, ...stickers, ...shayaris, ...songs, ...videos, ...suggestions].map(s => s.score);
    const topScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const avgConfidence = allScores.length > 0 ? allScores.reduce((s, c) => s + c, 0) / allScores.length : 0;

    return {
      emojis, gifs, stickers, shayaris, songs, videos, suggestions,
      metadata: {
        topScore,
        avgConfidence,
        signalsUsed: Object.keys(this.weights).filter(k => this.weights[k] > 0 && this.weights[k] === this.weights[k]).length,
        computationTime: Date.now() - startTime,
      }
    };
  }

  _enrich(item, type, ctx) {
    const score = this._calculateMultiFactorScore(item, ctx);
    const randomizedScore = this._addRandomness(score, ctx.randomness);
    return {
      ...item,
      score: randomizedScore,
      confidence: ctx.emotionConfidence,
      reason: this._explain({ ...item, score: randomizedScore }, ctx),
    };
  }

  _calculateMultiFactorScore(item, ctx) {
    const {
      emotionId, emotionConfidence, relType, goals, timeContext,
      momentum, topics, userDNA, state, chatId, now
    } = ctx;
    const w = this.weights;

    const emo = this._emotionAffinity(item, emotionId, emotionConfidence) * w.emotion;
    const rel = this._relationshipAppropriateness(item, relType) * w.relationship;
    const top = this._topicRelevance(item, topics) * w.topic;
    const goal = this._goalAlignment(item, goals) * w.goal;
    const dna = this._dnaAffinity(item, userDNA) * w.dna;
    const timeR = this._timeRelevance(item, timeContext) * w.time;
    const stateA = this._stateAppropriateness(item, state) * w.state;
    const moment = this._momentumFit(item, momentum) * w.momentum;
    const fresh = this._freshness(item, chatId, state, ctx.emotionId) * w.freshness;
    const accept = this._acceptanceRate(item, ctx.userId, ctx.options, ctx) * w.acceptanceRate;
    const pop = (item.popularity || 0) * w.popularity;
    const conf = (item.confidence || 0.5) * w.confidence;

    return Math.max(0, Math.min(1, emo + rel + top + goal + dna + timeR + stateA + moment + fresh + accept + pop + conf));
  }

  _emotionAffinity(item, emotionId, confidence) {
    if (!emotionId || emotionId === 'neutral') return 0.5;
    const emojiList = EMOJI_MOOD_MAP[emotionId] || [];
    if (item.emoji && emojiList.includes(item.emoji)) return 0.8 + confidence * 0.2;
    if (item.type && item.type === emotionId) return 0.7;
    if (item.mood && item.mood === emotionId) return 0.7 + confidence * 0.15;
    return 0.3;
  }

  _relationshipAppropriateness(item, relType) {
    const rel = relType || 'unknown';
    const weights = RELATIONSHIP_WEIGHTS[rel] || RELATIONSHIP_WEIGHTS.unknown;
    if (item.tone === 'romantic') return weights.romantic || 0.1;
    if (item.tone === 'casual') return weights.casual || 0.6;
    if (item.tone === 'formal') return weights.formal || 0.7;
    if (item.tone === 'supportive') return weights.supportive || 0.5;
    if (item.type === 'romantic' && rel === 'romantic') return 1.0;
    if (item.type === 'formal' && (rel === 'boss' || rel === 'colleague' || rel === 'client')) return 0.9;
    return 0.5;
  }

  _topicRelevance(item, topics) {
    if (!topics || !topics.length) return 0.4;
    const itemTopics = item.topics || [];
    if (!itemTopics.length) return 0.3;
    for (const t of topics) {
      if (itemTopics.includes(t)) return 0.9;
    }
    return 0.3;
  }

  _goalAlignment(item, goals) {
    if (!goals || !goals.primary) return 0.4;
    const primary = goals.primary;
    if (item.goal === primary) return 1.0;
    if (goals.secondary && goals.secondary.includes(item.goal)) return 0.7;
    if (item.type === primary) return 0.6;
    if (item.tone === primary) return 0.5;
    return 0.25;
  }

  _dnaAffinity(item, userDNA) {
    if (!userDNA) return 0.4;
    const topEmojis = userDNA.topEmojis || this.topEmojiCache;
    if (item.emoji && topEmojis.includes(item.emoji)) return 0.9;
    if (item.query && userDNA.topTopics && userDNA.topTopics.some(t => item.query.includes(t))) return 0.8;
    return 0.4;
  }

  _timeRelevance(item, timeContext) {
    if (!timeContext) return 0.5;
    if (item.partOfDay && item.partOfDay === timeContext.partOfDay) return 0.9;
    if (item.festival && item.festival === timeContext.festival) return 1.0;
    if (item.dayType && item.dayType === timeContext.dayType) return 0.8;
    if (item.season && item.season === timeContext.season) return 0.7;
    return 0.5;
  }

  _stateAppropriateness(item, state) {
    if (!state) return 0.5;
    if (item.state && item.state === state) return 1.0;
    if (item.emoji && STATE_EMOJI_MAP[state] && STATE_EMOJI_MAP[state].includes(item.emoji)) return 0.85;
    return 0.4;
  }

  _momentumFit(item, momentum) {
    if (!momentum) return 0.5;
    if (momentum.isDead) return item.short ? 0.7 : 0.3;
    if (momentum.isExciting) return item.energetic ? 0.9 : 0.4;
    if (momentum.speed === 'slow') return item.short ? 0.8 : 0.4;
    if (momentum.speed === 'fast') return item.short ? 0.5 : 0.8;
    return 0.5;
  }

  _freshness(item, chatId, state, emotion) {
    const key = `${chatId}_${state}_${emotion}`;
    const recent = this.recentSuggestions.get(key);
    if (!recent) return 0.6;
    const itemKey = item.emoji || item.text || item.url || item.id;
    if (!itemKey) return 0.5;
    const lastSeen = recent.get(itemKey);
    if (!lastSeen) return 0.6;
    const elapsed = Date.now() - lastSeen;
    if (elapsed < 60000) return -0.5;
    if (elapsed < 300000) return -0.2;
    if (elapsed < 3600000) return 0.1;
    if (elapsed < 86400000) return 0.3;
    return 0.6;
  }

  _acceptanceRate(item, userId, options, ctx) {
    const key = `${userId}:${item.emoji || item.text || item.url || item.query || ''}`;
    const score = this.feedbackScores.get(key);
    if (score === undefined) return 0.4;
    return Math.max(0, Math.min(1, (score + 1) / 2));
  }

  _getEmojiCandidates(context) {
    const { currentEmotion = {}, conversationState, goals } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const state = conversationState || 'small_talk';
    const candidates = [];

    const emotionEmojis = EMOJI_MOOD_MAP[emotionId] || EMOJI_MOOD_MAP.neutral;
    for (let i = 0; i < emotionEmojis.length && i < 5; i++) {
      candidates.push({ emoji: emotionEmojis[i], source: 'emotion', mood: emotionId });
    }

    const goalEmojis = this._getGoalBasedEmojis(goals);
    for (const e of goalEmojis) {
      if (!candidates.some(c => c.emoji === e)) {
        candidates.push({ emoji: e, source: 'goal' });
      }
    }

    const timeContext = context.timeContext || TimeIntelligence.getCurrentTimeContext();
    const timeEmojis = TimeIntelligence.getTimeBasedEmojis(timeContext.partOfDay);
    for (let i = 0; i < timeEmojis.length && i < 3; i++) {
      if (!candidates.some(c => c.emoji === timeEmojis[i])) {
        candidates.push({ emoji: timeEmojis[i], source: 'time', partOfDay: timeContext.partOfDay });
      }
    }

    const dna = context.userDNA;
    if (dna && dna.topEmojis) {
      for (const e of dna.topEmojis) {
        if (!candidates.some(c => c.emoji === e)) {
          candidates.push({ emoji: e, source: 'dna' });
        }
      }
    }

    if (timeContext.festival) {
      const festival = TimeIntelligence.getFestivalSuggestions(timeContext.festival);
      if (festival && festival.emojis) {
        for (const e of festival.emojis.slice(0, 3)) {
          if (!candidates.some(c => c.emoji === e)) {
            candidates.push({ emoji: e, source: 'festival', festival: timeContext.festival });
          }
        }
      }
    }

    if (candidates.length < 3) {
      const fallback = ['😊', '👍', '✨', '💯', '🎉'];
      for (const e of fallback) {
        if (!candidates.some(c => c.emoji === e)) {
          candidates.push({ emoji: e, source: 'fallback' });
        }
      }
    }

    return candidates;
  }

  _getGoalBasedEmojis(goals) {
    if (!goals || !goals.primary) return [];
    const goalEmojiMap = {
      celebration: ['🎉', '🎊', '🥳', '🎆', '🎇'],
      apology: ['🙏', '🥺', '💔', '🫂', '❤️‍🩹'],
      flirting: ['😉', '💕', '💋', '😘', '🌹'],
      support: ['🫂', '🤗', '💪', '❤️', '🌟'],
      planning: ['📅', '📍', '📝', '🤝', '✅'],
      learning: ['📚', '🧠', '💡', '📖', '✏️'],
      motivation: ['💪', '🔥', '✨', '🌟', '🚀'],
    };
    return goalEmojiMap[goals.primary] || [];
  }

  _getGifCandidates(context) {
    const { currentEmotion = {}, topics, conversationState } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const queries = [emotionId];
    if (topics && topics.length) queries.push(topics[0]);
    if (conversationState && conversationState !== 'small_talk') queries.push(conversationState);
    return queries.map(q => ({ query: q, source: 'context' }));
  }

  _getStickerCandidates(context) {
    const { currentEmotion = {}, conversationState } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const state = conversationState || 'small_talk';
    const stickerMap = {
      happy: ['happy', 'celebrate', 'love'], sad: ['sad', 'cry', 'hug'],
      angry: ['angry', 'frustrated'], joyful: ['celebrate', 'happy', 'excited'],
      romantic: ['love', 'romantic', 'kiss'], flirty: ['wink', 'love', 'flirty'],
      neutral: ['wave', 'ok', 'smile'], excited: ['celebrate', 'party', 'fire'],
      grateful: ['thank', 'hug', 'love'], supportive: ['hug', 'support', 'love'],
      apology: ['sorry', 'hug', 'cry'], celebration: ['celebrate', 'party', 'confetti'],
    };
    const types = stickerMap[emotionId] || ['smile', 'wave', 'ok'];
    return types.map((t, i) => ({ id: `${t}_${i}`, type: t, url: `/stickers/${t}.webp` }));
  }

  _getShayariCandidates(context) {
    const { currentEmotion = {} } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const romanceStates = ['romantic', 'loved', 'flirty'];
    const sadStates = ['sad', 'hurt', 'lonely'];
    const happyStates = ['happy', 'joyful', 'celebrate'];
    let types;
    if (romanceStates.includes(emotionId)) types = ['romantic', 'love'];
    else if (sadStates.includes(emotionId)) types = ['sad', 'motivational'];
    else if (happyStates.includes(emotionId)) types = ['friendship', 'motivational'];
    else types = ['romantic', 'sad', 'motivational', 'friendship', 'love'];
    return types.map((t, i) => ({ text: t, type: t, id: `shayari_${t}_${i}` }));
  }

  _getSongCandidates(context) {
    const { currentEmotion = {} } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const genreMap = {
      happy: 'upbeat pop', sad: 'melancholy acoustic', romantic: 'love ballads',
      angry: 'rock', excited: 'dance electronic', neutral: 'chill lo-fi',
      flirty: 'rnb', supportive: 'inspirational', celebration: 'party',
    };
    const genre = genreMap[emotionId] || 'pop';
    return [{ title: genre, artist: '', query: genre }];
  }

  _getVideoCandidates(context) {
    const { currentEmotion = {}, topics } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const queries = [emotionId];
    if (topics && topics.length) queries.push(topics[0]);
    return queries.map(q => ({ title: q, url: '', query: q }));
  }

  _getSuggestionCandidates(context) {
    const { conversationState = 'small_talk', currentEmotion = {}, goals, momentum } = context;
    const emotionId = currentEmotion.emotion || 'neutral';
    const state = conversationState;
    const templates = SUGGESTION_TEMPLATES[state] || SUGGESTION_TEMPLATES.small_talk;
    const candidates = [];

    for (const text of templates) {
      candidates.push({ text, type: 'template', source: 'rule', state });
    }

    const goalSugs = this._getGoalSuggestions(goals);
    for (const sug of goalSugs) {
      candidates.push({ text: sug.text, type: 'goal', source: 'rule', state, goal: sug.goal });
    }

    const momentumSugs = this._getMomentumSuggestions(momentum);
    for (const sug of momentumSugs) {
      candidates.push({ text: sug, type: 'momentum', source: 'rule', state });
    }

    if (candidates.length < 3) {
      const fallbacks = ['Tell me more about that', 'I see, go on', 'That makes sense'];
      for (let i = 0; i < fallbacks.length; i++) {
        candidates.push({ text: fallbacks[i], type: 'fallback', source: 'fallback', state: 'fallback' });
      }
    }

    const needsAI = context.emotionConfidence < 0.5 && Math.random() < 0.1;
    if (needsAI && context.options && context.options.aiGenerate) {
      const aiSug = { text: '[AI generated suggestion]', type: 'ai', source: 'ai', state };
      candidates.push(aiSug);
    }

    return candidates;
  }

  _getGoalSuggestions(goals) {
    if (!goals || !goals.primary) return [];
    const map = {
      planning: [{ text: 'Sounds like a great plan!', goal: 'planning' }, { text: 'Let me know the details', goal: 'planning' }],
      support: [{ text: 'I\'m here for you', goal: 'support' }, { text: 'You\'re not alone in this', goal: 'support' }],
      celebration: [{ text: 'That\'s amazing! 🎉', goal: 'celebration' }, { text: 'So proud of you!', goal: 'celebration' }],
      apology: [{ text: 'I forgive you ❤️', goal: 'apology' }, { text: 'Thank you for saying that', goal: 'apology' }],
      motivation: [{ text: 'You can do this! 💪', goal: 'motivation' }, { text: 'Believe in yourself!', goal: 'motivation' }],
      flirting: [{ text: 'You\'re making me blush 😊', goal: 'flirting' }, { text: 'I love when you say that 💕', goal: 'flirting' }],
    };
    return map[goals.primary] || [];
  }

  _getMomentumSuggestions(momentum) {
    if (!momentum) return [];
    if (momentum.isDead) return ['Hey, still there?', 'Want to pick up where we left off?'];
    if (momentum.isExciting) return ['Tell me more!', 'That\'s incredible!', 'No way! Really?'];
    if (momentum.speed === 'slow') return ['Want to talk about something else?', 'What\'s on your mind?'];
    return [];
  }

  _addRandomness(score, randomness) {
    if (!randomness || randomness <= 0) return score;
    const jitter = (Math.random() - 0.5) * randomness * 0.4;
    return Math.max(0, Math.min(1, score + jitter));
  }

  _applyDiversityPenalty(candidates) {
    if (!candidates || candidates.length < 2) return candidates;
    const result = [candidates[0]];
    const seenSources = new Set([candidates[0].source || '']);
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const src = c.source || '';
      if (seenSources.has(src)) {
        c.score *= (1 - this.diversityMinScore);
      } else {
        seenSources.add(src);
      }
      result.push(c);
    }
    return result;
  }

  _sortAndRank(candidates, ctx) {
    const scored = candidates
      .filter(c => c && (c.score === undefined || c.score > 0))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    return this._applyDiversityPenalty(scored);
  }

  _explain(candidate, ctx) {
    const parts = [];
    if (candidate.source === 'emotion') parts.push(`matched ${ctx.emotionId} emotion`);
    if (candidate.source === 'goal') parts.push('aligned with conversation goal');
    if (candidate.source === 'dna') parts.push('matches your preferences');
    if (candidate.source === 'time') parts.push('appropriate for time of day');
    if (candidate.source === 'festival') parts.push('festival related');
    if (candidate.state) parts.push(`suitable for ${candidate.state} state`);
    if (candidate.mood === ctx.emotionId) parts.push('emotion matched');
    if (parts.length === 0) parts.push('general recommendation');
    return parts.join(', ');
  }

  _markRecommended(chatId, state, emotion, items, type) {
    const key = `${chatId}_${state}_${emotion}`;
    if (!this.recentSuggestions.has(key)) {
      this.recentSuggestions.set(key, new Map());
    }
    const map = this.recentSuggestions.get(key);
    const now = Date.now();
    for (const item of items) {
      const itemKey = item.emoji || item.text || item.url || item.query || '';
      if (itemKey) map.set(itemKey, now);
    }
    if (this.recentSuggestions.size > this.maxRecentTracked) {
      const firstKey = this.recentSuggestions.keys().next().value;
      this.recentSuggestions.delete(firstKey);
    }
  }

  recordFeedback(userId, type, itemId, score) {
    const key = `${userId}:${type}:${itemId}`;
    this.feedbackScores.set(key, score);
  }

  setDNAPreferences(userId, preferences) {
    this.dnaPreferences.set(userId, preferences);
    if (preferences.topEmojis) {
      this.topEmojiCache = preferences.topEmojis;
    }
  }

  setWeights(newWeights) {
    Object.assign(this.weights, newWeights);
  }
}

module.exports = AdaptiveRecommendationEngine;