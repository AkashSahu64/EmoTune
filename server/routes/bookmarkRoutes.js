const express = require('express');
const router = express.Router();
const { createBookmark, getBookmarks, deleteBookmark, incrementUsage } = require('../controllers/bookmarkController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.post('/', authMiddleware, createBookmark);
router.get('/', authMiddleware, getBookmarks);
router.delete('/:bookmarkId', authMiddleware, deleteBookmark);
router.patch('/:bookmarkId/use', authMiddleware, incrementUsage);

module.exports = router;
