const express = require('express');
const router = express.Router();
const { createBookmark, getBookmarks, getBookmark, deleteBookmark, incrementUsage, setFavorite } = require('../controllers/bookmarkController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');

const bookmarkKey = (req) => `bookmark:${req.userId || 'anonymous'}:${req.ip}`;
const bookmarkReadLimiter = createRateLimiter(60_000, 120, 'Too many bookmark read requests', bookmarkKey);
const bookmarkCreateLimiter = createRateLimiter(60_000, 30, 'Too many bookmarks created', bookmarkKey);
const bookmarkMutationLimiter = createRateLimiter(60_000, 60, 'Too many bookmark changes', bookmarkKey);

router.post('/', authMiddleware, bookmarkCreateLimiter, createBookmark);
router.get('/', authMiddleware, bookmarkReadLimiter, getBookmarks);
router.get('/:bookmarkId', authMiddleware, bookmarkReadLimiter, getBookmark);
router.delete('/:bookmarkId', authMiddleware, bookmarkMutationLimiter, deleteBookmark);
router.patch('/:bookmarkId/use', authMiddleware, bookmarkMutationLimiter, incrementUsage);
router.patch('/:bookmarkId/favorite', authMiddleware, bookmarkMutationLimiter, setFavorite);

module.exports = router;
