const { Queue, Worker } = require('bullmq');
const { REDIS_URL } = require('../config/constants');
const { detectClaim } = require('../../ml/pipelines/truthPipeline');
const { processClaimDetection } = require('../services/factCheckService');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const connection = { url: REDIS_URL };

const truthQueue = new Queue('truth-detection', { connection });

const truthWorker = new Worker('truth-detection', async (job) => {
  const { messageId, chatId, userId } = job.data;

  try {
    const message = await Message.findById(messageId);
    if (!message || !message.content) return;

    const result = await detectClaim(message.content);

    if (result.found && result.claim) {
      const claim = await processClaimDetection(
        messageId,
        chatId,
        userId,
        result.claim,
        result.category
      );

      message.truthClaimRef = claim._id;
      await message.save();

      logger.info('Claim detected and processed', { messageId, claim: result.claim });
    }
  } catch (error) {
    logger.error('Truth worker error', { messageId, error: error.message });
  }
}, { connection, concurrency: 5 });

truthWorker.on('completed', (job) => {
  logger.info(`Truth job ${job.id} completed`);
});

truthWorker.on('failed', (job, err) => {
  logger.error(`Truth job ${job.id} failed`, { error: err.message });
});

async function addTruthJob(data) {
  return truthQueue.add('detect-claim', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
  });
}

logger.info('Truth worker initialized');

module.exports = { truthQueue, truthWorker, addTruthJob };

if (require.main === module) {
  logger.info('Truth worker running in standalone mode');
}
