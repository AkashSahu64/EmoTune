const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['emoji', 'shayari', 'song', 'video', 'text', 'image'],
    required: true,
  },
  content: { type: String, default: '' },
  metadata: {
    emoji: String,
    shayari: String,
    songTitle: String,
    songArtist: String,
    songClipUrl: String,
    videoQuery: String,
    videoEmbedUrl: String,
    lyrics: String,
    originalMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    sourceChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  },
  tags: [{ type: String, trim: true }],
  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date },
}, {
  timestamps: true,
});

bookmarkSchema.index({ user: 1, type: 1 });
bookmarkSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
