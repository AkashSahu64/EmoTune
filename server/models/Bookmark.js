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
  source: {
    type: String,
    enum: ['ai', 'chat', 'user', 'system', 'other'],
    default: 'other',
  },
  content: { type: String, default: '' },
  contentPreview: { type: String, default: '' },
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
  isFavorite: { type: Boolean, default: false },
  dedupeKey: { type: String, required: true },
  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date },
}, {
  timestamps: true,
});

bookmarkSchema.index({ user: 1, type: 1 });
bookmarkSchema.index({ user: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, isFavorite: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, source: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, dedupeKey: 1 });
bookmarkSchema.index({ user: 1, createdAt: -1, _id: -1 });
bookmarkSchema.index({ user: 1, content: 'text', tags: 'text', 'metadata.shayari': 'text', 'metadata.songTitle': 'text', 'metadata.songArtist': 'text', 'metadata.videoQuery': 'text' }, { name: 'bookmark_search_text' });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
