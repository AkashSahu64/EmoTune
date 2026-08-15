const express = require('express');
const router = express.Router();
const { searchMemory, getMemories, requestVerification, respondVerification } = require('../controllers/memoryController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { requireChatMember, requireMemoryAccess } = require('../identity/middleware/resourceAuthorization');

router.get('/search', authMiddleware, requireChatMember, searchMemory);
router.get('/', authMiddleware, requireChatMember, getMemories);
router.post('/:memoryId/verify', authMiddleware, requireMemoryAccess, requestVerification);
router.post('/:memoryId/respond', authMiddleware, requireMemoryAccess, respondVerification);

module.exports = router;
