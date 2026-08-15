const mongoose = require('mongoose');

const groupIntelligenceSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    unique: true,
  },
  mood: {
    current: { type: String, default: 'neutral' },
    timeline: [{
      mood: String,
      score: Number,
      timestamp: { type: Date, default: Date.now },
    }],
    trend: { type: String, default: 'stable' },
  },
  emotion: {
    current: { type: String, default: 'neutral' },
    dominant: { type: String, default: 'neutral' },
    volatility: { type: Number, default: 0 },
    timeline: [{
      emotion: String,
      confidence: Number,
      timestamp: { type: Date, default: Date.now },
    }],
  },
  activity: {
    mostActiveMembers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      messageCount: Number,
      lastActive: Date,
    }],
    silentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    peakHours: [Number],
    messageFrequency: {
      daily: { type: Number, default: 0 },
      weekly: { type: Number, default: 0 },
    },
    growth: {
      newMembers: { type: Number, default: 0 },
      leftMembers: { type: Number, default: 0 },
      period: { type: String, default: '7d' },
    },
  },
  topics: {
    trending: [{
      topic: String,
      score: Number,
      lastMentioned: Date,
      messageCount: Number,
    }],
    current: { type: String, default: '' },
    drift: {
      detected: { type: Boolean, default: false },
      fromTopic: String,
      toTopic: String,
      detectedAt: Date,
    },
  },
  health: {
    overallScore: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
    toxicityScore: { type: Number, default: 0 },
    spamScore: { type: Number, default: 0 },
    participationScore: { type: Number, default: 0 },
    lastCalculated: Date,
  },
  media: {
    mostShared: [{
      type: { type: String, enum: ['image', 'video', 'song', 'gif', 'sticker'] },
      url: String,
      count: Number,
      lastShared: Date,
    }],
    totalMediaCount: { type: Number, default: 0 },
  },
  ai: {
    lastSummary: {
      content: String,
      generatedAt: Date,
      messageRange: {
        from: Date,
        to: Date,
      },
    },
    lastMeetingNotes: {
      content: String,
      generatedAt: Date,
    },
    pendingDecisions: [{
      summary: String,
      options: [String],
      createdAt: { type: Date, default: Date.now },
      status: { type: String, default: 'pending' },
    }],
    suggestedActions: [{
      action: String,
      priority: Number,
      createdAt: { type: Date, default: Date.now },
      status: { type: String, default: 'pending' },
    }],
  },
  metadata: {
    createdForChat: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    updateCount: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

groupIntelligenceSchema.index({ 'mood.trend': 1 });
groupIntelligenceSchema.index({ 'health.overallScore': -1 });

module.exports = mongoose.model('GroupIntelligence', groupIntelligenceSchema);
