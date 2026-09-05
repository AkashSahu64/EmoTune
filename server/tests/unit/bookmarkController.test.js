const mongoose = require('mongoose');

jest.mock('../../models/Bookmark', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOneAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const Bookmark = require('../../models/Bookmark');
const {
  createBookmark,
  getBookmarks,
  deleteBookmark,
  incrementUsage,
  setFavorite,
} = require('../../controllers/bookmarkController');

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('bookmark controller foundation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a bookmark using the authenticated owner', async () => {
    const req = {
      userId: 'user-a',
      body: { type: 'emoji', content: '😊', metadata: { emoji: '😊' } },
    };
    const res = response();
    Bookmark.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    Bookmark.create.mockResolvedValue({ _id: 'bookmark-1', user: 'user-a' });

    await createBookmark(req, res);

    expect(Bookmark.create).toHaveBeenCalledWith({
      user: 'user-a',
      type: 'emoji',
      source: 'other',
      content: '😊',
      metadata: { emoji: '😊' },
      dedupeKey: expect.any(String),
      contentPreview: '😊',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('rejects malformed bookmark types before persistence', async () => {
    const res = response();
    await createBookmark({ userId: 'user-a', body: { type: 'favorites' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Bookmark.create).not.toHaveBeenCalled();
  });

  test('lists only the authenticated owner bookmarks with bounded pagination', async () => {
    const query = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn() };
    query.lean.mockResolvedValue([{ _id: 'bookmark-a', user: 'user-a', createdAt: new Date() }]);
    Bookmark.find.mockReturnValue(query);
    Bookmark.countDocuments.mockResolvedValue(1);
    const res = response();

    await getBookmarks({ userId: 'user-a', query: { page: '1', limit: '20' } }, res);

    expect(Bookmark.find).toHaveBeenCalledWith({ user: 'user-a' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ bookmarks: expect.any(Array), pagination: expect.objectContaining({ hasMore: false }) }));
  });

  test('supports favorite filtering and recent ordering contract', async () => {
    const query = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn() };
    query.lean.mockResolvedValue([]);
    Bookmark.find.mockReturnValue(query);
    Bookmark.countDocuments.mockResolvedValue(0);
    const res = response();

    await getBookmarks({ userId: 'user-a', query: { favorite: 'true', sort: 'recent' } }, res);

    expect(Bookmark.find).toHaveBeenCalledWith({ user: 'user-a', isFavorite: true });
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
  });

  test('supports server-side search and rejects invalid cursors', async () => {
    const query = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    Bookmark.find.mockReturnValue(query);
    const res = response();

    await getBookmarks({ userId: 'user-a', query: { search: 'नमस्ते', limit: '20' } }, res);
    expect(Bookmark.find).toHaveBeenCalledWith({ user: 'user-a', $text: { $search: 'नमस्ते' } });

    const invalid = response();
    await getBookmarks({ userId: 'user-a', query: { cursor: 'invalid!' } }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
  });

  test('rejects unsupported filters and abusive page sizes', async () => {
    const unsupported = response();
    await getBookmarks({ userId: 'user-a', query: { type: 'favorites' } }, unsupported);
    expect(unsupported.status).toHaveBeenCalledWith(400);

    const oversized = response();
    await getBookmarks({ userId: 'user-a', query: { limit: '101' } }, oversized);
    expect(oversized.status).toHaveBeenCalledWith(400);
    expect(Bookmark.find).not.toHaveBeenCalled();
  });

  test('prevents cross-user deletion through the ownership predicate', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Bookmark.findOneAndDelete.mockResolvedValue(null);
    const res = response();

    await deleteBookmark({ userId: 'user-b', params: { bookmarkId: id } }, res);

    expect(Bookmark.findOneAndDelete).toHaveBeenCalledWith({ _id: id, user: 'user-b' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('rejects malformed ids with a client error', async () => {
    const res = response();
    await deleteBookmark({ userId: 'user-a', params: { bookmarkId: 'not-an-id' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Bookmark.findOneAndDelete).not.toHaveBeenCalled();
  });

  test('prevents cross-user usage updates through the ownership predicate', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Bookmark.findOneAndUpdate.mockResolvedValue(null);
    const res = response();

    await incrementUsage({ userId: 'user-b', params: { bookmarkId: id } }, res);

    expect(Bookmark.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, user: 'user-b' },
      expect.objectContaining({ $inc: { usageCount: 1 } }),
      { new: true },
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updates favorite only for the authenticated owner', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Bookmark.findOneAndUpdate.mockResolvedValue({ _id: id, user: 'user-a', isFavorite: true });
    const res = response();

    await setFavorite({ userId: 'user-a', params: { bookmarkId: id }, body: { isFavorite: true } }, res);

    expect(Bookmark.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, user: 'user-a' },
      { $set: { isFavorite: true } },
      { new: true, runValidators: true },
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ bookmark: expect.any(Object) }));
  });

  test('rejects invalid favorite payloads and IDs', async () => {
    const invalidPayload = response();
    await setFavorite({ userId: 'user-a', params: { bookmarkId: new mongoose.Types.ObjectId().toString() }, body: { isFavorite: 'true' } }, invalidPayload);
    expect(invalidPayload.status).toHaveBeenCalledWith(400);

    const invalidId = response();
    await setFavorite({ userId: 'user-a', params: { bookmarkId: 'bad-id' }, body: { isFavorite: true } }, invalidId);
    expect(invalidId.status).toHaveBeenCalledWith(400);
  });
});
