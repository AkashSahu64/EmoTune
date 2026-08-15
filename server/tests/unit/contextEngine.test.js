const contextEngine = require('../../intelligence/contextEngine');

describe('ContextEngine', () => {
  beforeEach(() => {
    contextEngine._lastBuiltAt = null;
    contextEngine._lastContext = null;
  });

  describe('buildContext', () => {
    it('returns full context shape with all required fields', () => {
      const options = {
        chatId: 'chat123',
        conversationHistory: [{ text: 'Hello', role: 'user' }],
        conversationState: { currentState: 'greeting', messageCount: 1 },
        emotionTimeline: [{ emotion: 'happy', confidence: 0.8, weight: 7 }],
        relationshipProfile: { type: 'friend', score: 75 },
        topicEvolution: { topics: [{ topic: 'music', lastSeen: Date.now() }] },
        conversationGoal: { primary: 'casual_chat', confidence: 0.9 },
        conversationDNA: {
          writingStyle: { avgMessageLength: 50, formalScore: 0.5, casualScore: 0.5, humorScore: 0.3, positivityScore: 0.6, emojiFrequency: 0.3 },
          contentPreferences: { topEmojis: [], favoriteTopics: [] },
          behavioralPatterns: { activeHours: [14], conversationRhythm: 'moderate' },
          language: { primary: 'en' },
          metadata: { totalMessages: 10 },
        },
        currentTime: { partOfDay: 'afternoon', dayType: 'weekday' },
        memory: { memories: [{ id: 'mem1', text: 'Important fact' }] },
        previousSuggestions: ['How are you?'],
        acceptanceRate: 0.7,
        momentum: { isActive: true },
      };

      const context = contextEngine.buildContext(options);

      expect(context).toHaveProperty('conversation');
      expect(context).toHaveProperty('emotion');
      expect(context).toHaveProperty('relationship');
      expect(context).toHaveProperty('topic');
      expect(context).toHaveProperty('goal');
      expect(context).toHaveProperty('user');
      expect(context).toHaveProperty('time');
      expect(context).toHaveProperty('memory');
      expect(context).toHaveProperty('recommendations');
      expect(context).toHaveProperty('confidence');
      expect(context.confidence).toHaveProperty('overall');
      expect(context.confidence).toHaveProperty('perSignal');
      expect(context).toHaveProperty('_meta');
      expect(context._meta).toHaveProperty('builtAt');
      expect(context._meta).toHaveProperty('sourceCount');
      expect(context._meta).toHaveProperty('signalsUsed');
    });

    it('handles empty options gracefully', () => {
      const context = contextEngine.buildContext({});

      expect(context.conversation.messageCount).toBe(0);
      expect(context.emotion.current).toBe('neutral');
      expect(context.relationship.type).toBe('unknown');
      expect(context.topic.current).toBe('general');
      expect(context.goal.primary).toBe('casual_chat');
      expect(context.user.dna.confidence).toBe(0);
      expect(context.time.partOfDay).toBeNull();
      expect(context.time.hour).toBeGreaterThanOrEqual(0);
      expect(context.memory.relevantMemories).toEqual([]);
      expect(context.recommendations.acceptanceRate).toBe(0.5);
    });

    it('handles partial emotion timeline data', () => {
      const context = contextEngine.buildContext({
        emotionTimeline: [],
      });

      expect(context.emotion.current).toBe('neutral');
      expect(context.emotion.confidence).toBe(0);
    });

    it('handles missing signals gracefully with undefined inputs', () => {
      const context = contextEngine.buildContext({
        chatId: 'test123',
        conversationState: undefined,
        emotionTimeline: undefined,
        relationshipProfile: undefined,
        topicEvolution: undefined,
        conversationGoal: undefined,
        conversationDNA: undefined,
        currentTime: undefined,
        memory: undefined,
      });

      expect(context.conversation.id).toBe('test123');
      expect(context.emotion.current).toBe('neutral');
      expect(context.relationship.type).toBe('unknown');
      expect(context.topic.current).toBe('general');
      expect(context.goal.primary).toBe('casual_chat');
    });
  });

  describe('getContextualBoost', () => {
    it('returns a value between 0 and 3', () => {
      const context = contextEngine.buildContext({
        emotionTimeline: [{ emotion: 'joyful', confidence: 0.9, weight: 10 }],
        relationshipProfile: { type: 'friend', score: 70 },
        conversationState: { currentState: 'discussion' },
      });

      const boost = contextEngine.getContextualBoost(context, 'emoji');
      expect(boost).toBeGreaterThanOrEqual(0);
      expect(boost).toBeLessThanOrEqual(3);
    });

    it('returns 1.0 for null context', () => {
      const boost = contextEngine.getContextualBoost(null, 'emoji');
      expect(boost).toBe(1.0);
    });

    it('returns different boosts for different suggestion types', () => {
      const context = contextEngine.buildContext({
        emotionTimeline: [{ emotion: 'romantic', confidence: 0.9, weight: 6 }],
        relationshipProfile: { type: 'romantic', score: 90 },
        conversationState: { currentState: 'flirting' },
      });

      const shayariBoost = contextEngine.getContextualBoost(context, 'shayari');
      const replyBoost = contextEngine.getContextualBoost(context, 'reply');
      expect(shayariBoost).not.toBe(replyBoost);
    });
  });

  describe('getContextSummary', () => {
    it('returns a non-empty string for valid context', () => {
      const context = contextEngine.buildContext({
        emotionTimeline: [{ emotion: 'happy', confidence: 0.8, weight: 7 }],
        relationshipProfile: { type: 'friend', score: 75 },
        topicEvolution: { topics: [{ topic: 'music', lastSeen: Date.now() }] },
        conversationGoal: { primary: 'casual_chat', confidence: 0.9 },
        conversationState: { currentState: 'discussion', messageCount: 5 },
        currentTime: { partOfDay: 'evening' },
      });

      const summary = contextEngine.getContextSummary(context);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('returns fallback message for null context', () => {
      const summary = contextEngine.getContextSummary(null);
      expect(summary).toBe('No context available.');
    });
  });

  describe('shouldRefreshContext', () => {
    it('returns true for null context', () => {
      expect(contextEngine.shouldRefreshContext(null)).toBe(true);
    });

    it('returns true for context without _meta.builtAt', () => {
      expect(contextEngine.shouldRefreshContext({})).toBe(true);
    });

    it('returns true for old context beyond TTL', () => {
      const oldContext = {
        _meta: {
          builtAt: new Date(Date.now() - 60000),
        },
      };
      expect(contextEngine.shouldRefreshContext(oldContext)).toBe(true);
    });

    it('returns false for recent context', () => {
      const recentContext = {
        _meta: {
          builtAt: new Date(),
        },
      };
      expect(contextEngine.shouldRefreshContext(recentContext)).toBe(false);
    });
  });
});
