const fs = require('fs');
const path = require('path');

// Media truth comes from bytes. The declared MIME type, filename and extension
// are attacker controlled, so they are only ever used as a cross-check against
// the signature actually found inside the file.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const HEADER_BYTES = 256 * 1024;

const FORMATS = {
  jpeg: { category: 'image', extensions: ['.jpg', '.jpeg'], mimes: ['image/jpeg'] },
  png: { category: 'image', extensions: ['.png'], mimes: ['image/png'] },
  gif: { category: 'image', extensions: ['.gif'], mimes: ['image/gif'] },
  webp: { category: 'image', extensions: ['.webp'], mimes: ['image/webp'] },
  mp4: { category: 'video', extensions: ['.mp4', '.mov', '.m4a'], mimes: ['video/mp4', 'video/quicktime', 'audio/mp4'] },
  matroska: { category: 'video', extensions: ['.webm', '.mkv'], mimes: ['video/webm', 'audio/webm'] },
  mp3: { category: 'audio', extensions: ['.mp3'], mimes: ['audio/mpeg', 'audio/mp3'] },
  wav: { category: 'audio', extensions: ['.wav'], mimes: ['audio/wav', 'audio/x-wav'] },
  ogg: { category: 'audio', extensions: ['.ogg', '.oga'], mimes: ['audio/ogg'] },
};

function detectFormat(bytes) {
  const ascii = (start, length) => bytes.subarray(start, start + length).toString('ascii');
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return 'wav';
  if (ascii(4, 4) === 'ftyp') return 'mp4';
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'matroska';
  if (ascii(0, 3) === 'ID3') return 'mp3';
  if (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2)) return 'mp3';
  if (ascii(0, 4) === 'OggS') return 'ogg';
  return null;
}

function pngDimensions(bytes) {
  if (bytes.length < 24 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function gifDimensions(bytes) {
  if (bytes.length < 10) return null;
  return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
}

function webpDimensions(bytes) {
  const chunk = bytes.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L' && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
}

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xff) { offset += 1; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (marker === 0xda || marker === 0xd9) return null;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (SOF_MARKERS.has(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

// EXIF orientation is surfaced so callers can normalise decoding instead of
// letting preview and export disagree about which way an image is up.
function jpegOrientation(bytes) {
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return 1;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return 1;
    if (marker === 0xe1 && bytes.subarray(offset + 4, offset + 10).toString('ascii') === 'Exif\0\0') {
      return readExifOrientation(bytes.subarray(offset + 10, offset + 2 + length));
    }
    offset += 2 + length;
  }
  return 1;
}

function readExifOrientation(tiff) {
  if (tiff.length < 14) return 1;
  const endian = tiff.subarray(0, 2).toString('ascii');
  if (endian !== 'II' && endian !== 'MM') return 1;
  const little = endian === 'II';
  const u16 = (at) => (little ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at));
  const u32 = (at) => (little ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at));
  const ifdOffset = u32(4);
  if (ifdOffset + 2 > tiff.length) return 1;
  const entries = u16(ifdOffset);
  for (let index = 0; index < entries; index += 1) {
    const entry = ifdOffset + 2 + index * 12;
    if (entry + 12 > tiff.length) break;
    if (u16(entry) === 0x0112) {
      const orientation = u16(entry + 8);
      return orientation >= 1 && orientation <= 8 ? orientation : 1;
    }
  }
  return 1;
}

const DIMENSION_READERS = { png: pngDimensions, gif: gifDimensions, webp: webpDimensions, jpeg: jpegDimensions };

function readImageDimensions(format, bytes) {
  try {
    return DIMENSION_READERS[format]?.(bytes) || null;
  } catch {
    return null;
  }
}

const MB = 1024 * 1024;

const PROFILES = {
  story: {
    label: 'Story media',
    limits: { image: 10 * MB, video: 100 * MB, audio: 20 * MB },
    mimes: {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'],
    },
    extensions: { image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'], video: ['.mp4', '.webm', '.mov'], audio: ['.mp3', '.wav', '.ogg', '.webm'] },
    maxWidth: 10000,
    maxHeight: 10000,
    maxPixels: 50_000_000,
    requireImageDimensions: false,
  },
  generic: {
    label: 'File',
    limits: { image: 10 * MB, video: 100 * MB, audio: 20 * MB },
    mimes: {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'],
    },
    extensions: { image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'], video: ['.mp4', '.webm', '.mov'], audio: ['.mp3', '.wav', '.ogg', '.webm'] },
    maxWidth: 8192,
    maxHeight: 8192,
    maxPixels: 40_000_000,
    requireImageDimensions: true,
  },
  // Sticker assets are produced by our own exporter, so the accepted surface is
  // deliberately narrow: transparent-capable stills plus animated WebM.
  stickerAsset: {
    label: 'Sticker asset',
    limits: { image: 8 * MB, video: 20 * MB },
    mimes: { image: ['image/png', 'image/webp'], video: ['video/webm'] },
    extensions: { image: ['.png', '.webp'], video: ['.webm'] },
    maxWidth: 2048,
    maxHeight: 2048,
    maxPixels: 4_200_000,
    requireImageDimensions: true,
  },
  stickerThumbnail: {
    label: 'Sticker thumbnail',
    limits: { image: 2 * MB },
    mimes: { image: ['image/png', 'image/webp'] },
    extensions: { image: ['.png', '.webp'] },
    maxWidth: 512,
    maxHeight: 512,
    maxPixels: 262_144,
    requireImageDimensions: true,
  },
  // Source images the user places on the canvas. Wider than stickerAsset
  // because these are photos and imported graphics, not our own export.
  stickerObjectAsset: {
    label: 'Sticker image',
    limits: { image: 8 * MB },
    mimes: { image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
    extensions: { image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxWidth: 4096,
    maxHeight: 4096,
    maxPixels: 12_000_000,
    requireImageDimensions: true,
  },
};

async function readHeader(filePath, size) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const length = Math.min(HEADER_BYTES, size > 0 ? size : HEADER_BYTES);
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function categoryForMime(profile, mimetype) {
  return Object.keys(profile.mimes).find((category) => profile.mimes[category].includes(mimetype)) || null;
}

async function validateMediaFile(file, profileName = 'generic') {
  const profile = PROFILES[profileName];
  if (!profile) throw new Error(`Unknown media validation profile: ${profileName}`);
  if (!file) return { ok: false, status: 400, error: 'No file provided' };

  const category = categoryForMime(profile, file.mimetype);
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!category || !profile.extensions[category].includes(extension)) {
    return { ok: false, status: 415, error: `Unsupported ${profile.label.toLowerCase()} type` };
  }
  if (file.size > profile.limits[category]) {
    return { ok: false, status: 413, error: `${profile.label} exceeds the allowed size` };
  }

  const bytes = await readHeader(file.path, file.size);
  const format = detectFormat(bytes);
  if (!format || !FORMATS[format].mimes.includes(file.mimetype) || !FORMATS[format].extensions.includes(extension)) {
    return { ok: false, status: 415, error: `${profile.label} signature does not match its declared type` };
  }

  if (category !== 'image') return { ok: true, category, format };

  const dimensions = readImageDimensions(format, bytes);
  if (!dimensions || !dimensions.width || !dimensions.height) {
    if (profile.requireImageDimensions) {
      return { ok: false, status: 415, error: `${profile.label} dimensions could not be read` };
    }
    return { ok: true, category, format };
  }
  const { width, height } = dimensions;
  if (width > profile.maxWidth || height > profile.maxHeight || width * height > profile.maxPixels) {
    return { ok: false, status: 413, error: `${profile.label} resolution exceeds the allowed limit` };
  }
  // A file that is tiny on disk but enormous once decoded is a decompression
  // bomb, not a photo. The pixel ceiling above bounds decoded memory; this
  // catches the extreme ratios that ceiling would still permit.
  if (file.size > 0 && width * height > 1_000_000 && (width * height * 4) / file.size > 20_000) {
    return { ok: false, status: 415, error: `${profile.label} compression ratio looks unsafe` };
  }

  return { ok: true, category, format, width, height, orientation: format === 'jpeg' ? jpegOrientation(bytes) : 1 };
}

module.exports = {
  validateMediaFile,
  detectFormat,
  readImageDimensions,
  MEDIA_PROFILES: PROFILES,
};
