const fs = require('fs');
const path = require('path');
const { validateMediaFile } = require('./mediaValidationService');
const { uploadMedia, deleteMedia } = require('./cloudinaryService');
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const CLOUDINARY_FOLDER = 'emotune/stickers';
const DEFAULT_TRUSTED_HOSTS = ['res.cloudinary.com'];
const MAX_OBJECT_ASSETS = 12;

function cloudinaryEnabled() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME);
}

function trustedHosts() {
  const configured = String(process.env.STICKER_REMOTE_ASSET_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_TRUSTED_HOSTS, ...configured]);
}

// A stored editorState may only reference assets this server vouches for: its
// own /uploads path, or a delivery host on the allowlist. Anything else is
// dropped instead of persisted, so reopening a saved project can never make a
// browser fetch an attacker-chosen URL.
function isTrustedAssetUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  if (value.startsWith('/uploads/')) return !value.includes('..');
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return trustedHosts().has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function removeTempFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

function toFileList(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat().filter(Boolean);
}

// Called on every exit path so a rejected request never leaves multer's
// scratch files behind in server/uploads.
function discardTempFiles(files) {
  toFileList(files).forEach((file) => removeTempFile(file?.path));
}

function nextPublicId(prefix) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
}

// Validates one uploaded file against a media profile and puts it in permanent
// storage. Returns the validator's own { ok:false, status, error } on rejection
// so callers can pass the status straight through to the response.
async function storeAsset(file, profileName, prefix) {
  const validation = await validateMediaFile(file, profileName);
  if (!validation.ok) {
    removeTempFile(file?.path);
    return validation;
  }

  const descriptor = {
    mimeType: file.mimetype,
    fileSize: file.size || 0,
    width: validation.width || 0,
    height: validation.height || 0,
    format: validation.format,
    category: validation.category,
  };

  if (cloudinaryEnabled()) {
    try {
      const result = await uploadMedia(file.path, {
        folder: CLOUDINARY_FOLDER,
        public_id: nextPublicId(prefix),
        resource_type: validation.category === 'image' ? 'image' : 'video',
      });
      removeTempFile(file.path);
      return { ok: true, stored: { ...descriptor, url: result.secure_url, publicId: result.public_id, storage: 'cloudinary' } };
    } catch (error) {
      logger.warn('Sticker asset upload fell back to local storage', { error: error.message, profile: profileName });
    }
  }

  // Local fallback keeps multer's file exactly where the static /uploads route
  // already serves it, so localPath must survive until rollback says otherwise.
  return { ok: true, stored: { ...descriptor, url: `/uploads/${file.filename}`, publicId: '', storage: 'local', localPath: file.path } };
}

async function releaseStored(stored) {
  if (!stored) return;
  if (stored.storage === 'cloudinary' && stored.publicId) {
    await deleteMedia(stored.publicId);
    return;
  }
  if (stored.storage === 'local' && stored.localPath) removeTempFile(stored.localPath);
}

// Rollback for the "upload succeeded but the DB write failed" case: nothing is
// left orphaned in Cloudinary or on disk.
async function releaseAll(list = []) {
  for (const stored of list.filter(Boolean)) {
    await releaseStored(stored);
  }
}

function eachImageObject(editorState, visit) {
  (editorState?.objects || []).forEach((object) => {
    if (object?.type === 'image') visit(object);
    (object?.children || []).forEach((child) => {
      if (child?.type === 'image') visit(child);
    });
  });
}

// Rewrites every image layer to a server-owned URL. Freshly uploaded object
// assets win; already-trusted URLs are kept; everything else is cleared and
// flagged so the editor shows a "missing asset" placeholder on reopen.
function applyObjectAssets(editorState, storedByObjectId = new Map()) {
  if (!editorState) return { editorState, droppedAssets: 0, objectAssets: [] };
  let droppedAssets = 0;
  const objectAssets = [];

  eachImageObject(editorState, (object) => {
    const stored = storedByObjectId.get(object.id);
    if (stored) {
      object.src = stored.url;
      object.sourceType = 'remote';
      object.assetUnavailable = false;
      delete object.assetId;
      objectAssets.push({ objectId: object.id, url: stored.url, publicId: stored.publicId || '' });
      return;
    }
    if (isTrustedAssetUrl(object.src)) {
      object.sourceType = 'remote';
      object.assetUnavailable = false;
      return;
    }
    if (object.src) droppedAssets += 1;
    delete object.src;
    delete object.assetId;
    object.sourceType = 'remote';
    object.assetUnavailable = true;
  });

  return { editorState, droppedAssets, objectAssets };
}

// Uploads the per-layer source images that make a saved sticker re-editable.
// ids[i] is the editor object id that files[i] belongs to.
async function storeObjectAssets(files = [], ids = []) {
  const list = toFileList(files).slice(0, MAX_OBJECT_ASSETS);
  const stored = [];
  const storedByObjectId = new Map();

  for (let index = 0; index < list.length; index += 1) {
    const objectId = ids[index];
    if (!objectId) {
      removeTempFile(list[index]?.path);
      continue;
    }
    const result = await storeAsset(list[index], 'stickerObjectAsset', 'sticker_layer');
    if (!result.ok) {
      discardTempFiles(list.slice(index + 1));
      await releaseAll(stored);
      return result;
    }
    stored.push(result.stored);
    storedByObjectId.set(objectId, result.stored);
  }

  return { ok: true, stored, storedByObjectId };
}

// Dimensions are always server-derived: parsed from the asset bytes when the
// format allows it, otherwise taken from the already-validated canvas size.
// The client's claimed width/height is never used.
function deriveDimensions({ asset, thumbnail, editorState }) {
  if (asset?.width && asset?.height) return { width: asset.width, height: asset.height };
  const canvas = editorState?.canvas;
  if (canvas?.width && canvas?.height) return { width: canvas.width, height: canvas.height };
  if (thumbnail?.width && thumbnail?.height) return { width: thumbnail.width, height: thumbnail.height };
  return { width: 512, height: 512 };
}

function firstFile(files, field) {
  const value = files?.[field];
  return Array.isArray(value) ? value[0] : value || null;
}

// Stores an entire sticker upload as one unit. Any failure releases everything
// already stored, so a half-written sticker never leaves orphaned assets.
async function storeStickerUpload({ files, objectAssetIds = [], editorState = null }) {
  const assetFile = firstFile(files, 'asset');
  const thumbnailFile = firstFile(files, 'thumbnail');
  const objectFiles = toFileList(files?.objectAssets);

  if (!assetFile) {
    discardTempFiles(files);
    return { ok: false, status: 400, error: 'Sticker asset file is required' };
  }

  const assetResult = await storeAsset(assetFile, 'stickerAsset', 'sticker');
  if (!assetResult.ok) {
    discardTempFiles([thumbnailFile, ...objectFiles]);
    return assetResult;
  }

  if (assetResult.stored.category !== 'image' && !thumbnailFile) {
    discardTempFiles(objectFiles);
    await releaseAll([assetResult.stored]);
    return { ok: false, status: 400, error: 'Animated stickers require a thumbnail image' };
  }

  let thumbnailStored = null;
  if (thumbnailFile) {
    const thumbnailResult = await storeAsset(thumbnailFile, 'stickerThumbnail', 'sticker_thumb');
    if (!thumbnailResult.ok) {
      discardTempFiles(objectFiles);
      await releaseAll([assetResult.stored]);
      return thumbnailResult;
    }
    thumbnailStored = thumbnailResult.stored;
  }

  const objectResult = await storeObjectAssets(objectFiles, objectAssetIds);
  if (!objectResult.ok) {
    await releaseAll([assetResult.stored, thumbnailStored]);
    return objectResult;
  }

  const rewrite = applyObjectAssets(editorState, objectResult.storedByObjectId);

  return {
    ok: true,
    asset: assetResult.stored,
    thumbnail: thumbnailStored || assetResult.stored,
    objectAssets: rewrite.objectAssets,
    editorState: rewrite.editorState,
    droppedAssets: rewrite.droppedAssets,
    dimensions: deriveDimensions({ asset: assetResult.stored, thumbnail: thumbnailStored, editorState }),
    assetType: assetResult.stored.category === 'image' ? 'static' : 'animated',
    rollback: [assetResult.stored, thumbnailStored, ...objectResult.stored].filter(Boolean),
  };
}

// Removes the stored files behind a sticker record once it is deleted, or the
// superseded files after an update replaced them.
async function releaseStickerRecordAssets(sticker) {
  if (!sticker) return;
  const ids = new Set([sticker.assetPublicId, sticker.thumbnailPublicId,
    ...(sticker.objectAssets || []).map((entry) => entry?.publicId)].filter(Boolean));
  for (const publicId of ids) {
    await deleteMedia(publicId);
  }
  const localUrls = new Set([sticker.assetUrl, sticker.thumbnailUrl, ...(sticker.objectAssets || []).map((entry) => entry?.url)]
    .filter((url) => typeof url === 'string' && url.startsWith('/uploads/') && !url.includes('..')));
  localUrls.forEach((url) => removeTempFile(path.join(UPLOAD_DIR, path.basename(url))));
}

function collectImageSources(editorState) {
  const sources = new Set();
  eachImageObject(editorState, (object) => {
    if (object?.src) sources.add(object.src);
  });
  return sources;
}

// On update, layer assets the new editorState no longer references become
// orphans. They are returned so the caller can free the storage instead of
// paying for files nothing can reach.
function reconcileObjectAssets(previous = [], editorState, added = []) {
  const used = collectImageSources(editorState);
  const retained = previous.filter((entry) => entry?.url && used.has(entry.url));
  const retainedUrls = new Set(retained.map((entry) => entry.url));
  const orphaned = previous.filter((entry) => !entry?.url || !retainedUrls.has(entry.url));
  const byUrl = new Map();
  [...retained, ...added].forEach((entry) => byUrl.set(entry.url, entry));
  return { objectAssets: [...byUrl.values()], orphaned };
}

module.exports = {
  isTrustedAssetUrl,
  discardTempFiles,
  storeAsset,
  storeObjectAssets,
  applyObjectAssets,
  collectImageSources,
  reconcileObjectAssets,
  deriveDimensions,
  storeStickerUpload,
  releaseStored,
  releaseAll,
  releaseStickerRecordAssets,
};
