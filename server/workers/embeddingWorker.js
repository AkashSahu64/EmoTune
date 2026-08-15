const { Queue, Worker } = require('bullmq');
const { REDIS_URL } = require('../config/constants');
const { createMemoryEmbedding } = require('../services/embeddingService');
const { generateMemoryEmbedding } = require('../../ml/pipelines/memoryPipeline');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

const connection = { url: REDIS_URL };

const embeddingQueue = new Queue('memory-embeddings', { connection });

const embeddingWorker = new Worker('memory-embeddings', async (job) => {
  const { messageId, chatId, senderId, text, userId } = job.data;

  try {
    const user = await User.findById(userId || senderId).select('+encryptionKey');
    const password = user?.encryptionKey || userId?.toString() || senderId.toString();

    const message = await Message.findById(messageId);
    if (!message) return;

    await createMemoryEmbedding(message, chatId, senderId, text, password);
    logger.info('Embedding created for message', { messageId });
  } catch (error) {
    logger.error('Embedding worker error', { messageId, error: error.message });
  }
}, { connection, concurrency: 5 });

embeddingWorker.on('completed', (job) => {
  logger.info(`Embedding job ${job.id} completed`);
});

embeddingWorker.on('failed', (job, err) => {
  logger.error(`Embedding job ${job.id} failed`, { error: err.message });
});

async function addEmbeddingJob(data) {
  return embeddingQueue.add('create-embedding', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

logger.info('Embedding worker initialized');

module.exports = { embeddingQueue, embeddingWorker, addEmbeddingJob };

if (require.main === module) {
  logger.info('Embedding worker running in standalone mode');
}
