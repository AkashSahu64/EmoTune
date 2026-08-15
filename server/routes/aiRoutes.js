const express = require('express');
const router = express.Router();
const {
  getSuggestions, rewriteMessage, getEmotionTheme,
  getEmojis, getGifs, getShayari, getSongs, getVideos,
  getSummary, translateMessage, getMetrics, getCacheStatus, getStreamingSuggestions,
  getConversationIntelligence
} = require('../controllers/aiController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { requireChatMember } = require('../identity/middleware/resourceAuthorization');
const { aiRateLimiter, mediaRateLimiter } = require('../middleware/rateLimiter');

router.get('/suggestions/:chatId', authMiddleware, requireChatMember, aiRateLimiter, getSuggestions);
router.post('/rewrite', authMiddleware, aiRateLimiter, rewriteMessage);
router.get('/emotion-theme/:chatId', authMiddleware, requireChatMember, aiRateLimiter, getEmotionTheme);
router.post('/translate', authMiddleware, aiRateLimiter, translateMessage);

router.get('/emojis/:chatId', authMiddleware, requireChatMember, getEmojis);
router.get('/gifs/:chatId', authMiddleware, requireChatMember, mediaRateLimiter, getGifs);
router.get('/shayari/:chatId', authMiddleware, requireChatMember, getShayari);
router.get('/songs/:chatId', authMiddleware, requireChatMember, getSongs);
router.get('/videos/:chatId', authMiddleware, requireChatMember, getVideos);
router.get('/summary/:chatId', authMiddleware, requireChatMember, aiRateLimiter, getSummary);

router.get('/intelligence/:chatId', authMiddleware, requireChatMember, getConversationIntelligence);
router.get('/stream/:chatId', authMiddleware, requireChatMember, getStreamingSuggestions);
router.get('/metrics', authMiddleware, getMetrics);
router.get('/cache', authMiddleware, getCacheStatus);

module.exports = router;
