jest.mock('../../core/providerManager', () => ({
  chatCompletion: jest.fn().mockRejectedValue(new Error('Mocked AI failure')),
}));

const { GoalDetectionEngine, GOAL_CATEGORIES, GOAL_DESCRIPTIONS, GOAL_INFLUENCES } = require('../../intelligence/goalDetectionEngine');

describe('GoalDetectionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new GoalDetectionEngine({ confidenceThreshold: 0 });
  });

  describe('detectGoal', () => {
    it('returns planning as primary goal for planning-related messages', () => {
      const result = engine.detectGoal([
        { text: 'Let\'s plan our trip to Goa', role: 'user' },
        { text: 'We need to decide the dates and itinerary', role: 'user' },
      ]);

      expect(result.primary).toBe('planning');
      expect(result.confidence).toBeGreaterThan(0);
      expect(Array.isArray(result.secondary)).toBe(true);
      expect(result.signals.length).toBeGreaterThan(0);
    });

    it('returns coding as primary goal for coding-related messages', () => {
      const result = engine.detectGoal([
        { text: 'I have a bug in my code', role: 'user' },
        { text: 'Can you help me debug this error?', role: 'user' },
      ]);

      expect(result.primary).toBe('coding');
    });

    it('returns casual_chat as default for non-specific messages', () => {
      const result = engine.detectGoal([
        { text: 'The sky is blue today', role: 'user' },
        { text: 'I like pizza', role: 'user' },
      ]);

      expect(result.primary).toBe('casual_chat');
    });

    it('returns learning goal for learning-related messages', () => {
      const result = engine.detectGoal([
        { text: 'How do I learn JavaScript quickly?', role: 'user' },
      ]);

      expect(result.primary).toBe('learning');
    });

    it('returns support goal for support-seeking messages', () => {
      const result = engine.detectGoal([
        { text: 'I need help, I am struggling with something', role: 'user' },
      ]);

      expect(result.primary).toBe('support');
    });
  });

  describe('detectGoalFromMessage', () => {
    it('accepts a single string message', () => {
      const result = engine.detectGoalFromMessage('How about a birthday surprise for my party?');

      expect(result.primary).toBe('birthday');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('accepts an object message', () => {
      const result = engine.detectGoalFromMessage({ text: 'I need to buy a new phone', role: 'user' });

      expect(result.primary).toBe('shopping');
    });
  });

  describe('getGoalDescription', () => {
    it('returns a description string for all known goal categories', () => {
      for (const category of GOAL_CATEGORIES) {
        const desc = engine.getGoalDescription(category);
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      }
    });

    it('returns default description for unknown goal', () => {
      const desc = engine.getGoalDescription('unknown_goal_type');
      expect(desc).toBe('User is engaging in conversation');
    });
  });

  describe('getGoalInfluence', () => {
    it('returns boost and suppress arrays for known goals', () => {
      for (const category of GOAL_CATEGORIES) {
        const influence = engine.getGoalInfluence(category);
        expect(influence).toHaveProperty('boost');
        expect(influence).toHaveProperty('suppress');
        expect(Array.isArray(influence.boost)).toBe(true);
        expect(Array.isArray(influence.suppress)).toBe(true);
      }
    });

    it('returns empty arrays for unknown goal', () => {
      const influence = engine.getGoalInfluence('unknown');
      expect(influence).toEqual({ boost: [], suppress: [] });
    });
  });
});
