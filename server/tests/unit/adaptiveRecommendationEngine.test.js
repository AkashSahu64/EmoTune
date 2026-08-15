jest.mock('../../intelligence/recommendationEngine', () => ({}));
jest.mock('../../intelligence/timeIntelligence', () => ({
  getCurrentTimeContext: jest.fn(() => ({ partOfDay: 'afternoon', dayType: 'weekday' })),
  getTimeBasedEmojis: jest.fn(() => ['🌞', '☀️', '😊']),
  getFestivalSuggestions: jest.fn(() => ({ emojis: ['🎉', '🎊'] })),
}));

const AdaptiveRecommendationEngine = require('../../intelligence/adaptiveRecommendationEngine');

describe('AdaptiveRecommendationEngine', () => {
  let engine;
  let defaultContext;

  beforeEach(() => {
    engine = new AdaptiveRecommendationEngine();
    engine.recentSuggestions.clear();

    defaultContext = {
      currentEmotion: { emotion: 'neutral', confidence: 0.5 },
      conversationState: 'small_talk',
      relationshipType: 'friend',
      goals: { primary: 'casual_chat', secondary: [] },
      timeContext: { partOfDay: 'afternoon', dayType: 'weekday' },
      momentum: {},
      topics: ['general'],
      userDNA: {
        topEmojis: ['😂', '❤️', '😊'],
        topTopics: ['music', 'movies'],
        writingStyle: { formalScore: 0.5, humorScore: 0.3, positivityScore: 0.6, emojiFrequency: 0.3 },
      },
      chatId: 'chat123',
    };
  });

  describe('getRecommendations', () => {
    it('returns all 7 content types', () => {
      const recs = engine.getRecommendations(defaultContext);

      expect(recs).toHaveProperty('emojis');
      expect(recs).toHaveProperty('gifs');
      expect(recs).toHaveProperty('stickers');
      expect(recs).toHaveProperty('shayaris');
      expect(recs).toHaveProperty('songs');
      expect(recs).toHaveProperty('videos');
      expect(recs).toHaveProperty('suggestions');
      expect(recs).toHaveProperty('metadata');
    });

    it('returns emojis array with scored items', () => {
      const recs = engine.getRecommendations(defaultContext);

      expect(Array.isArray(recs.emojis)).toBe(true);
      expect(recs.emojis.length).toBeGreaterThan(0);
      expect(recs.emojis[0]).toHaveProperty('emoji');
      expect(typeof recs.emojis[0].emoji).toBe('string');
    });

    it('returns suggestions array with text items', () => {
      const recs = engine.getRecommendations(defaultContext);

      expect(Array.isArray(recs.suggestions)).toBe(true);
      expect(recs.suggestions.length).toBeGreaterThan(0);
      expect(recs.suggestions[0]).toHaveProperty('text');
    });

    it('handles minimal context gracefully', () => {
      const minimalContext = {
        currentEmotion: {},
        goals: {},
        chatId: 'minimal_chat',
      };

      const recs = engine.getRecommendations(minimalContext);

      expect(recs.emojis).toBeDefined();
      expect(recs.gifs).toBeDefined();
      expect(recs.stickers).toBeDefined();
      expect(recs.shayaris).toBeDefined();
      expect(recs.songs).toBeDefined();
      expect(recs.videos).toBeDefined();
      expect(recs.suggestions).toBeDefined();
    });

    it('handles romantic emotion context', () => {
      const romanticContext = {
        ...defaultContext,
        currentEmotion: { emotion: 'romantic', confidence: 0.9 },
        relationshipType: 'romantic',
        goals: { primary: 'dating', secondary: [] },
      };

      const recs = engine.getRecommendations(romanticContext);

      expect(recs.emojis.length).toBeGreaterThan(0);
    });
  });

  describe('_calculateMultiFactorScore', () => {
    it('returns a value between 0 and 1 for any item', () => {
      const ctx = {
        emotionId: 'neutral',
        emotionConfidence: 0.5,
        relType: 'friend',
        goals: { primary: 'casual_chat' },
        timeContext: { partOfDay: 'afternoon' },
        momentum: null,
        topics: ['general'],
        userDNA: null,
        state: 'small_talk',
        chatId: 'test',
        userId: 'user1',
        now: Date.now(),
        options: {},
        randomness: 0,
      };

      const item = { emoji: '😊', source: 'fallback' };
      const score = engine._calculateMultiFactorScore(item, ctx);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('_applyDiversityPenalty', () => {
    it('penalizes items with duplicate sources', () => {
      const candidates = [
        { emoji: '😊', source: 'emotion', score: 0.9 },
        { emoji: '😂', source: 'emotion', score: 0.8 },
        { emoji: '❤️', source: 'goal', score: 0.7 },
        { emoji: '👍', source: 'goal', score: 0.6 },
      ];

      const result = engine._applyDiversityPenalty(candidates);

      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBeLessThan(0.8);
      expect(result[2].score).toBe(0.7);
      expect(result[3].score).toBeLessThan(0.6);
    });

    it('returns unchanged array for single item', () => {
      const candidates = [{ emoji: '😊', source: 'emotion', score: 0.9 }];
      const result = engine._applyDiversityPenalty(candidates);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(0.9);
    });

    it('handles items without source property', () => {
      const candidates = [
        { emoji: '😊', score: 0.9 },
        { emoji: '😂', score: 0.8 },
      ];

      const result = engine._applyDiversityPenalty(candidates);

      expect(result).toHaveLength(2);
      expect(result[1].score).toBeLessThan(0.8);
    });

    it('returns as-is for empty or single-element arrays', () => {
      expect(engine._applyDiversityPenalty([])).toEqual([]);
      expect(engine._applyDiversityPenalty([{ score: 1 }])).toHaveLength(1);
    });
  });
});
