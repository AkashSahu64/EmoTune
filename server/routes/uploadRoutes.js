const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { uploadMedia } = require('../services/cloudinaryService');
const { validateMediaFile } = require('../services/mediaValidationService');
const logger = require('../utils/logger');
const fs = require('fs');

const CLOUDINARY_ENABLED = !!process.env.CLOUDINARY_CLOUD_NAME;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const discard = (filePath) => {
  if (filePath) fs.unlink(filePath, () => {});
};

// Media is verified against its own bytes; anything else is a plain attachment,
// which the /uploads route serves with nosniff + Content-Disposition so it can
// never be interpreted as active content.
const isMediaUpload = (mimetype) => /^(image|video|audio)\//i.test(String(mimetype || ''));

const handleUpload = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (!error) return next();
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File exceeds the allowed size' });
  if (error.code === 'LIMIT_UNSUPPORTED_FILE') return res.status(415).json({ error: error.message });
  return res.status(400).json({ error: 'Upload failed' });
});

router.post('/', authMiddleware, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, size, mimetype, filename } = req.file;

    if (isMediaUpload(mimetype)) {
      const validation = await validateMediaFile(req.file, 'generic');
      if (!validation.ok) {
        discard(req.file.path);
        return res.status(validation.status || 415).json({ error: validation.error });
      }
    } else if (size > MAX_DOCUMENT_BYTES) {
      discard(req.file.path);
      return res.status(413).json({ error: 'File exceeds the allowed size' });
    }

    if (CLOUDINARY_ENABLED) {
      try {
        const result = await uploadMedia(req.file.path, {
          public_id: `file_${Date.now()}`,
          resource_type: 'auto',
        });
        discard(req.file.path);
        return res.json({
          url: result.secure_url,
          fileName: originalname,
          fileSize: size,
          fileType: mimetype,
          publicId: result.public_id,
        });
      } catch (cloudErr) {
        logger.warn('Cloudinary upload failed, falling back to local storage', { error: cloudErr.message });
      }
    }

    res.json({
      url: `/uploads/${filename}`,
      fileName: originalname,
      fileSize: size,
      fileType: mimetype,
    });
  } catch (error) {
    discard(req.file?.path);
    logger.error('File upload failed', { error: error.message });
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
