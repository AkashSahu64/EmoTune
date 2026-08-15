const mongoose = require('mongoose');
const MemoryEmbedding = require('../models/MemoryEmbedding');
const MemoryClassifier = require('../intelligence/memoryClassifier');

const memoryClassificationSchema = new mongoose.Schema({
  memory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemoryEmbedding',
    required: true,
  },
  memoryType: {
    type: String,
    enum: ['permanent', 'temporary', 'important', 'event', 'relationship', 'preference', 'task', 'reminder', 'fact', 'question'],
    required: true,
  },
  priority: { type: Number, min: 1, max: 10, required: true },
  ttl: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  reason: { type: String },
  extended: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date },
}, {
  timestamps: true,
});

memoryClassificationSchema.index({ 'memory': 1 });
memoryClassificationSchema.index({ memoryType: 1 });
memoryClassificationSchema.index({ expiresAt: 1 });
memoryClassificationSchema.index({ archived: 1 });
memoryClassificationSchema.index({ 'memory': 1, memoryType: 1 });

const MemoryClassification = mongoose.model('MemoryClassification', memoryClassificationSchema);

const classifier = new MemoryClassifier();

function classifyAndStore(message, context) {
  const classification = classifier.classifyMemory(message, context);

  let memoryDoc;
  const now = new Date();
  let expiresAt;

  if (classification.ttl === Infinity) {
    expiresAt = new Date('2999-12-31T23:59:59Z');
  } else {
    expiresAt = new Date(now.getTime() + classification.ttl);
  }

  const memoryId = message._id || message;

  const metaUpdate = {};
  metaUpdate['metadata.memoryType'] = classification.type;

  return MemoryEmbedding.findByIdAndUpdate(
    memoryId,
    { $set: metaUpdate },
    { new: true }
  ).then((mem) => {
    memoryDoc = mem || { _id: memoryId };
    return MemoryClassification.findOneAndUpdate(
      { memory: memoryId },
      {
        memory: memoryId,
        memoryType: classification.type,
        priority: classification.priority,
        ttl: classification.ttl,
        expiresAt,
        reason: classification.reason,
        archived: false,
        archivedAt: null,
      },
      { upsert: true, new: true }
    );
  }).then((classificationDoc) => ({
    memory: memoryDoc,
    classification: classificationDoc,
  }));
}

function getMemoriesByType(userId, type) {
  return MemoryClassification.aggregate([
    { $match: { memoryType: type, archived: false } },
    {
      $lookup: {
        from: 'memoryembeddings',
        localField: 'memory',
        foreignField: '_id',
        as: 'memory',
      },
    },
    { $unwind: '$memory' },
    { $match: { 'memory.sender': userId } },
    { $sort: { priority: -1, createdAt: -1 } },
  ]);
}

function getImportantMemories(userId) {
  return MemoryClassification.aggregate([
    { $match: { memoryType: { $in: ['permanent', 'important', 'fact', 'relationship'] }, archived: false } },
    {
      $lookup: {
        from: 'memoryembeddings',
        localField: 'memory',
        foreignField: '_id',
        as: 'memory',
      },
    },
    { $unwind: '$memory' },
    { $match: { 'memory.sender': userId } },
    { $sort: { priority: -1, createdAt: -1 } },
  ]);
}

function getExpiredMemories() {
  const now = new Date();
  return MemoryClassification.find({
    expiresAt: { $lte: now },
    archived: false,
  }).populate('memory');
}

function archiveMemory(memoryId) {
  return MemoryClassification.findOneAndUpdate(
    { memory: memoryId },
    { archived: true, archivedAt: new Date() },
    { new: true }
  );
}

function runExpiryCheck() {
  return getExpiredMemories().then((expired) => {
    const updates = expired.map((doc) =>
      MemoryClassification.findByIdAndUpdate(doc._id, { archived: true, archivedAt: new Date() }, { new: true })
    );
    return Promise.all(updates);
  });
}

function extendMemory(memoryId, extensionMs) {
  const now = new Date();
  return MemoryClassification.findOne({ memory: memoryId, archived: false }).then((doc) => {
    if (!doc) {
      return null;
    }

    const currentExpiry = doc.expiresAt.getTime();
    const newExpiry = new Date(currentExpiry + extensionMs);

    return MemoryClassification.findByIdAndUpdate(
      doc._id,
      { expiresAt: newExpiry, $inc: { extended: 1 } },
      { new: true }
    ).then(() => {
      const ttlDoc = MemoryEmbedding.findByIdAndUpdate(memoryId, { $set: { 'metadata.extended': true } }, { new: true });
      return ttlDoc;
    });
  });
}

module.exports = {
  classifyAndStore,
  getMemoriesByType,
  getImportantMemories,
  getExpiredMemories,
  archiveMemory,
  runExpiryCheck,
  extendMemory,
};