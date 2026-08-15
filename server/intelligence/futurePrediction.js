const { STATES } = require('./conversationState');

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

const RECOMMENDATION_MAP = {
  greeting: { emoji: 'wave', sticker: 'hello', gif: 'waving', action: 'greet' },
  celebration: { emoji: 'party', sticker: 'celebrate', gif: 'dancing', song: 'happy', action: 'congratulate' },
  flirting: { emoji: 'heart', sticker: 'romantic', gif: 'kiss', song: 'romantic', action: 'compliment' },
  argument: { emoji: 'sorry', sticker: 'apology', gif: 'sorry', song: 'calm', action: 'apologize' },
  apology: { emoji: 'forgive', sticker: 'forgive', gif: 'hug', action: 'reassure' },
  support: { emoji: 'hug', sticker: 'support', gif: 'hug', song: 'inspire', action: 'encourage' },
  planning: { emoji: 'calendar', sticker: 'plan', action: 'confirm' },
  ending: { emoji: 'bye', sticker: 'wave', gif: 'wave', action: 'say_goodbye' },
};

class FuturePrediction {
  predict(messages = [], analysis = {}) {
    const {
      currentEmotion = { emotion: 'neutral' },
      emotionTimeline = [],
      conversationState = 'small_talk',
      momentum = {},
      relationshipType = 'unknown',
      topics = [],
    } = analysis;

    const nextEmotion = this._predictNextEmotion(currentEmotion.emotion, emotionTimeline);
    const nextState = this._predictNextState(conversationState, momentum);
    const suggestedReplies = this._suggestReplies(conversationState, currentEmotion.emotion, relationshipType, topics);
    const suggestedActions = this._predictActions(conversationState, currentEmotion.emotion);
    const conversationIntent = this._predictIntent(conversationState, topics, currentEmotion.emotion);

    return {
      nextEmotion: {
        emotion: nextEmotion.emotion,
        confidence: nextEmotion.confidence,
        alternatives: nextEmotion.alternatives,
      },
      nextState: {
        state: nextState.state,
        confidence: nextState.confidence,
        alternatives: nextState.alternatives,
      },
      suggestedReplies: suggestedReplies.slice(0, 5),
      suggestedActions: suggestedActions.slice(0, 3),
      conversationIntent,
      momentumPrediction: this._predictMomentum(momentum),
      needIntervention: this._needIntervention(conversationState, currentEmotion.emotion, momentum),
    };
  }

  _predictNextEmotion(currentEmotion, timeline) {
    const transitions = EMOTION_TRANSITIONS[currentEmotion] || ['neutral', 'happy', 'sad'];
    let likely = transitions[0];
    let confidence = 0.3 + (timeline.length > 5 ? 0.2 : 0);

    if (timeline.length >= 3) {
      const recentWeights = timeline.slice(-3).map(e => e.weight || 4);
      const trend = recentWeights[2] - recentWeights[0];
      if (trend > 2) {
        const positiveTransitions = transitions.filter(t => {
          const w = { joyful: 10, excited: 9, happy: 7, grateful: 8, loved: 9, romantic: 6, neutral: 4, hopeful: 6 }[t] || 4;
          return w > 5;
        });
        if (positiveTransitions.length > 0) { likely = positiveTransitions[0]; confidence += 0.15; }
      } else if (trend < -2) {
        const negativeTransitions = transitions.filter(t => {
          const w = { sad: 1, angry: 0, anxious: 2, frustrated: 0, disappointed: 1 }[t] !== undefined;
          return w;
        });
        if (negativeTransitions.length > 0) { likely = negativeTransitions[0]; confidence += 0.1; }
      }
    }

    return {
      emotion: likely,
      confidence: Math.min(0.95, confidence),
      alternatives: transitions.slice(1, 3),
    };
  }

  _predictNextState(currentState, momentum) {
    const transitions = STATE_TRANSITIONS[currentState] || ['small_talk', 'discussion'];
    if (momentum.isExciting) {
      const exciting = transitions.filter(t => ['celebration', 'flirting', 'discussion'].includes(t));
      if (exciting.length > 0) return { state: exciting[0], confidence: 0.5, alternatives: transitions.filter(t => t !== exciting[0]).slice(0, 2) };
    }
    if (momentum.isDead) {
      if (currentState !== 'ending') return { state: 'ending', confidence: 0.4, alternatives: transitions.slice(0, 2) };
    }
    return {
      state: transitions[0],
      confidence: 0.4,
      alternatives: transitions.slice(1, 3),
    };
  }

  _suggestReplies(state, emotion, relationship, topics) {
    const contextual = [];
    const currentTopic = topics?.[0]?.topic || 'general';

    if (emotion === 'sad' || emotion === 'anxious') {
      contextual.push('Are you okay?', 'I\'m here for you', 'Do you want to talk about it?', 'Sending you a hug', 'It\'ll be okay');
    }
    if (emotion === 'happy' || emotion === 'excited') {
      contextual.push('That\'s amazing!', 'I\'m so happy for you!', 'Tell me more!', 'That\'s awesome!');
    }
    if (emotion === 'angry' || emotion === 'frustrated') {
      contextual.push('I understand', 'Let\'s take a step back', 'Maybe we can talk about this', 'I hear you');
    }
    if (emotion === 'romantic' || emotion === 'flirty') {
      contextual.push('You\'re so sweet', 'I\'ve been thinking about you', 'You make me smile', 'I miss you');
    }
    if (state === 'greeting') {
      contextual.push('How are you?', 'What\'s up?', 'How was your day?', 'Good to see you!', 'What have you been up to?');
    }
    if (state === 'planning') {
      contextual.push('Sounds like a plan!', 'What time works for you?', 'Should I bring anything?', 'I\'ll be there', 'Let me check my schedule');
    }
    if (state === 'celebration') {
      contextual.push('Congratulations!', 'So proud of you!', 'Let\'s celebrate!', 'You deserve it!', 'This calls for a party!');
    }
    if (state === 'ending') {
      contextual.push('Talk to you later!', 'Take care!', 'Goodbye!', 'See you soon!', 'Have a great day!');
    }

    if (currentTopic === 'work') contextual.push('How\'s work going?', 'Did you finish the project?');
    if (currentTopic === 'health') contextual.push('How are you feeling?', 'Take care of yourself!', 'Did you see the doctor?');
    if (currentTopic === 'travel') contextual.push('Where do you want to go next?', 'That trip sounds amazing!', 'When are you leaving?');
    if (currentTopic === 'relationships') contextual.push('How is everything going?', 'I hope things are okay', 'You deserve the best');

    const unique = [...new Set(contextual)];
    unique.sort(() => Math.random() - 0.5);
    return unique.slice(0, 8).map((text, i) => ({
      text,
      confidence: Math.max(0.3, 0.7 - i * 0.08),
      category: this._categorizeReply(text),
    }));
  }

  _predictActions(state, emotion) {
    const recs = RECOMMENDATION_MAP[state];
    if (!recs) return [{ action: 'continue', confidence: 0.5 }];
    return Object.entries(recs).filter(([k]) => k !== 'action').map(([type, value]) => ({
      type,
      value,
      confidence: 0.6,
    }));
  }

  _predictIntent(state, topics, emotion) {
    if (state === 'planning') return 'arranging';
    if (state === 'argument') return 'conflict';
    if (state === 'celebration') return 'sharing_joy';
    if (state === 'flirting') return 'romantic_interest';
    if (state === 'support') return 'seeking_support';
    if (emotion === 'sad' || emotion === 'anxious') return 'seeking_comfort';
    if (emotion === 'happy' || emotion === 'excited') return 'sharing_excitement';
    if (topics?.[0]?.topic === 'work') return 'professional';
    return 'casual';
  }

  _predictMomentum(momentum) {
    if (momentum.isDead) return 'conversation may end soon';
    if (momentum.isExciting) return 'conversation likely to intensify';
    if (momentum.trend === 'accelerating') return 'conversation speeding up';
    if (momentum.trend === 'decelerating') return 'conversation slowing down';
    return 'steady pace expected';
  }

  _needIntervention(state, emotion, momentum) {
    if (momentum.isDead && state !== 'ending') return true;
    if (emotion === 'sad' || emotion === 'angry') return true;
    if (momentum.isPaused) return true;
    return false;
  }

  _categorizeReply(text) {
    if (text.includes('?')) return 'question';
    if (text.includes('!')) return 'exclamation';
    if (text.includes('okay') || text.includes('fine')) return 'acknowledgment';
    if (text.includes('love') || text.includes('miss')) return 'affection';
    if (text.includes('sorry') || text.includes('apologize')) return 'apology';
    if (text.includes('congrat') || text.includes('amazing') || text.includes('awesome')) return 'praise';
    return 'statement';
  }
}

module.exports = new FuturePrediction();
