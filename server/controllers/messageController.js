const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { messageSchema } = require('../utils/validators');
const { classifyMessageIntent, getUnreadIntentCounts, getMessageFilterQuery } = require('../services/intentService');
const logger = require('../utils/logger');

function getIO(req) {
  return req.app.get('io');
}

exports.sendMessage = async (req, res) => {
  try {
    const { error, value } = messageSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { content, chatId, type, mediaUrl, mediaType, metadata, silent, personaUsed, replyTo } = value;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const isParticipant = chat.participants.some((p) => p.user.toString() === req.userId.toString());
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant of this chat' });

    const message = await Message.create({
      sender: req.userId,
      chat: chatId,
      content,
      type: type || 'text',
      mediaUrl,
      mediaType,
      metadata,
      silent: silent || false,
      personaUsed: personaUsed || '',
      replyTo: replyTo || undefined,
    });

    chat.lastMessage = {
      content: content || (metadata?.emoji) || (metadata?.shayari) || (metadata?.songTitle) || (type === 'gif' ? 'GIF' : '') || (type || 'text'),
      sender: req.userId,
      type: type || 'text',
      createdAt: message.createdAt,
    };

    if (silent) {
      chat.silentMessages.push({
        message: message._id,
        from: req.userId,
        read: false,
        accepted: false,
      });
    }

    await chat.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate('replyTo');

    req.app.get('io').to(chatId).emit('message:receive', {
      message: populated,
      silent: silent || false,
    });

    classifyMessageIntent(message._id).catch((err) => {
      logger.error('Async intent classification failed', { messageId: message._id, error: err.message });
    });

    res.status(201).json({ message: populated });
  } catch (err) {
    logger.error('Send message error', { error: err.message });
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, intent, before } = req.query;

    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.userId });
    if (!chat) return res.status(403).json({ error: 'Not a participant of this chat' });
    let query;
    try {
      query = getMessageFilterQuery(chatId, req.userId, intent || 'all');
    } catch (error) {
      if (error.code === 'UNSUPPORTED_MESSAGE_FILTER') {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .populate('sender', 'username avatar status')
      .populate('replyTo')
      .populate('reactions.users', 'username avatar profileImage profile_image')
      .populate('truthClaimRef')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    res.json({
      messages: messages.reverse(),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    logger.error('Get messages error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    message.deletedFor.push(req.userId);
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message:deleted', { messageId, deletedFor: req.userId, forEveryone: false });
    }

    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

exports.deleteMessageEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Message.findByIdAndDelete(messageId);

    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message:deleted', { messageId, forEveryone: true });
    }

    res.json({ message: 'Message deleted for everyone' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message:edited', {
        messageId: message._id,
        content: message.content,
        editedAt: message.editedAt,
      });
    }

    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

exports.forwardMessage = async (req, res) => {
  try {
    const { messageId, targetChatId } = req.body;
    if (!messageId || !targetChatId) {
      return res.status(400).json({ error: 'messageId and targetChatId are required' });
    }

    const original = await Message.findById(messageId);
    if (!original) return res.status(404).json({ error: 'Original message not found' });
    const sourceChat = await Chat.findOne({ _id: original.chat, 'participants.user': req.userId });
    if (!sourceChat) return res.status(403).json({ error: 'Not a participant of source chat' });

    const chat = await Chat.findById(targetChatId);
    if (!chat) return res.status(404).json({ error: 'Target chat not found' });

    const isParticipant = chat.participants.some((p) => p.user.toString() === req.userId.toString());
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant of target chat' });

    const forwarded = await Message.create({
      sender: req.userId,
      chat: targetChatId,
      content: original.content,
      type: original.type,
      mediaUrl: original.mediaUrl,
      mediaType: original.mediaType,
      metadata: original.metadata,
      personaUsed: original.personaUsed || '',
    });

    const populated = await Message.findById(forwarded._id)
      .populate('sender', 'username avatar status');

    chat.lastMessage = {
      content: populated.content || (populated.metadata?.emoji) || (populated.type || 'text'),
      sender: req.userId,
      type: populated.type || 'text',
      createdAt: populated.createdAt,
    };
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.to(targetChatId).emit('message:receive', { message: populated, silent: false });
    }

    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to forward message' });
  }
};

exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const chat = await Chat.findById(message.chat);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const isParticipant = chat.participants.some((p) => p.user.toString() === req.userId.toString());
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    if (!chat.pinnedMessages.includes(messageId)) {
      chat.pinnedMessages.push(messageId);
      await chat.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message:pinned', { messageId, chatId: message.chat, pinned: true });
    }

    res.json({ success: true, pinnedMessages: chat.pinnedMessages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to pin message' });
  }
};

exports.unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const chat = await Chat.findById(message.chat);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const isParticipant = chat.participants.some((p) => p.user.toString() === req.userId.toString());
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    chat.pinnedMessages = chat.pinnedMessages.filter((id) => id.toString() !== messageId);
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message:pinned', { messageId, chatId: message.chat, pinned: false });
    }

    res.json({ success: true, pinnedMessages: chat.pinnedMessages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unpin message' });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() : '';
    if (!emoji || [...emoji].length > 8) return res.status(400).json({ error: 'A valid emoji is required' });

    const userId = new mongoose.Types.ObjectId(req.userId);
    let message;
    const applyReaction = (current) => {
      const existing = current.reactions.find((reaction) =>
        reaction.users.some((reactionUser) => reactionUser.toString() === userId.toString()),
      );
      const sameReaction = existing?.emoji === emoji;

      for (const reaction of current.reactions) {
        reaction.users = reaction.users.filter((reactionUser) => reactionUser.toString() !== userId.toString());
        reaction.count = reaction.users.length;
      }
      if (!sameReaction) {
        const target = current.reactions.find((reaction) => reaction.emoji === emoji);
        if (target) {
          target.users.push(userId);
          target.count = target.users.length;
        } else {
          current.reactions.push({ emoji, users: [userId], count: 1 });
        }
      }
      current.reactions = current.reactions.filter((reaction) => reaction.users.length > 0);
    };

    // Compare-and-swap keeps the operation atomic without requiring a
    // replica-set transaction and avoids transaction startup latency.
    let updated = null;
    for (let attempt = 0; attempt < 4 && !updated; attempt += 1) {
      const current = await Message.findById(messageId);
      if (!current) return res.status(404).json({ error: 'Message not found' });
      applyReaction(current);
      updated = await Message.findOneAndUpdate(
        { _id: messageId, __v: current.__v || 0 },
        { $set: { reactions: current.reactions }, $inc: { __v: 1 } },
        { new: true, runValidators: true },
      );
    }
    if (!updated) return res.status(409).json({ error: 'Reaction changed, please try again' });
    message = updated;

    await message.populate('reactions.users', 'username avatar profileImage profile_image');
    const reactions = message.reactions.map((reaction) => ({
      emoji: reaction.emoji,
      count: reaction.users.length,
      users: reaction.users,
    }));
    const myReaction = reactions.find((reaction) => reaction.users.some((user) => user._id.toString() === req.userId.toString()))?.emoji || null;
    const io = getIO(req);
    if (io) io.to(message.chat.toString()).emit('message:reaction', { messageId, reactions });
    res.json({ messageId, reactions, myReaction });
  } catch (err) {
    logger.error('React to message error', { error: err.message });
    res.status(500).json({ error: 'Failed to update reaction' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { messageIds, chatId } = req.body;
    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.userId });
    if (!chat) return res.status(403).json({ error: 'Not a participant of this chat' });
    const messages = await Message.find({ _id: { $in: messageIds }, chat: chatId }).populate('sender', 'preferences');
    const toMark = [];
    for (const msg of messages) {
      const senderPrefs = msg.sender?.preferences;
      const allowReceipt = senderPrefs?.privacy?.readReceipts !== false;
      if (allowReceipt) toMark.push(msg._id);
    }
    if (toMark.length > 0) {
      await Message.updateMany(
        { _id: { $in: toMark }, chat: chatId },
        { $addToSet: { readBy: req.userId } }
      );
      const io = getIO(req);
      if (io && chatId) {
        io.to(chatId).emit('message:read', { messageIds: toMark, userId: req.userId });
      }
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Mark read error', { error: err.message });
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const now = new Date();
    const result = await Chat.updateMany(
      { 'participants.user': req.userId },
      { $set: { 'participants.$[participant].lastRead': now } },
      { arrayFilters: [{ 'participant.user': req.userId }] },
    );

    res.json({ success: true, updatedChats: result.modifiedCount || 0 });
  } catch (err) {
    logger.error('Mark all read error', { error: err.message });
    res.status(500).json({ error: 'Failed to mark all chats as read' });
  }
};

exports.getIntentCounts = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.userId });
    if (!chat) return res.status(403).json({ error: 'Not a participant of this chat' });
    const counts = await getUnreadIntentCounts(chatId, req.userId);
    res.json({ counts });
  } catch (err) {
    logger.error('Get intent counts error', { error: err.message });
    res.status(500).json({ error: 'Failed to get intent counts' });
  }
};

exports.getSilentMessages = async (req, res) => {
  try {
    const chats = await Chat.find({
      'participants.user': req.userId,
      'silentMessages.accepted': false,
    })
      .populate({
        path: 'silentMessages.message',
        populate: { path: 'sender', select: 'username avatar status' },
      })
      .populate({
        path: 'silentMessages.from',
        select: 'username avatar',
      })
      .select('name type participants silentMessages')
      .sort({ updatedAt: -1 });

    const result = [];
    for (const chat of chats) {
      const unaccepted = chat.silentMessages.filter((s) => !s.accepted);
      if (unaccepted.length === 0) continue;
      const otherUser = chat.participants?.find(
        (p) => p.user?.toString() !== req.userId.toString()
      );
      result.push({
        chatId: chat._id,
        chatName: chat.name || otherUser?.username || 'Unknown',
        chatType: chat.type,
        messages: unaccepted.map((s) => ({
          silentMessageId: s._id,
          messageId: s.message?._id,
          content: s.message?.content,
          type: s.message?.type,
          sender: s.message?.sender || s.from,
          createdAt: s.createdAt || s.message?.createdAt,
          read: s.read,
        })),
      });
    }

    const totalUnread = result.reduce(
      (sum, g) => sum + g.messages.filter((m) => !m.read).length,
      0
    );

    res.json({ groups: result, totalUnread });
  } catch (err) {
    logger.error('Get silent messages error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch silent messages' });
  }
};

exports.acceptSilentMessage = async (req, res) => {
  try {
    const { messageId, chatId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.participants.some((p) => p.user.toString() === req.userId.toString())) {
      return res.status(403).json({ error: 'Not a participant of this chat' });
    }

    const silentMsg = chat.silentMessages.find(
      (s) => s.message.toString() === messageId
    );
    if (silentMsg) {
      silentMsg.accepted = true;
      silentMsg.read = true;
      await chat.save();
    }

    const message = await Message.findById(messageId);
    if (message) {
      message.silent = false;
      await message.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('silent:accepted', { messageId, chatId });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept silent message' });
  }
};
