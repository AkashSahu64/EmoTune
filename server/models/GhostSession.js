const mongoose = require('mongoose');

const ghostSessionSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  type: {
    type: String,
    enum: ['whiteboard', 'document', 'code'],
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
  }],
  data: {
    content: { type: String, default: '' },
    document: { type: String, default: '' },
    code: { type: String, default: '' },
    language: { type: String, default: 'javascript' },
    whiteboard: { type: Object, default: {} },
    cursors: { type: Object, default: {} },
  },
  ttl: {
    type: Number,
    default: 3600,
  },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  destroyedAt: { type: Date },
  autoDestroy: { type: Boolean, default: true },
}, {
  timestamps: true,
});

ghostSessionSchema.index({ chat: 1, isActive: 1 });
ghostSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GhostSession', ghostSessionSchema);
