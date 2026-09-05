const fs = require('fs');
const path = require('path');

const STORY_MEDIA_LIMITS = Object.freeze({
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
});

const MIME_BY_CATEGORY = {
  image: new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  video: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
  audio: new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm']),
};

const EXTENSIONS_BY_CATEGORY = {
  image: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']),
  video: new Set(['.mp4', '.webm', '.mov']),
  audio: new Set(['.mp3', '.wav', '.ogg', '.webm']),
};

function categoryForMime(mimetype) {
  return Object.entries(MIME_BY_CATEGORY).find(([, values]) => values.has(mimetype))?.[0] || null;
}

function signatureMatches(category, bytes) {
  const ascii = (start, length) => bytes.subarray(start, start + length).toString('ascii');
  const startsWith = (values) => values.every((value, index) => bytes[index] === value);
  if (category === 'image') {
    return (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
      || startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      || ascii(0, 6) === 'GIF87a'
      || ascii(0, 6) === 'GIF89a'
      || (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP');
  }
  if (category === 'video') {
    return ascii(4, 4) === 'ftyp' || (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3);
  }
  if (category === 'audio') {
    return ascii(0, 3) === 'ID3' || ascii(0, 4) === 'RIFF' || ascii(0, 4) === 'OggS'
      || (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2));
  }
  return false;
}

async function validateStoryFile(file) {
  if (!file) return { ok: false, status: 400, error: 'No file provided' };
  const category = categoryForMime(file.mimetype);
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!category || !EXTENSIONS_BY_CATEGORY[category].has(extension)) {
    return { ok: false, status: 415, error: 'Unsupported Story media type' };
  }
  if (file.size > STORY_MEDIA_LIMITS[category]) {
    return { ok: false, status: 413, error: `Story ${category} exceeds the allowed size` };
  }
  const bytes = await fs.promises.readFile(file.path);
  if (!signatureMatches(category, bytes)) {
    return { ok: false, status: 415, error: 'Story media signature does not match its declared type' };
  }
  return { ok: true, category };
}

module.exports = { STORY_MEDIA_LIMITS, validateStoryFile };
