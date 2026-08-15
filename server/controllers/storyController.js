const Story = require('../domain/models/Story');
const StoryHighlight = require('../domain/models/StoryHighlight');
const Message = require('../models/Message');
const storyIntelligence = require('../intelligence/cil/StoryIntelligenceEngine');
const logger = require('../utils/logger');

exports.createStory = async (req, res) => {
  try {
    const { type, content, audience, tags, mentions, location, scheduling, template } = req.body;
    const story = await storyIntelligence.createStory(req.userId, {
      type, content, audience, tags, mentions, location, scheduling, template,
    });
    res.status(201).json({ story });
  } catch (error) {
    logger.error('Create story error', { error: error.message });
    res.status(500).json({ error: 'Failed to create story' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const feed = await storyIntelligence.getFeed(req.userId, req.query);
    res.json({ feed });
  } catch (error) {
    logger.error('Get feed error', { error: error.message });
    res.status(500).json({ error: 'Failed to get feed' });
  }
};

exports.getStorySuggestions = async (req, res) => {
  try {
    const suggestions = await storyIntelligence.getStorySuggestions(req.userId, req.query);
    res.json({ suggestions });
  } catch (error) {
    logger.error('Get story suggestions error', { error: error.message });
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

exports.getStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('user', 'username avatar')
      .populate('mentions.user', 'username avatar')
      .lean();
    if (!story) return res.status(404).json({ error: 'Story not found' });

    if (story.user._id.toString() === req.userId.toString()) {
      const analytics = await storyIntelligence.getAnalytics(req.params.id);
      story.analytics = analytics;
    }

    res.json({ story });
  } catch (error) {
    logger.error('Get story error', { error: error.message });
    res.status(500).json({ error: 'Failed to get story' });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, user: req.userId });
    if (!story) return res.status(404).json({ error: 'Story not found or not authorized' });

    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: 'Story deleted' });
  } catch (error) {
    logger.error('Delete story error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete story' });
  }
};

exports.viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    if (!story.metadata) story.metadata = {};
    if (!story.metadata.viewDetails) story.metadata.viewDetails = [];

    const existingView = story.metadata.viewDetails.find(
      v => v.user?.toString() === req.userId.toString()
    );

    if (!existingView) {
      story.metadata.viewDetails.push({
        user: req.userId,
        viewedAt: new Date(),
        completed: req.body?.completed || false,
        duration: req.body?.duration || 0,
      });
      story.metadata.views = (story.metadata.views || 0) + 1;
      story.metadata.viewCount = (story.metadata.viewCount || 0) + 1;
      story.metadata.completionRate = story.metadata.viewDetails.filter(v => v.completed).length / story.metadata.viewDetails.length;
      await story.save();
    }

    res.json({ story });
  } catch (error) {
    logger.error('View story error', { error: error.message });
    res.status(500).json({ error: 'Failed to record view' });
  }
};

exports.reactToStory = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const result = await storyIntelligence.processStoryReaction(req.params.id, req.userId, emoji);
    res.json({ result });
  } catch (error) {
    logger.error('React to story error', { error: error.message });
    res.status(500).json({ error: 'Failed to react to story' });
  }
};

exports.replyToStory = async (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const message = await Message.create({
      sender: req.userId,
      chat: story.user,
      content,
      type: type || 'story_reply',
      metadata: { storyRef: req.params.id },
    });

    if (!story.metadata) story.metadata = {};
    if (!story.metadata.replies) story.metadata.replies = [];
    story.metadata.replies.push(message._id);
    story.metadata.engagement = (story.metadata.engagement || 0) + 1;
    await story.save();

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Reply to story error', { error: error.message });
    res.status(500).json({ error: 'Failed to reply to story' });
  }
};

exports.getHighlights = async (req, res) => {
  try {
    const highlights = await storyIntelligence.getHighlights(req.userId, req.query);
    res.json({ highlights });
  } catch (error) {
    logger.error('Get highlights error', { error: error.message });
    res.status(500).json({ error: 'Failed to get highlights' });
  }
};

exports.createHighlight = async (req, res) => {
  try {
    const { name, storyIds } = req.body;
    if (!name || !storyIds || !storyIds.length) {
      return res.status(400).json({ error: 'Name and storyIds are required' });
    }

    const highlight = await storyIntelligence.createHighlight(req.userId, name, storyIds);
    res.status(201).json({ highlight });
  } catch (error) {
    logger.error('Create highlight error', { error: error.message });
    res.status(500).json({ error: 'Failed to create highlight' });
  }
};

exports.generateMemoryStory = async (req, res) => {
  try {
    const story = await storyIntelligence.generateMemoryStory(req.userId);
    if (!story) return res.status(400).json({ error: 'Not enough data to generate memory story' });
    res.status(201).json({ story });
  } catch (error) {
    logger.error('Generate memory story error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate memory story' });
  }
};

exports.getStoryAnalytics = async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, user: req.userId });
    if (!story) return res.status(404).json({ error: 'Story not found or not authorized' });

    const analytics = await storyIntelligence.getAnalytics(req.params.id);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get story analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

exports.getTrendingStories = async (req, res) => {
  try {
    const stories = await storyIntelligence.getTrendingStories(parseInt(req.query.limit) || 10);
    res.json({ stories });
  } catch (error) {
    logger.error('Get trending stories error', { error: error.message });
    res.status(500).json({ error: 'Failed to get trending stories' });
  }
};
