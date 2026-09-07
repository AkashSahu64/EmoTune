import api from './api';

// One place that knows how a sticker save is shaped on the wire. The server
// derives width/height/mimeType/assetType/ownership itself, so this only ever
// sends the rendered files, the editor project, and user-chosen metadata.
const MULTIPART = { 'Content-Type': 'multipart/form-data' };
const SAVE_TIMEOUT = 120000;

const appendIfPresent = (formData, key, value) => {
  if (value === undefined || value === null) return;
  formData.append(key, typeof value === 'string' ? value : String(value));
};

/**
 * Builds the multipart body for a create/update.
 *
 * `objectAssets` is a list of `{ objectId, file }`: each layer image is sent as
 * a file plus its editor object id at the same index, which is how the server
 * rewrites the saved project to point at server-owned URLs.
 */
export function buildStickerFormData({
  asset,
  thumbnail,
  objectAssets = [],
  editorState,
  title,
  description,
  tags,
  visibility,
  source,
  duration,
  clientMutationId,
} = {}) {
  const formData = new FormData();
  if (asset) formData.append('asset', asset, asset.name || 'sticker.png');
  if (thumbnail) formData.append('thumbnail', thumbnail, thumbnail.name || 'sticker-thumb.png');

  const pairs = objectAssets.filter((entry) => entry?.file && entry?.objectId).slice(0, 12);
  pairs.forEach(({ file, objectId }) => formData.append('objectAssets', file, file.name || `${objectId}.png`));
  if (pairs.length) formData.append('objectAssetIds', pairs.map((entry) => entry.objectId).join(','));

  if (editorState !== undefined && editorState !== null) {
    formData.append('editorState', typeof editorState === 'string' ? editorState : JSON.stringify(editorState));
  }
  appendIfPresent(formData, 'title', title);
  appendIfPresent(formData, 'description', description);
  appendIfPresent(formData, 'tags', Array.isArray(tags) ? tags.join(',') : tags);
  appendIfPresent(formData, 'visibility', visibility);
  appendIfPresent(formData, 'source', source);
  appendIfPresent(formData, 'duration', duration);
  appendIfPresent(formData, 'clientMutationId', clientMutationId);
  return formData;
}

const withProgress = (onProgress, signal) => ({
  headers: MULTIPART,
  timeout: SAVE_TIMEOUT,
  signal,
  onUploadProgress: onProgress
    ? (event) => onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0)
    : undefined,
});

const stickerService = {
  /** Persists a new sticker. Pass clientMutationId so a retry cannot duplicate it. */
  async create(payload, { onProgress, signal } = {}) {
    return (await api.post('/stickers', buildStickerFormData(payload), withProgress(onProgress, signal))).data;
  },

  /** Updates metadata, the editor project, or re-exported files - any subset. */
  async update(stickerId, payload, { onProgress, signal } = {}) {
    return (await api.patch(`/stickers/${stickerId}`, buildStickerFormData(payload), withProgress(onProgress, signal))).data;
  },

  /** Renames/retags without touching stored files. */
  async updateMetadata(stickerId, patch, { signal } = {}) {
    const body = { ...patch };
    if (Array.isArray(body.tags)) body.tags = body.tags.join(',');
    return (await api.patch(`/stickers/${stickerId}`, body, { signal })).data;
  },

  async list(params = {}, { signal } = {}) {
    return (await api.get('/stickers', { params, signal })).data;
  },

  async get(stickerId, { signal } = {}) {
    return (await api.get(`/stickers/${stickerId}`, { signal })).data;
  },

  async remove(stickerId) {
    return (await api.delete(`/stickers/${stickerId}`)).data;
  },

  async setFavorite(stickerId, isFavorite) {
    return (await api.patch(`/stickers/${stickerId}/favorite`, { isFavorite })).data;
  },

  /** Records a use so "recently used" ordering reflects reality. */
  async markUsed(stickerId) {
    return (await api.patch(`/stickers/${stickerId}/use`)).data;
  },
};

export default stickerService;
