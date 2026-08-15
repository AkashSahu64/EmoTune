# Emotune ML Module

AI/ML integration layer for the Emotune chat application. Provides modular, production-ready pipelines for emotion analysis, intent classification, semantic search, fact checking, persona rewriting, and group decision facilitation.

## Architecture

```
ml/
├── config/          # Prompts, fallback chain config, model constants
├── models/          # LLM wrapper, embedding generator, fallback handler
├── pipelines/       # High-level AI task pipelines (emotion, intent, memory, etc.)
├── services/        # External API integrations (Spotify, YouTube, fact check, etc.)
└── utils/           # Text processing, JSON parsing, rate limiting, encryption
```

## Fallback Chain

Every AI call follows: **OpenAI (GPT-4o-mini) → Google Gemini (1.5 Flash) → Meta LLaMA (HuggingFace)**

Configure API keys in `server/.env`:
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
HUGGINGFACE_API_KEY=hf_...
```

## Usage with Backend

```javascript
// Emotion analysis
const { analyzeEmotion } = require('../ml/pipelines/emotionPipeline');
const result = await analyzeEmotion(messages);
// => { emoji: '😊', shayari: '...', song: '...', video_query: '...' }

// Intent classification
const { classifyIntent } = require('../ml/pipelines/intentPipeline');
const intents = await classifyIntent(messageText);
// => ['social', 'question']

// Memory embedding
const { generateMemoryEmbedding } = require('../ml/pipelines/memoryPipeline');
const vector = await generateMemoryEmbedding('some message text');

// Truth claim detection
const { detectClaim } = require('../ml/pipelines/truthPipeline');
const claim = await detectClaim(messageText);
// => { found: true, claim: '...', category: 'science', sources: [...] }

// Persona tone rewrite
const { rewriteTone } = require('../ml/pipelines/personaPipeline');
const rewritten = await rewriteTone('Hey, what's up?', 'professional');
// => { original: '...', rewritten: '...', changes: '...' }

// Group decision facilitation
const { facilitateDecision } = require('../ml/pipelines/decidePipeline');
const decision = await facilitateDecision(conversationHistory);
// => { summary, pollOptions, compromise, deadlock }

// Theme mapping
const { mapEmotionToTheme } = require('../ml/pipelines/themePipeline');
const theme = mapEmotionToTheme('joy');
// => 'aurora'
```

## Pipeline Details

### Emotion Pipeline
- Takes last N messages
- Calls LLM with emotion analysis prompt
- Returns emoji, Hindi shayari, song suggestion, video search query
- Graceful fallback to defaults on failure

### Intent Pipeline  
- Classifies single message into intents: task, social, question, idea, reminder
- Uses low-temperature prompt for consistent results

### Memory Pipeline
- Generates text embeddings via OpenAI/Gemini
- Performs cosine similarity search
- Supports verification flow via Socket.IO

### Truth Pipeline
- Detects factual claims in messages
- Queries Google Fact Check Tools API
- Computes Bayesian community truth score

### Persona Pipeline
- Rewrites message tone (professional/casual/romantic/humorous)
- Preserves original meaning and intent
- Side-by-side diff output

### DecideFlow Pipeline
- Analyzes group conversation history
- Generates poll options, compromise suggestions
- Detects deadlock situations

## Rate Limiting

Built-in token bucket rate limiter controls AI API call frequency:
- Default: 20 requests/minute with burst support
- Provider-specific buckets
- Auto-wait when limit reached

## Environment Variables

All API keys are read from `server/.env`. Required keys:
- `OPENAI_API_KEY` – Primary AI provider
- `GEMINI_API_KEY` – Secondary AI provider  
- `HUGGINGFACE_API_KEY` – Tertiary fallback
- `YOUTUBE_API_KEY` – Video search
- `PEXELS_API_KEY` – Video fallback
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` – Music search
- `GOOGLE_FACT_CHECK_API_KEY` – TruthSync fact checking
