const mongoose = require('mongoose');

const truthClaimSchema = new mongoose.Schema({
  claimText: { type: String, required: true },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['science', 'health', 'politics', 'history', 'technology', 'general', 'unknown'],
    default: 'unknown',
  },
  truthScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  calculatedScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  sources: [{
    url: { type: String },
    title: { type: String },
    reliability: { type: Number, min: 0, max: 1 },
  }],
  votes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vote: { type: Number, enum: [-1, 0, 1], default: 0 },
    weight: { type: Number, default: 1 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  totalUpvotes: { type: Number, default: 0 },
  totalDownvotes: { type: Number, default: 0 },
  factCheckStatus: {
    type: String,
    enum: ['pending', 'checking', 'completed', 'disputed'],
    default: 'pending',
  },
  externalChecked: { type: Boolean, default: false },
  lastChecked: { type: Date },
}, {
  timestamps: true,
});

truthClaimSchema.index({ message: 1 });
truthClaimSchema.index({ chat: 1, truthScore: -1 });
truthClaimSchema.index({ category: 1 });

module.exports = mongoose.model('TruthClaim', truthClaimSchema);
