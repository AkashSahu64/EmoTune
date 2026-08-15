const TIME_OF_DAY = {
  morning: { start: 5, end: 11, label: 'morning' },
  afternoon: { start: 12, end: 16, label: 'afternoon' },
  evening: { start: 17, end: 20, label: 'evening' },
  night: { start: 21, end: 4, label: 'night' },
};

const EMOJI_TEMPLATES = {
  joyful: '😊 matches your joyful mood',
  happy: '😊 matches your happy mood',
  excited: '🔥 matches your excited mood',
  grateful: '🙏 matches your grateful mood',
  loved: '💕 matches your loving mood',
  romantic: '💕 matches your romantic mood',
  flirty: '😉 matches your flirty mood',
  neutral: '👍 neutral suggestion for your current mood',
  sad: '💙 matches your mood right now',
  angry: '💢 matches your frustrated mood',
  anxious: '💫 gentle suggestion for your anxious mood',
  hopeful: '✨ matches your hopeful mood',
  supportive: '🤗 matches your supportive mood',
  celebration: '🎉 perfect for celebrating',
};

const GIF_TEMPLATES = {
  joyful: 'animated GIF for your joyful mood',
  happy: 'happy GIF that matches your mood',
  sad: 'heartfelt GIF for this moment',
  angry: 'calming GIF for you',
  romantic: 'romantic GIF for your mood',
  flirty: 'playful GIF for your flirty mood',
  celebration: 'celebratory GIF',
};

const SHAYARI_TEMPLATES = {
  romantic: 'Romantic shayari for your heartfelt conversation',
  sad: 'Expressive shayari that matches your mood',
  motivational: 'Motivational shayari to uplift the conversation',
  friendship: 'Heartfelt shayari celebrating your bond',
  love: 'Love shayari for your romantic moment',
};

const SONG_TEMPLATES = {
  'upbeat pop': 'Upbeat pop song for your happy mood',
  'melancholy acoustic': 'Melancholy acoustic melody for your mood',
  'love ballads': 'Romantic ballad for this intimate moment',
  rock: 'Energetic rock that matches your intensity',
  'dance electronic': 'Energetic dance track for your excitement',
  'chill lo-fi': 'Chill lo-fi beats for a relaxed conversation',
  rnb: 'Smooth R&B for your vibe',
  inspirational: 'Inspirational song to keep the mood uplifting',
  party: 'Party anthem for this celebration',
};

const SIGNAL_NAMES = ['emotion', 'relationship', 'topic', 'goal', 'dna', 'time', 'state', 'memory', 'freshness'];

const SIGNAL_WEIGHTS = {
  emotion: 0.25,
  relationship: 0.15,
  topic: 0.12,
  goal: 0.10,
  dna: 0.13,
  time: 0.05,
  state: 0.10,
  memory: 0.12,
  freshness: 0.08,
};

class ExplainableAI {
  explainRecommendation(recommendation, context = {}) {
    const { type = 'emoji', value = '' } = recommendation;
    const explanations = this._generateSignalExplanations(recommendation, context);
    const summary = this._generateSummary(recommendation, context, explanations);
    const topSignals = explanations
      .filter(s => s.contribution !== 'neutral')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(s => s.detail);

    return {
      item: { type, value },
      summary,
      confidence: this._calculateConfidence(explanations),
      signals: explanations,
      topSignals: topSignals.length > 0 ? topSignals : ['General recommendation based on conversation context'],
      alternativeConsidered: this._getAlternativeConsidered(context),
      relationshipImpact: this._getRelationshipImpact(recommendation, context),
      emotionImpact: this._getEmotionImpact(recommendation, context),
      goalImpact: this._getGoalImpact(recommendation, context),
    };
  }

  _generateSignalExplanations(recommendation, context = {}) {
    const { type, value } = recommendation;
    const emotion = context.currentEmotion || context.emotion || 'neutral';
    const relationshipType = context.relationshipType || 'unknown';
    const topic = context.topics ? (Array.isArray(context.topics) ? context.topics[0] : context.topics) : null;
    const goal = context.goal || null;
    const dna = context.dna || {};
    const state = context.conversationState || 'small_talk';
    const timeOfDay = this._getTimeOfDay();
    const hasMemory = !!(context.memoryMatch || context.similarPastInteraction);

    const signals = [];

    signals.push(this._buildSignal('emotion', SIGNAL_WEIGHTS.emotion, `Matches your ${emotion} mood`));

    signals.push(this._buildSignal('relationship', SIGNAL_WEIGHTS.relationship,
      `Suitable for ${relationshipType} conversations`));

    signals.push(this._buildSignal('topic', SIGNAL_WEIGHTS.topic,
      topic ? `Related to your discussion about ${topic}` : 'General conversation topic'));

    signals.push(this._buildSignal('goal', SIGNAL_WEIGHTS.goal,
      goal ? `Supports your conversation goal of ${goal}` : 'Maintains natural conversation flow'));

    const dnaAttr = dna.writingStyle ? this._getTopDNAStyle(dna.writingStyle) : null;
    signals.push(this._buildSignal('dna', SIGNAL_WEIGHTS.dna,
      dnaAttr ? `Based on your preference for ${dnaAttr}` : 'Matches your general communication style'));

    signals.push(this._buildSignal('time', SIGNAL_WEIGHTS.time, `Perfect for ${timeOfDay}`));

    signals.push(this._buildSignal('state', SIGNAL_WEIGHTS.state, `Fits the ${state} of conversation`));

    signals.push(this._buildSignal('memory', SIGNAL_WEIGHTS.memory,
      hasMemory ? "You've enjoyed this before" : 'New suggestion for variety'));

    const isFresh = context._freshnessScore == null || context._freshnessScore >= 0;
    signals.push(this._buildSignal('freshness', SIGNAL_WEIGHTS.freshness,
      isFresh ? "Haven't suggested this recently" : 'Popular option worth repeating'));

    return signals;
  }

  _buildSignal(name, baseWeight, detail) {
    const weight = SIGNAL_WEIGHTS[name] || baseWeight;
    const contribution = detail.includes('Not') || detail.includes('General') || detail.includes('Maintains') ? 'neutral' : 'positive';
    return { name, weight, contribution, detail };
  }

  _getTopDNAStyle(writingStyle) {
    const styles = [
      { key: 'formalScore', label: 'formal' },
      { key: 'casualScore', label: 'casual' },
      { key: 'humorScore', label: 'humorous' },
      { key: 'romanticScore', label: 'romantic' },
      { key: 'professionalScore', label: 'professional' },
      { key: 'creativityScore', label: 'creative' },
      { key: 'kindnessScore', label: 'kind' },
    ];
    let top = { label: 'balanced', score: 0 };
    for (const style of styles) {
      const score = writingStyle[style.key] || 0;
      if (score > top.score) top = { label: style.label, score };
    }
    return top.score > 0.15 ? top.label : null;
  }

  _generateSummary(recommendation, context = {}, explanations) {
    const { type, value } = recommendation;
    const emotion = typeof context.currentEmotion === 'object' ? context.currentEmotion.emotion || context.currentEmotion : context.currentEmotion || context.emotion || 'neutral';
    const timeOfDay = this._getTimeOfDay();
    const genre = context.genre || context.preferredGenre || '';
    const category = context.category || value || '';
    const goal = context.goal || '';
    const writingStyle = context.writingStyle || context.dna?.writingStyle || {};
    const state = context.conversationState || '';

    const nameOrValue = typeof value === 'string' ? value : value?.name || value?.title || value?.query || value?.text || 'this';

    switch (type) {
      case 'emoji':
        return `${EMOJI_TEMPLATES[emotion] || '😊 suggestion for your current mood'} ${timeOfDay === 'morning' || timeOfDay === 'afternoon' ? 'this ' + timeOfDay : 'in the ' + timeOfDay}`;
      case 'song':
        return `${nameOrValue} because you're in a ${emotion} mood and enjoy ${genre || 'your preferred music'}`;
      case 'gif':
        return `A ${category || 'animated'} GIF fits your ${emotion} conversation`;
      case 'shayari':
        return `${SHAYARI_TEMPLATES[value] || 'Expressive shayari'} ${timeOfDay === 'evening' || timeOfDay === 'night' ? 'for your ' + timeOfDay : 'for your ' + timeOfDay + ' conversation'}`;
      case 'sticker':
        return `${value || 'A'} sticker that matches your ${emotion} mood`;
      case 'reply':
        return `This reply matches your ${writingStyle.preferredReplyLength || 'natural'} style${goal ? ' and ' + goal + ' goal' : ''}`;
      case 'video':
        return `${category || 'A video'} related to your ${emotion} mood`;
      default:
        return `${nameOrValue} recommended based on your conversation context`;
    }
  }

  _getAlternativeConsidered(context = {}) {
    const emotion = context.currentEmotion?.emotion || context.emotion || 'neutral';
    const state = context.conversationState || 'small_talk';

    const alternatives = {
      emotion: {
        sad: { type: 'shayari', reason: 'expressive shayari for your feelings' },
        angry: { type: 'song', reason: 'a calming song to ease tension' },
        happy: { type: 'sticker', reason: 'a fun sticker' },
        romantic: { type: 'song', reason: 'a romantic song' },
        flirty: { type: 'gif', reason: 'a playful GIF' },
        neutral: { type: 'emoji', reason: 'a simple emoji' },
        excited: { type: 'gif', reason: 'an exciting GIF' },
        anxious: { type: 'song', reason: 'a soothing song' },
        grateful: { type: 'emoji', reason: 'a warm emoji' },
      },
      state: {
        greeting: { type: 'emoji', reason: 'a greeting emoji' },
        celebration: { type: 'song', reason: 'a celebratory song' },
        flirting: { type: 'gif', reason: 'a flirty GIF' },
        argument: { type: 'reply', reason: 'a de-escalating reply' },
        support: { type: 'sticker', reason: 'a supportive sticker' },
        ending: { type: 'reply', reason: 'a closing message' },
      },
    };

    const alt = alternatives.emotion[emotion] || alternatives.state[state] || { type: 'emoji', reason: 'a different emoji' };
    return `Considered ${alt.type} — ${alt.reason} instead`;
  }

  _getRelationshipImpact(recommendation, context = {}) {
    const relationshipType = context.relationshipType || 'unknown';
    const type = recommendation.type || 'emoji';

    const positiveTypes = ['song', 'shayari', 'sticker'];
    const neutralTypes = ['emoji', 'reply'];
    const riskyTypes = ['action', 'suggestion'];

    const scoreMap = {
      friend: { positive: 0.5, neutral: 0.2, risky: -0.1 },
      best_friend: { positive: 0.7, neutral: 0.3, risky: -0.2 },
      romantic: { positive: 0.9, neutral: 0.4, risky: -0.3 },
      spouse: { positive: 0.8, neutral: 0.4, risky: -0.2 },
      family: { positive: 0.6, neutral: 0.3, risky: -0.1 },
      sibling: { positive: 0.6, neutral: 0.3, risky: -0.1 },
      parent: { positive: 0.5, neutral: 0.2, risky: -0.2 },
      colleague: { positive: 0.3, neutral: 0.5, risky: -0.4 },
      boss: { positive: 0.2, neutral: 0.6, risky: -0.5 },
      client: { positive: 0.2, neutral: 0.6, risky: -0.5 },
      teacher: { positive: 0.3, neutral: 0.5, risky: -0.3 },
      unknown: { positive: 0.3, neutral: 0.5, risky: -0.1 },
    };

    const rel = scoreMap[relationshipType] || scoreMap.unknown;
    let score = 0;
    let description = '';

    if (positiveTypes.includes(type)) {
      score = rel.positive;
      description = type === 'song' ? 'Music strengthens emotional connection' :
        type === 'shayari' ? 'Poetry deepens rapport' :
        type === 'sticker' ? 'Visual expression builds warmth' : 'Positive contribution to relationship';
    } else if (neutralTypes.includes(type)) {
      score = rel.neutral;
      description = 'Maintains current relationship dynamic';
    } else {
      score = rel.risky;
      description = `May be ${score < 0 ? 'too bold' : 'neutral'} for ${relationshipType} relationship`;
    }

    return { score, description };
  }

  _getEmotionImpact(recommendation, context = {}) {
    const emotion = context.currentEmotion?.emotion || context.emotion || 'neutral';
    const type = recommendation.type || 'emoji';

    const impactByEmotion = {
      sad: { emoji: 0.5, sticker: 0.4, shayari: 0.6, song: 0.7, reply: 0.3, gif: 0.3, video: 0.2, action: 0.1 },
      angry: { emoji: 0.3, sticker: 0.4, shayari: 0.2, song: 0.6, reply: 0.5, gif: 0.3, video: 0.2, action: 0.2 },
      happy: { emoji: 0.4, sticker: 0.6, shayari: 0.3, song: 0.7, reply: 0.3, gif: 0.6, video: 0.4, action: 0.3 },
      romantic: { emoji: 0.5, sticker: 0.4, shayari: 0.8, song: 0.9, reply: 0.2, gif: 0.4, video: 0.3, action: 0.1 },
      flirty: { emoji: 0.5, sticker: 0.5, shayari: 0.6, song: 0.8, reply: 0.3, gif: 0.6, video: 0.3, action: 0.2 },
      excited: { emoji: 0.4, sticker: 0.6, shayari: 0.2, song: 0.8, reply: 0.2, gif: 0.7, video: 0.5, action: 0.4 },
      neutral: { emoji: 0.3, sticker: 0.3, shayari: 0.2, song: 0.4, reply: 0.3, gif: 0.3, video: 0.2, action: 0.1 },
      anxious: { emoji: 0.4, sticker: 0.4, shayari: 0.3, song: 0.6, reply: 0.4, gif: 0.2, video: 0.2, action: 0.2 },
      grateful: { emoji: 0.5, sticker: 0.4, shayari: 0.5, song: 0.6, reply: 0.2, gif: 0.3, video: 0.2, action: 0.1 },
      joyful: { emoji: 0.5, sticker: 0.7, shayari: 0.3, song: 0.8, reply: 0.2, gif: 0.6, video: 0.4, action: 0.3 },
    };

    const impacts = impactByEmotion[emotion] || impactByEmotion.neutral;
    const score = impacts[type] || 0.3;

    const desc = score > 0.6 ? `Significantly boosts your ${emotion} mood` :
      score > 0.3 ? `Gently reinforces your ${emotion} mood` :
      `Minimal emotional impact for your ${emotion} mood`;

    return { score, description: desc };
  }

  _getGoalImpact(recommendation, context = {}) {
    const goalTypes = {
      'resolve conflict': { song: 0.3, shayari: 0.2, emoji: 0.4, reply: 0.7, sticker: 0.5, gif: 0.3, action: 0.6 },
      'express love': { song: 0.9, shayari: 0.8, emoji: 0.6, reply: 0.4, sticker: 0.5, gif: 0.5, action: 0.2 },
      'cheer up': { song: 0.7, shayari: 0.5, emoji: 0.5, reply: 0.4, sticker: 0.7, gif: 0.7, action: 0.3 },
      'make plans': { song: 0.2, shayari: 0.1, emoji: 0.3, reply: 0.8, sticker: 0.3, gif: 0.2, action: 0.7 },
      'celebrate': { song: 0.8, shayari: 0.3, emoji: 0.5, reply: 0.3, sticker: 0.7, gif: 0.8, action: 0.5 },
      'apologize': { song: 0.5, shayari: 0.4, emoji: 0.5, reply: 0.6, sticker: 0.5, gif: 0.3, action: 0.4 },
      'discuss': { song: 0.1, shayari: 0.1, emoji: 0.3, reply: 0.8, sticker: 0.2, gif: 0.1, action: 0.3 },
      'flirt': { song: 0.7, shayari: 0.6, emoji: 0.6, reply: 0.4, sticker: 0.5, gif: 0.7, action: 0.3 },
      'support': { song: 0.5, shayari: 0.4, emoji: 0.4, reply: 0.7, sticker: 0.6, gif: 0.4, action: 0.5 },
      'casual': { song: 0.3, shayari: 0.2, emoji: 0.4, reply: 0.5, sticker: 0.4, gif: 0.3, action: 0.2 },
      'professional': { song: 0.1, shayari: 0.1, emoji: 0.3, reply: 0.7, sticker: 0.1, gif: 0.1, action: 0.4 },
      'connect': { song: 0.6, shayari: 0.5, emoji: 0.5, reply: 0.5, sticker: 0.5, gif: 0.4, action: 0.3 },
    };

    const goal = context.goal || 'casual';
    const type = recommendation.type || 'emoji';
    const map = goalTypes[goal] || goalTypes.casual;
    const score = map[type] || 0.3;

    const description = score > 0.6 ? `Directly advances your ${goal} goal` :
      score > 0.4 ? `Moderately supports your ${goal} goal` :
      `Indirectly relates to your ${goal} goal`;

    return { score, description };
  }

  formatForDisplay(explanation, format = 'tooltip') {
    const { summary, topSignals, confidence, item } = explanation;

    switch (format) {
      case 'tooltip':
        return `${item.type === 'emoji' ? item.value : ''} ${summary}`.trim();

      case 'panel':
        return [
          `── ${item.type.toUpperCase()} ──`,
          item.value ? `Value: ${item.value}` : '',
          `Summary: ${summary}`,
          `Confidence: ${Math.round(confidence * 100)}%`,
          '',
          '── Signals ──',
          ...explanation.signals.map(s =>
            `  • ${s.name}: ${s.detail} (${s.contribution}, weight: ${s.weight})`
          ),
          '',
          '── Top Reasons ──',
          ...topSignals.map((r, i) => `  ${i + 1}. ${r}`),
          '',
          `Alternative: ${explanation.alternativeConsidered}`,
          '',
          '── Impact Analysis ──',
          `  Relationship: ${explanation.relationshipImpact.score.toFixed(2)} — ${explanation.relationshipImpact.description}`,
          `  Emotion: ${explanation.emotionImpact.score.toFixed(2)} — ${explanation.emotionImpact.description}`,
          `  Goal: ${explanation.goalImpact.score.toFixed(2)} — ${explanation.goalImpact.description}`,
        ].filter(Boolean).join('\n');

      case 'voice':
        const reasons = topSignals.slice(0, 2).join(' and ');
        return `I recommend ${item.type === 'song' ? 'a song' : 'an ' + item.type} because ${reasons.toLowerCase()}. This has a confidence of ${Math.round(confidence * 100)} percent.`;

      default:
        return summary;
    }
  }

  explainPrediction(prediction, context = {}) {
    const { nextEmotion, nextState, suggestedReplies, suggestedActions, conversationIntent } = prediction;
    const signals = [];

    if (nextEmotion) {
      signals.push(this._buildSignal('emotion', 0.25,
        `Predicted to shift to ${nextEmotion.emotion} (${Math.round(nextEmotion.confidence * 100)}% confidence)`));
    }
    if (nextState) {
      signals.push(this._buildSignal('state', 0.20,
        `Conversation likely to move to ${nextState.state}`));
    }
    if (conversationIntent) {
      signals.push(this._buildSignal('goal', 0.15,
        `Detected intent: ${conversationIntent.replace(/_/g, ' ')}`));
    }
    if (suggestedReplies && suggestedReplies.length > 0) {
      signals.push(this._buildSignal('reply', 0.18,
        `${suggestedReplies.length} suggested replies ready`));
    }
    signals.push(this._buildSignal('freshness', 0.08, 'Prediction based on recent conversation patterns'));

    const topSignals = signals
      .filter(s => s.contribution !== 'neutral')
      .slice(0, 3)
      .map(s => s.detail);

    return {
      item: { type: 'prediction', value: nextState?.state || 'unknown' },
      summary: `Conversation likely trending toward ${nextState?.state || 'continuation'} with ${nextEmotion?.emotion || 'neutral'} emotion shift`,
      confidence: nextEmotion?.confidence || 0.5,
      signals,
      topSignals: topSignals.length > 0 ? topSignals : ['Based on conversation momentum and emotion trajectory'],
      alternativeConsidered: nextEmotion?.alternatives
        ? `Alternative emotions considered: ${nextEmotion.alternatives.join(', ')}`
        : 'Standard conversation path prediction',
      relationshipImpact: { score: 0, description: 'Prediction maintains current relationship dynamic' },
      emotionImpact: {
        score: nextEmotion?.confidence || 0,
        description: `Predicted emotional shift toward ${nextEmotion?.emotion || 'neutral'}`,
      },
      goalImpact: { score: 0.3, description: `Prediction aligned with ${conversationIntent || 'current'} trajectory` },
    };
  }

  explainHealthScore(healthAnalysis) {
    const {
      overall = 0.5,
      responsiveness = 0.5,
      emotionalHealth = 0.5,
      topicDiversity = 0.5,
      momentumHealth = 0.5,
      relationshipHealth = 0.5,
    } = healthAnalysis;

    const signals = [
      this._buildSignal('responsiveness', 0.20,
        responsiveness > 0.7 ? 'Strong response rate — conversation is flowing' :
        responsiveness > 0.4 ? 'Moderate response rate' : 'Low response rate — engagement may drop'),
      this._buildSignal('emotion', 0.20,
        emotionalHealth > 0.6 ? 'Emotional range is healthy and balanced' :
        emotionalHealth > 0.4 ? 'Emotional tone is stable' : 'Narrow emotional range detected'),
      this._buildSignal('topic', 0.15,
        topicDiversity > 0.6 ? 'Good topic variety keeps conversation fresh' :
        topicDiversity > 0.4 ? 'Moderate topic diversity' : 'Topics may be getting repetitive'),
      this._buildSignal('state', 0.15,
        momentumHealth > 0.6 ? 'Conversation momentum is strong and engaging' :
        momentumHealth > 0.4 ? 'Conversation momentum is steady' : 'Momentum is low — consider re-engaging'),
      this._buildSignal('relationship', 0.15,
        relationshipHealth > 0.6 ? 'Relationship health is thriving' :
        relationshipHealth > 0.4 ? 'Relationship is stable' : 'Relationship needs attention'),
      this._buildSignal('freshness', 0.15,
        overall > 0.5 ? 'Overall conversation health is good' : 'Overall health needs improvement'),
    ];

    const strengths = signals.filter(s => s.detail.includes('thriving') || s.detail.includes('strong') || s.detail.includes('healthy') || s.detail.includes('good') || s.detail.includes('diverse'));
    const concerns = signals.filter(s => s.detail.includes('low') || s.detail.includes('needs') || s.detail.includes('Narrow') || s.detail.includes('repetitive'));

    return {
      item: { type: 'health', value: `overall ${Math.round(overall * 100)}%` },
      summary: `Conversation health is ${overall > 0.6 ? 'thriving' : overall > 0.4 ? 'stable' : 'concerning'} at ${Math.round(overall * 100)}% overall`,
      confidence: overall,
      signals,
      topSignals: [
        strengths.length > 0 ? strengths[0].detail : 'Room for improvement across areas',
        concerns.length > 0 ? concerns[0].detail : 'No major concerns detected',
        `Health distribution: ${Math.round(responsiveness * 100)}% responsive, ${Math.round(emotionalHealth * 100)}% emotional`,
      ],
      alternativeInterpretation: overall < 0.4
        ? 'Health scores may improve with more interactive exchanges'
        : 'Scores are consistent with conversation patterns',
      relationshipImpact: { score: relationshipHealth, description: signals[4].detail },
      emotionImpact: { score: emotionalHealth, description: signals[1].detail },
      goalImpact: { score: overall, description: signals[5].detail },
    };
  }

  explainDNAScore(dna) {
    if (!dna || !dna.writingStyle) {
      return {
        item: { type: 'dna', value: 'insufficient data' },
        summary: 'Not enough data to analyze your conversation DNA yet',
        confidence: 0.1,
        signals: [this._buildSignal('dna', 1.0, 'Keep chatting to build your conversation DNA profile')],
        topSignals: ['Keep chatting to build your conversation DNA profile'],
        primaryStyle: 'unknown',
        strengths: [],
        growthAreas: ['Build more conversation history'],
      };
    }

    const ws = dna.writingStyle;
    const cp = dna.contentPreferences || {};
    const bp = dna.behavioralPatterns || {};
    const signals = [];

    const styles = {
      formal: ws.formalScore || 0,
      casual: ws.casualScore || 0,
      humorous: ws.humorScore || 0,
      romantic: ws.romanticScore || 0,
      professional: ws.professionalScore || 0,
      creative: ws.creativityScore || 0,
      kind: ws.kindnessScore || 0,
    };

    const sorted = Object.entries(styles).sort((a, b) => b[1] - a[1]);
    const primaryStyle = sorted[0][0];
    const secondaryStyle = sorted[1]?.[0] || 'balanced';

    signals.push(this._buildSignal('dna', 0.30,
      `Your primary writing style is ${primaryStyle} with a ${secondaryStyle} touch`));
    signals.push(this._buildSignal('emotion', 0.20,
      ws.positivityScore > 0.5 ? 'You tend toward positive expressions' : 'Your emotional expression is reserved'));
    signals.push(this._buildSignal('time', 0.15,
      bp.activeHours ? `You're most active during ${this._getTimePeriod(bp.activeHours || [])}` : 'Activity pattern being established'));
    signals.push(this._buildSignal('freshness', 0.12,
      bp.conversationRhythm ? `Your conversation rhythm is ${bp.conversationRhythm}` : 'Rhythm pattern being established'));
    signals.push(this._buildSignal('topic', 0.13,
      cp.favoriteTopics && cp.favoriteTopics.length > 0
        ? `Your top topics include ${cp.favoriteTopics.slice(0, 3).map(t => t.value).join(', ')}`
        : 'Topic preferences emerging'));
    signals.push(this._buildSignal('goal', 0.10,
      ws.avgMessageLength > 80 ? 'You prefer longer, detailed messages' :
      ws.avgMessageLength > 30 ? 'You prefer medium-length messages' : 'You prefer short, concise messages'));

    const topSignals = signals.slice(0, 3).map(s => s.detail);

    return {
      item: { type: 'dna', value: `${primaryStyle} communicator` },
      summary: `You're a ${primaryStyle} communicator who prefers ${ws.preferredReplyLength || 'medium'}-length messages`,
      confidence: dna.metadata?.totalMessages ? Math.min(dna.metadata.totalMessages / 50, 1) : 0.2,
      signals,
      topSignals,
      primaryStyle,
      secondaryStyle,
      strengths: Object.entries(styles).filter(([, v]) => v > 0.4).map(([k]) => k).slice(0, 3),
      growthAreas: Object.entries(styles).filter(([, v]) => v < 0.2).map(([k]) => k).slice(0, 2),
    };
  }

  _getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) return 'morning';
    if (hour >= 12 && hour <= 16) return 'afternoon';
    if (hour >= 17 && hour <= 20) return 'evening';
    return 'night';
  }

  _getTimePeriod(hours) {
    if (!hours || hours.length === 0) return 'various times';
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    if (avg >= 5 && avg <= 11) return 'mornings';
    if (avg >= 12 && avg <= 16) return 'afternoons';
    if (avg >= 17 && avg <= 20) return 'evenings';
    return 'nights';
  }

  _calculateConfidence(signals) {
    if (!signals || signals.length === 0) return 0.5;
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const positiveWeight = signals
      .filter(s => s.contribution === 'positive')
      .reduce((sum, s) => sum + s.weight, 0);
    return Math.min(1, Math.max(0.1, positiveWeight / Math.max(totalWeight, 0.01)));
  }
}

module.exports = new ExplainableAI();