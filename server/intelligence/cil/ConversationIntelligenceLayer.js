const emotionPipeline = require('../../core/emotionPipeline');
const conversationAnalyzer = require('../conversationAnalyzer');
const conversationState = require('../conversationState');
const topicEvolution = require('../topicEvolution');
const relationshipEngine = require('../relationshipEngine');
const conversationMomentum = require('../conversationMomentum');
const snapshotMemory = require('../snapshotMemory');
const futurePrediction = require('../futurePrediction');
const recommendationEngine = require('../recommendationEngine');
const dnaEngine = require('../conversationDNAEngine');
const GoalDetectionEngine = require('../goalDetectionEngine');
const FuturePredictionEngine = require('../futurePredictionEngine');
const ConversationHealthEngine = require('../conversationHealthEngine');
const cacheService = require('../../core/cacheService');
const backgroundWorker = require('../backgroundWorker');
const { logger } = require('../../core/logger');
const explainableAI = require('../explainableAI');
const timeIntelligence = require('../timeIntelligence');
const contextEngine = require('../contextEngine');

const EMOTION_EMOJI_MAP = {
  happy: '😊', sad: '😢', angry: '😡', love: '😍', fearful: '😨',
  surprised: '😮', neutral: '💬', joyful: '🎉', excited: '🔥',
  grateful: '🙏', loved: '💕', romantic: '💕', flirty: '😉',
  anxious: '😰', worried: '😟', hopeful: '🤞', lonely: '💔',
  hurt: '💔', guilty: '😔', apologetic: '🥺', bored: '😐',
  annoyed: '😒', frustrated: '😤', disappointed: '😞',
};

const EMOTION_WEIGHTS = {
  joyful: 10, excited: 9, loved: 9, grateful: 8,
  happy: 7, hopeful: 6, romantic: 6, flirty: 5,
  neutral: 4, confused: 3, surprised: 3,
  anxious: 2, worried: 2, bored: 2,
  sad: 1, disappointed: 1, lonely: 1,
  angry: 0, frustrated: 0, annoyed: 0,
  hurt: -1, guilty: -2,
};

const CHAT_TYPES = ['direct', 'group', 'community', 'channel', 'broadcast', 'temp', 'secret', 'ai_chat', 'ghost'];
const HOT_CACHE_TTL = 60000;
const MAX_HOT_CACHE_SIZE = 10000;
const MAX_STORED_MESSAGES = 200;
const SNAPSHOT_INTERVAL = 10;
const AI_CONFIDENCE_THRESHOLD = 0.7;
const CACHE_CONFIDENCE_THRESHOLD = 0.9;

class ConversationIntelligenceLayer {
  constructor() {
    this._hotCache = new Map();
    this._stateCache = new Map();
    this._analysisCache = new Map();
    this._predictionEngine = new FuturePredictionEngine();
    this._healthEngine = new ConversationHealthEngine();
    this._eventEmitter = null;

    this._initWorker();
    this._startCacheEviction();
    logger.info('CIL v2 initialized with Redis-backed state and in-memory hot cache');
  }

  _initWorker() {
    backgroundWorker.register(backgroundWorker.QUEUES.ANALYSIS, async (task) => {
      const { chatId, message, context, analysis, emotionResult } = task;
      const aiStart = Date.now();
      try {
        const aiResult = await emotionPipeline.analyzeEmotion([message.text || message.content || message], { forceAI: true });
        const updatedAnalysis = {
          ...analysis,
          emotion: {
            ...analysis.emotion,
            primary: {
              emotion: aiResult.emotion || analysis.emotion.primary.emotion,
              confidence: 0.85,
              source: 'ai',
            },
            emoji: aiResult.emoji || analysis.emotion.emoji,
          },
        };
        await this.storeAnalysis(chatId, updatedAnalysis);
        this._emitAnalysisEvent(chatId, updatedAnalysis, 'ai');
        logger.info(`CIL AI analysis complete for ${chatId}`, { time: Date.now() - aiStart });
        return updatedAnalysis;
      } catch (err) {
        logger.error(`CIL AI analysis failed for ${chatId}`, { error: err.message });
        return analysis;
      }
    });

    backgroundWorker.register(backgroundWorker.QUEUES.SNAPSHOT, async (task) => {
      const { chatId, messages, analysis, messageCount } = task;
      if (!snapshotMemory.shouldSnapshot(messageCount)) return null;
      const snapshot = snapshotMemory.createSnapshot({ messages, analysis });
      const state = this._getStateSync(chatId);
      if (state) {
        state.snapshots.push(snapshot);
        if (state.snapshots.length > 20) state.snapshots.splice(0, state.snapshots.length - 20);
        this._setStateSync(chatId, state);
      }
      backgroundWorker.enqueue(backgroundWorker.QUEUES.EMBEDDING, {
        key: `snapshot:${chatId}:${messageCount}`,
        data: snapshot.summary,
        metadata: { chatId, type: 'snapshot', messageCount },
      });
      return snapshot;
    });

    backgroundWorker.register(backgroundWorker.QUEUES.EMBEDDING, async (task) => {
      return { processed: true, key: task.key };
    });

    backgroundWorker.register(backgroundWorker.QUEUES.MEMORY, async (task) => {
      return { processed: true, chatId: task.chatId };
    });

    backgroundWorker.register(backgroundWorker.QUEUES.PREDICTION, async (task) => {
      const { messages, analysis, context } = task;
      return this._predictionEngine.predict(messages, {
        currentEmotion: analysis.emotion?.primary || { emotion: 'neutral', confidence: 0.5 },
        emotionTimeline: analysis.emotion?.timeline || [],
        conversationState: analysis.state?.current || 'small_talk',
        momentum: analysis.momentum || {},
        relationshipType: analysis.relationship?.type || 'unknown',
        topics: analysis.topic?.all || [],
        topicHistory: analysis.topic?.history || [],
      });
    });

    backgroundWorker.register(backgroundWorker.QUEUES.ANALYTICS, async (task) => {
      return { processed: true, chatId: task.chatId };
    });
  }

  _startCacheEviction() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this._hotCache) {
        if (now - entry.timestamp > HOT_CACHE_TTL) this._hotCache.delete(key);
      }
      for (const [key, entry] of this._stateCache) {
        if (now - entry.timestamp > HOT_CACHE_TTL * 2) this._stateCache.delete(key);
      }
      for (const [key, entry] of this._analysisCache) {
        if (now - entry.timestamp > HOT_CACHE_TTL) this._analysisCache.delete(key);
      }
      if (this._hotCache.size > MAX_HOT_CACHE_SIZE) {
        const entries = [...this._hotCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        for (const [key] of entries.slice(0, entries.length - MAX_HOT_CACHE_SIZE)) {
          this._hotCache.delete(key);
        }
      }
    }, 30000);
  }

  processMessage(message, context) {
    const startTime = Date.now();
    const stageTimes = { ruleTime: 0, cacheTime: 0, aiTime: 0 };

    const chatId = context.chatId;
    const userId = context.userId;
    const chatType = this._validateChatType(context.chatType || 'direct');
    const participants = context.participants || [];

    const messageId = message._id || message.id || `${chatId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const messageText = (typeof message === 'string' ? message : (message.text || message.content || '')).trim();
    const timestamp = message.timestamp || message.createdAt || new Date();

    if (!chatId) {
      const err = new Error('CIL: chatId is required in context');
      logger.error(err.message);
      throw err;
    }

    const state = this._getOrCreateState(chatId);

    // 1. Rule Engine (sync, ~2ms)
    const ruleStart = Date.now();

    const emotionRule = emotionPipeline.classifyByRule([messageText]);

    const stateUpdate = conversationState.updateState(state.currentState, { text: messageText });

    const extractedTopics = topicEvolution.extractTopics(messageText);

    const momentum = conversationMomentum.calculate(state.messages);

    const goalDetected = GoalDetectionEngine.detectGoalFromMessage(message);

    stageTimes.ruleTime = Date.now() - ruleStart;

    // 2. Cache Check (sync, ~1ms)
    const cacheStart = Date.now();
    const cacheKey = `cil:analysis:${chatId}:${this._normalizeText(messageText)}`;
    const cached = this._getCached(cacheKey);
    if (cached && this._isCacheValid(cached, context)) {
      stageTimes.cacheTime = Date.now() - cacheStart;
      return {
        ...cached,
        performance: {
          ruleTime: stageTimes.ruleTime,
          cacheTime: stageTimes.cacheTime,
          aiTime: 0,
          totalTime: Date.now() - startTime,
          stages: [
            { name: 'rule', time: stageTimes.ruleTime, source: 'rule' },
            { name: 'cache', time: stageTimes.cacheTime, source: 'cache' },
          ],
        },
      };
    }
    stageTimes.cacheTime = Date.now() - cacheStart;

    // 3. Build AnalysisResult
    const analysis = this._buildAnalysisResult(
      messageId, chatId, chatType, messageText, timestamp, participants,
      emotionRule, stateUpdate, extractedTopics, momentum, goalDetected,
      state, context
    );

    // 4. Update conversation state (sync)
    this._updateConversationState(state, message, messageId, messageText, timestamp, emotionRule, extractedTopics, stateUpdate, analysis);

    // 5. Enqueue background work (process.nextTick)
    process.nextTick(() => {
      this._enqueueBackgroundWork(chatId, userId, message, context, analysis, emotionRule, state);
    });

    // 6. Cache the analysis
    this._setCached(cacheKey, analysis);
    this._analysisCache.set(chatId, { value: analysis, timestamp: Date.now() });

    analysis.performance.totalTime = Date.now() - startTime;
    analysis.performance.stages.push({
      name: 'total',
      time: Date.now() - startTime,
      source: 'rule',
    });

    logger.debug(`CIL processMessage ${chatId}`, {
      emotion: analysis.emotion.primary.emotion,
      state: analysis.state.current,
      topic: analysis.topic.primary,
      time: analysis.performance.totalTime,
    });

    return analysis;
  }

  _buildAnalysisResult(messageId, chatId, chatType, messageText, timestamp, participants, emotionRule, stateUpdate, extractedTopics, momentum, goalDetected, state, context) {
    const primaryEmotion = emotionRule.emotion || 'neutral';
    const primaryConfidence = emotionRule.confidence || 0.5;
    const isDirectChat = chatType === 'direct';

    const topicsAll = extractedTopics.map((t, i) => ({
      topic: t.topic,
      score: t.score,
      isNew: this._isNewTopic(state.topics, t.topic),
    }));

    const topicHistory = topicEvolution.getTopicHistory(state.topics);

    const predictions = this._buildPredictions(messageText, state, primaryEmotion, momentum, stateUpdate.state, extractedTopics);

    const healthResult = this._healthEngine.analyze({
      messages: state.messages.map(m => ({ text: m.text })),
      emotionTimeline: state.emotionTimeline,
      conversationState: stateUpdate.state,
      momentum,
      participants,
    });

    const dnaProfile = this._buildDNAProfile(state, messageText);

    const isSnapshotTime = snapshotMemory.shouldSnapshot(state.messageCount + 1);
    const snapshotSummary = isSnapshotTime
      ? snapshotMemory._generateSummary(
          [...state.messages.slice(-SNAPSHOT_INTERVAL), { text: messageText }],
          { currentEmotion: { emotion: primaryEmotion }, currentTopic: extractedTopics[0]?.topic, conversationState: stateUpdate.state }
        )
      : null;

    const analysis = {
      messageId,
      chatId,
      processedAt: new Date(),
      processingTime: 0,

      emotion: {
        primary: { emotion: primaryEmotion, confidence: primaryConfidence, source: 'rule' },
        secondary: this._getSecondaryEmotions(state.emotionTimeline, primaryEmotion),
        emoji: emotionRule.emoji || EMOTION_EMOJI_MAP[primaryEmotion] || '💬',
        score: EMOTION_WEIGHTS[primaryEmotion] ?? 4,
        timeline: state.emotionTimeline.map(e => ({
          emotion: e.emotion,
          confidence: e.confidence,
          timestamp: e.timestamp,
          messageId: e.messageId,
        })),
        trend: this._calculateEmotionTrend(state.emotionTimeline, primaryEmotion),
        volatility: this._calculateVolatility(state.emotionTimeline),
        isEscalating: this._detectEscalation(state.emotionTimeline, primaryEmotion),
        dominance: this._getDominantEmotion(state.emotionTimeline),
      },

      topic: {
        primary: extractedTopics[0]?.topic || topicEvolution.getCurrentTopic(state.topics) || 'general',
        secondary: extractedTopics.slice(1).map(t => t.topic),
        all: topicsAll,
        history: topicHistory,
        trend: topicEvolution.getTopicTrend(state.topics),
        changeDetected: !!topicEvolution.detectTopicChange(state.topics),
        previousTopic: topicHistory.length > 1 ? topicHistory[0].topic : null,
      },

      state: {
        current: stateUpdate.state,
        previous: stateUpdate.previousState,
        isTransition: stateUpdate.isTransition,
        isSignificant: stateUpdate.isSignificant,
        description: conversationState.getStateDescription(stateUpdate.state),
        suggestedActions: conversationState.suggestNextActions(stateUpdate.state),
      },

      relationship: isDirectChat ? this._buildRelationship(state, messageText, context) : {
        type: 'group',
        score: 0,
        confidence: 0,
        progression: [],
        details: { messageCount: state.messageCount, sentiment: 'neutral', indicators: [] },
      },

      momentum: {
        velocity: momentum.velocity || 0,
        speed: momentum.speed || 'slow',
        trend: momentum.trend || 'steady',
        intensity: momentum.intensity || 'stable',
        pauseDetected: momentum.isPaused || false,
        pauseDuration: momentum.lastResponseTime || 0,
      },

      goal: {
        primary: goalDetected.primary || 'casual_chat',
        secondary: goalDetected.secondary || [],
        confidence: goalDetected.confidence || 0.3,
        signals: goalDetected.signals ? goalDetected.signals.map(s => s.signal || (typeof s === 'string' ? s : JSON.stringify(s))) : [],
      },

      dna: {
        updated: true,
        profile: dnaProfile,
      },

      snapshot: {
        created: isSnapshotTime,
        summary: snapshotSummary || '',
        type: isSnapshotTime ? 'milestone' : 'none',
      },

      predictions: {
        nextEmotion: predictions.nextEmotion || { emotion: 'neutral', confidence: 0.3 },
        nextState: predictions.nextState || { state: 'small_talk', confidence: 0.3 },
        nextTopic: predictions.nextTopic || { topic: 'general', probability: 0.5 },
        nextReply: predictions.nextReply || { suggestions: [], confidence: 0.3 },
        contentNeeds: predictions.contentNeeds || ['casual'],
        outcome: predictions.outcome || 'continue',
      },

      health: {
        score: healthResult.overallScore || 50,
        flags: (healthResult.risks || []).map(r => ({
          type: r.type,
          severity: r.severity || 'low',
          suggestion: r.suggestion || '',
        })),
      },

      performance: {
        ruleTime: 0,
        cacheTime: 0,
        aiTime: 0,
        totalTime: 0,
        stages: [
          { name: 'rule', time: 0, source: 'rule' },
          { name: 'cache', time: 0, source: 'cache' },
        ],
      },
    };

    return analysis;
  }

  _buildRelationship(state, messageText, context) {
    try {
      const profile = {
        messages: state.messages.map(m => ({ text: m.text, timestamp: m.timestamp })),
        emotionTimeline: state.emotionTimeline,
        topics: state.topics,
        preferences: state.preferences || {},
      };
      const relResult = relationshipEngine.detect(profile);
      return {
        type: relResult.type || 'unknown',
        score: relResult.score || 0,
        confidence: relResult.confidence || 0,
        progression: Array.isArray(relResult.progression) ? relResult.progression.map(p => ({
          type: p.type || p,
          score: p.score || 0,
          timestamp: p.timestamp || new Date(),
        })) : [{ type: relResult.type || 'unknown', score: relResult.score || 0, timestamp: new Date() }],
        details: {
          messageCount: state.messageCount,
          sentiment: this._calculateSentiment(state.emotionTimeline),
          indicators: relResult.details || {},
        },
      };
    } catch {
      return {
        type: 'unknown', score: 0, confidence: 0, progression: [], details: { messageCount: 0, sentiment: 'neutral', indicators: {} },
      };
    }
  }

  _buildPredictions(messageText, state, primaryEmotion, momentum, currentState, extractedTopics) {
    try {
      const predResult = this._predictionEngine.predict(state.messages, {
        currentEmotion: { emotion: primaryEmotion, confidence: 0.5 },
        emotionTimeline: state.emotionTimeline,
        conversationState: currentState,
        momentum,
        relationshipType: 'unknown',
        topics: extractedTopics,
        topicHistory: state.topics,
      });
      return {
        nextEmotion: predResult.nextEmotion || { emotion: 'neutral', confidence: 0.3 },
        nextState: predResult.nextState || { state: 'small_talk', confidence: 0.3 },
        nextTopic: predResult.nextTopic || { topic: extractedTopics[0]?.topic || 'general', probability: 0.5 },
        nextReply: predResult.nextReply || { suggestions: [], confidence: 0.3 },
        contentNeeds: [predResult.conversationIntent || predResult.nextContent || 'casual'],
        outcome: predResult.conversationOutcome?.likelyOutcome || predResult.momentumPrediction || 'continue',
      };
    } catch {
      return {
        nextEmotion: { emotion: 'neutral', confidence: 0.3 },
        nextState: { state: 'small_talk', confidence: 0.3 },
        nextTopic: { topic: 'general', probability: 0.5 },
        nextReply: { suggestions: [], confidence: 0.3 },
        contentNeeds: ['casual'],
        outcome: 'continue',
      };
    }
  }

  _buildDNAProfile(state, messageText) {
    return {
      avgMessageLength: this._movingAverage(state, 'avgMsgLen', messageText.length, 0.1),
      emojiDensity: this._movingAverage(state, 'emojiDensity', (messageText.match(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu) || []).length / Math.max(messageText.length, 1), 0.05),
      questionFrequency: this._movingAverage(state, 'questionFreq', messageText.includes('?') ? 1 : 0, 0.02),
      formality: this._computeFormality(messageText),
      messageCount: state.messageCount,
    };
  }

  _updateConversationState(state, message, messageId, messageText, timestamp, emotionRule, extractedTopics, stateUpdate, analysis) {
    state.messages.push({
      text: messageText,
      timestamp,
      messageId,
      userId: message.from || message.userId || message.author,
      messageType: message.type || 'text',
    });
    if (state.messages.length > MAX_STORED_MESSAGES) {
      state.messages.splice(0, state.messages.length - MAX_STORED_MESSAGES);
    }
    state.messageCount++;

    state.emotionTimeline.push({
      emotion: emotionRule.emotion || 'neutral',
      confidence: emotionRule.confidence || 0.5,
      weight: EMOTION_WEIGHTS[emotionRule.emotion] ?? 4,
      timestamp,
      messageId,
      messagePreview: messageText.slice(0, 60),
    });
    if (state.emotionTimeline.length > 50) {
      state.emotionTimeline.splice(0, state.emotionTimeline.length - 50);
    }

    const topicUpdate = topicEvolution.addMessage(state.topics, { text: messageText });
    state.topics = topicUpdate.topics;

    state.previousState = state.currentState;
    state.currentState = stateUpdate.state;

    state.lastAnalysis = analysis;
    state.lastActive = Date.now();
  }

  _enqueueBackgroundWork(chatId, userId, message, context, analysis, emotionResult, state) {
    const shouldUseAI = this.shouldUseAI(analysis.topic.primary, emotionResult.confidence);

    if (shouldUseAI === 'ai') {
      backgroundWorker.enqueue(backgroundWorker.QUEUES.ANALYSIS, {
        chatId,
        message,
        context,
        analysis,
        emotionResult,
        userId,
        enqueuedAt: Date.now(),
      });
    }

    const messageCount = state ? state.messageCount : (analysis.performance?.stages?.length || 0);
    if (snapshotMemory.shouldSnapshot(messageCount)) {
      backgroundWorker.enqueue(backgroundWorker.QUEUES.SNAPSHOT, {
        chatId,
        messages: state ? state.messages : [],
        analysis,
        messageCount,
      });
    }

    backgroundWorker.enqueue(backgroundWorker.QUEUES.PREDICTION, {
      chatId,
      messages: state ? state.messages : [],
      analysis,
      context,
    });

    backgroundWorker.enqueue(backgroundWorker.QUEUES.ANALYTICS, {
      chatId,
      userId,
      analysis,
      timestamp: Date.now(),
    });

    backgroundWorker.enqueue(backgroundWorker.QUEUES.MEMORY, {
      chatId,
      analysis,
      messageCount,
    });

    logger.debug(`CIL background work enqueued for ${chatId}`, {
      useAI: shouldUseAI === 'ai',
      snapshot: snapshotMemory.shouldSnapshot(messageCount),
    });
  }

  shouldUseAI(topic, confidence) {
    if (confidence > 0.8) return 'rule';
    return 'ai';
  }

  _isCacheValid(cached, context) {
    if (!cached) return false;
    const age = Date.now() - new Date(cached.processedAt).getTime();
    if (age > 30000) return false;
    const emotionConf = cached.emotion?.primary?.confidence || 0;
    return emotionConf > CACHE_CONFIDENCE_THRESHOLD;
  }

  // --- Public API Methods ---

  async getRecommendations(chatId, userId, context) {
    const state = this._getStateSync(chatId);
    const analysis = this._analysisCache.get(chatId)?.value || await this._loadAnalysis(chatId);

    const baseContext = {
      currentEmotion: analysis?.emotion?.primary || { emotion: 'neutral', confidence: 0.5 },
      emotionTimeline: analysis?.emotion?.timeline || [],
      conversationState: analysis?.state?.current || 'small_talk',
      relationshipType: analysis?.relationship?.type || 'unknown',
      relationshipScore: analysis?.relationship?.score || 0,
      momentum: analysis?.momentum || {},
      topics: analysis?.topic?.all || [],
      predictions: analysis?.predictions || {},
      chatId,
      userId,
      ...context,
    };

    const cacheKey = `cil:recs:${chatId}:${state?.messageCount || 0}`;
    const cachedRecs = await cacheService.get(cacheKey);
    if (cachedRecs) return cachedRecs;

    const recs = recommendationEngine.getRecommendations(baseContext, { chatId, userId, ...context });

    const explained = {
      ...recs,
      explanations: {},
      _meta: {
        generatedAt: new Date(),
        signalsUsed: ['emotion', 'state', 'relationship', 'topic', 'momentum'],
        confidence: analysis?.health?.score ? analysis.health.score / 100 : 0.5,
      },
    };

    for (const type of ['emoji', 'sticker', 'shayari', 'song', 'reply']) {
      if (recs[type]?.suggestions?.length > 0) {
        try {
          explained.explanations[type] = explainableAI.explainRecommendation(
            { type, value: recs[type].suggestions[0] },
            baseContext
          );
        } catch {}
      }
    }

    await cacheService.set(cacheKey, explained, 60);
    return explained;
  }

  getGroupIntelligence(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return { error: 'No data for this group' };

    const analysis = this._analysisCache.get(chatId)?.value;

    const participantActivity = {};
    for (const msg of state.messages) {
      const uid = msg.userId || 'unknown';
      if (!participantActivity[uid]) participantActivity[uid] = { count: 0, lastSeen: 0 };
      participantActivity[uid].count++;
      participantActivity[uid].lastSeen = Math.max(participantActivity[uid].lastSeen, new Date(msg.timestamp).getTime());
    }

    return {
      chatId,
      participantCount: Object.keys(participantActivity).length,
      messageCount: state.messageCount,
      activeParticipants: Object.entries(participantActivity)
        .map(([id, data]) => ({ userId: id, messageCount: data.count, lastActive: new Date(data.lastSeen) }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10),
      dominantEmotion: analysis?.emotion?.dominance || 'neutral',
      emotionDistribution: this._computeEmotionDistribution(state.emotionTimeline),
      topicDistribution: state.topics.slice(0, 10).map(t => ({ topic: t.topic, frequency: t.count || t.score })),
      currentState: state.currentState,
      momentum: analysis?.momentum || { speed: 'slow', velocity: 0 },
      health: analysis?.health || { score: 50, flags: [] },
      conversationStart: state.conversationStart,
      duration: Date.now() - state.conversationStart,
      snapshotCount: state.snapshots.length,
    };
  }

  getStorySuggestions(userId) {
    const allChats = [];
    for (const [chatId, entry] of this._stateCache) {
      const state = entry.value;
      if (!state || state.messageCount < 3) continue;
      const analysis = this._analysisCache.get(chatId)?.value;
      allChats.push({
        chatId,
        messageCount: state.messageCount,
        dominantEmotion: analysis?.emotion?.dominance || 'neutral',
        topTopic: analysis?.topic?.primary || 'general',
        relationshipType: analysis?.relationship?.type || 'unknown',
        relationshipScore: analysis?.relationship?.score || 0,
        lastActive: state.lastActive || 0,
        duration: state.lastActive ? Date.now() - state.lastActive : 0,
        significantEvents: state.snapshots.slice(-3).map(s => s.summary),
      });
    }

    allChats.sort((a, b) => b.messageCount - a.messageCount);

    const suggestions = [];
    for (const chat of allChats.slice(0, 5)) {
      if (chat.relationshipScore > 50 || chat.messageCount > 20) {
        suggestions.push({
          type: 'conversation_story',
          title: `A ${chat.relationshipType} journey through ${chat.topTopic}`,
          summary: `${chat.messageCount} messages of ${chat.dominantEmotion} conversation`,
          chatId: chat.chatId,
          confidence: Math.min(1, chat.messageCount / 100),
          highlights: chat.significantEvents.slice(0, 2),
        });
      }
    }

    const userState = this._getUserState(userId);

    if (userState && userState.totalMessages > 10) {
      suggestions.push({
        type: 'personal_growth',
        title: 'Your conversation journey',
        summary: `Over ${userState.totalMessages} messages across ${userState.chatCount} conversations`,
        confidence: 0.6,
      });
    }

    return {
      userId,
      suggestions: suggestions.slice(0, 10),
      generatedAt: new Date(),
      totalConversations: allChats.length,
    };
  }

  getContext(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;

    const analysis = this._analysisCache.get(chatId)?.value;

    return {
      conversation: {
        id: chatId,
        messageCount: state.messageCount,
        startTime: new Date(state.conversationStart),
        duration: Date.now() - state.conversationStart,
        currentState: state.currentState,
        previousState: state.previousState,
      },
      emotion: {
        current: analysis?.emotion?.primary || { emotion: 'neutral', confidence: 0 },
        timeline: analysis?.emotion?.timeline || [],
        trend: analysis?.emotion?.trend || 'stable',
        dominant: analysis?.emotion?.dominance || 'neutral',
        volatility: analysis?.emotion?.volatility || 0,
        isEscalating: analysis?.emotion?.isEscalating || false,
      },
      topic: {
        current: analysis?.topic?.primary || 'general',
        history: analysis?.topic?.history || [],
        trend: analysis?.topic?.trend || 'stable',
        changeDetected: analysis?.topic?.changeDetected || false,
        previousTopic: analysis?.topic?.previousTopic || null,
      },
      state: {
        current: state.currentState,
        previous: state.previousState,
        isTransition: analysis?.state?.isTransition || false,
        isSignificant: analysis?.state?.isSignificant || false,
        description: conversationState.getStateDescription(state.currentState),
        suggestedActions: conversationState.suggestNextActions(state.currentState),
      },
      relationship: analysis?.relationship || null,
      momentum: analysis?.momentum || {},
      goal: analysis?.goal || null,
      health: analysis?.health || null,
      predictions: analysis?.predictions || null,
      dna: analysis?.dna || null,
      snapshot: {
        count: state.snapshots.length,
        recent: state.snapshots.slice(-3).map(s => ({
          summary: s.summary,
          timestamp: s.timestamp,
          emotion: s.emotion?.current,
          topics: s.topics?.current,
        })),
        compressed: state.snapshots.length > 0
          ? snapshotMemory.compressForPrompt(state.snapshots, 3)
          : null,
      },
      performance: analysis?.performance || null,
      lastAnalyzed: analysis?.processedAt || null,
    };
  }

  async storeAnalysis(chatId, analysis) {
    this._analysisCache.set(chatId, { value: analysis, timestamp: Date.now() });
    const cacheKey = `cil:analysis:${chatId}`;
    await cacheService.set(cacheKey, analysis, 600);
  }

  async getAnalysis(chatId) {
    const cached = this._analysisCache.get(chatId);
    if (cached) return cached.value;
    return this._loadAnalysis(chatId);
  }

  async _loadAnalysis(chatId) {
    const cacheKey = `cil:analysis:${chatId}`;
    const stored = await cacheService.get(cacheKey);
    if (stored) {
      this._analysisCache.set(chatId, { value: stored, timestamp: Date.now() });
    }
    return stored || null;
  }

  // --- Backward Compatibility Methods ---

  async initialize(chatId, existingData = {}) {
    let state = this._getStateSync(chatId);
    if (!state) {
      state = {
        messages: existingData.messages || [],
        emotionTimeline: existingData.emotionTimeline || [],
        topics: existingData.topics || [],
        currentState: existingData.currentState || 'greeting',
        previousState: null,
        relationshipType: existingData.relationshipType || 'unknown',
        relationshipScore: existingData.relationshipScore || 0,
        snapshots: existingData.snapshots || [],
        preferences: existingData.preferences || {},
        lastAnalysis: null,
        messageCount: existingData.messageCount || (existingData.messages ? existingData.messages.length : 0),
        conversationStart: existingData.conversationStart || Date.now(),
        lastActive: Date.now(),
      };
      this._stateCache.set(chatId, { value: state, timestamp: Date.now() });
      logger.info(`CIL initialized for ${chatId}`);
    }
    return state;
  }

  async analyze(chatId, message, options = {}) {
    const context = {
      chatId,
      userId: options.userId || message.from || message.userId || 'unknown',
      chatType: options.chatType || 'direct',
      participants: options.participants || [],
    };
    const result = this.processMessage(message, context);
    return this._legacyFormat(result, chatId);
  }

  async getRecommendationsOld(chatId, preferences = {}) {
    const state = this._getStateSync(chatId);
    if (!state) return { error: 'No conversation data' };

    const analysis = this._analysisCache.get(chatId)?.value;

    if (!analysis && state.messages.length > 0) {
      return recommendationEngine.getRecommendations({
        currentEmotion: { emotion: 'neutral', confidence: 0.5 },
        emotionTimeline: state.emotionTimeline,
        topics: state.topics,
        conversationState: state.currentState,
        relationshipType: state.relationshipType,
        relationshipScore: state.relationshipScore,
        momentum: conversationMomentum.calculate(state.messages),
        predictions: {},
      }, { ...preferences, chatId });
    }

    const recContext = {
      currentEmotion: analysis?.emotion?.primary || { emotion: 'neutral', confidence: 0.5 },
      emotionTimeline: analysis?.emotion?.timeline || [],
      topics: analysis?.topic?.all || [],
      conversationState: analysis?.state?.current || state.currentState,
      relationshipType: analysis?.relationship?.type || state.relationshipType,
      relationshipScore: analysis?.relationship?.score || state.relationshipScore,
      momentum: analysis?.momentum || {},
      predictions: analysis?.predictions || {},
    };

    const cacheKey = `cil:recs:${chatId}:${state.messageCount}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const recs = recommendationEngine.getRecommendations(recContext, { ...preferences, chatId });
    await cacheService.set(cacheKey, recs, 60);
    return recs;
  }

  async getPredictions(chatId) {
    const state = this._getStateSync(chatId);
    if (!state || !state.messages.length) return { error: 'No messages' };

    const analysis = this._analysisCache.get(chatId)?.value || {};
    return futurePrediction.predict(state.messages, {
      currentEmotion: analysis.emotion?.primary || { emotion: 'neutral' },
      emotionTimeline: analysis.emotion?.timeline || state.emotionTimeline,
      conversationState: analysis.state?.current || state.currentState,
      momentum: analysis.momentum || {},
      relationshipType: analysis.relationship?.type || state.relationshipType,
      topics: analysis.topic?.all || state.topics,
    });
  }

  getConversationState(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;
    return {
      currentState: state.currentState,
      previousState: state.previousState,
      stateTransition: this._analysisCache.get(chatId)?.value?.state?.isTransition || false,
      isSignificant: this._analysisCache.get(chatId)?.value?.state?.isSignificant || false,
      stateDescription: conversationState.getStateDescription(state.currentState),
      suggestedActions: conversationState.suggestNextActions(state.currentState),
    };
  }

  getEmotionProfile(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;
    const timeline = state.emotionTimeline;
    return {
      current: timeline.length > 0 ? timeline[timeline.length - 1] : { emotion: 'neutral', confidence: 0, weight: 4 },
      timeline: timeline.map(e => ({ emotion: e.emotion, weight: e.weight, timestamp: e.timestamp })),
      trend: this._calculateEmotionTrend(timeline),
      dominant: this._getDominantEmotion(timeline),
      volatility: this._calculateVolatility(timeline),
      isEscalating: this._detectEscalation(timeline),
      isDeescalating: this._detectDeescalation(timeline),
    };
  }

  getRelationshipProfile(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;
    return relationshipEngine.detect({
      messages: state.messages,
      emotionTimeline: state.emotionTimeline,
      topics: state.topics,
      preferences: state.preferences,
    });
  }

  getTopicProfile(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;
    return {
      current: topicEvolution.getCurrentTopic(state.topics),
      history: topicEvolution.getTopicHistory(state.topics),
      trend: topicEvolution.getTopicTrend(state.topics),
      change: topicEvolution.detectTopicChange(state.topics),
    };
  }

  getMomentum(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;
    return conversationMomentum.calculate(state.messages);
  }

  getSnapshotContext(chatId, count = 3) {
    const state = this._getStateSync(chatId);
    if (!state?.snapshots.length) return null;
    return snapshotMemory.getContext(state.snapshots, count);
  }

  getCompressedPrompt(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return '';
    const analysis = this._analysisCache.get(chatId)?.value;
    const parts = [];
    if (state.snapshots.length > 0) {
      parts.push('=== CONVERSATION HISTORY ===');
      parts.push(snapshotMemory.compressForPrompt(state.snapshots, 5));
    }
    if (analysis) {
      parts.push(`Current context: ${analysis.state?.current || state.currentState} conversation about ${analysis.topic?.primary || 'general topics'}`);
      parts.push(`Mood: ${analysis.emotion?.primary?.emotion || 'neutral'} (trend: ${analysis.emotion?.trend || 'stable'})`);
      parts.push(`Relationship: ${analysis.relationship?.type || state.relationshipType} (score: ${analysis.relationship?.score || state.relationshipScore})`);
    }
    return parts.join('\n');
  }

  getWorkerStats() {
    return backgroundWorker.getStats();
  }

  getConversationIds() {
    return Array.from(this._stateCache.keys());
  }

  getConversationStats(chatId) {
    const state = this._getStateSync(chatId);
    if (!state) return null;
    return {
      messageCount: state.messageCount,
      timeline: state.emotionTimeline.length,
      topics: state.topics.length,
      snapshots: state.snapshots.length,
      memorySize: state.messages.reduce((s, m) => s + (m.text || '').length, 0),
      duration: Date.now() - state.conversationStart,
      avgMessageLength: state.messages.length > 0
        ? Math.round(state.messages.reduce((s, m) => s + (m.text || '').length, 0) / state.messages.length)
        : 0,
    };
  }

  removeConversation(chatId) {
    this._stateCache.delete(chatId);
    this._analysisCache.delete(chatId);
    for (const key of this._hotCache.keys()) {
      if (key.includes(chatId)) this._hotCache.delete(key);
    }
  }

  async clearCache() {
    this._hotCache.clear();
    this._stateCache.clear();
    this._analysisCache.clear();
  }

  // --- Internal Helpers ---

  _getOrCreateState(chatId) {
    const existing = this._getStateSync(chatId);
    if (existing) return existing;
    const state = {
      messages: [],
      emotionTimeline: [],
      topics: [],
      currentState: 'greeting',
      previousState: null,
      relationshipType: 'unknown',
      relationshipScore: 0,
      snapshots: [],
      preferences: {},
      lastAnalysis: null,
      messageCount: 0,
      conversationStart: Date.now(),
      lastActive: Date.now(),
      _movingAverages: {},
    };
    this._stateCache.set(chatId, { value: state, timestamp: Date.now() });
    return state;
  }

  _getStateSync(chatId) {
    const entry = this._stateCache.get(chatId);
    if (entry) {
      entry.timestamp = Date.now();
      return entry.value;
    }
    return null;
  }

  _setStateSync(chatId, state) {
    this._stateCache.set(chatId, { value: state, timestamp: Date.now() });
  }

  _getCached(key) {
    const entry = this._hotCache.get(key);
    if (entry && Date.now() - entry.timestamp < HOT_CACHE_TTL) {
      return entry.value;
    }
    if (entry) this._hotCache.delete(key);
    return null;
  }

  _setCached(key, value) {
    this._hotCache.set(key, { value, timestamp: Date.now() });
  }

  _cacheKey(chatId, text, context) {
    const normalized = this._normalizeText(text);
    return `cil:analysis:${chatId}:${normalized.slice(0, 50)}:${context.chatType || 'direct'}`;
  }

  _normalizeText(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  _validateChatType(type) {
    return CHAT_TYPES.includes(type) ? type : 'direct';
  }

  _isNewTopic(topics, topicName) {
    return !topics.some(t => t.topic === topicName);
  }

  _getSecondaryEmotions(timeline, primary) {
    if (!timeline.length) return [];
    const freq = {};
    for (const entry of timeline) {
      if (entry.emotion !== primary) {
        freq[entry.emotion] = (freq[entry.emotion] || 0) + (entry.confidence || 0.5);
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion, confidence]) => ({ emotion, confidence: Math.min(1, confidence / timeline.length) }));
  }

  _calculateEmotionTrend(timeline, currentEmotion) {
    if (!timeline?.length || timeline.length < 2) return 'stable';
    const recent = timeline.slice(-5);
    const weights = recent.map(e => e.weight || EMOTION_WEIGHTS[e.emotion] || 4);
    const slope = weights[weights.length - 1] - weights[0];
    if (slope > 3) return 'improving';
    if (slope < -3) return 'declining';
    const variance = weights.reduce((s, w) => s + Math.abs(w - (weights.reduce((a, b) => a + b) / weights.length)), 0) / weights.length;
    if (variance > 3) return 'volatile';
    return 'stable';
  }

  _calculateVolatility(timeline) {
    if (!timeline?.length || timeline.length < 3) return 0;
    const recent = timeline.slice(-5);
    let changes = 0;
    for (let i = 1; i < recent.length; i++) {
      const w1 = recent[i].weight || EMOTION_WEIGHTS[recent[i].emotion] || 4;
      const w2 = recent[i - 1].weight || EMOTION_WEIGHTS[recent[i - 1].emotion] || 4;
      if (Math.abs(w1 - w2) > 3) changes++;
    }
    return changes / Math.min(recent.length, 5);
  }

  _detectEscalation(timeline, currentEmotion) {
    if (!timeline?.length || timeline.length < 2) return false;
    const recent = timeline.slice(-3);
    for (let i = 1; i < recent.length; i++) {
      const w1 = recent[i].weight || EMOTION_WEIGHTS[recent[i].emotion] || 4;
      const w2 = recent[i - 1].weight || EMOTION_WEIGHTS[recent[i - 1].emotion] || 4;
      if (w1 - w2 > 5) return true;
    }
    return false;
  }

  _detectDeescalation(timeline) {
    if (!timeline?.length || timeline.length < 2) return false;
    const recent = timeline.slice(-3);
    for (let i = 1; i < recent.length; i++) {
      const w1 = recent[i].weight || EMOTION_WEIGHTS[recent[i].emotion] || 4;
      const w2 = recent[i - 1].weight || EMOTION_WEIGHTS[recent[i - 1].emotion] || 4;
      if (w2 - w1 > 5) return true;
    }
    return false;
  }

  _getDominantEmotion(timeline) {
    if (!timeline?.length) return 'neutral';
    const slice = timeline.slice(-10);
    const freq = {};
    let maxCount = 0, dominant = 'neutral';
    for (const e of slice) {
      const emo = e.emotion || 'neutral';
      freq[emo] = (freq[emo] || 0) + 1;
      if (freq[emo] > maxCount) { maxCount = freq[emo]; dominant = emo; }
    }
    return dominant;
  }

  _calculateSentiment(timeline) {
    if (!timeline?.length) return 'neutral';
    const recent = timeline.slice(-5);
    const avgWeight = recent.reduce((s, e) => s + (e.weight || EMOTION_WEIGHTS[e.emotion] || 4), 0) / recent.length;
    if (avgWeight > 6) return 'positive';
    if (avgWeight < 3) return 'negative';
    return 'neutral';
  }

  _computeEmotionDistribution(timeline) {
    if (!timeline?.length) return {};
    const dist = {};
    for (const e of timeline) {
      const emo = e.emotion || 'neutral';
      dist[emo] = (dist[emo] || 0) + 1;
    }
    const total = timeline.length;
    for (const key of Object.keys(dist)) {
      dist[key] = Math.round((dist[key] / total) * 100);
    }
    return dist;
  }

  _computeFormality(text) {
    if (!text) return 0.5;
    const lower = text.toLowerCase();
    const formalWords = ['please', 'would', 'could', 'appreciate', 'regarding', 'kindly', 'respectfully', 'sincerely', 'thank', 'grateful'];
    const casualWords = ['yeah', 'nah', 'gonna', 'wanna', 'gotta', 'cool', 'awesome', 'dude', 'bro', 'lol', 'haha', 'omg'];
    const formalScore = formalWords.filter(w => lower.includes(w)).length;
    const casualScore = casualWords.filter(w => lower.includes(w)).length;
    const total = formalScore + casualScore || 1;
    return Math.round((formalScore / total) * 100) / 100;
  }

  _movingAverage(state, key, value, alpha) {
    if (!state._movingAverages) state._movingAverages = {};
    if (state._movingAverages[key] === undefined) {
      state._movingAverages[key] = value;
    } else {
      state._movingAverages[key] = state._movingAverages[key] * (1 - alpha) + value * alpha;
    }
    return Math.round(state._movingAverages[key] * 100) / 100;
  }

  _getUserState(userId) {
    let totalMessages = 0;
    const chatIds = new Set();
    for (const [, entry] of this._stateCache) {
      const state = entry.value;
      if (!state) continue;
      for (const msg of state.messages) {
        if (msg.userId === userId) {
          totalMessages++;
          chatIds.add(msg.messageId ? 'has_id' : 'no_id');
        }
      }
    }
    for (const [chatId] of this._stateCache) {
      chatIds.add(chatId);
    }
    return totalMessages > 0 ? { totalMessages, chatCount: chatIds.size } : null;
  }

  _legacyFormat(result, chatId) {
    if (!result) return result;
    return {
      currentEmotion: result.emotion?.primary || { emotion: 'neutral', confidence: 0.5 },
      emotionTimeline: result.emotion?.timeline || [],
      emotionTrend: result.emotion?.trend || 'stable',
      dominantEmotion: result.emotion?.dominance || 'neutral',
      emotionVolatility: result.emotion?.volatility || 0,
      currentTopic: result.topic?.primary || 'general',
      topicTrend: result.topic?.trend || 'stable',
      topics: result.topic?.all || [],
      conversationState: result.state?.current || 'small_talk',
      previousState: result.state?.previous || null,
      stateTransition: result.state?.isTransition || false,
      stateSignificant: result.state?.isSignificant || false,
      relationshipType: result.relationship?.type || 'unknown',
      relationshipScore: result.relationship?.score || 0,
      relationshipConfidence: result.relationship?.confidence || 0,
      momentum: result.momentum || {},
      predictions: result.predictions || {},
      snapshots: result.snapshot?.created ? [{ summary: result.snapshot.summary }] : [],
      newSnapshot: result.snapshot?.created ? { summary: result.snapshot.summary, type: result.snapshot.type } : null,
    };
  }

  _emitAnalysisEvent(chatId, analysis, source) {
    try {
      const io = require('../../socket.io');
      if (io && typeof io.emit === 'function') {
        io.emit('cil:analysis:updated', { chatId, analysis, source });
      }
    } catch {}
  }
}

module.exports = new ConversationIntelligenceLayer();
