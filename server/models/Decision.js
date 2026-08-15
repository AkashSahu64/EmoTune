const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  summary: { type: String, required: true },
  context: { type: String },
  pollOptions: [{
    text: { type: String, required: true },
    votes: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      votedAt: { type: Date, default: Date.now },
    }],
    voteCount: { type: Number, default: 0 },
  }],
  compromise: { type: String, default: '' },
  deadlock: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['active', 'resolved', 'deadlocked', 'expired'],
    default: 'active',
  },
  result: { type: String, default: '' },
  winnerOption: { type: Number, default: -1 },
  expiresAt: { type: Date },
  resolvedAt: { type: Date },
  voteCount: { type: Number, default: 0 },
  requiredVotes: { type: Number, default: 0 },
  aiFacilitated: { type: Boolean, default: true },
}, {
  timestamps: true,
});

decisionSchema.index({ chat: 1, status: 1 });
decisionSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Decision', decisionSchema);
