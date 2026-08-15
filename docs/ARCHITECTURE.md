# Emotune Architecture

## System Overview

Emotune follows a **3-tier architecture** with an ML/AI layer:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                                 │
│  React + Vite + Socket.IO + TailwindCSS                             │
│  Single-page application (SPA) hosted on Vite dev server / static   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  REST API (HTTP) + WebSocket (Socket.IO)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVER TIER (Node.js + Express)                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ Controllers  │  │ Intelligence │  │       Services            │   │
│  │ (15 files)   │──│ Layer (24)   │──│ (21 files)                │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────────────┘   │
│         │                 │                    │                      │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌────────▼──────────────────┐  │
│  │   Middleware  │  │    Core      │  │     External APIs          │  │
│  │ auth, rate,  │  │ circuit,     │  │ Gemini, Groq, HuggingFace  │  │
│  │ error handler│  │ cache,       │  │ Giphy, YouTube, Spotify    │  │
│  └──────────────┘  │ health,      │  │ Cloudinary, Pexels, etc.  │  │
│                    │ provider     │  └─────────────────────────────┘  │
│   ┌──────────┐    │ manager,     │                                    │
│   │  Models   │    │ telemetry    │                                    │
│   │ (11)     │    └──────────────┘                                    │
│   └──────────┘                                                        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
              ┌─────────────┼────────────────┐
              ▼             ▼                 ▼
┌──────────────────┐ ┌───────────┐ ┌──────────────────┐
│   MongoDB 7+      │ │  Redis 7+ │ │   Cloudinary      │
│   Primary Store   │ │  Cache &  │ │   Media Storage   │
│   (Messages,      │ │  Sessions │ │   (images, files) │
│    Users, DNA,    │ │  Rate     │ │                   │
│    Analytics)     │ │  Limiting │ │                   │
└──────────────────┘ └───────────┘ └──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ML / AI TIER                                   │
│  Python microservices (ml/) + AI Provider APIs                        │
│  - Emotion detection via Gemini/Groq                                  │
│  - Intent classification                                              │
│  - Content recommendations                                            │
│  - Fact checking                                                      │
│  - Translation (LibreTranslate)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
emotune/
├── client/                          # React SPA (Vite)
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/                  # Reusable UI components (50+)
│   │   ├── contexts/                # React contexts (Auth, Socket, Theme, Persona)
│   │   ├── hooks/                   # Custom hooks (useAuth, useSocket, useMemory, etc.)
│   │   ├── pages/                   # Page components (Login, Dashboard, etc.)
│   │   ├── services/                # API client, AI service, encryption
│   │   ├── styles/                  # Global styles
│   │   ├── utils/                   # SEO, schema helpers
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # Express API server
│   ├── config/                      # DB, Cloudinary, Multer, constants
│   ├── controllers/                 # Request handlers (15 files)
│   ├── core/                        # System infrastructure (10 files)
│   ├── intelligence/                # AI/ML engine layer (24 files)
│   ├── logs/                        # Application logs
│   ├── middleware/                  # Auth, rate limiting, error handling
│   ├── models/                      # Mongoose schemas (11 files)
│   ├── routes/                      # Express routers (17 files)
│   ├── services/                    # Business logic (21 files)
│   ├── uploads/                     # Local file uploads
│   ├── utils/                       # JWT, logger, validators, seed, fallback
│   ├── workers/                     # Background workers (embedding, intent, truth)
│   └── server.js                    # Entry point with Socket.IO setup
│
├── ml/                              # Python ML services
│   ├── config/
│   ├── models/                      # ML model definitions
│   ├── pipelines/                   # Inference pipelines
│   ├── services/                    # Python service layer
│   └── utils/                       # Python utilities
│
├── docs/                            # Documentation (this directory)
├── docker-compose.yml               # Multi-container setup
├── Dockerfile                        # Server container definition
└── package.json                      # Root workspace config
```

## Layer Descriptions

### Controllers → Services → Models

```
Client Request
     │
     ▼
┌─────────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│  Route       │────▶│ Controller │────▶│  Service  │────▶│  Model   │
│  (validates  │     │ (parses    │     │ (business │     │ (MongoDB │
│   method+URL)│     │  request)  │     │  logic)   │     │  schema) │
└─────────────┘     └───────────┘     └──────────┘     └──────────┘
                           │                 │
                           ▼                 ▼
                    ┌─────────────┐   ┌────────────┐
                    │  Middleware  │   │ External   │
                    │  (auth,     │   │ APIs (AI,  │
                    │   rate-limit)│   │ media, etc)│
                    └─────────────┘   └────────────┘
```

### Intelligence Layer

```
┌──────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE ORCHESTRATOR                       │
│  Single entry point (intelligenceOrchestrator.js)                  │
│  Coordinates all sub-engines for a unified response                │
└───────────────────────────────┬──────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ Conversation     │ │ AdaptiveRecommend│ │ FuturePrediction     │
│ Intelligence     │ │ ationEngine      │ │ Engine               │
│ Layer (CIL)      │ │ (14-factor       │ │ (emotion, state,     │
│ - Analyzer       │ │  scoring)        │ │  topic, content      │
│ - Emotion        │ │ - Emoji/GIF/     │ │  predictions)        │
│ - Topic          │ │   Sticker/       │ │                      │
│ - State          │ │   Shayari/Song/  │ │                      │
│ - Momentum       │ │   Video/Suggest  │ │                      │
│ - Relationship   │ │ - Explanations   │ │                      │
│ - Snapshots      │ │ - Diversity      │ │                      │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SUPPORT ENGINES                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ Conversation  │  │ ContextEngine │  │ ExplainableAI        │  │
│  │ DNA Engine    │  │ 9-signal      │  │ Recommendation       │  │
│  │ - Language    │  │ context       │  │ explanations with    │  │
│  │ - Writing     │  │ builder       │  │ signal breakdowns    │  │
│  │   Style       │  │ + boost       │  │ + impact analysis    │  │
│  │ - Content     │  │ calculator    │  │ + confidence scoring │  │
│  │   Prefs       │  └───────────────┘  └──────────────────────┘  │
│  │ - Behavior    │  ┌───────────────┐  ┌──────────────────────┐  │
│  │   Patterns    │  │ Conversation  │  │ ConversationHealth   │  │
│  └───────────────┘  │ Momentum      │  │ Engine               │  │
│  ┌───────────────┐  │ - Speed       │  │ - 8-dimension        │  │
│  │ GoalDetection │  │ - Excitement  │  │   health scoring     │  │
│  │ Engine        │  │ - Dead zones  │  │ - Risk detection     │  │
│  │ - Primary/    │  │ - Depth       │  │ - Suggestion gen     │  │
│  │   Secondary   │  └───────────────┘  └──────────────────────┘  │
│  └───────────────┘  ┌───────────────┐  ┌──────────────────────┐  │
│                     │ TimeIntell-   │  │ SelfLearningEngine    │  │
│                     │ igence        │  │ - Feedback-based     │  │
│                     │ - Part of day │  │ - Personalization    │  │
│                     │ - Festivals   │  │ - Pattern learning   │  │
│                     │ - Seasons     │  └──────────────────────┘  │
│                     │ - Time-based  │                             │
│                     │   boosts      │                             │
│                     └───────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
```

## Conversation Intelligence Pipeline

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌───────────┐
│ Message  │───▶│  CIL     │───▶│  Analyzer    │───▶│  Emotion  │
│ Sent     │    │ Analyze()│    │  (rule-based │    │  Timeline │
└─────────┘    └──────────┘    │  + AI boost) │    └───────────┘
                               └──────┬───────┘
                                       │
              ┌────────────────────────┼────────────────────┐
              ▼                        ▼                     ▼
     ┌────────────────┐      ┌────────────────┐     ┌────────────────┐
     │ TopicEvolution  │      │ Conversation   │     │ Relationship   │
     │ Update topics   │      │ State Detect   │     │ Engine Detect  │
     │ Extract keywords│      │ Valid trans.   │     │ Score calc     │
     │ Detect changes  │      │ Momentum calc  │     │ Type classify  │
     └────────────────┘      └───────┬────────┘     └────────────────┘
                                      │
                                      ▼
                            ┌────────────────────┐
                            │ Background Worker  │
                            │ - Enqueue snapshot │
                            │ - Enqueue memory   │
                            │ - Enqueue DNA      │
                            │ - Enqueue embed    │
                            └────────────────────┘
```

## Recommendation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        STEP-BY-STEP FLOW                          │
│                                                                   │
│  1. LOAD CONTEXT                                                  │
│     ├── Load recent messages (10-20) from MongoDB                 │
│     ├── Initialize CIL (if new chat)                              │
│     ├── Run CIL Analyze (emotion, state, topic, momentum, rel)    │
│     └── Cache analysis result (300s)                              │
│                                                                   │
│  2. GATHER SIGNALS (parallel)                                     │
│     ├── DNA Profile (from MongoDB)                                │
│     ├── Conversation Goal (from GoalDetectionEngine)              │
│     ├── Time Context (time of day, festivals, season)             │
│     └── CIL Context (state, emotion, relationship, momentum)      │
│                                                                   │
│  3. BUILD UNIFIED CONTEXT                                         │
│     └── ContextEngine.buildContext() merges all signals           │
│                                                                   │
│  4. GENERATE ADAPTIVE RECOMMENDATIONS                             │
│     ├── Candidate generation (emojis, gifs, stickers, shayaris,   │
│     │   songs, videos, suggestions)                                │
│     ├── Multi-factor scoring (14 dimensions) per candidate        │
│     ├── Diversity penalty applied                                 │
│     ├── Freshness check (recent suggestions penalized)            │
│     └── Sort + rank + limit                                       │
│                                                                   │
│  5. GENERATE PREDICTIONS                                          │
│     └── FuturePredictionEngine.predict()                          │
│                                                                   │
│  6. ANALYZE HEALTH                                                │
│     └── ConversationHealthEngine.analyze()                        │
│                                                                   │
│  7. ENRICH WITH EXPLANATIONS                                      │
│     └── ExplainableAI.explainRecommendation() per item            │
│                                                                   │
│  8. RETURN RESPONSE                                               │
│     ├── analysis (emotion, state, relationship, topic)            │
│     ├── recommendations (emoji, sticker, shayari, song, reply)    │
│     ├── predictions (next emotion, state, reply, gif, etc.)      │
│     ├── health (overall score, dimensions, risks, suggestions)    │
│     ├── explanations (per-item signal breakdown)                  │
│     └── performance metadata                                      │
└─────────────────────────────────────────────────────────────────┘
```

## AI Provider Fallback Chain

```
                      ┌──────────────┐
                      │  User Request │
                      └──────┬───────┘
                             │
              ┌──────────────▼──────────────┐
              │  ProviderManager             │
              │  .chatCompletion(messages)   │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  Check Response Cache        │
              │  (in-memory → Redis)         │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  Get Active Providers        │
              │  (configured via API keys)   │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ GEMINI (Primary)│  │ GROQ (Secondary)│  │ HUGGINGFACE    │
│                │  │                │  │ (Tertiary)     │
│ Model Discovery│  │ Static Models  │  │ Default Model  │
│ Priority List: │  │ Priority:     │  │ Only used when │
│ 1. gemini-2.5  │  │ 1. deepseek-r1│  │ both above fail│
│    -flash      │  │ 2. llama-4    │  │                │
│ 2. gemini-2.5  │  │ 3. qwen-2.5  │  │ Rate limited   │
│    -flash-lite │  │ 4. llama-3.3 │  │ Higher timeout  │
│ 3. gemini-2.0  │  │ 5. mixtral   │  │ (8000ms)       │
│    -flash      │  └──────────┬────┘  └────────────────┘
│ 4. gemini-1.5  │             │
│    -flash      │             │ (sequential: try next on failure)
│ 5. gemini-1.5  │             │
│    -pro        │             │
└──────────┬─────┘             │
           │                   │
    ┌──────▼───────────────────▼──────┐
    │  Circuit Breaker (per provider: │
    │  model combo)                   │
    │  CLOSED → OPEN (3 failures)     │
    │  → HALF_OPEN (30s later)        │
    │  → CLOSED (2 successes)         │
    └─────────────────────────────────┘
```

## Circuit Breaker Pattern

Each provider+model combination has a dedicated circuit breaker with three states:

| State | Behavior | Transition |
|-------|----------|------------|
| **CLOSED** | Normal operation. Requests pass through. | → OPEN after `failureThreshold` (3) consecutive failures |
| **OPEN** | Requests are rejected immediately without attempting the call. | → HALF_OPEN after `openTimeoutMs` (30000ms) |
| **HALF_OPEN** | Limited requests allowed (1). Tests if service is healthy. | → CLOSED after `successThreshold` (2) successes → OPEN on failure |

```
                  ┌──────────────────────────────┐
                  │          CLOSED               │
                  │   (normal operation)           │
                  └──────────────┬───────────────┘
                                 │ 3 failures
                                 ▼
                  ┌──────────────────────────────┐
                  │           OPEN                │
                  │   (reject all requests)        │
                  └──────────────┬───────────────┘
                                 │ 30 seconds pass
                                 ▼
                  ┌──────────────────────────────┐
                  │        HALF_OPEN              │
                  │   (limited test requests)      │
                  └──────────────┬───────────────┘
                    ┌────────────┴────────────┐
                    ▼                         ▼
               2 successes               1 failure
                    │                         │
                    ▼                         ▼
              ┌──────────┐            ┌──────────────┐
              │  CLOSED  │            │    OPEN       │
              └──────────┘            └──────────────┘
```

Retry logic: Each model is tried with up to `retries` attempts (default 1) with exponential backoff (1000ms, 2000ms, 4000ms, max 8000ms).

## Two-Tier Cache Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                      CACHE SERVICE                                 │
│  Two-tier architecture: L1 (in-memory) → L2 (Redis)               │
└──────────────────────────────────────────────────────────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────────┐
│  L1: In-Memory Map   │            │  L2: Redis (optional)     │
│  - Fastest access     │            │  - Persistent across      │
│  - Per-instance cache  │            │    restarts               │
│  - TTL: 5 min default  │            │  - Shared across instances│
│  - Size: unbounded     │            │  - TTL: configurable      │
│  - Eviction: timed     │            │  - Prefix: emotune:       │
└──────────────────────┘            └──────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│  CACHE TYPES                                                      │
│  ┌──────────────┬──────────────┬──────────────┬────────────────┐ │
│  │ Response     │ Semantic     │ Prompt       │ General        │ │
│  │ Cache        │ Cache        │ Cache        │ Key-Value      │ │
│  ├──────────────┼──────────────┼──────────────┼────────────────┤ │
│  │ AI responses │ Similar      │ Processed    │ User data,     │ │
│  │ by prompt+   │ query match  │ prompts      │ config,        │ │
│  │ system prompt│ (hash-based) │              │ recommendations│ │
│  ├──────────────┼──────────────┼──────────────┼────────────────┤ │
│  │ TTL: 300s    │ TTL: 86400s  │ TTL: 3600s   │ TTL: 3600s     │ │
│  └──────────────┴──────────────┴──────────────┴────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## New Engine Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                     EMOTUNE ENGINE ARCHITECTURE v2                      │
│  DNA → Context → Adaptive Recommendation → Explainable                  │
└────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  1. CONVERSATION DNA ENGINE                                      │
│     ├── Per-user profile (MongoDB)                               │
│     ├── Analyzes every message asynchronously                    │
│     ├── 4 attribute groups (language, writing style, content     │
│     │   preferences, behavioral patterns)                         │
│     ├── Exponential moving average (α=0.05 to 0.10)             │
│     └── 20+ messages minimum for confidence ≥ 1.0                │
│                                                                   │
│  2. CONTEXT ENGINE                                                │
│     ├── Merges 9 signal sources into unified context              │
│     ├── Applies contextual boosts per recommendation type         │
│     ├── Caches context with 30s TTL                              │
│     └── Calculates overall confidence from per-signal weights     │
│                                                                   │
│  3. ADAPTIVE RECOMMENDATION ENGINE                                │
│     ├── 14 scoring factors with configurable weights              │
│     ├── Candidate generation from 7 sources (emotion, goal,      │
│     │   time, state, DNA, festival, fallback)                     │
│     ├── Diversity penalty applied to repeated source types       │
│     ├── Freshness tracking prevents repeat suggestions           │
│     └── Feedback loop improves over time                         │
│                                                                   │
│  4. EXPLAINABLE AI                                                │
│     ├── Per-item explanation with signal breakdown                │
│     ├── Top-3 signal reasons shown to user                        │
│     ├── Alternative considered display                            │
│     ├── Relationship, emotion, and goal impact analysis           │
│     └── Multiple format outputs (tooltip, panel, voice)           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models and Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ENTITY RELATIONSHIPS                             │
│                                                                      │
│  User (1) ────── has ──────► ConversationDNA (1)                    │
│  User (1) ────── has ──────► Bookmark (many)                        │
│  User (1) ────── has ──────► Persona (many)                         │
│  User (1) ────── sends ────► Message (many)                         │
│  User (1) ────── creates ──► GhostSession (many)                    │
│  User (1) ────── triggers ─► Decision (many)                        │
│  User (1) ────── submits ──► TruthClaim (many)                      │
│  User (1) ────── performs ─► FeedbackEvent (many)                   │
│  User (1) ────── generates ► AnalyticsEvent (many)                  │
│                                                                      │
│  Chat (1) ────── contains ──► Message (many)                        │
│  Chat (1) ────── has ──────► Decision (many)                        │
│  Chat (1) ────── has ──────► GhostSession (many)                    │
│  Chat (1) ────── has ──────► TruthClaim (many)                      │
│  Chat (1) ────── has ──────► MemoryEmbedding (many)                │
│                                                                      │
│  Message (1) ─── references ─► TruthClaim (0..1)                    │
│  Message (1) ─── references ─► Decision (0..1)                      │
│  Message (1) ─── has ──────► MemoryEmbedding (0..1)                 │
│  Message (1) ─── replies to ─► Message (0..1)                       │
│                                                                      │
│  TruthClaim (1) ── has ────► Vote (many)                            │
│  Decision (1) ──── has ────► Vote (many)                            │
│  FeedbackEvent (1) belongs to ─► User (1)                           │
│  AnalyticsEvent (1) belongs to ─► User (0..1)                       │
│  MemoryEmbedding (1) ── verified by ─► User (many)                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions and Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **MongoDB over PostgreSQL** | Document model fits message/conversation data well. Flexible schemas for evolving AI features. | Less powerful for complex joins. Message analytics require aggregation pipelines. |
| **In-memory CIL state** | Sub-millisecond conversation analysis. No DB reads for emotion tracking. | State lost on server restart. Conversations re-analyzed from history. |
| **Rule-based + AI hybrid** | 90% of suggestions use rule templates (fast, cheap). 10% use AI (deep context). | Rules can feel repetitive. AI adds latency and cost. |
| **Sequential provider fallback** | Simpler than parallel. Clear ordering by reliability. | Higher latency on failure (full timeout before trying next). |
| **Exponential Moving Average (DNA)** | Recent messages weighted more. Smooth adaptation to style changes. | Cold start requires ~20 messages for meaningful data. |
| **Lazy Redis connection** | App works without Redis. Graceful degradation to in-memory only. | Memory-only mode doesn't scale across instances. |
| **Background workers** | Message processing non-blocking. Fast response to user. | Consistency concerns. Possible data loss on crash. |
| **Circuit breaker per model** | Isolates individual model failures. Fine-grained degradation. | More state to track. Configuration complexity. |
| **Explainable recommendations** | Builds user trust. Helps debug recommendation quality. | Extra computation per recommendation. Larger response payloads. |
| **User preferences stored in User doc** | Single query for all prefs. Simpler than separate collection. | Large User documents. Potential for update conflicts. |
