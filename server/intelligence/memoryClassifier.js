const MEMORY_TYPES = {
  permanent: 'Critical info, never expire',
  temporary: 'Short-term, expire in 24h',
  important: 'Important info, expire in 30 days',
  event: 'Events (birthdays, meetings), expire after event + 7 days',
  relationship: 'Relationship info, never expire',
  preference: 'User likes/dislikes, expire in 90 days if unconfirmed',
  task: 'Action items, expire after 7 days or when completed',
  reminder: 'Reminders, expire at reminder time + 1 day',
  fact: 'Objective facts, never expire',
  question: 'Unanswered questions, expire in 7 days',
};

const TTL_MAP = {
  permanent: Infinity,
  temporary: 24 * 60 * 60 * 1000,
  important: 30 * 24 * 60 * 60 * 1000,
  event: 7 * 24 * 60 * 60 * 1000,
  relationship: Infinity,
  preference: 90 * 24 * 60 * 60 * 1000,
  task: 7 * 24 * 60 * 60 * 1000,
  reminder: 24 * 60 * 60 * 1000,
  fact: Infinity,
  question: 7 * 24 * 60 * 60 * 1000,
};

const PRIORITY_MAP = {
  permanent: 10,
  temporary: 2,
  important: 8,
  event: 7,
  relationship: 9,
  preference: 6,
  task: 8,
  reminder: 5,
  fact: 7,
  question: 4,
};

const TIME_PATTERNS = /\b(tomorrow|next\s+\w+|today|tonight|this\s+\w+|on\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?|in\s+\d+\s+(?:minutes?|hours?|days?|weeks?)|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

const NAME_PATTERN = /[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g;

const DATE_PATTERN = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

const PLACE_PATTERN = /\b(at|in)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;

const NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/g;

class MemoryClassifier {
  classifyMemory(message, context) {
    const text = message.text || message.content || message || '';

    const explicit = this._checkExplicitMarkers(text);
    if (explicit) {
      return {
        type: explicit.type,
        priority: PRIORITY_MAP[explicit.type],
        ttl: this.getTTL(explicit.type),
        reason: explicit.reason,
      };
    }

    if (this.isBirthday(text)) {
      return {
        type: 'event',
        priority: PRIORITY_MAP.event,
        ttl: this.getTTL('event'),
        reason: 'Birthday detected',
      };
    }

    if (this.isMeeting(text)) {
      return {
        type: 'event',
        priority: PRIORITY_MAP.event,
        ttl: this.getTTL('event'),
        reason: 'Meeting or plan detected',
      };
    }

    if (this.isQuestion(text)) {
      return {
        type: 'question',
        priority: PRIORITY_MAP.question,
        ttl: this.getTTL('question'),
        reason: 'Unanswered question detected',
      };
    }

    if (this.isTask(text)) {
      return {
        type: 'task',
        priority: PRIORITY_MAP.task,
        ttl: this.getTTL('task'),
        reason: 'Task or action item detected',
      };
    }

    if (this.isPreference(text)) {
      return {
        type: 'preference',
        priority: PRIORITY_MAP.preference,
        ttl: this.getTTL('preference'),
        reason: 'User preference detected',
      };
    }

    if (this.isFact(text)) {
      return {
        type: 'fact',
        priority: PRIORITY_MAP.fact,
        ttl: this.getTTL('fact'),
        reason: 'Factual statement detected',
      };
    }

    const hasTimeRef = TIME_PATTERNS.test(text);
    if (hasTimeRef) {
      return {
        type: 'temporary',
        priority: PRIORITY_MAP.temporary + 1,
        ttl: this.getTTL('temporary'),
        reason: 'Contains time reference, stored as temporary',
      };
    }

    return {
      type: 'temporary',
      priority: PRIORITY_MAP.temporary,
      ttl: this.getTTL('temporary'),
      reason: 'Casual chat, stored as temporary memory',
    };
  }

  _checkExplicitMarkers(text) {
    const lower = text.toLowerCase();

    if (/^important:/.test(lower) || /\bimportant:\s/.test(lower)) {
      return { type: 'important', reason: 'Explicit important marker detected' };
    }
    if (/\bdon'?t\s+forget\b/.test(lower) || /\bremember\s+that\b/.test(lower) || /\bkeep\s+in\s+mind\b/.test(lower)) {
      return { type: 'important', reason: 'Explicit remember/dont-forget marker detected' };
    }
    if (/\bremind\s+me\b/.test(lower) || /\bset\s+a\s+reminder\b/.test(lower)) {
      return { type: 'reminder', reason: 'Explicit reminder marker detected' };
    }
    if (/\b(?:never\s+)?forget\s+that\b/.test(lower) || /\bpromise\s+me\b/.test(lower)) {
      return { type: 'permanent', reason: 'Permanent memory marker detected' };
    }

    return null;
  }

  getTTL(memoryType) {
    return TTL_MAP[memoryType] || TTL_MAP.temporary;
  }

  extractKeyInfo(text) {
    const names = text.match(NAME_PATTERN) || [];
    const dates = text.match(DATE_PATTERN) || [];
    const places = [];
    let match;
    while ((match = PLACE_PATTERN.exec(text)) !== null) {
      places.push(match[2]);
    }
    const numbers = text.match(NUMBER_PATTERN) || [];

    return {
      names: [...new Set(names)],
      dates: [...new Set(dates)],
      places: [...new Set(places)],
      numbers: [...new Set(numbers)],
    };
  }

  isBirthday(text) {
    const lower = text.toLowerCase();
    return /\bbirthday\b/.test(lower) || /\bborn\s+on\b/.test(lower) || /\bturns?\s+\d+\b/.test(lower) || /\bcelebrate.*birth\b/.test(lower);
  }

  isMeeting(text) {
    const lower = text.toLowerCase();
    return /\b(?:meeting|appointment|meet\s+up|get\s+together|schedule|plan\s+to|let'?s\s+meet)\b/.test(lower) && TIME_PATTERNS.test(text);
  }

  isFact(text) {
    const lower = text.toLowerCase();
    return /^(?:the\s+\w+\s+is\s|it\s+is\s+\w+\s+that|did\s+you\s+know|actually\s+the|the\s+fact\s+is)/.test(lower) || /\bis\s+(?:the|a|an)\s+\w+\s+(?:that|which|who)\b/.test(lower);
  }

  isPreference(text) {
    const lower = text.toLowerCase();
    return /\bi\s+(?:like|love|hate|dislike|enjoy|prefer|adore|can'?t\s+stand|don'?t\s+like)\b/.test(lower) || /\bmy\s+favorite\b/.test(lower) || /\b(?:favourite|favorite)\s+\w+\s+is\b/.test(lower);
  }

  isTask(text) {
    const lower = text.toLowerCase();
    return /\bi\s+(?:need\s+to|have\s+to|must|should|will|gotta|wanna)\b/.test(lower) || /\b(?:remember\s+to|don'?t\s+forget\s+to|make\s+sure\s+to|we\s+should)\b/.test(lower);
  }

  isQuestion(text) {
    const lower = text.trim();
    if (!/\?$/.test(lower)) return false;
    const interrogatives = /\b(?:what|when|where|why|how|who|which|is|are|can|could|would|will|do|does|did|shall|should|may|might)\b/i;
    return interrogatives.test(lower);
  }
}

module.exports = MemoryClassifier;