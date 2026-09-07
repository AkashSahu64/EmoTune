const mongoose = require('mongoose');
const {
  STICKER_ASSET_TYPES,
  STICKER_SOURCES,
  STICKER_VISIBILITIES,
} = require('../utils/stickerValidators');

const stickerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, trim: true, maxlength: 120, default: 'Untitled Sticker' },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  tags: [{ type: String, trim: true, maxlength: 40 }],
  assetUrl: { type: String, required: true, maxlength: 2048 },
  assetPublicId: { type: String, default: '' },
  thumbnailUrl: { type: String, required: true, maxlength: 2048 },
  thumbnailPublicId: { type: String, default: '' },
  assetType: { type: String, enum: STICKER_ASSET_TYPES, default: 'static' },
  mimeType: { type: String, required: true, maxlength: 100 },
  width: { type: Number, required: true, min: 1 },
  height: { type: Number, required: true, min: 1 },
  fileSize: { type: Number, default: 0, min: 0 },
  // Animation length in milliseconds. Static stickers stay at 0.
  duration: { type: Number, default: 0, min: 0 },
  editorVersion: { type: Number, default: 1 },
  // Editable project snapshot. Absent when a sticker was imported rather than
  // composed in the studio, which is why reopen-for-edit is conditional.
  editorState: { type: mongoose.Schema.Types.Mixed, default: null },
  // Per-layer source images uploaded alongside the flattened asset. Tracked so
  // deleting a sticker deletes everything it owns instead of orphaning files.
  objectAssets: {
    type: [{
      _id: false,
      objectId: { type: String, maxlength: 80 },
      url: { type: String, maxlength: 2048 },
      publicId: { type: String, default: '' },
    }],
    default: [],
  },
  source: { type: String, enum: STICKER_SOURCES, default: 'studio' },
  visibility: { type: String, enum: STICKER_VISIBILITIES, default: 'private' },
  isFavorite: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0, min: 0 },
  lastUsed: { type: Date },
  // Client-supplied idempotency token. A retried or double-clicked save resolves
  // to the sticker the first request created instead of a duplicate.
  clientMutationId: { type: String, default: '', maxlength: 64 },
}, {
  timestamps: true,
  minimize: false,
});

stickerSchema.index({ user: 1, createdAt: -1, _id: -1 });
stickerSchema.index({ user: 1, isFavorite: 1, createdAt: -1, _id: -1 });
stickerSchema.index({ user: 1, lastUsed: -1, _id: -1 });
stickerSchema.index(
  { user: 1, clientMutationId: 1 },
  { unique: true, partialFilterExpression: { clientMutationId: { $gt: '' } } },
);
stickerSchema.index(
  { user: 1, title: 'text', description: 'text', tags: 'text' },
  { name: 'sticker_search_text' },
);

module.exports = mongoose.model('Sticker', stickerSchema);
