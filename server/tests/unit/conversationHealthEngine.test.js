const ConversationHealthEngine = require('../../intelligence/conversationHealthEngine');

describe('ConversationHealthEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ConversationHealthEngine();
  });

  describe('analyze', () => {
    it('returns all 8 health dimensions', () => {
      const result = engine.analyze({
        messages: [
          'Hello! How are you?',
          'I am doing great, thanks!',
          'That is wonderful to hear!',
        ],
      });

      const dims = result.dimensions;
      expect(dims).toHaveProperty('friendliness');
      expect(dims).toHaveProperty('toxicity');
      expect(dims).toHaveProperty('respect');
      expect(dims).toHaveProperty('positivity');
      expect(dims).toHaveProperty('empathy');
      expect(dims).toHaveProperty('trust');
      expect(dims).toHaveProperty('excitement');
      expect(dims).toHaveProperty('awkwardness');
    });

    it('returns overallScore, qualityScore, risks, suggestions, and metadata', () => {
      const result = engine.analyze({
        messages: ['Hey!', 'How are you?', 'I am good!'],
      });

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('messageCount');
    });

    it('detects toxicity in flagged messages', () => {
      const result = engine.analyze({
        messages: [
          'Hello!',
          'You are a stupid idiot and I hate you',
          'Shut up and leave me alone',
        ],
      });

      expect(result.dimensions.toxicity.score).toBeLessThan(80);
      expect(result.dimensions.toxicity.flags.length).toBeGreaterThan(0);
    });

    it('returns suggestions array with priority-sorted items', () => {
      const result = engine.analyze({
        messages: [
          'I hate this',
          'You are so stupid',
          'Go away',
        ],
      });

      expect(Array.isArray(result.suggestions)).toBe(true);
      if (result.suggestions.length > 0) {
        expect(result.suggestions[0]).toHaveProperty('type');
        expect(result.suggestions[0]).toHaveProperty('text');
        expect(result.suggestions[0]).toHaveProperty('priority');
        expect(result.suggestions[0]).toHaveProperty('expectedImpact');
      }
    });

    it('handles empty message array gracefully', () => {
      const result = engine.analyze({ messages: [] });

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.dimensions.friendliness.score).toBe(50);
      expect(result.suggestions).toEqual([]);
    });

    it('returns qualityScore between 0 and 100', () => {
      const result = engine.analyze({
        messages: [
          'I love this! It is amazing and wonderful!',
          'That is fantastic, tell me more about it!',
          'Wow, that is incredible! How did you do that?',
        ],
      });

      expect(result.qualityScore.overall).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore.overall).toBeLessThanOrEqual(100);
    });

    it('handles messages with emotion timeline context', () => {
      const result = engine.analyze({
        messages: [
          'I am feeling really sad today',
          'That must be really hard for you',
          'I understand how you feel',
        ],
        emotionTimeline: [
          { emotion: 'sad', confidence: 0.8, weight: 1 },
          { emotion: 'sad', confidence: 0.7, weight: 1 },
          { emotion: 'neutral', confidence: 0.6, weight: 4 },
        ],
      });

      expect(result.dimensions.empathy.score).toBeGreaterThanOrEqual(0);
    });

    it('returns risk array for highly toxic conversation', () => {
      const result = engine.analyze({
        messages: [
          'You are a pathetic loser and I hate everything about you',
          'Shut up stupid idiot, just go away',
          'You are worthless trash',
        ],
      });

      expect(Array.isArray(result.risks)).toBe(true);
      if (result.risks.length > 0) {
        expect(result.risks[0]).toHaveProperty('type');
        expect(result.risks[0]).toHaveProperty('severity');
        expect(result.risks[0]).toHaveProperty('suggestion');
      }
    });

    it('computes overall score between 0-100', () => {
      const result = engine.analyze({
        messages: ['Hello', 'Hi there', 'How are you?', 'Good thanks'],
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
