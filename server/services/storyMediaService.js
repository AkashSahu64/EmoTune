const { validateMediaFile, MEDIA_PROFILES } = require('./mediaValidationService');

const STORY_MEDIA_LIMITS = Object.freeze({ ...MEDIA_PROFILES.story.limits });

// Story uploads keep their own error wording while the signature, size and
// dimension rules live in the shared media validator.
async function validateStoryFile(file) {
  const result = await validateMediaFile(file, 'story');
  if (result.ok) return { ok: true, category: result.category, format: result.format, width: result.width, height: result.height, orientation: result.orientation };
  if (result.status === 415 && result.error.startsWith('Unsupported')) {
    return { ok: false, status: 415, error: 'Unsupported Story media type' };
  }
  if (result.status === 413 && result.error.includes('allowed size')) {
    return { ok: false, status: 413, error: `Story ${categoryLabel(file)} exceeds the allowed size` };
  }
  return result;
}

function categoryLabel(file) {
  const mimetype = String(file?.mimetype || '');
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'image';
}

module.exports = { STORY_MEDIA_LIMITS, validateStoryFile };
