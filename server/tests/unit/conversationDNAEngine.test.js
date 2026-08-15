jest.mock('../../models/ConversationDNA');

const ConversationDNA = require('../../models/ConversationDNA');
const dnaEngine = require('../../intelligence/conversationDNAEngine');

function createMockDNA(overrides = {}) {
  const dna = {
    user: 'user123',
    version: 2,
    language: { primary: 'en', secondary: '', confidence: 0 },
    writingStyle: {
      avgMessageLength: 0,
      preferredReplyLength: 'medium',
      formalScore: 0.5,
      casualScore: 0.5,
      humorScore: 0.3,
      sarcasmScore: 0.1,
      kindnessScore: 0.7,
      positivityScore: 0.6,
      creativityScore: 0.4,
      professionalScore: 0.3,
      romanticScore: 0.2,
      questionFrequency: 0.3,
      greetingStyle: 'casual',
      endingStyle: 'casual',
      emojiFrequency: 0.3,
      emojiDensity: 0,
      confidence: 0,
    },
    contentPreferences: {
      favoriteEmojis: [],
      favoriteGifCategories: [],
      favoriteStickers: [],
      favoriteSongs: [],
      favoriteVideos: [],
      favoriteShayaris: [],
      favoriteTopics: [],
      topEmojis: [],
    },
    behavioralPatterns: {
      typingSpeed: 0,
      avgReplyDelay: 0,
      messageCount: 0,
      sessionLength: 0,
      activeHours: [],
      timeBuckets: [],
      morningActivity: 0,
      afternoonActivity: 0,
      eveningActivity: 0,
      nightActivity: 0,
      weekendRatio: 0.5,
      weekdayRatio: 0.5,
      conversationRhythm: 'moderate',
      responseTimePercentiles: { p50: 0, p90: 0 },
    },
    relationshipPatterns: {
      dominantRelationshipType: 'unknown',
      relationshipDiversity: 0,
      groupChatPreference: 0.3,
    },
    metadata: {
      firstMessageAt: null,
      lastMessageAt: null,
      totalConversations: 0,
      totalMessages: 0,
      lastUpdated: new Date(),
      updateCount: 0,
    },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return dna;
}

let mockDNA;

beforeEach(() => {
  jest.clearAllMocks();
  mockDNA = createMockDNA();
  ConversationDNA.findOne.mockResolvedValue(mockDNA);
});

describe('ConversationDNAEngine', () => {
  describe('getDNA', () => {
    it('returns existing DNA when found', async () => {
      ConversationDNA.findOne.mockResolvedValue(mockDNA);
      const result = await dnaEngine.getDNA('user123');
      expect(result).toBe(mockDNA);
      expect(ConversationDNA.findOne).toHaveBeenCalledWith({ user: 'user123' });
    });

    it('creates new DNA when not found', async () => {
      ConversationDNA.findOne.mockResolvedValue(null);
      const newDNA = createMockDNA({ user: 'user456' });
      ConversationDNA.create.mockResolvedValue(newDNA);

      const result = await dnaEngine.getDNA('user456');
      expect(result).toBe(newDNA);
      expect(ConversationDNA.create).toHaveBeenCalledWith(
        expect.objectContaining({ user: 'user456' })
      );
    });
  });

  describe('analyzeMessage', () => {
    it('updates language preferences for English text', async () => {
      await dnaEngine.analyzeMessage(
        { content: 'Hello, how are you doing today?' },
        'user123'
      );
      expect(mockDNA.language.primary).toBe('en');
      expect(mockDNA.save).toHaveBeenCalled();
    });

    it('updates language preferences for Hindi text', async () => {
      mockDNA.writingStyle.avgMessageLength = 0;
      await dnaEngine.analyzeMessage(
        { content: 'नमस्ते कैसे हैं आप? मैं ठीक हूँ।' },
        'user123'
      );
      expect(mockDNA.language.primary).toBe('hi');
    });

    it('detects writing style scores from formal text', async () => {
      const formalText = 'please kindly appreciate regarding respectfully sincerely would kindly please could';
      await dnaEngine.analyzeMessage({ content: formalText }, 'user123');

      expect(mockDNA.writingStyle.formalScore).toBeGreaterThan(0.5);
      expect(mockDNA.writingStyle.avgMessageLength).toBeGreaterThan(0);
    });

    it('tracks emoji usage in messages', async () => {
      await dnaEngine.analyzeMessage(
        { content: 'I am so happy today 😂❤️😊👍🎉' },
        'user123'
      );

      expect(mockDNA.contentPreferences.topEmojis.length).toBeGreaterThan(0);
      expect(mockDNA.contentPreferences.favoriteEmojis.length).toBeGreaterThan(0);
      expect(mockDNA.writingStyle.emojiDensity).toBeGreaterThan(0);
      expect(mockDNA.writingStyle.emojiFrequency).toBeGreaterThan(0.3);
    });

    it('updates behavioral patterns including active hours and message count', async () => {
      const messageDate = new Date('2026-01-15T14:30:00');
      await dnaEngine.analyzeMessage(
        { content: 'Hello there! Testing the engine.', createdAt: messageDate },
        'user123'
      );

      expect(mockDNA.behavioralPatterns.messageCount).toBe(1);
      expect(mockDNA.behavioralPatterns.activeHours).toContain(14);
      expect(mockDNA.metadata.totalMessages).toBe(1);
      expect(mockDNA.metadata.updateCount).toBe(1);
    });

    it('handles different message types like gif and sticker', async () => {
      await dnaEngine.analyzeMessage(
        {
          content: '',
          type: 'gif',
          metadata: { gifQuery: 'happy dance' },
        },
        'user123'
      );

      expect(mockDNA.contentPreferences.favoriteGifCategories.length).toBeGreaterThan(0);
      expect(mockDNA.save).toHaveBeenCalled();
    });

    it('detects and tracks topics from message content', async () => {
      await dnaEngine.analyzeMessage(
        { content: 'I love listening to music and watching movies on Netflix.' },
        'user123'
      );

      const topics = mockDNA.contentPreferences.favoriteTopics.map(t => t.value);
      expect(topics).toContain('music');
      expect(topics).toContain('movies');
    });
  });

  describe('getRecommendationProfile', () => {
    it('returns proper shape with all required fields', async () => {
      mockDNA.writingStyle.formalScore = 0.7;
      mockDNA.writingStyle.humorScore = 0.6;
      mockDNA.writingStyle.positivityScore = 0.8;
      mockDNA.writingStyle.romanticScore = 0.3;
      mockDNA.writingStyle.emojiFrequency = 0.5;
      mockDNA.metadata.totalMessages = 25;
      mockDNA.contentPreferences.topEmojis = [
        { emoji: '😂', count: 5 },
        { emoji: '❤️', count: 3 },
      ];

      const profile = await dnaEngine.getRecommendationProfile('user123');

      expect(profile).toHaveProperty('topEmojis');
      expect(profile).toHaveProperty('topTopics');
      expect(profile).toHaveProperty('writingStyle');
      expect(profile.writingStyle).toHaveProperty('formality');
      expect(profile.writingStyle).toHaveProperty('humor');
      expect(profile.writingStyle).toHaveProperty('positivity');
      expect(profile.writingStyle).toHaveProperty('romantic');
      expect(profile.writingStyle).toHaveProperty('emojiPreference');
      expect(profile).toHaveProperty('language', 'en');
      expect(profile).toHaveProperty('activeHour');
      expect(profile).toHaveProperty('rhythm');
      expect(profile).toHaveProperty('confidence');
      expect(profile.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('resetDNA', () => {
    it('deletes existing DNA and creates a fresh one', async () => {
      ConversationDNA.deleteOne.mockResolvedValue({ deletedCount: 1 });
      ConversationDNA.findOne.mockResolvedValue(null);
      const freshDNA = createMockDNA({ user: 'user123' });
      ConversationDNA.create.mockResolvedValue(freshDNA);

      const result = await dnaEngine.resetDNA('user123');

      expect(ConversationDNA.deleteOne).toHaveBeenCalledWith({ user: 'user123' });
      expect(ConversationDNA.create).toHaveBeenCalled();
      expect(result).toBe(freshDNA);
    });
  });
});
