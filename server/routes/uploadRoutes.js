const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const { uploadMedia } = require('../services/cloudinaryService');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CLOUDINARY_ENABLED = !!process.env.CLOUDINARY_CLOUD_NAME;

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, size, mimetype, filename } = req.file;

    if (CLOUDINARY_ENABLED) {
      try {
        const result = await uploadMedia(req.file.path, {
          public_id: `file_${Date.now()}`,
          resource_type: 'auto',
        });
        fs.unlink(req.file.path, () => {});
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
    logger.error('File upload failed', { error: error.message });
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
