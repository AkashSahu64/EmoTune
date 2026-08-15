const mongoose = require('mongoose');
const FeedbackEvent = require('../models/FeedbackEvent');

const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const AVOID_THRESHOLD = -0.3;
const BOOST_THRESHOLD = 0.7;
const BOOST_FACTOR = 1.3;

class SelfLearningEngine {
  constructor() {
    this.itemScores = new Map();
  }

  _getDecayWeight(createdAt) {
    const age = Date.now() - new Date(createdAt).getTime();
    return Math.pow(0.5, age / HALF_LIFE_MS);
  }

  _getNestedMap(type) {
    if (!this.itemScores.has(type)) {
      this.itemScores.set(type, new Map());
    }
    return this.itemScores.get(type);
  }

  async recordFeedback(event) {
    const feedback = await FeedbackEvent.create({
      user: event.user,
      type: event.type,
      itemId: event.itemId || '',
      itemText: event.itemText || '',
      action: event.action,
      context: {
        chatId: event.context?.chatId || '',
        messageId: event.context?.messageId || '',
        emotion: event.context?.emotion || '',
        state: event.context?.state || '',
        topic: event.context?.topic || '',
      },
      score: event.score ?? this._defaultScoreForAction(event.action),
      confidence: event.confidence ?? 0.5,
    });

    await this._updateItemScore(feedback.user, feedback.type, feedback.itemId, feedback.score, feedback.createdAt);
    return feedback;
  }

  _defaultScoreForAction(action) {
    switch (action) {
      case 'accepted': return 1;
      case 'dismissed': return -1;
      case 'ignored': return 0;
      case 'viewed': return 0.1;
      default: return 0;
    }
  }

  async _updateItemScore(userId, type, itemId, score, createdAt) {
    const typeMap = this._getNestedMap(type);
    const key = `${userId}:${itemId}`;
    const existing = typeMap.get(key) || { totalWeight: 0, weightedSum: 0, lastUpdated: null };
    const decay = this._getDecayWeight(createdAt);
    existing.totalWeight += decay;
    existing.weightedSum += score * decay;
    existing.lastUpdated = Date.now();
    typeMap.set(key, existing);
  }

  async getItemScore(type, itemId) {
    const events = await FeedbackEvent.find({ type, itemId }).select('score createdAt').lean();
    if (!events.length) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const event of events) {
      const decay = this._getDecayWeight(event.createdAt);
      weightedSum += event.score * decay;
      totalWeight += decay;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  async getTopItems(userId, type, limit = 10) {
    const typeMap = this._getNestedMap(type);
    const scored = [];
    for (const [key, data] of typeMap) {
      const [uid, itemId] = key.split(':');
      if (uid !== userId) continue;
      const avgScore = data.totalWeight > 0 ? data.weightedSum / data.totalWeight : 0;
      scored.push({ itemId, score: avgScore });
    }
    if (scored.length === 0) {
      const events = await FeedbackEvent.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), type } },
        { $group: { _id: '$itemId', totalWeight: { $sum: 1 }, weightedSum: { $sum: '$score' } } },
        { $addFields: { avgScore: { $divide: ['$weightedSum', '$totalWeight'] } } },
        { $sort: { avgScore: -1 } },
        { $limit: limit },
      ]);
      return events.map(e => ({ itemId: e._id, score: e.avgScore }));
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async getAvoidItems(userId, type) {
    const typeMap = this._getNestedMap(type);
    const avoid = [];
    for (const [key, data] of typeMap) {
      const [uid, itemId] = key.split(':');
      if (uid !== userId) continue;
      const avgScore = data.totalWeight > 0 ? data.weightedSum / data.totalWeight : 0;
      if (avgScore < AVOID_THRESHOLD) {
        avoid.push(itemId);
      }
    }
    if (avoid.length === 0) {
      const events = await FeedbackEvent.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), type } },
        { $group: { _id: '$itemId', totalWeight: { $sum: 1 }, weightedSum: { $sum: '$score' } } },
        { $addFields: { avgScore: { $divide: ['$weightedSum', '$totalWeight'] } } },
        { $match: { avgScore: { $lt: AVOID_THRESHOLD } } },
      ]);
      return events.map(e => e._id);
    }
    return avoid;
  }

  async updateScoresFromFeedback(userId) {
    const events = await FeedbackEvent.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const localScores = new Map();
    for (const event of events) {
      const key = `${event.type}:${event.itemId || ''}`;
      if (!localScores.has(key)) {
        localScores.set(key, { totalWeight: 0, weightedSum: 0 });
      }
      const data = localScores.get(key);
      const decay = this._getDecayWeight(event.createdAt);
      data.totalWeight += decay;
      data.weightedSum += (event.score ?? 0) * decay;
    }
    for (const [key, data] of localScores) {
      const [type, itemId] = key.split(':');
      const typeMap = this._getNestedMap(type);
      const mapKey = `${userId}:${itemId}`;
      typeMap.set(mapKey, {
        totalWeight: data.totalWeight,
        weightedSum: data.weightedSum,
        lastUpdated: Date.now(),
      });
    }
  }

  async _getPersonalScore(userId, itemId, type) {
    const typeMap = this._getNestedMap(type);
    const key = `${userId}:${itemId}`;
    const data = typeMap.get(key);
    if (data && data.totalWeight > 0) {
      return data.weightedSum / data.totalWeight;
    }
    const events = await FeedbackEvent.find({ user: userId, type, itemId }).select('score createdAt').lean();
    if (!events.length) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const event of events) {
      const decay = this._getDecayWeight(event.createdAt);
      weightedSum += event.score * decay;
      totalWeight += decay;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  async getPersonalizedRanking(userId, items, type) {
    if (!items || !items.length) return [];
    const scored = [];
    const avoidSet = new Set(await this.getAvoidItems(userId, type));
    for (const item of items) {
      const itemId = typeof item === 'string' ? item : (item.id || item._id || item.itemId || '');
      if (avoidSet.has(itemId)) continue;
      let personalScore = await this._getPersonalScore(userId, itemId, type);
      if (personalScore > BOOST_THRESHOLD) {
        personalScore *= BOOST_FACTOR;
      }
      scored.push({ item, score: personalScore });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
  }
}

module.exports = new SelfLearningEngine();
