const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group', 'community', 'channel', 'broadcast', 'temp', 'secret', 'ai_chat', 'ghost'],
    default: 'direct',
  },
  name: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  description: { type: String, default: '' },
  settings: {
    isEncrypted: { type: Boolean, default: false },
    isEphemeral: { type: Boolean, default: false },
    ephemeralDuration: { type: Number, default: 86400 },
    isBroadcast: { type: Boolean, default: false },
    broadcastAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinApprovalRequired: { type: Boolean, default: false },
    joinRequests: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      requestedAt: { type: Date, default: Date.now },
    }],
    inviteLinks: [{
      code: String,
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      expiresAt: Date,
      maxUses: Number,
      useCount: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
    }],
    permissions: {
      sendMessages: { type: String, enum: ['all', 'admins', 'moderators'], default: 'all' },
      sendMedia: { type: String, enum: ['all', 'admins', 'moderators'], default: 'all' },
      addMembers: { type: String, enum: ['all', 'admins', 'moderators'], default: 'admins' },
      pinMessages: { type: String, enum: ['all', 'admins', 'moderators'], default: 'admins' },
      changeInfo: { type: String, enum: ['all', 'admins', 'moderators'], default: 'admins' },
    },
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator', 'member'],
      default: 'member',
    },
    joinedAt: { type: Date, default: Date.now },
    lastRead: { type: Date, default: Date.now },
    isMuted: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    nickname: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
    leftAt: { type: Date },
  }],
  roles: [{
    name: String,
    permissions: { type: mongoose.Schema.Types.Mixed },
    color: String,
    priority: Number,
  }],
  communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  channels: [{
    name: String,
    description: String,
    type: { type: String, enum: ['text', 'announcement'], default: 'text' },
    createdAt: { type: Date, default: Date.now },
  }],
  announcement: {
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    pinnedAt: Date,
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  tags: [String],
  metadata: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    memberCount: { type: Number, default: 0 },
  },
  lastMessage: {
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, default: 'text' },
    createdAt: Date,
  },
  silentMessages: [{
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
    accepted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
  groupDescription: { type: String, maxlength: 500 },
  groupAvatar: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isArchived: { type: Boolean, default: false },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

chatSchema.index({ 'participants.user': 1, 'metadata.lastActivityAt': -1 });
chatSchema.index({ type: 1, 'metadata.lastActivityAt': -1 });
chatSchema.index({ 'metadata.lastActivityAt': -1 });
chatSchema.index({ communities: 1 });

module.exports = mongoose.model('Chat', chatSchema);
