const express = require('express');
const axios = require('axios');
const fs = require('fs');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const upload = require('../config/multer');
const { uploadMedia } = require('../services/cloudinaryService');
const { validateStoryFile } = require('../services/storyMediaService');
const { createRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const { removeImageBackground } = require('../services/backgroundRemovalService');
const {
  createStory,
  getFeed,
  getStorySuggestions,
  getStory,
  deleteStory,
  viewStory,
  reactToStory,
  replyToStory,
  getStoryReplies,
  getStoryInteraction,
  submitStoryInteraction,
  searchStoryMusic,
  getHighlights,
  createHighlight,
  deleteHighlight,
  generateMemoryStory,
  getStoryAnalytics,
  getStoryViewers,
  getDrafts,
  updateDraft,
  publishStory,
  shareStory,
  scheduleStory,
  cancelScheduledStory,
  getTrendingStories,
} = require('../controllers/storyController');

const storyCreateLimiter = createRateLimiter(60_000, 20, 'Too many Stories created. Try again later.');
const storyViewLimiter = createRateLimiter(60_000, 180, 'Too many Story views. Try again later.');
const storyReactionLimiter = createRateLimiter(60_000, 60, 'Too many Story reactions. Try again later.');
const storyReplyLimiter = createRateLimiter(60_000, 30, 'Too many Story replies. Try again later.');
const storyUploadLimiter = createRateLimiter(60_000, 20, 'Too many Story uploads. Try again later.');
const storyAnalyticsLimiter = createRateLimiter(60_000, 30, 'Too many Story analytics requests. Try again later.');
const backgroundRemovalLimiter = createRateLimiter(60_000, 10, 'Too many background removal requests. Try again later.');
const stockSearchLimiter = createRateLimiter(60_000, 30, 'Too many stock image searches. Try again later.');

router.get('/stock-images', authMiddleware, stockSearchLimiter, async (req, res) => {
  const query = String(req.query.q || 'nature').trim().slice(0, 80);
  const page = Math.max(1, Math.min(20, Number.parseInt(req.query.page, 10) || 1));
  const perPage = Math.max(1, Math.min(24, Number.parseInt(req.query.per_page, 10) || 12));
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'Stock images are not configured. Add PEXELS_API_KEY to server/.env and restart the backend.' });
  }

  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: apiKey },
      params: { query: query || 'nature', page, per_page: perPage },
      timeout: 8000,
    });
    const photos = (response.data?.photos || []).map((photo) => ({
      id: `pexels-${photo.id}`,
      source: 'pexels',
      title: photo.alt || 'Pexels stock photo',
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      sourceUrl: photo.url,
      url: photo.src?.large || photo.src?.medium || photo.src?.original,
      thumbnail: photo.src?.medium || photo.src?.small || photo.src?.large,
      width: photo.width,
      height: photo.height,
    })).filter((photo) => photo.url && photo.thumbnail);
    return res.json({ query, page, perPage, totalResults: response.data?.total_results || photos.length, photos });
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) return res.status(502).json({ error: 'Stock image provider rejected the server credentials.' });
    if (status === 429) return res.status(429).json({ error: 'Stock image search is temporarily rate limited. Try again shortly.' });
    if (error.code === 'ECONNABORTED') return res.status(504).json({ error: 'Stock image search timed out. Try again.' });
    logger.warn('Stock image search failed', { error: error.message, status });
    return res.status(502).json({ error: 'Stock images are temporarily unavailable. Try again.' });
  }
});

router.post('/upload', authMiddleware, storyUploadLimiter, upload.single('file'), async (req, res) => {
  try {
    const validation = await validateStoryFile(req.file);
    if (!validation.ok) {
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(validation.status).json({ error: validation.error });
    }

    const { originalname, size, mimetype, filename } = req.file;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const result = await uploadMedia(req.file.path, {
          public_id: `story_${Date.now()}`,
          resource_type: validation.category === 'image' ? 'image' : validation.category === 'video' ? 'video' : 'raw',
        });
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.json({ url: result.secure_url, fileName: originalname, fileSize: size, fileType: mimetype, category: validation.category, publicId: result.public_id });
      } catch (error) {
        logger.warn('Story Cloudinary upload failed; falling back to local storage', { error: error.message });
      }
    }

    return res.json({ url: `/uploads/${filename}`, fileName: originalname, fileSize: size, fileType: mimetype, category: validation.category });
  } catch (error) {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    logger.error('Story upload failed', { error: error.message });
    return res.status(500).json({ error: 'Failed to upload Story media' });
  }
});

router.post('/remove-background', authMiddleware, backgroundRemovalLimiter, upload.single('file'), async (req, res) => {
  try {
    const validation = await validateStoryFile(req.file);
    if (!validation.ok || validation.category !== 'image') {
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(validation.ok ? 415 : validation.status).json({ error: validation.ok ? 'Only image files can have their background removed' : validation.error });
    }
    const output = await removeImageBackground(req.file.path, req.signal);
    await fs.promises.unlink(req.file.path).catch(() => {});
    res.set('Content-Type', 'image/png').set('Cache-Control', 'no-store').send(output);
  } catch (error) {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    logger.warn('Story background removal failed', { error: error.message, code: error.code, status: error.status });
    const messages = {
      BACKGROUND_REMOVAL_NOT_CONFIGURED: 'Background removal is not configured. Add REMOVE_BG_API_KEY to server/.env and restart the backend.',
      BACKGROUND_REMOVAL_INVALID_API_KEY: 'Background removal is unavailable because the configured API key is invalid.',
      BACKGROUND_REMOVAL_INVALID_IMAGE: 'This image could not be processed. Try a different PNG, JPG, or WEBP image.',
      BACKGROUND_REMOVAL_QUOTA_EXCEEDED: 'Background removal is temporarily unavailable because the provider quota has been exceeded.',
      BACKGROUND_REMOVAL_IMAGE_TOO_LARGE: 'This image is too large for background removal. Choose a smaller image.',
      BACKGROUND_REMOVAL_RATE_LIMITED: 'Too many background removal requests. Please try again shortly.',
      BACKGROUND_REMOVAL_TIMEOUT: 'Background removal took too long. Please try again.',
      BACKGROUND_REMOVAL_PROVIDER_UNAVAILABLE: 'Background removal provider is temporarily unavailable. Please try again.',
      BACKGROUND_REMOVAL_INVALID_RESPONSE: 'Background removal returned an invalid image. Please try again.',
    };
    res.status(error.status || 502).json({ error: messages[error.code] || 'Background removal failed. Please try again.' });
  }
});

router.get('/feed', authMiddleware, getFeed);
router.get('/drafts', authMiddleware, getDrafts);
router.get('/suggestions', authMiddleware, getStorySuggestions);
router.get('/trending', authMiddleware, getTrendingStories);
router.get('/highlights', authMiddleware, getHighlights);
router.post('/highlights', authMiddleware, createHighlight);
router.delete('/highlights/:id', authMiddleware, deleteHighlight);
router.post('/memory', authMiddleware, generateMemoryStory);
router.post('/', authMiddleware, storyCreateLimiter, createStory);
router.patch('/:id/draft', authMiddleware, storyCreateLimiter, updateDraft);
router.post('/:id/publish', authMiddleware, storyCreateLimiter, publishStory);
router.post('/:id/schedule', authMiddleware, storyCreateLimiter, scheduleStory);
router.delete('/:id/schedule', authMiddleware, storyCreateLimiter, cancelScheduledStory);
router.post('/:id/share', authMiddleware, storyReplyLimiter, shareStory);
router.get('/:id', authMiddleware, getStory);
router.delete('/:id', authMiddleware, deleteStory);
router.post('/:id/view', authMiddleware, storyViewLimiter, viewStory);
router.post('/:id/react', authMiddleware, storyReactionLimiter, reactToStory);
router.post('/:id/reply', authMiddleware, storyReplyLimiter, replyToStory);
router.get('/:id/replies', authMiddleware, storyAnalyticsLimiter, getStoryReplies);
router.get('/:id/interaction', authMiddleware, storyViewLimiter, getStoryInteraction);
router.post('/:id/interaction', authMiddleware, storyReplyLimiter, submitStoryInteraction);
router.get('/music/search', authMiddleware, storyViewLimiter, searchStoryMusic);
router.get('/:id/analytics', authMiddleware, storyAnalyticsLimiter, getStoryAnalytics);
router.get('/:id/viewers', authMiddleware, storyAnalyticsLimiter, getStoryViewers);

module.exports = router;
