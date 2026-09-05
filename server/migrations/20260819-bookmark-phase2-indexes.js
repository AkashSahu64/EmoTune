/*
 * Backwards-compatible Phase 2 migration.
 * Run this against the intended environment after reviewing index build cost.
 * It does not delete duplicates or create a unique constraint.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');
const Bookmark = require('../models/Bookmark');

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

const previewFor = (bookmark) => String(
  bookmark.content
  || bookmark.metadata?.shayari
  || bookmark.metadata?.songTitle
  || bookmark.metadata?.emoji
  || bookmark.metadata?.videoQuery
  || '',
).normalize().slice(0, 240);

const dedupeKeyFor = (bookmark) => crypto
  .createHash('sha256')
  .update(stableJson({
    type: bookmark.type,
    source: bookmark.source || 'other',
    content: String(bookmark.content || '').trim(),
    originalMessageId: bookmark.metadata?.originalMessageId || '',
    sourceChatId: bookmark.metadata?.sourceChatId || '',
  }))
  .digest('hex');

async function migrate() {
  await Bookmark.createIndexes();
  const cursor = Bookmark.find({
    $or: [
      { source: { $exists: false } },
      { isFavorite: { $exists: false } },
      { contentPreview: { $exists: false } },
      { dedupeKey: { $exists: false } },
    ],
  }).lean().cursor();
  for await (const bookmark of cursor) {
    const set = {};
    if (!bookmark.source) set.source = 'other';
    if (typeof bookmark.isFavorite !== 'boolean') set.isFavorite = false;
    if (typeof bookmark.contentPreview !== 'string') set.contentPreview = previewFor(bookmark);
    if (!bookmark.dedupeKey) set.dedupeKey = dedupeKeyFor(bookmark);
    if (Object.keys(set).length) await Bookmark.updateOne({ _id: bookmark._id }, { $set: set });
  }
}

if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(migrate)
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error(error);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = migrate;
