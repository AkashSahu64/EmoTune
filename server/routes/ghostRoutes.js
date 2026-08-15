const express = require('express');
const router = express.Router();
const { createSession, getChatSessions, destroySession } = require('../controllers/ghostController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.post('/', authMiddleware, createSession);
router.get('/:chatId', authMiddleware, getChatSessions);
router.delete('/:id', authMiddleware, destroySession);

module.exports = router;
