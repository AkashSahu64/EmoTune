const ConversationDNA = require('../models/ConversationDNA');

class ConversationDNAEngine {
  constructor() {
    this.SAMPLE_SIZE = 50;
    this.MIN_CONFIDENCE_MESSAGES = 20;
    this.UPDATE_BATCH_SIZE = 5;
  }

  async getDNA(userId) {
    let dna = await ConversationDNA.findOne({ user: userId });
    if (!dna) {
      dna = await ConversationDNA.create({ user: userId, 'metadata.firstMessageAt': new Date() });
    }
    return dna;
  }

  async analyzeMessage(message, userId) {
    const dna = await this.getDNA(userId);
    const text = message.content || '';
    const type = message.type || 'text';
    const timestamp = message.createdAt || new Date();

    this._analyzeLanguage(text, dna);
    this._analyzeWritingStyle(text, dna);
    this._analyzeContentPreferences(text, type, message, dna);
    this._analyzeBehavioralPatterns(timestamp, text, dna);
    this._updateMetadata(dna, timestamp);

    dna.metadata.lastUpdated = new Date();
    dna.metadata.updateCount += 1;

    await dna.save();
    return dna;
  }

  async analyzeMessageBatch(messages, userId) {
    const dna = await this.getDNA(userId);
    for (const message of messages) {
      const text = message.content || '';
      const type = message.type || 'text';
      const timestamp = message.createdAt || new Date();
      this._analyzeLanguage(text, dna);
      this._analyzeWritingStyle(text, dna);
      this._analyzeContentPreferences(text, type, message, dna);
      this._analyzeBehavioralPatterns(timestamp, text, dna);
    }
    this._recalculateDerivedScores(dna);
    dna.metadata.lastUpdated = new Date();
    dna.metadata.updateCount += messages.length;
    await dna.save();
    return dna;
  }

  _analyzeLanguage(text, dna) {
    if (!text) return;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = text.length || 1;

    if (devanagariChars / totalChars > 0.3) {
      this._incrementScore(dna.language, 'secondary', 'hi', 1);
      dna.language.primary = 'hi';
    } else {
      this._incrementScore(dna.language, 'primary', 'en', 1);
    }
    dna.language.confidence = Math.min(1, dna.language.confidence + 0.01);
  }

  _analyzeWritingStyle(text, dna) {
    if (!text) return;
    const ws = dna.writingStyle;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const charCount = text.length;

    if (ws.avgMessageLength === 0) ws.avgMessageLength = charCount;
    else ws.avgMessageLength = (ws.avgMessageLength * 0.9 + charCount * 0.1);

    if (ws.emojiDensity === 0) ws.emojiDensity = 0;
    const emojiCount = (text.match(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu) || []).length;
    ws.emojiDensity = ws.emojiDensity * 0.95 + (emojiCount / Math.max(wordCount, 1)) * 0.05;

    const hasQuestions = text.includes('?');
    ws.questionFrequency = ws.questionFrequency * 0.98 + (hasQuestions ? 0.02 : 0);

    const lower = text.toLowerCase();
    const formalWords = ['please', 'would', 'could', 'appreciate', 'regarding', 'kindly', 'respectfully', 'sincerely'];
    const casualWords = ['yeah', 'nah', 'gonna', 'wanna', 'gotta', 'cool', 'awesome', 'dude', 'bro', 'lol', 'haha', 'omg'];
    const humorWords = ['lol', 'haha', '😂', '🤣', 'lmao', 'rofl', 'funny', 'hilarious', 'joke'];
    const sarcasmWords = ['obviously', 'sure', 'right', 'clearly', 'totally', 'of course'];
    const kindnessWords = ['please', 'thanks', 'thank', 'bless', 'kind', 'sweet', 'lovely', 'beautiful'];
    const positivityWords = ['great', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'beautiful', 'perfect'];
    const creativityWords = ['imagine', 'what if', 'maybe', 'perhaps', 'could be', 'dream', 'idea', 'creative'];
    const professionalWords = ['meeting', 'project', 'deadline', 'budget', 'strategy', 'report', 'analysis', 'proposal'];
    const romanticWords = ['love', 'heart', 'miss', 'kiss', 'hug', 'darling', 'sweet', 'beautiful', 'cute', 'dear'];

    const countMatches = (words) => words.filter(w => lower.includes(w)).length;
    const totalWordScore = wordCount + 1;

    ws.formalScore = ws.formalScore * 0.95 + (countMatches(formalWords) / totalWordScore) * 0.05;
    ws.casualScore = ws.casualScore * 0.95 + (countMatches(casualWords) / totalWordScore) * 0.05;
    ws.humorScore = ws.humorScore * 0.95 + (countMatches(humorWords) / totalWordScore) * 0.05;
    ws.sarcasmScore = ws.sarcasmScore * 0.98 + (countMatches(sarcasmWords) / totalWordScore) * 0.02;
    ws.kindnessScore = ws.kindnessScore * 0.95 + (countMatches(kindnessWords) / totalWordScore) * 0.05;
    ws.positivityScore = ws.positivityScore * 0.95 + (countMatches(positivityWords) / totalWordScore) * 0.05;
    ws.creativityScore = ws.creativityScore * 0.98 + (countMatches(creativityWords) / totalWordScore) * 0.02;
    ws.professionalScore = ws.professionalScore * 0.95 + (countMatches(professionalWords) / totalWordScore) * 0.05;
    ws.romanticScore = ws.romanticScore * 0.98 + (countMatches(romanticWords) / totalWordScore) * 0.02;

    Object.keys({
      formalScore: 0, casualScore: 0, humorScore: 0, sarcasmScore: 0,
      kindnessScore: 0, positivityScore: 0, creativityScore: 0,
      professionalScore: 0, romanticScore: 0,
    }).forEach(k => {
      ws[k] = Math.max(0, Math.min(1, ws[k]));
    });

    ws.emojiFrequency = ws.emojiFrequency * 0.98 + (emojiCount > 0 ? 0.02 : 0);

    if (charCount < 20) ws.preferredReplyLength = 'short';
    else if (charCount < 80) ws.preferredReplyLength = 'medium';
    else if (charCount < 200) ws.preferredReplyLength = 'long';
    else ws.preferredReplyLength = 'mixed';

    if (text.startsWith('hey') || text.startsWith('hi') || text.startsWith('hello') || text.startsWith('yo')) {
      ws.greetingStyle = 'casual';
    } else if (text.startsWith('dear') || text.startsWith('hello') || text.startsWith('greetings')) {
      ws.greetingStyle = 'formal';
    }

    ws.confidence = Math.min(1, ws.confidence + 0.005);
  }

  _analyzeContentPreferences(text, type, message, dna) {
    const cp = dna.contentPreferences;

    const emojis = text.match(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}]/gu);
    if (emojis) {
      for (const emoji of emojis) {
        this._incrementFavorite(cp.favoriteEmojis, 'emoji', emoji);
        this._incrementMapItem(cp.topEmojis, 'emoji', emoji);
      }
    }

    if (type === 'gif' && message.metadata?.gifQuery) {
      this._incrementFavorite(cp.favoriteGifCategories, 'query', message.metadata.gifQuery);
    }

    if (type === 'sticker') {
      this._incrementFavorite(cp.favoriteStickers, 'sticker', message.metadata?.stickerId || 'unknown');
    }

    if (type === 'song') {
      const title = message.metadata?.songTitle || 'unknown';
      const artist = message.metadata?.songArtist || '';
      this._incrementFavorite(cp.favoriteSongs, 'song', `${title} - ${artist}`);
    }

    if (type === 'video') {
      this._incrementFavorite(cp.favoriteVideos, 'query', message.metadata?.videoQuery || 'unknown');
    }

    if (type === 'shayari') {
      this._incrementFavorite(cp.favoriteShayaris, 'shayari', text.slice(0, 100));
    }

    const topics = this._extractTopics(text);
    for (const topic of topics) {
      this._incrementFavorite(cp.favoriteTopics, 'topic', topic);
    }
  }

  _analyzeBehavioralPatterns(timestamp, text, dna) {
    const bp = dna.behavioralPatterns;
    const hour = new Date(timestamp).getHours();

    if (!bp.activeHours.includes(hour)) bp.activeHours.push(hour);
    if (bp.activeHours.length > 50) bp.activeHours = bp.activeHours.slice(-50);

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (bp.messageCount === 0) {
      bp.typingSpeed = wordCount;
      bp.avgReplyDelay = 0;
    } else {
      bp.typingSpeed = bp.typingSpeed * 0.9 + wordCount * 0.1;
    }
    bp.messageCount += 1;

    if (hour >= 5 && hour < 12) bp.morningActivity += 1;
    else if (hour >= 12 && hour < 17) bp.afternoonActivity += 1;
    else if (hour >= 17 && hour < 21) bp.eveningActivity += 1;
    else bp.nightActivity += 1;

    const dayOfWeek = new Date(timestamp).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const total = bp.weekendRatio + bp.weekdayRatio;
    if (total > 0) {
      if (isWeekend) bp.weekendRatio = (bp.weekendRatio * 0.95 + 0.05);
      else bp.weekdayRatio = (bp.weekdayRatio * 0.95 + 0.05);
      const sum = bp.weekendRatio + bp.weekdayRatio;
      bp.weekendRatio /= sum;
      bp.weekdayRatio /= sum;
    }

    this._updateTimeBucket(dna, hour, text);
    this._updateConversationRhythm(dna);
  }

  _updateTimeBucket(dna, hour, text) {
    const bucket = dna.behavioralPatterns.timeBuckets.find(b => b.hour === hour);
    const charLen = text.length;
    if (bucket) {
      bucket.messageCount += 1;
      bucket.avgLength = (bucket.avgLength * (bucket.messageCount - 1) + charLen) / bucket.messageCount;
    } else {
      dna.behavioralPatterns.timeBuckets.push({
        hour,
        messageCount: 1,
        avgLength: charLen,
        topEmotions: [],
      });
      if (dna.behavioralPatterns.timeBuckets.length > 48) {
        dna.behavioralPatterns.timeBuckets.sort((a, b) => b.messageCount - a.messageCount);
        dna.behavioralPatterns.timeBuckets = dna.behavioralPatterns.timeBuckets.slice(0, 48);
      }
    }
  }

  _updateConversationRhythm(dna) {
    const { messageCount, avgReplyDelay } = dna.behavioralPatterns;
    if (messageCount < 5) return;
    if (avgReplyDelay < 30000) dna.behavioralPatterns.conversationRhythm = 'fast_responsive';
    else if (avgReplyDelay < 120000) dna.behavioralPatterns.conversationRhythm = 'moderate';
    else if (avgReplyDelay < 600000) dna.behavioralPatterns.conversationRhythm = 'slow_thoughtful';
    else dna.behavioralPatterns.conversationRhythm = 'irregular';
  }

  _updateMetadata(dna, timestamp) {
    const meta = dna.metadata;
    meta.totalMessages += 1;
    if (!meta.firstMessageAt) meta.firstMessageAt = timestamp;
    meta.lastMessageAt = timestamp;
  }

  _incrementScore(obj, key, value, amount) {
    if (!obj) return;
    if (obj[key] === undefined) obj[key] = value;
  }

  _incrementFavorite(arr, key, value) {
    const existing = arr.find(item => item.value === value);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = new Date();
    } else {
      arr.push({ [key]: key, value, count: 1, lastUsed: new Date() });
    }
    arr.sort((a, b) => b.count - a.count);
    if (arr.length > 20) arr.length = 20;
  }

  _incrementMapItem(arr, key, value) {
    const existing = arr.find(item => item[key] === value);
    if (existing) existing.count += 1;
    else arr.push({ [key]: value, count: 1 });
    arr.sort((a, b) => b.count - a.count);
    if (arr.length > 15) arr.length = 15;
  }

  _extractTopics(text) {
    const topics = [];
    const lower = text.toLowerCase();
    const patterns = {
      work: ['work', 'office', 'job', 'meeting', 'boss', 'colleague', 'project', 'deadline', 'career'],
      school: ['school', 'college', 'university', 'exam', 'study', 'class', 'teacher', 'homework', 'grade'],
      relationships: ['relationship', 'boyfriend', 'girlfriend', 'partner', 'wife', 'husband', 'dating', 'marriage'],
      family: ['family', 'mom', 'dad', 'mother', 'father', 'sister', 'brother', 'parent', 'child'],
      health: ['health', 'doctor', 'hospital', 'sick', 'pain', 'medicine', 'workout', 'gym', 'diet'],
      food: ['food', 'eat', 'dinner', 'lunch', 'breakfast', 'restaurant', 'cook', 'recipe', 'hungry'],
      travel: ['travel', 'trip', 'vacation', 'holiday', 'flight', 'hotel', 'beach', 'tour', 'journey'],
      movies: ['movie', 'film', 'netflix', 'cinema', 'watch', 'show', 'series', 'episode'],
      music: ['music', 'song', 'sing', 'album', 'artist', 'playlist', 'concert', 'melody'],
      sports: ['sport', 'game', 'team', 'match', 'score', 'player', 'goal', 'win', 'champion'],
      technology: ['tech', 'computer', 'phone', 'app', 'software', 'code', 'programming', 'ai', 'gadget'],
      finance: ['money', 'finance', 'bank', 'loan', 'invest', 'salary', 'payment', 'budget', 'bill'],
      shopping: ['shop', 'buy', 'purchase', 'order', 'delivery', 'cart', 'price', 'deal', 'sale'],
      gaming: ['game', 'gaming', 'play', 'xbox', 'playstation', 'nintendo', 'pc', 'gamer', 'multiplayer'],
      celebration: ['birthday', 'party', 'celebrate', 'anniversary', 'festival', 'gift', 'cake', 'surprise'],
    };
    for (const [topic, keywords] of Object.entries(patterns)) {
      if (keywords.some(kw => lower.includes(kw))) topics.push(topic);
    }
    return topics;
  }

  _recalculateDerivedScores(dna) {
    const ws = dna.writingStyle;
    ws.professionalScore = Math.max(0, Math.min(1, ws.professionalScore));
    ws.romanticScore = Math.max(0, Math.min(1, ws.romanticScore));
    ws.humorScore = Math.max(0, Math.min(1, ws.humorScore));
    ws.sarcasmScore = Math.max(0, Math.min(1, ws.sarcasmScore));
    ws.kindnessScore = Math.max(0, Math.min(1, ws.kindnessScore));
    ws.positivityScore = Math.max(0, Math.min(1, ws.positivityScore));
    ws.creativityScore = Math.max(0, Math.min(1, ws.creativityScore));
  }

  async getRecommendationProfile(userId) {
    const dna = await this.getDNA(userId);
    return {
      topEmojis: (dna.contentPreferences.topEmojis || []).slice(0, 5).map(e => e.emoji),
      topTopics: (dna.contentPreferences.favoriteTopics || []).slice(0, 3).map(t => t.value),
      writingStyle: {
        formality: dna.writingStyle.formalScore,
        humor: dna.writingStyle.humorScore,
        positivity: dna.writingStyle.positivityScore,
        romantic: dna.writingStyle.romanticScore,
        emojiPreference: dna.writingStyle.emojiFrequency,
      },
      language: dna.language.primary,
      activeHour: new Date().getHours(),
      rhythm: dna.behavioralPatterns.conversationRhythm,
      confidence: Math.min(dna.metadata.totalMessages / this.MIN_CONFIDENCE_MESSAGES, 1),
    };
  }

  async resetDNA(userId) {
    await ConversationDNA.deleteOne({ user: userId });
    return this.getDNA(userId);
  }
}

module.exports = new ConversationDNAEngine();
