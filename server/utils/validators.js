const Joi = require('joi');

const signupSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username must be at most 30 characters',
    'any.required': 'Username is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const messageSchema = Joi.object({
  content: Joi.string().allow('').max(5000),
  chatId: Joi.string().required(),
  type: Joi.string().valid('text', 'emoji', 'gif', 'sticker', 'shayari', 'song', 'video', 'image', 'audio', 'file', 'system', 'poll', 'event', 'decision'),
  mediaUrl: Joi.string().allow(''),
  mediaType: Joi.string().allow(''),
  metadata: Joi.object({
    songTitle: Joi.string().allow(''),
    songArtist: Joi.string().allow(''),
    songClipUrl: Joi.string().allow(''),
    videoQuery: Joi.string().allow(''),
    videoEmbedUrl: Joi.string().allow(''),
    lyrics: Joi.string().allow(''),
    emoji: Joi.string().allow(''),
    shayari: Joi.string().allow(''),
    fileName: Joi.string().allow(''),
    fileSize: Joi.number(),
    fileType: Joi.string().allow(''),
    mediaUrl: Joi.string().allow(''),
  }).unknown(true),
  silent: Joi.boolean(),
  personaUsed: Joi.string().allow(''),
  replyTo: Joi.string().allow(''),
});

const personaSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  avatar: Joi.string().allow(''),
  tone: Joi.string().valid('professional', 'casual', 'romantic', 'humorous', 'custom'),
  customPrompt: Joi.string().allow('').max(500),
  color: Joi.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const groupSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  participants: Joi.array().items(Joi.string()).min(2).required(),
  description: Joi.string().allow('').max(500),
});

const bookmarkSchema = Joi.object({
  type: Joi.string().valid('emoji', 'shayari', 'song', 'video', 'text', 'image').required(),
  content: Joi.string().allow(''),
  metadata: Joi.object({
    emoji: Joi.string().allow(''),
    shayari: Joi.string().allow(''),
    songTitle: Joi.string().allow(''),
    songArtist: Joi.string().allow(''),
    songClipUrl: Joi.string().allow(''),
    videoQuery: Joi.string().allow(''),
    videoEmbedUrl: Joi.string().allow(''),
    lyrics: Joi.string().allow(''),
  }),
  tags: Joi.array().items(Joi.string()),
});

const updateProfileSchema = Joi.object({
  username: Joi.string().min(3).max(30),
  displayName: Joi.string().allow('').max(50),
  bio: Joi.string().allow('').max(200),
  about: Joi.string().allow('').max(500),
  phone: Joi.string().allow('').max(20),
  avatar: Joi.string().uri().allow(''),
  wallpaper: Joi.string().uri().allow(''),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

const preferencesSchema = Joi.object({
  account: Joi.object({
    displayName: Joi.string().allow('').max(50),
    about: Joi.string().allow('').max(500),
  }),
  appearance: Joi.object({
    fontSize: Joi.string().valid('small', 'medium', 'large'),
    messageDensity: Joi.string().valid('compact', 'comfortable', 'spacious'),
    showTimestamps: Joi.boolean(),
    enterToSend: Joi.boolean(),
    showEmojiSuggestions: Joi.boolean(),
    reduceMotion: Joi.boolean(),
    highContrast: Joi.boolean(),
  }),
  notifications: Joi.object({
    pushEnabled: Joi.boolean(),
    messagePreview: Joi.boolean(),
    soundEnabled: Joi.boolean(),
    vibration: Joi.boolean(),
    silentMode: Joi.boolean(),
    doNotDisturb: Joi.object({
      enabled: Joi.boolean(),
      startTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
      endTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
    }),
    groupNotifications: Joi.boolean(),
  }),
  privacy: Joi.object({
    lastSeen: Joi.string().valid('everyone', 'my_contacts', 'nobody'),
    readReceipts: Joi.boolean(),
    profilePhotoVisibility: Joi.string().valid('everyone', 'my_contacts', 'nobody'),
    onlineStatus: Joi.string().valid('everyone', 'my_contacts', 'nobody'),
    twoFactorEnabled: Joi.boolean(),
  }),
  chat: Joi.object({
    enterToSend: Joi.boolean(),
    autoSaveMedia: Joi.boolean(),
    inlineMedia: Joi.boolean(),
    linkPreviews: Joi.boolean(),
    typingIndicators: Joi.boolean(),
    voiceMessages: Joi.boolean(),
  }),
  ai: Joi.object({
    autoSuggestions: Joi.boolean(),
    personaCreativity: Joi.number().min(0).max(100),
    emotionDetection: Joi.boolean(),
    truthSyncVisibility: Joi.string().valid('everyone', 'my_contacts', 'nobody'),
    smartReplies: Joi.boolean(),
    factCheck: Joi.boolean(),
    decideFlow: Joi.boolean(),
  }),
  ghostMode: Joi.object({
    defaultDuration: Joi.number().min(1).max(60),
    autoEnable: Joi.boolean(),
    visibility: Joi.string().valid('typing', 'online', 'offline'),
    typingDisguise: Joi.boolean(),
  }),
  media: Joi.object({
    autoDownloadPhotos: Joi.boolean(),
    autoDownloadVideo: Joi.boolean(),
    autoDownloadAudio: Joi.boolean(),
    dataSaver: Joi.boolean(),
    defaultWallpaper: Joi.string().allow(''),
  }),
  accessibility: Joi.object({
    fontSize: Joi.string().valid('small', 'medium', 'large', 'x-large'),
    reduceMotion: Joi.boolean(),
    highContrast: Joi.boolean(),
    screenReader: Joi.boolean(),
    closedCaptions: Joi.boolean(),
    linkUnderline: Joi.boolean(),
  }),
  advanced: Joi.object({
    messageHistoryDays: Joi.number().min(1).max(9999),
    autoBackup: Joi.boolean(),
    backupFrequency: Joi.string().valid('daily', 'weekly', 'monthly'),
    dataUsageWarn: Joi.boolean(),
    cacheEnabled: Joi.boolean(),
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
  messageSchema,
  personaSchema,
  groupSchema,
  bookmarkSchema,
  updateProfileSchema,
  changePasswordSchema,
  preferencesSchema,
};
