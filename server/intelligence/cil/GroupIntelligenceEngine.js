const GroupIntelligence = require('../../domain/models/GroupIntelligence');
const Chat = require('../../models/Chat');
const Message = require('../../models/Message');
const User = require('../../models/User');
const cacheService = require('../../core/cacheService');
const { logger } = require('../../core/logger');
const backgroundWorker = require('../backgroundWorker');
const topicEvolution = require('../topicEvolution');
const emotionPipeline = require('../../core/emotionPipeline');

const MOOD_CACHE_TTL = 60;
const SUMMARY_CACHE_TTL = 300;
const ENGAGEMENT_CACHE_TTL = 120;
const TOPICS_CACHE_TTL = 90;
const SPAM_CACHE_TTL = 30;
const PARTICIPATION_CACHE_TTL = 120;

class GroupIntelligenceEngine {
  constructor() {
    this._initialized = new Map();
    this._scheduledSummaries = new Map();
    this._initWorker();
  }

  _initWorker() {
    backgroundWorker.register('group_summary', async (task) => {
      return this._generateSummaryWorker(task);
    });
    backgroundWorker.register('group_meeting_notes', async (task) => {
      return this._generateMeetingNotesWorker(task);
    });
    backgroundWorker.register('group_confidence_check', async (task) => {
      return this._detectConflictsWorker(task);
    });
  }

  async initialize(chatId) {
    if (this._initialized.has(chatId)) return this._initialized.get(chatId);

    let doc = await GroupIntelligence.findOne({ chat: chatId });
    if (!doc) {
      const chat = await Chat.findById(chatId);
      if (!chat) throw new Error(`Chat ${chatId} not found`);

      doc = await GroupIntelligence.create({
        chat: chatId,
        metadata: { createdForChat: new Date(), lastUpdated: new Date(), updateCount: 0 },
      });
      logger.info(`GroupIntelligence initialized for chat ${chatId}`);
    }

    this._initialized.set(chatId, doc);
    return doc;
  }

  async onMessage(message, context) {
    const chatId = message.chat || context?.chatId;
    if (!chatId) return;

    await this.initialize(chatId);

    const doc = this._initialized.get(chatId);
    if (!doc) return;

    const senderId = message.sender?.toString?.() || message.sender;
    const text = message.content || message.text || '';
    const now = new Date();

    if (senderId) {
      const existing = doc.activity.mostActiveMembers.find(
        m => (m.user?.toString?.() || m.user) === senderId
      );
      if (existing) {
        existing.messageCount = (existing.messageCount || 0) + 1;
        existing.lastActive = now;
      } else {
        doc.activity.mostActiveMembers.push({
          user: senderId,
          messageCount: 1,
          lastActive: now,
        });
      }
      doc.activity.mostActiveMembers.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
      if (doc.activity.mostActiveMembers.length > 50) doc.activity.mostActiveMembers.length = 50;

      const silentIdx = doc.activity.silentMembers.findIndex(
        s => (s?.toString?.() || s) === senderId
      );
      if (silentIdx !== -1) doc.activity.silentMembers.splice(silentIdx, 1);
    }

    const extracted = topicEvolution.extractTopics(text);
    for (const et of extracted) {
      const existing = doc.topics.trending.find(t => t.topic === et.topic);
      if (existing) {
        existing.score = Math.min(100, existing.score + 5);
        existing.lastMentioned = now;
        existing.messageCount = (existing.messageCount || 0) + 1;
      } else {
        doc.topics.trending.push({
          topic: et.topic,
          score: 10,
          lastMentioned: now,
          messageCount: 1,
        });
      }
    }
    doc.topics.trending.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (doc.topics.trending.length > 20) doc.topics.trending.length = 20;

    if (doc.topics.trending.length > 0) {
      doc.topics.current = doc.topics.trending[0].topic;
    }

    const emotion = emotionPipeline.classifyByRule([{ content: text }]);
    doc.mood.timeline.push({
      mood: emotion.emotion,
      score: Math.round(emotion.confidence * 100),
      timestamp: now,
    });
    if (doc.mood.timeline.length > 100) doc.mood.timeline.splice(0, doc.mood.timeline.length - 100);

    doc.emotion.timeline.push({
      emotion: emotion.emotion,
      confidence: emotion.confidence,
      timestamp: now,
    });
    if (doc.emotion.timeline.length > 100) doc.emotion.timeline.splice(0, doc.emotion.timeline.length - 100);

    doc.mood.current = this._calculateCurrentMood(doc.mood.timeline);
    doc.mood.trend = this._calculateMoodTrend(doc.mood.timeline);

    const recentEmotions = doc.emotion.timeline.slice(-20);
    const emotionCounts = {};
    for (const e of recentEmotions) {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
    }
    doc.emotion.dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    doc.emotion.volatility = this._calculateVolatility(recentEmotions);

    doc.metadata.lastUpdated = now;
    doc.metadata.updateCount = (doc.metadata.updateCount || 0) + 1;

    const avg = doc.activity.mostActiveMembers.length > 0
      ? doc.activity.mostActiveMembers.reduce((s, m) => s + (m.messageCount || 0), 0) / doc.activity.mostActiveMembers.length
      : 0;
    const activeThreshold = Math.max(2, avg * 0.3);
    const silentMembers = [];
    for (const mem of doc.activity.mostActiveMembers) {
      if ((mem.messageCount || 0) < activeThreshold && (now - (mem.lastActive?.getTime?.() || now)) > 3600000) {
        silentMembers.push(mem.user);
      }
    }
    doc.activity.silentMembers = silentMembers;

    const activityWeights = doc.activity.mostActiveMembers.reduce((s, m) => s + (m.messageCount || 0), 0);
    doc.health.engagementScore = Math.min(100, Math.round((activityWeights / Math.max(1, doc.activity.mostActiveMembers.length)) * 5));
    doc.health.participationScore = Math.min(100, Math.round(
      (doc.activity.mostActiveMembers.filter(m => (m.messageCount || 0) > 0).length / Math.max(1, doc.activity.mostActiveMembers.length)) * 100
    ));
    doc.health.lastCalculated = now;
    doc.health.overallScore = Math.round(
      (doc.health.engagementScore + doc.health.participationScore + (100 - doc.health.toxicityScore)) / 3
    );

    try {
      await doc.save();
    } catch (err) {
      logger.error(`GroupIntelligence save failed for ${chatId}`, { error: err.message });
    }

    const cacheKeyMood = `group:mood:${chatId}`;
    const cacheKeyTopics = `group:topics:${chatId}`;
    await cacheService.set(cacheKeyMood, null, 1);
    await cacheService.set(cacheKeyTopics, null, 1);
  }

  _calculateCurrentMood(timeline) {
    if (!timeline?.length) return 'neutral';
    const recent = timeline.slice(-20);
    const moodScores = {};
    for (const entry of recent) {
      moodScores[entry.mood] = (moodScores[entry.mood] || 0) + (entry.score || 50);
    }
    return Object.entries(moodScores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  }

  _calculateMoodTrend(timeline) {
    if (!timeline?.length || timeline.length < 5) return 'stable';
    const recent = timeline.slice(-10);
    const half = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, half);
    const secondHalf = recent.slice(half);
    const firstAvg = firstHalf.reduce((s, e) => s + (e.score || 50), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, e) => s + (e.score || 50), 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 10) return 'improving';
    if (diff < -10) return 'declining';
    return 'stable';
  }

  _calculateVolatility(timeline) {
    if (!timeline?.length || timeline.length < 3) return 0;
    let changes = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].emotion !== timeline[i - 1].emotion) changes++;
    }
    return Math.round((changes / (timeline.length - 1)) * 100);
  }

  async getGroupMood(chatId) {
    const cacheKey = `group:mood:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return null;

    const recentMoods = doc.mood.timeline.slice(-30);
    const distribution = {};
    let totalScore = 0;
    for (const entry of recentMoods) {
      distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
      totalScore += entry.score || 50;
    }
    const distTotal = Object.values(distribution).reduce((s, c) => s + c, 0);
    for (const key of Object.keys(distribution)) {
      distribution[key] = Math.round((distribution[key] / Math.max(1, distTotal)) * 100);
    }

    const avgScore = recentMoods.length > 0 ? Math.round(totalScore / recentMoods.length) : 50;

    const emotionCounts = {};
    const recentEmotions = doc.emotion.timeline.slice(-30);
    for (const e of recentEmotions) {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
    }
    const mostActiveEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    const result = {
      current: doc.mood.current || 'neutral',
      score: avgScore,
      distribution,
      trend: doc.mood.trend || 'stable',
      mostActiveEmotion,
      memberCount: doc.activity.mostActiveMembers.length,
      analyzedAt: doc.metadata.lastUpdated || new Date(),
    };

    await cacheService.set(cacheKey, result, MOOD_CACHE_TTL);
    return result;
  }

  async getGroupTopics(chatId) {
    const cacheKey = `group:topics:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return null;

    const now = Date.now();
    const trending = (doc.topics.trending || []).map(t => ({
      topic: t.topic,
      messageCount: t.messageCount || 0,
      participantCount: t.participantCount || Math.min(t.messageCount || 1, doc.activity.mostActiveMembers.length),
      urgency: Math.min(100, Math.round(((t.score || 0) * 0.6) + (1 - (now - (t.lastMentioned?.getTime?.() || now)) / 86400000) * 40)),
    }));

    const drift = doc.topics.drift?.detected
      ? { detected: true, from: doc.topics.drift.fromTopic, to: doc.topics.drift.toTopic }
      : { detected: false, from: '', to: '' };

    const periods = this._getTopicPeriods(doc.mood.timeline, doc.topics.trending);

    const result = {
      current: doc.topics.current || (trending[0]?.topic || 'general'),
      trending: trending.slice(0, 10),
      drift,
      evolution: periods,
    };

    await cacheService.set(cacheKey, result, TOPICS_CACHE_TTL);
    return result;
  }

  _getTopicPeriods(timeline, trending) {
    if (!timeline?.length) return [];
    const periods = [];
    const now = Date.now();
    const dayMs = 86400000;
    for (let d = 6; d >= 0; d--) {
      const start = now - (d + 1) * dayMs;
      const end = now - d * dayMs;
      const periodTopics = (trending || []).filter(t => {
        const lastMentioned = t.lastMentioned?.getTime?.() || now;
        return lastMentioned >= start && lastMentioned < end;
      }).map(t => t.topic);
      if (periodTopics.length > 0) {
        periods.push({
          period: d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`,
          topics: periodTopics.slice(0, 5),
        });
      }
    }
    return periods;
  }

  async getMemberEngagement(chatId) {
    const cacheKey = `group:engagement:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return null;

    const now = Date.now();
    const members = [];

    for (const m of doc.activity.mostActiveMembers) {
      const userId = m.user?.toString?.() || m.user;
      const lastActive = m.lastActive?.getTime?.() || now;
      const isSilent = doc.activity.silentMembers.some(s => (s?.toString?.() || s) === userId);

      let userObj = { id: userId, username: 'unknown', avatar: '' };
      try {
        const u = await User.findById(userId).select('username avatar').lean();
        if (u) userObj = { id: u._id.toString(), username: u.username, avatar: u.avatar || '' };
      } catch {}

      members.push({
        user: userObj,
        messageCount: m.messageCount || 0,
        avgMessageLength: m.messageCount > 0 ? Math.round((m.messageLengthTotal || 100) / m.messageCount) : 0,
        responseRate: Math.min(100, Math.round(((m.messageCount || 0) / Math.max(1, doc.activity.mostActiveMembers.reduce((s, x) => s + (x.messageCount || 0), 0))) * 100)),
        sentiment: this._getMemberSentiment(doc, userId),
        participationScore: Math.min(100, Math.round(((m.messageCount || 0) / Math.max(1, doc.activity.mostActiveMembers[0]?.messageCount || 1)) * 100)),
        lastActive,
        isSilent,
        role: 'member',
      });
    }

    for (const s of doc.activity.silentMembers || []) {
      const userId = s?.toString?.() || s;
      if (!members.find(m => m.user.id === userId)) {
        let userObj = { id: userId, username: 'unknown', avatar: '' };
        try {
          const u = await User.findById(userId).select('username avatar').lean();
          if (u) userObj = { id: u._id.toString(), username: u.username, avatar: u.avatar || '' };
        } catch {}
        members.push({
          user: userObj,
          messageCount: 0,
          avgMessageLength: 0,
          responseRate: 0,
          sentiment: 'neutral',
          participationScore: 0,
          lastActive: now,
          isSilent: true,
          role: 'member',
        });
      }
    }

    const totalMessages = doc.activity.mostActiveMembers.reduce((s, m) => s + (m.messageCount || 0), 0);
    const activeMemberCount = doc.activity.mostActiveMembers.filter(
      m => (now - (m.lastActive?.getTime?.() || now)) < 86400000
    ).length;
    const silentMemberCount = doc.activity.silentMembers.length;
    const engagementRate = doc.activity.mostActiveMembers.length > 0
      ? Math.round((activeMemberCount / doc.activity.mostActiveMembers.length) * 100)
      : 0;

    const result = {
      members: members.slice(0, 50),
      overall: {
        totalMessages,
        activeMemberCount,
        silentMemberCount,
        engagementRate,
        period: '7d',
      },
    };

    await cacheService.set(cacheKey, result, ENGAGEMENT_CACHE_TTL);
    return result;
  }

  _getMemberSentiment(doc, userId) {
    const userTimeline = doc.emotion.timeline.filter(e => e.userId === userId);
    if (userTimeline.length === 0) return 'neutral';
    const recent = userTimeline.slice(-10);
    const sentimentScores = { positive: 0, negative: 0, neutral: 0 };
    for (const e of recent) {
      const positiveEmotions = ['happy', 'joyful', 'excited', 'loved', 'grateful', 'hopeful', 'supportive'];
      const negativeEmotions = ['sad', 'angry', 'frustrated', 'annoyed', 'hurt', 'anxious', 'worried', 'fearful'];
      if (positiveEmotions.includes(e.emotion)) sentimentScores.positive++;
      else if (negativeEmotions.includes(e.emotion)) sentimentScores.negative++;
      else sentimentScores.neutral++;
    }
    const max = Object.entries(sentimentScores).sort((a, b) => b[1] - a[1])[0];
    return max ? max[0] : 'neutral';
  }

  async getGroupSummary(chatId, options = {}) {
    const cacheKey = `group:summary:${chatId}`;
    if (!options.regenerate) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return null;

    if (doc.ai?.lastSummary?.content && !options.regenerate) {
      return this._formatSummaryResponse(doc);
    }

    backgroundWorker.enqueue('group_summary', { chatId, timestamp: Date.now() });

    await cacheService.set(cacheKey, this._formatSummaryResponse(doc), SUMMARY_CACHE_TTL);
    return this._formatSummaryResponse(doc);
  }

  async _generateSummaryWorker(task) {
    const { chatId } = task;
    try {
      const messages = await Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('sender', 'username')
        .lean();

      if (!messages?.length) return;

      messages.reverse();

      const chartInfo = await Chat.findById(chatId).populate('participants.user', 'username').lean();
      const participantNames = chartInfo?.participants?.map(p => p.user?.username)?.filter(Boolean) || [];

      const doc = this._initialized.get(chatId);
      if (!doc) return;

      const summary = `Conversation with ${participantNames.join(', ')}. ${messages.length} messages analyzed. Topics discussed include various subjects centered around recent chat activity.`;

      const highlights = messages
        .filter(m => (m.content || '').length > 80)
        .slice(0, 5)
        .map(m => `[${m.sender?.username || 'unknown'}]: ${(m.content || '').slice(0, 100)}...`);

      const actionItems = [];
      const questions = messages.filter(m => (m.content || '').includes('?')).slice(0, 3);
      for (const q of questions) {
        actionItems.push(`Respond to: "${(q.content || '').slice(0, 80)}"`);
      }

      const decisions = [];
      const decisionKeywords = ['decide', 'let\'s go with', 'finalize', 'agreed', 'deal', 'done', 'confirmed'];
      for (const m of messages) {
        const lower = (m.content || '').toLowerCase();
        for (const kw of decisionKeywords) {
          if (lower.includes(kw)) {
            decisions.push({
              summary: (m.content || '').slice(0, 100),
              options: [],
              status: 'proposed',
            });
            break;
          }
        }
      }

      const busyKeywords = ['busy', 'swamped', 'deadline', 'overloaded', 'hectic', 'crazy', 'slammed', 'packed'];
      const busyCount = messages.filter(m => busyKeywords.some(k => (m.content || '').toLowerCase().includes(k))).length;
      const busyLevel = busyCount > 3 ? 'high' : busyCount > 1 ? 'medium' : 'low';
      const mood = doc.mood.current || 'neutral';

      const fromDate = messages.length > 0 ? messages[messages.length - 1].createdAt : new Date(Date.now() - 86400000);
      const toDate = messages.length > 0 ? messages[0].createdAt : new Date();

      const memberHighlights = [];
      const senderCounts = {};
      for (const m of messages) {
        const name = m.sender?.username || 'unknown';
        senderCounts[name] = (senderCounts[name] || 0) + 1;
      }
      for (const [name, count] of Object.entries(senderCounts)) {
        const userMessages = messages.filter(m => (m.sender?.username || 'unknown') === name);
        const topMsg = userMessages.slice(-3).map(m => (m.content || '')).filter(Boolean).join('; ');
        memberHighlights.push({
          user: name,
          contribution: `${count} messages. ${topMsg.slice(0, 100)}`,
        });
      }

      const summaryDoc = {
        content: summary,
        generatedAt: new Date(),
        messageRange: { from: fromDate, to: toDate },
      };
      await GroupIntelligence.findOneAndUpdate(
        { chat: chatId },
        { 'ai.lastSummary': summaryDoc, 'metadata.lastUpdated': new Date() }
      );

      const result = {
        summary,
        highlights: highlights.slice(0, 10),
        actionItems: actionItems.slice(0, 5),
        decisions: decisions.slice(0, 5),
        mood,
        busyLevel,
        period: { from: fromDate, to: toDate },
        generatedAt: new Date(),
        memberHighlights: memberHighlights.slice(0, 10),
      };

      await cacheService.set(`group:summary:${chatId}`, result, SUMMARY_CACHE_TTL);
      return result;
    } catch (err) {
      logger.error(`Summary generation failed for ${chatId}`, { error: err.message });
      return null;
    }
  }

  _formatSummaryResponse(doc) {
    if (!doc) return null;
    const summary = doc.ai?.lastSummary?.content || 'No summary available yet';
    const from = doc.ai?.lastSummary?.messageRange?.from || new Date(Date.now() - 86400000);
    const to = doc.ai?.lastSummary?.messageRange?.to || new Date();

    return {
      summary,
      highlights: [],
      actionItems: [],
      decisions: (doc.ai?.pendingDecisions || []).map(d => ({
        summary: d.summary,
        options: d.options || [],
        status: d.status || 'pending',
      })),
      mood: doc.mood?.current || 'neutral',
      busyLevel: 'low',
      period: { from, to },
      generatedAt: doc.ai?.lastSummary?.generatedAt || doc.metadata?.lastUpdated || new Date(),
      memberHighlights: (doc.activity?.mostActiveMembers || []).slice(0, 5).map(m => ({
        user: (m.user?.toString?.() || m.user || 'unknown').toString(),
        contribution: `${m.messageCount || 0} messages`,
      })),
    };
  }

  async getTopicDrift(chatId) {
    const cacheKey = `group:drift:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return { detected: false, from: '', to: '', confidence: 0, suggestedAction: 'none' };

    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    if (messages.length < 10) {
      return { detected: false, from: '', to: '', confidence: 0, suggestedAction: 'none' };
    }

    const recent20 = messages.slice(0, 20).map(m => m.content || '').filter(Boolean);
    const prev20 = messages.slice(20, 40).map(m => m.content || '').filter(Boolean);

    const recentTopics = recent20.flatMap(t => topicEvolution.extractTopics(t));
    const prevTopics = prev20.flatMap(t => topicEvolution.extractTopics(t));

    const recentTop = recentTopics.sort((a, b) => b.score - a.score)[0]?.topic || 'general';
    const prevTop = prevTopics.sort((a, b) => b.score - a.score)[0]?.topic || 'general';

    const detected = recentTop !== prevTop && prevTop !== 'general';
    const confidence = detected ? Math.min(100, Math.round((recentTopics.length / Math.max(1, recent20.length)) * 70 + 30)) : 0;

    let suggestedAction = 'none';
    if (detected && doc.topics.drift?.detected) {
      suggestedAction = 'monitor';
    } else if (detected && confidence > 60) {
      suggestedAction = 'notify';
    }

    if (detected) {
      doc.topics.drift = {
        detected: true,
        fromTopic: prevTop,
        toTopic: recentTop,
        detectedAt: new Date(),
      };
      doc.markModified?.('topics');
      await doc.save().catch(() => {});
    }

    const result = {
      detected,
      from: prevTop,
      to: recentTop,
      confidence,
      suggestedAction,
    };

    await cacheService.set(cacheKey, result, 60);
    return result;
  }

  async getSpamScore(chatId) {
    const cacheKey = `group:spam:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return { score: 0, flags: [], action: 'none' };

    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (messages.length < 5) return { score: 0, flags: [], action: 'none' };

    const flags = [];
    const userFrequency = {};
    const linkPattern = /https?:\/\/[^\s]+/g;
    const linkOnlyPattern = /^https?:\/\/[^\s]+$/;

    const now = Date.now();

    for (const m of messages) {
      const uid = m.sender?.toString?.() || '';
      if (!uid) continue;
      userFrequency[uid] = (userFrequency[uid] || 0) + 1;
    }

    const avgFrequency = Object.values(userFrequency).reduce((s, c) => s + c, 0) / Math.max(1, Object.keys(userFrequency).length);
    const threshold = avgFrequency * 3;

    for (const [uid, count] of Object.entries(userFrequency)) {
      if (count > threshold && count > 10) {
        flags.push({ userId: uid, reason: `High message frequency: ${count} in recent messages`, severity: 'medium' });
      }
    }

    const contentMap = {};
    for (const m of messages) {
      const text = (m.content || '').trim().toLowerCase();
      if (!text) continue;
      if (!contentMap[text]) contentMap[text] = [];
      contentMap[text].push(m);
    }
    for (const [text, msgs] of Object.entries(contentMap)) {
      if (msgs.length >= 4 && text.length > 5) {
        const uniqueUsers = [...new Set(msgs.map(m => m.sender?.toString?.() || ''))];
        if (uniqueUsers.length <= 2) {
          flags.push({
            userId: uniqueUsers[0],
            reason: `Repeated identical message "${text.slice(0, 50)}" (${msgs.length}x)`,
            severity: 'high',
          });
        }
      }
    }

    const linkOnlyMessages = messages.filter(m => {
      const text = (m.content || '').trim();
      return text && linkOnlyPattern.test(text) && !text.split(/\s+/).some(w => !w.startsWith('http'));
    });
    const newMemberThreshold = new Date(now - 86400000);
    const newMembers = doc.activity.mostActiveMembers
      .filter(m => (m.lastActive?.getTime?.() || now) > newMemberThreshold.getTime())
      .map(m => m.user?.toString?.() || '');
    for (const m of linkOnlyMessages) {
      const uid = m.sender?.toString?.() || '';
      if (newMembers.includes(uid)) {
        flags.push({ userId: uid, reason: 'Link-only message from new member', severity: 'high' });
      }
    }

    const score = Math.min(1, flags.reduce((s, f) => {
      return s + (f.severity === 'high' ? 0.3 : f.severity === 'medium' ? 0.15 : 0.05);
    }, 0));

    let action = 'none';
    if (score > 0.7) action = 'restrict';
    else if (score > 0.4) action = 'warn';
    else if (score > 0.2) action = 'monitor';

    doc.health.spamScore = Math.round(score * 100);
    await doc.save().catch(() => {});

    const result = { score, flags, action };
    await cacheService.set(cacheKey, result, SPAM_CACHE_TTL);
    return result;
  }

  scheduleSummary(chatId, intervalMinutes = 60) {
    if (this._scheduledSummaries.has(chatId)) {
      clearInterval(this._scheduledSummaries.get(chatId));
    }

    const interval = setInterval(() => {
      backgroundWorker.enqueue('group_summary', { chatId, scheduled: true, timestamp: Date.now() });
      logger.info(`Scheduled summary generated for ${chatId}`);
    }, intervalMinutes * 60 * 1000);

    this._scheduledSummaries.set(chatId, interval);
    logger.info(`Summary scheduled for ${chatId} every ${intervalMinutes}m`);
    return { scheduled: true, chatId, intervalMinutes };
  }

  async getParticipationScore(chatId, userId) {
    const cacheKey = `group:participation:${chatId}:${userId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return { score: 0, percentile: 0, insights: ['No group data'] };

    const member = doc.activity.mostActiveMembers.find(
      m => (m.user?.toString?.() || m.user) === userId
    );

    if (!member) {
      return { score: 0, percentile: 0, insights: ['No messages yet'] };
    }

    const messages = await Message.find({ chat: chatId, sender: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const allMembers = doc.activity.mostActiveMembers;
    const avgCount = allMembers.reduce((s, m) => s + (m.messageCount || 0), 0) / Math.max(1, allMembers.length);
    const messageScore = Math.min(40, Math.round(((member.messageCount || 0) / Math.max(1, avgCount)) * 40));

    const timestamps = messages.map(m => m.createdAt?.getTime?.() || Date.now());
    let responseTimeScore = 50;
    if (timestamps.length > 1) {
      const gaps = [];
      for (let i = 1; i < timestamps.length; i++) {
        gaps.push(timestamps[i - 1] - timestamps[i]);
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      responseTimeScore = Math.min(100, Math.max(0, Math.round((1 - avgGap / 86400000) * 100)));
    }

    const avgLength = messages.length > 0
      ? messages.reduce((s, m) => s + (m.content || '').length, 0) / messages.length
      : 0;
    const lengthScore = Math.min(100, Math.round((avgLength / 200) * 100));

    const topicRelevance = this._calculateTopicRelevance(messages, doc.topics.current);

    const score = Math.round((messageScore * 0.35 + responseTimeScore * 0.25 + lengthScore * 0.2 + topicRelevance * 0.2));

    const sorted = allMembers
      .map(m => (m.messageCount || 0))
      .sort((a, b) => a - b);
    const rank = sorted.filter(c => c <= (member.messageCount || 0)).length;
    const percentile = Math.round((rank / Math.max(1, sorted.length)) * 100);

    const insights = [];
    if (messageScore < 30) insights.push('Below average message count');
    else if (messageScore > 80) insights.push('High message contributor');
    if (responseTimeScore < 30) insights.push('Slow response time');
    if (lengthScore > 70) insights.push('Provides detailed messages');
    if (percentile > 80) insights.push('Top participant in group');
    if (doc.activity.silentMembers.some(s => (s?.toString?.() || s) === userId)) {
      insights.push('Currently silent - may need re-engagement');
    }
    if (insights.length === 0) insights.push('Average participation');

    const result = { score, percentile, insights: insights.slice(0, 5) };
    await cacheService.set(cacheKey, result, PARTICIPATION_CACHE_TTL);
    return result;
  }

  _calculateTopicRelevance(messages, currentTopic) {
    if (!currentTopic || !messages?.length) return 50;
    const relevant = messages.filter(m => {
      const text = (m.content || '').toLowerCase();
      return topicEvolution.extractTopics(text).some(t => t.topic === currentTopic);
    });
    return Math.round((relevant.length / messages.length) * 100);
  }

  async detectConflicts(chatId) {
    const cacheKey = `group:conflict:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    await this.initialize(chatId);
    const doc = this._initialized.get(chatId);
    if (!doc) return { hasConflict: false, severity: 'none', members: [], suggestion: '' };

    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (messages.length < 10) {
      return { hasConflict: false, severity: 'none', members: [], suggestion: '' };
    }

    const toxicKeywords = ['stupid', 'idiot', 'shut up', 'useless', 'hate you', 'dumb', 'moron', 'jerk', 'loser', 'pathetic', 'annoying', 'trash', 'garbage', 'ridiculous', 'piss off'];
    const escalationEmotions = ['angry', 'frustrated', 'annoyed', 'hurt'];

    let toxicCount = 0;
    const toxicByUser = {};
    const escalationPairCounts = {};

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const text = (m.content || '').toLowerCase();
      const uid = m.sender?.toString?.() || '';

      for (const kw of toxicKeywords) {
        if (text.includes(kw)) {
          toxicCount++;
          toxicByUser[uid] = (toxicByUser[uid] || 0) + 1;
          break;
        }
      }

      const emotion = emotionPipeline.classifyByRule([{ content: m.content || '' }]);
      if (escalationEmotions.includes(emotion.emotion)) {
        if (i > 0) {
          const prev = messages[i - 1];
          const prevEmotion = emotionPipeline.classifyByRule([{ content: prev.content || '' }]);
          if (escalationEmotions.includes(prevEmotion.emotion)) {
            const prevUid = prev.sender?.toString?.() || '';
            const pair = [uid, prevUid].sort().join(':');
            escalationPairCounts[pair] = (escalationPairCounts[pair] || 0) + 1;
          }
        }
      }
    }

    const toxicityScore = Math.min(100, Math.round((toxicCount / messages.length) * 100));

    const conflictPairs = [];

    for (const [pair, count] of Object.entries(escalationPairCounts)) {
      if (count >= 3) {
        const [u1, u2] = pair.split(':');
        conflictPairs.push({ user: u1, otherUser: u2 });
      }
    }

    for (const [uid, count] of Object.entries(toxicByUser)) {
      if (count >= 2) {
        let userObj = { id: uid, username: 'unknown' };
        try {
          const u = await User.findById(uid).select('username').lean();
          if (u) userObj = { id: u._id.toString(), username: u.username };
        } catch {}
        if (!conflictPairs.find(p => p.user === userObj.id)) {
          conflictPairs.push({ user: userObj.id, otherUser: '' });
        }
      }
    }

    const hasConflict = toxicityScore > 15 || conflictPairs.length > 0;
    let severity = 'none';
    if (toxicityScore > 40 || conflictPairs.length > 3) severity = 'high';
    else if (toxicityScore > 25 || conflictPairs.length > 1) severity = 'medium';
    else if (hasConflict) severity = 'low';

    let suggestion = '';
    if (severity === 'high') {
      suggestion = 'Consider moderator intervention. Rising toxicity detected in the group.';
    } else if (severity === 'medium') {
      suggestion = 'Monitor conversations between specific members showing emotional escalation.';
    } else if (severity === 'low') {
      suggestion = 'Minor tension detected. Gentle redirection may help.';
    }

    doc.health.toxicityScore = toxicityScore;
    doc.health.overallScore = Math.round(
      (doc.health.engagementScore + doc.health.participationScore + (100 - toxicityScore)) / 3
    );
    await doc.save().catch(() => {});

    const result = {
      hasConflict,
      severity,
      members: conflictPairs.slice(0, 10),
      suggestion,
    };

    await cacheService.set(cacheKey, result, 60);
    return result;
  }

  async generateMeetingNotes(chatId) {
    const cacheKey = `group:meeting_notes:${chatId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    backgroundWorker.enqueue('group_meeting_notes', { chatId, timestamp: Date.now() });

    const doc = this._initialized.get(chatId);
    const existingNotes = doc?.ai?.lastMeetingNotes;
    if (existingNotes?.content) {
      return {
        title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
        discussion: [],
        decisions: [],
        actionItems: [],
        outline: [],
        generatedAt: existingNotes.generatedAt || new Date(),
      };
    }

    const result = {
      title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
      discussion: [],
      decisions: [],
      actionItems: [],
      outline: [],
      generatedAt: new Date(),
    };

    await cacheService.set(cacheKey, result, 120);
    return result;
  }

  async _generateMeetingNotesWorker(task) {
    const { chatId } = task;
    try {
      const messages = await Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('sender', 'username')
        .lean();

      if (!messages?.length) return null;

      messages.reverse();

      const decisions = [];
      const actionItems = [];
      const decisionKeywords = ['decide', 'agreed', 'finalized', 'confirmed', 'decided', 'going with', 'let\'s do', 'we\'ll go'];
      const actionKeywords = ['will do', 'i\'ll handle', 'will take care', 'will look', 'going to', 'i will', 'assign', 'todo'];

      for (const m of messages) {
        const text = m.content || '';
        const sender = m.sender?.username || 'unknown';

        const lower = text.toLowerCase();
        for (const kw of decisionKeywords) {
          if (lower.includes(kw)) {
            decisions.push({
              text: text.slice(0, 120),
              by: sender,
              timestamp: m.createdAt,
            });
            break;
          }
        }

        for (const kw of actionKeywords) {
          if (lower.includes(kw)) {
            actionItems.push({
              text: text.slice(0, 120),
              assignee: sender,
              timestamp: m.createdAt,
            });
            break;
          }
        }
      }

      const timeBlocks = [];
      if (messages.length > 0) {
        const firstTime = messages[0].createdAt;
        const lastTime = messages[messages.length - 1].createdAt;
        timeBlocks.push({
          start: firstTime,
          end: lastTime,
          topic: 'Main Discussion',
          messages: messages.length,
        });
      }

      const discussionPoints = messages.map(m => ({
        time: m.createdAt,
        speaker: m.sender?.username || 'unknown',
        text: (m.content || '').slice(0, 150),
      }));

      const topicPoints = [];
      for (let i = 0; i < discussionPoints.length; i += 10) {
        const chunk = discussionPoints.slice(i, i + 10);
        if (chunk.length > 0) {
          topicPoints.push({
            time: chunk[0].time,
            participants: [...new Set(chunk.map(c => c.speaker))],
            keyPoints: chunk.slice(0, 3).map(c => c.text),
          });
        }
      }

      await GroupIntelligence.findOneAndUpdate(
        { chat: chatId },
        {
          'ai.lastMeetingNotes': {
            content: JSON.stringify({
              title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
              discussion: topicPoints,
              decisions: decisions.slice(0, 10),
              actionItems: actionItems.slice(0, 10),
              outline: timeBlocks,
              participantCount: [...new Set(messages.map(m => m.sender?.username))].length,
              messageCount: messages.length,
            }),
            generatedAt: new Date(),
          },
          'metadata.lastUpdated': new Date(),
        }
      );

      const result = {
        title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
        discussion: topicPoints,
        decisions: decisions.slice(0, 10),
        actionItems: actionItems.slice(0, 10),
        outline: timeBlocks,
        generatedAt: new Date(),
      };

      await cacheService.set(`group:meeting_notes:${chatId}`, result, 120);
      return result;
    } catch (err) {
      logger.error(`Meeting notes generation failed for ${chatId}`, { error: err.message });
      return null;
    }
  }

  async _detectConflictsWorker(task) {
    const { chatId } = task;
    try {
      return await this.detectConflicts(chatId);
    } catch (err) {
      logger.error(`Conflict detection worker failed for ${chatId}`, { error: err.message });
      return null;
    }
  }

  getCacheStats() {
    return {
      initialized: this._initialized.size,
      scheduled: this._scheduledSummaries.size,
    };
  }

  async clearCache(chatId) {
    if (chatId) {
      this._initialized.delete(chatId);
      if (this._scheduledSummaries.has(chatId)) {
        clearInterval(this._scheduledSummaries.get(chatId));
        this._scheduledSummaries.delete(chatId);
      }
      await cacheService.invalidate(`group:*:${chatId}`);
    } else {
      this._initialized.clear();
      for (const [chatId, interval] of this._scheduledSummaries) {
        clearInterval(interval);
      }
      this._scheduledSummaries.clear();
    }
  }
}

module.exports = new GroupIntelligenceEngine();