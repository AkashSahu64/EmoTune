const Message = require('../models/Message');
const CIL = require('../intelligence/conversationIntelligenceLayer');
const { chatCompletion, streamCompletion } = require('../core/providerManager');
const { getUnifiedMedia, matchEmojisByText } = require('../services/emojiService');
const { getShayari } = require('../services/shayariService');
const { searchSongs } = require('../services/songService');
const { searchVideos } = require('../services/videoService');
const { getSummary } = require('../services/summaryService');
const { translateMessage } = require('../services/translateService');
const { parallelFallback } = require('../services/parallelFallback');
const { logger, metrics } = require('../core/logger');
const cacheService = require('../core/cacheService');

async function loadMessages(chatId, limit = 10) {
  const messages = await Message.find({ chat: chatId, deletedFor: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('content sender createdAt');
  return messages.reverse().map(m => ({
    text: m.content,
    from: m.sender?.toString(),
    timestamp: m.createdAt,
    _id: m._id?.toString(),
  }));
}

async function ensureChatInitialized(chatId, userId, limit = 50) {
  const messages = await Message.find({ chat: chatId, deletedFor: { $ne: userId } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('content sender createdAt');
  const msgs = messages.reverse().map(m => ({
    text: m.content,
    from: m.sender?.toString(),
    timestamp: m.createdAt,
    _id: m._id?.toString(),
  }));
  await CIL.initialize(chatId, {
    messages: msgs,
    messageCount: msgs.length,
  });
  return msgs;
}

exports.getSuggestions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { count = 10 } = req.query;
    const startTime = Date.now();

    const msgs = await loadMessages(chatId, count);
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg) await CIL.analyze(chatId, lastMsg);

    const context = await CIL.getContext(chatId);

    const recommendations = await CIL.getRecommendations(chatId);

    const [songsResult, videosResult] = await Promise.all([
      searchSongs(context?.topic?.current || 'trending music', 5),
      searchVideos(context?.topic?.current || 'relaxing video', 5),
    ]);

    metrics.increment('suggestions.requested');

    res.json({
      analysis: {
        emotion: context?.emotion?.current || { emotion: 'neutral' },
        emotionTrend: context?.emotion?.trend || 'stable',
        dominantEmotion: context?.emotion?.dominant || 'neutral',
        conversationState: context?.state?.current || 'small_talk',
        relationship: context?.relationship?.type || 'unknown',
        topic: context?.topic?.current || 'general',
        momentum: context?.momentum?.speed || 'slow',
        predictions: context?.predictions,
        conversationContext: context?.snapshotContext,
      },
      recommendations: {
        emoji: recommendations?.emoji?.suggestions || [],
        sticker: recommendations?.sticker?.suggestions || [],
        shayari: recommendations?.shayari?.suggestions || [],
        song: recommendations?.song?.suggestions || [],
        reply: recommendations?.reply?.suggestions || [],
      },
      songs: songsResult.slice(0, 3),
      videos: videosResult.slice(0, 3),
      performance: {
        totalMs: Date.now() - startTime,
        cilAnalysis: context?.emotion?.current ? 'cached' : 'fresh',
      },
    });
  } catch (err) {
    logger.error('getSuggestions error', { error: err.message });
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

exports.getEmojis = async (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = await loadMessages(chatId, 5);
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg) await CIL.analyze(chatId, lastMsg);

    const context = await CIL.getContext(chatId);
    const text = msgs.map(m => m.text).filter(Boolean).join(' ');

    const cilEmojis = context?.snapshotContext?.recentSnapshots?.length
      ? await CIL.getRecommendations(chatId).then(r => r?.emoji?.suggestions || [])
      : [];

    const emojis = cilEmojis.length >= 3 ? cilEmojis : matchEmojisByText(text, 12);

    res.json({
      emojis,
      mood: context?.emotion?.current?.emotion || 'neutral',
      intelligence: {
        trend: context?.emotion?.trend,
        state: context?.state?.current,
      },
    });
  } catch (err) {
    logger.error('getEmojis error', { error: err.message });
    res.status(500).json({ error: 'Failed to get emoji suggestions' });
  }
};

exports.getGifs = async (req, res) => {
  try {
    const { chatId } = req.params;
    const query = String(req.query.q || '').trim().slice(0, 80);
    // Empty q is the panel's trending request. Use a stable media query instead
    // of feeding an entire recent chat message into provider search, which can
    // return GIFs but no stickers.
    const text = query || 'reaction';
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 24);

    const { gifs, stickers } = await getUnifiedMedia(text, limit, req.userId?.toString() || chatId);

    res.json({ gifs, stickers });
  } catch (err) {
    logger.error('getGifs error', { error: err.message });
    res.json({ gifs: [], stickers: [] });
  }
};

exports.getShayari = async (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = await loadMessages(chatId, 10);
    const text = msgs.map(m => m.text).filter(Boolean).join('\n');

    const context = await CIL.getContext(chatId);
    const emotion = context?.emotion?.current?.emotion || 'neutral';

    const shayaris = await getShayari(chatId, text, emotion, 5);

    res.json({
      shayaris,
      emotion,
      intelligence: {
        relationship: context?.relationship?.type,
        state: context?.state?.current,
        predictions: context?.predictions?.nextEmotion,
      },
    });
  } catch (err) {
    logger.error('getShayari error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch shayari' });
  }
};

exports.getSongs = async (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = await loadMessages(chatId, 5);
    const context = await CIL.getContext(chatId);
    const query = context?.topic?.current || 'trending music';
    const songs = await searchSongs(query, 8);
    res.json({ songs, intelligence: { topic: query, emotion: context?.emotion?.current?.emotion } });
  } catch (err) {
    logger.error('getSongs error', { error: err.message });
    res.json({ songs: [] });
  }
};

exports.getVideos = async (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = await loadMessages(chatId, 5);
    const context = await CIL.getContext(chatId);
    const query = context?.topic?.current || 'relaxing video';
    const videos = await searchVideos(query, 8);
    res.json({ videos, intelligence: { topic: query, emotion: context?.emotion?.current?.emotion } });
  } catch (err) {
    logger.error('getVideos error', { error: err.message });
    res.json({ videos: [] });
  }
};

exports.rewriteMessage = async (req, res) => {
  try {
    const { text, targetTone, customPrompt } = req.body;
    if (!text || !targetTone) {
      return res.status(400).json({ error: 'Text and targetTone required' });
    }
    const { rewriteTone } = require('../../ml/pipelines/personaPipeline');
    const result = await rewriteTone(text, targetTone, customPrompt);
    res.json(result);
  } catch (err) {
    logger.error('rewriteMessage error', { error: err.message });
    res.status(500).json({ error: 'Failed to rewrite message' });
  }
};

exports.getEmotionTheme = async (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = await loadMessages(chatId, 5);
    const context = await CIL.getContext(chatId);
    res.json({
      emotion: context?.emotion?.current || { emotion: 'neutral' },
      suggestedTheme: context?.emotion?.current?.emotion || 'neutral',
      intelligence: {
        trend: context?.emotion?.trend,
        timeline: context?.emotion?.current,
        isEscalating: context?.emotion?.current?.weight > 7,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze emotion' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageCount = 50 } = req.query;

    const msgs = await loadMessages(chatId, parseInt(messageCount));
    if (msgs.length === 0) {
      return res.json({
        summary: { summary: 'No messages found.', mainPoints: [], tone: 'neutral', actionItems: [], unansweredQuestions: [] },
      });
    }

    const summary = await getSummary(chatId, msgs);
    const context = await CIL.getContext(chatId);

    res.json({
      summary,
      intelligence: {
        state: context?.state?.current,
        relationship: context?.relationship?.type,
        topicTrend: context?.topic?.trend,
        momentum: context?.momentum,
      },
    });
  } catch (err) {
    logger.error('getSummary error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

exports.translateMessage = async (req, res) => {
  try {
    const { text, targetLang = 'en', chatId } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    let context = null;
    if (chatId) context = await CIL.getContext(chatId);

    const result = await translateMessage(text, targetLang);

    res.json({
      ...result,
      intelligence: context ? {
        conversationState: context?.state?.current,
        relationship: context?.relationship?.type,
        emotion: context?.emotion?.current?.emotion,
      } : null,
    });
  } catch (err) {
    logger.error('translateMessage error', { error: err.message });
    res.status(500).json({ error: 'Failed to translate message' });
  }
};

exports.getStreamingSuggestions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = await loadMessages(chatId, 3);
    const lastMsg = msgs[msgs.length - 1];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (type, data) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    if (lastMsg) {
      await CIL.analyze(chatId, lastMsg);
      const context = await CIL.getContext(chatId);
      sendEvent('intelligence', {
        emotion: context?.emotion?.current,
        state: context?.state?.current,
        topic: context?.topic?.current,
        relationship: context?.relationship?.type,
        momentum: context?.momentum?.speed,
        predictions: context?.predictions,
        snapshotContext: context?.snapshotContext,
      });
    }

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant with real-time conversation intelligence.' },
      { role: 'user', content: msgs.map(m => m.text).filter(Boolean).join('\n') },
    ];

    for await (const chunk of streamCompletion(messages, { taskType: 'general' })) {
      sendEvent('token', chunk);
    }

    sendEvent('done', { timestamp: Date.now() });
    res.end();
  } catch (err) {
    logger.error('Stream error', { error: err.message });
    if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
    res.end();
  }
};

exports.getConversationIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const context = await CIL.getContext(chatId);
    if (!context) return res.status(404).json({ error: 'No conversation data' });

    const predictions = await CIL.getPredictions(chatId);
    const recommendationScores = await CIL.getRecommendations(chatId).then(r => r?.weightedScores || {});

    res.json({
      conversation: context.conversation,
      emotion: context.emotion,
      state: context.state,
      relationship: context.relationship,
      topic: context.topic,
      momentum: context.momentum,
      predictions,
      recommendationScores,
      snapshotCount: context.snapshotCount,
      snapshotContext: context.snapshotContext,
      workerStats: CIL.getWorkerStats(),
    });
  } catch (err) {
    logger.error('getConversationIntelligence error', { error: err.message });
    res.status(500).json({ error: 'Failed to get intelligence data' });
  }
};

exports.getMetrics = async (req, res) => {
  res.json({
    metrics: metrics.getReport(),
    cil: {
      conversations: CIL.getConversationIds().length,
      workerStats: CIL.getWorkerStats(),
      vectorMemory: {},
    },
  });
};

exports.getCacheStatus = async (req, res) => {
  const status = await cacheService.healthCheck();
  res.json({ cache: status });
};
