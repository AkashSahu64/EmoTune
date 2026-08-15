const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { requireChatMember } = require('../identity/middleware/resourceAuthorization');
const orchestratorController = require('../controllers/orchestratorController');

router.get('/suggestions/:chatId', authMiddleware, requireChatMember, orchestratorController.getIntelligentSuggestions);
router.get('/predictions/:chatId', authMiddleware, requireChatMember, orchestratorController.getPredictions);
router.get('/health/:chatId', authMiddleware, requireChatMember, orchestratorController.getHealthAnalysis);
router.get('/dna', authMiddleware, orchestratorController.getDNAProfile);
router.get('/analytics', authMiddleware, orchestratorController.getAnalytics);
router.post('/process', authMiddleware, requireChatMember, orchestratorController.processMessage);

module.exports = router;
