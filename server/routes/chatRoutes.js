const express = require('express');
const router = express.Router();
const { getUserChats, getOrCreateDirectChat, searchChats, updateChatPreferences } = require('../controllers/chatController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.get('/', authMiddleware, getUserChats);
router.get('/search', authMiddleware, searchChats);
router.patch('/:chatId/preferences', authMiddleware, updateChatPreferences);
router.post('/direct/:userId', authMiddleware, getOrCreateDirectChat);

module.exports = router;
