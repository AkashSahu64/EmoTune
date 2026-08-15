const learningService = require('../services/learningService');
const logger = require('../utils/logger');
const orchestrator = require('../intelligence/intelligenceOrchestrator');

exports.recordFeedback = async (req, res) => {
  try {
    const { type, itemId, itemText, action, context } = req.body;
    if (!type || !action) {
      return res.status(400).json({ error: 'type and action are required' });
    }

    const validActions = ['accepted', 'dismissed', 'viewed'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
    }

    const result = await orchestrator.recordFeedback(req.userId, type, itemId, action, {
      itemText,
      chatId: context?.chatId,
      messageId: context?.messageId,
      emotion: context?.emotion,
      state: context?.state,
      topic: context?.topic,
    });

    res.status(201).json({ feedback: result });
  } catch (err) {
    logger.error('Record feedback error', { error: err.message });
    res.status(500).json({ error: 'Failed to record feedback' });
  }
};
