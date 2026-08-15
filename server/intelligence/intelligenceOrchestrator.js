const conversationIntelligenceLayer = require('./conversationIntelligenceLayer');
const dnaEngine = require('./conversationDNAEngine');
const selfLearningEngine = require('./selfLearningEngine');
const goalDetectionEngine = require('./goalDetectionEngine');
const MemoryClassifier = require('./memoryClassifier');
const timeIntelligence = require('./timeIntelligence');
const contextEngine = require('./contextEngine');
const AdaptiveRecommendationEngine = require('./adaptiveRecommendationEngine');
const FuturePredictionEngine = require('./futurePredictionEngine');
const ConversationHealthEngine = require('./conversationHealthEngine');
const explainableAI = require('./explainableAI');
const analyticsService = require('../services/analyticsService');
const learningService = require('../services/learningService');
const dnaService = require('../services/dnaService');
const goalService = require('../services/goalService');
const timeService = require('../services/timeService');
const memoryClassificationService = require('../services/memoryClassificationService');

class IntelligenceOrchestrator {
  constructor() {
    this.memoryClassifier = new MemoryClassifier();
    this.adaptiveRecommendationEngine = new AdaptiveRecommendationEngine();
    this.futurePredictionEngine = new FuturePredictionEngine();
    this.conversationHealthEngine = new ConversationHealthEngine();
  }

  async processMessage(message, chatId, userId) {
    try {
      process.nextTick(async () => {
        try {
          await dnaEngine.analyzeMessage(message, userId);
        } catch (err) {
          console.error('DNA analysis error:', err.message);
        }
      });

      process.nextTick(async () => {
        try {
          const classification = this.memoryClassifier.classifyMemory(message, { chatId });
          const context = { chatId, memoryType: classification.type };
          await memoryClassificationService.classifyAndStore(message, context);
        } catch (err) {
          console.error('Memory classification error:', err.message);
        }
      });

      process.nextTick(async () => {
        try {
          analyticsService.trackEvent({
            userId,
            type: 'message:sent',
            data: { chatId, messageId: message._id, messageType: message.type || 'text' },
          });
        } catch (err) {
          console.error('Analytics tracking error:', err.message);
        }
      });
    } catch (err) {
      console.error('processMessage error:', err.message);
    }
  }

  async getIntelligentSuggestions(chatId, userId, options = {}) {
    const startTime = Date.now();
    const count = options.count || 10;

    const msgs = await this._loadMessages(chatId, count);
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg) {
      try {
        await conversationIntelligenceLayer.analyze(chatId, lastMsg);
      } catch (err) {
        console.error('CIL analyze error:', err.message);
      }
    }

    const [cilContext, cilRecommendations, dnaProfile, conversationGoal, timeContext] = await Promise.all([
      conversationIntelligenceLayer.getContext(chatId).catch(() => null),
      conversationIntelligenceLayer.getRecommendations(chatId).catch(() => ({})),
      dnaService.getRecommendationProfile(userId).catch(() => null),
      goalService.getConversationGoal(chatId, msgs, { chatId }).catch(() => null),
      timeService.getTimeContext().catch(() => timeIntelligence.getCurrentTimeContext()),
    ]);

    const unifiedContext = contextEngine.buildContext({
      chatId,
      conversationHistory: msgs,
      conversationState: cilContext?.state ? { currentState: cilContext.state.current, ...cilContext.state } : {},
      emotionTimeline: cilContext?.emotion?.current ? [cilContext.emotion.current] : [],
      relationshipProfile: cilContext?.relationship ? { type: cilContext.relationship.type, score: cilContext.relationship.score } : {},
      topicEvolution: cilContext?.topic ? { topics: [{ topic: cilContext.topic.current }] } : {},
      conversationGoal: conversationGoal || {},
      conversationDNA: dnaProfile || {},
      currentTime: timeContext || {},
      previousSuggestions: [],
      acceptanceRate: 0.5,
    });

    const [adaptiveRecs, predictions, health] = await Promise.all([
      Promise.resolve().then(() => this.adaptiveRecommendationEngine.getRecommendations({
        currentEmotion: cilContext?.emotion?.current || { emotion: 'neutral', confidence: 0.5 },
        conversationState: cilContext?.state?.current || 'small_talk',
        relationshipType: cilContext?.relationship?.type || 'unknown',
        goals: conversationGoal || {},
        timeContext: timeContext || {},
        momentum: cilContext?.momentum || {},
        topics: cilContext?.topic?.history || [],
        userDNA: dnaProfile || {},
        chatId,
      }, { userId, ...options })).catch(() => ({
        emojis: [], gifs: [], stickers: [], shayaris: [], songs: [], videos: [], suggestions: [], metadata: {},
      })),
      Promise.resolve().then(() => this.futurePredictionEngine.predict(msgs, {
        currentEmotion: cilContext?.emotion?.current || { emotion: 'neutral', confidence: 0.5 },
        emotionTimeline: cilContext?.emotion?.current ? [cilContext.emotion.current] : [],
        conversationState: cilContext?.state?.current || 'small_talk',
        momentum: cilContext?.momentum || {},
        relationshipType: cilContext?.relationship?.type || 'unknown',
        topics: cilContext?.topic?.history || [],
        topicHistory: cilContext?.topic?.history || [],
      })).catch(() => ({})),
      Promise.resolve().then(() => this.conversationHealthEngine.analyze({
        messages: msgs,
        conversationState: cilContext?.state?.current || '',
        momentum: cilContext?.momentum || {},
        emotionTimeline: cilContext?.emotion?.current ? [cilContext.emotion.current] : [],
      })).catch(() => ({})),
    ]);

    const enrichedRecommendations = this._enrichWithExplanations(adaptiveRecs, unifiedContext, cilRecommendations);

    const personalizedSuggestions = await learningService.getPersonalizedSuggestions(
      userId, 'emoji',
      enrichedRecommendations.emojis || []
    ).catch(() => enrichedRecommendations.emojis || []);

    process.nextTick(() => {
      try {
        analyticsService.trackEvent({
          userId,
          type: 'suggestions:requested',
          data: { chatId, count, duration: Date.now() - startTime },
        });
      } catch (err) {
        console.error('Analytics track error:', err.message);
      }
    });

    return {
      analysis: {
        emotion: cilContext?.emotion?.current || { emotion: 'neutral' },
        emotionTrend: cilContext?.emotion?.trend || 'stable',
        dominantEmotion: cilContext?.emotion?.dominant || 'neutral',
        conversationState: cilContext?.state?.current || 'small_talk',
        relationship: cilContext?.relationship?.type || 'unknown',
        topic: cilContext?.topic?.current || 'general',
        momentum: cilContext?.momentum?.speed || 'slow',
        predictions: cilContext?.predictions,
        conversationContext: cilContext?.snapshotContext,
      },
      recommendations: {
        emoji: enrichedRecommendations.emojis?.slice(0, 10) || cilRecommendations?.emoji?.suggestions || [],
        sticker: enrichedRecommendations.stickers?.slice(0, 6) || cilRecommendations?.sticker?.suggestions || [],
        shayari: enrichedRecommendations.shayaris?.slice(0, 5) || cilRecommendations?.shayari?.suggestions || [],
        song: enrichedRecommendations.songs?.slice(0, 5) || cilRecommendations?.song?.suggestions || [],
        reply: enrichedRecommendations.suggestions?.slice(0, 5) || cilRecommendations?.reply?.suggestions || [],
      },
      predictions: this._formatPredictions(predictions),
      health: this._formatHealth(health),
      explanations: this._formatExplanations(enrichedRecommendations, unifiedContext),
      performance: {
        totalMs: Date.now() - startTime,
      },
    };
  }

  async getPredictions(chatId, userId) {
    try {
      const msgs = await this._loadMessages(chatId, 20);
      const context = await conversationIntelligenceLayer.getContext(chatId).catch(() => null);

      const predictions = this.futurePredictionEngine.predict(msgs, {
        currentEmotion: context?.emotion?.current || { emotion: 'neutral', confidence: 0.5 },
        emotionTimeline: context?.emotion?.current ? [context.emotion.current] : [],
        conversationState: context?.state?.current || 'small_talk',
        momentum: context?.momentum || {},
        relationshipType: context?.relationship?.type || 'unknown',
        topics: context?.topic?.history || [],
        topicHistory: context?.topic?.history || [],
      });

      return predictions;
    } catch (err) {
      console.error('getPredictions error:', err.message);
      return {};
    }
  }

  async getHealthAnalysis(chatId, userId) {
    try {
      const msgs = await this._loadMessages(chatId, 30);
      const context = await conversationIntelligenceLayer.getContext(chatId).catch(() => null);

      const health = this.conversationHealthEngine.analyze({
        messages: msgs,
        conversationState: context?.state?.current || '',
        momentum: context?.momentum || {},
        emotionTimeline: context?.emotion?.current ? [context.emotion.current] : [],
      });

      return health;
    } catch (err) {
      console.error('getHealthAnalysis error:', err.message);
      return {};
    }
  }

  async getDNAProfile(userId) {
    try {
      return await dnaEngine.getDNA(userId);
    } catch (err) {
      console.error('getDNAProfile error:', err.message);
      return null;
    }
  }

  async recordFeedback(userId, type, itemId, action, context = {}) {
    try {
      let result;
      switch (action) {
        case 'accepted':
          result = await learningService.recordAcceptance(userId, type, itemId, context.itemText, context);
          break;
        case 'dismissed':
          result = await learningService.recordDismissal(userId, type, itemId, context.itemText, context);
          break;
        case 'viewed':
          result = await learningService.recordView(userId, type, itemId, context.itemText, context);
          break;
        default:
          result = await learningService.recordAcceptance(userId, type, itemId, context.itemText, context);
      }

      this.adaptiveRecommendationEngine.recordFeedback(userId, type, itemId, action === 'accepted' ? 1 : action === 'viewed' ? 0.1 : -1);

      process.nextTick(() => {
        try {
          analyticsService.trackEvent({
            userId,
            type: 'feedback:recorded',
            data: { feedbackType: type, itemId, action },
          });
        } catch (err) {
          console.error('Analytics feedback track error:', err.message);
        }
      });

      return result;
    } catch (err) {
      console.error('recordFeedback error:', err.message);
      throw err;
    }
  }

  async getAnalytics(userId) {
    return analyticsService.getStats(userId);
  }

  _enrichWithExplanations(adaptiveRecs, unifiedContext, cilRecs) {
    const enriched = {
      emojis: (adaptiveRecs.emojis || []).map(e => {
        try {
          const explanation = explainableAI.explainRecommendation({ type: 'emoji', value: e.emoji || e }, unifiedContext);
          return { ...e, explanation };
        } catch {
          return e;
        }
      }),
      stickers: adaptiveRecs.stickers || [],
      shayaris: adaptiveRecs.shayaris || [],
      songs: adaptiveRecs.songs || [],
      videos: adaptiveRecs.videos || [],
      suggestions: adaptiveRecs.suggestions || [],
    };
    return enriched;
  }

  _formatPredictions(predictions) {
    if (!predictions || !predictions.nextEmotion) return {};
    return {
      nextEmotion: predictions.nextEmotion,
      nextState: predictions.nextState,
      nextTopic: predictions.nextTopic,
      nextReply: predictions.nextReply,
      nextGif: predictions.nextGif,
      nextEmoji: predictions.nextEmoji,
      nextSong: predictions.nextSong,
      conversationOutcome: predictions.conversationOutcome,
    };
  }

  _formatHealth(health) {
    if (!health || health.overallScore === undefined) return {};
    return {
      overallScore: health.overallScore,
      dimensions: health.dimensions,
      qualityScore: health.qualityScore,
      risks: health.risks,
      suggestions: health.suggestions,
    };
  }

  async _loadMessages(chatId, limit = 10) {
    try {
      const Message = require('../models/Message');
      const messages = await Message.find({ chat: chatId, deletedFor: { $ne: null } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('content sender createdAt type');
      return messages.reverse().map(m => ({
        text: m.content,
        from: m.sender?.toString(),
        timestamp: m.createdAt,
        _id: m._id?.toString(),
      }));
    } catch (err) {
      console.error('Load messages error:', err.message);
      return [];
    }
  }
}

module.exports = new IntelligenceOrchestrator();
