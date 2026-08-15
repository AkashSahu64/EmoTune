const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const dnaController = require('../controllers/dnaController');

router.get('/', authMiddleware, dnaController.getDNAProfile);
router.get('/recommendations', authMiddleware, dnaController.getDNARecommendationProfile);
router.get('/writing-style', authMiddleware, dnaController.getWritingStyle);
router.get('/activity', authMiddleware, dnaController.getActivityProfile);
router.get('/top-emojis', authMiddleware, dnaController.getTopEmojis);
router.post('/reset', authMiddleware, dnaController.resetDNA);

module.exports = router;
