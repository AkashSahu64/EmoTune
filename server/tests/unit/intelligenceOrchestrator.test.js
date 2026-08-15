jest.mock('../../intelligence/conversationIntelligenceLayer', () => ({
  analyze: jest.fn().mockResolvedValue(),
  getContext: jest.fn().mockResolvedValue({
    emotion: { current: { emotion: 'neutral', confidence: 0.5 } },
    state: { current: 'small_talk' },
    relationship: { type: 'friend', score: 50 },
    topic: { current: 'general' },
    momentum: {},
  }),
  getRecommendations: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../intelligence/conversationDNAEngine', () => ({
  analyzeMessage: jest.fn().mockResolvedValue({}),
  getDNA: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../intelligence/selfLearningEngine', () => ({}));

jest.mock('../../intelligence/goalDetectionEngine', () => ({}));

jest.mock('../../intelligence/memoryClassifier', () => {
  return jest.fn().mockImplementation(() => ({
    classifyMemory: jest.fn().mockReturnValue({ type: 'factual' }),
  }));
});

jest.mock('../../services/memoryClassificationService', () => ({
  classifyAndStore: jest.fn().mockResolvedValue(),
}));

jest.mock('../../services/analyticsService', () => ({
  trackEvent: jest.fn().mockResolvedValue(),
  getStats: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../services/learningService', () => ({
  getPersonalizedSuggestions: jest.fn().mockResolvedValue([]),
  recordAcceptance: jest.fn().mockResolvedValue({}),
  recordDismissal: jest.fn().mockResolvedValue({}),
  recordView: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../services/dnaService', () => ({
  getRecommendationProfile: jest.fn().mockResolvedValue({
    topEmojis: ['😂', '❤️'],
    topTopics: ['music'],
    writingStyle: { formality: 0.5, humor: 0.3, positivity: 0.6, romantic: 0.2, emojiPreference: 0.3 },
    language: 'en',
    activeHour: 14,
    rhythm: 'moderate',
    confidence: 0.5,
  }),
}));

jest.mock('../../services/goalService', () => ({
  getConversationGoal: jest.fn().mockResolvedValue({ primary: 'casual_chat', confidence: 0.5 }),
}));

jest.mock('../../services/timeService', () => ({
  getTimeContext: jest.fn().mockResolvedValue({ partOfDay: 'afternoon', dayType: 'weekday' }),
}));

jest.mock('../../intelligence/timeIntelligence', () => ({
  getCurrentTimeContext: jest.fn(() => ({ partOfDay: 'afternoon', dayType: 'weekday' })),
}));

jest.mock('../../intelligence/explainableAI', () => ({
  explainRecommendation: jest.fn(() => 'Recommended based on your mood'),
}));

const orchestrator = require('../../intelligence/intelligenceOrchestrator');

describe('IntelligenceOrchestrator', () => {
  it('has all engine imports valid (smoke test)', () => {
    expect(orchestrator).toBeDefined();
    expect(orchestrator.constructor.name).toBe('IntelligenceOrchestrator');
    expect(orchestrator.memoryClassifier).toBeDefined();
    expect(orchestrator.adaptiveRecommendationEngine).toBeDefined();
    expect(orchestrator.futurePredictionEngine).toBeDefined();
    expect(orchestrator.conversationHealthEngine).toBeDefined();
  });

  it('processMessage runs without throwing', async () => {
    await expect(
      orchestrator.processMessage(
        { _id: 'msg1', content: 'Hello', type: 'text' },
        'chat123',
        'user123'
      )
    ).resolves.not.toThrow();
  });

  it('processMessage handles errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await orchestrator.processMessage(
      { _id: 'msg2', content: 'Test', type: 'text' },
      'chat456',
      'user456'
    );

    consoleSpy.mockRestore();
  });
});
