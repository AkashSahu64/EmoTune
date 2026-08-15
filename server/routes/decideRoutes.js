const express = require('express');
const router = express.Router();
const { triggerDecision, voteOnDecision, getDecision, getChatDecisions } = require('../controllers/decideController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { requireChatMember, requireDecisionAccess } = require('../identity/middleware/resourceAuthorization');

router.post('/:chatId/trigger', authMiddleware, requireChatMember, triggerDecision);
router.get('/chat/:chatId', authMiddleware, requireChatMember, getChatDecisions);
router.post('/:decisionId/vote', authMiddleware, requireDecisionAccess, voteOnDecision);
router.get('/:decisionId', authMiddleware, requireDecisionAccess, getDecision);

module.exports = router;
