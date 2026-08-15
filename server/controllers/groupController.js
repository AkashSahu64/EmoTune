const Chat = require('../models/Chat');
const User = require('../models/User');
const { groupSchema } = require('../utils/validators');
const logger = require('../utils/logger');

exports.createGroup = async (req, res) => {
  try {
    const { error, value } = groupSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, participants, description } = value;

    if (!participants.includes(req.userId.toString())) {
      participants.push(req.userId.toString());
    }

    const uniqueParticipants = [...new Set(participants)];

    const chat = await Chat.create({
      type: 'group',
      name,
      groupDescription: description || '',
      createdBy: req.userId,
      participants: uniqueParticipants.map((p) => ({
        user: p,
        role: p === req.userId.toString() ? 'admin' : 'member',
      })),
    });

    const populated = await Chat.findById(chat._id)
      .populate('participants.user', 'username avatar status');

    req.app.get('io').emit('group:created', {
      chat: populated,
      creatorId: req.userId,
    });

    res.status(201).json({ chat: populated });
  } catch (err) {
    logger.error('Create group error', { error: err.message });
    res.status(500).json({ error: 'Failed to create group' });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const chats = await Chat.find({
      'participants.user': req.userId,
      type: 'group',
    })
      .populate('participants.user', 'username avatar status')
      .populate('lastMessage.sender', 'username')
      .sort({ 'lastMessage.createdAt': -1 });

    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = chat.participants.some(
      (p) => p.user.toString() === req.userId.toString() && p.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can add members' });

    const alreadyMember = chat.participants.some((p) => p.user.toString() === userId);
    if (alreadyMember) return res.status(400).json({ error: 'User is already a member' });

    chat.participants.push({ user: userId, role: 'member' });
    await chat.save();

    const populated = await Chat.findById(chatId)
      .populate('participants.user', 'username avatar status');

    req.app.get('io').to(chatId).emit('group:memberAdded', {
      chat: populated,
      addedUserId: userId,
    });

    res.json({ chat: populated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = chat.participants.some(
      (p) => p.user.toString() === req.userId.toString() && p.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can remove members' });

    chat.participants = chat.participants.filter((p) => p.user.toString() !== userId);
    await chat.save();

    req.app.get('io').to(chatId).emit('group:memberRemoved', {
      chatId,
      removedUserId: userId,
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};
