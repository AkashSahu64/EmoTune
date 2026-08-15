const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const personaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  avatar: { type: String, default: '' },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'romantic', 'humorous', 'custom'],
    default: 'casual',
  },
  customPrompt: { type: String, default: '' },
  isActive: { type: Boolean, default: false },
  color: { type: String, default: '#6366f1' },
}, { timestamps: true });

const oauthProviderSchema = new mongoose.Schema({
  provider: { type: String, enum: ['google', 'apple', 'microsoft'], required: true },
  id: { type: String, required: true },
  email: { type: String },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  avatar: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy', 'blocked', 'deleted'],
    default: 'offline',
  },
  bio: { type: String, maxlength: 200, default: '' },
  fullName: { type: String, trim: true, default: '' },
  phone: { type: String, default: '', unique: true, sparse: true },
  countryCode: { type: String, default: '' },
  wallpaper: { type: String, default: '' },
  roles: {
    type: [String],
    default: ['user'],
  },
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, default: null },
  displayName: { type: String, default: '' },
  about: { type: String, default: '', maxlength: 500 },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  lockedUntil: { type: Date, default: null },
  blockedUntil: { type: Date, default: null },
  blockedReason: { type: String, default: '' },
  oauthProviders: [oauthProviderSchema],
  personas: [personaSchema],
  settings: {
    autoTheme: { type: Boolean, default: true },
    currentTheme: {
      type: String,
      enum: ['light', 'dark', 'aurora', 'crimson-night', 'lime-mellow', 'neon-pulse'],
      default: 'dark',
    },
    emotionTheme: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    silentMode: { type: Boolean, default: false },
    ghostModeDefault: { type: Boolean, default: false },
  },
  preferences: {
    account: {
      displayName: { type: String, default: '' },
      about: { type: String, default: '', maxlength: 500 },
    },
    appearance: {
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      messageDensity: { type: String, enum: ['compact', 'comfortable', 'spacious'], default: 'comfortable' },
      showTimestamps: { type: Boolean, default: true },
      enterToSend: { type: Boolean, default: true },
      showEmojiSuggestions: { type: Boolean, default: true },
      reduceMotion: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
    },
    notifications: {
      pushEnabled: { type: Boolean, default: true },
      messagePreview: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
      vibration: { type: Boolean, default: true },
      silentMode: { type: Boolean, default: false },
      doNotDisturb: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' },
        endTime: { type: String, default: '08:00' },
      },
      groupNotifications: { type: Boolean, default: true },
    },
    privacy: {
      lastSeen: { type: String, enum: ['everyone', 'my_contacts', 'nobody'], default: 'everyone' },
      readReceipts: { type: Boolean, default: true },
      profilePhotoVisibility: { type: String, enum: ['everyone', 'my_contacts', 'nobody'], default: 'everyone' },
      onlineStatus: { type: String, enum: ['everyone', 'my_contacts', 'nobody'], default: 'everyone' },
      blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      twoFactorEnabled: { type: Boolean, default: false },
    },
    chat: {
      enterToSend: { type: Boolean, default: true },
      autoSaveMedia: { type: Boolean, default: false },
      inlineMedia: { type: Boolean, default: true },
      linkPreviews: { type: Boolean, default: true },
      typingIndicators: { type: Boolean, default: true },
      voiceMessages: { type: Boolean, default: true },
    },
    ai: {
      autoSuggestions: { type: Boolean, default: true },
      personaCreativity: { type: Number, default: 70, min: 0, max: 100 },
      emotionDetection: { type: Boolean, default: true },
      truthSyncVisibility: { type: String, enum: ['everyone', 'my_contacts', 'nobody'], default: 'everyone' },
      smartReplies: { type: Boolean, default: true },
      factCheck: { type: Boolean, default: true },
      decideFlow: { type: Boolean, default: true },
    },
    ghostMode: {
      defaultDuration: { type: Number, default: 5, min: 1, max: 60 },
      autoEnable: { type: Boolean, default: false },
      visibility: { type: String, enum: ['typing', 'online', 'offline'], default: 'offline' },
      typingDisguise: { type: Boolean, default: false },
    },
    media: {
      autoDownloadPhotos: { type: Boolean, default: true },
      autoDownloadVideo: { type: Boolean, default: false },
      autoDownloadAudio: { type: Boolean, default: false },
      dataSaver: { type: Boolean, default: false },
      defaultWallpaper: { type: String, default: '' },
    },
    accessibility: {
      fontSize: { type: String, enum: ['small', 'medium', 'large', 'x-large'], default: 'medium' },
      reduceMotion: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      screenReader: { type: Boolean, default: false },
      closedCaptions: { type: Boolean, default: false },
      linkUnderline: { type: Boolean, default: false },
    },
    advanced: {
      messageHistoryDays: { type: Number, default: 365, min: 1, max: 9999 },
      autoBackup: { type: Boolean, default: false },
      backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
      dataUsageWarn: { type: Boolean, default: true },
      cacheEnabled: { type: Boolean, default: true },
    },
  },
  encryptionKey: { type: String, select: false },
  refreshToken: { type: String, select: false },
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now }, userAgent: String, ip: String }],
  lastActive: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const data = {
    _id: this._id,
    id: this._id,
    username: this.username,
    email: this.email,
    fullName: this.fullName,
    avatar: this.avatar,
    phone: this.phone,
    countryCode: this.countryCode,
    wallpaper: this.wallpaper,
    status: this.status,
    bio: this.bio,
    displayName: this.displayName,
    about: this.about,
    language: this.language,
    timezone: this.timezone,
    roles: this.roles,
    emailVerified: this.emailVerified,
    personas: this.personas,
    settings: this.settings,
    preferences: this.preferences,
    lastActive: this.lastActive,
    createdAt: this.createdAt,
    oauthProviders: this.oauthProviders,
  };

  if (this.blockedUntil) data.blockedUntil = this.blockedUntil;
  if (this.lockedUntil) data.lockedUntil = this.lockedUntil;

  return data;
};

module.exports = mongoose.model('User', userSchema);
