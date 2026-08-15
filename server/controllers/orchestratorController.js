const intelligenceOrchestrator = require('../intelligence/intelligenceOrchestrator');
const conversationIntelligenceLayer = require('../intelligence/conversationIntelligenceLayer');
const Message = require('../models/Message');

exports.getIntelligentSuggestions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const suggestions = await intelligenceOrchestrator.getIntelligentSuggestions(chatId, userId);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPredictions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const predictions = await intelligenceOrchestrator.getPredictions(chatId, userId);
    res.json({ predictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHealthAnalysis = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const health = await intelligenceOrchestrator.getHealthAnalysis(chatId, userId);
    res.json({ health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDNAProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const dna = await intelligenceOrchestrator.getDNAProfile(userId);
    res.json({ dna });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const analytics = await intelligenceOrchestrator.getAnalytics(userId);
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    process.nextTick(() => {
      intelligenceOrchestrator.processMessage(message, chatId, userId).catch(() => {});
    });

    res.json({ queued: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
