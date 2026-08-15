const FeedbackEvent = require('../models/FeedbackEvent');
const selfLearningEngine = require('../intelligence/selfLearningEngine');

class LearningService {
  async recordAcceptance(userId, type, itemId, itemText, context) {
    return selfLearningEngine.recordFeedback({
      user: userId,
      type,
      itemId,
      itemText,
      action: 'accepted',
      context: context || {},
      score: 1,
      confidence: 0.9,
    });
  }

  async recordDismissal(userId, type, itemId, itemText, context) {
    return selfLearningEngine.recordFeedback({
      user: userId,
      type,
      itemId,
      itemText,
      action: 'dismissed',
      context: context || {},
      score: -1,
      confidence: 0.8,
    });
  }

  async recordView(userId, type, itemId, itemText, context) {
    return selfLearningEngine.recordFeedback({
      user: userId,
      type,
      itemId,
      itemText,
      action: 'viewed',
      context: context || {},
      score: 0.1,
      confidence: 0.3,
    });
  }

  async getPersonalizedSuggestions(userId, type, candidates) {
    const ranked = await selfLearningEngine.getPersonalizedRanking(userId, candidates, type);
    return ranked;
  }

  async getExcludedItems(userId, type) {
    return selfLearningEngine.getAvoidItems(userId, type);
  }
}

module.exports = new LearningService();
