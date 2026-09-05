const Chat = require('../models/Chat');
const User = require('../models/User');

const PUBLIC_AUDIENCES = new Set(['public', 'friends', 'close_friends', 'custom', 'private']);

function idOf(value) {
  return value?._id?.toString?.() || value?.toString?.() || '';
}

function isStoryActive(story, now = new Date()) {
  if (!story || story.isArchived || story.isDraft) return false;
  if (story.deletedAt) return false;
  return !story.expiresAt || new Date(story.expiresAt) > now;
}

function isBlocked(user, otherUserId) {
  return (user?.preferences?.privacy?.blockedUsers || [])
    .some((id) => idOf(id) === idOf(otherUserId));
}

async function hasDirectRelationship(userId, ownerId) {
  if (!userId || !ownerId || userId === ownerId) return false;
  const chat = await Chat.findOne({
    type: 'direct',
    participants: {
      $all: [
        { $elemMatch: { user: userId, leftAt: { $exists: false } } },
        { $elemMatch: { user: ownerId, leftAt: { $exists: false } } },
      ],
    },
  }).select('_id').lean();
  return Boolean(chat);
}

async function loadPolicyUsers(userId, ownerId, story) {
  const users = await User.find({ _id: { $in: [userId, ownerId] } })
    .select('preferences.privacy.blockedUsers')
    .lean();
  return {
    viewer: users.find((u) => idOf(u._id) === userId),
    owner: users.find((u) => idOf(u._id) === ownerId) || story?.user,
  };
}

async function canViewStory(userId, story) {
  const viewerId = idOf(userId);
  const ownerId = idOf(story?.user);
  if (!viewerId || !ownerId || !isStoryActive(story)) return false;
  if (viewerId === ownerId) return true;

  const { viewer, owner } = await loadPolicyUsers(viewerId, ownerId, story);
  if (isBlocked(viewer, ownerId) || isBlocked(owner, viewerId)) return false;

  const audience = story.audience || { type: 'public' };
  const type = PUBLIC_AUDIENCES.has(audience.type) ? audience.type : 'private';
  const excluded = (audience.excludedUsers || []).some((id) => idOf(id) === viewerId);
  if (excluded) return false;
  if (type === 'private') return false;
  if (type === 'custom') {
    return (audience.allowedUsers || []).some((id) => idOf(id) === viewerId);
  }
  if (type === 'close_friends' || type === 'friends') {
    return hasDirectRelationship(viewerId, ownerId);
  }
  return type === 'public';
}

async function canInteractWithStory(userId, story) {
  return canViewStory(userId, story);
}

function canDeleteStory(userId, story) {
  return Boolean(story && idOf(story.user) === idOf(userId));
}

function canViewStoryAnalytics(userId, story) {
  return Boolean(story && isStoryActive(story) && idOf(story.user) === idOf(userId));
}

module.exports = {
  isStoryActive,
  canViewStory,
  canInteractWithStory,
  canReplyToStory: canInteractWithStory,
  canReactToStory: canInteractWithStory,
  canDeleteStory,
  canViewStoryAnalytics,
  hasDirectRelationship,
};
