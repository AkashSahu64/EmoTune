const RELATIONSHIP_TYPES = {
  UNKNOWN: 'unknown',
  FRIEND: 'friend',
  BEST_FRIEND: 'best_friend',
  FAMILY: 'family',
  SIBLING: 'sibling',
  PARENT: 'parent',
  TEACHER: 'teacher',
  BOSS: 'boss',
  COLLEAGUE: 'colleague',
  CLIENT: 'client',
  ROMANTIC: 'romantic',
  SPOUSE: 'spouse',
  EX: 'ex',
  ACQUAINTANCE: 'acquaintance',
};

const RELATIONSHIP_THRESHOLDS = {
  [RELATIONSHIP_TYPES.ACQUAINTANCE]: { minScore: 0, maxScore: 10 },
  [RELATIONSHIP_TYPES.FRIEND]: { minScore: 10, maxScore: 40 },
  [RELATIONSHIP_TYPES.BEST_FRIEND]: { minScore: 40, maxScore: 70 },
  [RELATIONSHIP_TYPES.ROMANTIC]: { minScore: 30, maxScore: 100 },
  [RELATIONSHIP_TYPES.FAMILY]: { minScore: 50, maxScore: 100 },
  [RELATIONSHIP_TYPES.SPOUSE]: { minScore: 70, maxScore: 100 },
  [RELATIONSHIP_TYPES.COLLEAGUE]: { minScore: 10, maxScore: 40 },
  [RELATIONSHIP_TYPES.BOSS]: { minScore: 5, maxScore: 30 },
};

const RELATION_INDICATORS = {
  friend: ['friend', 'buddy', 'pal', 'dude', 'bro', 'mate', 'lets hang', 'chill', 'fun', 'laugh'],
  best_friend: ['best friend', 'bff', 'soulmate', 'always there', 'trust', 'secret', 'childhood', 'grew up'],
  family: ['mom', 'dad', 'sister', 'brother', 'mother', 'father', 'parent', 'aunt', 'uncle', 'cousin', 'grandma', 'grandpa', 'nephew', 'niece'],
  romantic: ['love', 'boyfriend', 'girlfriend', 'bae', 'crush', 'date', 'kiss', 'hug', 'miss you', 'beautiful', 'handsome', 'relationship', 'together', 'romantic', 'sexy'],
  spouse: ['husband', 'wife', 'married', 'wedding', 'spouse', 'life partner', 'soulmate', 'forever', 'honey', 'darling'],
  colleague: ['colleague', 'coworker', 'team', 'meeting', 'project', 'work', 'office', 'deadline', 'presentation', 'report'],
  boss: ['boss', 'manager', 'supervisor', 'sir', 'maam', 'report', 'promotion', 'interview', 'deadline', 'official'],
  teacher: ['teacher', 'sir', 'maam', 'professor', 'lecturer', 'mentor', 'class', 'assignment', 'homework', 'exam'],
  client: ['client', 'customer', 'service', 'payment', 'contract', 'deal', 'agreement', 'invoice', 'quote'],
};

function detectRelationshipType(profile) {
  if (!profile) return RELATIONSHIP_TYPES.UNKNOWN;
  const { messages = [], emotionTimeline = [], topics = [], preferences = {} } = profile;
  if (preferences.relationshipType) return preferences.relationshipType;

  let score = 0;
  const indicators = {};

  for (const msg of messages) {
    const text = (msg?.text || msg || '').toLowerCase();
    for (const [type, keywords] of Object.entries(RELATION_INDICATORS)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          indicators[type] = (indicators[type] || 0) + 1;
        }
      }
    }
  }

  const totalMessages = messages.length || 1;
  const avgMessageLength = messages.reduce((s, m) => s + (m?.text || m || '').length, 0) / totalMessages;

  score += Math.min(20, totalMessages / 2);
  score += Math.min(10, avgMessageLength / 20);

  if (emotionTimeline?.length > 0) {
    const positive = emotionTimeline.filter(e => (e.weight || 4) > 4).length;
    score += (positive / emotionTimeline.length) * 10;
  }

  if (indicators.best_friend > 3) score += 30;
  else if (indicators.friend > 5) score += 20;
  if (indicators.romantic > 2) score += 25;
  if (indicators.spouse > 1) score += 20;
  if (indicators.family > 3) score += 15;
  if (indicators.colleague > 3) score += -5;
  if (indicators.boss > 2) score += -10;

  const typeByIndicator = () => {
    if (indicators.spouse >= 2) return RELATIONSHIP_TYPES.SPOUSE;
    if (indicators.romantic >= 3) return RELATIONSHIP_TYPES.ROMANTIC;
    if (indicators.best_friend >= 3) return RELATIONSHIP_TYPES.BEST_FRIEND;
    if (indicators.boss >= 2) return RELATIONSHIP_TYPES.BOSS;
    if (indicators.colleague >= 3) return RELATIONSHIP_TYPES.COLLEAGUE;
    if (indicators.teacher >= 2) return RELATIONSHIP_TYPES.TEACHER;
    if (indicators.family >= 3) return RELATIONSHIP_TYPES.FAMILY;
    if (indicators.friend >= 5) return RELATIONSHIP_TYPES.FRIEND;
    if (indicators.client >= 2) return RELATIONSHIP_TYPES.CLIENT;
    return null;
  };

  const indicatorType = typeByIndicator();

  if (indicatorType) return indicatorType;

  score = Math.max(0, Math.min(100, score));
  if (score >= 50) return RELATIONSHIP_TYPES.FRIEND;
  if (score >= 20) return RELATIONSHIP_TYPES.ACQUAINTANCE;
  return RELATIONSHIP_TYPES.UNKNOWN;
}

class RelationshipEngine {
  constructor() {
    this.TYPES = RELATIONSHIP_TYPES;
    this.THRESHOLDS = RELATIONSHIP_THRESHOLDS;
  }

  detect(profile) {
    const type = detectRelationshipType(profile);
    const score = this.calculateScore(profile);
    return {
      type,
      score,
      confidence: this.getConfidence(type, profile),
      progression: score,
      details: this.getDetails(type, score, profile),
    };
  }

  calculateScore(profile) {
    if (!profile) return 0;
    const { messages = [], emotionTimeline = [] } = profile;
    let score = 0;
    score += Math.min(30, messages.length);
    const avgLen = messages.reduce((s, m) => (s + (m?.text || m || '').length), 0) / (messages.length || 1);
    score += Math.min(15, avgLen / 15);
    if (emotionTimeline.length > 0) {
      const positive = emotionTimeline.filter(e => (e.weight || 4) > 5).length;
      score += (positive / emotionTimeline.length) * 20;
    }
    const indicators = {};
    for (const msg of messages) {
      const text = (msg?.text || msg || '').toLowerCase();
      for (const [type, keywords] of Object.entries(RELATION_INDICATORS)) {
        for (const kw of keywords) {
          if (text.includes(kw)) indicators[type] = (indicators[type] || 0) + 1;
        }
      }
    }
    if (indicators.romantic > 2) score += 15;
    if (indicators.best_friend > 2) score += 15;
    if (indicators.spouse > 2) score += 20;
    if (indicators.family > 3) score += 10;
    const recency = messages.length > 0 ? Math.min(15, 15 - (Date.now() - new Date(messages[messages.length - 1]?.timestamp || Date.now()).getTime()) / 86400000) : 0;
    score += Math.max(0, recency);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  getConfidence(type, profile) {
    if (type === RELATIONSHIP_TYPES.UNKNOWN) return 0;
    const { messages = [] } = profile || {};
    const msgCount = messages.length;
    if (msgCount < 5) return 0.3;
    if (msgCount < 20) return 0.5;
    if (msgCount < 50) return 0.7;
    if (msgCount < 100) return 0.85;
    return 0.95;
  }

  getDetails(type, score, profile) {
    return {
      type,
      score,
      messageCount: profile?.messages?.length || 0,
      lastActive: profile?.messages?.length > 0 ? profile.messages[profile.messages.length - 1]?.timestamp : null,
    };
  }

  getSuggestibleRelationships() {
    return [
      RELATIONSHIP_TYPES.FRIEND,
      RELATIONSHIP_TYPES.BEST_FRIEND,
      RELATIONSHIP_TYPES.ROMANTIC,
      RELATIONSHIP_TYPES.SPOUSE,
      RELATIONSHIP_TYPES.FAMILY,
    ];
  }

  shouldUseFormalLanguage(type) {
    return [RELATIONSHIP_TYPES.BOSS, RELATIONSHIP_TYPES.TEACHER, RELATIONSHIP_TYPES.CLIENT, RELATIONSHIP_TYPES.UNKNOWN].includes(type);
  }

  shouldUseRomanticSuggestions(type) {
    return [RELATIONSHIP_TYPES.ROMANTIC, RELATIONSHIP_TYPES.SPOUSE, RELATIONSHIP_TYPES.BEST_FRIEND].includes(type);
  }

  shouldUseCasualSuggestions(type) {
    return [RELATIONSHIP_TYPES.FRIEND, RELATIONSHIP_TYPES.BEST_FRIEND, RELATIONSHIP_TYPES.SIBLING, RELATIONSHIP_TYPES.FAMILY].includes(type);
  }
}

module.exports = new RelationshipEngine();
module.exports.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
module.exports.detectRelationshipType = detectRelationshipType;
