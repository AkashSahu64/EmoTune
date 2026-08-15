const mongoose = require('mongoose');

const passwordHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  changedAt: { type: Date, default: Date.now },
  changedBy: {
    type: String,
    enum: ['user', 'admin', 'reset', 'system'],
    default: 'user',
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

passwordHistorySchema.index({ user: 1, changedAt: -1 });

module.exports = mongoose.model('PasswordHistory', passwordHistorySchema);
