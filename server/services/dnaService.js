const dnaEngine = require('../intelligence/conversationDNAEngine');

class DNAService {
  async getProfile(userId) {
    return dnaEngine.getDNA(userId);
  }

  async getRecommendationProfile(userId) {
    return dnaEngine.getRecommendationProfile(userId);
  }

  async analyzeMessage(message, userId) {
    return dnaEngine.analyzeMessage(message, userId);
  }

  async analyzeMessageBatch(messages, userId) {
    return dnaEngine.analyzeMessageBatch(messages, userId);
  }

  async resetDNA(userId) {
    return dnaEngine.resetDNA(userId);
  }

  async getTopEmojis(userId, limit = 5) {
    const dna = await dnaEngine.getDNA(userId);
    return (dna.contentPreferences.topEmojis || []).slice(0, limit).map(e => e.emoji);
  }

  async getTopTopics(userId, limit = 3) {
    const dna = await dnaEngine.getDNA(userId);
    return (dna.contentPreferences.favoriteTopics || []).slice(0, limit).map(t => t.value);
  }

  async getWritingStyleProfile(userId) {
    const dna = await dnaEngine.getDNA(userId);
    return {
      preferredReplyLength: dna.writingStyle.preferredReplyLength,
      formality: dna.writingStyle.formalScore,
      humor: dna.writingStyle.humorScore,
      kindness: dna.writingStyle.kindnessScore,
      positivity: dna.writingStyle.positivityScore,
      creativity: dna.writingStyle.creativityScore,
      romantic: dna.writingStyle.romanticScore,
      professional: dna.writingStyle.professionalScore,
      emojiFrequency: dna.writingStyle.emojiFrequency,
      questionFrequency: dna.writingStyle.questionFrequency,
      confidence: dna.writingStyle.confidence,
    };
  }

  async getActivityProfile(userId) {
    const dna = await dnaEngine.getDNA(userId);
    return {
      morningActivity: dna.behavioralPatterns.morningActivity,
      afternoonActivity: dna.behavioralPatterns.afternoonActivity,
      eveningActivity: dna.behavioralPatterns.eveningActivity,
      nightActivity: dna.behavioralPatterns.nightActivity,
      conversationRhythm: dna.behavioralPatterns.conversationRhythm,
      activeHours: dna.behavioralPatterns.activeHours.slice(-10),
    };
  }
}

module.exports = new DNAService();
