const TOPIC_KEYWORDS = {
  work: ['work', 'job', 'office', 'boss', 'meeting', 'deadline', 'project', 'colleague', 'salary', 'promotion', 'career', 'interview', 'resign', 'hire', 'fired', 'business', 'startup', 'client'],
  school: ['school', 'college', 'university', 'exam', 'study', 'homework', 'class', 'teacher', 'student', 'grade', 'semester', 'assignment', 'lecture', 'course', 'degree', 'graduation'],
  relationships: ['girlfriend', 'boyfriend', 'husband', 'wife', 'partner', 'love', 'dating', 'relationship', 'breakup', 'crush', 'propose', 'marriage', 'wedding', 'divorce', 'single', 'together'],
  family: ['mother', 'father', 'mom', 'dad', 'sister', 'brother', 'parent', 'child', 'baby', 'son', 'daughter', 'grandma', 'grandpa', 'aunt', 'uncle', 'cousin', 'family'],
  health: ['health', 'sick', 'ill', 'doctor', 'hospital', 'medicine', 'fever', 'cold', 'pain', 'injury', 'recovery', 'workout', 'gym', 'diet', 'sleep', 'mental health', 'therapy', 'anxiety', 'depression'],
  food: ['food', 'eat', 'dinner', 'lunch', 'breakfast', 'restaurant', 'cook', 'recipe', 'hungry', 'delicious', 'tasty', 'coffee', 'tea', 'drink', 'fruit', 'vegetable', 'chocolate', 'pizza'],
  travel: ['travel', 'trip', 'vacation', 'holiday', 'visit', 'destination', 'flight', 'hotel', 'beach', 'mountain', 'journey', 'tour', 'booking', 'passport', 'visa', 'roadtrip', 'adventure'],
  movies: ['movie', 'film', 'cinema', 'theatre', 'netflix', 'series', 'show', 'episode', 'watch', 'actor', 'actress', 'director', 'trailer', 'review', 'hollywood', 'bollywood'],
  music: ['music', 'song', 'album', 'artist', 'singer', 'concert', 'gig', 'playlist', 'spotify', 'youtube', 'listen', 'melody', 'beat', 'lyrics', 'genre', 'dance'],
  sports: ['sport', 'game', 'match', 'team', 'player', 'score', 'win', 'lose', 'champion', 'tournament', 'football', 'cricket', 'basketball', 'tennis', 'soccer', 'fitness'],
  technology: ['tech', 'computer', 'phone', 'app', 'software', 'update', 'download', 'bug', 'code', 'programming', 'device', 'gadget', 'internet', 'wifi', 'battery', 'charger', 'laptop'],
  finance: ['money', 'bank', 'loan', 'payment', 'budget', 'expense', 'bill', 'rent', 'saving', 'investment', 'crypto', 'stock', 'tax', 'insurance', 'credit', 'debit', 'cash'],
  education: ['learn', 'course', 'training', 'skill', 'knowledge', 'book', 'read', 'library', 'research', 'science', 'history', 'math', 'english', 'language', 'tutorial', 'guide'],
  shopping: ['shop', 'buy', 'purchase', 'order', 'delivery', 'product', 'price', 'sale', 'discount', 'offer', 'cart', 'wishlist', 'brand', 'store', 'online', 'amazon', 'flipkart'],
  gaming: ['game', 'gaming', 'play', 'player', 'level', 'quest', 'multiplayer', 'online', 'console', 'pc', 'xbox', 'playstation', 'nintendo', 'steam', 'minecraft', 'fortnite'],
  politics: ['politics', 'government', 'election', 'vote', 'party', 'minister', 'president', 'law', 'policy', 'protest', 'rights', 'democracy', 'country', 'nation', 'leader'],
  celebration: ['party', 'birthday', 'anniversary', 'celebration', 'festival', 'diwali', 'holi', 'christmas', 'new year', 'eid', 'pongal', 'dussehra', 'rakhi', 'gift', 'surprise'],
};

const TOPIC_CATEGORIES = Object.keys(TOPIC_KEYWORDS);

function extractTopics(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const found = [];
  for (const category of TOPIC_CATEGORIES) {
    const keywords = TOPIC_KEYWORDS[category];
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) found.push({ topic: category, score, matched: score });
  }
  found.sort((a, b) => b.score - a.score);
  return found.slice(0, 3);
}

class TopicEvolution {
  constructor(maxTopics = 30) {
    this.maxTopics = maxTopics;
  }

  addMessage(topics, message) {
    if (!topics) topics = [];
    const extracted = extractTopics(message.text || message);
    for (const et of extracted) {
      const existing = topics.find(t => t.topic === et.topic);
      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
        existing.score = Math.min(100, existing.score + (et.score * 5));
      } else {
        topics.push({
          topic: et.topic,
          count: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          score: et.score * 10,
        });
      }
    }
    topics.sort((a, b) => b.score - a.score);
    if (topics.length > this.maxTopics) topics.length = this.maxTopics;
    return { topics, extracted };
  }

  getCurrentTopic(topics) {
    if (!topics?.length) return 'general';
    return topics[0].topic;
  }

  getTopicHistory(topics) {
    if (!topics?.length) return [];
    return topics.map(t => ({
      topic: t.topic,
      frequency: t.count,
      score: t.score,
      lastActive: t.lastSeen,
    }));
  }

  detectTopicChange(topics) {
    if (!topics?.length || topics.length < 2) return false;
    const sorted = [...topics].sort((a, b) => b.lastSeen - a.lastSeen);
    if (sorted.length >= 2) {
      const latest = sorted[0];
      const prev = sorted[1];
      if (latest.topic !== prev.topic) return { from: prev.topic, to: latest.topic };
    }
    return false;
  }

  isNewTopic(topics, message) {
    const extracted = extractTopics(message.text || message);
    for (const et of extracted) {
      if (!topics.find(t => t.topic === et.topic)) return et.topic;
    }
    return null;
  }

  getTopicTrend(topics) {
    if (!topics?.length) return 'no_topics';
    const now = Date.now();
    const hour = 3600000;
    const recent = topics.filter(t => now - t.lastSeen < 24 * hour);
    if (recent.length === 0) return 'inactive';
    const growing = recent.filter(t => t.score > 50 && t.count > 5);
    if (growing.length >= 3) return 'diversifying';
    if (growing.length === 1) return 'focused';
    if (recent.length <= 2) return 'emerging';
    return 'stable';
  }

  getTopicImportance(topic, topics) {
    const t = topics?.find(t => t.topic === topic);
    if (!t) return 0;
    const recency = Math.max(0, 1 - (Date.now() - t.lastSeen) / (7 * 86400000));
    const frequency = Math.min(1, t.count / 20);
    return Math.round(((recency * 0.4 + frequency * 0.6)) * 100);
  }
}

module.exports = new TopicEvolution();
module.exports.extractTopics = extractTopics;
