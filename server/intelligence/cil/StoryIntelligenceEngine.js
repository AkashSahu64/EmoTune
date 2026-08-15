const Story = require('../../domain/models/Story');
const StoryHighlight = require('../../domain/models/StoryHighlight');
const dnaEngine = require('../conversationDNAEngine');
const timeIntelligence = require('../timeIntelligence');
const cacheService = require('../../core/cacheService');
const backgroundWorker = require('../backgroundWorker');
const { logger } = require('../../core/logger');

const CAPTION_TEMPLATES = {
  morning: [
    { text: 'Rise and shine! New day, new vibes ☀️', confidence: 0.85, reason: 'morning_time' },
    { text: 'Good morning to everyone who matters ✨', confidence: 0.8, reason: 'morning_greeting' },
    { text: 'Today is going to be a good day, I can feel it', confidence: 0.75, reason: 'optimistic_morning' },
  ],
  afternoon: [
    { text: 'Afternoon vibes only 🌤️', confidence: 0.8, reason: 'afternoon_time' },
    { text: 'Half day done, time to recharge ⚡', confidence: 0.75, reason: 'afternoon_break' },
    { text: 'Making the most of this afternoon', confidence: 0.7, reason: 'productive_afternoon' },
  ],
  evening: [
    { text: 'Evening unwind mode activated 🌆', confidence: 0.85, reason: 'evening_time' },
    { text: 'Sunsets and good vibes only', confidence: 0.8, reason: 'sunset_vibe' },
    { text: 'That evening feeling when everything is peaceful', confidence: 0.75, reason: 'peaceful_evening' },
  ],
  night: [
    { text: 'Night owls unite 🌙', confidence: 0.85, reason: 'night_time' },
    { text: 'Late night thoughts hit different', confidence: 0.8, reason: 'late_night_reflection' },
    { text: 'Sleep is for the weak they said', confidence: 0.7, reason: 'night_owl' },
  ],
  dawn: [
    { text: 'Up before the world 🌅', confidence: 0.8, reason: 'dawn_early' },
    { text: 'Peaceful mornings, peaceful mind', confidence: 0.75, reason: 'dawn_peace' },
  ],
  celebratory: [
    { text: 'Celebrating the little things 🎉', confidence: 0.9, reason: 'celebration' },
    { text: 'This moment deserves to be captured', confidence: 0.85, reason: 'milestone' },
  ],
  reflective: [
    { text: 'Thinking about how far I have come', confidence: 0.8, reason: 'reflection' },
    { text: 'Some moments stay with you forever', confidence: 0.75, reason: 'nostalgic' },
  ],
  humorous: [
    { text: 'Plot twist: I actually did the thing', confidence: 0.8, reason: 'humor' },
    { text: 'My life in a nutshell 🥜', confidence: 0.75, reason: 'funny' },
  ],
  romantic: [
    { text: 'You, me, and this moment 💕', confidence: 0.85, reason: 'romantic_moment' },
    { text: 'Some hearts understand each other', confidence: 0.8, reason: 'heartfelt' },
  ],
  friendship: [
    { text: 'Real ones know 🤝', confidence: 0.85, reason: 'friendship' },
    { text: 'Surrounded by the best people', confidence: 0.8, reason: 'grateful_friends' },
  ],
  motivational: [
    { text: 'Trust the process 📈', confidence: 0.8, reason: 'motivation' },
    { text: 'Growth is not always visible but it is happening', confidence: 0.75, reason: 'self_growth' },
  ],
};

const MOOD_TAGS = {
  joyful: { emojis: ['🎉', '🎊', '✨', '🌟', '🥳'], colors: ['#FFD700', '#FFA500', '#FF69B4'], music: ['happy', 'upbeat', 'party'] },
  happy: { emojis: ['😊', '😄', '🌟', '☀️', '🌸'], colors: ['#FFE4B5', '#98FB98', '#87CEEB'], music: ['happy', 'cheerful', 'feel-good'] },
  romantic: { emojis: ['💕', '❤️', '🌹', '💋', '🥰'], colors: ['#FF69B4', '#FF1493', '#DC143C'], music: ['romantic', 'love', 'slow'] },
  sad: { emojis: ['💔', '😢', '🌧️', '🕯️', '🤧'], colors: ['#708090', '#A9A9A9', '#B0C4DE'], music: ['sad', 'melancholy', 'acoustic'] },
  energetic: { emojis: ['⚡', '🔥', '💪', '🚀', '🎯'], colors: ['#FF4500', '#FF6347', '#FF0000'], music: ['energetic', 'workout', 'dance'] },
  calm: { emojis: ['🌊', '🍃', '☁️', '🧘', '🕊️'], colors: ['#E0FFFF', '#B0E0E6', '#ADD8E6'], music: ['calm', 'meditation', 'ambient'] },
  grateful: { emojis: ['🙏', '💝', '🌸', '✨', '🌟'], colors: ['#FFDAB9', '#FFE4E1', '#FFF0F5'], music: ['grateful', 'inspirational', 'soft'] },
  excited: { emojis: ['🤩', '🔥', '🎯', '💥', '🎪'], colors: ['#FF1493', '#FF4500', '#FFD700'], music: ['exciting', 'party', 'upbeat'] },
  thoughtful: { emojis: ['🤔', '💭', '📝', '🧠', '✨'], colors: ['#E6E6FA', '#D8BFD8', '#C0C0C0'], music: ['thoughtful', 'instrumental', 'jazz'] },
};

const FONT_STYLES = [
  { name: 'Classic', style: 'serif' },
  { name: 'Modern', style: 'sans-serif' },
  { name: 'Elegant', style: 'cursive' },
  { name: 'Bold', style: 'impact' },
  { name: 'Playful', style: 'comic' },
  { name: 'Minimal', style: 'light' },
  { name: 'Vintage', style: 'retro' },
  { name: 'Handwritten', style: 'handwriting' },
];

const LAYOUT_STYLES = [
  { name: 'Full Screen', preview: 'full' },
  { name: 'Split Text', preview: 'split' },
  { name: 'Bottom Text', preview: 'bottom' },
  { name: 'Top Text', preview: 'top' },
  { name: 'Minimal', preview: 'minimal' },
  { name: 'Collage', preview: 'collage' },
  { name: 'Meme', preview: 'meme' },
  { name: 'Storybook', preview: 'storybook' },
];

const FILTER_STYLES = [
  { name: 'Warm Glow', mood: 'warm' },
  { name: 'Cool Breeze', mood: 'cool' },
  { name: 'Golden Hour', mood: 'warm' },
  { name: 'Noir', mood: 'dramatic' },
  { name: 'Pastel Dream', mood: 'soft' },
  { name: 'Vivid Pop', mood: 'energetic' },
  { name: 'Vintage', mood: 'nostalgic' },
  { name: 'B&W Classic', mood: 'dramatic' },
];

class StoryIntelligenceEngine {
  constructor() {
    this._initWorker();
  }

  _initWorker() {
    backgroundWorker.register('story:memory', async (task) => {
      return this.generateMemoryStory(task.userId);
    });
    backgroundWorker.register('story:analytics', async (task) => {
      return this._computeAnalytics(task.storyId);
    });
  }

  async getStorySuggestions(userId, context = {}) {
    const cacheKey = `story:suggestions:${userId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    let dna = null;
    try {
      dna = await dnaEngine.getRecommendationProfile(userId);
    } catch (err) {
      logger.warn('DNA unavailable for story suggestions', { userId, error: err.message });
    }

    const timeContext = timeIntelligence.getCurrentTimeContext(context.timezone);
    const partOfDay = timeContext.partOfDay || 'afternoon';
    const festival = timeContext.festival;
    const season = timeContext.season;
    const hour = timeContext.hour;

    let recentEmotion = null;
    try {
      const cil = require('./conversationIntelligenceLayer');
      const conversationIds = cil.getConversationIds();
      for (const chatId of conversationIds) {
        const profile = cil.getEmotionProfile(chatId);
        if (profile && profile.current) {
          recentEmotion = profile.current;
          break;
        }
      }
    } catch (err) {
      logger.warn('CIL unavailable for story suggestions', { error: err.message });
    }

    let recentChats = [];
    try {
      const Chat = require('../../models/Chat');
      recentChats = await Chat.find({ 'participants.user': userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('participants updatedAt')
        .lean();
    } catch (err) {
      logger.warn('Chats unavailable for story suggestions', { error: err.message });
    }

    const detectedMood = this._detectMood(dna, recentEmotion, timeContext);
    const theme = festival
      ? { name: festival.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), type: 'festival' }
      : this._getSeasonalTheme(season);

    const captions = this._generateCaptions(partOfDay, detectedMood);
    const hashtags = this._generateHashtags(dna, detectedMood, timeContext);
    const emojis = this._suggestEmojis(detectedMood, timeContext, dna);
    const music = this._suggestMusic(detectedMood, dna);
    const stickers = this._suggestStickers(detectedMood, dna);
    const backgrounds = this._suggestBackgrounds(detectedMood, timeContext);
    const fonts = this._suggestFonts(detectedMood);
    const layouts = this._suggestLayouts(detectedMood);
    const filters = this._suggestFilters(detectedMood);

    const bestTime = {
      hour: hour,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][timeContext.dayOfWeek],
      reason: timeContext.festival
        ? `Great time to post during ${festival} celebrations!`
        : timeContext.partOfDay === 'evening' || timeContext.partOfDay === 'night'
          ? 'Evenings have highest engagement rates'
          : 'Good time to share your moment',
    };

    const privacy = {
      recommended: dna && dna.writingStyle?.romantic > 0.6 ? 'close_friends' : 'public',
      reason: dna && dna.writingStyle?.romantic > 0.6
        ? 'Personal moments are best shared with close friends'
        : 'Public stories get more engagement',
    };

    const suggestions = {
      captions,
      hashtags,
      emojis,
      music,
      stickers,
      backgrounds,
      fonts,
      layouts,
      filters,
      mood: { detected: detectedMood.emotion, confidence: detectedMood.confidence },
      theme,
      bestTime,
      privacy,
    };

    await cacheService.set(cacheKey, suggestions, 300);

    logger.info('Story suggestions generated', {
      userId,
      mood: detectedMood.emotion,
      theme: theme.name,
      time: Date.now() - startTime,
    });

    return suggestions;
  }

  async createStory(userId, storyData) {
    const startTime = Date.now();

    const validatedAudience = storyData.audience || { type: 'public' };
    if (!['public', 'close_friends', 'custom', 'private'].includes(validatedAudience.type)) {
      validatedAudience.type = 'public';
    }

    const expiresAt = storyData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

    let aiMetadata = null;
    if (storyData.aiGenerated) {
      aiMetadata = {
        prompt: storyData.aiGenerated.prompt || '',
        caption: storyData.aiGenerated.caption || '',
        hashtags: storyData.aiGenerated.hashtags || [],
        suggestedMusic: storyData.aiGenerated.suggestedMusic || '',
        suggestedEmojis: storyData.aiGenerated.suggestedEmojis || [],
        confidence: storyData.aiGenerated.confidence || 0,
      };
    }

    const story = await Story.create({
      user: userId,
      type: storyData.type || 'image',
      content: {
        text: storyData.content?.text,
        caption: storyData.content?.caption,
        mediaUrl: storyData.content?.mediaUrl,
        mediaType: storyData.content?.mediaType,
        backgroundColor: storyData.content?.backgroundColor,
        font: storyData.content?.font,
        fontSize: storyData.content?.fontSize,
        textPosition: storyData.content?.textPosition,
        musicUrl: storyData.content?.musicUrl,
        musicTitle: storyData.content?.musicTitle,
        images: storyData.content?.images || [],
        stickers: storyData.content?.stickers || [],
        emojis: storyData.content?.emojis || [],
        gifUrl: storyData.content?.gifUrl,
        filterName: storyData.content?.filterName,
        layout: storyData.content?.layout,
        mood: storyData.content?.mood,
        theme: storyData.content?.theme,
      },
      aiGenerated: aiMetadata,
      audience: validatedAudience,
      tags: storyData.tags || [],
      mentions: storyData.mentions || [],
      location: storyData.location,
      expiresAt,
      isDraft: storyData.isDraft || false,
      isArchived: false,
      template: storyData.template || '',
    });

    try {
      await this._incrementAnalyticsCounter(userId, 'stories_created');
    } catch (err) {
      logger.warn('Failed to update analytics counters', { userId, error: err.message });
    }

    try {
      const audienceIds = this._resolveAudience(validatedAudience, userId);
      for (const targetId of audienceIds) {
        this._emitSocketEvent(targetId, 'story:new', { story, userId });
      }
    } catch (err) {
      logger.warn('Failed to emit socket events for story', { storyId: story._id, error: err.message });
    }

    logger.info('Story created', {
      storyId: story._id,
      userId,
      type: story.type,
      audience: validatedAudience.type,
      time: Date.now() - startTime,
    });

    return story;
  }

  async getFeed(userId, options = {}) {
    const cacheKey = `story:feed:${userId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    let myStories = [];
    let friendStories = [];
    let memoryStories = [];
    let suggestedStories = [];
    let trending = [];

    try {
      const now = new Date();
      myStories = await Story.find({
        user: userId,
        expiresAt: { $gt: now },
        isArchived: false,
        isDraft: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const friendUserIds = await this._getFriendUserIds(userId);

      const friendStoryDocs = await Story.find({
        user: { $in: friendUserIds },
        expiresAt: { $gt: now },
        isArchived: false,
        isDraft: false,
        $or: [
          { 'audience.type': 'public' },
          { 'audience.type': 'close_friends' },
          { 'audience.type': 'custom', 'audience.allowedUsers': userId },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();

      const grouped = {};
      for (const story of friendStoryDocs) {
        const uid = story.user.toString();
        if (!grouped[uid]) grouped[uid] = [];
        grouped[uid].push(story);
      }

      for (const [uid, stories] of Object.entries(grouped)) {
        const hasUnviewed = stories.some(s => {
          const views = s.metadata?.viewDetails || [];
          return !views.some(v => v.user?.toString() === userId);
        });
        friendStories.push({
          user: uid,
          stories,
          hasUnviewed,
        });
      }

      friendStories.sort((a, b) => {
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        return 0;
      });

      const highlights = await StoryHighlight.find({
        user: userId,
        isArchived: false,
      })
        .sort({ order: 1 })
        .lean();

      const highlightStoryIds = highlights.flatMap(h => h.stories.map(s => s.toString()));
      myStories = myStories.map(story => ({
        ...story,
        isHighlighted: highlightStoryIds.includes(story._id.toString()),
      }));

      memoryStories = await this._getMemoryFeedItems(userId, options);

      suggestedStories = await this._getSuggestedStories(userId, friendUserIds);

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const trendingStories = await Story.find({
        expiresAt: { $gt: now },
        isArchived: false,
        isDraft: false,
        'audience.type': 'public',
        createdAt: { $gt: sixHoursAgo },
      })
        .sort({ 'metadata.views': -1 })
        .limit(10)
        .select('tags metadata.views')
        .lean();

      const tagCounts = {};
      for (const story of trendingStories) {
        for (const tag of story.tags || []) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      trending = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([hashtag, count]) => ({ hashtag, count }));
    } catch (err) {
      logger.error('Failed to generate feed', { userId, error: err.message });
    }

    const feed = {
      myStories,
      friendStories,
      memoryStories,
      suggestedStories,
      trending,
    };

    await cacheService.set(cacheKey, feed, 30);

    logger.info('Feed generated', {
      userId,
      myStories: myStories.length,
      friendStories: friendStories.length,
      memoryStories: memoryStories.length,
      time: Date.now() - startTime,
    });

    return feed;
  }

  async generateMemoryStory(userId) {
    try {
      const now = new Date();
      const intervals = [
        { label: 'today', days: 0 },
        { label: '1_week_ago', days: 7 },
        { label: '1_month_ago', days: 30 },
        { label: '1_year_ago', days: 365 },
      ];

      const memoryItems = [];
      const Message = require('../../models/Message');

      for (const interval of intervals) {
        const start = new Date(now);
        start.setDate(start.getDate() - interval.days);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        if (interval.days > 0) {
          start.setDate(start.getDate());
          end.setDate(end.getDate());
        }

        const messages = await Message.find({
          sender: userId,
          createdAt: { $gte: start, $lte: end },
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('content type metadata createdAt')
          .lean();

        if (messages.length > 0) {
          const textContent = messages
            .filter(m => m.content && m.type === 'text')
            .map(m => m.content)
            .join(' ');

          if (textContent.length > 20) {
            memoryItems.push({
              interval: interval.label,
              date: start,
              messages: messages.length,
              summary: this._summarizeText(textContent),
              preview: textContent.slice(0, 100),
            });
          }
        }
      }

      if (memoryItems.length === 0) return null;

      const topItem = memoryItems.reduce((a, b) => a.messages > b.messages ? a : b);
      const mood = this._detectMoodFromText(topItem.summary);

      const story = await Story.create({
        user: userId,
        type: 'memory',
        content: {
          text: topItem.summary,
          caption: this._formatMemoryCaption(topItem),
          mood: mood.emotion,
          emojis: mood.emojis.slice(0, 3).map(e => ({ emoji: e, position: { x: 50, y: 50 }, size: 24 })),
        },
        aiGenerated: {
          prompt: `Memory story from ${topItem.interval.replace(/_/g, ' ')}`,
          caption: topItem.summary,
          hashtags: [`#memory`, `#throwback`, `#${topItem.interval}`],
          suggestedMusic: mood.music[0] || '',
          suggestedEmojis: mood.emojis.slice(0, 5),
          confidence: 0.7,
        },
        audience: { type: 'close_friends' },
        tags: ['memory', 'auto_generated', topItem.interval],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      logger.info('Memory story generated', {
        userId,
        storyId: story._id,
        interval: topItem.interval,
        messages: topItem.messages,
      });

      return story;
    } catch (err) {
      logger.error('Failed to generate memory story', { userId, error: err.message });
      return null;
    }
  }

  async scheduleMemoryStories(userId) {
    const now = new Date();
    const schedules = [
      { name: 'daily_highlight', days: 1, label: 'Today' },
      { name: 'weekly_memory', days: 7, label: 'Last Week' },
      { name: 'monthly_memory', days: 30, label: 'Last Month' },
      { name: 'yearly_memory', days: 365, label: 'This Day Last Year' },
    ];

    for (const schedule of schedules) {
      try {
        const start = new Date(now);
        start.setDate(start.getDate() - schedule.days);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        if (schedule.days > 1) {
          end.setDate(start.getDate() + 1);
        }

        const Message = require('../../models/Message');
        const messageCount = await Message.countDocuments({
          sender: userId,
          createdAt: { $gte: start, $lte: end },
        });

        if (messageCount >= 3) {
          backgroundWorker.enqueue('story:memory', {
            userId,
            schedule: schedule.name,
            from: start,
            to: end,
          });
          logger.info('Memory story scheduled', { userId, schedule: schedule.name, messages: messageCount });
        }
      } catch (err) {
        logger.warn('Failed to schedule memory story', {
          userId,
          schedule: schedule.name,
          error: err.message,
        });
      }
    }
  }

  async getAnalytics(storyId) {
    const cacheKey = `story:analytics:${storyId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const story = await Story.findById(storyId).lean();
      if (!story) return null;

      const meta = story.metadata || {};
      const viewDetails = meta.viewDetails || [];
      const reactions = meta.reactions || [];

      const uniqueViewers = new Set(viewDetails.map(v => v.user?.toString()));
      const completedViews = viewDetails.filter(v => v.completed);
      const totalDuration = viewDetails.reduce((sum, v) => sum + (v.duration || 0), 0);

      const reactionCounts = {};
      for (const r of reactions) {
        const emoji = r.emoji || '❤️';
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      }

      const hourBuckets = {};
      for (const v of viewDetails) {
        if (v.viewedAt) {
          const h = new Date(v.viewedAt).getHours();
          hourBuckets[h] = (hourBuckets[h] || 0) + 1;
        }
      }

      const viewsOverTime = Object.entries(hourBuckets)
        .map(([hour, count]) => ({ hour: Number(hour), count }))
        .sort((a, b) => a.hour - b.hour);

      const analytics = {
        views: meta.views || 0,
        uniqueViewers: uniqueViewers.size,
        completionRate: viewDetails.length > 0 ? completedViews.length / viewDetails.length : 0,
        avgViewDuration: viewDetails.length > 0 ? totalDuration / viewDetails.length : 0,
        reactions: Object.entries(reactionCounts).map(([emoji, count]) => ({ emoji, count })),
        replies: (meta.replies || []).length,
        engagement: meta.engagement || 0,
        viewsOverTime,
        audienceDemographic: {
          totalViewers: uniqueViewers.size,
          peakHour: viewsOverTime.length > 0
            ? viewsOverTime.reduce((a, b) => a.count > b.count ? a : b).hour
            : null,
        },
      };

      await cacheService.set(cacheKey, analytics, 300);
      return analytics;
    } catch (err) {
      logger.error('Failed to get analytics', { storyId, error: err.message });
      return null;
    }
  }

  async createHighlight(userId, name, storyIds) {
    const stories = await Story.find({ _id: { $in: storyIds }, user: userId });
    if (stories.length === 0) throw new Error('No valid stories to highlight');

    const coverMedia = stories[0].content?.mediaUrl || stories[0].content?.backgroundColor || '#6366f1';

    const highlight = await StoryHighlight.create({
      user: userId,
      name,
      coverMedia,
      stories: storyIds,
      color: '#6366f1',
      order: 0,
    });

    await Story.updateMany(
      { _id: { $in: storyIds } },
      { $push: { highlights: { highlightId: highlight._id, addedAt: new Date() } } },
    );

    logger.info('Highlight created', { userId, highlightId: highlight._id, name, storyCount: storyIds.length });

    return highlight;
  }

  async getHighlights(userId) {
    const cacheKey = `story:highlights:${userId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const highlights = await StoryHighlight.find({ user: userId, isArchived: false })
      .sort({ order: 1 })
      .populate('stories', 'content mediaUrl type createdAt')
      .lean();

    await cacheService.set(cacheKey, highlights, 60);
    return highlights;
  }

  async processStoryReaction(storyId, userId, emoji) {
    const story = await Story.findById(storyId);
    if (!story) throw new Error('Story not found');

    if (!story.metadata) story.metadata = {};
    if (!story.metadata.reactions) story.metadata.reactions = [];

    const existingIndex = story.metadata.reactions.findIndex(
      r => r.user?.toString() === userId && r.emoji === emoji
    );

    if (existingIndex >= 0) {
      story.metadata.reactions.splice(existingIndex, 1);
    } else {
      story.metadata.reactions.push({ emoji, user: userId, createdAt: new Date() });
    }

    story.metadata.engagement = (story.metadata.engagement || 0) + 1;
    await story.save();

    logger.info('Story reaction processed', { storyId, userId, emoji });

    return { reacted: existingIndex < 0, emoji };
  }

  async deleteExpiredStories() {
    const now = new Date();
    const result = await Story.deleteMany({ expiresAt: { $lte: now } });

    if (result.deletedCount > 0) {
      logger.info('Expired stories deleted', { count: result.deletedCount });
    }

    return result;
  }

  async getTrendingStories(limit = 10) {
    const cacheKey = `story:trending`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const now = new Date();

    const stories = await Story.find({
      expiresAt: { $gt: now },
      isArchived: false,
      isDraft: false,
      'audience.type': 'public',
      createdAt: { $gt: sixHoursAgo },
    })
      .sort({ 'metadata.views': -1, 'metadata.engagement': -1 })
      .limit(limit)
      .populate('user', 'name avatar')
      .lean();

    const trending = stories.map(story => {
      const meta = story.metadata || {};
      const reactions = meta.reactions || [];
      const reactionCount = reactions.length;
      return {
        ...story,
        trendingScore: (meta.views || 0) * 1 + reactionCount * 3 + (meta.engagement || 0) * 2,
      };
    });

    trending.sort((a, b) => b.trendingScore - a.trendingScore);

    await cacheService.set(cacheKey, trending, 60);
    return trending;
  }

  async generateStoryFromMemory(memoryItems, userId) {
    if (!memoryItems || memoryItems.length === 0) return null;

    const mood = this._detectMoodFromMemoryItems(memoryItems);

    const images = memoryItems
      .filter(item => item.type === 'photo' || item.type === 'image')
      .map((item, index) => ({
        url: item.url || item.mediaUrl || '',
        caption: item.caption || this._generateImageCaption(item, index),
        order: index,
      }));

    const textParts = memoryItems
      .filter(item => item.content || item.text)
      .map(item => item.content || item.text);

    const combinedText = textParts.join(' ');
    const mainCaption = combinedText.length > 0
      ? this._summarizeText(combinedText)
      : this._formatMemoryCaption({ interval: 'custom', messages: memoryItems.length, summary: '' });

    const story = await Story.create({
      user: userId,
      type: images.length > 1 ? 'multi_image' : images.length === 1 ? 'image' : 'text',
      content: {
        text: mainCaption,
        caption: mainCaption,
        images: images.length > 0 ? images : undefined,
        mood: mood.emotion,
        emojis: mood.emojis.slice(0, 3).map(e => ({ emoji: e, position: { x: 50, y: 80 }, size: 24 })),
      },
      aiGenerated: {
        prompt: 'Generated from memory items',
        caption: mainCaption,
        hashtags: ['#memory', '#throwback', '#story'],
        suggestedMusic: mood.music[0] || '',
        suggestedEmojis: mood.emojis.slice(0, 5),
        confidence: 0.75,
      },
      audience: { type: 'close_friends' },
      tags: ['memory', 'generated'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    logger.info('Story generated from memory', {
      userId,
      storyId: story._id,
      itemCount: memoryItems.length,
      type: story.type,
    });

    return story;
  }

  _generateCaptions(partOfDay, mood) {
    const templates = [];

    const timeCaptions = CAPTION_TEMPLATES[partOfDay] || CAPTION_TEMPLATES.afternoon;
    templates.push(...timeCaptions);

    const moodKey = mood?.emotion;
    if (moodKey === 'happy' || moodKey === 'joyful') {
      templates.push(...CAPTION_TEMPLATES.celebratory);
    } else if (moodKey === 'romantic' || moodKey === 'loved') {
      templates.push(...CAPTION_TEMPLATES.romantic);
    } else if (moodKey === 'sad' || moodKey === 'thoughtful') {
      templates.push(...CAPTION_TEMPLATES.reflective);
    } else if (moodKey === 'grateful') {
      templates.push(...CAPTION_TEMPLATES.friendship);
    } else if (moodKey === 'excited' || moodKey === 'energetic') {
      templates.push(...CAPTION_TEMPLATES.motivational);
    }

    if (partOfDay === 'night' || partOfDay === 'evening') {
      templates.push({ text: 'POV: You are living your best life ✨', confidence: 0.7, reason: 'pov_style' });
      templates.push({ text: 'Core memory unlocked 🔓', confidence: 0.75, reason: 'memory_unlocked' });
    }

    return templates.slice(0, 5);
  }

  _generateHashtags(dna, mood, timeContext) {
    const tags = [];
    const base = ['#story', '#vibes', '#mood'];

    if (mood?.emotion) {
      base.push(`#${mood.emotion}`, `#${mood.emotion}vibes`);
    }
    if (timeContext.partOfDay) {
      base.push(`#${timeContext.partOfDay}`, `#${timeContext.partOfDay}vibes`);
    }
    if (timeContext.festival) {
      base.push(`#${timeContext.festival}`, `#${timeContext.festival}celebrations`);
    }
    if (timeContext.season) {
      base.push(`#${timeContext.season}`, `#${timeContext.season}vibes`);
    }
    if (dna?.topTopics) {
      for (const topic of dna.topTopics) {
        base.push(`#${topic.replace(/\s+/g, '_')}`);
      }
    }

    const seen = new Set();
    for (const tag of base) {
      const normalized = tag.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        tags.push({ tag: normalized, relevance: tags.length === 0 ? 1 : Math.max(0.3, 1 - tags.length * 0.1) });
      }
    }

    return tags.slice(0, 10);
  }

  _suggestEmojis(mood, timeContext, dna) {
    const emojis = [];

    if (mood?.emotion && MOOD_TAGS[mood.emotion]) {
      emojis.push(...MOOD_TAGS[mood.emotion].emojis);
    }

    if (timeContext.festival) {
      const festivalContent = timeIntelligence.getFestivalSuggestions(timeContext.festival);
      if (festivalContent?.emojis) {
        emojis.push(...festivalContent.emojis.slice(0, 3));
      }
    }

    if (dna?.topEmojis) {
      for (const emoji of dna.topEmojis) {
        if (!emojis.includes(emoji)) emojis.push(emoji);
      }
    }

    const timeEmojis = timeIntelligence.getTimeBasedEmojis(timeContext.partOfDay);
    for (const emoji of timeEmojis) {
      if (!emojis.includes(emoji)) emojis.push(emoji);
    }

    return [...new Set(emojis)].slice(0, 8);
  }

  _suggestMusic(mood, dna) {
    const suggestions = [];

    if (mood?.emotion && MOOD_TAGS[mood.emotion]) {
      for (const genre of MOOD_TAGS[mood.emotion].music) {
        suggestions.push({ title: `${genre} mix`, artist: 'AI Suggested', mood: mood.emotion });
      }
    } else {
      suggestions.push({ title: 'Chill Vibes', artist: 'AI Suggested', mood: 'neutral' });
      suggestions.push({ title: 'Feel Good', artist: 'AI Suggested', mood: 'happy' });
    }

    if (dna?.writingStyle?.romantic > 0.5) {
      suggestions.push({ title: 'Romantic Melody', artist: 'AI Suggested', mood: 'romantic' });
    }
    if (dna?.writingStyle?.humor > 0.5) {
      suggestions.push({ title: 'Fun Tunes', artist: 'AI Suggested', mood: 'humorous' });
    }

    return suggestions.slice(0, 3);
  }

  _suggestStickers(mood, dna) {
    const categories = ['happy', 'celebration', 'love', 'sad', 'cool'];
    const suggestions = [];

    let cat = 'happy';
    if (mood?.emotion && MOOD_TAGS[mood.emotion]) {
      cat = mood.emotion;
    }

    const stickerIds = [`sticker_${cat}_1`, `sticker_${cat}_2`, `sticker_${cat}_3`];
    for (const id of stickerIds) {
      suggestions.push({ id, url: `/stickers/${id}.png`, category: cat });
    }

    if (dna?.topTopics) {
      for (const topic of dna.topTopics.slice(0, 2)) {
        suggestions.push({ id: `sticker_${topic}_1`, url: `/stickers/${topic}_1.png`, category: topic });
      }
    }

    return suggestions.slice(0, 5);
  }

  _suggestBackgrounds(mood, timeContext) {
    const suggestions = [];

    if (mood?.emotion && MOOD_TAGS[mood.emotion]) {
      for (const color of MOOD_TAGS[mood.emotion].colors) {
        suggestions.push({
          color,
          gradient: `linear-gradient(135deg, ${color}, ${this._adjustColor(color, -30)})`,
          mood: mood.emotion,
        });
      }
    }

    if (timeContext.partOfDay === 'night') {
      suggestions.push({ color: '#0F0F2D', gradient: 'linear-gradient(135deg, #0F0F2D, #1A1A3E)', mood: 'night' });
      suggestions.push({ color: '#1C1C3A', gradient: 'linear-gradient(135deg, #1C1C3A, #2D2D5E)', mood: 'calm' });
    }
    if (timeContext.partOfDay === 'morning' || timeContext.partOfDay === 'dawn') {
      suggestions.push({ color: '#FFE4B5', gradient: 'linear-gradient(135deg, #FFE4B5, #FFDAB9)', mood: 'warm' });
      suggestions.push({ color: '#87CEEB', gradient: 'linear-gradient(135deg, #87CEEB, #B0E0E6)', mood: 'fresh' });
    }

    if (timeContext.festival) {
      const festivalContent = timeIntelligence.getFestivalSuggestions(timeContext.festival);
      if (festivalContent?.theme) {
        suggestions.push({
          color: '#FFD700',
          gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
          mood: festivalContent.theme,
        });
      }
    }

    return [...new Map(suggestions.map(s => [s.color, s])).values()].slice(0, 5);
  }

  _suggestFonts(mood) {
    if (mood?.emotion === 'romantic' || mood?.emotion === 'loved') {
      return FONT_STYLES.filter(f => f.style === 'cursive' || f.style === 'serif');
    }
    if (mood?.emotion === 'energetic' || mood?.emotion === 'excited') {
      return FONT_STYLES.filter(f => f.style === 'impact' || f.style === 'comic');
    }
    if (mood?.emotion === 'sad' || mood?.emotion === 'thoughtful') {
      return FONT_STYLES.filter(f => f.style === 'serif' || f.style === 'handwriting');
    }
    return FONT_STYLES.slice(0, 4);
  }

  _suggestLayouts(mood) {
    if (mood?.emotion === 'romantic') {
      return LAYOUT_STYLES.filter(l => l.preview === 'full' || l.preview === 'minimal');
    }
    if (mood?.emotion === 'energetic' || mood?.emotion === 'excited') {
      return LAYOUT_STYLES.filter(l => l.preview === 'collage' || l.preview === 'meme');
    }
    return LAYOUT_STYLES.slice(0, 4);
  }

  _suggestFilters(mood) {
    if (mood?.emotion === 'romantic' || mood?.emotion === 'happy') {
      return FILTER_STYLES.filter(f => f.mood === 'warm' || f.mood === 'soft');
    }
    if (mood?.emotion === 'sad' || mood?.emotion === 'thoughtful') {
      return FILTER_STYLES.filter(f => f.mood === 'nostalgic' || f.mood === 'dramatic');
    }
    if (mood?.emotion === 'energetic') {
      return FILTER_STYLES.filter(f => f.mood === 'energetic' || f.mood === 'cool');
    }
    return FILTER_STYLES.slice(0, 4);
  }

  _detectMood(dna, recentEmotion, timeContext) {
    if (recentEmotion?.emotion && recentEmotion.confidence > 0.5) {
      return { emotion: recentEmotion.emotion, confidence: recentEmotion.confidence };
    }

    if (dna?.writingStyle) {
      const ws = dna.writingStyle;
      if (ws.romantic > 0.6) return { emotion: 'romantic', confidence: ws.romantic };
      if (ws.humor > 0.6) return { emotion: 'joyful', confidence: ws.humor };
      if (ws.positivity > 0.7) return { emotion: 'happy', confidence: ws.positivity };
      if (ws.creativity > 0.6) return { emotion: 'thoughtful', confidence: ws.creativity };
    }

    if (timeContext.festival) {
      const festivalContent = timeIntelligence.getFestivalSuggestions(timeContext.festival);
      if (festivalContent?.theme === 'romantic') return { emotion: 'romantic', confidence: 0.7 };
      if (festivalContent?.theme === 'celebration') return { emotion: 'joyful', confidence: 0.7 };
      if (festivalContent?.theme === 'festive') return { emotion: 'happy', confidence: 0.7 };
    }

    if (timeContext.partOfDay === 'morning' || timeContext.partOfDay === 'dawn') {
      return { emotion: 'energetic', confidence: 0.5 };
    }
    if (timeContext.partOfDay === 'night') {
      return { emotion: 'calm', confidence: 0.5 };
    }
    if (timeContext.partOfDay === 'evening') {
      return { emotion: 'thoughtful', confidence: 0.5 };
    }

    return { emotion: 'happy', confidence: 0.4 };
  }

  _getSeasonalTheme(season) {
    const themes = {
      spring: { name: 'Spring Bloom', type: 'seasonal' },
      summer: { name: 'Summer Vibes', type: 'seasonal' },
      fall: { name: 'Fall Colors', type: 'seasonal' },
      winter: { name: 'Winter Magic', type: 'seasonal' },
    };
    return themes[season] || { name: 'General', type: 'default' };
  }

  _detectMoodFromText(text) {
    if (!text) return { emotion: 'neutral', emojis: ['✨'], colors: ['#E6E6FA'], music: ['ambient'] };

    const lower = text.toLowerCase();
    const moodPatterns = [
      { emotion: 'joyful', words: ['happy', 'amazing', 'wonderful', 'great', 'love', 'beautiful', 'fantastic'], confidence: 0.8 },
      { emotion: 'sad', words: ['sad', 'miss', 'cry', 'heartbreak', 'lonely', 'pain', 'hurt'], confidence: 0.8 },
      { emotion: 'romantic', words: ['love', 'heart', 'beautiful', 'together', 'forever', 'us'], confidence: 0.8 },
      { emotion: 'energetic', words: ['excited', 'pumped', 'energy', 'lets go', 'hype', 'ready'], confidence: 0.7 },
      { emotion: 'grateful', words: ['grateful', 'thankful', 'blessed', 'appreciate', 'lucky'], confidence: 0.8 },
      { emotion: 'thoughtful', words: ['think', 'wonder', 'maybe', 'perhaps', 'reflect', 'question'], confidence: 0.7 },
    ];

    let best = null;
    let maxScore = 0;

    for (const pattern of moodPatterns) {
      const score = pattern.words.filter(w => lower.includes(w)).length / pattern.words.length;
      if (score > maxScore) {
        maxScore = score;
        best = pattern;
      }
    }

    if (best && maxScore > 0.1) {
      const data = MOOD_TAGS[best.emotion] || MOOD_TAGS.happy;
      return { emotion: best.emotion, confidence: best.confidence, ...data };
    }

    return { emotion: 'neutral', emojis: ['✨'], colors: ['#E6E6FA'], music: ['ambient'] };
  }

  _detectMoodFromMemoryItems(items) {
    const textParts = items
      .filter(i => i.content || i.text || i.caption)
      .map(i => i.content || i.text || i.caption);
    const combined = textParts.join(' ');
    return combined ? this._detectMoodFromText(combined) : { emotion: 'grateful', emojis: ['💝'], colors: ['#FFDAB9'], music: ['soft'] };
  }

  _summarizeText(text) {
    if (!text) return '';
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 20) return text;

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'shall',
      'should', 'may', 'might', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them',
    ]);

    const wordFreq = {};
    const wordOrder = [];
    for (const word of words) {
      const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (w && !stopWords.has(w) && w.length > 2) {
        if (!wordFreq[w]) {
          wordFreq[w] = 0;
          wordOrder.push(w);
        }
        wordFreq[w]++;
      }
    }

    const sorted = wordOrder.sort((a, b) => wordFreq[b] - wordFreq[a]);
    const topWords = new Set(sorted.slice(0, 5));

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let summary = '';
    let wordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.split(/\s+/).filter(Boolean);
      let score = 0;
      for (const w of sentenceWords) {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (topWords.has(clean)) score++;
      }

      if (score >= 1 || summary === '') {
        summary += sentence + ' ';
        wordCount += sentenceWords.length;
        if (wordCount >= 40) break;
      }
    }

    return summary.trim() || text.slice(0, 200);
  }

  _formatMemoryCaption(item) {
    const labels = {
      today: 'Today',
      '1_week_ago': 'One week ago',
      '1_month_ago': 'One month ago',
      '1_year_ago': 'One year ago',
    };
    const label = labels[item.interval] || 'Sometime ago';
    return `${label} · ${item.messages} messages shared`;
  }

  _generateImageCaption(item, index) {
    const captions = ['A moment to remember', 'Capturing the vibe', 'This one is special', 'Memory unlocked', 'Good times'];
    return item.caption || captions[index % captions.length];
  }

  _adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  async _getMemoryFeedItems(userId, options) {
    try {
      const now = new Date();
      return await Story.find({
        user: userId,
        type: 'memory',
        expiresAt: { $gt: now },
        isArchived: false,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    } catch {
      return [];
    }
  }

  async _getSuggestedStories(userId, friendIds) {
    try {
      const now = new Date();
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      const stories = await Story.aggregate([
        {
          $match: {
            user: { $nin: [userId, ...friendIds] },
            expiresAt: { $gt: now },
            isArchived: false,
            isDraft: false,
            'audience.type': 'public',
            createdAt: { $gt: sixHoursAgo },
          },
        },
        { $sort: { 'metadata.views': -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData',
          },
        },
        { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            user: { _id: '$userData._id', name: '$userData.name', avatar: '$userData.avatar' },
            reason: { $literal: 'Trending story you might like' },
            preview: { $ifNull: ['$content.caption', '$content.text', ''] },
          },
        },
      ]);

      return stories;
    } catch {
      return [];
    }
  }

  async _getFriendUserIds(userId) {
    try {
      const Chat = require('../../models/Chat');
      const chats = await Chat.find({ 'participants.user': userId })
        .select('participants')
        .lean();

      const ids = new Set();
      for (const chat of chats) {
        for (const p of chat.participants) {
          const pid = (p.user || p).toString();
          if (pid !== userId) ids.add(pid);
        }
      }
      return Array.from(ids);
    } catch {
      return [];
    }
  }

  _resolveAudience(audience, userId) {
    if (audience.type === 'public') return [];
    if (audience.type === 'close_friends') {
      return this._getFriendUserIds(userId);
    }
    if (audience.type === 'custom') {
      return audience.allowedUsers || [];
    }
    return [];
  }

  async _incrementAnalyticsCounter(userId, metric) {
    try {
      const User = require('../../domain/models/User');
      await User.findByIdAndUpdate(userId, { $inc: { [`analytics.${metric}`]: 1 } });
    } catch (err) {
      logger.warn('Failed to increment analytics', { userId, metric, error: err.message });
    }
  }

  _emitSocketEvent(userId, event, data) {
    try {
      const io = require('../../core/socket');
      if (io && io.to) {
        io.to(userId.toString()).emit(event, data);
      }
    } catch (err) {
      logger.debug('Socket unavailable for event', { event, userId, error: err.message });
    }
  }

  async _computeAnalytics(storyId) {
    return this.getAnalytics(storyId);
  }
}

module.exports = new StoryIntelligenceEngine();
