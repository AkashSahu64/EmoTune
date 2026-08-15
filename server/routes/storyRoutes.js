const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const {
  createStory,
  getFeed,
  getStorySuggestions,
  getStory,
  deleteStory,
  viewStory,
  reactToStory,
  replyToStory,
  getHighlights,
  createHighlight,
  generateMemoryStory,
  getStoryAnalytics,
  getTrendingStories,
} = require('../controllers/storyController');

router.get('/feed', authMiddleware, getFeed);
router.get('/suggestions', authMiddleware, getStorySuggestions);
router.get('/trending', authMiddleware, getTrendingStories);
router.get('/highlights', authMiddleware, getHighlights);
router.post('/highlights', authMiddleware, createHighlight);
router.post('/memory', authMiddleware, generateMemoryStory);
router.post('/', authMiddleware, createStory);
router.get('/:id', authMiddleware, getStory);
router.delete('/:id', authMiddleware, deleteStory);
router.post('/:id/view', authMiddleware, viewStory);
router.post('/:id/react', authMiddleware, reactToStory);
router.post('/:id/reply', authMiddleware, replyToStory);
router.get('/:id/analytics', authMiddleware, getStoryAnalytics);

module.exports = router;
