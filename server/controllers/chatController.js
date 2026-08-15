const Chat = require('../models/Chat');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
    'participants.user': req.userId,
      isArchived: { $ne: true },
      'participants.isArchived': { $ne: true },
    })
      .populate('participants.user', 'username avatar status lastActive')
      .populate('lastMessage.sender', 'username')
      .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 });

    const onlineUsers = req.app.get('onlineUsers');
    const presenceService = req.app.get('presenceService');

    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      const obj = chat.toObject();
      const currentParticipant = chat.participants.find((p) => p.user?._id?.toString() === req.userId.toString());
      obj.isPinned = Boolean(currentParticipant?.isPinned);
      obj.isMuted = Boolean(currentParticipant?.isMuted);
      obj.isArchived = Boolean(currentParticipant?.isArchived);
      if (chat.type === 'direct') {
        const other = chat.participants.find((p) => p.user._id.toString() !== req.userId.toString());
        if (other?.user) {
          const uid = other.user._id.toString();
          const isOnline = presenceService ? await presenceService.isOnline(uid) : Boolean(onlineUsers?.has(uid));
          const userPrefs = await User.findById(uid).select('preferences');
          const onlineStatusSetting = userPrefs?.preferences?.privacy?.onlineStatus || 'everyone';
          obj.otherUser = {
            ...other.user.toObject ? other.user.toObject() : other.user,
            isOnline: onlineStatusSetting === 'nobody' ? false : isOnline,
          };
        }
      }
      return obj;
    }));

    res.json({ chats: enrichedChats });
  } catch (err) {
    logger.error('Get user chats error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

exports.searchChats = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ chats: [] });
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const chats = await Chat.find({
      'participants.user': req.userId,
      'participants.isArchived': { $ne: true },
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { 'lastMessage.content': { $regex: escaped, $options: 'i' } },
        { 'participants.nickname': { $regex: escaped, $options: 'i' } },
      ],
    })
      .populate('participants.user', 'username avatar status lastActive')
      .populate('lastMessage.sender', 'username')
      .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 })
      .limit(50)
      .lean();
    const result = chats.map((chat) => {
      const participant = chat.participants.find((p) => p.user?._id?.toString() === req.userId.toString());
      return { ...chat, isPinned: Boolean(participant?.isPinned), isMuted: Boolean(participant?.isMuted) };
    });
    res.json({ chats: result });
  } catch (err) {
    logger.error('Search chats error', { error: err.message });
    res.status(500).json({ error: 'Failed to search chats' });
  }
};

exports.updateChatPreferences = async (req, res) => {
  try {
    const allowed = ['isPinned', 'isMuted', 'isArchived'];
    const updates = Object.fromEntries(allowed.filter((key) => typeof req.body?.[key] === 'boolean').map((key) => [`participants.$.${key}`, req.body[key]]));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid chat preference supplied' });
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.chatId, 'participants.user': req.userId },
      { $set: updates },
      { new: true },
    ).populate('participants.user', 'username avatar status lastActive');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const participant = chat.participants.find((p) => p.user?._id?.toString() === req.userId.toString());
    res.json({ preferences: { isPinned: Boolean(participant?.isPinned), isMuted: Boolean(participant?.isMuted), isArchived: Boolean(participant?.isArchived) } });
  } catch (err) {
    logger.error('Update chat preferences error', { error: err.message });
    res.status(500).json({ error: 'Failed to update chat preferences' });
  }
};

exports.getOrCreateDirectChat = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    let chats = await Chat.find({
      type: 'direct',
      'participants.user': { $in: [req.userId] },
    }).populate('participants.user', 'username avatar status');

    let chat = chats.find((c) => {
      const ids = c.participants.map((p) => p.user._id.toString());
      return ids.includes(userId) && ids.includes(req.userId.toString()) && ids.length === 2;
    });

    const isNew = !chat;

    if (!chat) {
      chat = await Chat.create({
        type: 'direct',
        participants: [
          { user: req.userId, role: 'member' },
          { user: userId, role: 'member' },
        ],
      });
      chat = await Chat.findById(chat._id).populate('participants.user', 'username avatar status');
    }

    const onlineUsers = req.app.get('onlineUsers');
    const presenceService = req.app.get('presenceService');
    const enriched = chat.toObject();
    if (chat.type === 'direct') {
      const other = chat.participants.find((p) => p.user._id.toString() !== req.userId.toString());
      if (other?.user) {
        const uid = other.user._id.toString();
        enriched.otherUser = {
          ...(other.user.toObject ? other.user.toObject() : other.user),
          isOnline: presenceService ? await presenceService.isOnline(uid) : Boolean(onlineUsers?.has(uid)),
        };
      } else {
        enriched.otherUser = other?.user || null;
      }
    }

    if (isNew) {
      const io = req.app.get('io');
      if (io) {
        [req.userId, userId].forEach((uid) => {
          io.to(`user:${uid}`).emit('newChat', { chat: enriched });
        });
      }
    }

    res.json({ chat: enriched });
  } catch (err) {
    logger.error('Get/create direct chat error', { error: err.message });
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const query = {};
    if (q) {
      query.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    query._id = { $ne: req.userId };

  const onlineUsers = req.app.get('onlineUsers');
  const presenceService = req.app.get('presenceService');
  const users = await User.find(query)
    .select('username avatar email status')
    .limit(20);

  const enriched = await Promise.all(users.map(async (u) => {
    const uid = u._id.toString();
    const isOnline = presenceService ? await presenceService.isOnline(uid) : Boolean(onlineUsers?.has(uid));
    const userPrefs = await User.findById(uid).select('preferences');
    const onlineStatusSetting = userPrefs?.preferences?.privacy?.onlineStatus || 'everyone';
    return {
      ...u.toObject(),
      isOnline: onlineStatusSetting === 'nobody' ? false : isOnline,
    };
  }));

  res.json({ users: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users' });
  }
};
