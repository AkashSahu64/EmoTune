const { generateEmbedding } = require('../../ml/models/embeddingModel');
const { semanticSearch, triggerVerification } = require('../../ml/pipelines/memoryPipeline');
const { cosineSimilarity } = require('../../ml/services/vectorService');
const { encryptVector, decryptVector } = require('../../ml/utils/encryption');
const MemoryEmbedding = require('../models/MemoryEmbedding');
const logger = require('../utils/logger');

async function createMemoryEmbedding(message, chatId, senderId, text, password, options = {}) {
  try {
    const embedding = await generateEmbedding(text);
    const encrypted = encryptVector(embedding, password);

    const memoryEmbedding = await MemoryEmbedding.create({
      message: message._id,
      chat: chatId,
      sender: senderId,
      encryptedVector: encrypted.encrypted || encrypted.encryptedVector || JSON.stringify(embedding),
      iv: encrypted.iv || '',
      salt: encrypted.salt || '',
      textSnippet: text.slice(0, 200),
      messageType: message.type || 'text',
      metadata: {
        hasMedia: !!message.mediaUrl,
        mediaType: message.mediaType || '',
        intentLabels: options.intents || [],
        emotionTag: options.emotion || '',
      },
    });

    logger.info('Memory embedding created', { messageId: message._id });
    return memoryEmbedding;
  } catch (error) {
    logger.error('Failed to create memory embedding', { error: error.message });
    return null;
  }
}

async function searchSimilarMemories(chatId, query, userPassword, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const memories = await MemoryEmbedding.find({ chat: chatId, isVerified: { $ne: false } })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const memoriesWithVectors = memories
      .map((mem) => {
        const decrypted = decryptVector(mem.encryptedVector, userPassword, mem.iv, mem.salt, '');
        if (!decrypted) {
          try { return { ...mem.toObject(), vector: JSON.parse(mem.encryptedVector) }; } catch { return null; }
        }
        return { ...mem.toObject(), vector: decrypted };
      })
      .filter(Boolean);

    const results = await semanticSearch(query, memoriesWithVectors, { limit });

    return results.map((s) => ({
      id: s.id,
      text: s.text,
      sender: s.sender,
      score: s.score,
      isVerified: s.isVerified,
      verifiedBy: s.verifiedBy || [],
      createdAt: s.createdAt,
      messageType: s.metadata?.messageType || 'text',
      metadata: s.metadata || {},
    }));
  } catch (error) {
    logger.error('Memory search failed', { error: error.message });
    return [];
  }
}

module.exports = {
  createMemoryEmbedding,
  searchSimilarMemories,
  encryptVector,
  decryptVector,
  cosineSimilarity,
};
