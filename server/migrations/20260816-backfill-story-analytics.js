/*
 * One-time, backwards-compatible migration.
 * Run after deploying StoryView/StoryReaction indexes and before removing any
 * legacy metadata arrays. Existing arrays are intentionally retained during
 * the compatibility window.
 */
const mongoose = require('mongoose');
const Story = require('../domain/models/Story');
const StoryView = require('../domain/models/StoryView');
const StoryReaction = require('../domain/models/StoryReaction');

async function migrate() {
  await StoryView.createIndexes();
  await StoryReaction.createIndexes();

  const cursor = Story.find({
    $or: [
      { 'metadata.viewDetails.0': { $exists: true } },
      { 'metadata.reactions.0': { $exists: true } },
    ],
  }).select('_id metadata').cursor();

  for await (const story of cursor) {
    const views = new Map();
    for (const view of story.metadata?.viewDetails || []) {
      if (view.user) views.set(view.user.toString(), view);
    }
    if (views.size) {
      await StoryView.bulkWrite([...views.values()].map((view) => ({
        updateOne: {
          filter: { story: story._id, user: view.user },
          update: { $setOnInsert: {
            story: story._id,
            user: view.user,
            startedAt: view.viewedAt || new Date(),
            duration: view.duration || 0,
            completed: Boolean(view.completed),
            completedAt: view.completed ? (view.viewedAt || new Date()) : undefined,
          } },
          upsert: true,
        },
      })));
    }

    const reactions = new Map();
    for (const reaction of story.metadata?.reactions || []) {
      if (reaction.user && reaction.emoji) reactions.set(reaction.user.toString(), reaction);
    }
    if (reactions.size) {
      await StoryReaction.bulkWrite([...reactions.values()].map((reaction) => ({
        updateOne: {
          filter: { story: story._id, user: reaction.user },
          update: { $setOnInsert: { story: story._id, user: reaction.user, emoji: reaction.emoji } },
          upsert: true,
        },
      })));
    }
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
