jest.mock('../../models/Sticker', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../services/stickerService', () => ({
  storeStickerUpload: jest.fn(),
  storeObjectAssets: jest.fn(),
  applyObjectAssets: jest.fn(),
  reconcileObjectAssets: jest.fn(),
  releaseAll: jest.fn(),
  releaseStickerRecordAssets: jest.fn(),
  discardTempFiles: jest.fn(),
}));

const Sticker = require('../../models/Sticker');
const stickerService = require('../../services/stickerService');
const controller = require('../../controllers/stickerController');

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439012';
const STICKER_ID = '507f1f77bcf86cd799439013';

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const lean = (value) => ({ lean: jest.fn().mockResolvedValue(value) });
const select = (value) => ({ select: jest.fn().mockResolvedValue(value) });

const uploadResult = () => ({
  ok: true,
  asset: { url: '/uploads/a.png', publicId: '', mimeType: 'image/png', fileSize: 100, storage: 'local', category: 'image' },
  thumbnail: { url: '/uploads/a-thumb.png', publicId: '' },
  objectAssets: [],
  editorState: { version: 1, canvas: { width: 512, height: 512 }, objects: [] },
  droppedAssets: 0,
  dimensions: { width: 512, height: 512 },
  assetType: 'static',
  rollback: [{ url: '/uploads/a.png', storage: 'local', localPath: '/tmp/a.png' }],
});

beforeEach(() => {
  jest.clearAllMocks();
  Sticker.countDocuments.mockResolvedValue(0);
  stickerService.storeStickerUpload.mockResolvedValue(uploadResult());
});

describe('createSticker', () => {
  const files = { asset: [{ path: '/tmp/a.png' }] };

  it('derives ownership from the session and ignores client-supplied owner fields', async () => {
    const req = { userId: USER_A, files, body: { title: 'Mine', user: USER_B, isFavorite: 'true', usageCount: '99' } };
    const res = response();
    Sticker.create.mockResolvedValue({ _id: STICKER_ID, user: USER_A, assetType: 'static' });

    await controller.createSticker(req, res);

    expect(Sticker.create).toHaveBeenCalledTimes(1);
    const payload = Sticker.create.mock.calls[0][0];
    expect(payload.user).toBe(USER_A);
    expect(payload.title).toBe('Mine');
    expect(payload).not.toHaveProperty('isFavorite');
    expect(payload).not.toHaveProperty('usageCount');
    expect(payload.assetUrl).toBe('/uploads/a.png');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects an invalid editor state without storing anything', async () => {
    const req = { userId: USER_A, files, body: { editorState: '{"version":99}' } };
    const res = response();

    await controller.createSticker(req, res);

    expect(stickerService.storeStickerUpload).not.toHaveBeenCalled();
    expect(stickerService.discardTempFiles).toHaveBeenCalledWith(files);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('rejects an oversized editor state with 413', async () => {
    const req = { userId: USER_A, files, body: { editorState: `{"pad":"${'x'.repeat(600 * 1024)}"}` } };
    const res = response();

    await controller.createSticker(req, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(Sticker.create).not.toHaveBeenCalled();
  });

  it('returns the first sticker instead of creating a duplicate on a repeated save', async () => {
    const existing = { _id: STICKER_ID, user: USER_A };
    Sticker.findOne.mockReturnValue(lean(existing));
    const req = { userId: USER_A, files, body: { clientMutationId: 'save-1' } };
    const res = response();

    await controller.createSticker(req, res);

    expect(Sticker.findOne).toHaveBeenCalledWith({ user: USER_A, clientMutationId: 'save-1' });
    expect(Sticker.create).not.toHaveBeenCalled();
    expect(stickerService.discardTempFiles).toHaveBeenCalledWith(files);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sticker: existing, deduplicated: true });
  });

  it('releases stored assets when the database write fails', async () => {
    const upload = uploadResult();
    stickerService.storeStickerUpload.mockResolvedValue(upload);
    Sticker.create.mockRejectedValue(new Error('write failed'));
    const res = response();

    await controller.createSticker({ userId: USER_A, files, body: {} }, res);

    expect(stickerService.releaseAll).toHaveBeenCalledWith(upload.rollback);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('passes an upload rejection status straight through', async () => {
    stickerService.storeStickerUpload.mockResolvedValue({ ok: false, status: 415, error: 'Sticker asset signature does not match its declared type' });
    const res = response();

    await controller.createSticker({ userId: USER_A, files, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(Sticker.create).not.toHaveBeenCalled();
  });

  it('refuses to grow the library past its cap', async () => {
    Sticker.countDocuments.mockResolvedValue(500);
    const res = response();

    await controller.createSticker({ userId: USER_A, files, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(stickerService.storeStickerUpload).not.toHaveBeenCalled();
  });
});

describe('getStickers', () => {
  const chain = (rows) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  });

  it('scopes the list query to the authenticated user', async () => {
    Sticker.find.mockReturnValue(chain([]));
    const res = response();

    await controller.getStickers({ userId: USER_A, query: {} }, res);

    expect(Sticker.find).toHaveBeenCalledWith({ user: USER_A });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stickers: [] }));
  });

  it('applies favorite, asset type and search filters', async () => {
    Sticker.find.mockReturnValue(chain([]));
    const res = response();

    await controller.getStickers({ userId: USER_A, query: { favorite: 'true', assetType: 'animated', search: ' cat ' } }, res);

    expect(Sticker.find).toHaveBeenCalledWith({
      user: USER_A, isFavorite: true, assetType: 'animated', $text: { $search: 'cat' },
    });
  });

  it('rejects bad pagination, sort, filter and cursor values', async () => {
    const cases = [{ limit: '0' }, { limit: '999' }, { sort: 'popular' }, { favorite: 'maybe' }, { assetType: 'lottie' }, { cursor: 'not-a-cursor' }];
    for (const query of cases) {
      const res = response();
      Sticker.find.mockReturnValue(chain([]));
      await controller.getStickers({ userId: USER_A, query }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  it('returns a cursor only when another page exists', async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ _id: `50000000000000000000000${index}`, createdAt: new Date('2026-01-0' + (index + 1)) }));
    Sticker.find.mockReturnValue(chain(rows));
    const res = response();

    await controller.getStickers({ userId: USER_A, query: { limit: 2 } }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.stickers).toHaveLength(2);
    expect(payload.pagination.hasMore).toBe(true);
    expect(typeof payload.pagination.nextCursor).toBe('string');
    expect(controller.__testing.decodeCursor(payload.pagination.nextCursor)).toMatchObject({ id: rows[1]._id });
  });
});

describe('getSticker', () => {
  it('returns the owner their full sticker including the editable project', async () => {
    const owned = { _id: STICKER_ID, user: USER_A, editorState: { version: 1 } };
    Sticker.findOne.mockReturnValueOnce(lean(owned));
    const res = response();

    await controller.getSticker({ userId: USER_A, params: { stickerId: STICKER_ID } }, res);

    expect(Sticker.findOne).toHaveBeenCalledWith({ _id: STICKER_ID, user: USER_A });
    expect(res.json).toHaveBeenCalledWith({ sticker: owned, canEdit: true });
  });

  it('hides another user\'s private sticker behind a 404', async () => {
    Sticker.findOne.mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean(null));
    const res = response();

    await controller.getSticker({ userId: USER_B, params: { stickerId: STICKER_ID } }, res);

    expect(Sticker.findOne).toHaveBeenNthCalledWith(1, { _id: STICKER_ID, user: USER_B });
    expect(Sticker.findOne).toHaveBeenNthCalledWith(2, { _id: STICKER_ID, visibility: 'unlisted' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('never sends the editable project to a non-owner of an unlisted sticker', async () => {
    const shared = { _id: STICKER_ID, user: USER_A, visibility: 'unlisted', title: 'Shared', assetUrl: '/uploads/a.png', editorState: { version: 1 } };
    Sticker.findOne.mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean(shared));
    const res = response();

    await controller.getSticker({ userId: USER_B, params: { stickerId: STICKER_ID } }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.canEdit).toBe(false);
    expect(payload.sticker).not.toHaveProperty('editorState');
    expect(payload.sticker).not.toHaveProperty('user');
  });

  it('rejects a malformed id', async () => {
    const res = response();
    await controller.getSticker({ userId: USER_A, params: { stickerId: 'nope' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Sticker.findOne).not.toHaveBeenCalled();
  });
});

describe('updateSticker', () => {
  const existing = {
    _id: STICKER_ID, user: USER_A, assetType: 'static', duration: 0, objectAssets: [],
    assetPublicId: 'old-asset', thumbnailPublicId: 'old-thumb', assetUrl: '/uploads/old.png', thumbnailUrl: '/uploads/old-thumb.png',
  };

  beforeEach(() => {
    stickerService.applyObjectAssets.mockImplementation((editorState) => ({ editorState, droppedAssets: 0, objectAssets: [] }));
    stickerService.reconcileObjectAssets.mockReturnValue({ objectAssets: [], orphaned: [] });
  });

  it('refuses to update a sticker owned by someone else', async () => {
    Sticker.findOne.mockReturnValue(lean(null));
    const res = response();

    await controller.updateSticker({ userId: USER_B, params: { stickerId: STICKER_ID }, body: { title: 'Stolen' }, files: null }, res);

    expect(Sticker.findOne).toHaveBeenCalledWith({ _id: STICKER_ID, user: USER_B });
    expect(Sticker.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates metadata through an ownership-scoped query', async () => {
    Sticker.findOne.mockReturnValue(lean(existing));
    Sticker.findOneAndUpdate.mockResolvedValue({ ...existing, title: 'Renamed' });
    const res = response();

    await controller.updateSticker({ userId: USER_A, params: { stickerId: STICKER_ID }, body: { title: 'Renamed', tags: 'a,b,a' }, files: null }, res);

    expect(Sticker.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: STICKER_ID, user: USER_A },
      { $set: { title: 'Renamed', tags: ['a', 'b'] } },
      { new: true, runValidators: true },
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sticker: expect.objectContaining({ title: 'Renamed' }) }));
  });

  it('ignores attempts to rewrite ownership, usage counters or asset urls', async () => {
    Sticker.findOne.mockReturnValue(lean(existing));
    Sticker.findOneAndUpdate.mockResolvedValue(existing);
    const res = response();

    await controller.updateSticker({
      userId: USER_A,
      params: { stickerId: STICKER_ID },
      body: { title: 'Fine', user: USER_B, usageCount: '9999', assetUrl: 'https://evil.example/x.png', createdAt: '2000-01-01' },
      files: null,
    }, res);

    expect(Sticker.findOneAndUpdate.mock.calls[0][1]).toEqual({ $set: { title: 'Fine' } });
  });

  it('revalidates a replaced editor state and stores the rewritten copy', async () => {
    Sticker.findOne.mockReturnValue(lean(existing));
    Sticker.findOneAndUpdate.mockResolvedValue(existing);
    const editorState = JSON.stringify({ version: 1, canvas: { width: 512, height: 512 }, objects: [] });
    const res = response();

    await controller.updateSticker({ userId: USER_A, params: { stickerId: STICKER_ID }, body: { editorState }, files: null }, res);

    expect(stickerService.applyObjectAssets).toHaveBeenCalled();
    const update = Sticker.findOneAndUpdate.mock.calls[0][1].$set;
    expect(update.editorState).toMatchObject({ version: 1 });
    expect(update.editorVersion).toBe(1);
  });

  it('rejects an invalid editor state before touching the record', async () => {
    Sticker.findOne.mockReturnValue(lean(existing));
    const res = response();

    await controller.updateSticker({ userId: USER_A, params: { stickerId: STICKER_ID }, body: { editorState: '{"version":2}' }, files: null }, res);

    expect(Sticker.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('frees the superseded asset only after the record points at the new one', async () => {
    Sticker.findOne.mockReturnValue(lean(existing));
    Sticker.findOneAndUpdate.mockResolvedValue({ ...existing, assetUrl: '/uploads/a.png' });
    stickerService.reconcileObjectAssets.mockReturnValue({ objectAssets: [], orphaned: [{ publicId: 'orphan' }] });
    const res = response();

    await controller.updateSticker({
      userId: USER_A, params: { stickerId: STICKER_ID }, body: {}, files: { asset: [{ path: '/tmp/new.png' }] },
    }, res);

    expect(stickerService.releaseStickerRecordAssets).toHaveBeenCalledWith({ objectAssets: [{ publicId: 'orphan' }] });
    expect(stickerService.releaseStickerRecordAssets).toHaveBeenCalledWith({
      assetPublicId: 'old-asset', thumbnailPublicId: 'old-thumb', assetUrl: '/uploads/old.png', thumbnailUrl: '/uploads/old-thumb.png',
    });
    expect(stickerService.releaseAll).not.toHaveBeenCalled();
  });

  it('rolls back newly stored assets when the record update fails', async () => {
    Sticker.findOne.mockReturnValue(lean(existing));
    Sticker.findOneAndUpdate.mockResolvedValue(null);
    const upload = uploadResult();
    stickerService.storeStickerUpload.mockResolvedValue(upload);
    const res = response();

    await controller.updateSticker({
      userId: USER_A, params: { stickerId: STICKER_ID }, body: {}, files: { asset: [{ path: '/tmp/new.png' }] },
    }, res);

    expect(stickerService.releaseAll).toHaveBeenCalledWith(upload.rollback);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('deleteSticker, setFavorite and incrementUsage', () => {
  it('deletes only within the owner scope and frees the stored files', async () => {
    const record = { _id: STICKER_ID, user: USER_A, assetPublicId: 'a' };
    Sticker.findOneAndDelete.mockResolvedValue(record);
    const res = response();

    await controller.deleteSticker({ userId: USER_A, params: { stickerId: STICKER_ID } }, res);

    expect(Sticker.findOneAndDelete).toHaveBeenCalledWith({ _id: STICKER_ID, user: USER_A });
    expect(stickerService.releaseStickerRecordAssets).toHaveBeenCalledWith(record);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Sticker deleted' }));
  });

  it('cannot delete another user\'s sticker and deletes no files', async () => {
    Sticker.findOneAndDelete.mockResolvedValue(null);
    const res = response();

    await controller.deleteSticker({ userId: USER_B, params: { stickerId: STICKER_ID } }, res);

    expect(Sticker.findOneAndDelete).toHaveBeenCalledWith({ _id: STICKER_ID, user: USER_B });
    expect(stickerService.releaseStickerRecordAssets).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('cannot favorite another user\'s sticker', async () => {
    Sticker.findOneAndUpdate.mockReturnValue(select(null));
    const res = response();

    await controller.setFavorite({ userId: USER_B, params: { stickerId: STICKER_ID }, body: { isFavorite: true } }, res);

    expect(Sticker.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: STICKER_ID, user: USER_B },
      { $set: { isFavorite: true } },
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('requires a boolean favorite flag', async () => {
    const res = response();
    await controller.setFavorite({ userId: USER_A, params: { stickerId: STICKER_ID }, body: { isFavorite: 'yes' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Sticker.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('counts usage only on the caller\'s own sticker', async () => {
    Sticker.findOneAndUpdate.mockReturnValue(select({ _id: STICKER_ID, usageCount: 1 }));
    const res = response();

    await controller.incrementUsage({ userId: USER_A, params: { stickerId: STICKER_ID } }, res);

    const [filter, update] = Sticker.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: STICKER_ID, user: USER_A });
    expect(update.$inc).toEqual({ usageCount: 1 });
    expect(update.$set.lastUsed).toBeInstanceOf(Date);
  });
});
