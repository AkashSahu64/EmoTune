const mongoose = require('mongoose');

const storyHighlightSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  coverMedia: { type: String, default: '' },
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  color: { type: String, default: '#6366f1' },
  isArchived: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

storyHighlightSchema.index({ user: 1, order: 1 });
storyHighlightSchema.index({ user: 1, isArchived: 1 });

module.exports = mongoose.model('StoryHighlight', storyHighlightSchema);
