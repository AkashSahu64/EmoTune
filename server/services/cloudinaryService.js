const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

async function uploadMedia(filePath, options = {}) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'emotune',
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    logger.error('Cloudinary upload failed', { error: error.message });
    throw error;
  }
}

async function uploadAudioClip(url, title) {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: 'emotune/songs',
      resource_type: 'video',
      public_id: `song_${Date.now()}`,
      context: `title=${title}`,
    });
    return result;
  } catch (error) {
    logger.warn('Audio clip upload failed', { error: error.message });
    return null;
  }
}

async function deleteMedia(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Cloudinary delete failed', { error: error.message });
  }
}

module.exports = { uploadMedia, uploadAudioClip, deleteMedia };
