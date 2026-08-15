const GhostSession = require('../models/GhostSession');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const logger = require('../utils/logger');

exports.createSession = async (req, res) => {
  try {
    const { chatId, type, ttl } = req.body;
    if (!chatId || !type) {
      return res.status(400).json({ error: 'chatId and type are required' });
    }
    if (!['whiteboard', 'document', 'code'].includes(type)) {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const isMember = chat.participants.some((p) => p.user.toString() === req.userId.toString());
    if (!isMember) return res.status(403).json({ error: 'Not a member of this chat' });

    const duration = Math.min(Math.max(ttl || 3600, 300), 86400);
    const expiresAt = new Date(Date.now() + duration * 1000);

    const session = await GhostSession.create({
      chat: chatId,
      type,
      createdBy: req.userId,
      ttl: duration,
      expiresAt,
      participants: [{ user: req.userId, joinedAt: new Date() }],
      data: { content: '', document: '', code: '', language: 'javascript', whiteboard: {} },
    });

    const io = req.app.get('io');
    io.to(chatId).emit('ghost:sessionCreated', { session });

    res.status(201).json({ session });
  } catch (err) {
    logger.error('Create ghost session error', { error: err.message });
    res.status(500).json({ error: 'Failed to create ghost session' });
  }
};

exports.getChatSessions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const sessions = await GhostSession.find({ chat: chatId, isActive: true })
      .populate('createdBy', 'username avatar')
      .populate('participants.user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

exports.destroySession = async (req, res) => {
  try {
    const session = await GhostSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can destroy this session' });
    }

    session.isActive = false;
    session.destroyedAt = new Date();
    await session.save();

    const finalContent = session.data?.content || session.data?.document || session.data?.code || '';
    if (finalContent.trim()) {
      const chat = await Chat.findById(session.chat);
      if (chat) {
        const messageType = session.type === 'code' ? 'code' : session.type === 'document' ? 'document' : 'text';
        const message = await Message.create({
          chat: session.chat,
          sender: req.userId,
          content: finalContent.slice(0, 5000),
          type: messageType,
          metadata: {
            ghostSession: true,
            sessionType: session.type,
            originalSessionId: session._id,
          },
        });
        const io = req.app.get('io');
        io.to(session.chat.toString()).emit('message:receive', { message });
        io.to(session.chat.toString()).emit('ghost:sessionEnded', { sessionId: session._id, message });
      }
    }

    const io = req.app.get('io');
    io.to(session.chat.toString()).emit('ghost:sessionDestroyed', { sessionId: session._id });

    res.json({ session });
  } catch (err) {
    logger.error('Destroy ghost session error', { error: err.message });
    res.status(500).json({ error: 'Failed to destroy session' });
  }
};
