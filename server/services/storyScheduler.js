const { Queue } = require('bullmq');
const { REDIS_URL } = require('../config/constants');

const connection = { url: REDIS_URL };
const storyScheduleQueue = new Queue('story-publication', { connection });

async function scheduleStoryPublication(storyId, publishAt) {
  const timestamp = new Date(publishAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) throw new Error('publishAt must be in the future');
  return storyScheduleQueue.add('publish-story', { storyId: storyId.toString() }, {
    jobId: `story-publication:${storyId}`,
    delay: timestamp - Date.now(),
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

async function cancelStoryPublication(storyId) {
  const job = await storyScheduleQueue.getJob(`story-publication:${storyId}`);
  if (job) await job.remove();
}

module.exports = { storyScheduleQueue, scheduleStoryPublication, cancelStoryPublication };
