const mongoose = require('mongoose');

const storyViewSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  duration: { type: Number, default: 0, min: 0 },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

// One logical view per viewer/story. Repeated requests update this record.
storyViewSchema.index({ story: 1, user: 1 }, { unique: true });
storyViewSchema.index({ story: 1, createdAt: 1 });
storyViewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('StoryView', storyViewSchema);
