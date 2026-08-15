const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
  category: {
    type: String,
    enum: ['recommendation', 'prediction', 'emotion', 'provider', 'cache', 'performance', 'cost', 'feature_usage'],
    required: true,
    lowercase: true,
  },
  event: {
    type: String,
    required: true,
  },
  subCategory: {
    type: String,
    default: '',
  },
  value: {
    type: Number,
    default: 0,
  },
  tags: {
    type: Map,
    of: String,
    default: {},
  },
  duration: {
    type: Number,
    default: 0,
  },
  success: {
    type: Boolean,
    default: true,
  },
  error: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

analyticsEventSchema.index({ category: 1, event: 1, timestamp: -1 });
analyticsEventSchema.index({ user: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 });
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
