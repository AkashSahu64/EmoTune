jest.mock('../../models/FeedbackEvent');

const mongoose = require('mongoose');
const FeedbackEvent = require('../../models/FeedbackEvent');
const selfLearningEngine = require('../../intelligence/selfLearningEngine');

function mockQueryChain(result) {
  const query = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(result) };
  return query;
}

beforeEach(() => {
  selfLearningEngine.itemScores.clear();
  jest.clearAllMocks();

  FeedbackEvent.find.mockReturnValue(mockQueryChain([]));
  FeedbackEvent.aggregate.mockResolvedValue([]);
});

describe('SelfLearningEngine', () => {
  describe('recordFeedback', () => {
    it('stores feedback and creates a FeedbackEvent', async () => {
      const createdAt = new Date();
      FeedbackEvent.create.mockResolvedValue({
        _id: 'fb1',
        user: 'user1',
        type: 'emoji',
        itemId: '😂',
        itemText: '😂',
        action: 'accepted',
        context: {},
        score: 1,
        createdAt,
      });

      const result = await selfLearningEngine.recordFeedback({
        user: 'user1',
        type: 'emoji',
        itemId: '😂',
        itemText: '😂',
        action: 'accepted',
      });

      expect(FeedbackEvent.create).toHaveBeenCalled();
      expect(result.score).toBe(1);

      const typeMap = selfLearningEngine.itemScores.get('emoji');
      expect(typeMap).toBeDefined();
      expect(typeMap.has('user1:😂')).toBe(true);
    });

    it('assigns default scores based on action type', async () => {
      FeedbackEvent.create.mockImplementation((data) => Promise.resolve({
        ...data,
        _id: 'fb2',
        createdAt: new Date(),
      }));

      const accepted = await selfLearningEngine.recordFeedback({
        user: 'user1', type: 'emoji', itemId: '👍', action: 'accepted',
      });
      expect(accepted.score).toBe(1);

      const dismissed = await selfLearningEngine.recordFeedback({
        user: 'user1', type: 'emoji', itemId: '👎', action: 'dismissed',
      });
      expect(dismissed.score).toBe(-1);

      const viewed = await selfLearningEngine.recordFeedback({
        user: 'user1', type: 'emoji', itemId: '👀', action: 'viewed',
      });
      expect(viewed.score).toBe(0.1);

      const ignored = await selfLearningEngine.recordFeedback({
        user: 'user1', type: 'emoji', itemId: '❌', action: 'ignored',
      });
      expect(ignored.score).toBe(0);
    });
  });

  describe('getItemScore', () => {
    it('returns 0 when no events exist', async () => {
      FeedbackEvent.find.mockReturnValue(mockQueryChain([]));
      const score = await selfLearningEngine.getItemScore('emoji', 'nonexistent');
      expect(score).toBe(0);
    });

    it('returns a score within -1 to 1 range', async () => {
      const recentEvent = { score: 1, createdAt: new Date(Date.now() - 10000) };
      FeedbackEvent.find.mockReturnValue(mockQueryChain([recentEvent]));

      const score = await selfLearningEngine.getItemScore('emoji', '😂');
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('decays older events appropriately', async () => {
      const recentEvent = { score: 1, createdAt: new Date(Date.now() - 1000) };
      const oldEvent = { score: 0, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) };
      FeedbackEvent.find.mockReturnValue(mockQueryChain([recentEvent, oldEvent]));

      const score = await selfLearningEngine.getItemScore('emoji', 'mixed_items');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(1);
      expect(score).toBeLessThan(0.9);
    });
  });

  describe('getTopItems', () => {
    it('returns highest scored items from in-memory map', async () => {
      const typeMap = selfLearningEngine._getNestedMap('emoji');
      typeMap.set('user1:item_a', { totalWeight: 1, weightedSum: 0.9, lastUpdated: Date.now() });
      typeMap.set('user1:item_b', { totalWeight: 1, weightedSum: 0.5, lastUpdated: Date.now() });
      typeMap.set('user1:item_c', { totalWeight: 1, weightedSum: 0.7, lastUpdated: Date.now() });
      typeMap.set('user2:other', { totalWeight: 1, weightedSum: 1.0, lastUpdated: Date.now() });

      const topItems = await selfLearningEngine.getTopItems('user1', 'emoji', 2);

      expect(topItems).toHaveLength(2);
      expect(topItems[0].itemId).toBe('item_a');
      expect(topItems[0].score).toBe(0.9);
      expect(topItems[1].itemId).toBe('item_c');
      expect(topItems[1].score).toBe(0.7);
    });

    it('falls back to database aggregation when in-memory map is empty', async () => {
      const validObjectId = new mongoose.Types.ObjectId().toString();
      FeedbackEvent.aggregate.mockResolvedValue([
        { _id: 'db_item_a', avgScore: 0.8 },
        { _id: 'db_item_b', avgScore: 0.6 },
      ]);

      const topItems = await selfLearningEngine.getTopItems(validObjectId, 'emoji', 5);

      expect(FeedbackEvent.aggregate).toHaveBeenCalled();
      expect(topItems.length).toBeGreaterThan(0);
    });
  });

  describe('getAvoidItems', () => {
    it('returns items with scores below AVOID_THRESHOLD', async () => {
      const typeMap = selfLearningEngine._getNestedMap('emoji');
      typeMap.set('user1:bad', { totalWeight: 1, weightedSum: -0.5, lastUpdated: Date.now() });
      typeMap.set('user1:good', { totalWeight: 1, weightedSum: 0.9, lastUpdated: Date.now() });
      typeMap.set('user1:mid', { totalWeight: 1, weightedSum: -0.2, lastUpdated: Date.now() });

      const avoidItems = await selfLearningEngine.getAvoidItems('user1', 'emoji');

      expect(avoidItems).toContain('bad');
      expect(avoidItems).not.toContain('good');
      expect(avoidItems).not.toContain('mid');
    });
  });

  describe('getPersonalizedRanking', () => {
    it('filters out avoid items and ranks remaining', async () => {
      const typeMap = selfLearningEngine._getNestedMap('emoji');
      typeMap.set('user1:🔥', { totalWeight: 1, weightedSum: 0.9, lastUpdated: Date.now() });
      typeMap.set('user1:💩', { totalWeight: 1, weightedSum: -0.5, lastUpdated: Date.now() });
      typeMap.set('user1:❤️', { totalWeight: 1, weightedSum: 0.3, lastUpdated: Date.now() });

      const items = ['🔥', '💩', '❤️', 'new_item'];
      const ranked = await selfLearningEngine.getPersonalizedRanking('user1', items, 'emoji');

      expect(ranked).not.toContain('💩');
      expect(ranked[0]).toBe('🔥');
      expect(ranked).toContain('new_item');
    });

    it('returns empty array for empty input', async () => {
      const ranked = await selfLearningEngine.getPersonalizedRanking('user1', [], 'emoji');
      expect(ranked).toEqual([]);
    });
  });
});
