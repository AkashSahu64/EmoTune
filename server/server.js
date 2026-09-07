require('dotenv').config();
const path = require('path');
require('module').globalPaths.push(path.resolve(__dirname, 'node_modules'));
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { connectCloudinary } = require('./config/cloudinary');
const jwtService = require('./identity/services/jwtService');
const sessionService = require('./identity/services/sessionService');
const User = require('./models/User');
const Chat = require('./models/Chat');
const errorHandler = require('./middleware/errorHandler');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { logger } = require('./core/logger');
const cacheService = require('./core/cacheService');
const { CONFIG } = require('./core/config');

const { setCsrfCookie } = require('./identity/middleware/csrfMiddleware');
const { extractDeviceInfo } = require('./identity/middleware/deviceMiddleware');
const socketRegistry = require('./socketRegistry');
const presenceService = require('./core/presenceService');

const app = express();
const server = http.createServer(app);
const healthCheck = require('./core/healthCheck');

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

require('./core/socket').set(io);
app.set('io', io);
app.set('presenceService', presenceService);

// Keep orchestration probes independent from auth, CSRF and API rate limits.
// HTTP starts only after MongoDB is ready, but these endpoints also expose
// the state accurately during startup/recovery.
app.get('/health', async (req, res) => {
  const health = await healthCheck.getHealth();
  res.status(health.status === 'down' ? 503 : 200).json(health);
});

app.get('/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    mongodb: ready ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

// Wait for MongoDB before accepting traffic so the first login cannot pay
// connection establishment latency inside the request.
const databaseReady = connectDB();
if (process.env.CLOUDINARY_CLOUD_NAME) {
  connectCloudinary();
}

cacheService.init().then(() => {
  logger.info('Cache service initialized', { redis: CONFIG.redis.url });
}).catch((err) => {
  logger.warn('Cache service initialized in memory-only mode', { error: err.message });
});

const validateConfig = require('./core/configValidator');
const { logger: cfgLogger } = require('./core/logger');
const cfgResult = validateConfig.validateConfig();
if (cfgResult.errors.length > 0) {
  cfgLogger.error('Configuration validation failed', { errors: cfgResult.errors });
  cfgResult.errors.forEach(e => console.error(`  [CRITICAL] ${e}`));
  process.exit(1);
}
if (cfgResult.warnings.length > 0) {
  cfgLogger.warn('Configuration warnings', { warnings: cfgResult.warnings });
  cfgResult.warnings.forEach(w => console.warn(`  [WARN] ${w}`));
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(setCsrfCookie);
app.use(extractDeviceInfo);
app.use(apiRateLimiter);
const { csrfProtection } = require('./identity/middleware/csrfMiddleware');
app.use(csrfProtection);

app.use('/api/auth', require('./identity/routes/authRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/bookmarks', require('./routes/bookmarkRoutes'));
app.use('/api/memory', require('./routes/memoryRoutes'));
app.use('/api/truth', require('./routes/truthRoutes'));
app.use('/api/personas', require('./routes/personaRoutes'));
app.use('/api/decide', require('./routes/decideRoutes'));
app.use('/api/ghost', require('./routes/ghostRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/dna', require('./routes/dnaRoutes'));
app.use('/api/orchestrator', require('./routes/orchestratorRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));
app.use('/api/stickers', require('./routes/stickerRoutes'));
app.use('/api/groups', require('./routes/groupIntelligenceRoutes'));
app.use('/api/communities', require('./routes/communityRoutes'));
app.use('/api/identity/auth', require('./identity/routes/authRoutes'));
app.use('/api/identity/sessions', require('./identity/routes/sessionRoutes'));
app.use('/api/identity/devices', require('./identity/routes/deviceRoutes'));
app.use('/api/identity/admin', require('./identity/routes/adminRoutes'));
// Uploaded files are user content: never sniffed, and only media is allowed to
// render inline. Everything else downloads instead of being interpreted.
const INLINE_UPLOAD_TYPES = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.oga', '.m4a']);
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    if (!INLINE_UPLOAD_TYPES.has(path.extname(filePath).toLowerCase())) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  },
}));

app.get('/api/health', async (req, res) => {
  const { metrics } = require('./core/logger');
  const health = await healthCheck.getHealth();
  const cacheStatus = await cacheService.healthCheck();
  res.json({
    status: health.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: health.mongodb,
    cache: cacheStatus,
    redis: health.redis,
    system: health.system,
    connections: health.connections,
    metrics: metrics.getReport(),
  });
});

app.get('/', (req, res) => {
  res.json({ name: 'Emotune API v2', version: '2.0.0' });
});

app.use(errorHandler);

const onlineUsers = new Map();
app.set('onlineUsers', onlineUsers);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwtService.verifyAccessToken(token);
    const session = await sessionService.validateSession(decoded.sessionId);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('User not found'));
    if (session.user.toString() !== user._id.toString()) return next(new Error('Session mismatch'));
    if (session.deviceFingerprint && socket.handshake.auth?.deviceFingerprint &&
      session.deviceFingerprint !== socket.handshake.auth.deviceFingerprint) {
      return next(new Error('Device mismatch'));
    }

    if (user.deletedAt) return next(new Error('Account deleted'));
    if (user.status === 'blocked') return next(new Error('Account blocked'));

    socket.userId = user._id.toString();
    socket.user = user;
    socket.sessionId = session.sessionId;
    socket.deviceId = session.device?.toString() || null;
    socketRegistry.register(socket);
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;
  logger.info(`User connected: ${userId}`);

  const userPrefs = await User.findById(userId).select('preferences');
  const ghostPrefs = userPrefs?.preferences?.ghostMode || {};
  const isGhostOffline = ghostPrefs.autoEnable && ghostPrefs.visibility === 'offline';
  const privacyPrefs = userPrefs?.preferences?.privacy || {};

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);
  await presenceService.markOnline(userId, socket.id);
  socket.join(`user:${userId}`);

  const wasOffline = onlineUsers.get(userId).size === 1;
  if (wasOffline) {
    await User.findByIdAndUpdate(userId, { status: isGhostOffline ? 'offline' : 'online', lastActive: new Date() });
    if (!isGhostOffline && privacyPrefs.onlineStatus !== 'nobody') {
      socket.broadcast.emit('user:online', { userId });
    }
  }

  const userChats = await Chat.find({ 'participants.user': userId }).select('_id');
  userChats.forEach((chat) => { socket.join(chat._id.toString()); });

  const visibleOnlineIds = [];
  // Resolve presence privacy in one query instead of one User.findById per
  // currently connected user during every socket handshake.
  const onlineUserIds = [...onlineUsers.entries()]
    .filter(([, sockets]) => sockets.size > 0)
    .map(([uid]) => uid);
  const onlinePreferenceUsers = await User.find({ _id: { $in: onlineUserIds } })
    .select('_id preferences')
    .lean();
  const onlinePreferences = new Map(
    onlinePreferenceUsers.map((onlineUser) => [onlineUser._id.toString(), onlineUser]),
  );
  for (const [uid, sockets] of onlineUsers) {
    if (sockets.size > 0) {
      const uPrefs = uid === userId ? userPrefs : onlinePreferences.get(uid);
      const ghost = uPrefs?.preferences?.ghostMode || {};
      const privacy = uPrefs?.preferences?.privacy || {};
      const isGhost = ghost.autoEnable && ghost.visibility === 'offline';
      const isHidden = privacy.onlineStatus === 'nobody';
      if (!isGhost && !isHidden) visibleOnlineIds.push(uid);
    }
  }
  socket.emit('onlineUsers:list', { onlineUserIds: visibleOnlineIds });

  const getChat = (chatId) => Chat.findOne({ _id: chatId, 'participants.user': userId });
  const getDecision = (decisionId) => require('./models/Decision').findById(decisionId);
  const canAccessDecision = async (decisionId) => {
    const decision = await getDecision(decisionId);
    if (!decision) return null;
    const chat = await getChat(decision.chat);
    return chat ? decision : null;
  };

  socket.on('typing:start', async ({ chatId }) => {
    if (await getChat(chatId)) socket.to(chatId).emit('typing:start', { userId, chatId });
  });

  socket.on('typing:stop', async ({ chatId }) => {
    if (await getChat(chatId)) socket.to(chatId).emit('typing:stop', { userId, chatId });
  });

  socket.on('memory:verifyRequest', async ({ memoryId, textSnippet, chatId }) => {
    if (await getChat(chatId)) socket.to(chatId).emit('memory:verifyRequest', { memoryId, textSnippet, requestedBy: userId });
  });

  socket.on('memory:verifyResponse', async ({ memoryId, status, editedText, chatId }) => {
    if (await getChat(chatId)) socket.to(chatId).emit('memory:verifyResponse', { memoryId, status, editedText, respondedBy: userId });
  });

  socket.on('ghost:join', async ({ sessionId }) => {
    const GhostSession = require('./models/GhostSession');
    const ghost = await GhostSession.findOne({ _id: sessionId, isActive: true });
    if (!ghost || !(await getChat(ghost.chat))) return;
    socket.join(`ghost:${sessionId}`);
    socket.to(`ghost:${sessionId}`).emit('ghost:userJoined', { userId });
  });

  socket.on('ghost:sync', async ({ sessionId, data }) => {
    const GhostSession = require('./models/GhostSession');
    const ghost = await GhostSession.findOne({ _id: sessionId, isActive: true });
    if (!ghost || !(await getChat(ghost.chat))) return;
    socket.to(`ghost:${sessionId}`).emit('ghost:sync', { userId, data });
  });

  socket.on('ghost:leave', async ({ sessionId }) => {
    const GhostSession = require('./models/GhostSession');
    const ghost = await GhostSession.findOne({ _id: sessionId });
    if (!ghost || !(await getChat(ghost.chat))) return;
    socket.leave(`ghost:${sessionId}`);
    socket.to(`ghost:${sessionId}`).emit('ghost:userLeft', { userId });
  });

  socket.on('decision:vote', async ({ decisionId, optionIndex }) => {
    if (await canAccessDecision(decisionId)) io.to(`decision:${decisionId}`).emit('decision:vote', { decisionId, optionIndex, userId });
  });

  socket.on('message:delivered', async ({ messageIds, chatId }) => {
    try {
      if (!(await getChat(chatId))) return;
      await Message.updateMany(
        { _id: { $in: messageIds }, chat: chatId },
        { $addToSet: { deliveredTo: userId } }
      );
      socket.to(chatId).emit('message:delivered', { messageIds, userId });
    } catch (err) {
      logger.error('Message delivery ack error', { error: err.message });
    }
  });

  socket.on('join:chat', async ({ chatId }) => { if (await getChat(chatId)) socket.join(chatId); });
  socket.on('leave:chat', async ({ chatId }) => { if (await getChat(chatId)) socket.leave(chatId); });
  socket.on('join:decision', async ({ decisionId }) => { if (await canAccessDecision(decisionId)) socket.join(`decision:${decisionId}`); });
  socket.on('leave:decision', async ({ decisionId }) => { if (await canAccessDecision(decisionId)) socket.leave(`decision:${decisionId}`); });

  socket.on('disconnect', async () => {
    socketRegistry.unregister(socket);
    await presenceService.markOffline(userId, socket.id);
    logger.info(`User disconnected: ${userId}`);
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { status: 'offline', lastActive: new Date() });
        const curPrefs = await User.findById(userId).select('preferences');
        const isGhost = curPrefs?.preferences?.ghostMode?.autoEnable && curPrefs?.preferences?.ghostMode?.visibility === 'offline';
        const isHidden = curPrefs?.preferences?.privacy?.onlineStatus === 'nobody';
        if (!isGhost && !isHidden) {
          socket.broadcast.emit('user:offline', { userId });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

const { setupGracefulShutdown } = require('./core/gracefulShutdown');
setupGracefulShutdown(server);

databaseReady.then(async () => {
  if (process.env.NODE_ENV === 'development') {
    const { seedTestUser } = require('./utils/seed');
    await seedTestUser().catch((err) => logger.warn('Development seed skipped', { error: err.message }));
  }
  server.listen(PORT, () => {
    logger.info(`Emotune server running on port ${PORT}`);
    console.log(`🚀 Emotune API running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  logger.error('Server startup aborted because MongoDB is unavailable', { error: err.message });
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = { app, server, io };
