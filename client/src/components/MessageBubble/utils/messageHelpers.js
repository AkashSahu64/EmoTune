import { AUDIO_TYPES, CHROMELESS_TYPES, FILE_TYPES, MEDIA_FILE_PATTERN, MEDIA_TYPES } from './constants';

export function getMessageType(message) {
  return String(message?.type || 'text').toLowerCase();
}

export function getSenderName(message) {
  return message?.sender?.username || message?.senderName || 'Unknown';
}

export function getSenderAvatar(message) {
  return message?.sender?.avatar || '';
}

export function getMediaCaption(message) {
  const content = String(message?.content || '').trim();
  if (!content || content.toUpperCase() === 'GIF' || MEDIA_FILE_PATTERN.test(content)) return '';
  return content;
}

export function getFileName(message) {
  return message?.metadata?.fileName || message?.content || 'File';
}

export function getReplySummary(reply) {
  if (!reply) return '';
  const type = getMessageType(reply);
  if (reply.content && !MEDIA_FILE_PATTERN.test(reply.content)) return reply.content;
  if (reply.metadata?.emoji) return reply.metadata.emoji;
  const labels = { image: 'Photo', video: 'Video', gif: 'GIF', audio: 'Audio', voice: 'Voice message', sticker: 'Sticker', file: 'File', document: 'Document', location: 'Location', contact: 'Contact', poll: 'Poll', song: 'Song' };
  return labels[type] || 'Original message';
}

export function getReplyMediaType(reply) {
  const type = getMessageType(reply);
  return [...MEDIA_TYPES, ...AUDIO_TYPES, ...FILE_TYPES].includes(type) ? type : '';
}

export function isMessageDeleted(message, userId) {
  return message?.deletedFor?.some((entry) => String(entry?._id || entry) === String(userId) || entry === 'hidden');
}

export function getBubbleVariant(type) {
  if (CHROMELESS_TYPES.has(type)) return 'chromeless';
  if (MEDIA_TYPES.has(type)) return 'media';
  if (AUDIO_TYPES.has(type)) return 'audio';
  if (FILE_TYPES.has(type)) return 'document';
  return 'default';
}
