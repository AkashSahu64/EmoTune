const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
  },
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
  }],
  channels: [{
    name: String,
    description: String,
    type: { type: String, enum: ['text', 'announcement'], default: 'text' },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  settings: {
    isPrivate: { type: Boolean, default: false },
    joinApprovalRequired: { type: Boolean, default: false },
    inviteLinks: [{
      code: String,
      uses: { type: Number, default: 0 },
      maxUses: Number,
      expiresAt: Date,
    }],
  },
  rules: [{
    title: String,
    description: String,
  }],
  tags: [String],
  stats: {
    memberCount: { type: Number, default: 0 },
    channelCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

communitySchema.index({ name: 1 });
communitySchema.index({ 'members.user': 1 });
communitySchema.index({ creator: 1 });
communitySchema.index({ tags: 1 });

module.exports = mongoose.model('Community', communitySchema);
