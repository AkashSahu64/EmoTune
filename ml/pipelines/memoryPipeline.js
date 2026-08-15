const { generateEmbedding } = require('../models/embeddingModel');
const { cosineSimilarity, normalizeVector } = require('../services/vectorService');
const { cleanText, truncateMessages } = require('../utils/textPreprocessor');
const constants = require('../config/constants');

async function generateMemoryEmbedding(messageText) {
  if (!messageText || !messageText.trim()) {
    throw new Error('Message text is required for embedding generation');
  }

  const cleaned = cleanText(messageText).slice(0, 8000);
  const embedding = await generateEmbedding(cleaned);
  return normalizeVector(embedding);
}

async function semanticSearch(query, storedMemories, options = {}) {
  const { limit = constants.MEMORY_SEARCH_LIMIT, minScore = 0.0 } = options;

  if (!query || !storedMemories || storedMemories.length === 0) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(query);
  const queryNormalized = normalizeVector(queryEmbedding);

  const scored = [];

  for (const memory of storedMemories) {
    let memoryVector;

    if (memory.vector) {
      memoryVector = memory.vector;
    } else if (memory.embedding) {
      memoryVector = memory.embedding;
    } else {
      continue;
    }

    const memoryNormalized = normalizeVector(memoryVector);
    const score = cosineSimilarity(queryNormalized, memoryNormalized);

    if (score >= minScore) {
      scored.push({
        id: memory.id || memory._id,
        text: memory.text || memory.textSnippet || '',
        sender: memory.sender || memory.senderId,
        score,
        isVerified: memory.isVerified || false,
        verifiedBy: memory.verifiedBy || [],
        createdAt: memory.createdAt,
        metadata: memory.metadata || {},
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

async function triggerVerification(memoryId, otherUserId, chatId, socketIO) {
  if (!socketIO) {
    console.warn('Memory verification: No Socket.IO instance provided, skipping emit');
    return { memoryId, otherUserId, status: 'pending', emitted: false };
  }

  try {
    socketIO.to(chatId).emit('memory:verifyRequest', {
      memoryId,
      requestedBy: otherUserId,
    });
    return { memoryId, otherUserId, status: 'pending', emitted: true };
  } catch (error) {
    console.error('Memory verification trigger error:', error.message);
    return { memoryId, otherUserId, status: 'error', emitted: false, error: error.message };
  }
}

module.exports = {
  generateMemoryEmbedding,
  semanticSearch,
  triggerVerification,
};
