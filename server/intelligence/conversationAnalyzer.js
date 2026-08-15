const emotionTimeline = require('./emotionTimeline');
const topicEvolution = require('./topicEvolution');
const conversationState = require('./conversationState');
const relationshipEngine = require('./relationshipEngine');
const conversationMomentum = require('./conversationMomentum');
const snapshotMemory = require('./snapshotMemory');
const futurePrediction = require('./futurePrediction');
const { classifyByRule } = require('../core/emotionPipeline');

const EMOTION_KEYWORDS = {
  joyful: ['amazing', 'wonderful', 'fantastic', 'incredible', 'best day', 'so happy', 'overjoyed', 'ecstatic', 'thrilled', 'blessed', 'perfect', 'brilliant'],
  excited: ['excited', 'can\'t wait', 'looking forward', 'so ready', 'hyped', 'pumped', 'lets go', 'woohoo', 'yay', 'finally'],
  happy: ['happy', 'glad', 'great', 'good', 'nice', 'wonderful', 'lovely', 'pleased', 'delighted', 'cheerful', 'smile', 'laugh'],
  grateful: ['thank', 'grateful', 'appreciate', 'blessed', 'thankful', 'indebted', 'obliged'],
  loved: ['love you', 'love', 'care', 'mean so much', 'precious', 'cherish', 'adore'],
  romantic: ['romantic', 'beautiful', 'handsome', 'gorgeous', 'cute', 'sexy', 'hot', 'dreamy', 'passionate'],
  flirty: ['flirt', 'tease', 'playful', 'wink', 'naughty', 'kiss', 'hug', 'crazy'],
  neutral: ['ok', 'okay', 'fine', 'sure', 'maybe', 'perhaps', 'alright', 'yes', 'no', 'hmm', 'i see', 'oh', 'right', 'true'],
  confused: ['confused', 'don\'t understand', 'what', 'huh', 'weird', 'strange', 'unclear', 'complicated', 'puzzling'],
  surprised: ['wow', 'omg', 'no way', 'really', 'seriously', 'unbelievable', 'shocked', 'surprised', 'oh my god'],
  anxious: ['anxious', 'nervous', 'worried', 'scared', 'fear', 'panic', 'stressed', 'overwhelmed', 'uneasy', 'tense'],
  worried: ['worried', 'concerned', 'what if', 'maybe not', 'not sure', 'uncertain', 'afraid', 'doubt'],
  bored: ['bored', 'tired', 'nothing', 'whatever', 'same', 'routine', 'dull', 'monotonous', 'sleepy'],
  sad: ['sad', 'unhappy', 'crying', 'depressed', 'miss', 'lonely', 'heartbroken', 'disappointed', 'down', 'low', 'hurt', 'pain', 'grief', 'sorrow', 'miserable'],
  angry: ['angry', 'mad', 'furious', 'rage', 'irritated', 'annoyed', 'frustrated', 'hate', 'upset', 'fuming', 'livid', 'enraged'],
  frustrated: ['frustrated', 'stuck', 'can\'t', 'useless', 'pointless', 'waste', 'stupid', 'ridiculous', 'hopeless'],
  annoyed: ['annoyed', 'ugh', 'whatever', 'enough', 'stop', 'leave me', 'bother', 'irritating', 'tiresome'],
  hurt: ['hurt', 'betrayed', 'lied', 'deceived', 'ignored', 'abandoned', 'rejected', 'broken', 'unfair'],
  guilty: ['guilty', 'regret', 'sorry', 'my fault', 'i should', 'apologize', 'blame', 'ashamed'],
  apologetic: ['sorry', 'apologize', 'forgive', 'pardon', 'excuse', 'my bad', 'i was wrong', 'mistake', 'regret'],
  hopeful: ['hope', 'wish', 'pray', 'believe', 'optimistic', 'future', 'better', 'soon', 'someday', 'possible'],
  supportive: ['support', 'here for you', 'listen', 'understand', 'help', 'care', 'there for you', 'matter', 'strong'],
  thankful: ['thankful', 'grateful', 'appreciation', 'blessed', 'fortunate', 'lucky'],
};

function detectEmotion(text) {
  if (!text) return { emotion: 'neutral', confidence: 0, source: 'default' };
  const lower = text.toLowerCase();
  const scores = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 4 ? 2 : 1;
      }
    }
    if (score > 0) scores[emotion] = score;
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const length = text.length;

  if (exclamationCount > 2) {
    const excitement = ['joyful', 'excited', 'happy', 'angry', 'frustrated'];
    for (const e of excitement) {
      if (scores[e]) scores[e] += exclamationCount;
    }
  }

  if (length > 0) {
    const upper = text.replace(/[^A-Z]/g, '').length;
    if (upper > 3) {
      scores.excited = (scores.excited || 0) + 2;
      scores.angry = (scores.angry || 0) + 1;
    }
  }

  if (Object.keys(scores).length === 0) {
    return { emotion: 'neutral', confidence: 0.3, source: 'default' };
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = entries[0];
  const runnerUp = entries[1];

  let confidence = Math.min(1, best[1] / 5);
  if (runnerUp && Math.abs(best[1] - runnerUp[1]) <= 1) {
    confidence *= 0.7;
  }

  return {
    emotion: best[0],
    confidence: Math.round(confidence * 100) / 100,
    source: 'rule',
  };
}

class ConversationAnalyzer {
  async analyze(messages, options = {}) {
    const message = messages[messages.length - 1];
    const text = message?.text || message || '';

    const startTime = Date.now();
    const ruleEmotion = detectEmotion(text);
    let emotion = ruleEmotion;
    let aiUsed = false;

    if (ruleEmotion.confidence < 0.7 && options.useAI) {
      try {
        const aiResult = await classifyByRule(text);
        if (aiResult && aiResult.emotion) {
          const aiConfidence = aiResult.confidence || 0.5;
          if (aiConfidence > ruleEmotion.confidence) {
            emotion = { emotion: aiResult.emotion, confidence: aiConfidence, source: 'ai' };
            aiUsed = true;
          }
        }
      } catch (e) {
      }
    }

    const currentEmotion = emotion.emotion || 'neutral';
    const emoTimeline = options.existingTimeline || [];
    emotionTimeline.addEntry(emoTimeline, {
      emotion: currentEmotion,
      confidence: emotion.confidence,
      timestamp: message?.timestamp || new Date(),
      messageId: message?._id,
      messagePreview: text.slice(0, 60),
    });

    const existingTopics = options.existingTopics || [];
    const topicResult = topicEvolution.addMessage(existingTopics, message);

    const currentState = options.currentState || 'small_talk';
    const stateResult = conversationState.updateState(currentState, message);

    const existingRelationship = options.existingRelationship || 'unknown';
    const profile = {
      messages,
      emotionTimeline: emoTimeline,
      topics: topicResult.topics,
      preferences: options.preferences || {},
    };
    const relationshipResult = relationshipEngine.detect(profile);

    const momentumResult = conversationMomentum.calculate(messages);

    const analysis = {
      currentEmotion: {
        emotion: currentEmotion,
        confidence: emotion.confidence,
        source: emotion.source,
        weight: emotionTimeline.constructor.EMOTION_WEIGHTS[currentEmotion] ?? 4,
      },
      emotionTimeline: emoTimeline,
      emotionTrend: emotionTimeline.getTrend(emoTimeline),
      dominantEmotion: emotionTimeline.getDominantEmotion(emoTimeline),
      emotionVolatility: emotionTimeline.getEmotionVolatility(emoTimeline),
      isEscalating: emotionTimeline.detectEscalation(emoTimeline),
      isDeescalating: emotionTimeline.detectDeescalation(emoTimeline),
      topics: topicResult.topics,
      currentTopic: topicEvolution.getCurrentTopic(topicResult.topics),
      topicHistory: topicEvolution.getTopicHistory(topicResult.topics),
      topicTrend: topicEvolution.getTopicTrend(topicResult.topics),
      topicChange: topicEvolution.detectTopicChange(topicResult.topics),
      newTopics: topicResult.extracted,
      conversationState: stateResult.state,
      previousState: stateResult.previousState,
      stateTransition: stateResult.isTransition,
      stateSignificant: stateResult.isSignificant,
      relationshipType: relationshipResult.type,
      relationshipScore: relationshipResult.score,
      relationshipConfidence: relationshipResult.confidence,
      relationshipDetails: relationshipResult.details,
      momentum: momentumResult,
      aiUsed,
      analysisTime: Date.now() - startTime,
      messageCount: messages.length,
    };

    const predictions = futurePrediction.predict(messages, analysis);

    const shouldSnapshot = options.messageIndex
      ? snapshotMemory.shouldSnapshot(options.messageIndex)
      : false;

    if (shouldSnapshot) {
      analysis.newSnapshot = snapshotMemory.createSnapshot({ messages, analysis });
    }

    return {
      ...analysis,
      predictions,
      snapshots: options.existingSnapshots || [],
      pendingQuestions: snapshotMemory._extractQuestions([message]),
    };
  }

  detectEmotion(text) {
    return detectEmotion(text);
  }
}

module.exports = new ConversationAnalyzer();
module.exports.detectEmotion = detectEmotion;
