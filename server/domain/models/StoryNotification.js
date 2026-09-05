const mongoose = require('mongoose');

const storyNotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  type: { type: String, enum: ['story_mention', 'story_reply', 'story_share'], required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

storyNotificationSchema.index({ recipient: 1, createdAt: -1 });
storyNotificationSchema.index({ recipient: 1, story: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('StoryNotification', storyNotificationSchema);
