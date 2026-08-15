const MemoryEmbedding = require('../models/MemoryEmbedding');
const Message = require('../models/Message');
const { searchSimilarMemories } = require('../services/embeddingService');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.searchMemory = async (req, res) => {
  try {
    const { chatId, query } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query required' });

    const user = await User.findById(req.userId).select('+encryptionKey');
    const password = user.encryptionKey || req.userId.toString();

    const results = await searchSimilarMemories(chatId, query, password);

    res.json({ results });
  } catch (err) {
    logger.error('Memory search error', { error: err.message });
    res.status(500).json({ error: 'Failed to search memories' });
  }
};

exports.getMemories = async (req, res) => {
  try {
    const { chatId, page = 1, limit = 20 } = req.query;
    const query = { chat: chatId };
    if (req.query.verified === 'true') query.isVerified = true;
    if (req.query.verified === 'false') query.isVerified = false;

    const memories = await MemoryEmbedding.find(query)
      .populate('sender', 'username avatar')
      .populate('verifiedBy.user', 'username')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await MemoryEmbedding.countDocuments(query);

    res.json({ memories, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
};

exports.requestVerification = async (req, res) => {
  try {
    const { memoryId } = req.params;
    const memory = await MemoryEmbedding.findById(memoryId);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    const alreadyRequested = memory.verifiedBy.some(
      (v) => v.user.toString() === req.userId.toString() && v.status === 'pending'
    );
    if (alreadyRequested) {
      return res.status(400).json({ error: 'Verification already requested' });
    }

    memory.verifiedBy.push({
      user: req.userId,
      status: 'pending',
    });
    await memory.save();

    const io = req.app.get('io');
    io.to(memory.chat.toString()).emit('memory:verifyRequest', {
      memoryId: memory._id,
      textSnippet: memory.textSnippet,
      requestedBy: req.userId,
    });

    res.json({ memory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request verification' });
  }
};

exports.respondVerification = async (req, res) => {
  try {
    const { memoryId, status, editedText } = req.body;
    const memory = await MemoryEmbedding.findById(memoryId);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    const verification = memory.verifiedBy.find(
      (v) => v.user.toString() !== req.userId.toString() && v.status === 'pending'
    );

    if (!verification) {
      memory.verifiedBy.push({
        user: req.userId,
        status,
        editedText: editedText || '',
        respondedAt: new Date(),
      });
    } else {
      verification.status = status;
      verification.editedText = editedText || '';
      verification.respondedAt = new Date();
    }

    const confirmedCount = memory.verifiedBy.filter((v) => v.status === 'confirmed').length;
    memory.isVerified = confirmedCount >= 1;

    await memory.save();

    res.json({ memory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to respond to verification' });
  }
};
