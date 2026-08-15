# Recommendation Engine

Emotune has two recommendation engines: the original **RecommendationEngine** (v1) and the new **AdaptiveRecommendationEngine** (v2). Both are used in the intelligence pipeline, with v2 being the primary engine for the orchestrator.

---

## Old RecommendationEngine (v1)

**File:** `server/intelligence/recommendationEngine.js`

### Architecture

The original engine is a **rule-based** system with hardcoded weights. It analyzes conversation context and returns scored suggestions for emojis, stickers, shayari, songs, and reply types.

### Scoring

Each recommendation type (emoji, sticker, shayari, song, reply) gets a score between 0.1 and 1.0 based on:

```
score = baseScore + sum(factor × weight) + freshness + excitement - volatility
```

#### Base Scores (hardcoded)

| Type | Base Score |
|------|-----------|
| reply | 0.8 |
| emoji | 0.7 |
| sticker | 0.5 |
| shayari | 0.4 |
| song | 0.3 |

#### Weight Factors (hardcoded per type)

| Factor | emoji | sticker | shayari | song | reply |
|--------|-------|---------|---------|------|-------|
| emotion | 0.4 | 0.3 | 0.4 | 0.3 | 0.2 |
| state | 0.2 | 0.3 | 0.1 | 0.1 | 0.3 |
| relationship | 0.1 | 0.2 | 0.3 | 0.3 | 0.2 |
| romantic | 0.0 | 0.0 | 0.3 | 0.4 | 0.0 |
| topic | 0.0 | 0.0 | 0.0 | 0.0 | 0.2 |
| casual | 0.3 | 0.2 | -0.1 | -0.1 | 0.1 |

#### Freshness Penalty

| Time Since Last Suggestion | Penalty |
|---------------------------|---------|
| < 1 hour | -0.3 |
| < 3 hours | -0.1 |
| < 6 hours | 0.0 |
| < 12 hours | +0.1 |
| 12+ hours | +0.15 |

### Strengths
- Fast (no external API calls)
- Deterministic and predictable
- Works without any configuration

### Limitations
- No personalization (same suggestions for all users)
- No learning from feedback
- Hardcoded weights cannot be tuned
- No diversity control
- No explanation capability

---

## New AdaptiveRecommendationEngine (v2)

**File:** `server/intelligence/adaptiveRecommendationEngine.js`

### Architecture

The adaptive engine uses a **multi-factor scoring system** with 14 configurable factors. Each recommendation candidate is scored independently, then sorted and filtered.

### The 14 Scoring Factors

Each factor contributes to the final score proportionally to its configured weight:

```javascript
SCORING_WEIGHTS = {
  emotion:       0.20,  // 20% - Emotional appropriateness
  relationship:  0.15,  // 15% - Relationship type alignment
  topic:         0.10,  // 10% - Topic relevance
  goal:          0.15,  // 15% - Conversation goal alignment
  dna:           0.10,  // 10% - User's Conversation DNA match
  state:         0.08,  //  8% - Conversation state fit
  momentum:      0.05,  //  5% - Conversation momentum
  memory:        0.05,  //  5% - Past interaction memory
  time:          0.05,  //  5% - Time of day / festival
  freshness:     0.02,  //  2% - Not recently suggested
  acceptanceRate:0.03,  //  3% - User's past acceptance of similar
  popularity:    0.01,  //  1% - Global popularity
  confidence:    0.01,  //  1% - Signal confidence
  randomness:    0.00,  //  0% - Random jitter (configurable)
};
```

Total: 1.00 (100%). Weights are configurable at runtime via `setWeights()`.

### Factor Scoring Details

#### 1. Emotion Factor (weight: 0.20)

Uses `EMOJI_MOOD_MAP` to match emojis to detected emotions. Each of 21 emotions has 10 associated emojis.

```javascript
// Example scoring:
joyful   → ['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🎆', '🎇', '🥳', '🎯']
happy    → ['😊', '😄', '😁', '🙂', '😌', '😇', '☺️', '😊', '🥰', '😋']
romantic → ['💕', '💋', '💗', '🌹', '💐', '💞', '💖', '🥰', '😘', '💝']
```

If the candidate emoji matches the current emotion's map → score 0.8–1.0

#### 2. Relationship Factor (weight: 0.15)

Uses `RELATIONSHIP_WEIGHTS` to determine appropriateness for different relationship types:

| Relationship | casual | romantic | formal | supportive |
|-------------|--------|----------|--------|------------|
| friend | 1.0 | 0.1 | 0.2 | 0.6 |
| romantic | 0.8 | 1.0 | 0.1 | 1.0 |
| boss | 0.3 | 0.0 | 1.0 | 0.4 |
| colleague | 0.5 | 0.1 | 0.9 | 0.5 |
| ... | ... | ... | ... | ... |

#### 3. Topic Factor (weight: 0.10)

If the candidate's topic matches any of the current conversation topics → score 0.9

#### 4. Goal Factor (weight: 0.15)

Aligns with detected conversation goals (planning, support, celebration, apology, etc.)

#### 5. DNA Factor (weight: 0.10)

Personalization based on Conversation DNA:
- If emoji is in user's top emojis → score 0.9
- If topic matches favorite topics → score 0.8
- Otherwise → 0.4

#### 6. Time Factor (weight: 0.05)

- Morning → energetic, motivational
- Afternoon → productive, casual
- Evening → relaxing, entertainment
- Night → calm, romantic
- Festival → related content boosted

#### 7. State Factor (weight: 0.08)

Each conversation state has preferred emojis via `STATE_EMOJI_MAP`:
- greeting → 👋, 🙋, 😊
- celebration → 🎉, 🎊, 🥳
- flirting → 😉, 💕, 💋
- etc.

#### 8. Momentum Factor (weight: 0.05)

- Dead conversation → short, re-engaging content (0.7)
- Exciting conversation → energetic content (0.9)
- Fast momentum → longer content (0.8)

#### 9. Freshness Factor (weight: 0.02)

Tracks recently suggested items per `chatId + state + emotion` key:
- < 1 minute since suggested → -0.5 (strongly penalized)
- < 5 minutes → -0.2
- < 1 hour → +0.1
- 24+ hours → +0.6

#### 10. Acceptance Rate Factor (weight: 0.03)

Based on user feedback history for similar items:
- Previously accepted → 0.5–1.0
- Previously dismissed → 0.0–0.5
- Unknown → 0.4

#### 11. Popularity Factor (weight: 0.01)

Global popularity score of the item (0.0–1.0).

#### 12. Confidence Factor (weight: 0.01)

Emotion detection confidence influences the recommendation.

#### 13. Randomness Factor (weight: 0.00, configurable)

Adds ±randomness×0.4 jitter to scores for exploration. Disabled by default.

---

## Diversity Penalty Algorithm

After scoring, the `_applyDiversityPenalty()` method ensures variety:

```javascript
_applyDiversityPenalty(candidates) {
  // Keep the highest-scored candidate unchanged
  const result = [candidates[0]];
  const seenSources = new Set([candidates[0].source]);

  // For each subsequent candidate with same source, reduce score by 30%
  for (let i = 1; i < candidates.length; i++) {
    if (seenSources.has(candidates[i].source)) {
      candidates[i].score *= (1 - diversityMinScore);
    } else {
      seenSources.add(candidates[i].source);
    }
    result.push(candidates[i]);
  }
  return result;
}
```

This prevents all recommendations from coming from the same source (e.g., all from emotion, none from DNA).

### Candidate Generation Sources

| Source | Description |
|--------|-------------|
| `emotion` | From EMOJI_MOOD_MAP based on current emotion |
| `goal` | From goal-based emoji mapping |
| `time` | From time-of-day emoji pool |
| `dna` | From user's top emojis |
| `festival` | From festival-specific content |
| `state` | From conversation state emoji map |
| `fallback` | Generic fallback pool |

---

## Suggestion Generation

### 90% Rule Templates, 10% AI

The engine generates suggestions primarily from **rule templates** (90%) with occasional **AI-generated** content (10%).

```javascript
const SUGGESTION_TEMPLATES = {
  greeting:     ['Hey! How are you?', 'Hello! What\'s up?', 'Hi there!'],
  small_talk:   ['That\'s cool! Tell me more.', 'I see, what else?', 'Interesting!'],
  celebration:  ['Congratulations! 🎉', 'That\'s amazing! 🥳', 'So happy for you!'],
  flirting:     ['You\'re so cute 😘', 'I love that! 💕', 'You make me smile 😊'],
  support:      ['I\'m here for you ❤️', 'You\'ve got this 💪', 'Stay strong ✨'],
  argument:     ['Let\'s take a breath', 'I understand your point', 'Maybe we can find common ground'],
  apology:      ['It\'s okay, I understand', 'Thank you for saying that', 'I forgive you ❤️'],
  planning:     ['Sounds like a plan!', 'Let me know what works', 'I\'ll be there!'],
  professional: ['I agree with that approach', 'Let me review and get back', 'That makes sense'],
  ending:       ['Take care! 😊', 'Talk to you later!', 'Goodbye! It was great talking'],
  discussion:   ['What do you think?', 'I see your perspective', 'That\'s a good point'],
};
```

AI suggestions are triggered when emotion confidence < 0.5 AND random threshold (10% chance):

```javascript
const needsAI = context.emotionConfidence < 0.5 && Math.random() < 0.1;
if (needsAI && context.options && context.options.aiGenerate) {
  const aiSug = { text: '[AI generated suggestion]', type: 'ai', source: 'ai', state };
  candidates.push(aiSug);
}
```

---

## Explainable Recommendations

The `ExplainableAI` class (`server/intelligence/explainableAI.js`) provides per-recommendation explanations:

### Signal Breakdown

Each explanation includes:
- **9 signals** with individual weights and contributions
- **Top 3 signals** shown to user
- **Alternative considered** display
- **Relationship impact** score + description
- **Emotion impact** score + description
- **Goal impact** score + description

### Confidence Calculation

```javascript
confidence = positiveSignalWeight / totalSignalWeight
// Clamped to [0.1, 1.0]
```

### Output Formats

| Format | Use Case | Example |
|--------|----------|---------|
| `tooltip` | Hover tooltip | "😊 Matches your happy mood in the morning" |
| `panel` | Detail panel | Full signal breakdown with scores |
| `voice` | Voice assistant | "I recommend an emoji because it matches your happy mood. This has 85% confidence." |

---

## Configuration and Tuning

### Runtime Weight Adjustment

```javascript
adaptiveRecommendationEngine.setWeights({
  emotion: 0.25,     // Increase emotion importance
  dna: 0.15,         // Increase personalization
  randomness: 0.05   // Add exploration
});
```

### Constructor Options

```javascript
const engine = new AdaptiveRecommendationEngine({
  weights: { emotion: 0.25, dna: 0.15 },  // Custom starting weights
  maxRecentTracked: 2000,                  // Max freshness entries
  diversityMinScore: 0.4,                   // Diversity penalty strength
});
```

### Tuning Guidelines

| Goal | Increase | Decrease |
|------|----------|----------|
| More personalization | dna, acceptanceRate | randomness |
| More variety | freshness, randomness, diversityMinScore | popularity |
| Better emotional fit | emotion, state | topic, goal |
| Faster adaptation | acceptanceRate | freshness |
| More conservative | relationship, goal | randomness |

### Feedback Loop

The `recordFeedback()` method updates `feedbackScores` map:
- `accepted` → score +1
- `dismissed` → score -1
- `viewed` → score +0.1

```javascript
engine.recordFeedback(userId, 'emoji', '😊', 1);  // Accepted
engine.recordFeedback(userId, 'suggestion', 'text', -1);  // Dismissed
```

These scores feed into the `acceptanceRate` scoring factor on subsequent recommendations.

### DNA Integration

```javascript
engine.setDNAPreferences(userId, {
  topEmojis: ['😂', '❤️', '😊'],
  topTopics: ['technology', 'music'],
});
```

This updates the `topEmojiCache` and enables personalized emoji prioritization.
