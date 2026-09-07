const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  clientMessageId: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  content: {
    type: String,
    trim: true,
    default: '',
  },
  type: {
    type: String,
    enum: ['text', 'emoji', 'gif', 'sticker', 'shayari', 'song', 'video', 'image', 'audio', 'file', 'system', 'poll', 'decision', 'story_reply', 'story_share', 'reaction', 'event', 'voice_note', 'scheduled'],
    default: 'text',
  },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  metadata: {
    songTitle: { type: String },
    songArtist: { type: String },
    songClipUrl: { type: String },
    videoQuery: { type: String },
    videoEmbedUrl: { type: String },
    lyrics: { type: String },
    emoji: { type: String },
    provider: { type: String },
    sourceId: { type: String },
    gifId: { type: String },
    gifTitle: { type: String },
    gifUrl: { type: String },
    stickerId: { type: String },
    stickerTitle: { type: String },
    shayari: { type: String },
    pollOptions: [{
      text: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
    decisionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Decision' },
    fileName: { type: String },
    fileSize: { type: Number },
    fileType: { type: String },
    mediaUrl: { type: String },
    storyReaction: { type: Boolean, default: false },
  },
  intents: [{
    type: String,
    enum: ['task', 'social', 'question', 'idea', 'reminder', 'important', 'memory'],
  }],
  silent: { type: Boolean, default: false },
  truthClaimRef: { type: mongoose.Schema.Types.ObjectId, ref: 'TruthClaim' },
  personaUsed: { type: String, default: '' },
  isBookmarked: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  editedAt: { type: Date },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    count: { type: Number, default: 0 },
  }],
  mentions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    offset: Number,
    length: Number,
  }],
  isPinned: { type: Boolean, default: false },
  isAnnouncement: { type: Boolean, default: false },
  pollData: {
    question: String,
    options: [{
      text: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
    expiresAt: Date,
    isMultipleChoice: { type: Boolean, default: false },
  },
    eventData: {
    title: String,
    description: String,
    startDate: Date,
    endDate: Date,
    location: String,
      attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    storyRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    storyOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledFor: Date,
  scheduledSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voiceNote: {
    duration: Number,
    waveform: [Number],
  },
  forwardedFrom: {
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  readByDetailed: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: Date,
  }],
  deliveredToDetailed: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: Date,
  }],
  disappearingAt: Date,
  editHistory: [{
    content: String,
    editedAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index(
  { sender: 1, chat: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } },
);
messageSchema.index({ chat: 1, threadId: 1 });
messageSchema.index({ chat: 1, intents: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'mentions.user': 1 });
messageSchema.index({ isPinned: 1, chat: 1 });
messageSchema.index({ disappearingAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
