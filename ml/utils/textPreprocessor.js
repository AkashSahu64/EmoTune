function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/<[^>]*>/g, '')
    .replace(/https?:\/\/\S+/g, '[URL]')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function detectLanguage(text) {
  if (!text) return 'unknown';

  const hindiPattern = /[\u0900-\u097F]/;
  const hasHindi = hindiPattern.test(text);

  if (hasHindi) {
    const hindiCount = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    const hindiRatio = hindiCount / totalChars;
    return hindiRatio > 0.3 ? 'hindi' : 'hinglish';
  }

  return 'english';
}

function truncateMessages(messages, maxTokens) {
  if (!messages || messages.length === 0) return [];
  const maxChars = maxTokens * 4;
  let totalChars = 0;
  const truncated = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = typeof messages[i] === 'string' ? messages[i] : (messages[i].content || '');
    const msgLen = msg.length;

    if (totalChars + msgLen > maxChars) {
      const remaining = maxChars - totalChars;
      if (remaining > 20) {
        truncated.unshift(msg.slice(0, remaining) + '...');
      }
      break;
    }

    truncated.unshift(msg);
    totalChars += msgLen;
  }

  return truncated;
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function splitIntoChunks(text, maxChunkSize = 2000) {
  if (!text) return [];
  if (text.length <= maxChunkSize) return [text];

  const chunks = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence.length > maxChunkSize
        ? sentence.slice(0, maxChunkSize)
        : sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

function removeEmojis(text) {
  if (!text) return '';
  return text.replace(/[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, '').trim();
}

function extractEmojis(text) {
  if (!text) return [];
  const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}]/gu;
  return text.match(emojiRegex) || [];
}

module.exports = {
  cleanText,
  detectLanguage,
  truncateMessages,
  estimateTokens,
  splitIntoChunks,
  removeEmojis,
  extractEmojis,
};
