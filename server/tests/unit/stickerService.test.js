jest.mock('../../services/mediaValidationService', () => ({
  validateMediaFile: jest.fn(),
  MEDIA_PROFILES: {},
}));
jest.mock('../../services/cloudinaryService', () => ({
  uploadMedia: jest.fn(),
  deleteMedia: jest.fn().mockResolvedValue(undefined),
}));
// Only unlink is faked: the tests assert which files get released, and every
// other fs call (the logger's own setup) must keep working.
jest.mock('fs', () => ({ ...jest.requireActual('fs'), unlink: jest.fn((_, cb) => cb && cb()) }));

const fs = require('fs');
const { validateMediaFile } = require('../../services/mediaValidationService');
const { uploadMedia, deleteMedia } = require('../../services/cloudinaryService');
const service = require('../../services/stickerService');

const imageFile = (name = 'a.png') => ({ path: `/tmp/${name}`, filename: `stored-${name}`, originalname: name, mimetype: 'image/png', size: 1024 });

const okImage = (width = 512, height = 512) => ({ ok: true, category: 'image', format: 'png', width, height });

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.STICKER_REMOTE_ASSET_HOSTS;
  validateMediaFile.mockResolvedValue(okImage());
});

describe('asset url trust', () => {
  it('trusts only this server\'s own uploads and allowlisted delivery hosts', () => {
    expect(service.isTrustedAssetUrl('/uploads/a.png')).toBe(true);
    expect(service.isTrustedAssetUrl('https://res.cloudinary.com/demo/image/upload/a.png')).toBe(true);
    expect(service.isTrustedAssetUrl('https://evil.example/a.png')).toBe(false);
    expect(service.isTrustedAssetUrl('http://res.cloudinary.com/demo/a.png')).toBe(false);
    expect(service.isTrustedAssetUrl('/uploads/../../server.js')).toBe(false);
    expect(service.isTrustedAssetUrl('javascript:alert(1)')).toBe(false);
    expect(service.isTrustedAssetUrl('')).toBe(false);
    expect(service.isTrustedAssetUrl(null)).toBe(false);
  });

  it('honours an operator-configured host allowlist', () => {
    process.env.STICKER_REMOTE_ASSET_HOSTS = 'media.giphy.com, cdn.example';
    expect(service.isTrustedAssetUrl('https://media.giphy.com/media/x/giphy.gif')).toBe(true);
    expect(service.isTrustedAssetUrl('https://cdn.example/a.png')).toBe(true);
    expect(service.isTrustedAssetUrl('https://other.example/a.png')).toBe(false);
  });
});

describe('storeAsset', () => {
  it('falls back to local storage and keeps the file where /uploads serves it', async () => {
    const result = await service.storeAsset(imageFile(), 'stickerAsset', 'sticker');
    expect(result).toMatchObject({ ok: true });
    expect(result.stored).toMatchObject({ url: '/uploads/stored-a.png', storage: 'local', width: 512, height: 512, mimeType: 'image/png' });
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('uploads to cloudinary when configured and drops the temp file', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    uploadMedia.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/a.png', public_id: 'emotune/stickers/a' });

    const result = await service.storeAsset(imageFile(), 'stickerAsset', 'sticker');

    expect(uploadMedia).toHaveBeenCalledWith('/tmp/a.png', expect.objectContaining({ resource_type: 'image', folder: 'emotune/stickers' }));
    expect(result.stored).toMatchObject({ url: 'https://res.cloudinary.com/demo/a.png', publicId: 'emotune/stickers/a', storage: 'cloudinary' });
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/a.png', expect.any(Function));
  });

  it('falls back to local storage when cloudinary fails', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    uploadMedia.mockRejectedValue(new Error('network down'));

    const result = await service.storeAsset(imageFile(), 'stickerAsset', 'sticker');

    expect(result.stored.storage).toBe('local');
  });

  it('discards the temp file and passes the rejection through when validation fails', async () => {
    validateMediaFile.mockResolvedValue({ ok: false, status: 415, error: 'Sticker asset signature does not match its declared type' });

    const result = await service.storeAsset(imageFile(), 'stickerAsset', 'sticker');

    expect(result).toMatchObject({ ok: false, status: 415 });
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/a.png', expect.any(Function));
  });
});

describe('applyObjectAssets', () => {
  const state = () => ({
    objects: [
      { id: 'layer-1', type: 'image', src: 'https://evil.example/x.png' },
      { id: 'layer-2', type: 'image', src: '/uploads/kept.png' },
      { id: 'text-1', type: 'text', text: 'hi' },
      { id: 'group-1', type: 'group', children: [{ id: 'layer-3', type: 'image', src: 'https://evil.example/y.png' }] },
    ],
  });

  it('points uploaded layers at the stored url, including inside groups', () => {
    const stored = new Map([['layer-3', { url: '/uploads/layer3.png', publicId: 'p3' }]]);
    const result = service.applyObjectAssets(state(), stored);

    expect(result.editorState.objects[3].children[0]).toMatchObject({ src: '/uploads/layer3.png', assetUnavailable: false });
    expect(result.objectAssets).toEqual([{ objectId: 'layer-3', url: '/uploads/layer3.png', publicId: 'p3' }]);
  });

  it('clears untrusted sources instead of persisting them', () => {
    const result = service.applyObjectAssets(state(), new Map());

    expect(result.editorState.objects[0]).not.toHaveProperty('src');
    expect(result.editorState.objects[0].assetUnavailable).toBe(true);
    expect(result.editorState.objects[1].src).toBe('/uploads/kept.png');
    expect(result.droppedAssets).toBe(2);
  });

  it('leaves non-image objects untouched', () => {
    const result = service.applyObjectAssets(state(), new Map());
    expect(result.editorState.objects[2]).toEqual({ id: 'text-1', type: 'text', text: 'hi' });
  });

  it('tolerates a missing editor state', () => {
    expect(service.applyObjectAssets(null, new Map())).toMatchObject({ droppedAssets: 0, objectAssets: [] });
  });
});

describe('storeObjectAssets', () => {
  it('maps each uploaded file to its editor object id', async () => {
    const result = await service.storeObjectAssets([imageFile('one.png'), imageFile('two.png')], ['layer-1', 'layer-2']);

    expect(result.ok).toBe(true);
    expect(result.storedByObjectId.get('layer-1').url).toBe('/uploads/stored-one.png');
    expect(result.storedByObjectId.get('layer-2').url).toBe('/uploads/stored-two.png');
  });

  it('discards a file with no matching object id', async () => {
    const result = await service.storeObjectAssets([imageFile('orphan.png')], []);

    expect(result.storedByObjectId.size).toBe(0);
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/orphan.png', expect.any(Function));
  });

  it('rolls back everything already stored when one layer is rejected', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    uploadMedia.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/one.png', public_id: 'p1' });
    validateMediaFile
      .mockResolvedValueOnce(okImage())
      .mockResolvedValueOnce({ ok: false, status: 413, error: 'Sticker image resolution exceeds the allowed limit' });

    const result = await service.storeObjectAssets([imageFile('one.png'), imageFile('two.png'), imageFile('three.png')], ['a', 'b', 'c']);

    expect(result).toMatchObject({ ok: false, status: 413 });
    expect(deleteMedia).toHaveBeenCalledWith('p1');
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/three.png', expect.any(Function));
  });
});

describe('storeStickerUpload', () => {
  const editorState = () => ({
    canvas: { width: 512, height: 512 },
    objects: [{ id: 'layer-1', type: 'image', src: 'blob:http://localhost/x' }],
  });

  it('returns server-derived facts, never the client\'s claims', async () => {
    validateMediaFile.mockResolvedValue(okImage(640, 480));

    const result = await service.storeStickerUpload({
      files: { asset: [imageFile('flat.png')] },
      editorState: editorState(),
    });

    expect(result).toMatchObject({ ok: true, assetType: 'static', dimensions: { width: 640, height: 480 } });
    expect(result.thumbnail).toBe(result.asset);
    expect(result.droppedAssets).toBe(1);
    expect(result.editorState.objects[0]).not.toHaveProperty('src');
  });

  it('falls back to the validated canvas size when the bytes carry no dimensions', async () => {
    validateMediaFile.mockResolvedValue({ ok: true, category: 'image', format: 'png', width: 0, height: 0 });

    const result = await service.storeStickerUpload({ files: { asset: [imageFile()] }, editorState: editorState() });

    expect(result.dimensions).toEqual({ width: 512, height: 512 });
  });

  it('requires an asset file and drops whatever else arrived', async () => {
    const result = await service.storeStickerUpload({ files: { thumbnail: [imageFile('t.png')] } });

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/t.png', expect.any(Function));
  });

  it('refuses an animated sticker with no thumbnail and releases the asset', async () => {
    validateMediaFile.mockResolvedValue({ ok: true, category: 'video', format: 'matroska', width: 0, height: 0 });

    const result = await service.storeStickerUpload({ files: { asset: [imageFile('anim.webm')] } });

    expect(result).toMatchObject({ ok: false, status: 400, error: 'Animated stickers require a thumbnail image' });
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/anim.webm', expect.any(Function));
  });

  it('marks a video asset with a thumbnail as animated', async () => {
    validateMediaFile
      .mockResolvedValueOnce({ ok: true, category: 'video', format: 'matroska', width: 0, height: 0 })
      .mockResolvedValueOnce(okImage(256, 256));

    const result = await service.storeStickerUpload({
      files: { asset: [imageFile('anim.webm')], thumbnail: [imageFile('thumb.png')] },
      editorState: editorState(),
    });

    expect(result).toMatchObject({ ok: true, assetType: 'animated', dimensions: { width: 512, height: 512 } });
    expect(result.thumbnail.url).toBe('/uploads/stored-thumb.png');
  });

  it('releases the asset already stored when the thumbnail is rejected', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    uploadMedia.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/a.png', public_id: 'asset-1' });
    validateMediaFile
      .mockResolvedValueOnce(okImage())
      .mockResolvedValueOnce({ ok: false, status: 413, error: 'Sticker thumbnail resolution exceeds the allowed limit' });

    const result = await service.storeStickerUpload({
      files: { asset: [imageFile()], thumbnail: [imageFile('thumb.png')], objectAssets: [imageFile('layer.png')] },
      objectAssetIds: ['layer-1'],
    });

    expect(result).toMatchObject({ ok: false, status: 413 });
    expect(deleteMedia).toHaveBeenCalledWith('asset-1');
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/layer.png', expect.any(Function));
  });

  it('lists every stored file in rollback so a failed save leaves nothing behind', async () => {
    const result = await service.storeStickerUpload({
      files: { asset: [imageFile()], thumbnail: [imageFile('thumb.png')], objectAssets: [imageFile('layer.png')] },
      objectAssetIds: ['layer-1'],
      editorState: editorState(),
    });

    expect(result.rollback.map((entry) => entry.url)).toEqual([
      '/uploads/stored-a.png', '/uploads/stored-thumb.png', '/uploads/stored-layer.png',
    ]);
    expect(result.objectAssets).toEqual([{ objectId: 'layer-1', url: '/uploads/stored-layer.png', publicId: '' }]);
  });
});

describe('reconcileObjectAssets', () => {
  const previous = [
    { objectId: 'layer-1', url: '/uploads/keep.png', publicId: 'keep' },
    { objectId: 'layer-2', url: '/uploads/gone.png', publicId: 'gone' },
  ];
  const state = { objects: [{ id: 'layer-1', type: 'image', src: '/uploads/keep.png' }] };

  it('keeps what the new project still references and orphans the rest', () => {
    const result = service.reconcileObjectAssets(previous, state, []);

    expect(result.objectAssets).toEqual([previous[0]]);
    expect(result.orphaned).toEqual([previous[1]]);
  });

  it('merges newly added assets without duplicating a url', () => {
    const added = [{ objectId: 'layer-1', url: '/uploads/keep.png', publicId: 'keep' }, { objectId: 'layer-3', url: '/uploads/new.png', publicId: 'new' }];
    const result = service.reconcileObjectAssets(previous, state, added);

    expect(result.objectAssets).toHaveLength(2);
    expect(result.objectAssets.map((entry) => entry.url)).toEqual(['/uploads/keep.png', '/uploads/new.png']);
  });

  it('orphans everything when the project keeps no image layers', () => {
    const result = service.reconcileObjectAssets(previous, { objects: [] }, []);
    expect(result.objectAssets).toEqual([]);
    expect(result.orphaned).toEqual(previous);
  });
});

describe('releaseStickerRecordAssets', () => {
  it('frees remote ids and local files exactly once each', async () => {
    await service.releaseStickerRecordAssets({
      assetPublicId: 'a', thumbnailPublicId: 'a', assetUrl: '/uploads/a.png', thumbnailUrl: '/uploads/a.png',
      objectAssets: [{ url: '/uploads/layer.png', publicId: 'l' }],
    });

    expect(deleteMedia).toHaveBeenCalledTimes(2);
    expect(deleteMedia).toHaveBeenCalledWith('a');
    expect(deleteMedia).toHaveBeenCalledWith('l');
    expect(fs.unlink).toHaveBeenCalledTimes(2);
  });

  it('never follows a traversal path out of the uploads directory', async () => {
    await service.releaseStickerRecordAssets({ assetUrl: '/uploads/../../server.js', thumbnailUrl: 'https://res.cloudinary.com/demo/a.png' });

    expect(fs.unlink).not.toHaveBeenCalled();
    expect(deleteMedia).not.toHaveBeenCalled();
  });

  it('tolerates a record with nothing stored', async () => {
    await expect(service.releaseStickerRecordAssets(null)).resolves.toBeUndefined();
    await expect(service.releaseStickerRecordAssets({})).resolves.toBeUndefined();
  });
});
