const Story = require('../domain/models/Story');
const StoryView = require('../domain/models/StoryView');
const StoryNotification = require('../domain/models/StoryNotification');
const StoryInteraction = require('../domain/models/StoryInteraction');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const storyIntelligence = require('../intelligence/cil/StoryIntelligenceEngine');
const {
  canViewStory,
  canInteractWithStory,
  canReplyToStory,
  canDeleteStory,
  canViewStoryAnalytics,
  hasDirectRelationship,
} = require('../policies/storyPolicy');
const logger = require('../utils/logger');
const { searchSong } = require('../services/spotifyService');
const { storySchema } = require('../utils/validators');
const { scheduleStoryPublication, cancelStoryPublication } = require('../services/storyScheduler');

function invalidId(error) {
  return error?.name === 'CastError' || error?.kind === 'ObjectId';
}

exports.createStory = async (req, res) => {
  try {
    const { error, value } = storySchema.validate(req.body, { abortEarly: true });
    if (error) return res.status(422).json({ error: error.details[0].message });
    const { type, content, audience, tags, mentions, location, scheduling, template, isDraft } = value;
    const mentionIds = [...new Set((mentions || []).map((mention) => mention?.user).filter(Boolean))];
    const validMentionUsers = mentionIds.length
      ? new Set((await User.find({ _id: { $in: mentionIds } }).select('_id').lean()).map((item) => item._id.toString()))
      : new Set();
    const normalizedMentions = (mentions || []).filter((mention) => validMentionUsers.has(String(mention.user)));
    const scheduled = Boolean(scheduling?.isScheduled || scheduling?.scheduledAt);
    const story = await storyIntelligence.createStory(req.userId, {
      type, content, audience, tags, mentions: normalizedMentions, location,
      scheduling: scheduled ? { ...scheduling, isScheduled: true, status: 'scheduled' } : scheduling,
      template, isDraft: Boolean(isDraft || scheduled),
    });
    if (scheduled) {
      try {
        await scheduleStoryPublication(story._id, scheduling.scheduledAt);
      } catch (scheduleError) {
        await Story.updateOne(
          { _id: story._id },
          { $set: { 'scheduling.isScheduled': false, 'scheduling.status': 'cancelled' } },
        );
        logger.error('Schedule Story publication failed after creation', {
          storyId: story._id.toString(),
          error: scheduleError.message,
        });
        return res.status(503).json({ error: 'Story scheduling is temporarily unavailable' });
      }
    }

    if (!story.isDraft && normalizedMentions.length) {
      const mentionRecipients = [...new Set(normalizedMentions.map((mention) => mention.user.toString()))]
        .filter((id) => id !== req.userId.toString());
      for (const recipient of mentionRecipients) {
        if (await canViewStory(recipient, story)) {
          await StoryNotification.updateOne(
            { recipient, story: story._id, type: 'story_mention' },
            { $setOnInsert: { recipient, actor: req.userId, story: story._id, type: 'story_mention' } },
            { upsert: true },
          );
          req.app.get('io')?.to(`user:${recipient}`).emit('story:mention', { storyId: story._id, actorId: req.userId });
        }
      }
    }
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

    if (!(await canViewStory(req.userId, story))) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.user._id.toString() === req.userId.toString()) {
      const analytics = await storyIntelligence.getAnalytics(req.params.id);
      story.analytics = analytics;
    }

    res.json({ story });
  } catch (error) {
    logger.error('Get story error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to get story' });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, user: req.userId });
    if (!story) return res.status(404).json({ error: 'Story not found or not authorized' });

    if (!canDeleteStory(req.userId, story)) {
      return res.status(404).json({ error: 'Story not found or not authorized' });
    }

    await storyIntelligence.removeStoryFromHighlights(req.userId, story._id);
    await Story.findByIdAndDelete(req.params.id);
    await storyIntelligence.invalidateStoryCaches();
    storyIntelligence.emitStoryDeleted(story);
    res.json({ message: 'Story deleted' });
  } catch (error) {
    logger.error('Delete story error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to delete story' });
  }
};

exports.deleteHighlight = async (req, res) => {
  try {
    const highlight = await storyIntelligence.deleteHighlight(req.userId, req.params.id);
    if (!highlight) return res.status(404).json({ error: 'Highlight not found' });
    res.json({ message: 'Highlight deleted' });
  } catch (error) {
    logger.error('Delete highlight error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Highlight not found' : 'Failed to delete highlight' });
  }
};

exports.getDrafts = async (req, res) => {
  try {
    const drafts = await Story.find({ user: req.userId, isDraft: true, deletedAt: null })
      .sort({ updatedAt: -1 }).limit(50).lean();
    res.json({ drafts });
  } catch (error) {
    logger.error('Get Story drafts error', { error: error.message });
    res.status(500).json({ error: 'Failed to load Story drafts' });
  }
};

exports.updateDraft = async (req, res) => {
  try {
    const draft = await Story.findOne({ _id: req.params.id, user: req.userId, isDraft: true, deletedAt: null });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    const allowed = ['type', 'content', 'audience', 'tags', 'mentions', 'location', 'template', 'scheduling'];
    for (const key of allowed) if (req.body[key] !== undefined) draft[key] = req.body[key];
    await draft.save();
    res.json({ story: draft });
  } catch (error) {
    logger.error('Update Story draft error', { error: error.message });
    res.status(422).json({ error: 'Invalid Story draft' });
  }
};

exports.publishStory = async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, user: req.userId, isDraft: true, deletedAt: null });
    if (!story) return res.status(404).json({ error: 'Draft not found' });
    if (story.scheduling?.isScheduled && story.scheduling.scheduledAt > new Date()) {
      return res.status(409).json({ error: 'Scheduled Story must be published by its scheduler', scheduledAt: story.scheduling.scheduledAt });
    }
    story.isDraft = false;
    story.scheduling = { ...(story.scheduling?.toObject?.() || story.scheduling || {}), isScheduled: false, status: 'published', publishedAt: new Date() };
    if (!story.expiresAt || story.expiresAt <= new Date()) story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await story.save();
    await storyIntelligence.invalidateStoryCaches();
    storyIntelligence.emitStoryCreated(story);
    res.json({ story });
  } catch (error) {
    logger.error('Publish Story draft error', { error: error.message });
    res.status(422).json({ error: 'Failed to publish Story draft' });
  }
};

exports.scheduleStory = async (req, res) => {
  try {
    const scheduledAt = new Date(req.body?.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return res.status(422).json({ error: 'A future scheduledAt is required' });
    const story = await Story.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, isDraft: true, deletedAt: null },
      { $set: { 'scheduling.scheduledAt': scheduledAt, 'scheduling.isScheduled': true, 'scheduling.status': 'scheduled' } },
      { new: true },
    );
    if (!story) return res.status(404).json({ error: 'Draft not found' });
    try {
      await scheduleStoryPublication(story._id, scheduledAt);
    } catch (scheduleError) {
      await Story.updateOne(
        { _id: story._id },
        { $set: { 'scheduling.isScheduled': false, 'scheduling.status': 'cancelled' } },
      );
      logger.error('Schedule Story publication failed', {
        storyId: story._id.toString(),
        error: scheduleError.message,
      });
      return res.status(503).json({ error: 'Story scheduling is temporarily unavailable' });
    }
    res.json({ story });
  } catch (error) {
    logger.error('Schedule Story error', { error: error.message });
    res.status(422).json({ error: 'Unable to schedule Story' });
  }
};

exports.cancelScheduledStory = async (req, res) => {
  try {
    const story = await Story.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, isDraft: true, 'scheduling.status': 'scheduled' },
      { $set: { 'scheduling.isScheduled': false, 'scheduling.status': 'cancelled' } },
      { new: true },
    );
    if (!story) return res.status(404).json({ error: 'Scheduled Story not found' });
    await cancelStoryPublication(story._id);
    res.json({ story });
  } catch (error) {
    logger.error('Cancel scheduled Story error', { error: error.message });
    res.status(500).json({ error: 'Unable to cancel scheduled Story' });
  }
};

exports.shareStory = async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId is required' });
    const story = await Story.findById(req.params.id);
    if (!story || !(await canInteractWithStory(req.userId, story))) return res.status(404).json({ error: 'Story not found' });
    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.userId });
    if (!chat) return res.status(403).json({ error: 'Chat membership is required' });
    const message = await Message.create({
      sender: req.userId,
      chat: chat._id,
      content: 'Shared a Story',
      type: 'story_share',
      storyRef: story._id,
      storyOwner: story.user,
    });
    chat.lastMessage = { content: 'Shared a Story', sender: req.userId, type: 'story_share', createdAt: message.createdAt };
    await chat.save();
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate({
        path: 'storyRef',
        select: 'type content createdAt user expiresAt deletedAt',
        populate: { path: 'user', select: 'username avatar' },
      });
    req.app.get('io')?.to(chat._id.toString()).emit('message:receive', { message: populatedMessage, silent: false });
    await StoryNotification.updateOne(
      { recipient: story.user, story: story._id, type: 'story_share' },
      { $setOnInsert: { recipient: story.user, actor: req.userId, story: story._id, type: 'story_share' } },
      { upsert: true },
    );
    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    logger.error('Share Story error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to share Story' });
  }
};

exports.viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (!(await canInteractWithStory(req.userId, story))) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const completed = Boolean(req.body?.completed);
    const duration = Math.max(0, Number(req.body?.duration) || 0);
    let view = await StoryView.findOne({ story: story._id, user: req.userId });
    let created = false;

    if (!view) {
      try {
        view = await StoryView.create({
          story: story._id,
          user: req.userId,
          startedAt: new Date(),
          completed,
          completedAt: completed ? new Date() : undefined,
          duration,
        });
        created = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        view = await StoryView.findOne({ story: story._id, user: req.userId });
      }
    }

    if (!view) return res.status(409).json({ error: 'Unable to register Story view' });

    if (completed && !view.completed) {
      view = await StoryView.findOneAndUpdate(
        { _id: view._id, completed: false },
        { $set: { completed: true, completedAt: new Date(), duration: Math.max(view.duration || 0, duration) } },
        { new: true },
      );
    }

    if (created) {
      await Story.updateOne(
        { _id: story._id },
        { $inc: { 'metadata.views': 1, 'metadata.viewCount': 1, 'metadata.uniqueViewCount': 1 } },
      );
    }

    res.json({ view, created });
  } catch (error) {
    logger.error('View story error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to record view' });
  }
};

exports.reactToStory = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const story = await Story.findById(req.params.id).select('user audience expiresAt isArchived isDraft deletedAt').lean();
    if (!story || !(await canInteractWithStory(req.userId, story))) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const result = await storyIntelligence.processStoryReaction(req.params.id, req.userId, emoji);

    // WhatsApp-style Story reactions are also delivered to the Story owner's
    // existing direct chat as a Story card. Reaction persistence remains the
    // source of truth; chat delivery is intentionally best-effort so a user
    // can still react when no direct conversation exists yet.
    if (String(story.user) !== String(req.userId) && (result.action === 'add' || result.action === 'change' || result.action === 'remove')) {
      try {
        const chat = await Chat.findOne({
          type: 'direct',
          participants: {
            $all: [
              { $elemMatch: { user: req.userId, leftAt: { $exists: false } } },
              { $elemMatch: { user: story.user, leftAt: { $exists: false } } },
            ],
          },
        });
        if (chat) {
          const existingReactionMessage = await Message.findOne({
            sender: req.userId,
            chat: chat._id,
            storyRef: story._id,
            type: 'story_reply',
            'metadata.storyReaction': true,
          }).sort({ createdAt: -1 });

          if (result.action === 'remove') {
            if (existingReactionMessage) {
              await Message.deleteOne({ _id: existingReactionMessage._id });
              req.app.get('io')?.to(chat._id.toString()).emit('message:deleted', {
                messageId: existingReactionMessage._id,
                forEveryone: true,
              });
            }
            return res.json({ result });
          }

          const reactionMessage = existingReactionMessage || new Message({
            sender: req.userId,
            chat: chat._id,
            type: 'story_reply',
            storyRef: story._id,
            storyOwner: story.user,
          });
          reactionMessage.content = emoji;
          reactionMessage.metadata = { ...(reactionMessage.metadata?.toObject?.() || reactionMessage.metadata || {}), emoji, storyReaction: true };
          await reactionMessage.save();
          chat.lastMessage = {
            content: `Reacted ${emoji} to a Story`,
            sender: req.userId,
            type: 'story_reply',
            createdAt: reactionMessage.createdAt,
          };
          await chat.save();
          const populatedMessage = await Message.findById(reactionMessage._id)
            .populate('sender', 'username avatar status')
            .populate({
              path: 'storyRef',
              select: 'type content createdAt user expiresAt deletedAt',
              populate: { path: 'user', select: 'username avatar' },
            });
          req.app.get('io')?.to(chat._id.toString()).emit('message:receive', {
            message: populatedMessage,
            silent: false,
          });
        }
      } catch (deliveryError) {
        logger.warn('Story reaction chat delivery failed', {
          storyId: req.params.id,
          userId: req.userId,
          error: deliveryError.message,
        });
      }
    }
    res.json({ result });
  } catch (error) {
    logger.error('React to story error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to react to story' });
  }
};

exports.replyToStory = async (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    if (!(await canReplyToStory(req.userId, story))) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (String(story.user) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot reply to your own Story' });
    }

    if (content.trim().length > 2000) {
      return res.status(422).json({ error: 'Reply is too long' });
    }

    const chat = await Chat.findOne({
      type: 'direct',
      participants: {
        $all: [
          { $elemMatch: { user: req.userId, leftAt: { $exists: false } } },
          { $elemMatch: { user: story.user, leftAt: { $exists: false } } },
        ],
      },
    });
    if (!chat) return res.status(403).json({ error: 'A direct conversation is required to reply' });

    if (!(await hasDirectRelationship(req.userId, story.user))) {
      return res.status(403).json({ error: 'You cannot reply to this Story' });
    }

    const message = await Message.create({
      sender: req.userId,
      chat: chat._id,
      content: content.trim(),
      type: type || 'story_reply',
      // Message.storyRef is the canonical schema field. Keeping the
      // reference at metadata.storyRef silently drops it because metadata
      // does not define that property, which made the replies list empty.
      storyRef: story._id,
      storyOwner: story.user,
    });

    chat.lastMessage = {
      content: content.trim(),
      sender: req.userId,
      type: 'story_reply',
      createdAt: message.createdAt,
    };
    await chat.save();

    if (!story.metadata) story.metadata = {};
    if (!story.metadata.replies) story.metadata.replies = [];
    story.metadata.replies.push(message._id);
    story.metadata.engagement = (story.metadata.engagement || 0) + 1;
    await story.save();

    await storyIntelligence.invalidateStoryAnalytics(story._id);

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate({
        path: 'storyRef',
        select: 'type content createdAt user expiresAt deletedAt',
        populate: { path: 'user', select: 'username avatar' },
      });
    const io = req.app.get('io');
    if (io) {
      io.to(chat._id.toString()).emit('message:receive', { message: populatedMessage, silent: false });
    }

    res.status(201).json({ message: populatedMessage });
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
    const { name, storyIds, highlightId } = req.body;
    if (!name || !storyIds || !storyIds.length) {
      return res.status(400).json({ error: 'Name and storyIds are required' });
    }

    const highlight = await storyIntelligence.createHighlight(req.userId, name, storyIds, highlightId);
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

    if (!canViewStoryAnalytics(req.userId, story)) {
      return res.status(404).json({ error: 'Story not found or not authorized' });
    }

    const analytics = await storyIntelligence.getAnalytics(req.params.id);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get story analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

exports.getStoryReplies = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .select('_id user audience expiresAt isArchived isDraft deletedAt metadata.replies')
      .lean();
    if (!story || !(await canViewStory(req.userId, story))) return res.status(404).json({ error: 'Story not found' });
    if (String(story.user) !== String(req.userId)) return res.status(404).json({ error: 'Story not found' });

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const replies = await Message.find({
      type: 'story_reply',
      $or: [
        { storyRef: story._id },
        { 'metadata.storyRef': story._id },
        { _id: { $in: story.metadata?.replies || [] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username avatar status')
      .lean();
    res.json({ replies });
  } catch (error) {
    logger.error('Get Story replies error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to load Story replies' });
  }
};

exports.getStoryInteraction = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).select('_id user content audience expiresAt isArchived isDraft deletedAt').lean();
    if (!story || !(await canViewStory(req.userId, story))) return res.status(404).json({ error: 'Story not found' });
    const interactive = story.content?.interactive;
    if (!interactive?.kind || !['poll', 'question'].includes(interactive.kind)) return res.status(400).json({ error: 'This Story has no interactive prompt' });
    const own = await StoryInteraction.findOne({ story: story._id, user: req.userId, kind: `${interactive.kind === 'poll' ? 'poll_vote' : 'question_answer'}` }).lean();
    if (interactive.kind === 'question' && String(story.user) !== String(req.userId)) return res.json({ kind: 'question', prompt: interactive.prompt, own: own?.value || null });
    const rows = await StoryInteraction.find({ story: story._id, kind: interactive.kind === 'poll' ? 'poll_vote' : 'question_answer' }).select('value').lean();
    const counts = rows.reduce((result, row) => { result[row.value] = (result[row.value] || 0) + 1; return result; }, {});
    res.json({ kind: interactive.kind, prompt: interactive.prompt, options: interactive.options || [], own: own?.value || null, counts, answers: interactive.kind === 'question' ? rows.map((row) => row.value) : undefined });
  } catch (error) {
    logger.error('Get Story interaction error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to load Story interaction' });
  }
};

exports.submitStoryInteraction = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).select('_id user content audience expiresAt isArchived isDraft deletedAt').lean();
    if (!story || !(await canInteractWithStory(req.userId, story))) return res.status(404).json({ error: 'Story not found' });
    const interactive = story.content?.interactive;
    if (!interactive?.kind || !['poll', 'question'].includes(interactive.kind)) return res.status(400).json({ error: 'This Story is not interactive' });
    const value = String(req.body?.value || '').trim();
    if (!value || value.length > 2000) return res.status(422).json({ error: 'A valid response is required' });
    const kind = interactive.kind === 'poll' ? 'poll_vote' : 'question_answer';
    if (kind === 'poll_vote' && !(interactive.options || []).some((option) => option.text === value)) return res.status(422).json({ error: 'Invalid poll option' });
    const interaction = await StoryInteraction.findOneAndUpdate(
      { story: story._id, user: req.userId, kind },
      { $set: { value } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ interaction });
  } catch (error) {
    logger.error('Submit Story interaction error', { error: error.message });
    res.status(error.code === 11000 ? 409 : invalidId(error) ? 404 : 500).json({ error: error.code === 11000 ? 'Response already exists' : invalidId(error) ? 'Story not found' : 'Failed to save response' });
  }
};

exports.searchStoryMusic = async (req, res) => {
  try {
    const query = String(req.query?.q || '').trim();
    if (query.length < 2 || query.length > 100) return res.status(422).json({ error: 'Search must be between 2 and 100 characters' });
    const songs = await searchSong(query, 8);
    res.json({ songs: songs.map(({ id, title, artist, album, albumArt, previewUrl, externalUrl, source, duration }) => ({ id, title, artist, album, albumArt, previewUrl, externalUrl, source, duration })) });
  } catch (error) {
    logger.error('Story music search error', { error: error.message });
    res.status(502).json({ error: 'Music search is temporarily unavailable' });
  }
};

exports.getStoryViewers = async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, user: req.userId }).select('_id user').lean();
    if (!story) return res.status(404).json({ error: 'Story not found or not authorized' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 50);
    const filter = { story: story._id };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (Number.isNaN(before.getTime())) return res.status(400).json({ error: 'Invalid cursor' });
      filter.createdAt = { $lt: before };
    }
    const rows = await StoryView.find(filter).sort({ createdAt: -1 }).limit(limit + 1)
      .populate('user', 'username avatar').lean();
    const hasMore = rows.length > limit;
    const viewers = hasMore ? rows.slice(0, limit) : rows;
    res.json({ viewers, nextCursor: hasMore ? viewers[viewers.length - 1].createdAt : null });
  } catch (error) {
    logger.error('Get Story viewers error', { error: error.message });
    res.status(invalidId(error) ? 404 : 500).json({ error: invalidId(error) ? 'Story not found' : 'Failed to get Story viewers' });
  }
};

exports.getTrendingStories = async (req, res) => {
  try {
    const stories = await storyIntelligence.getTrendingStories(parseInt(req.query.limit) || 10, req.userId);
    res.json({ stories });
  } catch (error) {
    logger.error('Get trending stories error', { error: error.message });
    res.status(500).json({ error: 'Failed to get trending stories' });
  }
};
