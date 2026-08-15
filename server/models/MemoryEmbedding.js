const mongoose = require('mongoose');

const memoryEmbeddingSchema = new mongoose.Schema({
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
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  encryptedVector: {
    type: String,
    required: true,
  },
  iv: { type: String, required: true },
  salt: { type: String, required: true },
  textSnippet: { type: String, required: true },
  messageType: { type: String, default: 'text' },
  verifiedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'denied', 'edited'],
      default: 'pending',
    },
    editedText: { type: String },
    respondedAt: { type: Date },
  }],
  isVerified: { type: Boolean, default: false },
  metadata: {
    hasMedia: { type: Boolean, default: false },
    mediaType: { type: String },
    intentLabels: [String],
    emotionTag: { type: String },
  },
}, {
  timestamps: true,
});

memoryEmbeddingSchema.index({ chat: 1, isVerified: 1 });
memoryEmbeddingSchema.index({ sender: 1 });
memoryEmbeddingSchema.index({ 'verifiedBy.user': 1 });

module.exports = mongoose.model('MemoryEmbedding', memoryEmbeddingSchema);
