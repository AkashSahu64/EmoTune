const analyzer = require('./conversationAnalyzer');
const relationshipEngine = require('./relationshipEngine');
const emotionTimeline = require('./emotionTimeline');
const topicEvolution = require('./topicEvolution');
const conversationState = require('./conversationState');
const conversationMomentum = require('./conversationMomentum');
const snapshotMemory = require('./snapshotMemory');
const futurePrediction = require('./futurePrediction');
const recommendationEngine = require('./recommendationEngine');
const vectorMemory = require('./vectorMemory');
const backgroundWorker = require('./backgroundWorker');
const cache = require('../core/cacheService');
const { logger } = require('../core/logger');

class ConversationIntelligenceLayer {
  constructor() {
    this.conversations = new Map();
    this._initWorker();
  }

  _initWorker() {
    backgroundWorker.register(backgroundWorker.QUEUES.ANALYSIS, async (task) => {
      return this._runAnalysis(task);
    });
    backgroundWorker.register(backgroundWorker.QUEUES.SNAPSHOT, async (task) => {
      return this._createSnapshot(task);
    });
    backgroundWorker.register(backgroundWorker.QUEUES.EMBEDDING, async (task) => {
      return vectorMemory.store(task.key, task.data, task.metadata);
    });
    backgroundWorker.register(backgroundWorker.QUEUES.MEMORY, async (task) => {
      return { processed: true, task };
    });
    backgroundWorker.register(backgroundWorker.QUEUES.PREDICTION, async (task) => {
      return futurePrediction.predict(task.messages, task.analysis);
    });
  }

  async initialize(chatId, existingData = {}) {
    if (!this.conversations.has(chatId)) {
      const conv = {
        messages: existingData.messages || [],
        emotionTimeline: existingData.emotionTimeline || [],
        topics: existingData.topics || [],
        currentState: existingData.currentState || 'greeting',
        relationshipType: existingData.relationshipType || 'unknown',
        relationshipScore: existingData.relationshipScore || 0,
        snapshots: existingData.snapshots || [],
        preferences: existingData.preferences || {},
        lastAnalysis: null,
        messageCount: existingData.messageCount || 0,
        conversationStart: existingData.conversationStart || Date.now(),
      };
      this.conversations.set(chatId, conv);
      logger.info(`CIL initialized for ${chatId}`);
    }
    return this.conversations.get(chatId);
  }

  async analyze(chatId, message, options = {}) {
    const conv = this.conversations.get(chatId);
    if (!conv) throw new Error(`Conversation ${chatId} not initialized`);

    conv.messages.push(message);
    conv.messageCount++;

    const cacheKey = `cil:analysis:${chatId}:${message._id || conv.messageCount}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      conv.lastAnalysis = cached;
      return cached;
    }

    const startTime = Date.now();
    const analysis = await this._runAnalysis({
      messages: conv.messages,
      existingTimeline: conv.emotionTimeline,
      existingTopics: conv.topics,
      currentState: conv.currentState,
      existingRelationship: conv.relationshipType,
      preferences: conv.preferences,
      messageIndex: conv.messageCount,
      existingSnapshots: conv.snapshots,
      useAI: options.useAI,
    });

    conv.emotionTimeline = analysis.emotionTimeline;
    conv.topics = analysis.topics;
    conv.currentState = analysis.conversationState;
    conv.relationshipType = analysis.relationshipType;
    conv.relationshipScore = analysis.relationshipScore;
    conv.lastAnalysis = analysis;

    if (analysis.snapshots) conv.snapshots = analysis.snapshots;

    if (analysis.newSnapshot) {
      conv.snapshots.push(analysis.newSnapshot);
      if (conv.snapshots.length > 20) conv.snapshots.splice(0, conv.snapshots.length - 20);
      backgroundWorker.enqueue(backgroundWorker.QUEUES.EMBEDDING, {
        key: `snapshot:${chatId}:${conv.messageCount}`,
        data: analysis.newSnapshot.summary,
        metadata: { chatId, type: 'snapshot', messageCount: conv.messageCount },
      });
    }

    backgroundWorker.enqueue(backgroundWorker.QUEUES.MEMORY, {
      chatId, analysis, messageCount: conv.messageCount,
    });

    await cache.set(cacheKey, analysis, 300);

    logger.info(`CIL analysis for ${chatId}`, {
      emotion: analysis.currentEmotion.emotion,
      state: analysis.conversationState,
      topic: analysis.currentTopic,
      relationship: analysis.relationshipType,
      time: Date.now() - startTime,
      messageCount: conv.messageCount,
    });

    return analysis;
  }

  async _runAnalysis({ messages, existingTimeline, existingTopics, currentState, existingRelationship, preferences, messageIndex, existingSnapshots, useAI }) {
    return analyzer.analyze(messages, {
      existingTimeline, existingTopics, currentState, existingRelationship, preferences, messageIndex, existingSnapshots, useAI,
    });
  }

  async getRecommendations(chatId, preferences = {}) {
    const conv = this.conversations.get(chatId);
    if (!conv) return { error: 'No conversation data' };

    if (!conv.lastAnalysis && conv.messages.length > 0) {
      conv.lastAnalysis = await this._runAnalysis({
        messages: conv.messages,
        existingTimeline: conv.emotionTimeline,
        existingTopics: conv.topics,
        currentState: conv.currentState,
        existingRelationship: conv.relationshipType,
        preferences: conv.preferences,
        messageIndex: conv.messageCount,
        existingSnapshots: conv.snapshots,
        useAI: false,
      });
      conv.emotionTimeline = conv.lastAnalysis.emotionTimeline;
      conv.topics = conv.lastAnalysis.topics;
      conv.currentState = conv.lastAnalysis.conversationState;
      conv.relationshipType = conv.lastAnalysis.relationshipType;
      conv.relationshipScore = conv.lastAnalysis.relationshipScore;
    }

    const cacheKey = `cil:recs:${chatId}:${conv.messageCount}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const analysis = {
      currentEmotion: conv.lastAnalysis?.currentEmotion || { emotion: 'neutral', confidence: 0.5 },
      emotionTimeline: conv.emotionTimeline,
      topics: conv.topics,
      conversationState: conv.currentState,
      relationshipType: conv.relationshipType,
      relationshipScore: conv.relationshipScore || 0,
      momentum: conv.lastAnalysis?.momentum || {},
      predictions: conv.lastAnalysis?.predictions,
    };

    const recs = recommendationEngine.getRecommendations(analysis, {
      ...preferences,
      chatId,
    });

    await cache.set(cacheKey, recs, 60);
    return recs;
  }

  async getPredictions(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv?.messages.length) return { error: 'No messages' };
    return futurePrediction.predict(conv.messages, conv.lastAnalysis || {});
  }

  async getContext(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return {
      conversation: {
        messageCount: conv.messageCount,
        startTime: conv.conversationStart,
        duration: Date.now() - conv.conversationStart,
      },
      emotion: {
        current: conv.lastAnalysis?.currentEmotion,
        trend: conv.lastAnalysis?.emotionTrend,
        dominant: conv.lastAnalysis?.dominantEmotion,
        volatility: conv.lastAnalysis?.emotionVolatility,
      },
      state: {
        current: conv.currentState,
        previous: conv.lastAnalysis?.previousState,
        significant: conv.lastAnalysis?.stateSignificant,
      },
      relationship: {
        type: conv.relationshipType,
        score: conv.relationshipScore,
        confidence: conv.lastAnalysis?.relationshipConfidence,
      },
      topic: {
        current: conv.lastAnalysis?.currentTopic,
        trend: conv.lastAnalysis?.topicTrend,
        history: topicEvolution.getTopicHistory(conv.topics),
      },
      momentum: conv.lastAnalysis?.momentum,
      predictions: conv.lastAnalysis?.predictions,
      snapshotCount: conv.snapshots.length,
      snapshotContext: conv.snapshots.length > 0
        ? snapshotMemory.compressForPrompt(conv.snapshots, 3)
        : null,
    };
  }

  getConversationState(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return {
      currentState: conv.currentState,
      previousState: conv.lastAnalysis?.previousState,
      stateTransition: conv.lastAnalysis?.stateTransition,
      isSignificant: conv.lastAnalysis?.stateSignificant,
      stateDescription: conversationState.getStateDescription(conv.currentState),
      suggestedActions: conversationState.suggestNextActions(conv.currentState),
    };
  }

  getEmotionProfile(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return {
      current: emotionTimeline.getCurrentEmotion(conv.emotionTimeline),
      timeline: emotionTimeline.getEmotionProgression(conv.emotionTimeline),
      trend: emotionTimeline.getTrend(conv.emotionTimeline),
      dominant: emotionTimeline.getDominantEmotion(conv.emotionTimeline),
      volatility: emotionTimeline.getEmotionVolatility(conv.emotionTimeline),
      isEscalating: emotionTimeline.detectEscalation(conv.emotionTimeline),
      isDeescalating: emotionTimeline.detectDeescalation(conv.emotionTimeline),
    };
  }

  getRelationshipProfile(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return relationshipEngine.detect({
      messages: conv.messages,
      emotionTimeline: conv.emotionTimeline,
      topics: conv.topics,
      preferences: conv.preferences,
    });
  }

  getTopicProfile(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return {
      current: topicEvolution.getCurrentTopic(conv.topics),
      history: topicEvolution.getTopicHistory(conv.topics),
      trend: topicEvolution.getTopicTrend(conv.topics),
      change: topicEvolution.detectTopicChange(conv.topics),
    };
  }

  getMomentum(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return conversationMomentum.calculate(conv.messages);
  }

  getSnapshotContext(chatId, count = 3) {
    const conv = this.conversations.get(chatId);
    if (!conv?.snapshots.length) return null;
    return snapshotMemory.getContext(conv.snapshots, count);
  }

  getCompressedPrompt(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return '';
    const parts = [];
    if (conv.snapshots.length > 0) {
      parts.push('=== CONVERSATION HISTORY ===');
      parts.push(snapshotMemory.compressForPrompt(conv.snapshots, 5));
    }
    if (conv.lastAnalysis) {
      parts.push(`Current context: ${conv.currentState} conversation about ${conv.lastAnalysis.currentTopic || 'general topics'}`);
      parts.push(`Mood: ${conv.lastAnalysis.currentEmotion?.emotion || 'neutral'} (trend: ${conv.lastAnalysis.emotionTrend || 'stable'})`);
      parts.push(`Relationship: ${conv.relationshipType} (score: ${conv.relationshipScore})`);
    }
    return parts.join('\n');
  }

  async getVectorSearch(chatId, query, limit = 5) {
    return vectorMemory.search(query, limit);
  }

  getWorkerStats() {
    return backgroundWorker.getStats();
  }

  getConversationIds() {
    return Array.from(this.conversations.keys());
  }

  getConversationStats(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return null;
    return {
      messageCount: conv.messageCount,
      timeline: conv.emotionTimeline.length,
      topics: conv.topics.length,
      snapshots: conv.snapshots.length,
      memorySize: conv.messages.filter(m => m.text).reduce((s, m) => s + (m.text || '').length, 0),
      duration: Date.now() - conv.conversationStart,
      avgMessageLength: conv.messages.length > 0
        ? Math.round(conv.messages.filter(m => m.text).reduce((s, m) => s + (m.text || '').length, 0) / conv.messages.length)
        : 0,
    };
  }

  removeConversation(chatId) {
    this.conversations.delete(chatId);
  }

  async clearCache() {
    this.conversations.clear();
    await vectorMemory.forgetBefore(Infinity);
  }
}

const cil = new ConversationIntelligenceLayer();

module.exports = cil;
