# Future Prediction Engine

**File:** `server/intelligence/futurePredictionEngine.js`

The Future Prediction Engine analyzes the current state of a conversation and predicts what will happen next. It is a **rule-based** engine (model version: `future-v1-rule`) that uses emotion transitions, state machines, momentum analysis, and content type patterns to generate predictions.

---

## What It Predicts

| Prediction | Description | Confidence Range |
|-----------|-------------|-----------------|
| **Next Reply** | Suggested next message text | 0.3 – 0.7 |
| **Next Emotion** | Likely emotional shift | 0.3 – 0.95 |
| **Next Topic** | Whether topic will change | 0.6 – 0.7 |
| **Next GIF** | Predicted GIF query | 0.6 |
| **Next Emoji** | Most likely next emoji | 0.65 |
| **Next Song** | Predicted song genre | 0.5 |
| **Next Video** | Predicted video query | 0.45 |
| **Next State** | Conversation state transition | 0.4 |
| **Next Question** | Likely follow-up question | 0.5 – 0.7 |
| **Conversation Outcome** | How the conversation will end | 0.5 – 0.7 |

---

## How Predictions Are Made

### Emotion Transitions

The engine defines **valid emotion transitions** for each emotion:

```javascript
EMOTION_TRANSITIONS = {
  sad:     ['neutral', 'hopeful', 'happy'],
  angry:   ['frustrated', 'neutral', 'sad', 'apologetic'],
  neutral: ['happy', 'curious', 'sad', 'excited'],
  happy:   ['excited', 'grateful', 'neutral', 'joyful'],
  excited: ['joyful', 'happy', 'grateful'],
  anxious: ['worried', 'neutral', 'hopeful'],
  grateful:['happy', 'joyful', 'excited'],
  romantic:['loved', 'happy', 'flirty', 'neutral'],
  flirty:  ['romantic', 'happy', 'playful'],
};
```

**Transition Probability Calculation:**

```javascript
_getTransitionProbability(fromEmotion, toEmotion, timeline) {
  // 1. Base probability: evenly distributed among options
  let prob = 1 / numTransitions;

  // 2. Recent pattern boost: check if this transition happened recently
  //    If to→from pattern was seen, boost probability
  if (fromCount > 0) prob += (toCount / fromCount) * 0.2;

  // 3. Emotional weight difference boost
  const diff = toWeight - fromWeight;
  if (diff > 3) prob += 0.05;    // Improving mood
  else if (diff < -3) prob += 0.02;  // Declining mood

  // 4. Volatility boost
  if (volatility > 0.5) prob += 0.05;  // Unstable emotions

  return clamp(prob, 0.05, 0.9);
}
```

**Trend Analysis:**

```javascript
// Check emotional trend from last 3 messages
const recent = emotionTimeline.slice(-3);
const trend = recent[recent.length-1].weight - recent[0].weight;

if (trend > 2) {
  // Improving → boost most positive transition
  perEmotion[positive[0]] += 0.15;
} else if (trend < -2) {
  // Declining → boost most negative transition
  perEmotion[negative[0]] += 0.10;
}
```

Emotion weights are defined in `emotionTimeline.js`:
- Positive emotions (joyful=9, loved=8, excited=7, happy=6)
- Neutral (neutral=4, curious=5)
- Negative (sad=2, angry=1, hurt=1)

### State Transitions

Similar to emotions, conversation states have **valid transitions**:

```javascript
STATE_TRANSITIONS = {
  greeting:   ['small_talk', 'introduction', 'professional'],
  small_talk: ['discussion', 'planning', 'flirting', 'celebration', 'ending'],
  discussion: ['planning', 'argument', 'celebration', 'ending', 'small_talk'],
  argument:   ['apology', 'discussion', 'ending', 'support'],
  apology:    ['support', 'small_talk', 'discussion', 'ending'],
  celebration:['small_talk', 'discussion', 'planning', 'flirting', 'ending'],
  flirting:   ['discussion', 'celebration', 'romantic', 'small_talk', 'ending'],
  planning:   ['discussion', 'celebration', 'small_talk', 'ending'],
  support:    ['small_talk', 'discussion', 'celebration', 'ending'],
  professional:['discussion', 'planning', 'small_talk', 'ending'],
  ending:     ['greeting', 'small_talk'],
};
```

The prediction simply picks the first valid transition (most common). Confidence is fixed at 0.4.

### Reply Prediction

Reply suggestions are generated based on emotional context, conversation state, topic, and relationship type:

```javascript
// Example: Sad emotion replies
if (['sad', 'anxious', 'worried'].includes(emotion)) {
  suggestions.push(
    'I\'m here for you',
    'Do you want to talk about it?',
    'It\'s okay to feel this way'
  );
}

// Example: Greeting state replies
if (state === 'greeting') {
  suggestions.push(
    'How are you?',
    'What\'s up?',
    'How was your day?'
  );
}
```

Topic-specific suggestions are also available for 14 topics (work, health, travel, relationships, food, movies, music, gaming, celebration, school, family, technology, etc.).

### Content Type Prediction

The `predictContentType()` method determines what type of content would be most appropriate:

```javascript
if (['sad', 'hurt', 'lonely'].includes(emotion)) return 'hug';
if (['happy', 'joyful', 'excited'].includes(emotion)) return 'celebration';
if (['romantic', 'flirty', 'loved'].includes(emotion)) return 'romance';
if (['angry', 'frustrated'].includes(emotion)) return 'calming';
if (state === 'celebration') return 'party';
if (state === 'flirting') return 'romance';
if (state === 'support') return 'inspiration';
```

This content type then feeds into the GIF, emoji, song, and video predictions.

### Outcome Prediction

The conversation outcome is predicted from momentum and emotional state:

| Condition | Outcome | Confidence |
|-----------|---------|------------|
| momentum.isDead | "conversation ending" | 0.6 |
| momentum.isExciting | "conversation deepening" | 0.55 |
| sad/angry/anxious | "needs emotional support" | 0.5 |
| happy/joyful/excited | "positive engagement" | 0.6 |
| planning state | "reaching agreement" | 0.55 |
| argument state | "potential conflict resolution" | 0.5 |
| ending state | "conversation concluding" | 0.7 |

---

## Confidence Scoring

Confidence is calculated per prediction based on:

1. **Data availability** – More messages = higher confidence
2. **Pattern consistency** – Clear trends boost confidence
3. **State specificity** – Some states have more predictable transitions
4. **Emotion volatility** – High volatility reduces confidence

```javascript
let confidence = 0.3;                    // Base
confidence += timeline.length > 5 ? 0.2 : 0;  // More data
confidence += timeline.length > 10 ? 0.1 : 0; // More data
confidence = Math.min(0.95, confidence);  // Cap
```

The response includes a probability distribution across all possible transitions:

```json
{
  "emotion": "excited",
  "confidence": 0.62,
  "probability": {
    "perEmotion": {
      "joyful": 0.35,
      "happy": 0.30,
      "grateful": 0.25,
      "neutral": 0.10
    }
  }
}
```

---

## Integration with Recommendations and DNA

### Orchestrator Flow

The prediction engine is called as part of the `IntelligenceOrchestrator.getIntelligentSuggestions()` flow:

```javascript
const predictions = this.futurePredictionEngine.predict(messages, {
  currentEmotion: context.emotion.current,
  emotionTimeline: context.emotion.timeline,
  conversationState: context.state.current,
  momentum: context.momentum,
  relationshipType: context.relationship.type,
  topics: context.topic.history,
  topicHistory: context.topic.history,
});
```

### How Predictions Feed Recommendations

1. **Next emotion** → The AdaptiveRecommendationEngine uses the predicted next emotion to pre-warm emoji and content selection
2. **Next state** → Suggestion templates are prepared for the upcoming state
3. **Next reply** → Pre-loaded as the top suggestion
4. **Next GIF/emoji/song/video** → Added to recommendation pools with boosted scores
5. **Conversation outcome** → Guides the health engine's risk assessment

### DNA Context

Predictions also consider user's writing style from DNA:
- Short-style users → shorter predicted replies
- Question-frequency → more question predictions
- Emoji-frequency → more emoji predictions

---

## API Reference

### `GET /orchestrator/predictions/:chatId`

Returns future predictions for a conversation.

**Response:**
```json
{
  "predictions": {
    "nextReply": {
      "text": "That's amazing!",
      "suggestions": ["That's amazing!", "I'm so happy for you!", "Tell me more about it!"],
      "confidence": 0.7
    },
    "nextEmotion": {
      "emotion": "excited",
      "confidence": 0.62,
      "probability": {
        "perEmotion": {
          "joyful": 0.35,
          "happy": 0.30,
          "grateful": 0.25,
          "neutral": 0.10
        }
      }
    },
    "nextTopic": {
      "topic": "technology",
      "isChange": false,
      "confidence": 0.7
    },
    "nextGif": {
      "query": "happy",
      "confidence": 0.6
    },
    "nextEmoji": {
      "emoji": "🎉",
      "confidence": 0.65
    },
    "nextSong": {
      "title": "upbeat pop",
      "confidence": 0.5
    },
    "nextVideo": {
      "query": "technology related",
      "confidence": 0.45
    },
    "nextState": {
      "state": "celebration",
      "confidence": 0.4
    },
    "nextQuestion": {
      "text": "What made your day so great?",
      "confidence": 0.65
    },
    "conversationOutcome": {
      "likelyOutcome": "positive engagement",
      "confidence": 0.6
    },
    "metadata": {
      "computationTime": 2,
      "signalsUsed": 4,
      "modelVersion": "future-v1-rule"
    }
  }
}
```

### `GET /orchestrator/suggestions/:chatId`

Returns suggestions with predictions embedded in the `predictions` field of the response.
