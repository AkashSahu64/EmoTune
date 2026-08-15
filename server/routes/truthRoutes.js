const express = require('express');
const router = express.Router();
const { getClaim, getChatClaims, voteOnClaim, createClaim } = require('../controllers/truthController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { requireChatMember, requireClaimAccess } = require('../identity/middleware/resourceAuthorization');

router.post('/', authMiddleware, requireChatMember, createClaim);
router.get('/chat/:chatId', authMiddleware, requireChatMember, getChatClaims);
router.get('/:claimId', authMiddleware, requireClaimAccess, getClaim);
router.post('/:claimId/vote', authMiddleware, requireClaimAccess, voteOnClaim);

module.exports = router;
