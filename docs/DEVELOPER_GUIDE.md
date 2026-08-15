# Developer Guide

## Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **MongoDB** | 7+ | Primary database |
| **Redis** | 7+ | Caching and rate limiting (optional) |
| **npm** | 9+ | Package manager |
| **Git** | 2+ | Version control |

### Platform-Specific Notes

- **Windows:** Use PowerShell 5.1+. All scripts use `npm` not `yarn`.
- **macOS/Linux:** Use bash. Scripts are cross-compatible.

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/emotune.git
cd emotune
```

### 2. Install Dependencies

```bash
npm run install:all
```

This runs:
```bash
npm install                   # Root (concurrently)
cd server && npm install      # Server dependencies
cd ../client && npm install   # Client dependencies
```

### 3. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example server/.env
```

**Minimum required configuration:**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/emotune
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
```

### 4. Start MongoDB and Redis

**Using Docker (recommended):**
```bash
docker compose up -d mongodb redis
```

**Without Docker:**
- Install MongoDB 7+ locally and start the service
- Install Redis 7+ locally and start the service

### 5. Run the Application

```bash
npm run dev
```

This starts both server (port 5000) and client (port 5173) concurrently.

### 6. Verify Installation

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{ "status": "ok", "mongodb": { "status": "connected" }, ... }
```

---

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both server and client in development mode |
| `npm run dev:server` | Start server only with nodemon |
| `npm run dev:client` | Start Vite dev server only |
| `npm run build` | Build client for production |
| `npm start` | Start server in production mode |
| `npm run install:all` | Install all dependencies (root + server + client) |

### Server Scripts (in `server/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon for auto-reload |
| `npm start` | Start in production mode |
| `npm run seed` | Seed test data |

### Client Scripts (in `client/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## Project Conventions

### Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| **Files** | camelCase | `recommendationEngine.js` |
| **Classes** | PascalCase | `class AdaptiveRecommendationEngine` |
| **Functions** | camelCase | `function getIntelligentSuggestions()` |
| **Routes** | kebab-case | `/api/orchestrator/suggestions/:chatId` |
| **Models** | PascalCase | `module.exports = mongoose.model('ConversationDNA', ...)` |
| **Controllers** | camelCase exports | `exports.getDNAProfile = async (req, res) => ...` |
| **Environment vars** | UPPER_SNAKE_CASE | `GEMINI_API_KEY` |
| **Constants** | UPPER_SNAKE_CASE | `const MIN_CONFIDENCE_MESSAGES = 20` |

### File Organization

```
server/
├── models/        # Mongoose schemas (data layer)
├── routes/        # Express route definitions (thin)
├── controllers/    # Request handlers (parse/validate/respond)
├── services/      # Business logic (reusable)
├── intelligence/   # AI/ML engine layer
├── core/          # Infrastructure (cache, circuit breaker, config)
├── middleware/    # Express middleware
├── utils/         # Helper functions
├── workers/       # Background processing
└── config/        # Database and external service config
```

### Error Handling

All controllers follow a try-catch pattern:

```javascript
exports.getDNAProfile = async (req, res) => {
  try {
    const profile = await dnaService.getProfile(req.userId);
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

The global error handler in `middleware/errorHandler.js` catches unhandled errors.

### Import Order

1. Built-in modules (path, fs, http)
2. Third-party packages (express, mongoose, axios)
3. Internal modules (models, services, utils)
4. Configuration (config, constants)

---

## How to Add a New Recommendation Type

Let's say you want to add a **"meme"** recommendation type:

### 1. Add to AdaptiveRecommendationEngine

**File:** `server/intelligence/adaptiveRecommendationEngine.js`

Add candidate generation:

```javascript
_getMemeCandidates(context) {
  const { currentEmotion = {}, topics } = context;
  const emotionId = currentEmotion.emotion || 'neutral';
  return [{
    query: emotionId,
    source: 'emotion',
    short: true,
    topics: topics || [],
  }];
}
```

Add to `getRecommendations()`:

```javascript
const candidateMemes = this._getMemeCandidates(context);
const scoredMemes = this._sortAndRank(
  candidateMemes.map(item => this._enrich(item, 'meme', ctxMap)),
  ctxMap
);
// Add to return object
return {
  ...,
  memes: scoredMemes.slice(0, limit),
};
```

### 2. Add Scoring Factor

If memes need a custom scoring dimension, add it to `SCORING_WEIGHTS`:

```javascript
SCORING_WEIGHTS = {
  ...existingWeights,
  memeRelevance: 0.05,
};
```

Add the scoring method:

```javascript
_memeRelevance(item, ctx) {
  // Custom scoring logic
  return item.memeFormat ? 0.8 : 0.3;
}
```

### 3. Add to Response

In `IntelligenceOrchestrator`, add memes to the response:

```javascript
recommendations: {
  ...existingRecs,
  meme: enrichedRecommendations.memes?.slice(0, 5) || [],
}
```

### 4. Add Feedback Support

In `server/models/FeedbackEvent.js`, add `'meme'` to the type enum:

```javascript
type: { enum: ['emoji', 'gif', 'sticker', 'shayari', 'song', 'video', 'suggestion', 'prediction', 'meme'] }
```

---

## How to Add a New Intelligence Engine

Let's say you want to add a **"Sentiment Analysis Engine"**:

### 1. Create the Engine File

**File:** `server/intelligence/sentimentEngine.js`

```javascript
class SentimentEngine {
  analyze(messages) {
    // Custom sentiment analysis logic
    return {
      overallScore: 0.72,
      trend: 'improving',
      signals: [...],
    };
  }
}

module.exports = new SentimentEngine();
```

### 2. Register in the IntelligenceOrchestrator

**File:** `server/intelligence/intelligenceOrchestrator.js`

```javascript
const sentimentEngine = require('./sentimentEngine');

class IntelligenceOrchestrator {
  constructor() {
    this.sentimentEngine = sentimentEngine;
  }
}
```

### 3. Add to Processing Pipeline

```javascript
async getIntelligentSuggestions(chatId, userId, options = {}) {
  // ... existing code ...

  const sentiment = this.sentimentEngine.analyze(msgs);

  return {
    // ... existing response ...
    sentiment,  // Add to response
  };
}
```

### 4. Add API Endpoint (if needed)

**File:** `server/routes/orchestratorRoutes.js`

```javascript
router.get('/sentiment/:chatId', authMiddleware, async (req, res) => {
  const result = await orchestrator.getSentiment(req.params.chatId);
  res.json({ sentiment: result });
});
```

---

## How to Add a New AI Provider

Let's say you want to add **"Claude (Anthropic)"**:

### 1. Add Configuration

**File:** `server/core/config.js`

```javascript
claude: {
  apiKey: process.env.CLAUDE_API_KEY || '',
  baseUrl: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1',
  models: (process.env.CLAUDE_MODELS || 'claude-opus-4,claude-sonnet-4').split(',').filter(Boolean),
  defaultModel: process.env.CLAUDE_DEFAULT_MODEL || 'claude-sonnet-4',
  timeout: parseInt(process.env.CLAUDE_TIMEOUT, 10) || 5000,
  retries: parseInt(process.env.CLAUDE_RETRIES, 10) || 1,
},
```

### 2. Add Provider Handler

**File:** `server/core/providerManager.js`

```javascript
claude: async (messages, options) => {
  const modelName = options.model || CONFIG.ai.claude.defaultModel;
  const response = await axios.post(
    `${CONFIG.ai.claude.baseUrl}/messages`,
    {
      model: modelName,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content || '',
      max_tokens: options.maxTokens ?? CONFIG.ai.maxTokens,
      temperature: options.temperature ?? CONFIG.ai.temperature,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ai.claude.apiKey,
        'anthropic-version': '2023-06-01',
      },
      timeout: options.timeout || CONFIG.ai.claude.timeout,
    }
  );
  return response.data.content?.[0]?.text || '';
},
```

### 3. Register Active Provider

**File:** `server/core/config.js` → `getActiveProviders()`

```javascript
function getActiveProviders() {
  const providers = [];
  if (CONFIG.ai.gemini.apiKey) providers.push('gemini');
  if (CONFIG.ai.groq.apiKey) providers.push('groq');
  if (CONFIG.ai.huggingface.apiKey) providers.push('huggingface');
  if (CONFIG.ai.claude.apiKey) providers.push('claude');
  return providers;
}
```

### 4. Add Task Routing (optional)

```javascript
TASK_MODEL_ROUTING = {
  ...existingRouting,
  creative: ['claude', 'gemini', 'qwen-2.5-72b'],
};
```

---

## Testing Guidelines

### Test Approach

The project uses manual testing via curl and the client UI. There is no automated test suite currently.

### What to Test

| Component | Test Cases |
|-----------|-----------|
| **Auth** | Signup, login, logout, refresh token, invalid credentials |
| **Messages** | Send, edit, delete, forward, pin, silent send |
| **AI Suggestions** | Emojis, GIFs, shayari, songs, videos per chat context |
| **DNA** | Profile retrieval, reset, writing style updates |
| **Recommendations** | Different emotions → different emojis, diversity, freshness |
| **Predictions** | Emotional transitions, state transitions, reply suggestions |
| **Feedback** | Accepted, dismissed, viewed actions update scores |
| **Circuit Breaker** | Provider failure → circuit opens → half-opens → closes |
| **Cache** | Redis connection failure → memory-only fallback |
| **Health** | MongoDB status, Redis status, system metrics |

### Testing AI Providers

```bash
# Test Gemini
curl -X POST http://localhost:5000/api/ai/rewrite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","tone":"professional"}'

# Test provider fallback by disabling Gemini
# Set GEMINI_API_KEY="" in .env and restart
```

### Testing Circuit Breaker

```bash
# Check circuit breaker status
curl http://localhost:5000/api/ai/cache \
  -H "Authorization: Bearer <token>"
```

---

## Code Review Checklist

### Architecture & Design
- [ ] Does the code follow the existing layering (Controller → Service → Model)?
- [ ] Are new features added to the IntelligenceOrchestrator if they involve AI?
- [ ] Are background tasks using process.nextTick for non-blocking execution?
- [ ] Is caching implemented for repeated operations?

### Performance
- [ ] Are database queries indexed?
- [ ] Is the circuit breaker pattern used for external API calls?
- [ ] Are AI calls protected by rate limiting?
- [ ] Are large payloads paginated?

### Security
- [ ] Are all protected routes using `authMiddleware`?
- [ ] Are AI providers rate-limited?
- [ ] Are passwords hashed with bcrypt?
- [ ] Is MongoDB injection prevention active (mongoSanitize)?
- [ ] Are JWTs properly validated?

### Error Handling
- [ ] Are all controller methods wrapped in try-catch?
- [ ] Are all async operations caught with `.catch()`?
- [ ] Are meaningful error messages returned to the client?
- [ ] Is the logger used for debugging?

### Consistency
- [ ] Does the code follow naming conventions?
- [ ] Are file names consistent with existing patterns?
- [ ] Is the response format consistent with other endpoints?
- [ ] Are enum values consistent with existing schemas?

### Documentation
- [ ] Are new API endpoints documented?
- [ ] Are new configuration variables added to `.env.example`?
- [ ] Are significant changes reflected in architecture docs?
