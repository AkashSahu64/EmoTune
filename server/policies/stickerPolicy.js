// Every private sticker operation is scoped by ownership at the query level.
// These helpers exist so a route can never accidentally reach a sticker by id
// alone: `ownerScope` is the only shape the controller passes to Mongoose.

function idOf(value) {
  return value?._id?.toString?.() || value?.toString?.() || '';
}

// The canonical filter for every owner-only read and write.
function ownerScope(userId, stickerId) {
  return stickerId ? { _id: stickerId, user: userId } : { user: userId };
}

function isOwner(userId, sticker) {
  return Boolean(userId && sticker && idOf(sticker.user) === idOf(userId));
}

// Reads are owner-only unless the sticker was explicitly published as
// `unlisted`, in which case an authenticated viewer who knows the id may see
// the rendered asset — never the editable project (see PUBLIC_READ_FIELDS).
function canViewSticker(userId, sticker) {
  if (!sticker) return false;
  if (isOwner(userId, sticker)) return true;
  return Boolean(userId) && sticker.visibility === 'unlisted';
}

const canUpdateSticker = isOwner;
const canDeleteSticker = isOwner;
const canFavoriteSticker = isOwner;

// Using a sticker (send to a chat, attach to a story) only needs view rights,
// but usage counters are only bumped on stickers the caller owns.
function canUseSticker(userId, sticker) {
  return canViewSticker(userId, sticker);
}

// Fields a non-owner is allowed to receive. `editorState` is deliberately
// absent: the project JSON is private even when the rendered asset is not.
const PUBLIC_READ_FIELDS = Object.freeze([
  '_id', 'title', 'description', 'tags', 'assetUrl', 'thumbnailUrl', 'assetType',
  'mimeType', 'width', 'height', 'duration', 'visibility', 'createdAt', 'updatedAt',
]);

function publicProjection(sticker) {
  if (!sticker) return null;
  const source = typeof sticker.toObject === 'function' ? sticker.toObject() : sticker;
  return PUBLIC_READ_FIELDS.reduce((accumulator, field) => {
    if (source[field] !== undefined) accumulator[field] = source[field];
    return accumulator;
  }, {});
}

module.exports = {
  idOf,
  ownerScope,
  isOwner,
  canViewSticker,
  canUpdateSticker,
  canDeleteSticker,
  canFavoriteSticker,
  canUseSticker,
  publicProjection,
  PUBLIC_READ_FIELDS,
};
