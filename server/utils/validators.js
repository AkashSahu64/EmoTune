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
  clientMessageId: Joi.string().max(100).pattern(/^[A-Za-z0-9._:-]+$/),
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

const storySchema = Joi.object({
  type: Joi.string().valid('text', 'image', 'video', 'voice', 'music', 'sticker', 'ai_generated', 'multi_image', 'memory').default('image'),
  content: Joi.object({
    text: Joi.string().allow('').max(10000),
    caption: Joi.string().allow('').max(2000),
    mediaUrl: Joi.string().allow('').max(2048),
    mediaType: Joi.string().allow('').max(100),
    backgroundColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow(''),
    font: Joi.string().allow('').max(80),
    fontSize: Joi.string().allow('').max(20),
    textPosition: Joi.string().valid('top', 'center', 'bottom'),
    musicUrl: Joi.string().max(2048).pattern(/^(https?:\/\/|\/)/).allow(''),
    musicTitle: Joi.string().allow('').max(200),
    voiceUrl: Joi.string().allow('').max(2048),
    voiceDuration: Joi.number().min(0).max(3600),
    images: Joi.array().max(20).items(Joi.object({ url: Joi.string().max(2048).pattern(/^(https?:\/\/|\/)/).required(), caption: Joi.string().allow('').max(500), order: Joi.number().integer().min(0) })),
    stickers: Joi.array().max(30),
    emojis: Joi.array().max(30),
    gifUrl: Joi.string().max(2048).pattern(/^(https?:\/\/|\/)/).allow(''),
    filterName: Joi.string().allow('').max(80),
    layout: Joi.string().allow('').max(80),
    mood: Joi.string().allow('').max(80),
    theme: Joi.string().allow('').max(80),
    interactive: Joi.object({
      kind: Joi.string().valid('poll', 'question', 'link', 'location', 'countdown', 'music', 'sticker', 'drawing').required(),
      prompt: Joi.string().allow('').max(500),
      options: Joi.array().max(8).items(Joi.object({ text: Joi.string().min(1).max(120).required() })),
      linkUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).allow(''),
      linkLabel: Joi.string().allow('').max(100),
      countdownAt: Joi.date().greater('now'),
      countdownLabel: Joi.string().allow('').max(100),
      musicId: Joi.string().allow('').max(100),
      musicArtist: Joi.string().allow('').max(200),
      drawingData: Joi.string().max(2_000_000).allow(''),
      sticker: Joi.string().allow('').max(20),
    }),
  }).unknown(true),
  audience: Joi.object({
    type: Joi.string().valid('public', 'friends', 'close_friends', 'custom', 'private').default('public'),
    allowedUsers: Joi.array().items(Joi.string()).max(500),
    excludedUsers: Joi.array().items(Joi.string()).max(500),
  }).default({ type: 'public' }),
  tags: Joi.array().items(Joi.string().max(80)).max(30),
  mentions: Joi.array().max(50),
  location: Joi.object({
    name: Joi.string().max(200),
    city: Joi.string().max(120).allow(''),
    country: Joi.string().max(120).allow(''),
    category: Joi.string().valid('travel', 'food', 'nature', 'family', 'work', 'memory').default('travel'),
    visitedAt: Joi.date(),
    placeId: Joi.string().max(200).allow(''),
    address: Joi.string().max(300).allow(''),
    coordinates: Joi.object({ lat: Joi.number().min(-90).max(90), lng: Joi.number().min(-180).max(180) }),
  }),
  scheduling: Joi.object({
    scheduledAt: Joi.date(),
    isScheduled: Joi.boolean(),
    status: Joi.string().valid('none', 'scheduled', 'published', 'cancelled'),
    publishedAt: Joi.date(),
  }),
  template: Joi.string().allow('').max(100),
  isDraft: Joi.boolean(),
  isArchived: Joi.boolean(),
}).unknown(true);

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

  const bookmarkUrl = Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .allow('');

  const bookmarkSchema = Joi.object({
    type: Joi.string().valid('emoji', 'shayari', 'song', 'video', 'text', 'image').required(),
    source: Joi.string().valid('ai', 'chat', 'user', 'system', 'other').default('other'),
    content: Joi.string().max(10000).allow(''),
    metadata: Joi.object({
      emoji: Joi.string().max(64).allow(''),
      shayari: Joi.string().max(10000).allow(''),
      songTitle: Joi.string().max(300).allow(''),
      songArtist: Joi.string().max(300).allow(''),
      songClipUrl: bookmarkUrl,
      videoQuery: Joi.string().max(500).allow(''),
      videoEmbedUrl: bookmarkUrl,
      lyrics: Joi.string().max(20000).allow(''),
      originalMessageId: Joi.string().hex().length(24),
      sourceChatId: Joi.string().hex().length(24),
    }).max(10).unknown(false),
    tags: Joi.array().max(20).items(Joi.string().trim().max(50)),
  }).unknown(false);

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
  storySchema,
  personaSchema,
  groupSchema,
  bookmarkSchema,
  updateProfileSchema,
  changePasswordSchema,
  preferencesSchema,
};
