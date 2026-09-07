const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateMediaFile, detectFormat, readImageDimensions, MEDIA_PROFILES } = require('../../services/mediaValidationService');
const { safeExtension, BLOCKED_EXTENSIONS, BLOCKED_MIMES } = require('../../config/multer');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const u32 = (value) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
};

const pngBytes = (width, height, padding = 64) => Buffer.concat([
  PNG_SIGNATURE, u32(13), Buffer.from('IHDR'), u32(width), u32(height), Buffer.alloc(padding),
]);

const jpegBytes = (width, height) => {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]);
  const dims = Buffer.alloc(4);
  dims.writeUInt16BE(height, 0);
  dims.writeUInt16BE(width, 2);
  return Buffer.concat([header, dims, Buffer.alloc(32)]);
};

const jpegWithOrientation = (orientation) => {
  const tiff = Buffer.alloc(22);
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(0x2a, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  const app1Length = Buffer.alloc(2);
  app1Length.writeUInt16BE(2 + 6 + tiff.length);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]), app1Length, Buffer.from('Exif\0\0', 'binary'), tiff,
    jpegBytes(120, 80).subarray(2),
  ]);
};

const gifBytes = (width, height) => {
  const header = Buffer.from('GIF89a', 'ascii');
  const dims = Buffer.alloc(4);
  dims.writeUInt16LE(width, 0);
  dims.writeUInt16LE(height, 2);
  return Buffer.concat([header, dims, Buffer.alloc(16)]);
};

const webpBytes = (width, height) => {
  const buffer = Buffer.alloc(40);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(32, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8 ', 12, 'ascii');
  buffer.writeUInt16LE(width, 26);
  buffer.writeUInt16LE(height, 28);
  return buffer;
};

const webmBytes = () => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32)]);

describe('media validation service', () => {
  const tempFiles = [];

  const makeFile = (name, content, mimetype, sizeOverride) => {
    const filePath = path.join(os.tmpdir(), `emotune-media-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
    fs.writeFileSync(filePath, content);
    tempFiles.push(filePath);
    return { path: filePath, originalname: name, mimetype, size: sizeOverride ?? content.length };
  };

  afterAll(() => tempFiles.forEach((filePath) => fs.existsSync(filePath) && fs.unlinkSync(filePath)));

  it('detects the formats the app accepts from bytes alone', () => {
    expect(detectFormat(pngBytes(4, 4))).toBe('png');
    expect(detectFormat(jpegBytes(4, 4))).toBe('jpeg');
    expect(detectFormat(gifBytes(4, 4))).toBe('gif');
    expect(detectFormat(webpBytes(4, 4))).toBe('webp');
    expect(detectFormat(webmBytes())).toBe('matroska');
    expect(detectFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });

  it('reads dimensions for every image format it claims to support', () => {
    expect(readImageDimensions('png', pngBytes(320, 240))).toEqual({ width: 320, height: 240 });
    expect(readImageDimensions('jpeg', jpegBytes(320, 240))).toEqual({ width: 320, height: 240 });
    expect(readImageDimensions('gif', gifBytes(320, 240))).toEqual({ width: 320, height: 240 });
    expect(readImageDimensions('webp', webpBytes(320, 240))).toEqual({ width: 320, height: 240 });
  });

  it('accepts a sticker asset that matches its declared type', async () => {
    const file = makeFile('sticker.png', pngBytes(512, 512), 'image/png');
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({
      ok: true, category: 'image', format: 'png', width: 512, height: 512,
    });
  });

  it('rejects a file whose bytes disagree with its declared type', async () => {
    const file = makeFile('sticker.png', jpegBytes(64, 64), 'image/png');
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 415 });
  });

  it('rejects an extension that disagrees with the declared type', async () => {
    const file = makeFile('sticker.webp', pngBytes(64, 64), 'image/png');
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 415 });
  });

  it('refuses SVG for every profile', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    for (const profile of Object.keys(MEDIA_PROFILES)) {
      const file = makeFile('x.svg', svg, 'image/svg+xml');
      await expect(validateMediaFile(file, profile)).resolves.toMatchObject({ ok: false, status: 415 });
    }
  });

  it('enforces the per-profile size ceiling', async () => {
    const file = makeFile('big.png', pngBytes(64, 64), 'image/png', 9 * 1024 * 1024);
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 413 });
  });

  it('enforces the per-profile resolution ceiling', async () => {
    const file = makeFile('wide.png', pngBytes(4096, 4096), 'image/png', 2 * 1024 * 1024);
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 413 });
    const thumb = makeFile('thumb.png', pngBytes(1024, 1024), 'image/png', 1024);
    await expect(validateMediaFile(thumb, 'stickerThumbnail')).resolves.toMatchObject({ ok: false, status: 413 });
  });

  it('rejects a tiny file that decodes into an enormous bitmap', async () => {
    const file = makeFile('bomb.png', pngBytes(2000, 2000), 'image/png');
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 415, error: expect.stringContaining('compression ratio') });
  });

  it('requires readable dimensions where a profile depends on them', async () => {
    const headerOnly = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(16)]);
    const strict = makeFile('unknown.png', headerOnly, 'image/png');
    await expect(validateMediaFile(strict, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 415 });
    const lenient = makeFile('unknown.png', headerOnly, 'image/png');
    await expect(validateMediaFile(lenient, 'story')).resolves.toMatchObject({ ok: true });
  });

  it('accepts animated sticker assets as video without dimension parsing', async () => {
    const file = makeFile('animated.webm', webmBytes(), 'video/webm');
    await expect(validateMediaFile(file, 'stickerAsset')).resolves.toMatchObject({ ok: true, category: 'video', format: 'matroska' });
  });

  it('reports EXIF orientation so preview and export can agree', async () => {
    const file = makeFile('rotated.jpg', jpegWithOrientation(6), 'image/jpeg');
    await expect(validateMediaFile(file, 'stickerObjectAsset')).resolves.toMatchObject({ ok: true, orientation: 6 });
    const plain = makeFile('plain.jpg', jpegBytes(120, 80), 'image/jpeg');
    await expect(validateMediaFile(plain, 'stickerObjectAsset')).resolves.toMatchObject({ ok: true, orientation: 1 });
  });

  it('keeps sticker layer sources to photographic formats only', async () => {
    const gif = makeFile('layer.gif', gifBytes(64, 64), 'image/gif');
    await expect(validateMediaFile(gif, 'stickerObjectAsset')).resolves.toMatchObject({ ok: true });
    const video = makeFile('layer.webm', webmBytes(), 'video/webm');
    await expect(validateMediaFile(video, 'stickerObjectAsset')).resolves.toMatchObject({ ok: false, status: 415 });
  });

  it('rejects a missing file and an unknown profile', async () => {
    await expect(validateMediaFile(null, 'stickerAsset')).resolves.toMatchObject({ ok: false, status: 400 });
    await expect(validateMediaFile({}, 'nope')).rejects.toThrow('Unknown media validation profile');
  });
});

describe('upload filename hardening', () => {
  it('never stores an executable or renderable extension', () => {
    ['.svg', '.html', '.php', '.js', '.exe', '.jar', '.htaccess'].forEach((extension) => {
      expect(BLOCKED_EXTENSIONS.has(extension)).toBe(true);
      expect(safeExtension(`payload${extension}`)).toBe('.bin');
    });
    expect(BLOCKED_MIMES.has('image/svg+xml')).toBe(true);
    expect(BLOCKED_MIMES.has('text/html')).toBe(true);
  });

  it('keeps a safe extension and normalises case', () => {
    expect(safeExtension('photo.PNG')).toBe('.png');
    expect(safeExtension('clip.WebM')).toBe('.webm');
  });

  it('falls back to .bin for missing or hostile extensions', () => {
    expect(safeExtension('noextension')).toBe('.bin');
    expect(safeExtension('trick.png.')).toBe('.bin');
    expect(safeExtension('../../etc/passwd')).toBe('.bin');
    expect(safeExtension('a.' + 'x'.repeat(30))).toBe('.bin');
  });
});
