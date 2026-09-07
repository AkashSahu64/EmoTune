const mongoose = require('mongoose');
const Sticker = require('../models/Sticker');
const logger = require('../utils/logger');
const {
  stickerCreateSchema,
  stickerUpdateSchema,
  validateEditorState,
  normalizeTags,
  normalizeObjectAssetIds,
  STICKER_ASSET_TYPES,
  EDITOR_LIMITS,
} = require('../utils/stickerValidators');
const {
  ownerScope,
  canViewSticker,
  publicProjection,
  isOwner,
} = require('../policies/stickerPolicy');
const {
  storeStickerUpload,
  applyObjectAssets,
  storeObjectAssets,
  reconcileObjectAssets,
  releaseAll,
  releaseStickerRecordAssets,
  discardTempFiles,
} = require('../services/stickerService');

const MAX_PAGE_SIZE = 50;
const MAX_STICKERS_PER_USER = 500;
const LIST_FIELDS = '_id title description tags thumbnailUrl assetUrl assetType mimeType width height duration '
  + 'visibility isFavorite usageCount source createdAt updatedAt lastUsed';
const SORTS = {
  recent: { createdAt: -1, _id: -1 },
  used: { lastUsed: -1, _id: -1 },
};

const invalidObjectId = (value) => !mongoose.Types.ObjectId.isValid(value);

const encodeCursor = (sticker, sort) => Buffer.from(JSON.stringify({
  key: sort === 'used' ? (sticker.lastUsed ? new Date(sticker.lastUsed).toISOString() : null) : new Date(sticker.createdAt).toISOString(),
  id: String(sticker._id),
}), 'utf8').toString('base64url');

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!mongoose.Types.ObjectId.isValid(value.id)) return null;
    if (value.key === null) return { key: null, id: value.id };
    const key = new Date(value.key);
    if (Number.isNaN(key.getTime())) return null;
    return { key, id: value.id };
  } catch {
    return null;
  }
};

// Every early rejection has to drop multer's scratch files, otherwise a
// rejected upload still consumes disk.
const reject = (res, files, status, error) => {
  discardTempFiles(files);
  return res.status(status).json({ error });
};

const warningsFor = (droppedAssets) => (droppedAssets
  ? [`${droppedAssets} image layer(s) referenced an untrusted URL and were cleared`]
  : []);

exports.createSticker = async (req, res) => {
  let committed = false;
  try {
    const { error, value } = stickerCreateSchema.validate(req.body || {}, { convert: true, stripUnknown: true });
    if (error) return reject(res, req.files, 400, error.details[0].message);

    const editorCheck = validateEditorState(value.editorState);
    if (!editorCheck.ok) return reject(res, req.files, editorCheck.status, editorCheck.error);

    const clientMutationId = value.clientMutationId || '';
    if (clientMutationId) {
      const existing = await Sticker.findOne({ user: req.userId, clientMutationId }).lean();
      if (existing) {
        discardTempFiles(req.files);
        return res.status(200).json({ sticker: existing, deduplicated: true });
      }
    }

    if (await Sticker.countDocuments({ user: req.userId }) >= MAX_STICKERS_PER_USER) {
      return reject(res, req.files, 409, 'Sticker library is full. Delete a sticker before saving a new one.');
    }

    const upload = await storeStickerUpload({
      files: req.files,
      objectAssetIds: normalizeObjectAssetIds(value.objectAssetIds),
      editorState: editorCheck.value,
    });
    if (!upload.ok) return res.status(upload.status || 400).json({ error: upload.error });
    committed = true;

    try {
      const sticker = await Sticker.create({
        user: req.userId,
        title: value.title,
        description: value.description,
        tags: normalizeTags(value.tags),
        assetUrl: upload.asset.url,
        assetPublicId: upload.asset.publicId,
        thumbnailUrl: upload.thumbnail.url,
        thumbnailPublicId: upload.thumbnail.publicId,
        assetType: upload.assetType,
        mimeType: upload.asset.mimeType,
        width: upload.dimensions.width,
        height: upload.dimensions.height,
        fileSize: upload.asset.fileSize,
        duration: upload.assetType === 'animated' ? value.duration : 0,
        editorVersion: EDITOR_LIMITS.version,
        editorState: upload.editorState,
        objectAssets: upload.objectAssets,
        source: value.source,
        visibility: value.visibility,
        clientMutationId,
      });
      logger.info('Sticker created', {
        userId: String(req.userId),
        stickerId: String(sticker._id),
        assetType: sticker.assetType,
        storage: upload.asset.storage,
        objectAssetCount: upload.objectAssets.length,
      });
      return res.status(201).json({ sticker, warnings: warningsFor(upload.droppedAssets) });
    } catch (dbError) {
      await releaseAll(upload.rollback);
      if (dbError?.code === 11000 && clientMutationId) {
        const existing = await Sticker.findOne({ user: req.userId, clientMutationId }).lean();
        if (existing) return res.status(200).json({ sticker: existing, deduplicated: true });
      }
      throw dbError;
    }
  } catch (err) {
    if (!committed) discardTempFiles(req.files);
    logger.error('Create sticker error', { error: err.message });
    return res.status(500).json({ error: 'Failed to save sticker' });
  }
};

exports.getStickers = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { favorite, search, assetType, sort = 'recent', cursor, limit = 24 } = req.query;
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_PAGE_SIZE) {
      return res.status(400).json({ error: 'Invalid pagination values' });
    }
    if (!SORTS[sort]) return res.status(400).json({ error: 'Unsupported sticker sort' });
    if (favorite !== undefined && favorite !== 'true' && favorite !== 'false') {
      return res.status(400).json({ error: 'Invalid favorite filter' });
    }
    if (assetType && !STICKER_ASSET_TYPES.includes(assetType)) {
      return res.status(400).json({ error: 'Unsupported sticker asset type' });
    }
    if (search !== undefined && (typeof search !== 'string' || search.trim().length > 200)) {
      return res.status(400).json({ error: 'Invalid search query' });
    }
    const decoded = decodeCursor(cursor);
    if (cursor && !decoded) return res.status(400).json({ error: 'Invalid sticker cursor' });

    // The owner filter is part of the query itself, never a post-filter.
    const query = ownerScope(req.userId);
    if (favorite !== undefined) query.isFavorite = favorite === 'true';
    if (assetType) query.assetType = assetType;
    if (search?.trim()) query.$text = { $search: search.trim() };
    if (sort === 'used') query.lastUsed = { $ne: null };
    if (decoded) {
      const field = sort === 'used' ? 'lastUsed' : 'createdAt';
      query.$and = [{
        $or: [
          { [field]: { $lt: decoded.key } },
          { [field]: decoded.key, _id: { $lt: new mongoose.Types.ObjectId(decoded.id) } },
        ],
      }];
    }

    const rows = await Sticker.find(query)
      .select(LIST_FIELDS)
      .sort(SORTS[sort])
      .limit(parsedLimit + 1)
      .lean();
    const hasMore = rows.length > parsedLimit;
    const stickers = rows.slice(0, parsedLimit);
    res.json({
      stickers,
      pagination: {
        nextCursor: hasMore ? encodeCursor(stickers[stickers.length - 1], sort) : null,
        hasMore,
      },
    });
    logger.info('Sticker list performance', {
      durationMs: Date.now() - startedAt,
      resultCount: stickers.length,
      hasSearch: Boolean(search?.trim()),
      hasCursor: Boolean(cursor),
      sort,
    });
  } catch (err) {
    logger.error('List stickers error', { error: err.message, durationMs: Date.now() - startedAt });
    res.status(500).json({ error: 'Failed to fetch stickers' });
  }
};

exports.getSticker = async (req, res) => {
  try {
    const { stickerId } = req.params;
    if (invalidObjectId(stickerId)) return res.status(400).json({ error: 'Invalid sticker id' });

    // Owner lookup first, and it is scoped by ownership. Only if that misses do
    // we consider the sticker as a shared `unlisted` read, which returns a
    // reduced projection that never includes the editable project.
    const owned = await Sticker.findOne(ownerScope(req.userId, stickerId)).lean();
    if (owned) return res.json({ sticker: owned, canEdit: true });

    const shared = await Sticker.findOne({ _id: stickerId, visibility: 'unlisted' }).lean();
    if (!shared || !canViewSticker(req.userId, shared)) return res.status(404).json({ error: 'Sticker not found' });
    return res.json({ sticker: publicProjection(shared), canEdit: false });
  } catch (err) {
    logger.error('Get sticker error', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch sticker' });
  }
};

// Resolves the editorState/object-asset side of an update. Returns either a
// rejection to pass through, or the final editorState plus the object-asset
// bookkeeping the record needs.
async function resolveUpdateAssets({ files, existing, editorState, objectAssetIds, hasEditorState }) {
  const hasNewAsset = Boolean(files?.asset);
  const objectFiles = files?.objectAssets || [];

  if (hasNewAsset) {
    const upload = await storeStickerUpload({ files, objectAssetIds, editorState });
    if (!upload.ok) return upload;
    const reconciled = reconcileObjectAssets(existing.objectAssets, upload.editorState, upload.objectAssets);
    return {
      ok: true,
      upload,
      editorState: upload.editorState,
      objectAssets: reconciled.objectAssets,
      orphaned: reconciled.orphaned,
      droppedAssets: upload.droppedAssets,
      rollback: upload.rollback,
      touchedEditorState: true,
    };
  }

  if (objectFiles.length) {
    const objectResult = await storeObjectAssets(objectFiles, objectAssetIds);
    if (!objectResult.ok) return objectResult;
    const rewrite = applyObjectAssets(editorState, objectResult.storedByObjectId);
    const reconciled = reconcileObjectAssets(existing.objectAssets, rewrite.editorState, rewrite.objectAssets);
    return {
      ok: true,
      editorState: rewrite.editorState,
      objectAssets: reconciled.objectAssets,
      orphaned: reconciled.orphaned,
      droppedAssets: rewrite.droppedAssets,
      rollback: objectResult.stored,
      touchedEditorState: true,
    };
  }

  if (hasEditorState) {
    // No new files: existing layer URLs are re-checked against the trust rules
    // and anything unreachable is dropped rather than stored.
    const rewrite = applyObjectAssets(editorState, new Map());
    const reconciled = reconcileObjectAssets(existing.objectAssets, rewrite.editorState, []);
    return {
      ok: true,
      editorState: rewrite.editorState,
      objectAssets: reconciled.objectAssets,
      orphaned: reconciled.orphaned,
      droppedAssets: rewrite.droppedAssets,
      rollback: [],
      touchedEditorState: true,
    };
  }

  return { ok: true, rollback: [], orphaned: [], droppedAssets: 0, touchedEditorState: false };
}

exports.updateSticker = async (req, res) => {
  let committed = false;
  try {
    const { stickerId } = req.params;
    if (invalidObjectId(stickerId)) return reject(res, req.files, 400, 'Invalid sticker id');
    // A re-export can legitimately carry files and no metadata at all, so the
    // "at least one field" rule only applies to body-only updates.
    const hasFiles = Boolean(req.files?.asset || req.files?.thumbnail || (req.files?.objectAssets || []).length);
    const schema = hasFiles ? stickerUpdateSchema.min(0) : stickerUpdateSchema;
    const { error, value } = schema.validate(req.body || {}, { convert: true, stripUnknown: true });
    if (error) return reject(res, req.files, 400, error.details[0].message);

    // Ownership is enforced by the query, so another user's sticker is simply
    // not found rather than "found but forbidden".
    const existing = await Sticker.findOne(ownerScope(req.userId, stickerId)).lean();
    if (!existing) return reject(res, req.files, 404, 'Sticker not found');

    const hasEditorState = value.editorState !== undefined;
    let editorState = existing.editorState;
    if (hasEditorState) {
      const check = validateEditorState(value.editorState);
      if (!check.ok) return reject(res, req.files, check.status, check.error);
      editorState = check.value;
    }

    const resolved = await resolveUpdateAssets({
      files: req.files,
      existing,
      editorState,
      objectAssetIds: normalizeObjectAssetIds(value.objectAssetIds),
      hasEditorState,
    });
    if (!resolved.ok) return res.status(resolved.status || 400).json({ error: resolved.error });
    committed = true;

    const update = {};
    if (value.title !== undefined) update.title = value.title;
    if (value.description !== undefined) update.description = value.description;
    if (value.tags !== undefined) update.tags = normalizeTags(value.tags);
    if (value.visibility !== undefined) update.visibility = value.visibility;
    if (resolved.touchedEditorState) {
      update.editorState = resolved.editorState;
      update.editorVersion = EDITOR_LIMITS.version;
      update.objectAssets = resolved.objectAssets;
    }
    if (resolved.upload) {
      update.assetUrl = resolved.upload.asset.url;
      update.assetPublicId = resolved.upload.asset.publicId;
      update.thumbnailUrl = resolved.upload.thumbnail.url;
      update.thumbnailPublicId = resolved.upload.thumbnail.publicId;
      update.assetType = resolved.upload.assetType;
      update.mimeType = resolved.upload.asset.mimeType;
      update.width = resolved.upload.dimensions.width;
      update.height = resolved.upload.dimensions.height;
      update.fileSize = resolved.upload.asset.fileSize;
      update.duration = resolved.upload.assetType === 'animated'
        ? (value.duration !== undefined ? value.duration : existing.duration)
        : 0;
    } else if (value.duration !== undefined && existing.assetType === 'animated') {
      update.duration = value.duration;
    }

    try {
      const sticker = await Sticker.findOneAndUpdate(
        ownerScope(req.userId, stickerId),
        { $set: update },
        { new: true, runValidators: true },
      );
      if (!sticker) {
        await releaseAll(resolved.rollback);
        return res.status(404).json({ error: 'Sticker not found' });
      }

      // Only after the record points at the new files do the superseded ones go.
      await releaseStickerRecordAssets({ objectAssets: resolved.orphaned });
      if (resolved.upload) {
        await releaseStickerRecordAssets({
          assetPublicId: existing.assetPublicId,
          thumbnailPublicId: existing.thumbnailPublicId,
          assetUrl: existing.assetUrl,
          thumbnailUrl: existing.thumbnailUrl,
        });
      }
      logger.info('Sticker updated', {
        userId: String(req.userId),
        stickerId: String(sticker._id),
        replacedAsset: Boolean(resolved.upload),
        releasedObjectAssets: resolved.orphaned.length,
      });
      return res.json({ sticker, warnings: warningsFor(resolved.droppedAssets) });
    } catch (dbError) {
      await releaseAll(resolved.rollback);
      throw dbError;
    }
  } catch (err) {
    if (!committed) discardTempFiles(req.files);
    logger.error('Update sticker error', { error: err.message });
    return res.status(500).json({ error: 'Failed to update sticker' });
  }
};

exports.deleteSticker = async (req, res) => {
  try {
    const { stickerId } = req.params;
    if (invalidObjectId(stickerId)) return res.status(400).json({ error: 'Invalid sticker id' });
    const sticker = await Sticker.findOneAndDelete(ownerScope(req.userId, stickerId));
    if (!sticker) return res.status(404).json({ error: 'Sticker not found' });

    await releaseStickerRecordAssets(sticker);
    logger.info('Sticker deleted', { userId: String(req.userId), stickerId: String(sticker._id) });
    return res.json({ message: 'Sticker deleted', stickerId: String(sticker._id) });
  } catch (err) {
    logger.error('Delete sticker error', { error: err.message });
    return res.status(500).json({ error: 'Failed to delete sticker' });
  }
};

exports.setFavorite = async (req, res) => {
  try {
    const { stickerId } = req.params;
    if (invalidObjectId(stickerId)) return res.status(400).json({ error: 'Invalid sticker id' });
    if (typeof req.body?.isFavorite !== 'boolean') return res.status(400).json({ error: 'isFavorite must be boolean' });
    const sticker = await Sticker.findOneAndUpdate(
      ownerScope(req.userId, stickerId),
      { $set: { isFavorite: req.body.isFavorite } },
      { new: true, runValidators: true },
    ).select(LIST_FIELDS);
    if (!sticker) return res.status(404).json({ error: 'Sticker not found' });
    return res.json({ sticker });
  } catch (err) {
    logger.error('Favorite sticker error', { error: err.message });
    return res.status(500).json({ error: 'Failed to update sticker favorite state' });
  }
};

exports.incrementUsage = async (req, res) => {
  try {
    const { stickerId } = req.params;
    if (invalidObjectId(stickerId)) return res.status(400).json({ error: 'Invalid sticker id' });
    const sticker = await Sticker.findOneAndUpdate(
      ownerScope(req.userId, stickerId),
      { $inc: { usageCount: 1 }, $set: { lastUsed: new Date() } },
      { new: true },
    ).select(LIST_FIELDS);
    if (!sticker) return res.status(404).json({ error: 'Sticker not found' });
    return res.json({ sticker });
  } catch (err) {
    logger.error('Use sticker error', { error: err.message });
    return res.status(500).json({ error: 'Failed to update sticker usage' });
  }
};

exports.__testing = { encodeCursor, decodeCursor, resolveUpdateAssets, isOwner };
