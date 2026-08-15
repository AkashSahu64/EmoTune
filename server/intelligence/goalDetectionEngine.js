const { chatCompletion } = require('../core/providerManager');

const GOAL_CATEGORIES = [
  'planning', 'learning', 'dating', 'job_interview', 'birthday', 'travel',
  'support', 'shopping', 'coding', 'medical', 'business', 'entertainment',
  'problem_solving', 'decision_making', 'casual_chat', 'deep_conversation',
  'apology', 'confession', 'gossip', 'venting', 'motivation', 'negotiation',
];

const KEYWORD_MAP = {
  planning: {
    keywords: ['plan', 'schedule', 'arrange', 'organize', 'prepare', 'agenda', 'itinerary', 'timeline'],
    weight: 2,
    patterns: [/let'?s plan/i, /what should we/i, /how about we/i, /we need to decide/i],
  },
  learning: {
    keywords: ['learn', 'study', 'understand', 'explain', 'tutorial', 'lesson', 'course', 'practice', 'homework', 'assignment'],
    weight: 2,
    patterns: [/how do (i|you|we)/i, /can you teach/i, /what is.*\?$/i, /explain.*to me/i],
  },
  dating: {
    keywords: ['date', 'romantic', 'crush', 'feelings', 'relationship', 'love', 'bf', 'gf', 'partner', 'chemistry'],
    weight: 2,
    patterns: [/ask (you|her|him) out/i, /first date/i, /do you like me/i],
  },
  job_interview: {
    keywords: ['interview', 'resume', 'cv', 'job', 'hiring', 'position', 'recruiter', 'offer letter', 'salary'],
    weight: 3,
    patterns: [/prepare for interview/i, /interview question/i, /i have an interview/i, /job application/i],
  },
  birthday: {
    keywords: ['birthday', 'bday', 'birthday party', 'celebrate', 'cake', 'gift', 'surprise', 'wish'],
    weight: 2,
    patterns: [/happy birthday/i, /birthday gift/i, /birthday surprise/i, /turning \d+/i],
  },
  travel: {
    keywords: ['travel', 'trip', 'vacation', 'holiday', 'destination', 'hotel', 'flight', 'packing', 'tour', 'journey'],
    weight: 2,
    patterns: [/where should (i|we) go/i, /travel tips/i, /planning a trip/i, /places to visit/i],
  },
  support: {
    keywords: ['help', 'support', 'struggling', 'difficult', 'hard time', 'going through', 'need advice', 'guidance'],
    weight: 2,
    patterns: [/i need help/i, /can you help/i, /i don'?t know what to do/i, /i feel (lost|alone)/i],
  },
  shopping: {
    keywords: ['buy', 'purchase', 'shopping', 'deal', 'discount', 'affordable', 'price', 'budget', 'cost', 'worth'],
    weight: 2,
    patterns: [/should i buy/i, /where can (i|we) get/i, /is it worth/i, /good deal/i],
  },
  coding: {
    keywords: ['code', 'debug', 'bug', 'error', 'function', 'algorithm', 'syntax', 'compile', 'api', 'git', 'deploy'],
    weight: 2,
    patterns: [/how to code/i, /my code.*(broken|error|bug)/i, /debug this/i, /react|node|python|javascript/i],
  },
  medical: {
    keywords: ['symptom', 'pain', 'doctor', 'hospital', 'health', 'medicine', 'diagnosis', 'treatment', 'fever', 'injury'],
    weight: 3,
    patterns: [/i (feel|have) (pain|ache)/i, /what are the symptoms/i, /should i see a doctor/i, /medical advice/i],
  },
  business: {
    keywords: ['business', 'startup', 'revenue', 'profit', 'client', 'deal', 'contract', 'meeting', 'strategy', 'market'],
    weight: 2,
    patterns: [/business idea/i, /grow my business/i, /invest.*opportunity/i, /pitch (idea|deck)/i],
  },
  entertainment: {
    keywords: ['movie', 'show', 'music', 'game', 'series', 'watch', 'listen', 'play', 'fun', 'entertain', 'netflix'],
    weight: 1,
    patterns: [/what to watch/i, /good movie/i, /song recommendation/i, /game recommendation/i],
  },
  problem_solving: {
    keywords: ['problem', 'solve', 'solution', 'fix', 'issue', 'trouble', 'resolve', 'figure out', 'approach'],
    weight: 2,
    patterns: [/how (can|do) i (fix|solve)/i, /what'?s the solution/i, /problem.*solve/i, /think (through|it through)/i],
  },
  decision_making: {
    keywords: ['choose', 'decision', 'option', 'dilemma', 'confused between', 'which one', 'pros', 'cons', 'torn between'],
    weight: 2,
    patterns: [/which (one|option) should/i, /can'?t decide/i, /what should i do/i, /pros and cons/i],
  },
  casual_chat: {
    keywords: ['how are you', 'whats up', 'sup', 'hey', 'hello', 'hi', 'nothing much', 'chilling', 'random'],
    weight: 1,
    patterns: [/how('?s| is) (it going|everything)/i, /what are you (up to|doing)/i, /just (chilling|relaxing)/i],
  },
  deep_conversation: {
    keywords: ['meaning', 'purpose', 'life', 'universe', 'consciousness', 'philosophy', 'existence', 'spiritual', 'mortality'],
    weight: 2,
    patterns: [/what is the meaning of/i, /why are we here/i, /do you believe in/i, /thoughts on (life|death)/i],
  },
  apology: {
    keywords: ['sorry', 'apologize', 'forgive', 'regret', 'my fault', 'mistake', 'i was wrong', 'pardon', 'remorse'],
    weight: 2,
    patterns: [/i (owe you|wanna say) (an apology|sorry)/i, /please forgive/i, /i didn'?t mean to/i],
  },
  confession: {
    keywords: ['confess', 'admit', 'confession', 'truth', 'i need to tell', 'secret', 'i have to say', 'honestly'],
    weight: 3,
    patterns: [/i need to confess/i, /i have something to tell/i, /i haven'?t been honest/i, /i (lied|kept) a secret/i],
  },
  gossip: {
    keywords: ['gossip', 'heard', 'rumor', 'drama', 'did you hear', 'spill the tea', 'tea', 'what happened'],
    weight: 1,
    patterns: [/did you hear about/i, /spill the tea/i, /guess what/i, /you won'?t believe/i],
  },
  venting: {
    keywords: ['vent', 'frustrated', 'annoyed', 'fed up', 'sick of', 'tired of', 'can\'t stand', 'rage', 'irritated'],
    weight: 2,
    patterns: [/i need to vent/i, /i'?m so (frustrated|annoyed|angry)/i, /let me vent/i, /i can'?t (deal|take it)/i],
  },
  motivation: {
    keywords: ['motivate', 'inspire', 'encourage', 'keep going', 'push', 'determination', 'perseverance', 'never give up'],
    weight: 2,
    patterns: [/i need motivation/i, /help me stay motivated/i, /how to stay (focused|motivated)/i],
  },
  negotiation: {
    keywords: ['negotiate', 'bargain', 'offer', 'counter', 'deal', 'compromise', 'terms', 'agreement', 'settle'],
    weight: 2,
    patterns: [/negotiate (price|deal|salary)/i, /can we work something out/i, /low(er|est) (price|offer)/i],
  },
};

const GOAL_DESCRIPTIONS = {
  planning: 'User is making plans or organizing something',
  learning: 'User wants to learn or understand something new',
  dating: 'User is engaged in romantic or dating conversation',
  job_interview: 'User is preparing for or discussing a job interview',
  birthday: 'User is talking about a birthday or celebration',
  travel: 'User is planning or discussing travel',
  support: 'User needs emotional support or advice',
  shopping: 'User is looking to buy something or discussing purchases',
  coding: 'User is discussing code, programming, or technical problems',
  medical: 'User is discussing health concerns or medical advice',
  business: 'User is discussing business, deals, or professional matters',
  entertainment: 'User is seeking entertainment recommendations or discussing media',
  problem_solving: 'User is trying to solve a specific problem',
  decision_making: 'User is trying to make a decision between options',
  casual_chat: 'User is engaging in casual, general conversation',
  deep_conversation: 'User is discussing deep or philosophical topics',
  apology: 'User is apologizing or seeking forgiveness',
  confession: 'User is confessing something or sharing a secret',
  gossip: 'User is sharing or discussing gossip',
  venting: 'User is venting frustration or anger',
  motivation: 'User is seeking motivation or encouragement',
  negotiation: 'User is negotiating terms, price, or deals',
};

const GOAL_INFLUENCES = {
  planning: { boost: ['emoji', 'reply'], suppress: [] },
  learning: { boost: ['reply', 'shayari'], suppress: ['song'] },
  dating: { boost: ['song', 'sticker', 'emoji'], suppress: [] },
  job_interview: { boost: ['reply'], suppress: ['song', 'sticker'] },
  birthday: { boost: ['emoji', 'song', 'sticker'], suppress: [] },
  travel: { boost: ['emoji', 'sticker'], suppress: [] },
  support: { boost: ['shayari', 'sticker', 'reply'], suppress: ['song'] },
  shopping: { boost: ['emoji', 'sticker'], suppress: ['shayari'] },
  coding: { boost: ['reply'], suppress: ['shayari', 'sticker'] },
  medical: { boost: ['reply', 'shayari'], suppress: ['song', 'sticker'] },
  business: { boost: ['reply'], suppress: ['song', 'sticker', 'shayari'] },
  entertainment: { boost: ['emoji', 'song', 'sticker'], suppress: ['reply'] },
  problem_solving: { boost: ['reply'], suppress: ['sticker'] },
  decision_making: { boost: ['reply'], suppress: [] },
  casual_chat: { boost: ['emoji', 'sticker'], suppress: ['shayari'] },
  deep_conversation: { boost: ['shayari', 'reply'], suppress: ['sticker'] },
  apology: { boost: ['shayari', 'sticker'], suppress: ['song'] },
  confession: { boost: ['reply', 'shayari'], suppress: ['sticker'] },
  gossip: { boost: ['sticker', 'emoji'], suppress: ['reply', 'shayari'] },
  venting: { boost: ['shayari', 'reply'], suppress: ['song'] },
  motivation: { boost: ['shayari', 'song'], suppress: [] },
  negotiation: { boost: ['reply'], suppress: ['song', 'sticker'] },
};

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const KEYWORD_CONFIDENCE_SCALE = 0.15;
const PATTERN_CONFIDENCE_BONUS = 0.3;
const TRANSITION_HYSTERESIS = 0.15;

class GoalDetectionEngine {
  constructor(options = {}) {
    this.confidenceThreshold = options.confidenceThreshold || DEFAULT_CONFIDENCE_THRESHOLD;
    this.keywordConfidenceScale = options.keywordConfidenceScale || KEYWORD_CONFIDENCE_SCALE;
    this.patternConfidenceBonus = options.patternConfidenceBonus || PATTERN_CONFIDENCE_BONUS;
    this.transitionHysteresis = options.transitionHysteresis || TRANSITION_HYSTERESIS;
    this.goalHistory = new Map();
  }

  detectGoal(messages, context = {}) {
    const text = this._combineMessages(messages);
    const signals = [];
    const scores = {};

    for (const category of GOAL_CATEGORIES) {
      const result = this._scoreCategory(text, category);
      if (result.score > 0) {
        scores[category] = result.score;
        signals.push({ goal: category, signal: result.signals, score: result.score });
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primary = sorted.length > 0 ? sorted[0][0] : 'casual_chat';
    const primaryScore = sorted.length > 0 ? sorted[0][1] : 0;

    let confidence = this._normalizeConfidence(primaryScore);
    let secondary = sorted.length > 1 ? sorted.slice(1, 4).map((s) => s[0]) : [];
    let source = 'keyword';

    if (context.chatId && this.goalHistory.has(context.chatId)) {
      const prevGoal = this.goalHistory.get(context.chatId);
      const timeSince = Date.now() - (prevGoal.timestamp || 0);
      if (timeSince < 120000 && primary !== prevGoal.goal && Math.abs(confidence - prevGoal.confidence) < this.transitionHysteresis) {
        return {
          primary: prevGoal.goal,
          secondary: [primary, ...secondary].slice(0, 4),
          confidence: prevGoal.confidence,
          signals: signals,
          source: 'history',
        };
      }
    }

    if (confidence < this.confidenceThreshold) {
      const aiResult = this._aiFallback(messages, context);
      if (aiResult && aiResult.confidence > confidence) {
        return aiResult;
      }
    }

    const result = {
      primary,
      secondary,
      confidence: Math.round(confidence * 100) / 100,
      signals,
      source,
    };

    if (context.chatId) {
      this.goalHistory.set(context.chatId, { goal: primary, confidence, timestamp: Date.now() });
      if (this.goalHistory.size > 10000) {
        const firstKey = this.goalHistory.keys().next().value;
        this.goalHistory.delete(firstKey);
      }
    }

    return result;
  }

  detectGoalFromMessage(message) {
    const text = (typeof message === 'string' ? message : message.text || message.content || '');
    return this.detectGoal([{ text, role: 'user' }]);
  }

  getGoalDescription(goalType) {
    return GOAL_DESCRIPTIONS[goalType] || 'User is engaging in conversation';
  }

  getGoalInfluence(goalType) {
    return GOAL_INFLUENCES[goalType] || { boost: [], suppress: [] };
  }

  updateGoalConfidence(currentGoal, newMessages) {
    const text = this._combineMessages(newMessages);
    const result = this._scoreCategory(text, currentGoal.primary || currentGoal);
    const newConfidence = this._normalizeConfidence(result.score);

    const decay = 0.85;
    const updatedConfidence = (currentGoal.confidence || 0.5) * decay + newConfidence * (1 - decay);

    const goal = {
      primary: currentGoal.primary || currentGoal,
      confidence: Math.round(updatedConfidence * 100) / 100,
      signals: result.signals ? [{ goal: currentGoal.primary || currentGoal, signal: result.signals, score: result.score }] : currentGoal.signals || [],
    };

    if (updatedConfidence < this.confidenceThreshold * 0.7) {
      goal.secondary = [currentGoal.primary || currentGoal];
      goal.primary = 'casual_chat';
    }

    return goal;
  }

  shouldRecalculate(analyzedMessages) {
    if (!Array.isArray(analyzedMessages) || analyzedMessages.length < 3) return false;

    const recentMessages = analyzedMessages.slice(-3);
    const goals = recentMessages.map((m) => {
      const text = m.text || m.content || '';
      const scores = {};
      for (const category of GOAL_CATEGORIES) {
        const result = this._scoreCategory(text, category);
        if (result.score > 0) scores[category] = result.score;
      }
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : 'casual_chat';
    });

    const uniqueGoals = [...new Set(goals)];
    return uniqueGoals.length > 1;
  }

  _combineMessages(messages) {
    if (!Array.isArray(messages)) return String(messages || '');
    return messages
      .map((m) => (typeof m === 'string' ? m : m.text || m.content || ''))
      .filter(Boolean)
      .join(' ');
  }

  _scoreCategory(text, category) {
    const config = KEYWORD_MAP[category];
    if (!config) return { score: 0, signals: [] };

    const lower = text.toLowerCase();
    let score = 0;
    const signals = [];

    for (const kw of config.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += config.weight;
        signals.push(`keyword:${kw}`);
      }
    }

    for (const pattern of config.patterns || []) {
      if (pattern.test(text)) {
        score += config.weight * 2;
        signals.push(`pattern:${pattern.source}`);
      }
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 0) {
      score = score / Math.max(1, wordCount / 5);
    }

    return { score, signals };
  }

  _normalizeConfidence(rawScore) {
    return Math.min(1, Math.max(0, rawScore * this.keywordConfidenceScale));
  }

  async _aiFallback(messages, context) {
    try {
      const text = this._combineMessages(messages).slice(0, 2000);
      const systemPrompt = `Analyze the conversation goal from these categories: ${GOAL_CATEGORIES.join(', ')}. Return JSON with "primary" (string), "secondary" (array of strings, max 3), and "confidence" (0-1 number).`;

      const result = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Conversation:\n${text}\n\nWhat is the primary goal?` },
      ], { taskType: 'goal_detection', responseFormat: 'json_object', temperature: 0.2 });

      if (!result) return null;

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (!parsed.primary || !GOAL_CATEGORIES.includes(parsed.primary)) return null;

      return {
        primary: parsed.primary,
        secondary: (parsed.secondary || []).filter((g) => GOAL_CATEGORIES.includes(g)),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        signals: [{ goal: parsed.primary, signal: 'ai_fallback', score: parsed.confidence || 0.5 }],
        source: 'ai',
      };
    } catch (err) {
      return null;
    }
  }
}

const DEFAULT_KEYWORD_CONFIDENCE_SCALE = 0.15;
const DEFAULT_PATTERN_CONFIDENCE_BONUS = 0.3;
const DEFAULT_TRANSITION_HYSTERESIS = 0.15;

module.exports = new GoalDetectionEngine({
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  keywordConfidenceScale: DEFAULT_KEYWORD_CONFIDENCE_SCALE,
  patternConfidenceBonus: DEFAULT_PATTERN_CONFIDENCE_BONUS,
  transitionHysteresis: DEFAULT_TRANSITION_HYSTERESIS,
});
module.exports.GoalDetectionEngine = GoalDetectionEngine;
module.exports.GOAL_CATEGORIES = GOAL_CATEGORIES;
module.exports.KEYWORD_MAP = KEYWORD_MAP;
module.exports.GOAL_DESCRIPTIONS = GOAL_DESCRIPTIONS;
module.exports.GOAL_INFLUENCES = GOAL_INFLUENCES;
