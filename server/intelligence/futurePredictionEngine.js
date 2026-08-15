const { STATES, VALID_TRANSITIONS } = require('./conversationState');
const EMOTION_WEIGHTS = require('./emotionTimeline').constructor.EMOTION_WEIGHTS;

const MODEL_VERSION = 'future-v1-rule';

const EMOTION_TRANSITIONS = {
  sad: ['neutral', 'hopeful', 'happy'],
  angry: ['frustrated', 'neutral', 'sad', 'apologetic'],
  neutral: ['happy', 'curious', 'sad', 'excited'],
  happy: ['excited', 'grateful', 'neutral', 'joyful'],
  excited: ['joyful', 'happy', 'grateful'],
  anxious: ['worried', 'neutral', 'hopeful'],
  grateful: ['happy', 'joyful', 'excited'],
  romantic: ['loved', 'happy', 'flirty', 'neutral'],
  flirty: ['romantic', 'happy', 'playful'],
};

const STATE_TRANSITIONS = {
  greeting: ['small_talk', 'introduction', 'professional'],
  small_talk: ['discussion', 'planning', 'flirting', 'celebration', 'ending'],
  discussion: ['planning', 'argument', 'celebration', 'ending', 'small_talk'],
  argument: ['apology', 'discussion', 'ending', 'support'],
  apology: ['support', 'small_talk', 'discussion', 'ending'],
  celebration: ['small_talk', 'discussion', 'planning', 'flirting', 'ending'],
  flirting: ['discussion', 'celebration', 'romantic', 'small_talk', 'ending'],
  planning: ['discussion', 'celebration', 'small_talk', 'ending'],
  support: ['small_talk', 'discussion', 'celebration', 'ending'],
  professional: ['discussion', 'planning', 'small_talk', 'ending'],
  ending: ['greeting', 'small_talk'],
};

const POLITE_WORDS = ['please', 'thanks', 'thank', 'welcome', 'kindly', 'appreciate', 'bless', 'grateful'];
const QUESTION_STARTS = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'do', 'does', 'did', 'is', 'are', 'can', 'could', 'would', 'will', 'shall', 'have', 'has'];
const GREETING_WORDS = ['hello', 'hi', 'hey', 'how are you', 'good morning', 'good evening', 'whats up', 'sup', 'namaste'];

class FuturePredictionEngine {
  predict(messageHistory = [], context = {}) {
    const startTime = Date.now();
    const {
      currentEmotion = { emotion: 'neutral', confidence: 0.5 },
      emotionTimeline = [],
      conversationState = 'small_talk',
      momentum = {},
      relationshipType = 'unknown',
      topics = [],
      topicHistory = [],
    } = context;

    const nextReply = this.predictNextReply(messageHistory, context);
    const nextEmotion = this.predictNextEmotion(emotionTimeline, context);
    const nextTopic = this.predictTopicChange(topicHistory, context);
    const nextContent = this.predictContentType(context);

    const signalsUsed = [
      currentEmotion.emotion !== 'neutral',
      emotionTimeline.length > 0,
      !!conversationState,
      momentum.isActive !== undefined,
      topics.length > 0,
    ].filter(Boolean).length;

    return {
      nextReply,
      nextEmotion,
      nextTopic,
      nextGif: this._predictNextGif(conversationState, currentEmotion.emotion, nextContent),
      nextEmoji: this._predictEmoji(conversationState, currentEmotion.emotion),
      nextSong: this._predictSong(conversationState, currentEmotion.emotion),
      nextVideo: this._predictVideo(conversationState, currentEmotion.emotion, topics),
      nextState: this.predictNextState(conversationState),
      nextQuestion: this._predictNextQuestion(messageHistory, context),
      conversationOutcome: this._predictOutcome(momentum, currentEmotion, conversationState),
      metadata: {
        computationTime: Date.now() - startTime,
        signalsUsed,
        modelVersion: MODEL_VERSION,
      },
    };
  }

  predictNextEmotion(emotionTimeline = [], context = {}) {
    const current = emotionTimeline.length > 0
      ? emotionTimeline[emotionTimeline.length - 1]
      : { emotion: 'neutral', weight: 4 };
    const currentEmotion = current.emotion || 'neutral';

    const transitions = EMOTION_TRANSITIONS[currentEmotion] || ['neutral', 'happy', 'sad'];
    const perEmotion = {};
    let totalProb = 0;

    for (const emo of transitions) {
      const prob = this._getTransitionProbability(currentEmotion, emo, emotionTimeline);
      perEmotion[emo] = prob;
      totalProb += prob;
    }

    if (emotionTimeline.length >= 3) {
      const recent = emotionTimeline.slice(-3).map(e => e.weight || EMOTION_WEIGHTS[e.emotion] || 4);
      const trend = recent[recent.length - 1] - recent[0];
      if (trend > 2) {
        const positive = transitions.filter(t => (EMOTION_WEIGHTS[t] || 4) > 5);
        if (positive.length) {
          perEmotion[positive[0]] = (perEmotion[positive[0]] || 0) + 0.15;
          totalProb += 0.15;
        }
      } else if (trend < -2) {
        const negative = transitions.filter(t => (EMOTION_WEIGHTS[t] || 4) < 3);
        if (negative.length) {
          perEmotion[negative[0]] = (perEmotion[negative[0]] || 0) + 0.1;
          totalProb += 0.1;
        }
      }
    }

    for (const emo of Object.keys(perEmotion)) {
      perEmotion[emo] = Math.min(1, perEmotion[emo] / (totalProb || 1));
    }

    const sorted = Object.entries(perEmotion).sort((a, b) => b[1] - a[1]);
    const best = sorted[0] || ['neutral', 0.4];

    let confidence = 0.3 + (emotionTimeline.length > 5 ? 0.2 : 0) + (emotionTimeline.length > 10 ? 0.1 : 0);
    confidence = Math.min(0.95, confidence);

    return {
      emotion: best[0],
      confidence,
      probability: { perEmotion },
    };
  }

  predictNextState(conversationState = 'small_talk') {
    const transitions = STATE_TRANSITIONS[conversationState]
      || VALID_TRANSITIONS[conversationState]
      || ['small_talk', 'discussion', 'ending'];

    const state = transitions[0] || 'small_talk';
    const confidence = 0.4;

    return { state, confidence };
  }

  predictNextReply(messages = [], context = {}) {
    const {
      currentEmotion = { emotion: 'neutral' },
      conversationState = 'small_talk',
      relationshipType = 'unknown',
      topics = [],
    } = context;

    const suggestions = [];
    const emotion = currentEmotion.emotion;
    const state = conversationState;
    const currentTopic = topics?.[0]?.topic || 'general';

    if (['sad', 'anxious', 'worried', 'hurt', 'lonely'].includes(emotion)) {
      suggestions.push('I\'m here for you', 'Do you want to talk about it?', 'It\'s okay to feel this way', 'I understand how you feel', 'Sending you good vibes');
    }
    if (['happy', 'joyful', 'excited'].includes(emotion)) {
      suggestions.push('That\'s amazing!', 'I\'m so happy for you!', 'Tell me more about it!', 'That\'s wonderful news!');
    }
    if (['angry', 'frustrated', 'annoyed'].includes(emotion)) {
      suggestions.push('I hear you', 'Let\'s work through this', 'Take your time', 'I\'m on your side');
    }
    if (['romantic', 'flirty', 'loved'].includes(emotion)) {
      suggestions.push('You make me smile', 'I\'ve been thinking about you', 'You\'re so sweet', 'You mean so much to me');
    }

    if (state === 'greeting') {
      suggestions.push('How are you?', 'What\'s up?', 'How was your day?', 'Good to see you!');
    }
    if (state === 'discussion') {
      suggestions.push('What do you think?', 'That\'s a good point', 'I see what you mean', 'Have you considered this?');
    }
    if (state === 'planning') {
      suggestions.push('Sounds like a plan!', 'What time works for you?', 'I\'ll be there', 'Let me check my schedule');
    }
    if (state === 'celebration') {
      suggestions.push('Congratulations!', 'So proud of you!', 'You deserve it!', 'Let\'s celebrate!');
    }
    if (state === 'support') {
      suggestions.push('I\'m here for you', 'You\'ve got this', 'Stay strong', 'How can I help?');
    }
    if (state === 'argument') {
      suggestions.push('Let\'s take a step back', 'I understand your perspective', 'Maybe we can find common ground', 'I value our conversation');
    }
    if (state === 'apology') {
      suggestions.push('I appreciate that', 'Thank you for saying that', 'Let\'s move forward', 'It means a lot');
    }
    if (state === 'flirting') {
      suggestions.push('You\'re making me blush', 'I like where this is going', 'You\'re so charming');
    }
    if (state === 'professional') {
      suggestions.push('Got it, I\'ll work on that', 'Let me review the details', 'I\'ll keep you updated');
    }
    if (state === 'ending') {
      suggestions.push('Talk to you later!', 'Take care!', 'Have a great day!', 'Goodbye!');
    }

    const topicSuggestions = {
      work: ['How\'s work going?', 'Did you finish the project?', 'How was the meeting?'],
      health: ['How are you feeling?', 'Take care of yourself', 'Did you rest well?'],
      travel: ['Where do you want to go next?', 'That trip sounds amazing', 'When do you leave?'],
      relationships: ['How is everything going?', 'I hope things are okay', 'You deserve the best'],
      food: ['What\'s your favorite dish?', 'Are you hungry?', 'What should we eat?'],
      movies: ['Seen any good movies lately?', 'What genre do you like?', 'I can recommend something'],
      music: ['What music are you into?', 'Listening to anything good?', 'Share your playlist!'],
      gaming: ['What games are you playing?', 'Up for a game?', 'What\'s your favorite game?'],
      celebration: ['Happy celebration!', 'How are you celebrating?', 'Enjoy the moment!'],
      school: ['How are your exams going?', 'What are you studying?', 'How\'s school?'],
      family: ['How\'s your family doing?', 'Give my regards!', 'Spending time with family?'],
      technology: ['Any new tech you\'re excited about?', 'What gadget are you using?', 'I love tech talk!'],
    };

    if (topicSuggestions[currentTopic]) {
      suggestions.push(...topicSuggestions[currentTopic]);
    }

    if (relationshipType === 'romantic' || relationshipType === 'spouse') {
      suggestions.push('I miss you', 'Thinking of you', 'Can\'t wait to see you');
    }

    const unique = [...new Set(suggestions)];
    unique.sort(() => Math.random() - 0.5);

    const scored = unique.slice(0, 8).map((text, i) => ({
      text,
      confidence: Math.max(0.3, 0.7 - i * 0.06),
    }));

    return {
      text: scored[0]?.text || '',
      suggestions: scored.map(s => s.text),
      confidence: scored[0]?.confidence || 0.4,
    };
  }

  predictTopicChange(topicHistory = [], context = {}) {
    const { topics = [] } = context;

    if (topics.length >= 2) {
      const sorted = [...topics].sort((a, b) => b.lastSeen - a.lastSeen);
      const current = sorted[0];
      const previous = sorted[1];
      if (current.topic !== previous.topic) {
        return {
          topic: current.topic,
          isChange: true,
          confidence: 0.6,
        };
      }
    }

    const topic = topicHistory?.[0]?.topic || topics?.[0]?.topic || 'general';
    return {
      topic,
      isChange: false,
      confidence: 0.7,
    };
  }

  predictContentType(context = {}) {
    const {
      currentEmotion = { emotion: 'neutral' },
      conversationState = 'small_talk',
      momentum = {},
    } = context;

    const emotion = currentEmotion.emotion;
    const state = conversationState;

    if (['sad', 'hurt', 'lonely'].includes(emotion)) return 'hug';
    if (['happy', 'joyful', 'excited'].includes(emotion)) return 'celebration';
    if (['romantic', 'flirty', 'loved'].includes(emotion)) return 'romance';
    if (['angry', 'frustrated'].includes(emotion)) return 'calming';
    if (emotion === 'anxious' || emotion === 'worried') return 'reassurance';

    if (state === 'celebration') return 'party';
    if (state === 'flirting') return 'romance';
    if (state === 'support') return 'inspiration';
    if (state === 'professional') return 'information';
    if (state === 'planning') return 'organization';

    if (momentum.isExciting) return 'interactive';
    if (momentum.isDead) return 'reengagement';

    return 'conversation';
  }

  _getTransitionProbability(fromEmotion, toEmotion, timeline) {
    const trans = EMOTION_TRANSITIONS[fromEmotion] || ['neutral', 'happy', 'sad'];
    let prob = 1 / Math.max(trans.length, 1);

    if (timeline.length >= 3) {
      const recent = timeline.slice(-3);
      let fromCount = 0;
      let toCount = 0;
      for (let i = 0; i < recent.length - 1; i++) {
        if (recent[i].emotion === toEmotion && recent[i + 1].emotion === fromEmotion) toCount++;
        if (recent[i].emotion === fromEmotion) fromCount++;
      }
      if (fromCount > 0) {
        prob += (toCount / fromCount) * 0.2;
      }
    }

    const fromWeight = EMOTION_WEIGHTS[fromEmotion] || 4;
    const toWeight = EMOTION_WEIGHTS[toEmotion] || 4;
    const diff = toWeight - fromWeight;
    if (diff > 3) prob += 0.05;
    else if (diff < -3) prob += 0.02;

    const volatility = timeline.length >= 3
      ? timeline.slice(-3).filter(e => Math.abs((EMOTION_WEIGHTS[e.emotion] || 4) - fromWeight) > 3).length / 3
      : 0;
    if (volatility > 0.5) {
      prob += 0.05;
    }

    return Math.max(0.05, Math.min(0.9, prob));
  }

  _predictNextGif(state, emotion, contentPrediction) {
    const gifMap = {
      greeting: 'waving',
      celebration: 'dancing',
      flirting: 'romantic',
      support: 'hug',
      apology: 'sorry',
      ending: 'wave',
    };
    const emotionGifMap = {
      happy: 'happy',
      sad: 'sad',
      excited: 'excited',
      romantic: 'romantic',
      angry: 'angry',
    };

    const query = gifMap[state] || emotionGifMap[emotion] || contentPrediction || 'reaction';
    return { query, confidence: 0.6 };
  }

  _predictEmoji(state, emotion) {
    const stateEmojiMap = {
      greeting: '👋', celebration: '🎉', flirting: '💕', argument: '🤝',
      apology: '🥺', support: '🫂', planning: '📅', ending: '👋',
      discussion: '💭', small_talk: '😊', professional: '💼',
    };
    const emotionEmojiMap = {
      joyful: '🎊', excited: '🔥', happy: '😊', grateful: '🙏', loved: '💖',
      romantic: '💕', flirty: '😉', neutral: '👍', confused: '🤔', surprised: '😮',
      anxious: '😰', worried: '😟', sad: '😢', angry: '😠', frustrated: '😤',
      annoyed: '🙄', hurt: '💔', guilty: '😔', apologetic: '🥺', hopeful: '🌟',
    };
    const emoji = stateEmojiMap[state] || emotionEmojiMap[emotion] || '💬';
    return { emoji, confidence: 0.65 };
  }

  _predictSong(state, emotion) {
    const songMap = {
      celebration: 'upbeat celebration',
      flirting: 'romantic ballads',
      support: 'inspirational',
      ending: 'soft goodbye',
      greeting: 'welcome tune',
    };
    const emotionSongMap = {
      happy: 'upbeat pop', sad: 'melancholy acoustic', romantic: 'love ballads',
      angry: 'calming', excited: 'dance electronic', neutral: 'chill lo-fi',
      flirty: 'rnb', hopeful: 'inspirational',
    };
    const title = songMap[state] || emotionSongMap[emotion] || 'chill pop';
    return { title, confidence: 0.5 };
  }

  _predictVideo(state, emotion, topics) {
    const videoMap = {
      celebration: 'party moments',
      flirting: 'romantic scenes',
      support: 'motivational',
      planning: 'how to',
      discussion: 'educational',
    };
    const currentTopic = topics?.[0]?.topic || 'general';
    const query = videoMap[state] || `${currentTopic} related`;
    return { query, confidence: 0.45 };
  }

  _predictNextQuestion(messages = [], context = {}) {
    const { emotionTimeline = [], topics = [] } = context;
    const state = context.conversationState || 'small_talk';
    const emotion = context.currentEmotion?.emotion || 'neutral';

    const questionsByState = {
      greeting: 'How are you feeling today?',
      discussion: 'What do you think about that?',
      planning: 'What works best for you?',
      support: 'How can I support you?',
      flirting: 'What\'s on your mind?',
      celebration: 'What else are you excited about?',
      professional: 'Any updates on this?',
      ending: 'When can we talk again?',
    };

    const emotionQuestions = {
      sad: 'Would you like to talk more about it?',
      angry: 'Do you want to tell me what happened?',
      anxious: 'What\'s making you feel this way?',
      happy: 'What made your day so great?',
      excited: 'Tell me everything!',
      romantic: 'What are you thinking about?',
    };

    let text = questionsByState[state] || emotionQuestions[emotion] || '';
    if (!text) {
      text = topics?.[0]?.topic === 'general'
        ? 'What would you like to talk about?'
        : 'How does that make you feel?';
    }

    let confidence = 0.5;
    if (state === 'discussion' || state === 'support') confidence = 0.7;
    if (emotion === 'sad' || emotion === 'anxious') confidence = 0.65;

    return { text, confidence };
  }

  _predictOutcome(momentum = {}, currentEmotion = {}, conversationState = '') {
    const emotion = currentEmotion.emotion || 'neutral';
    let likelyOutcome = 'continue normally';
    let confidence = 0.5;

    if (momentum.isDead) {
      likelyOutcome = 'conversation ending';
      confidence = 0.6;
    } else if (momentum.isExciting) {
      likelyOutcome = 'conversation deepening';
      confidence = 0.55;
    } else if (['sad', 'angry', 'frustrated', 'anxious'].includes(emotion)) {
      likelyOutcome = 'needs emotional support';
      confidence = 0.5;
    } else if (['happy', 'joyful', 'excited'].includes(emotion)) {
      likelyOutcome = 'positive engagement';
      confidence = 0.6;
    } else if (conversationState === 'planning') {
      likelyOutcome = 'reaching agreement';
      confidence = 0.55;
    } else if (conversationState === 'argument') {
      likelyOutcome = 'potential conflict resolution';
      confidence = 0.5;
    } else if (conversationState === 'ending') {
      likelyOutcome = 'conversation concluding';
      confidence = 0.7;
    }

    return { likelyOutcome, confidence };
  }
}

module.exports = FuturePredictionEngine;