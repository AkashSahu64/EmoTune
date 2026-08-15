const mongoose = require('mongoose');

const favoriteItemSchema = new mongoose.Schema({
  key: { type: String },
  value: { type: String },
  count: { type: Number, default: 1 },
  lastUsed: { type: Date, default: Date.now },
}, { _id: false });

const timeBucketSchema = new mongoose.Schema({
  hour: { type: Number },
  messageCount: { type: Number, default: 0 },
  avgLength: { type: Number, default: 0 },
  topEmotions: [{ emotion: String, count: Number }],
}, { _id: false });

const conversationDNASchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  version: { type: Number, default: 2 },

  language: {
    primary: { type: String, default: 'en' },
    secondary: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
  },

  writingStyle: {
    avgMessageLength: { type: Number, default: 0 },
    preferredReplyLength: { type: String, enum: ['short', 'medium', 'long', 'mixed'], default: 'medium' },
    formalScore: { type: Number, default: 0.5 },
    casualScore: { type: Number, default: 0.5 },
    humorScore: { type: Number, default: 0.3 },
    sarcasmScore: { type: Number, default: 0.1 },
    kindnessScore: { type: Number, default: 0.7 },
    positivityScore: { type: Number, default: 0.6 },
    creativityScore: { type: Number, default: 0.4 },
    professionalScore: { type: Number, default: 0.3 },
    romanticScore: { type: Number, default: 0.2 },
    questionFrequency: { type: Number, default: 0.3 },
    greetingStyle: { type: String, default: 'casual' },
    endingStyle: { type: String, default: 'casual' },
    emojiFrequency: { type: Number, default: 0.3 },
    emojiDensity: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
  },

  contentPreferences: {
    favoriteEmojis: [favoriteItemSchema],
    favoriteGifCategories: [favoriteItemSchema],
    favoriteStickers: [favoriteItemSchema],
    favoriteSongs: [favoriteItemSchema],
    favoriteVideos: [favoriteItemSchema],
    favoriteShayaris: [favoriteItemSchema],
    favoriteTopics: [favoriteItemSchema],
    topEmojis: [{ emoji: String, count: Number }],
  },

  behavioralPatterns: {
    typingSpeed: { type: Number, default: 0 },
    avgReplyDelay: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    sessionLength: { type: Number, default: 0 },
    activeHours: [Number],
    timeBuckets: [timeBucketSchema],
    morningActivity: { type: Number, default: 0 },
    afternoonActivity: { type: Number, default: 0 },
    eveningActivity: { type: Number, default: 0 },
    nightActivity: { type: Number, default: 0 },
    weekendRatio: { type: Number, default: 0.5 },
    weekdayRatio: { type: Number, default: 0.5 },
    conversationRhythm: {
      type: String,
      enum: ['fast_responsive', 'moderate', 'slow_thoughtful', 'burst_activity', 'irregular'],
      default: 'moderate',
    },
    responseTimePercentiles: {
      p50: { type: Number, default: 0 },
      p90: { type: Number, default: 0 },
    },
  },

  relationshipPatterns: {
    dominantRelationshipType: { type: String, default: 'unknown' },
    relationshipDiversity: { type: Number, default: 0 },
    groupChatPreference: { type: Number, default: 0.3 },
  },

  metadata: {
    firstMessageAt: Date,
    lastMessageAt: Date,
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    updateCount: { type: Number, default: 0 },
  },
}, { timestamps: true });

conversationDNASchema.index({ 'metadata.lastUpdated': -1 });

module.exports = mongoose.model('ConversationDNA', conversationDNASchema);
