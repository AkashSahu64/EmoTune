const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'voice', 'music', 'ai_generated', 'multi_image', 'memory'],
    default: 'image',
  },
  content: {
    text: String,
    caption: String,
    mediaUrl: String,
    mediaType: String,
    backgroundColor: String,
    font: String,
    fontSize: String,
    textPosition: String,
    musicUrl: String,
    musicTitle: String,
    voiceUrl: String,
    voiceDuration: Number,
    images: [{
      url: String,
      caption: String,
      order: Number,
    }],
    stickers: [{
      url: String,
      position: { x: Number, y: Number },
      size: Number,
      rotation: Number,
    }],
    emojis: [{
      emoji: String,
      position: { x: Number, y: Number },
      size: Number,
    }],
    gifUrl: String,
    filterName: String,
    layout: String,
    mood: String,
    theme: String,
  },
  aiGenerated: {
    prompt: String,
    caption: String,
    hashtags: [String],
    suggestedMusic: String,
    suggestedEmojis: [String],
    confidence: Number,
  },
  audience: {
    type: { type: String, enum: ['public', 'close_friends', 'custom', 'private'], default: 'public' },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    excludedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  highlights: [{
    highlightId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryHighlight' },
    addedAt: { type: Date, default: Date.now },
  }],
  tags: [String],
  mentions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    offset: Number,
    length: Number,
  }],
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  metadata: {
    views: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    viewDetails: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now },
      duration: Number,
      completed: { type: Boolean, default: false },
    }],
    reactions: [{
      emoji: String,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    completionRate: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
  },
  scheduling: {
    scheduledAt: Date,
    isScheduled: { type: Boolean, default: false },
    publishedAt: Date,
  },
  isArchived: { type: Boolean, default: false },
  isDraft: { type: Boolean, default: false },
  expiresAt: { type: Date, default: () => Date.now() + 24 * 60 * 60 * 1000 },
  template: { type: String, default: '' },
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryCollection' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ 'audience.type': 1 });
storySchema.index({ isArchived: 1, user: 1 });
storySchema.index({ isDraft: 1, user: 1 });

module.exports = mongoose.model('Story', storySchema);
