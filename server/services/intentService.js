const { classifyIntent } = require('../../ml/pipelines/intentPipeline');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const FILTER_INTENTS = new Set([
  'all',
  'unread',
  'task',
  'question',
  'idea',
  'important',
  'reminder',
  'ai',
  'memory',
  'pinned',
  'mentions',
]);

function getMessageFilterQuery(chatId, userId, filter = 'all') {
  if (!FILTER_INTENTS.has(filter)) {
    const error = new Error(`Unsupported message filter: ${filter}`);
    error.code = 'UNSUPPORTED_MESSAGE_FILTER';
    throw error;
  }

  const query = {
    chat: chatId,
    deletedFor: { $ne: userId },
  };

  switch (filter) {
    case 'unread':
      query.readBy = { $ne: userId };
      query.sender = { $ne: userId };
      break;
    case 'ai':
      query.personaUsed = { $nin: [null, ''] };
      break;
    case 'pinned':
      query.isPinned = true;
      break;
    case 'mentions':
      query['mentions.user'] = userId;
      break;
    case 'important':
      query.$or = [
        { intents: 'important' },
        { isAnnouncement: true },
      ];
      break;
    case 'memory':
      query.intents = 'memory';
      break;
    case 'all':
      break;
    default:
      query.intents = filter;
      break;
  }

  return query;
}

async function classifyMessageIntent(messageId) {
  try {
    const message = await Message.findById(messageId);
    if (!message || !message.content) return [];

    const intents = await classifyIntent(message.content);

    message.intents = intents;
    await message.save();

    logger.info('Intent classified', { messageId, intents });
    return intents;
  } catch (error) {
    logger.error('Intent classification failed', { messageId, error: error.message });
    return [];
  }
}

async function getMessagesByIntent(chatId, intent, page = 1, limit = 50) {
  const query = getMessageFilterQuery(chatId, null, intent || 'all');
  delete query.deletedFor;

  const messages = await Message.find(query)
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Message.countDocuments(query);

  return { messages, total, page, totalPages: Math.ceil(total / limit) };
}

async function getUnreadIntentCounts(chatId, userId) {
  const filters = [
    'unread',
    'task',
    'question',
    'idea',
    'important',
    'reminder',
    'ai',
    'memory',
    'pinned',
    'mentions',
  ];
  const counts = {};

  for (const filter of filters) {
    const query = getMessageFilterQuery(chatId, userId, filter);
    if (filter !== 'unread') query.readBy = { $ne: userId };
    counts[filter] = await Message.countDocuments(query);
  }

  counts.all = counts.unread;
  return counts;
}

module.exports = {
  classifyMessageIntent,
  getMessagesByIntent,
  getUnreadIntentCounts,
  getMessageFilterQuery,
  FILTER_INTENTS,
};
