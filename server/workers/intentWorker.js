const { Queue, Worker } = require('bullmq');
const { REDIS_URL } = require('../config/constants');
const { classifyIntent } = require('../../ml/pipelines/intentPipeline');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const connection = { url: REDIS_URL };

const intentQueue = new Queue('intent-classification', { connection });

const intentWorker = new Worker('intent-classification', async (job) => {
  const { messageId } = job.data;

  try {
    const message = await Message.findById(messageId);
    if (!message || !message.content) return;

    const intents = await classifyIntent(message.content);

    message.intents = intents;
    await message.save();

    logger.info('Intent classified', { messageId, intents });
  } catch (error) {
    logger.error('Intent worker error', { messageId, error: error.message });
  }
}, { connection, concurrency: 10 });

intentWorker.on('completed', (job) => {
  logger.info(`Intent job ${job.id} completed`);
});

intentWorker.on('failed', (job, err) => {
  logger.error(`Intent job ${job.id} failed`, { error: err.message });
});

async function addIntentJob(data) {
  return intentQueue.add('classify-intent', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
    delay: 2000,
  });
}

logger.info('Intent worker initialized');

module.exports = { intentQueue, intentWorker, addIntentJob };

if (require.main === module) {
  logger.info('Intent worker running in standalone mode');
}
