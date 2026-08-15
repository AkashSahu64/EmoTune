const EMOTION_WEIGHTS = require('./emotionTimeline').constructor.EMOTION_WEIGHTS;

const POLITE_WORDS = ['please', 'thanks', 'thank', 'welcome', 'kindly', 'appreciate', 'bless', 'grateful', 'you\'re welcome', 'my pleasure', 'thank you', 'thanks a lot', 'much appreciated'];
const GREETING_WORDS = ['hello', 'hi', 'hey', 'how are you', 'good morning', 'good evening', 'whats up', 'sup', 'namaste', 'heyy', 'hii', 'howdy'];
const TOXIC_WORDS = ['hate', 'stupid', 'idiot', 'shut up', 'leave me alone', 'i hate', 'you\'re wrong', 'ugly', 'fat', 'loser', 'pathetic', 'dumb', 'moron', 'kill', 'die', 'worthless', 'trash', 'stop talking', 'go away', 'screw you', 'nonsense'];
const POSITIVE_WORDS = ['love', 'amazing', 'great', 'wonderful', 'awesome', 'fantastic', 'beautiful', 'excellent', 'perfect', 'nice', 'good', 'happy', 'glad', 'fantastic', 'brilliant', 'superb', 'outstanding', 'incredible', 'marvelous', 'splendid', 'delightful', 'terrific', 'magnificent', 'splendid'];
const EMPATHY_WORDS = ['i understand', 'i hear you', 'i feel', 'that must be', 'i can imagine', 'sounds like', 'you must feel', "that's tough", "i'm sorry", "that's hard", 'i get it', 'i know how you feel', "i've been there", "you're not alone", "that's difficult", "i'm here", 'i care', 'you matter'];
const RESPECT_WORDS = ['please', 'thank', 'appreciate', 'respect', 'honor', 'value', 'admire', 'proud', 'grateful', 'blessed', 'kind', 'thoughtful', 'considerate', 'understanding'];
const ACTIVE_LISTENING_WORDS = ['i see', 'tell me more', 'go on', 'what happened', 'then what', 'how did that', 'mhmm', 'i understand', 'right', 'exactly', 'interesting', 'really', 'wow', 'oh', 'i hear you'];
const ONE_WORD_REPLIES = new Set(['ok', 'okay', 'k', 'sure', 'yeah', 'no', 'yes', 'yep', 'nope', 'nah', 'fine', 'cool', 'lol', 'hmm', 'idk', 'maybe', 'alright', 'good', 'nice', 'hey', 'hi', 'kk', 'mm', 'ha', ':)', ':(']);

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function countMatches(text, words) {
  const lower = text.toLowerCase();
  return words.filter(w => lower.includes(w)).length;
}

class ConversationHealthEngine {
  analyze(conversationContext = {}) {
    const startTime = Date.now();
    const {
      messages = [],
      emotionTimeline = [],
      conversationState = '',
      momentum = {},
      participants = ['user', 'ai'],
    } = conversationContext;
    const messagesText = messages.map(m => m.text || m || '').filter(Boolean);
    const messageCount = messagesText.length;

    const friendliness = this._calculateFriendliness(messagesText, conversationContext);
    const toxicityRaw = this._calculateToxicity(messagesText);
    const toxicity = { score: 100 - toxicityRaw.score, trend: toxicityRaw.trend, flags: toxicityRaw.flags };
    const respect = this._calculateRespect(messagesText);
    const empathy = this._calculateEmpathy(messagesText, emotionTimeline);
    const positivity = this._calculatePositivity(messagesText);
    const trust = this._calculateTrust(emotionTimeline, conversationContext);
    const excitement = this._calculateExcitement(messagesText, momentum);
    const awkwardnessRaw = this._calculateAwkwardness(messagesText);
    const awkwardness = { score: 100 - awkwardnessRaw.score, trend: awkwardnessRaw.trend };

    const engagement = this._calculateEngagement(messagesText);

    const dimensions = { friendliness, toxicity, respect, positivity, empathy, trust, excitement, awkwardness };

    const overallScore = Math.round(
      friendliness.score * 0.15 +
      toxicity.score * 0.15 +
      respect.score * 0.12 +
      positivity.score * 0.12 +
      empathy.score * 0.12 +
      trust.score * 0.12 +
      excitement.score * 0.1 +
      awkwardness.score * 0.12
    );

    const qualityScore = {
      overall: Math.round((engagement.depth * 0.4 + engagement.engagement * 0.3 + engagement.depth * 0.3)),
      depth: engagement.depth,
      engagement: engagement.engagement,
    };

    const risks = this._detectRisks(messagesText, { dimensions, qualityScore, overallScore, messageCount });
    const suggestions = this._generateSuggestions({ dimensions, qualityScore, risks, overallScore, messageCount });

    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      dimensions,
      qualityScore,
      risks,
      suggestions,
      metadata: {
        messageCount,
        duration: momentum.totalDuration || 0,
        participantCount: Object.keys(participants).length || 2,
        computationTime: Date.now() - startTime,
      },
    };
  }

  _calculateFriendliness(messages = [], context = {}) {
    if (!messages.length) return { score: 50, trend: 'stable' };

    let score = 0;
    let greetingCount = 0;
    let politeCount = 0;
    let positiveResponseCount = 0;
    const recentScores = [];

    for (let i = 0; i < messages.length; i++) {
      const text = messages[i];
      if (!text) continue;

      let msgScore = 50;
      if (countMatches(text, GREETING_WORDS) > 0) {
        greetingCount++;
        msgScore += 15;
      }
      if (countMatches(text, POLITE_WORDS) > 0) {
        politeCount++;
        msgScore += 10;
      }
      if (countMatches(text, ['yes', 'sure', 'okay', 'definitely', 'absolutely', 'love to', 'sounds good']) > 0) {
        positiveResponseCount++;
        msgScore += 8;
      }
      if (text.includes('!')) msgScore += 3;

      recentScores.push(msgScore);
    }

    const avgScore = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
    score = Math.min(100, avgScore);

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const recent = recentScores.slice(-3);
      const slope = recent[recent.length - 1] - recent[0];
      if (slope > 10) trend = 'improving';
      else if (slope < -10) trend = 'declining';
    }

    return { score: Math.round(score), trend };
  }

  _calculateToxicity(messages = []) {
    if (!messages.length) return { score: 0, trend: 'stable', flags: [] };

    let score = 0;
    const flags = [];
    const recentScores = [];
    const tox = TOXIC_WORDS;

    for (let i = 0; i < messages.length; i++) {
      const text = messages[i];
      if (!text) continue;
      let msgScore = 0;
      const matches = countMatches(text, tox);
      if (matches > 0) {
        msgScore += matches * 15;
        if (matches >= 2) flags.push({ text: text.slice(0, 50), severity: matches >= 3 ? 'high' : 'medium' });
      }
      if (text.toUpperCase().includes('SHUT UP')) msgScore += 20;
      if (text.includes('!')) msgScore += 2;
      if (text.split(/\s+/).filter(Boolean).some(w => w.includes('fuck') || w.includes('shit') || w.includes('ass') || w.includes('bitch'))) {
        msgScore += 25;
        flags.push({ text: text.slice(0, 50), severity: 'high' });
      }
      recentScores.push(Math.min(100, msgScore));
    }

    score = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
    score = Math.min(100, score);

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const slice = recentScores.slice(-3);
      const slope = slice[slice.length - 1] - slice[0];
      if (slope > 10) trend = 'declining';
      else if (slope < -10) trend = 'improving';
    }

    return { score, trend, flags };
  }

  _calculateRespect(messages = []) {
    if (!messages.length) return { score: 50, trend: 'stable' };

    let score = 50;
    const recentScores = [];

    for (const text of messages) {
      if (!text) continue;
      let msgScore = 50;
      const respectMatches = countMatches(text, RESPECT_WORDS);
      if (respectMatches > 0) msgScore += respectMatches * 10;
      const listeningMatches = countMatches(text, ACTIVE_LISTENING_WORDS);
      if (listeningMatches > 0) msgScore += listeningMatches * 5;
      if (text.includes('?') && text.length > 20) msgScore += 5;
      if (countMatches(text, TOXIC_WORDS) > 0) msgScore -= 20;
      recentScores.push(Math.max(0, Math.min(100, msgScore)));
    }

    score = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const slice = recentScores.slice(-3);
      const slope = slice[slice.length - 1] - slice[0];
      if (slope > 8) trend = 'improving';
      else if (slope < -8) trend = 'declining';
    }

    return { score: Math.round(score), trend };
  }

  _calculateEmpathy(messages = [], emotionTimeline = []) {
    if (!messages.length) return { score: 50, trend: 'stable' };

    let score = 50;
    const recentScores = [];
    const hasEmotionContext = emotionTimeline.length > 0;

    for (let i = 0; i < messages.length; i++) {
      const text = messages[i];
      if (!text) continue;
      let msgScore = 50;

      const empathyMatches = countMatches(text, EMPATHY_WORDS);
      if (empathyMatches > 0) msgScore += empathyMatches * 12;

      const supportWords = countMatches(text, ['you can', 'you will', "you're strong", 'keep going', "don't give up", 'believe', 'you matter']);
      if (supportWords > 0) msgScore += supportWords * 8;

      if (hasEmotionContext && i > 0) {
        const prevEmotion = emotionTimeline[Math.min(i - 1, emotionTimeline.length - 1)];
        if (prevEmotion && (EMOTION_WEIGHTS[prevEmotion.emotion] || 4) < 3) {
          if (empathyMatches > 0) msgScore += 10;
          if (text.toLowerCase().includes('how are') || text.toLowerCase().includes('you okay')) msgScore += 10;
        }
      }

      if (text.includes('?') && text.length > 15) msgScore += 5;
      recentScores.push(Math.max(0, Math.min(100, msgScore)));
    }

    score = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const slice = recentScores.slice(-3);
      const slope = slice[slice.length - 1] - slice[0];
      if (slope > 8) trend = 'improving';
      else if (slope < -8) trend = 'declining';
    }

    return { score: Math.round(score), trend };
  }

  _calculatePositivity(messages = []) {
    if (!messages.length) return { score: 50, trend: 'stable' };

    const recentScores = [];

    for (const text of messages) {
      if (!text) continue;
      let msgScore = 50;
      const posMatches = countMatches(text, POSITIVE_WORDS);
      if (posMatches > 0) msgScore += posMatches * 8;
      const toxicMatches = countMatches(text, TOXIC_WORDS);
      if (toxicMatches > 0) msgScore -= toxicMatches * 12;
      if (text.includes('!')) msgScore += 5;
      if (text.includes(':)') || text.includes(':-)') || text.includes(':D') || text.includes('😊') || text.includes('😄') || text.includes('❤️')) msgScore += 8;
      if (text.includes(':(') || text.includes(';-;') || text.includes('😢') || text.includes('😭')) msgScore -= 5;
      recentScores.push(Math.max(0, Math.min(100, msgScore)));
    }

    const avg = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const slice = recentScores.slice(-3);
      const slope = slice[slice.length - 1] - slice[0];
      if (slope > 10) trend = 'improving';
      else if (slope < -10) trend = 'declining';
    }

    return { score: Math.round(avg), trend };
  }

  _calculateTrust(emotionTimeline = [], context = {}) {
    const { relationshipScore = 50 } = context;
    let score = 50;

    if (emotionTimeline.length >= 3) {
      const emotions = emotionTimeline.slice(-5).map(e => e.emotion);
      const vulnerable = emotions.filter(e => ['sad', 'anxious', 'worried', 'hurt', 'lonely', 'guilty', 'scared'].includes(e));
      if (vulnerable.length >= 2) score += vulnerable.length * 5;
      const volatility = emotionTimeline.slice(-5).filter((e, i) => {
        if (i === 0) return false;
        return EMOTION_WEIGHTS[e.emotion] !== EMOTION_WEIGHTS[emotionTimeline[emotionTimeline.length - 5 + i - 1]?.emotion];
      }).length;
      if (volatility > 3) score -= 10;
    }

    if (emotionTimeline.length > 0) {
      const lastEmotion = emotionTimeline[emotionTimeline.length - 1]?.emotion;
      if (lastEmotion === 'grateful' || lastEmotion === 'thankful') score += 10;
      if (lastEmotion === 'loved' || lastEmotion === 'romantic') score += 8;
    }

    score += (relationshipScore - 50) * 0.3;
    score = Math.max(0, Math.min(100, score));

    let trend = 'stable';
    if (emotionTimeline.length >= 3) {
      const weights = emotionTimeline.slice(-3).map(e => e.weight || EMOTION_WEIGHTS[e.emotion] || 4);
      const slope = weights[weights.length - 1] - weights[0];
      if (slope > 2) trend = 'improving';
      else if (slope < -2) trend = 'declining';
    }

    return { score: Math.round(score), trend };
  }

  _calculateExcitement(messages = [], momentum = {}) {
    if (!messages.length) return { score: 50, trend: 'stable' };

    let score = 50;
    const recentScores = [];

    for (const text of messages) {
      if (!text) continue;
      let msgScore = 50;
      const exclamationCount = (text.match(/!/g) || []).length;
      msgScore += Math.min(20, exclamationCount * 8);
      const upper = (text.match(/[A-Z]{2,}/g) || []).length;
      msgScore += Math.min(10, upper * 4);
      if (countMatches(text, ['wow', 'omg', 'amazing', 'awesome', 'exciting', 'finally', 'yay', 'woohoo']) > 0) msgScore += 10;
      const qCount = (text.match(/\?/g) || []).length;
      if (qCount > 0) msgScore += 3;
      if (text.length > 150) msgScore += 5;
      recentScores.push(Math.max(0, Math.min(100, msgScore)));
    }

    score = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;

    if (momentum.isExciting) score += 10;
    if (momentum.isDead) score -= 15;

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const slice = recentScores.slice(-3);
      const slope = slice[slice.length - 1] - slice[0];
      if (slope > 10) trend = 'improving';
      else if (slope < -10) trend = 'declining';
    }

    return { score: Math.max(0, Math.min(100, Math.round(score))), trend };
  }

  _calculateAwkwardness(messages = []) {
    if (!messages.length) return { score: 0, trend: 'stable' };

    let score = 0;
    const recentScores = [];
    let longPauses = 0;
    let oneWordReplies = 0;
    let ignoredQuestions = 0;

    for (let i = 0; i < messages.length; i++) {
      const text = messages[i];
      if (!text) continue;
      let msgScore = 0;
      const words = text.split(/\s+/).filter(Boolean);
      const wordCount = words.length;

      if (wordCount <= 2 && !text.includes('?') && !text.includes('!')) {
        oneWordReplies++;
        msgScore += 15;
      }

      if (i > 0 && messages[i - 1]) {
        const prev = messages[i - 1];
        if (prev.includes('?') && !text.includes('?') && wordCount < 4) {
          ignoredQuestions++;
          msgScore += 20;
        }
      }

      if (text.length < 5 && !['ok', 'okay', 'sure', 'yeah', 'no', 'yes', 'hi', 'hey', 'bye'].includes(text.toLowerCase().trim())) {
        msgScore += 5;
      }

      recentScores.push(msgScore);
    }

    score = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
    score = Math.min(100, score);

    let trend = 'stable';
    if (recentScores.length >= 3) {
      const slice = recentScores.slice(-3);
      const slope = slice[slice.length - 1] - slice[0];
      if (slope > 10) trend = 'declining';
      else if (slope < -10) trend = 'improving';
    }

    return { score: Math.round(score), trend, signals: { longPauses, oneWordReplies, ignoredQuestions } };
  }

  _calculateEngagement(messages = []) {
    if (!messages.length) return { depth: 50, engagement: 50 };

    let totalWords = 0;
    let questions = 0;
    let responses = 0;
    let lengths = [];
    let qaRatio = 0;

    for (let i = 0; i < messages.length; i++) {
      const text = messages[i];
      if (!text) continue;
      const wordCount = countWords(text);
      totalWords += wordCount;
      lengths.push(text.length);
      if (text.includes('?')) questions++;
      if (i > 0) {
        const currentWords = countWords(text);
        const prevWords = countWords(messages[i - 1] || '');
        if (currentWords > 1 && prevWords > 1) responses++;
      }
    }

    const avgLength = lengths.reduce((s, v) => s + v, 0) / lengths.length;
    const avgWords = totalWords / messages.length;

    let depth = 50;
    if (avgWords > 15) depth += 15;
    if (avgWords > 30) depth += 10;
    if (avgLength > 100) depth += 10;
    if (avgLength < 20) depth -= 10;
    depth = Math.max(0, Math.min(100, depth));

    let engagement = 50;
    qaRatio = messages.length > 0 ? questions / messages.length : 0;
    if (qaRatio > 0.3) engagement += 15;
    if (qaRatio > 0.15) engagement += 5;
    if (responses > messages.length * 0.4) engagement += 10;
    if (avgWords > 10) engagement += 10;
    if (avgWords < 4) engagement -= 10;
    if (messages.length > 10) engagement += 5;
    engagement = Math.max(0, Math.min(100, engagement));

    return { depth: Math.round(depth), engagement: Math.round(engagement) };
  }

  _detectRisks(messages = [], health = {}) {
    const risks = [];
    const { dimensions = {}, qualityScore = {}, overallScore = 50, messageCount = 0 } = health;

    if (dimensions.toxicity && dimensions.toxicity.score < 60) {
      risks.push({
        type: 'toxicity',
        severity: dimensions.toxicity.score < 40 ? 'high' : dimensions.toxicity.score < 50 ? 'medium' : 'low',
        suggestion: 'Redirect conversation to positive topics and model respectful language',
      });
    }

    if (dimensions.awkwardness && dimensions.awkwardness.score < 50) {
      const signals = dimensions.awkwardness.signals || {};
      risks.push({
        type: 'awkwardness',
        severity: signals.ignoredQuestions > 3 ? 'high' : signals.oneWordReplies > 5 ? 'medium' : 'low',
        suggestion: signals.ignoredQuestions > 0
          ? 'Ask engaging questions and follow up on previous responses'
          : 'Use open-ended questions to encourage longer responses',
      });
    }

    if (messageCount > 3 && qualityScore.engagement < 40) {
      risks.push({
        type: 'one_sided',
        severity: qualityScore.engagement < 25 ? 'high' : 'medium',
        suggestion: 'Share more about yourself and ask for their opinions to balance the conversation',
      });
    }

    if (dimensions.empathy && dimensions.empathy.score < 40 && messageCount > 5) {
      risks.push({
        type: 'low_empathy',
        severity: 'medium',
        suggestion: 'Acknowledge the other person\'s feelings and validate their experiences',
      });
    }

    if (dimensions.excitement && dimensions.excitement.score < 30 && messageCount > 5) {
      risks.push({
        type: 'low_energy',
        severity: 'low',
        suggestion: 'Introduce an engaging topic or share something exciting to boost energy',
      });
    }

    return risks;
  }

  _generateSuggestions(health = {}) {
    const suggestions = [];
    const { dimensions = {}, overallScore = 50, risks = [], messageCount = 0 } = health;

    if (overallScore < 40) {
      suggestions.push({
        type: 'critical',
        text: 'Conversation needs significant improvement across multiple dimensions',
        priority: 1,
        expectedImpact: 15,
      });
    } else if (overallScore < 60) {
      suggestions.push({
        type: 'improvement',
        text: 'Consider improving conversation quality by being more engaging',
        priority: 2,
        expectedImpact: 10,
      });
    }

    if (dimensions.friendliness && dimensions.friendliness.score < 50) {
      suggestions.push({
        type: 'friendliness',
        text: 'Use more polite words and greetings to improve friendliness',
        priority: 1,
        expectedImpact: 8,
      });
    }

    if (dimensions.toxicity && dimensions.toxicity.score < 70) {
      suggestions.push({
        type: 'toxicity_reduction',
        text: 'Avoid negative language and personal attacks. Focus on constructive dialogue',
        priority: 1,
        expectedImpact: 20,
      });
    }

    if (dimensions.respect && dimensions.respect.score < 50) {
      suggestions.push({
        type: 'respect',
        text: 'Practice active listening by acknowledging the other person\'s points',
        priority: 2,
        expectedImpact: 10,
      });
    }

    if (dimensions.positivity && dimensions.positivity.score < 50) {
      suggestions.push({
        type: 'positivity',
        text: 'Try to find positive angles and use encouraging language',
        priority: 2,
        expectedImpact: 8,
      });
    }

    if (dimensions.empathy && dimensions.empathy.score < 50) {
      suggestions.push({
        type: 'empathy',
        text: 'Show understanding by acknowledging feelings and asking how they feel',
        priority: 2,
        expectedImpact: 10,
      });
    }

    if (dimensions.excitement && dimensions.excitement.score < 40) {
      suggestions.push({
        type: 'excitement',
        text: 'Share something interesting or ask about their passions to raise energy',
        priority: 3,
        expectedImpact: 6,
      });
    }

    if (dimensions.awkwardness && dimensions.awkwardness.score < 50) {
      suggestions.push({
        type: 'awkwardness_reduction',
        text: 'Avoid one-word replies and always respond to questions directly',
        priority: 2,
        expectedImpact: 12,
      });
    }

    if (risks.some(r => r.type === 'one_sided')) {
      suggestions.push({
        type: 'balance',
        text: 'Balance the conversation by asking questions and sharing equally',
        priority: 1,
        expectedImpact: 15,
      });
    }

    if (messageCount > 2 && messageCount < 8) {
      suggestions.push({
        type: 'deepening',
        text: 'Ask follow-up questions to explore topics in more depth',
        priority: 3,
        expectedImpact: 5,
      });
    }

    suggestions.sort((a, b) => a.priority - b.priority);
    return suggestions.slice(0, 6);
  }
}

module.exports = ConversationHealthEngine;