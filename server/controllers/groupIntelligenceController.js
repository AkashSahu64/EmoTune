const crypto = require('crypto');
const GroupIntelligenceEngine = require('../intelligence/cil/GroupIntelligenceEngine');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const logger = require('../utils/logger');

function getChat(chatId) {
  return Chat.findById(chatId).populate('participants.user', 'username avatar status');
}

function isMember(chat, userId) {
  if (!chat) return false;
  return chat.participants.some((p) => p.user._id.toString() === userId.toString());
}

function isAdmin(chat, userId) {
  if (!chat) return false;
  return chat.participants.some(
    (p) => p.user._id.toString() === userId.toString() && ['admin', 'super_admin'].includes(p.role)
  );
}

exports.getGroupIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const [mood, topics, health] = await Promise.all([
      GroupIntelligenceEngine.getGroupMood(chatId),
      GroupIntelligenceEngine.getGroupTopics(chatId),
      GroupIntelligenceEngine.getGroupSummary(chatId),
    ]);

    res.json({ mood, topics, health, analyzedAt: new Date() });
  } catch (err) {
    logger.error('Get group intelligence error', { error: err.message });
    res.status(500).json({ error: 'Failed to get group intelligence' });
  }
};

exports.getGroupMood = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const mood = await GroupIntelligenceEngine.getGroupMood(chatId);
    if (!mood) return res.status(404).json({ error: 'Mood data not available' });

    res.json(mood);
  } catch (err) {
    logger.error('Get group mood error', { error: err.message });
    res.status(500).json({ error: 'Failed to get group mood' });
  }
};

exports.getMemberEngagement = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const engagement = await GroupIntelligenceEngine.getMemberEngagement(chatId);
    if (!engagement) return res.status(404).json({ error: 'Engagement data not available' });

    res.json(engagement);
  } catch (err) {
    logger.error('Get member engagement error', { error: err.message });
    res.status(500).json({ error: 'Failed to get member engagement' });
  }
};

exports.getGroupSummary = async (req, res) => {
  try {
    const { chatId } = req.params;
    const regenerate = req.query.regenerate === 'true';
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const summary = await GroupIntelligenceEngine.getGroupSummary(chatId, { regenerate });
    if (!summary) return res.status(404).json({ error: 'Summary not available' });

    res.json(summary);
  } catch (err) {
    logger.error('Get group summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to get group summary' });
  }
};

exports.getTopicDrift = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const drift = await GroupIntelligenceEngine.getTopicDrift(chatId);
    res.json(drift);
  } catch (err) {
    logger.error('Get topic drift error', { error: err.message });
    res.status(500).json({ error: 'Failed to get topic drift' });
  }
};

exports.detectConflicts = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const conflicts = await GroupIntelligenceEngine.detectConflicts(chatId);
    res.json(conflicts);
  } catch (err) {
    logger.error('Detect conflicts error', { error: err.message });
    res.status(500).json({ error: 'Failed to detect conflicts' });
  }
};

exports.getParticipationScore = async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const score = await GroupIntelligenceEngine.getParticipationScore(chatId, userId);
    res.json(score);
  } catch (err) {
    logger.error('Get participation score error', { error: err.message });
    res.status(500).json({ error: 'Failed to get participation score' });
  }
};

exports.getSpamScore = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const spam = await GroupIntelligenceEngine.getSpamScore(chatId);
    res.json(spam);
  } catch (err) {
    logger.error('Get spam score error', { error: err.message });
    res.status(500).json({ error: 'Failed to get spam score' });
  }
};

exports.getSharedMedia = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { type, limit = 20, offset = 0 } = req.query;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const mediaTypes = ['image', 'video', 'audio', 'file', 'song', 'gif'];
    const query = { chat: chatId };
    if (type && mediaTypes.includes(type)) {
      query.type = type;
    } else if (!type) {
      query.type = { $in: mediaTypes };
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .populate('sender', 'username avatar')
        .lean(),
      Message.countDocuments(query),
    ]);

    res.json({ messages, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    logger.error('Get shared media error', { error: err.message });
    res.status(500).json({ error: 'Failed to get shared media' });
  }
};

exports.searchGroupMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q, limit = 50, offset = 0 } = req.query;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });
    if (!q || !q.trim()) return res.status(400).json({ error: 'Search query is required' });

    const query = {
      chat: chatId,
      content: { $regex: q, $options: 'i' },
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .populate('sender', 'username avatar')
        .lean(),
      Message.countDocuments(query),
    ]);

    res.json({ messages, total, query: q, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    logger.error('Search group messages error', { error: err.message });
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

exports.setGroupPermissions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { permissions } = req.body;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isAdmin(chat, req.userId)) return res.status(403).json({ error: 'Only admins can change permissions' });

    const validKeys = ['sendMessages', 'sendMedia', 'addMembers', 'pinMessages', 'changeInfo'];
    const validValues = ['all', 'admins', 'moderators'];
    const update = {};
    for (const key of validKeys) {
      if (permissions[key] && validValues.includes(permissions[key])) {
        update[`settings.permissions.${key}`] = permissions[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid permissions to update' });
    }

    const updated = await Chat.findByIdAndUpdate(chatId, { $set: update }, { new: true })
      .populate('participants.user', 'username avatar status');

    res.json({ chat: updated });
  } catch (err) {
    logger.error('Set group permissions error', { error: err.message });
    res.status(500).json({ error: 'Failed to set permissions' });
  }
};

exports.manageJoinRequests = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, action } = req.body;
    if (!userId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'userId and action (approve|reject) are required' });
    }

    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isAdmin(chat, req.userId)) return res.status(403).json({ error: 'Only admins can manage join requests' });

    const request = chat.settings?.joinRequests?.find(
      (r) => r.user.toString() === userId && r.status === 'pending'
    );
    if (!request) return res.status(404).json({ error: 'No pending join request from this user' });

    if (action === 'approve') {
      request.status = 'approved';
      chat.participants.push({ user: userId, role: 'member' });
    } else {
      request.status = 'rejected';
    }

    await chat.save();

    const populated = await Chat.findById(chatId)
      .populate('participants.user', 'username avatar status');

    res.json({ chat: populated, action });
  } catch (err) {
    logger.error('Manage join request error', { error: err.message });
    res.status(500).json({ error: 'Failed to manage join request' });
  }
};

exports.createInviteLink = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { maxUses, expiresInHours } = req.body;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isAdmin(chat, req.userId)) return res.status(403).json({ error: 'Only admins can create invite links' });

    const code = crypto.randomBytes(8).toString('hex');
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : null;

    if (!chat.settings) chat.settings = {};
    if (!chat.settings.inviteLinks) chat.settings.inviteLinks = [];

    chat.settings.inviteLinks.push({
      code,
      createdBy: req.userId,
      expiresAt,
      maxUses: maxUses || 0,
      useCount: 0,
      isActive: true,
    });

    await chat.save();

    res.status(201).json({
      code,
      link: `/api/groups/${code}/join`,
      expiresAt,
      maxUses: maxUses || 0,
    });
  } catch (err) {
    logger.error('Create invite link error', { error: err.message });
    res.status(500).json({ error: 'Failed to create invite link' });
  }
};

exports.joinViaInvite = async (req, res) => {
  try {
    const { code } = req.params;
    const chat = await Chat.findOne({
      'settings.inviteLinks.code': code,
      'settings.inviteLinks.isActive': true,
    });
    if (!chat) return res.status(404).json({ error: 'Invalid or expired invite link' });

    const link = chat.settings.inviteLinks.find((l) => l.code === code);
    if (!link || !link.isActive) return res.status(410).json({ error: 'Invite link is no longer active' });

    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      link.isActive = false;
      await chat.save();
      return res.status(410).json({ error: 'Invite link has expired' });
    }

    if (link.maxUses > 0 && link.useCount >= link.maxUses) {
      link.isActive = false;
      await chat.save();
      return res.status(410).json({ error: 'Invite link has reached maximum uses' });
    }

    if (chat.participants.some((p) => p.user.toString() === req.userId.toString())) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    if (chat.settings?.joinApprovalRequired) {
      if (!chat.settings.joinRequests) chat.settings.joinRequests = [];
      const existing = chat.settings.joinRequests.find((r) => r.user.toString() === req.userId.toString());
      if (existing) return res.status(400).json({ error: 'Join request already pending' });

      chat.settings.joinRequests.push({
        user: req.userId,
        status: 'pending',
        requestedAt: new Date(),
      });
      await chat.save();
      return res.json({ message: 'Join request submitted for approval', status: 'pending' });
    }

    chat.participants.push({ user: req.userId, role: 'member' });
    link.useCount += 1;
    await chat.save();

    const populated = await Chat.findById(chat._id)
      .populate('participants.user', 'username avatar status');

    res.json({ chat: populated });
  } catch (err) {
    logger.error('Join via invite error', { error: err.message });
    res.status(500).json({ error: 'Failed to join group' });
  }
};

exports.toggleMute = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    const participant = chat.participants.find(
      (p) => p.user.toString() === req.userId.toString()
    );
    if (!participant) return res.status(403).json({ error: 'Not a member of this group' });

    participant.isMuted = !participant.isMuted;
    await chat.save();

    res.json({ isMuted: participant.isMuted });
  } catch (err) {
    logger.error('Toggle mute error', { error: err.message });
    res.status(500).json({ error: 'Failed to toggle mute' });
  }
};

exports.getOnlineMembers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChat(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(chat, req.userId)) return res.status(403).json({ error: 'Not a member' });

    const io = req.app.get('io');
    if (!io) return res.json({ count: 0, members: [] });

    const onlineMembers = [];
    for (const p of chat.participants) {
      const userId = p.user._id.toString();
      const sockets = await io.in(userId).fetchSockets();
      if (sockets.length > 0) {
        onlineMembers.push({
          userId,
          username: p.user.username,
          avatar: p.user.avatar,
          socketCount: sockets.length,
        });
      }
    }

    res.json({ count: onlineMembers.length, members: onlineMembers });
  } catch (err) {
    logger.error('Get online members error', { error: err.message });
    res.status(500).json({ error: 'Failed to get online members' });
  }
};