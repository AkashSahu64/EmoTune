# Conversation DNA Engine

## What is Conversation DNA?

Conversation DNA is a **per-user behavioral and stylistic profile** that captures how a user communicates. It is the long-term memory of the Emotune system, enabling personalized recommendations, adaptive UI, and context-aware AI interactions.

Unlike traditional user profiles that rely on explicit preferences (settings, forms), Conversation DNA is built **implicitly** by analyzing every message a user sends. It learns:
- How you write (formal vs casual, long vs short)
- What you like (emojis, topics, music genres)
- When you're active (morning person vs night owl)
- How fast you respond (quick replies vs thoughtful pauses)

The DNA model is versioned (currently v2) and stored in a dedicated MongoDB collection at `server/models/ConversationDNA.js`.

---

## DNA Attributes

The Conversation DNA is organized into four attribute groups:

### 1. Language

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `primary` | string | `'en'`, `'hi'`, etc. | Primary language detected |
| `secondary` | string | - | Secondary language (if bilingual) |
| `confidence` | number | 0.0 – 1.0 | Confidence in language detection |

Detection: Checks Unicode ranges. Devanagari characters (U+0900–U+097F) > 30% of text → Hindi primary. Otherwise English.

### 2. Writing Style

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `avgMessageLength` | number | 0+ | Average character count per message (EMA) |
| `preferredReplyLength` | enum | short, medium, long, mixed | Inferred reply length preference |
| `formalScore` | number | 0.0 – 1.0 | Use of formal vocabulary |
| `casualScore` | number | 0.0 – 1.0 | Use of casual/slang vocabulary |
| `humorScore` | number | 0.0 – 1.0 | Use of humor indicators (lol, haha, 😂) |
| `sarcasmScore` | number | 0.0 – 1.0 | Use of sarcastic phrasing |
| `kindnessScore` | number | 0.0 – 1.0 | Use of kind/gracious words |
| `positivityScore` | number | 0.0 – 1.0 | Use of positive language |
| `creativityScore` | number | 0.0 – 1.0 | Use of creative/imaginary language |
| `professionalScore` | number | 0.0 – 1.0 | Use of professional vocabulary |
| `romanticScore` | number | 0.0 – 1.0 | Use of romantic language |
| `questionFrequency` | number | 0.0 – 1.0 | Frequency of asking questions |
| `greetingStyle` | enum | casual, formal | Preferred greeting style |
| `endingStyle` | enum | casual, formal | Preferred conversation ending style |
| `emojiFrequency` | number | 0.0 – 1.0 | How often user uses emojis |
| `emojiDensity` | number | 0.0 – 1.0 | Emojis per word ratio |
| `confidence` | number | 0.0 – 1.0 | Overall writing style confidence |

### 3. Content Preferences

| Field | Type | Description |
|-------|------|-------------|
| `favoriteEmojis` | array | Top used emojis with count and last used |
| `favoriteGifCategories` | array | Preferred GIF categories |
| `favoriteStickers` | array | Frequently used stickers |
| `favoriteSongs` | array | Most sent/received songs |
| `favoriteVideos` | array | Most shared video categories |
| `favoriteShayaris` | array | Favorite shayari/poetry |
| `favoriteTopics` | array | Inferred conversation topics |
| `topEmojis` | array | Sorted list of emoji usage counts |

### 4. Behavioral Patterns

| Field | Type | Description |
|-------|------|-------------|
| `typingSpeed` | number | Words per message (EMA) |
| `avgReplyDelay` | number | Average delay between messages |
| `messageCount` | number | Total messages analyzed |
| `activeHours` | array | Hours of the day when user is active |
| `timeBuckets` | array | Per-hour message stats |
| `morningActivity` | number | Messages sent 5am–12pm |
| `afternoonActivity` | number | Messages sent 12pm–5pm |
| `eveningActivity` | number | Messages sent 5pm–9pm |
| `nightActivity` | number | Messages sent 9pm–5am |
| `weekendRatio` | number | Proportion of activity on weekends |
| `weekdayRatio` | number | Proportion of activity on weekdays |
| `conversationRhythm` | enum | fast_responsive, moderate, slow_thoughtful, burst_activity, irregular |

---

## Data Collection Methodology

### Per-Message Analysis

Every message sent by a user is analyzed asynchronously (via `process.nextTick`) through the `ConversationDNAEngine.analyzeMessage()` method. This happens in the background and does not block the message send response.

```javascript
// In IntelligenceOrchestrator.processMessage():
process.nextTick(async () => {
  await dnaEngine.analyzeMessage(message, userId);
});
```

### Exponential Moving Average (EMA)

Writing style scores use an **exponential moving average** with a decay factor (α) between 0.02 and 0.10:

```
newScore = oldScore × (1 - α) + currentValue × α
```

This means:
- Recent messages have more influence on the profile
- Old behavior is gradually forgotten
- The user's style can evolve over time
- Typically α = 0.05 for writing style scores, α = 0.02 for rare events

### Score Ranges

All scores are normalized to **0.0 – 1.0**:

| Range | Interpretation |
|-------|----------------|
| 0.0 – 0.2 | Very low / rarely exhibited |
| 0.2 – 0.4 | Low / occasionally exhibited |
| 0.4 – 0.6 | Moderate / frequently exhibited |
| 0.6 – 0.8 | High / strongly exhibited |
| 0.8 – 1.0 | Very high / dominant trait |

### Confidence Calculation

Confidence increases with the number of messages analyzed:

```javascript
confidence = Math.min(1, totalMessages / MIN_CONFIDENCE_MESSAGES)
```

Where `MIN_CONFIDENCE_MESSAGES = 20`. At 20 messages, confidence reaches 1.0.

---

## How DNA Improves Recommendations

The DNA profile is fed into the **AdaptiveRecommendationEngine** where it influences scoring:

### 1. Emoji Personalization (`_dnaAffinity`)

```javascript
_dnaAffinity(item, userDNA) {
  // If user's top emoji matches candidate → boost score to 0.9
  if (item.emoji && topEmojis.includes(item.emoji)) return 0.9;
  // If candidate topic matches user's favorite topics → boost to 0.8
  if (item.query && topTopics.some(t => item.query.includes(t))) return 0.8;
  return 0.4;
}
```

### 2. Writing Style Matching

The `preferredReplyLength` and style scores influence suggestion selection:
- Short-style users get shorter suggestion templates
- Formal-style users get more professional suggestions
- Humor-style users get playful suggestions

### 3. Behavioral Timing

Activity patterns (`activeHours`, `conversationRhythm`) influence:
- When to send push notifications
- Expected response time for typing indicators
- Conversation engagement strategies

### 4. Content Filtering

Favorite topics filter out irrelevant recommendations:
- If user never talks about sports, sports-themed suggestions are deprioritized
- If user frequently sends songs, song recommendations get higher base scores

---

## Example DNA Profile JSON

```json
{
  "user": "64a1b2c3d4e5f6a7b8c9d0e1",
  "version": 2,
  "language": {
    "primary": "en",
    "secondary": "hi",
    "confidence": 0.92
  },
  "writingStyle": {
    "avgMessageLength": 52.3,
    "preferredReplyLength": "medium",
    "formalScore": 0.25,
    "casualScore": 0.85,
    "humorScore": 0.65,
    "sarcasmScore": 0.15,
    "kindnessScore": 0.72,
    "positivityScore": 0.78,
    "creativityScore": 0.45,
    "professionalScore": 0.20,
    "romanticScore": 0.35,
    "questionFrequency": 0.32,
    "greetingStyle": "casual",
    "endingStyle": "casual",
    "emojiFrequency": 0.42,
    "emojiDensity": 0.08,
    "confidence": 0.88
  },
  "contentPreferences": {
    "topEmojis": [
      { "emoji": "😂", "count": 127 },
      { "emoji": "❤️", "count": 89 },
      { "emoji": "😊", "count": 76 },
      { "emoji": "🔥", "count": 54 },
      { "emoji": "💀", "count": 42 }
    ],
    "favoriteTopics": [
      { "value": "technology", "count": 45 },
      { "value": "music", "count": 38 },
      { "value": "movies", "count": 31 }
    ],
    "favoriteEmojis": [
      { "key": "emoji", "value": "😂", "count": 127, "lastUsed": "2026-07-09T..." }
    ]
  },
  "behavioralPatterns": {
    "conversationRhythm": "fast_responsive",
    "messageCount": 384,
    "activeHours": [9, 10, 11, 14, 15, 16, 20, 21, 22],
    "morningActivity": 85,
    "afternoonActivity": 120,
    "eveningActivity": 145,
    "nightActivity": 34,
    "weekendRatio": 0.35,
    "weekdayRatio": 0.65
  },
  "metadata": {
    "totalMessages": 384,
    "totalConversations": 42,
    "firstMessageAt": "2026-01-15T...",
    "lastMessageAt": "2026-07-09T...",
    "lastUpdated": "2026-07-09T...",
    "updateCount": 384
  }
}
```

---

## API Reference

### `GET /api/dna`

Returns the full DNA profile for the authenticated user.

### `GET /api/dna/recommendations`

Returns a slimmed-down profile optimized for the recommendation engine. Includes only: top emojis, top topics, writing style highlights, language, current active hour, conversation rhythm, and confidence.

### `GET /api/dna/writing-style`

Returns only the `writingStyle` section of the DNA profile.

### `GET /api/dna/activity`

Returns only the `behavioralPatterns` section (activity counts by time of day, conversation rhythm, active hours).

### `GET /api/dna/top-emojis?limit=5`

Returns the top N most-used emojis.

### `POST /api/dna/reset`

Deletes the user's DNA profile and creates a fresh one with default values. All learned data is permanently lost.

---

## Topic Extraction

The DNA engine extracts topics from message text using keyword matching across 16 categories:

| Topic | Example Keywords |
|-------|-----------------|
| work | work, office, job, meeting, boss, colleague, project, deadline, career |
| school | school, college, university, exam, study, class, teacher, homework |
| relationships | relationship, boyfriend, girlfriend, partner, wife, husband, dating |
| family | family, mom, dad, mother, father, sister, brother, parent |
| health | health, doctor, hospital, sick, pain, medicine, workout, gym, diet |
| food | food, eat, dinner, lunch, breakfast, restaurant, cook, recipe |
| travel | travel, trip, vacation, holiday, flight, hotel, beach, tour |
| movies | movie, film, netflix, cinema, watch, show, series, episode |
| music | music, song, sing, album, artist, playlist, concert |
| sports | sport, game, team, match, score, player, goal, win |
| technology | tech, computer, phone, app, software, code, programming, AI |
| finance | money, finance, bank, loan, invest, salary, payment, budget |
| shopping | shop, buy, purchase, order, delivery, cart, price, sale |
| gaming | game, gaming, play, xbox, playstation, nintendo, pc |
| celebration | birthday, party, celebrate, anniversary, festival, gift |

---

## Reset and Privacy Considerations

### Reset

Users can reset their DNA at any time via `POST /api/dna/reset`. This:
1. Deletes the existing `ConversationDNA` document
2. Creates a fresh document with default values
3. All learned patterns are permanently lost

### Privacy

- DNA data is stored per-user and never shared between users
- No DNA data is exposed to other users via any API
- Message content used for DNA analysis is not stored in the DNA document (only aggregated scores)
- The DNA collection is indexed only by `userId`
- No third-party services receive DNA data

### Data Retention

DNA data persists as long as the user account exists. There is no automatic expiration. To comply with data deletion requests, use the reset endpoint or delete the user account entirely.
