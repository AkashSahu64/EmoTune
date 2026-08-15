const mongoose = require('mongoose');

const feedbackEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['emoji', 'gif', 'sticker', 'shayari', 'song', 'video', 'suggestion', 'prediction'],
    required: true,
  },
  itemId: {
    type: String,
    default: '',
  },
  itemText: {
    type: String,
    default: '',
  },
  action: {
    type: String,
    enum: ['accepted', 'dismissed', 'ignored', 'viewed'],
    required: true,
  },
  context: {
    chatId: { type: String, default: '' },
    messageId: { type: String, default: '' },
    emotion: { type: String, default: '' },
    state: { type: String, default: '' },
    topic: { type: String, default: '' },
  },
  score: {
    type: Number,
    min: -1,
    max: 1,
    default: 0,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
}, {
  timestamps: true,
});

feedbackEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
feedbackEventSchema.index({ user: 1, type: 1, itemId: 1 });
feedbackEventSchema.index({ user: 1, type: 1, createdAt: -1 });
feedbackEventSchema.index({ user: 1, action: 1 });

module.exports = mongoose.model('FeedbackEvent', feedbackEventSchema);
