const SIGNAL_SOURCES = [
  'conversationHistory', 'currentMessage', 'conversationState',
  'relationshipProfile', 'emotionTimeline', 'topicEvolution',
  'conversationGoal', 'conversationDNA', 'memory',
  'currentTime', 'previousSuggestions', 'acceptanceRate',
];

const BUILD_CONTEXT_WEIGHTS = {
  emotion: 0.25, relationship: 0.15, topic: 0.15,
  goal: 0.15, dna: 0.10, time: 0.05,
  state: 0.05, momentum: 0.05, memory: 0.05,
};

const CONTEXT_TTL = 30000;

class ContextEngine {
  constructor() {
    this.SIGNAL_SOURCES = SIGNAL_SOURCES;
    this.BUILD_CONTEXT_WEIGHTS = BUILD_CONTEXT_WEIGHTS;
    this._lastBuiltAt = null;
    this._lastContext = null;
  }

  buildContext(options = {}) {
    const now = new Date();

    const conversation = this._buildConversation(options);
    const emotion = this._buildEmotion(options);
    const relationship = this._buildRelationship(options);
    const topic = this._buildTopic(options);
    const goal = this._buildGoal(options);
    const user = this._buildUser(options);
    const time = this._buildTime(options);
    const memory = this._buildMemory(options);
    const recommendations = this._buildRecommendations(options);

    const perSignal = {
      emotion: emotion.confidence || 0,
      relationship: relationship.confidence || 0,
      topic: topic.confidence || 0,
      goal: goal.confidence || 0,
      dna: user.dna.confidence || 0,
      time: 1.0,
      state: conversation.state ? 0.8 : 0,
      momentum: options.conversationState?.momentum?.isActive ? 0.7 : 0.3,
      memory: memory.relevantMemories?.length > 0 ? 0.7 : 0.3,
    };

    const overall = this._calculateOverallConfidence(contextSignalConfidences(perSignal));

    const context = {
      conversation,
      emotion,
      relationship,
      topic,
      goal,
      user,
      time,
      memory,
      recommendations,
      confidence: {
        overall,
        perSignal: perSignal,
      },
      _meta: {
        builtAt: now,
        sourceCount: Object.keys(options).length,
        signalsUsed: Object.keys(options),
      },
    };

    this._lastBuiltAt = now;
    this._lastContext = context;

    return context;
  }

  mergeSignals(signals) {
    if (!signals || signals.length === 0) return { confidence: 0, merged: {} };

    const totalWeight = signals.reduce((sum, s) => sum + (s.weight || 1), 0);
    if (totalWeight === 0) return { confidence: 0, merged: {} };

    const merged = {};
    const confidenceValues = [];

    for (const signal of signals) {
      const weight = signal.weight || 1;
      const normalizedWeight = weight / totalWeight;
      const data = signal.data || {};

      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
          merged[key] = (merged[key] || 0) + value * normalizedWeight;
        } else if (value !== undefined && value !== null) {
          merged[key] = value;
        }
      }

      if (signal.confidence !== undefined) {
        confidenceValues.push({ confidence: signal.confidence, weight });
      }
    }

    const overallConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, c) => sum + c.confidence * (c.weight / totalWeight), 0)
      : 0;

    return { merged, confidence: Math.round(overallConfidence * 100) / 100 };
  }

  getContextualBoost(context, suggestionType) {
    if (!context) return 1.0;

    let boost = 1.0;

    const emotionBoost = this._emotionBoost(context.emotion, suggestionType);
    boost *= emotionBoost;

    const relationshipBoost = this._relationshipBoost(context.relationship, suggestionType);
    boost *= relationshipBoost;

    const topicBoost = this._topicBoost(context.topic, suggestionType);
    boost *= topicBoost;

    const goalBoost = this._goalBoost(context.goal, suggestionType);
    boost *= goalBoost;

    const timeBoost = this._timeBoost(context.time, suggestionType);
    boost *= timeBoost;

    const momentumBoost = context.conversation?.momentum ? 1.2 : 1.0;
    boost *= momentumBoost;

    const acceptanceBoost = context.recommendations?.acceptanceRate > 0.5 ? 1.15 : 1.0;
    boost *= acceptanceBoost;

    return Math.min(3.0, Math.max(0, Math.round(boost * 100) / 100));
  }

  getContextSummary(context) {
    if (!context) return 'No context available.';

    const parts = [];

    if (context.emotion?.current) {
      parts.push(`Feeling ${context.emotion.current} (${context.emotion.trend})`);
    }

    if (context.relationship?.type && context.relationship.type !== 'unknown') {
      parts.push(`${context.relationship.type} relationship (${context.relationship.score}/100)`);
    }

    if (context.topic?.current) {
      const change = context.topic.changeDetected ? ` [topic shift: ${context.topic.changeDetected.from} -> ${context.topic.changeDetected.to}]` : '';
      parts.push(`Topic: ${context.topic.current}${change}`);
    }

    if (context.goal?.primary) {
      parts.push(`Goal: ${context.goal.primary} (${Math.round(context.goal.confidence * 100)}%)`);
    }

    if (context.time?.partOfDay) {
      parts.push(`${context.time.partOfDay}${context.time.festival ? ', ' + context.time.festival.replace(/_/g, ' ') : ''}`);
    }

    if (context.conversation?.state) {
      parts.push(`State: ${context.conversation.state}`);
    }

    if (context.conversation?.messageCount > 0) {
      parts.push(`${context.conversation.messageCount} messages`);
    }

    parts.push(`Confidence: ${Math.round(context.confidence.overall * 100)}%`);

    return parts.join(' | ');
  }

  getSignalStrength(context) {
    if (!context?.confidence?.perSignal) {
      return { strongest: null, weakest: null, ranked: [] };
    }

    const ranked = Object.entries(context.confidence.perSignal)
      .map(([signal, confidence]) => ({ signal, confidence }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      strongest: ranked[0] || null,
      weakest: ranked[ranked.length - 1] || null,
      ranked,
    };
  }

  shouldRefreshContext(context) {
    if (!context?._meta?.builtAt) return true;
    return Date.now() - new Date(context._meta.builtAt).getTime() > CONTEXT_TTL;
  }

  _calculateOverallConfidence(perSignal) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [signal, confidence] of Object.entries(perSignal)) {
      const weight = BUILD_CONTEXT_WEIGHTS[signal] || 0.05;
      weightedSum += confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  }

  _buildConversation(options) {
    const state = options.conversationState || {};
    const history = options.conversationHistory || [];

    return {
      id: state.chatId || options.chatId || null,
      messageCount: Array.isArray(history) ? history.length : (state.messageCount || 0),
      duration: state.duration || 0,
      state: state.currentState || state.state || null,
      momentum: state.momentum || null,
    };
  }

  _buildEmotion(options) {
    const timeline = options.emotionTimeline || [];
    const current = Array.isArray(timeline) && timeline.length > 0
      ? timeline[timeline.length - 1]
      : null;

    return {
      current: current?.emotion || 'neutral',
      timeline: Array.isArray(timeline) ? timeline.slice(-10) : [],
      trend: this._calculateEmotionTrend(timeline),
      volatility: this._calculateVolatility(timeline),
      escalation: this._detectEscalation(timeline),
      confidence: current?.confidence || 0,
    };
  }

  _buildRelationship(options) {
    const profile = options.relationshipProfile || {};
    const messages = profile.messages || [];

    return {
      type: profile.type || 'unknown',
      score: profile.score || 0,
      confidence: profile.confidence || (messages.length > 0 ? Math.min(0.5, messages.length / 100) * 0.5 : 0),
      duration: profile.duration || profile.messageCount || 0,
    };
  }

  _buildTopic(options) {
    const evolution = options.topicEvolution || {};
    const topics = Array.isArray(evolution) ? evolution : (evolution.topics || []);

    return {
      current: Array.isArray(topics) && topics.length > 0 ? topics[0].topic || topics[0] : 'general',
      history: Array.isArray(topics) ? topics.slice(0, 10) : [],
      trend: options.topicTrend || 'stable',
      changeDetected: this._detectTopicChange(topics),
      confidence: Array.isArray(topics) && topics.length > 0 ? 0.7 : 0,
    };
  }

  _buildGoal(options) {
    const goal = options.conversationGoal || {};
    const goalSignals = goal.signals || [];

    return {
      primary: goal.primary || 'casual_chat',
      secondary: Array.isArray(goal.secondary) ? goal.secondary : [],
      confidence: goal.confidence || 0.3,
      signals: Array.isArray(goalSignals) ? goalSignals.slice(0, 5) : [],
    };
  }

  _buildUser(options) {
    const dna = options.conversationDNA || {};
    const writingStyle = dna.writingStyle || {};
    const pref = dna.contentPreferences || {};
    const behavior = dna.behavioralPatterns || {};

    return {
      dna: {
        writingStyle: {
          avgMessageLength: writingStyle.avgMessageLength || 0,
          formalScore: writingStyle.formalScore || 0,
          casualScore: writingStyle.casualScore || 0,
          humorScore: writingStyle.humorScore || 0,
          positivityScore: writingStyle.positivityScore || 0,
          emojiFrequency: writingStyle.emojiFrequency || 0,
        },
        topEmojis: (pref.topEmojis || []).slice(0, 5).map(e => e.emoji || e),
        activeHour: behavior.activeHours ? new Date().getHours() : null,
        rhythm: behavior.conversationRhythm || null,
        confidence: Math.min(1, (dna.metadata?.totalMessages || 0) / 20),
      },
      preferences: {
        topTopics: (pref.favoriteTopics || []).slice(0, 3).map(t => t.value || t),
        language: dna.language?.primary || 'en',
      },
    };
  }

  _buildTime(options) {
    const time = options.currentTime || {};

    return {
      partOfDay: time.partOfDay || null,
      dayType: time.dayType || null,
      season: time.season || null,
      festival: time.festival || null,
      hour: time.hour ?? new Date().getHours(),
    };
  }

  _buildMemory(options) {
    const memory = options.memory || {};
    const memories = Array.isArray(memory) ? memory : (memory.memories || []);

    return {
      relevantMemories: Array.isArray(memories) ? memories.slice(0, 5) : [],
      importantFacts: memory.importantFacts || [],
      pendingQuestions: memory.pendingQuestions || [],
    };
  }

  _buildRecommendations(options) {
    const suggestions = options.previousSuggestions || [];
    const acceptanceRate = options.acceptanceRate ?? 0.5;

    return {
      previousSuggestions: Array.isArray(suggestions) ? suggestions.slice(-10) : [],
      acceptanceRate: Math.max(0, Math.min(1, acceptanceRate)),
      freshness: Array.isArray(suggestions) && suggestions.length > 0 ? 1.0 : 0,
    };
  }

  _calculateEmotionTrend(timeline) {
    if (!Array.isArray(timeline) || timeline.length < 3) return 'stable';
    const recent = timeline.slice(-5);
    const weights = recent.map(e => e.weight || 4);
    const slope = weights[weights.length - 1] - weights[0];
    const variance = Math.sqrt(weights.reduce((s, w, i) => s + (w - (weights.reduce((a, b) => a + b) / weights.length)) ** 2, 0) / weights.length);
    if (slope > 3 && variance < 3) return 'improving';
    if (slope < -3 && variance < 3) return 'declining';
    if (variance > 4) return 'volatile';
    return 'stable';
  }

  _calculateVolatility(timeline) {
    if (!Array.isArray(timeline) || timeline.length < 3) return 0;
    const recent = timeline.slice(-5);
    let changes = 0;
    for (let i = 1; i < recent.length; i++) {
      if (Math.abs((recent[i].weight || 4) - (recent[i - 1].weight || 4)) > 3) changes++;
    }
    return changes / Math.min(recent.length, 5);
  }

  _detectEscalation(timeline) {
    if (!Array.isArray(timeline) || timeline.length < 2) return false;
    const recent = timeline.slice(-3);
    for (let i = 1; i < recent.length; i++) {
      if ((recent[i].weight || 4) - (recent[i - 1].weight || 4) > 5) return true;
    }
    return false;
  }

  _detectTopicChange(topics) {
    if (!Array.isArray(topics) || topics.length < 2) return false;
    const sorted = [...topics].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    if (sorted.length >= 2) {
      const latest = sorted[0];
      const prev = sorted[1];
      const latestName = latest.topic || latest;
      const prevName = prev.topic || prev;
      if (latestName !== prevName) return { from: prevName, to: latestName };
    }
    return false;
  }

  _emotionBoost(emotion, suggestionType) {
    if (!emotion?.current) return 1.0;

    const boostMap = {
      joyful: { emoji: 1.5, sticker: 1.4, shayari: 1.2, song: 1.5, reply: 1.1 },
      romantic: { emoji: 1.4, shayari: 1.8, song: 1.7, sticker: 1.3, reply: 1.2 },
      sad: { shayari: 1.6, sticker: 1.3, reply: 1.5, emoji: 0.8, song: 1.4 },
      angry: { reply: 1.4, sticker: 0.7, shayari: 1.2, emoji: 0.6, song: 1.0 },
      neutral: { emoji: 1.0, sticker: 1.0, shayari: 1.0, song: 1.0, reply: 1.0 },
    };

    const boosts = boostMap[emotion.current] || boostMap.neutral;
    return boosts[suggestionType] || 1.0;
  }

  _relationshipBoost(relationship, suggestionType) {
    if (!relationship?.type || relationship.type === 'unknown') return 1.0;

    const boostMap = {
      romantic: { emoji: 1.3, shayari: 1.6, song: 1.5, sticker: 1.3, reply: 1.1 },
      best_friend: { emoji: 1.2, shayari: 1.3, song: 1.2, sticker: 1.4, reply: 1.3 },
      spouse: { emoji: 1.3, shayari: 1.5, song: 1.4, sticker: 1.3, reply: 1.2 },
      family: { emoji: 1.2, shayari: 1.2, song: 1.1, sticker: 1.3, reply: 1.1 },
      friend: { emoji: 1.1, shayari: 1.1, song: 1.0, sticker: 1.2, reply: 1.1 },
      boss: { emoji: 0.7, shayari: 0.5, song: 0.4, sticker: 0.5, reply: 1.3 },
      colleague: { emoji: 0.8, shayari: 0.6, song: 0.5, sticker: 0.7, reply: 1.2 },
      teacher: { emoji: 0.7, shayari: 0.6, song: 0.5, sticker: 0.5, reply: 1.3 },
    };

    const boosts = boostMap[relationship.type] || { emoji: 1.0, shayari: 1.0, song: 1.0, sticker: 1.0, reply: 1.0 };
    return boosts[suggestionType] || 1.0;
  }

  _topicBoost(topic, suggestionType) {
    if (!topic?.current) return 1.0;

    const boostMap = {
      music: { song: 2.0, emoji: 1.1, shayari: 1.0, reply: 0.9 },
      movies: { sticker: 1.2, emoji: 1.2, song: 1.1, reply: 1.1 },
      celebration: { emoji: 1.6, sticker: 1.5, song: 1.4, shayari: 1.2 },
      relationships: { shayari: 1.5, song: 1.3, emoji: 1.2, sticker: 1.2 },
      sports: { emoji: 1.3, sticker: 1.2, reply: 1.1, song: 0.8 },
      technology: { reply: 1.3, emoji: 0.8, sticker: 0.7, song: 0.5 },
      food: { emoji: 1.4, sticker: 1.3, reply: 1.0 },
      travel: { emoji: 1.3, sticker: 1.2, reply: 1.1, shayari: 0.9 },
    };

    const boosts = boostMap[topic.current] || { reply: 1.1, emoji: 1.0, sticker: 1.0, shayari: 1.0, song: 1.0 };
    return boosts[suggestionType] || 1.0;
  }

  _goalBoost(goal, suggestionType) {
    if (!goal?.primary) return 1.0;

    const influenceMap = {
      planning: { boost: ['emoji', 'reply'], suppress: [] },
      learning: { boost: ['reply', 'shayari'], suppress: ['song'] },
      dating: { boost: ['song', 'sticker', 'emoji'], suppress: [] },
      job_interview: { boost: ['reply'], suppress: ['song', 'sticker'] },
      birthday: { boost: ['emoji', 'song', 'sticker'], suppress: [] },
      travel: { boost: ['emoji', 'sticker'], suppress: [] },
      support: { boost: ['shayari', 'sticker', 'reply'], suppress: ['song'] },
      shopping: { boost: ['emoji', 'sticker'], suppress: ['shayari'] },
      coding: { boost: ['reply'], suppress: ['shayari', 'sticker'] },
      entertainment: { boost: ['emoji', 'song', 'sticker'], suppress: ['reply'] },
      problem_solving: { boost: ['reply'], suppress: ['sticker'] },
      decision_making: { boost: ['reply'], suppress: [] },
      casual_chat: { boost: ['emoji', 'sticker'], suppress: ['shayari'] },
      deep_conversation: { boost: ['shayari', 'reply'], suppress: ['sticker'] },
      apology: { boost: ['shayari', 'sticker'], suppress: ['song'] },
      confession: { boost: ['reply', 'shayari'], suppress: ['sticker'] },
      gossip: { boost: ['sticker', 'emoji'], suppress: ['reply', 'shayari'] },
      venting: { boost: ['shayari', 'reply'], suppress: ['song'] },
      motivation: { boost: ['shayari', 'song'], suppress: [] },
      negotiation: { boost: ['reply'], suppress: ['song', 'sticker'] },
    };

    const influences = influenceMap[goal.primary] || { boost: [], suppress: [] };
    let boost = 1.0;

    if (influences.boost.includes(suggestionType)) boost *= 1.4;
    if (influences.suppress.includes(suggestionType)) boost *= 0.6;

    return boost;
  }

  _timeBoost(time, suggestionType) {
    if (!time?.partOfDay) return 1.0;

    const boostMap = {
      morning: { greeting: 2.0, motivational: 1.5, casual: 1.2 },
      afternoon: { casual: 1.5, productive: 1.8, conversational: 1.3 },
      evening: { relaxing: 1.8, entertainment: 1.6, social: 1.4 },
      night: { calm: 1.8, romantic: 2.0, deep: 1.6 },
      dawn: { peaceful: 2.0, quiet: 1.8, reflective: 1.6 },
    };

    const boosts = boostMap[time.partOfDay] || {};
    const exact = boosts[suggestionType];
    if (exact) return exact;

    for (const [key, value] of Object.entries(boosts)) {
      const st = suggestionType.toLowerCase().replace(/[_-]/g, '');
      const k = key.toLowerCase().replace(/[_-]/g, '');
      if (st.includes(k) || k.includes(st)) return value;
    }

    return time.festival ? 1.3 : 1.0;
  }
}

function contextSignalConfidences(perSignal) {
  return perSignal;
}

module.exports = new ContextEngine();