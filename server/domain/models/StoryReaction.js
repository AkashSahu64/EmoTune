const mongoose = require('mongoose');

const storyReactionSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true, trim: true, maxlength: 16 },
}, { timestamps: true });

// A viewer has one active reaction per Story. Changing emoji updates this row.
storyReactionSchema.index({ story: 1, user: 1 }, { unique: true });
storyReactionSchema.index({ story: 1, createdAt: 1 });

module.exports = mongoose.model('StoryReaction', storyReactionSchema);
