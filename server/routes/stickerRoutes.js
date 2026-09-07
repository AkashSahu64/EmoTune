const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { stickerUpload } = require('../config/multer');
const {
  createSticker,
  getStickers,
  getSticker,
  updateSticker,
  deleteSticker,
  setFavorite,
  incrementUsage,
} = require('../controllers/stickerController');

const stickerKey = (req) => `sticker:${req.userId || 'anonymous'}:${req.ip}`;
const stickerReadLimiter = createRateLimiter(60_000, 120, 'Too many sticker read requests', stickerKey);
const stickerSaveLimiter = createRateLimiter(60_000, 20, 'Too many sticker saves. Try again in a minute.', stickerKey);
const stickerMutationLimiter = createRateLimiter(60_000, 60, 'Too many sticker updates', stickerKey);

// Multer rejections must surface as the status the client can act on rather
// than a generic 500 from the error handler.
const withUpload = (handler) => (req, res, next) => handler(req, res, (error) => {
  if (!error) return next();
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Sticker file exceeds the allowed size' });
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected sticker upload field' });
  }
  if (error.code === 'LIMIT_UNSUPPORTED_FILE') return res.status(415).json({ error: error.message });
  return res.status(400).json({ error: 'Sticker upload failed' });
});

router.post('/', authMiddleware, stickerSaveLimiter, withUpload(stickerUpload), createSticker);
router.get('/', authMiddleware, stickerReadLimiter, getStickers);
router.get('/:stickerId', authMiddleware, stickerReadLimiter, getSticker);
router.patch('/:stickerId', authMiddleware, stickerSaveLimiter, withUpload(stickerUpload), updateSticker);
router.patch('/:stickerId/favorite', authMiddleware, stickerMutationLimiter, setFavorite);
router.patch('/:stickerId/use', authMiddleware, stickerMutationLimiter, incrementUsage);
router.delete('/:stickerId', authMiddleware, stickerMutationLimiter, deleteSticker);

module.exports = router;
