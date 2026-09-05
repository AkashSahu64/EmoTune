const Bookmark = require('../models/Bookmark');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { bookmarkSchema } = require('../utils/validators');
const logger = require('../utils/logger');

const SUPPORTED_TYPES = new Set(['emoji', 'shayari', 'song', 'video', 'text', 'image']);
const MAX_PAGE_SIZE = 50;

const parsePagination = (page, limit) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  if (!Number.isInteger(parsedPage) || parsedPage < 1) return null;
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_PAGE_SIZE) return null;
  return { page: parsedPage, limit: parsedLimit };
};

const invalidObjectId = (value) => !mongoose.Types.ObjectId.isValid(value);

const encodeCursor = (bookmark) => Buffer.from(JSON.stringify({
  createdAt: bookmark.createdAt.toISOString(),
  id: String(bookmark._id),
}), 'utf8').toString('base64url');

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!value.createdAt || !mongoose.Types.ObjectId.isValid(value.id)) return null;
    const createdAt = new Date(value.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: value.id };
  } catch {
    return null;
  }
};

const previewFor = (value) => {
  const text = value.content || value.metadata?.shayari || value.metadata?.songTitle || value.metadata?.emoji || value.metadata?.videoQuery || '';
  return String(text).normalize().slice(0, 240);
};

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

const buildDedupeKey = ({ type, source, content, metadata = {} }) => crypto
  .createHash('sha256')
  .update(stableJson({
    type,
    source,
    content: String(content || '').trim(),
    originalMessageId: metadata.originalMessageId || '',
    sourceChatId: metadata.sourceChatId || '',
  }))
  .digest('hex');

const validateSourceReferences = async (metadata, userId) => {
  const sourceChatId = metadata?.sourceChatId;
  const originalMessageId = metadata?.originalMessageId;
  if (!sourceChatId && !originalMessageId) return true;

  const chatId = sourceChatId || (originalMessageId
    ? (await Message.findOne({ _id: originalMessageId }).select('chat').lean())?.chat
    : null);
  if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) return false;
  const chat = await Chat.findOne({ _id: chatId, 'participants.user': userId }).select('_id').lean();
  if (!chat) return false;
  if (originalMessageId) {
    const message = await Message.findOne({ _id: originalMessageId, chat: chatId }).select('_id').lean();
    if (!message) return false;
  }
  return true;
};

const syncMessageBookmarkState = async (bookmark, isBookmarked) => {
  const messageId = bookmark?.metadata?.originalMessageId;
  const chatId = bookmark?.metadata?.sourceChatId;
  if (!messageId || !chatId) return;
  try {
    await Message.updateOne(
      { _id: messageId, chat: chatId },
      { $set: { isBookmarked } },
    );
  } catch (error) {
    logger.warn('Bookmark/message state sync failed', {
      error: error.message,
      messageId: String(messageId),
      operation: isBookmarked ? 'create' : 'delete',
    });
  }
};

exports.createBookmark = async (req, res) => {
  try {
    const { error, value } = bookmarkSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const hasContent = String(value.content || '').trim().length > 0;
    const hasMetadata = Object.values(value.metadata || {}).some((item) => String(item || '').trim().length > 0);
    if (!hasContent && !hasMetadata) return res.status(400).json({ error: 'Bookmark content cannot be empty' });
    if (!(await validateSourceReferences(value.metadata, req.userId))) {
      return res.status(400).json({ error: 'Invalid or inaccessible bookmark source reference' });
    }

    const dedupeKey = buildDedupeKey(value);
    const duplicate = await Bookmark.findOne({ user: req.userId, dedupeKey }).lean();
    if (duplicate) return res.status(409).json({ error: 'Bookmark already saved', bookmark: duplicate });

    const bookmark = await Bookmark.create({
      user: req.userId,
      dedupeKey,
      contentPreview: previewFor(value),
      ...value,
    });

    await syncMessageBookmarkState(bookmark, true);

    res.status(201).json({ bookmark });
  } catch (err) {
    logger.error('Create bookmark error', { error: err.message });
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
};

exports.getBookmarks = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { type, source, favorite, search, sort = 'recent', cursor, limit = 20 } = req.query;
    const pagination = parsePagination(1, limit);
    if (!pagination) return res.status(400).json({ error: 'Invalid pagination values' });
    if (type && !SUPPORTED_TYPES.has(type)) return res.status(400).json({ error: 'Unsupported bookmark type' });
    if (source && !['ai', 'chat', 'user', 'system', 'other'].includes(source)) return res.status(400).json({ error: 'Unsupported bookmark source' });
    if (favorite !== undefined && favorite !== 'true' && favorite !== 'false') return res.status(400).json({ error: 'Invalid favorite filter' });
    if (sort !== 'recent') return res.status(400).json({ error: 'Unsupported bookmark sort' });
    if (search !== undefined && (typeof search !== 'string' || search.trim().length > 200)) return res.status(400).json({ error: 'Invalid search query' });
    if (cursor && !decodeCursor(cursor)) return res.status(400).json({ error: 'Invalid bookmark cursor' });
    const query = { user: req.userId };
    if (type) query.type = type;
    if (source) query.source = source;
    if (favorite !== undefined) query.isFavorite = favorite === 'true';
    if (search?.trim()) query.$text = { $search: search.trim() };
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query.$or = [
        { createdAt: { $lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
      ];
    }

    const rows = await Bookmark.find(query)
      .select('_id type source contentPreview isFavorite usageCount createdAt lastUsed metadata.emoji metadata.shayari metadata.songTitle metadata.songArtist metadata.videoQuery')
      .sort({ createdAt: -1, _id: -1 })
      .limit(pagination.limit + 1)
      .lean();
    const hasMore = rows.length > pagination.limit;
    const bookmarks = rows.slice(0, pagination.limit);
    res.json({
      bookmarks,
      pagination: {
        nextCursor: hasMore ? encodeCursor(bookmarks[bookmarks.length - 1]) : null,
        hasMore,
      },
    });
    logger.info('Bookmark list performance', { durationMs: Date.now() - startedAt, resultCount: bookmarks.length, hasSearch: Boolean(search?.trim()), hasCursor: Boolean(cursor) });
  } catch (err) {
    logger.error('List bookmarks error', { error: err.message, durationMs: Date.now() - startedAt });
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
};

exports.getBookmark = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { bookmarkId } = req.params;
    if (invalidObjectId(bookmarkId)) return res.status(400).json({ error: 'Invalid bookmark id' });
    const bookmark = await Bookmark.findOne({ _id: bookmarkId, user: req.userId }).lean();
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });
    res.json({ bookmark });
    logger.info('Bookmark detail performance', { durationMs: Date.now() - startedAt });
  } catch (err) {
    logger.error('Get bookmark error', { error: err.message, durationMs: Date.now() - startedAt });
    res.status(500).json({ error: 'Failed to fetch bookmark' });
  }
};

exports.deleteBookmark = async (req, res) => {
  try {
    const { bookmarkId } = req.params;
    if (invalidObjectId(bookmarkId)) return res.status(400).json({ error: 'Invalid bookmark id' });
    const bookmark = await Bookmark.findOneAndDelete({ _id: bookmarkId, user: req.userId });
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });

    const messageId = bookmark.metadata?.originalMessageId;
    const chatId = bookmark.metadata?.sourceChatId;
    if (messageId && chatId) {
      const remaining = await Bookmark.exists({
        user: req.userId,
        _id: { $ne: bookmarkId },
        'metadata.originalMessageId': messageId,
        'metadata.sourceChatId': chatId,
      });
      if (!remaining) await syncMessageBookmarkState(bookmark, false);
    }

    res.json({ message: 'Bookmark deleted' });
  } catch (err) {
    logger.error('Delete bookmark error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
};

exports.incrementUsage = async (req, res) => {
  try {
    const { bookmarkId } = req.params;
    if (invalidObjectId(bookmarkId)) return res.status(400).json({ error: 'Invalid bookmark id' });
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: bookmarkId, user: req.userId },
      { $inc: { usageCount: 1 }, lastUsed: new Date() },
      { new: true }
    );
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });

    res.json({ bookmark });
  } catch (err) {
    logger.error('Use bookmark error', { error: err.message });
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
};

exports.setFavorite = async (req, res) => {
  try {
    const { bookmarkId } = req.params;
    if (invalidObjectId(bookmarkId)) return res.status(400).json({ error: 'Invalid bookmark id' });
    if (typeof req.body?.isFavorite !== 'boolean') return res.status(400).json({ error: 'isFavorite must be boolean' });
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: bookmarkId, user: req.userId },
      { $set: { isFavorite: req.body.isFavorite } },
      { new: true, runValidators: true },
    );
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });
    res.json({ bookmark });
  } catch (err) {
    logger.error('Favorite bookmark error', { error: err.message });
    res.status(500).json({ error: 'Failed to update bookmark favorite state' });
  }
};
