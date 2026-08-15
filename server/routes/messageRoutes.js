const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, deleteMessage, deleteMessageEveryone, editMessage, forwardMessage, pinMessage, unpinMessage, reactToMessage, getIntentCounts, markRead, markAllRead, getSilentMessages, acceptSilentMessage } = require('../controllers/messageController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { requireChatMember, requireMessageAccess } = require('../identity/middleware/resourceAuthorization');
const { apiRateLimiter } = require('../middleware/rateLimiter');

router.post('/', authMiddleware, apiRateLimiter, sendMessage);
router.get('/silent', authMiddleware, getSilentMessages);
router.post('/accept-silent', authMiddleware, acceptSilentMessage);
router.patch('/read', authMiddleware, markRead);
router.patch('/read-all', authMiddleware, markAllRead);
router.get('/:chatId', authMiddleware, requireChatMember, getMessages);
router.delete('/:messageId', authMiddleware, requireMessageAccess, deleteMessage);
router.delete('/:messageId/everyone', authMiddleware, requireMessageAccess, deleteMessageEveryone);
router.patch('/:messageId/edit', authMiddleware, requireMessageAccess, editMessage);
router.post('/forward', authMiddleware, forwardMessage);
router.get('/:chatId/counts', authMiddleware, requireChatMember, getIntentCounts);
router.post('/:messageId/pin', authMiddleware, requireMessageAccess, pinMessage);
router.post('/:messageId/unpin', authMiddleware, requireMessageAccess, unpinMessage);
router.post('/:messageId/react', authMiddleware, requireMessageAccess, reactToMessage);

module.exports = router;
