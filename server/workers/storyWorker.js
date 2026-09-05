const { Worker } = require('bullmq');
const { REDIS_URL } = require('../config/constants');
const Story = require('../domain/models/Story');
const storyIntelligence = require('../intelligence/cil/StoryIntelligenceEngine');
const logger = require('../utils/logger');
const connectDB = require('../config/db');

const connection = { url: REDIS_URL };
const storyWorker = new Worker('story-publication', async (job) => {
  const { storyId } = job.data;
  const now = new Date();
  const story = await Story.findOneAndUpdate(
    { _id: storyId, isDraft: true, 'scheduling.status': 'scheduled', 'scheduling.scheduledAt': { $lte: now } },
    { $set: { isDraft: false, 'scheduling.status': 'published', 'scheduling.isScheduled': false, 'scheduling.publishedAt': now, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
    { new: true },
  );
  if (!story) return { skipped: true };
  await storyIntelligence.invalidateStoryCaches();
  storyIntelligence.emitStoryCreated(story);
  logger.info('Scheduled Story published', { storyId });
  return { published: true };
}, { connection, concurrency: 2 });

storyWorker.on('failed', (job, error) => logger.error('Scheduled Story job failed', { jobId: job?.id, error: error.message }));

module.exports = { storyWorker };

if (require.main === module) {
  connectDB().then(() => logger.info('Story publication worker running'))
    .catch((error) => { logger.error('Story publication worker startup failed', { error: error.message }); process.exit(1); });
}
