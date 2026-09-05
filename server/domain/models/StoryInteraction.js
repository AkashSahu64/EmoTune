const mongoose = require('mongoose');

const storyInteractionSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['poll_vote', 'question_answer'], required: true },
  value: { type: String, required: true, maxlength: 2000 },
}, { timestamps: true });

storyInteractionSchema.index({ story: 1, user: 1, kind: 1 }, { unique: true });
storyInteractionSchema.index({ story: 1, createdAt: -1 });

module.exports = mongoose.model('StoryInteraction', storyInteractionSchema);
