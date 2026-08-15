# Emotune — Complete Software Architecture Documentation

> **Version:** 2.0.0  
> **Codename:** Conversation Intelligence Engine  
> **Generated:** 2026-07-09  
> **Purpose:** AI-Powered Conversation Intelligence Platform

---

## Table of Contents

1. [PROJECT OVERVIEW](#section-1-project-overview)
2. [PROJECT FOLDER STRUCTURE](#section-2-project-folder-structure)
3. [EVERY FILE EXPLANATION](#section-3-every-file-explanation)
4. [APPLICATION FLOW](#section-4-application-flow)
5. [FEATURES](#section-5-features)
6. [AI SYSTEM](#section-6-ai-system)
7. [CONVERSATION FLOW](#section-7-conversation-flow)
8. [DATABASE](#section-8-database)
9. [REDIS](#section-9-redis)
10. [AUTHENTICATION](#section-10-authentication)
11. [API DOCUMENTATION](#section-11-api-documentation)
12. [FRONTEND](#section-12-frontend)
13. [DEPENDENCIES](#section-13-dependencies)
14. [CONFIGURATION](#section-14-configuration)
15. [SECURITY](#section-15-security)
16. [PERFORMANCE](#section-16-performance)
17. [ERROR HANDLING](#section-17-error-handling)
18. [LOGGING](#section-18-logging)
19. [INTEGRATIONS](#section-19-integrations)
20. [FULL FEATURE MAP](#section-20-full-feature-map)
21. [APPLICATION LIFECYCLE](#section-21-application-lifecycle)
22. [CALL GRAPH](#section-22-call-graph)
23. [DEPENDENCY GRAPH](#section-23-dependency-graph)
24. [FEATURE DEPENDENCY MAP](#section-24-feature-dependency-map)
25. [PROJECT SUMMARY](#section-25-project-summary)

---

## Section 1: PROJECT OVERVIEW

### What is Emotune?

Emotune is a **full-stack AI-powered conversation intelligence platform** — a chat application that goes beyond simple messaging to provide real-time emotion analysis, contextual content recommendations, memory search, fact-checking, persona-driven rewriting, collaborative ghost sessions, and AI-facilitated group decision-making.

### What Problem Does It Solve?

Traditional chat apps are passive — they simply transport text between users. Emotune transforms messaging into an **intelligent conversation layer** that:

- Understands the emotional trajectory of every conversation
- Proactively suggests emoji, GIFs, shayari, songs, videos, and replies based on context
- Maintains searchable memory of conversation history
- Detects factual claims and community-verifies them (TruthSync)
- Allows users to rewrite messages in different tones (Personas)
- Facilitates anonymous temporary collaboration (Ghost Sessions)
- Automates group decision-making with AI (DecideFlow)

### Target Users

- Individuals who want emotionally intelligent messaging
- Groups needing collaborative decision-making tools
- Users who value privacy with ephemeral/ghost mode messaging
- People who enjoy Hindi/Urdu shayari and culturally-relevant content
- Teams wanting AI-assisted communication

### High Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React + Vite)                   │
│  ┌───────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐ │
│  │ Auth  │ │ Chat UI  │ │  AI      │ │ Ghost/Decide/etc  │ │
│  │Pages  │ │ + Bubbles│ │  Panels  │ │   Components      │ │
│  └───┬───┘ └────┬─────┘ └────┬─────┘ └────────┬──────────┘ │
│      │          │            │                 │            │
│      └──────────┴────────────┴─────────────────┘            │
│                        │ HTTP/WS                            │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│                 SERVER (Express + Socket.IO)                 │
│  ┌──────────┐ ┌───────────────┐ ┌──────────────────────┐   │
│  │   Auth   │ │  Intelligence │ │   Services Layer     │   │
│  │Middleware│ │  Layer (CIL)  │ │  (emoji, shayari,    │   │
│  │ JWT, OAuth│ │  Emotion,     │ │   translate, song,   │   │
│  │ RateLimit │ │  Topic, State,│ │   video, summary,    │   │
│  └──────────┘ │  Relationship, │ │   factCheck, memory) │   │
│               │  Momentum,     │ └──────────┬───────────┘   │
│               │  Prediction,   │            │               │
│               │  Recommendation│            │               │
│               └───────┬───────┘            │               │
│                       │                    │               │
│              ┌────────┴────────────────────┴────────┐      │
│              │         Core AI Provider Layer        │      │
│              │  Gemini → Groq → HuggingFace          │      │
│              │  (Circuit Breaker + Cache + Metrics)  │      │
│              └────────────────┬─────────────────────┘      │
│                               │                             │
│  ┌──────────┐ ┌──────────────┴──────────────┐ ┌──────────┐ │
│  │ MongoDB  │ │         Redis                │ │ BullMQ   │ │
│  │ (Atlas)  │ │  (Cache + Sessions)          │ │ (Workers)│ │
│  └──────────┘ └─────────────────────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Tier | Technology |
|------|-----------|
| **Frontend** | React 18, Vite 5, TailwindCSS 3, Framer Motion, Socket.IO Client |
| **Backend** | Node.js, Express 4, Socket.IO 4, BullMQ |
| **Database** | MongoDB Atlas (Mongoose 8) |
| **Cache** | Redis (with in-memory fallback) |
| **AI Providers** | Google Gemini API, Groq API, HuggingFace Inference API |
| **External APIs** | Giphy, Spotify, YouTube, Pexels, Pixabay, Deezer, iTunes, LibreTranslate, MyMemory, LottieFiles, Cloudinary, Google Fact Check |
| **Auth** | JWT (access + refresh tokens), bcrypt, httpOnly cookies |
| **Workers** | BullMQ-backed: embedding generation, intent classification, truth claim detection |

---

## Section 2: PROJECT FOLDER STRUCTURE

```
C:\Users\Home\Downloads\Emotune\
│
├── package.json                          # Root monorepo orchestrator (concurrently for dev:server + dev:client)
├── package-lock.json
│
├── client/                               # React Frontend (Vite)
│   ├── .env                              # VITE_API_URL=http://localhost:5000/api
│   ├── index.html                        # Entry HTML with SEO/OG/Schema meta tags
│   ├── package.json                      # Dependencies: react, framer-motion, socket.io-client, etc.
│   ├── postcss.config.js                 # Tailwind + autoprefixer
│   ├── tailwind.config.js                # Custom theme with glass, aurora, crimson, lime, neon colors
│   ├── vite.config.js                    # Proxy (/api → :5000), code splitting, manual chunks
│   │
│   └── src/
│       ├── main.jsx                      # ReactDOM root mount
│       ├── App.jsx                       # Provider tree: Helmet→Theme→Auth→Socket→Persona→ErrorBoundary→Router
│       ├── index.css                     # 2000+ lines: CSS variables, 6 themes, messaging CSS, glass system
│       │
│       ├── styles/
│       │   └── messaging.css             # WhatsApp-desktop style messaging shell CSS (~500 lines)
│       │
│       ├── services/
│       │   ├── api.js                    # axios instance, interceptor, and 9 service objects
│       │   ├── aiService.js              # Client AI service: getSuggestions, getGifs, getEmojis, etc.
│       │   └── encryption.js             # Client-side encryption stubs
│       │
│       ├── contexts/
│       │   ├── AuthContext.jsx            # User state, login/signup/logout, token management
│       │   ├── SocketContext.jsx          # Socket.IO connection lifecycle, onlineUsers tracking
│       │   ├── ThemeContext.jsx           # Theme state (6 themes), emotion-auto-theme, localStorage
│       │   └── PersonaContext.jsx         # Persona CRUD, active persona state
│       │
│       ├── hooks/
│       │   ├── useAuth.js                # AuthContext accessor
│       │   ├── useSocket.js              # SocketContext accessor
│       │   ├── useTheme.js               # ThemeContext accessor
│       │   ├── usePersona.js             # PersonaContext accessor
│       │   ├── useMemory.js              # Memory search, verification API calls
│       │   └── useNotificationSound.js   # Web Audio API notification chime + DND check
│       │
│       ├── router/
│       │   └── AppRouter.jsx             # Routes: /, /login, /signup, /app, /app/memory
│       │
│       ├── pages/
│       │   ├── LandingPage.jsx           # Full landing with 11 sections, JSON-LD schema
│       │   ├── LoginPage.jsx             # Email/password login with SocialLoginButtons
│       │   ├── SignupPage.jsx            # Registration with PasswordStrength, SocialLogin
│       │   ├── Dashboard.jsx             # Main chat app (~700 lines): Sidebar + Chat + RightPanel
│       │   └── MemorySearchPage.jsx      # Memory search UI
│       │
│       ├── utils/
│       │   ├── seo.js                    # SEO component with helmet, OG, Twitter meta
│       │   └── schema.js                 # JSON-LD generators: WebPage, FAQ, Service, HowTo, etc.
│       │
│       ├── components/
│       │   ├── common/
│       │   │   ├── Logo.jsx              # SVG logo
│       │   │   └── TextLogo.jsx          # "emotune" text logo
│       │   │
│       │   ├── auth/
│       │   │   ├── BrandShowcase.jsx     # Login/signup brand panel
│       │   │   ├── SocialLoginButtons.jsx # Google/GitHub buttons
│       │   │   ├── PasswordStrength.jsx  # Visual password strength meter
│       │   │   ├── TrustBadges.jsx       # Security badges (E2E, GDPR, etc.)
│       │   │   └── AuthFooter.jsx        # Auth page footer
│       │   │
│       │   ├── Landing/                  # 15 components for landing page
│       │   │   ├── landingData.js        # All content data (features, testimonials, FAQ)
│       │   │   ├── Hero.jsx
│       │   │   ├── FeatureSection.jsx
│       │   │   ├── FeatureCard.jsx
│       │   │   ├── HowItWorks.jsx
│       │   │   ├── ProductShowcase.jsx
│       │   │   ├── ChatScreenMockup.jsx
│       │   │   ├── AIChatMockup.jsx
│       │   │   ├── GroupChatMockup.jsx
│       │   │   ├── ChatPrimitives.jsx    # Avatar, Bubble, TypingDots, CheckMark, etc.
│       │   │   ├── StatsSection.jsx
│       │   │   ├── SecurityMockup.jsx
│       │   │   ├── Testimonials.jsx
│       │   │   ├── WhyChooseUs.jsx
│       │   │   ├── FAQSection.jsx
│       │   │   ├── CTASection.jsx
│       │   │   └── Footer.jsx
│       │   │
│       │   ├── ui/                      # 35+ reusable UI components
│       │   │   ├── index.js             # Re-exports all UI components
│       │   │   ├── Button.jsx
│       │   │   ├── Card.jsx
│       │   │   ├── GlassCard.jsx
│       │   │   ├── Modal.jsx
│       │   │   ├── ModalHeader.jsx
│       │   │   ├── Sheet.jsx
│       │   │   ├── Drawer.jsx
│       │   │   ├── Panel.jsx / PanelHeader.jsx / PanelFooter.jsx
│       │   │   ├── Avatar.jsx
│       │   │   ├── Badge.jsx
│       │   │   ├── StatusDot.jsx
│       │   │   ├── Tag.jsx
│       │   │   ├── Chip.jsx
│       │   │   ├── Toggle.jsx
│       │   │   ├── Select.jsx
│       │   │   ├── Slider.jsx
│       │   │   ├── Tooltip.jsx
│       │   │   ├── Menu.jsx / MenuItem.jsx
│       │   │   ├── Dropdown.jsx
│       │   │   ├── SearchInput.jsx
│       │   │   ├── IconButton.jsx
│       │   │   ├── ActionButton.jsx
│       │   │   ├── AIChip.jsx
│       │   │   ├── ListItem.jsx
│       │   │   ├── Skeleton.jsx
│       │   │   ├── LoadingSpinner.jsx
│       │   │   ├── EmptyState.jsx
│       │   │   ├── ScrollArea.jsx
│       │   │   ├── Divider.jsx
│       │   │   ├── Section.jsx
│       │   │   ├── Surface.jsx
│       │   │   ├── TabBar.jsx
│       │   │   ├── Carousel.jsx
│       │   │   ├── NotificationBadge.jsx
│       │   │   └── AnimatedCounter.jsx
│       │   │
│       │   ├── ChatScreen/
│       │   │   ├── ChatScreen.jsx        # Message list with virtualized rendering, date separators
│       │   │   └── RightPanel.jsx        # Profile/media/links/actions panel
│       │   │
│       │   ├── MessageBubble/            # 20+ message rendering components
│       │   │   ├── MessageBubble.jsx      # Main orchestrator: picks Renderer by type
│       │   │   ├── TextMessage.jsx
│       │   │   ├── ImageMessage.jsx
│       │   │   ├── VideoMessage.jsx
│       │   │   ├── VoiceMessage.jsx
│       │   │   ├── AudioMessage.jsx
│       │   │   ├── LocationMessage.jsx
│       │   │   ├── PollMessage.jsx
│       │   │   ├── FileMessage.jsx
│       │   │   ├── GifMessage.jsx
│       │   │   ├── SongMessage.jsx
│       │   │   ├── StickerMessage.jsx
│       │   │   ├── EmojiMessage.jsx
│       │   │   ├── ContactMessage.jsx
│       │   │   ├── DocumentMessage.jsx
│       │   │   ├── ForwardedLabel.jsx
│       │   │   ├── ReplyPreview.jsx
│       │   │   ├── ReactionBar.jsx
│       │   │   ├── ReactionPicker.jsx
│       │   │   ├── MessageTicks.jsx      # ✓✓ read/delivered/sent indicators
│       │   │   ├── MessageMetaBadges.jsx # AI/Silent/Ghost/Memory badges
│       │   │   ├── MessageInfoModal.jsx  # Message analytics timeline
│       │   │   ├── MediaPreviewModal.jsx # Full-screen media viewer with zoom/rotate/navigate
│       │   │   ├── BubbleContainer.jsx
│       │   │   ├── BubbleActions.jsx     # Hover toolbar (react, reply, forward, more)
│       │   │   ├── BubbleMenu.jsx        # Context menu (edit, delete, pin, info)
│       │   │   ├── BubbleFooter.jsx
│       │   │   ├── BubbleHeader.jsx
│       │   │   ├── hooks/useBubbleMenu.js, useHoverToolbar.js, useMediaPreview.js, useReactionPicker.js
│       │   │   ├── utils/messageHelpers.js, formatters.js, constants.js
│       │   │   └── styles/bubble.css, media.css, reactions.css, toolbar.css
│       │   │
│       │   ├── MessageInput/
│       │   │   └── MessageInput.jsx      # Text input with emoji picker, reply/edit indicators, silent toggle
│       │   │
│       │   ├── Navbar/
│       │   │   └── Navbar.jsx            # Chat header: back, name, online, call, video, AI, ghost, decide, more
│       │   │
│       │   ├── Sidebar/
│       │   │   └── Sidebar.jsx           # Chat list, quick actions (bookmarks, settings, group, new chat)
│       │   │
│       │   ├── ErrorBoundary/
│       │   │   └── ErrorBoundary.jsx     # React error boundary with fallback UI
│       │   │
│       │   ├── ThemeSwitcher/
│       │   │   └── ThemeSwitcher.jsx     # Theme gallery modal with search, emotion theme toggle
│       │   │
│       │   ├── IntentFilterBar/
│       │   │   └── IntentFilterBar.jsx   # Vertical (sidebar) + Horizontal (over chat) intent filters
│       │   │
│       │   ├── GhostCollaboration/
│       │   │   └── GhostCollaboration.jsx # Tldraw whiteboard + ReactQuill doc + Monaco code editor
│       │   │
│       │   ├── TruthScoreIndicator/
│       │   │   └── TruthScoreIndicator.jsx # Truth score with color, voting, sources
│       │   │
│       │   ├── DecideFlow/
│       │   │   └── DecideFlow.jsx        # AI-facilitated group decision making
│       │   │
│       │   ├── BookmarksPanel/
│       │   │   └── BookmarksPanel.jsx    # Saved bookmarks with type icons
│       │   │
│       │   ├── MediaPreviewModal/
│       │   │   └── MediaPreviewModal.jsx # (likely duplicate/reference)
│       │   │
│       │   ├── GroupModal/
│       │   │   └── GroupModal.jsx        # Create group chat modal
│       │   │
│       │   ├── Loaders/
│       │   │   └── Loader.jsx           # Loading animation
│       │   │
│       │   └── SEO/
│       │       └── SEO.jsx              # SEO component with Helmet
│       │
│       └── styles/
│           └── messaging.css            # Advanced WhatsApp-desktop messaging shell
│
├── server/                               # Express Backend
│   ├── .env                              # All configuration (keys, URLs, feature flags, rate limits)
│   ├── package.json                      # Dependencies: express, mongoose, socket.io, openai, bullmq, etc.
│   ├── server.js                         # Entry point: Express app, Socket.IO, middleware, route mounting
│   │
│   ├── config/
│   │   ├── constants.js                  # Legacy constants (API keys from env)
│   │   ├── db.js                         # MongoDB connection (mongoose.connect with pool config)
│   │   ├── cloudinary.js                 # Cloudinary config
│   │   └── multer.js                     # Multer disk storage (100MB limit)
│   │
│   ├── models/
│   │   ├── User.js                       # User schema: 100+ fields, personas subdoc, preferences tree
│   │   ├── Message.js                    # Message schema: types, metadata, intents, readBy, deliveredTo
│   │   ├── Chat.js                       # Chat schema: direct/group, participants, lastMessage, pinned
│   │   ├── TruthClaim.js                 # Truth claim: votes, sources, score, status
│   │   ├── Decision.js                   # Decision schema: poll options, votes, status
│   │   └── MemoryEmbedding.js            # Encrypted vector storage with verification flow
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js             # JWT auth + optional auth middleware
│   │   ├── errorHandler.js               # Global error handler (Validation, Cast, Duplicate, Joi)
│   │   └── rateLimiter.js                # express-rate-limit: API(100/min), AI(20/min), Auth(10/min)
│   │
│   ├── core/                             # Central AI infrastructure
│   │   ├── config.js                     # Centralized config object with all env vars + defaults
│   │   ├── logger.js                     # Structured logger + metrics collector
│   │   ├── cacheService.js               # Redis + in-memory dual cache (response, semantic, prompt)
│   │   ├── circuitBreaker.js             # Per-provider-per-model circuit breaker (closed/open/half-open)
│   │   ├── providerManager.js            # AI provider router: Gemini→Groq→HuggingFace with model discovery
│   │   └── emotionPipeline.js            # Hybrid rule engine + AI emotion analysis
│   │
│   ├── intelligence/                     # Conversation Intelligence Layer
│   │   ├── index.js                      # Re-exports all intelligence modules
│   │   ├── conversationIntelligenceLayer.js  # Central orchestrator (single entry point for all analysis)
│   │   ├── conversationAnalyzer.js           # Rule + AI hybrid analysis pipeline
│   │   ├── emotionTimeline.js                # Emotion progression tracking (22 emotions, weighted)
│   │   ├── topicEvolution.js                 # Topic extraction and tracking (18 categories)
│   │   ├── conversationState.js              # State machine (12 states with valid transitions)
│   │   ├── relationshipEngine.js             # Relationship detection (14 types, score + confidence)
│   │   ├── conversationMomentum.js           # Conversation velocity, intensity, pause detection
│   │   ├── snapshotMemory.js                 # Every-10-messages compressed snapshots
│   │   ├── futurePrediction.js               # Next emotion/state/reply/action prediction
│   │   ├── recommendationEngine.js           # Weighted scoring for all suggestion types
│   │   ├── vectorMemory.js                   # Embedding-based semantic search (hash-based)
│   │   └── backgroundWorker.js               # Queue-based async processing (6 queues)
│   │
│   ├── services/
│   │   ├── aiService.js                 # CIL facade: analyzeAndSuggest, getChatContext
│   │   ├── emojiService.js              # Emoji keyword matching + Giphy/Lottie GIFs + CIL recommendations
│   │   ├── shayariService.js            # Hindi/Urdu shayari: static + AI-generated + CIL recommendations
│   │   ├── summaryService.js            # Conversation summary: CIL snapshots + AI + rule-based
│   │   ├── translateService.js          # Translation: LibreTranslate → MyMemory → AI (3-tier fallback)
│   │   ├── songService.js               # Music: iTunes → Deezer → Spotify → JioSaavn (4-tier parallel)
│   │   ├── videoService.js              # Video: Dailymotion → YouTube → Pexels → Pixabay (4-tier parallel)
│   │   ├── spotifyService.js            # Spotify auth + search + fallback to JioSaavn
│   │   ├── youtubeService.js            # YouTube search + Pexels + Pixabay fallback chain
│   │   ├── lottieService.js             # LottieFiles API + curated fallback animations
│   │   ├── intentService.js             # Async intent classification + unread counts
│   │   ├── factCheckService.js          # Claim detection, external source checking, voting
│   │   ├── embeddingService.js          # Memory embedding creation + encrypted semantic search
│   │   ├── cloudinaryService.js         # Cloudinary upload + local fallback
│   │   └── parallelFallback.js          # Promise.race + Promise.allSettled utility for parallel fetches
│   │
│   ├── controllers/
│   │   ├── authController.js            # signup, login, logout, refreshToken, getMe, updateProfile
│   │   ├── aiController.js              # getSuggestions, getEmojis, getGifs, getShayari, getSongs, getVideos,
│   │   │                                # rewriteMessage, getEmotionTheme, getSummary, translateMessage,
│   │   │                                # getStreamingSuggestions, getConversationIntelligence, getMetrics, getCacheStatus
│   │   ├── messageController.js         # send, get, delete, edit, forward, pin, markRead, silent messages
│   │   ├── chatController.js            # getUserChats, getOrCreateDirectChat, searchUsers
│   │   ├── userController.js            # getMe, updateProfile, updatePreferences, changePassword, deleteAccount
│   │   ├── memoryController.js          # search, get, requestVerification, respondVerification
│   │   ├── personaController.js         # create, get, update, delete, setActive
│   │   ├── groupController.js           # create, get, addMember, removeMember
│   │   ├── truthController.js           # createClaim, getClaim, getChatClaims, voteOnClaim
│   │   ├── ghostController.js           # createSession, getChatSessions, destroySession
│   │   ├── decideController.js          # triggerDecision, voteOnDecision, getDecision, getChatDecisions
│   │   └── bookmarkController.js        # create, get, delete, incrementUsage
│   │
│   ├── routes/
│   │   ├── authRoutes.js                # POST /signup, /login, /logout, /refresh-token, GET /me
│   │   ├── aiRoutes.js                  # GET /suggestions/:chatId, /emojis/:chatId, /gifs/:chatId,
│   │   │                                # /shayari/:chatId, /songs/:chatId, /videos/:chatId,
│   │   │                                # /summary/:chatId, /intelligence/:chatId, /stream/:chatId,
│   │   │                                # /metrics, /cache, POST /rewrite, /translate
│   │   ├── messageRoutes.js             # POST /, GET /:chatId, DELETE /:messageId, PATCH /:messageId/edit,
│   │   │                                # POST /forward, /:messageId/pin, /:messageId/unpin, PATCH /read,
│   │   │                                # GET /silent, POST /accept-silent, GET /:chatId/counts
│   │   ├── chatRoutes.js                # GET /, POST /direct/:userId
│   │   ├── userRoutes.js                # GET /me, /search, PUT /profile, /preferences, /password,
│   │   │                                # DELETE /account, GET /sessions, POST /logout-other
│   │   ├── memoryRoutes.js              # GET /search, /, POST /:memoryId/verify, /:memoryId/respond
│   │   ├── personaRoutes.js             # POST /, GET /, PATCH /:personaId, DELETE /:personaId, POST /:personaId/activate
│   │   ├── groupRoutes.js               # POST /, GET /, POST /add-member, /remove-member
│   │   ├── truthRoutes.js               # POST /, GET /:claimId, /chat/:chatId, POST /:claimId/vote
│   │   ├── ghostRoutes.js               # POST /, GET /:chatId, DELETE /:id
│   │   ├── decideRoutes.js              # POST /:chatId/trigger, /:decisionId/vote, GET /:decisionId, /chat/:chatId
│   │   ├── bookmarkRoutes.js            # POST /, GET /, DELETE /:bookmarkId, PATCH /:bookmarkId/use
│   │   └── uploadRoutes.js              # POST / (multer → Cloudinary → local fallback)
│   │
│   ├── workers/                         # BullMQ background workers
│   │   ├── truthWorker.js               # Truth claim detection (concurrency 5)
│   │   ├── intentWorker.js              # Intent classification (concurrency 10)
│   │   └── embeddingWorker.js           # Memory embedding generation (concurrency 5)
│   │
│   ├── utils/
│   │   ├── validators.js                # Joi schemas: signup, login, message, persona, group, bookmark, etc.
│   │   ├── seed.js                      # Test user seeder (test@emotune.app / Test1234!)
│   │   ├── logger.js                    # File-based logger (logs/YYYY-MM-DD.log)
│   │   ├── jwt.js                       # Token generation + verification
│   │   └── fallbackChain.js             # Legacy fallback: executeWithFallback, generateEmbeddingFallback
│   │
│   └── uploads/                         # Local file storage (fallback when Cloudinary unavailable)
│       └── *.mp4, *.mov, *.zip          # Uploaded files
│
├── ml/                                  # AI/ML Module
│   ├── README.md                        # Documentation
│   │
│   ├── config/
│   │   ├── prompts.js                   # AI system prompts: emotion, intent, truthClaim, personaRewrite,
│   │   │                                # decideFacilitator, memorySummary
│   │   ├── fallback.js                  # Provider list + embedding provider list + helpers
│   │   └── constants.js                 # Model names, temperatures, thresholds, endpoints
│   │
│   ├── models/
│   │   ├── llmModel.js                  # Re-exports chatCompletion + streamCompletion from server/core
│   │   ├── fallbackHandler.js           # Generic fallback: executeWithFallback, executeWithTimeout
│   │   └── embeddingModel.js            # Embedding generation via Gemini + fallback zero vector
│   │
│   ├── pipelines/
│   │   ├── emotionPipeline.js           # Re-exports from server/core/emotionPipeline
│   │   ├── intentPipeline.js            # LLM-based intent classification (task/social/question/idea/reminder)
│   │   ├── memoryPipeline.js            # Embedding generation + cosine similarity search + verification trigger
│   │   ├── personaPipeline.js           # LLM-based tone rewriting + conversation tone detection
│   │   ├── truthPipeline.js             # Claim detection + Bayesian truth score + truth indicator
│   │   ├── themePipeline.js             # Emotion→theme mapping + emoji→theme mapping
│   │   └── decidePipeline.js            # AI decision facilitation + vote aggregation
│   │
│   ├── services/
│   │   ├── vectorService.js             # Cosine similarity, normalize, euclidean, dot product, encrypt/decrypt
│   │   ├── mediaService.js              # Song/video search with Spotify/Saavn/Pexels/Pixabay
│   │   ├── lyricsService.js             # Lyrics fetch from lyrics.ovh + fallback
│   │   └── factCheckService.js          # Google Fact Check Tools API + community score computation
│   │
│   └── utils/
│       ├── textPreprocessor.js          # Text cleaning, language detection, message truncation, token estimation
│       ├── responseParser.js            # JSON extraction from AI responses (code blocks, cleanup)
│       ├── rateLimiter.js               # Token bucket rate limiter (multi-provider)
│       └── encryption.js                # AES-256-GCM vector encryption/decryption
│
└── node_modules/                        # Root + server + client dependencies
```

---

## Section 3: EVERY FILE EXPLANATION

### 3.1 Root

#### `package.json` (root)
- **Purpose:** Monorepo orchestrator
- **Exports:** Scripts `dev` runs both server+client via `concurrently`
- **Depends on:** `concurrently` ^8.2.2

### 3.2 Server Entry & Config

#### `server/server.js`
- **Purpose:** Application entry point
- **Flow:** Loads dotenv → creates Express app + HTTP server → creates Socket.IO → connects MongoDB + Cloudinary → initializes cache → mounts middleware (helmet, cors, morgan, json, cookieParser, mongoSanitize, rateLimiter) → mounts 15 route modules → global error handler → seeds test user in dev → starts Socket.IO connection handling (auth, online tracking, typing, memory verification, ghost sync, decision votes, message delivery, read receipts)
- **Exports:** `{ app, server, io }`
- **Key details:** 15 route prefixes, 19 socket event handlers, onlineUsers Map

#### `server/.env`
- **Purpose:** All environment configuration (API keys, URLs, timeouts, rate limits)
- **Contains:** MONGO_URI, REDIS_URL, JWT_SECRET, GEMINI_API_KEY, HUGGINGFACE_API_KEY, YOUTUBE_API_KEY, PEXELS_API_KEY, SPOTIFY_CLIENT_ID, CLOUDINARY, circuit breaker settings, rate limit settings

#### `server/config/db.js`
- **Purpose:** MongoDB connection
- **Details:** maxPoolSize=10, serverSelectionTimeoutMS=5000, socketTimeoutMS=30000

#### `server/config/constants.js`
- **Purpose:** Legacy constants from env (used by older modules)
- **Dependencies:** dotenv

#### `server/config/cloudinary.js`
- **Purpose:** Cloudinary configuration
- **Exports:** `{ cloudinary, connectCloudinary }`

#### `server/config/multer.js`
- **Purpose:** File upload configuration (disk storage, 100MB limit)
- **Storage:** `server/uploads/` with timestamp-random filenames

### 3.3 Server Models

#### `server/models/User.js`
- **Schema:** username, email (unique), password (select:false, bcrypt hashed), avatar, status, bio, phone, wallpaper, personas[] (embedded subdoc), settings, preferences (deeply nested: account, appearance, notifications, privacy, chat, ai, ghostMode, media, accessibility, advanced), encryptionKey, refreshToken, refreshTokens[]
- **Methods:** comparePassword, toPublicJSON
- **Pre-save hook:** Auto-hash password
- **Indexes:** username unique, email unique

#### `server/models/Message.js`
- **Schema:** sender (ref User), chat (ref Chat), content, type (enum: text/emoji/gif/shayari/song/video/image/audio/file/system/poll/decision), mediaUrl, mediaType, metadata (songTitle, artist, pollOptions, decisionRef, etc.), intents[], silent, truthClaimRef, personaUsed, isBookmarked, readBy[], deliveredTo[], replyTo, editedAt, deletedFor[]
- **Indexes:** {chat, createdAt}, {chat, intents}, {sender, createdAt}

#### `server/models/Chat.js`
- **Schema:** type (direct/group), name, groupDescription, createdBy, participants[{user, role, nickname, joinedAt}], lastMessage, pinnedMessages[], isArchived, silentMessages[]

#### `server/models/TruthClaim.js`
- **Schema:** claimText, message (ref Message), chat, submittedBy, category (science/health/politics/history/technology/general/unknown), truthScore, calculatedScore, sources[], votes[], totalUpvotes, totalDownvotes, factCheckStatus
- **Indexes:** {message}, {chat, truthScore}, {category}

#### `server/models/Decision.js`
- **Schema:** chat, createdBy, title, description, pollOptions[{text, voteCount, voters}], status, deadlock, compromise, expiry

#### `server/models/MemoryEmbedding.js`
- **Schema:** message (ref Message), chat, sender, encryptedVector, iv, salt, textSnippet, messageType, verifiedBy[{user, status, editedText}], isVerified, metadata
- **Indexes:** {chat, isVerified}, {sender}

### 3.4 Server Middleware

#### `authMiddleware.js`
- **Functions:** `authMiddleware` (required), `optionalAuth` (silent fail)
- **Flow:** Extract token from Authorization header or cookies → verify with JWT → find user → attach to req
- **Error types:** TokenExpiredError → 401 with code TOKEN_EXPIRED

#### `errorHandler.js`
- **Purpose:** Global Express error handler
- **Handles:** ValidationError, CastError, duplicate key (11000), Joi errors
- **Development mode:** Includes stack trace in response

#### `rateLimiter.js`
- **Purpose:** Three rate limiters using express-rate-limit
- **Limits:** API: 100/min, AI: 20/min, Auth: 10/min

### 3.5 Server Core Layer

#### `core/config.js`
- **Purpose:** Centralized configuration singleton
- **Exports:** `CONFIG` object with nested structure, `GEMINI_MODEL_PRIORITY`, `GROQ_MODEL_PRIORITY`, `TASK_MODEL_ROUTING`, `TASK_TEMPERATURE`, `TASK_MAX_TOKENS`, `TASK_JSON_MODE`, helper functions (getActiveProviders, getGeminiModels, getGroqModels, getModelsForTask, getTemperatureForTask, needsJsonMode)
- **Task routing:** 12 task types mapped to specific models

#### `core/logger.js`
- **Purpose:** Structured console logger + metrics collector
- **Exports:** `{ logger, metrics }`
- **Logger levels:** error, warn, info, debug (configurable via LOG_LEVEL)
- **Metrics:** aiCalls, aiErrors, aiLatencyMs, cacheHits, cacheMisses, providerCalls, providerErrors, providerLatency
- **Methods:** trackAiCall, trackCacheHit, trackCacheMiss, getReport, reset

#### `core/cacheService.js`
- **Purpose:** Dual-layer cache (Redis + in-memory)
- **Cache types:** Standard (get/set), Response (prompt+system+task hash), Semantic (query hash), Prompt (prompt+task)
- **TTLs:** configurable via RESPONSE_CACHE_TTL (300s), SEMANTIC_CACHE_TTL (86400s), CACHE_TTL (3600s)
- **Memory TTL:** 60s per entry (beneath Redis)
- **Methods:** get, set, getResponseCache, setResponseCache, getSemanticCache, setSemanticCache, invalidate, getPromptCache, setPromptCache, healthCheck, init
- **Redis key prefix:** `emotune:`

#### `core/circuitBreaker.js`
- **Purpose:** Per-provider-per-model circuit breaker
- **States:** CLOSED (normal) → OPEN (after failureThreshold failures) → HALF_OPEN (after openTimeoutMs) → CLOSED (after successThreshold successes)
- **Configuration:** failureThreshold=3, successThreshold=2, halfOpenMaxRequests=1, openTimeoutMs=30000

#### `core/providerManager.js`
- **Purpose:** AI provider router and execution
- **Exports:** `chatCompletion`, `streamCompletion`, `discoverAvailableModels`, `providerHandlers`
- **Provider order:** Gemini → Groq → HuggingFace
- **Model auto-discovery:** Gemini models are fetched live from API, cached for 5 minutes
- **Retry:** Per-model retry with exponential backoff (1s, 2s, 4s max 8s)
- **Circuits:** Each provider+model pair has its own circuit breaker
- **Cache:** Full response caching (prompt + system + task hash)
- **Streaming:** SSE-based via Gemini's streamGenerateContent (falls back to non-streaming chatCompletion)
- **Handlers:** `gemini` (REST API), `groq` (OpenAI-compatible API), `huggingface` (inference API)

#### `core/emotionPipeline.js`
- **Purpose:** Hybrid emotion analysis (rule engine + AI)
- **Exports:** `classifyByRule`, `analyzeEmotion`, `analyzeEmotionBulk`, `emojiToMood`, `EMOTION_KEYWORDS`, `EMOJI_KEYWORDS`, `EMOTION_EMOJI_MAP`, `EMOTION_SONG_MAP`, `EMOTION_VIDEO_MAP`, `EMOTION_SHAYARI_MAP`
- **Rule engine:** 7 emotion categories with weighted keywords + emoji detection + greeting/gratitude detection
- **AI path:** Only when rule confidence < 0.9 or forceAI=true
- **Caching:** Semantic cache on conversation text hash

### 3.6 Intelligence Layer

#### `conversationIntelligenceLayer.js`
- **Purpose:** Central orchestrator — single entry point for all conversation analysis
- **Class:** `ConversationIntelligenceLayer`
- **State:** In-memory Map of chatId → conversation state
- **Methods:**
  - `initialize(chatId, existingData)` — Load existing conversation
  - `analyze(chatId, message, options)` — Full analysis pipeline
  - `getRecommendations(chatId, preferences)` — Weighted recommendations
  - `getPredictions(chatId)` — Future state/emotion/reply predictions
  - `getContext(chatId)` — Complete conversation snapshot
  - `getConversationState`, `getEmotionProfile`, `getRelationshipProfile`, `getTopicProfile`, `getMomentum` — Individual profile accessors
  - `getCompressedPrompt(chatId)` — Snapshot-based prompt for AI
  - `getVectorSearch`, `getWorkerStats`, `getConversationIds`, `getConversationStats`
- **Background workers:** Registers handlers for ANALYSIS, SNAPSHOT, EMBEDDING, MEMORY, PREDICTION queues
- **Caching:** Analysis cached for 300s, recommendations for 60s
- **Logging:** Every analysis logged with emotion, state, topic, relationship

#### `conversationAnalyzer.js`
- **Purpose:** Single analysis pipeline
- **Exports:** `analyze(messages, options)`, `detectEmotion(text)`
- **Flow:** Detect emotion (keyword) → AI fallback (if < 0.7 confidence and useAI=true) → Update timeline → Extract topics → Detect state → Detect relationship → Calculate momentum → Predict future → Create snapshot if needed
- **Returns:** Complete analysis object with all dimensions
- **Emotion words:** 22 emotions, 100+ keywords, exclamation/question boosting

#### `emotionTimeline.js`
- **Purpose:** Track emotion progression
- **Methods:** addEntry, getCurrentEmotion, getTrend (improving/declining/volatile/stable), getEmotionVolatility, getDominantEmotion, getEmotionProgression, detectEscalation, detectDeescalation
- **Max entries:** 50
- **Weights:** joyful:10 through depressed:-3 (22 emotions mapped)

#### `topicEvolution.js`
- **Purpose:** Extract and track conversation topics
- **Topic categories:** 18 (work, school, relationships, family, health, food, travel, movies, music, sports, tech, finance, education, shopping, gaming, politics, celebration)
- **Methods:** addMessage, getCurrentTopic, getTopicHistory, detectTopicChange, isNewTopic, getTopicTrend, getTopicImportance

#### `conversationState.js`
- **Purpose:** State machine for conversation flow
- **States:** 12 (greeting, introduction, small_talk, discussion, planning, argument, apology, celebration, flirting, professional, support, ending, silence)
- **Valid transitions:** Pre-defined adjacency matrix
- **Keyword detection:** Each state has 5-15 trigger keywords
- **Methods:** detectState, isValidTransition, updateState, getStateDescription, suggestNextActions

#### `relationshipEngine.js`
- **Purpose:** Detect relationship type between conversation participants
- **Types:** 14 (unknown, friend, best_friend, family, sibling, parent, teacher, boss, colleague, client, romantic, spouse, ex, acquaintance)
- **Detection:** Indicator keywords → type-by-indicator → score-based fallback (50+ → friend, 20+ → acquaintance)
- **Score factors:** Message count, average length, emotion positivity, keyword indicators, recency
- **Confidence:** Based on message count tiers (5→20→50→100+)

#### `conversationMomentum.js`
- **Purpose:** Calculate conversation velocity and dynamics
- **Metrics:** speed (dead/slow/moderate/fast/very_fast), velocity (msgs/hr), trend (accelerating/decelerating/steady), intensity (increasing/decreasing/stable), isPaused, isActive, isExciting, isDead
- **Calculation:** Time between messages, message length trends, response time variance

#### `snapshotMemory.js`
- **Purpose:** Every-10-messages compressed conversation snapshots
- **Snapshot contains:** Summary (auto-generated), emotion (current+trend), topics, conversation state, relationship, momentum, pending questions, important events, message previews
- **Methods:** shouldSnapshot, createSnapshot, getContext, compressForPrompt

#### `futurePrediction.js`
- **Purpose:** Predict conversation future state
- **Predictions:** nextEmotion (with confidence + alternatives), nextState, suggestedReplies (up to 8), suggestedActions, conversationIntent, momentumPrediction, needIntervention
- **Emotion transitions:** Pre-defined adjacency for 8 emotions
- **State transitions:** Pre-defined adjacency for 12 states
- **Reply generation:** Contextual based on emotion + state + topic + relationship

#### `recommendationEngine.js`
- **Purpose:** Weighted scoring for all suggestion types
- **Suggestion types:** emoji, sticker, shayari, song, reply
- **Scoring factors:** emotion (0.4), state (0.3), relationship (0.2), topic (0.2), momentum (0.3), excitement (+0.3), volatility (-0.2), freshness (-0.3 to +0.15)
- **Freshness penalty:** Same recommendation within 3 hours gets negative modifier
- **Emoji map:** 22 mood categories mapped to emoji arrays
- **Sticker map:** Mood-to-sticker-type mapping
- **Relationship weights:** Per-type coefficients for casual/romantic/formal/supportive

#### `vectorMemory.js`
- **Purpose:** In-memory embedding-based semantic search
- **Methods:** store, search (cosine similarity with threshold), recall, forget, forgetBefore, getStats
- **Capacity:** 10,000 entries
- **Embedding:** Hash-based frequency vector (64 dimensions)

#### `backgroundWorker.js`
- **Purpose:** Queue-based async task processing
- **Queues:** ANALYSIS, SNAPSHOT, EMBEDDING, MEMORY, PREDICTION, ANALYTICS
- **Methods:** register, enqueue, getResult, getQueueLength, getStats
- **Processing:** Sequential per-queue, concurrent across queues

### 3.7 Server Services

#### `aiService.js`
- **Purpose:** Facade for CIL (Conversation Intelligence Layer)
- **Functions:** `analyzeAndSuggest(chatId, message, options)` — CIL.analyze + CIL.getRecommendations, `getChatContext(chatId)`, `getPredictions(chatId)`, `getCompressedHistory(chatId)`

#### `emojiService.js`
- **Purpose:** Emoji, GIF, and sticker suggestions
- **Static data:** 30 hand-crafted emoji entries with keyword arrays
- **EMOJI_MOOD_MAP:** 13 mood categories with emoji arrays
- **SYNONYMS:** 6 mood synonym groups for keyword expansion
- **Methods:**
  - `matchEmojisByText(text, count)` — Score-based emoji matching with keyword expansion
  - `getEmojisByMood(mood, count)` — Mood-based emoji lookup
  - `searchGiphy(query, limit)` — Giphy API search
  - `getEmojiSuggestions(chatId, messageText, count)` — CIL recommendations + fallback
  - `getGifSuggestions(chatId, query, count)` — Parallel Giphy + Lottie
  - `getStickerSuggestions(query, count)` — Lottie-based stickers

#### `shayariService.js`
- **Purpose:** Hindi/Urdu shayari generation
- **Static collection:** 30+ hand-crafted shayaris across 8 moods (happy, sad, love, romantic, angry, fearful, neutral, celebrate, greeting)
- **THEME_SHAYARI:** 8 one-liner theme shayaris
- **Methods:** `getShayari(chatId, text, emotion, count)` — CIL + AI + static fallback, `getAIshayari`, `getStaticShayari`, `getThemeShayari`

#### `summaryService.js`
- **Purpose:** Conversation summarization
- **Methods:** `getSummary(chatId, messages)` — CIL snapshot + AI + rule-based, `getAISummary(messages)` — LLM with SUMMARY_PROMPT, `getRuleBasedSummary(messages)` — Keyword/pattern-based
- **Caching:** Semantic cache on message content hash

#### `translateService.js`
- **Purpose:** Multi-provider translation
- **Languages:** 25 supported (Indian + international)
- **Methods:** `translateMessage(text, targetLang)` — Parallel LibreTranslate → MyMemory → AI, `translateWithAI`, `translateWithLibre`, `translateWithMyMemory`, `detectLanguageRule` (Unicode script detection)
- **AI prompt:** Structured JSON output with translation + detected language

#### `songService.js`
- **Purpose:** Multi-provider music search
- **Providers:** iTunes → Deezer → Spotify → JioSaavn (parallel 4-tier)
- **Methods:** `searchSongs(query, limit)`, `searchITunes`, `searchDeezer`, `searchSpotify`, `searchSaavnFallback`
- **Deduplication:** By title+artist composite key

#### `videoService.js`
- **Purpose:** Multi-provider video search
- **Providers:** Dailymotion → YouTube → Pexels → Pixabay (parallel 4-tier)
- **Methods:** `searchVideos(query, limit)`, `searchDailymotion`, `searchYouTube`, `searchPexelsVideo`, `searchPixabayVideo`

#### `spotifyService.js`
- **Purpose:** Spotify authentication + search + JioSaavn fallback
- **Token management:** Auto-refresh with 60s buffer
- **Fallback chain:** Spotify → JioSaavn

#### `youtubeService.js`
- **Purpose:** YouTube search + Pexels + Pixabay fallback chain

#### `lottieService.js`
- **Purpose:** Lottie animation search + curated collection
- **CURATED_LOTTIE:** 8 hardcoded animation URLs as fallback
- **Mood keywords:** 8 mood categories for curated selection

#### `intentService.js`
- **Purpose:** Async intent classification + unread intent counts
- **Methods:** `classifyMessageIntent(messageId)` — Async via intentPipeline, `getMessagesByIntent`, `getUnreadIntentCounts`

#### `factCheckService.js`
- **Purpose:** External fact check + claim processing
- **Methods:** `checkExternalSources`, `processClaimDetection`, `addVote`

#### `embeddingService.js`
- **Purpose:** Encrypted memory embedding creation + semantic search
- **Methods:** `createMemoryEmbedding(message, chatId, senderId, text, password, options)`, `searchSimilarMemories`
- **Encryption:** AES-256-GCM with user-specific key

#### `cloudinaryService.js`
- **Purpose:** Cloudinary upload + destroy
- **Methods:** `uploadMedia`, `deleteMedia`

#### `parallelFallback.js`
- **Purpose:** Utility for parallel execution with timeouts and fallback
- **Methods:** `parallelFallback(providers)` — Sequential fallback (first success wins), `parallelFetchAll(providers)` — Race all, merge results

### 3.8 Server Controllers

#### `authController.js`
- **Endpoints:** signup, login, logout, refreshToken, getMe, getTestCredentials, seedTestUser, updateProfile
- **Auth flow:** Validate Joi → find/create user → generate JWT → set httpOnly cookie → return user + tokens

#### `aiController.js`
- **Endpoints:** 14 AI endpoints
- **Core pattern:** Load messages from DB → CIL.initialize → CIL.analyze → CIL.getRecommendations → return + enrich with songs/videos
- **Streaming:** SSE-based with streamCompletion, sends 'intelligence' event then 'token' events

#### `messageController.js`
- **Endpoints:** 12 message endpoints
- **Key features:** Send (with socket emit), get (paginated, intent-filtered), delete (soft), delete for everyone (hard), edit, forward, pin, unpin, markRead, silent messages, intent counts

#### `chatController.js`
- **Endpoints:** get chats (with online status enrichment), getOrCreateDirectChat, searchUsers

#### `userController.js`
- **Endpoints:** getMe, updateProfile, updatePreferences, changePassword, deleteAccount (soft), getSessions, logoutOtherSessions

#### Remaining controllers:
- **memoryController.js:** search, get, verify (request + respond)
- **personaController.js:** CRUD + setActive (max 5 personas)
- **groupController.js:** create, get, addMember, removeMember
- **truthController.js:** createClaim, getClaim, getChatClaims, voteOnClaim
- **ghostController.js:** createSession (with TTL), getChatSessions, destroySession
- **decideController.js:** triggerDecision, vote, getDecision, getChatDecisions
- **bookmarkController.js:** create, get, delete, incrementUsage

### 3.9 ML Module

#### `config/prompts.js`
- **Purpose:** All AI system prompts
- **Prompts:** emotion, intent, truthClaim, personaRewrite, decideFacilitator, memorySummary
- **Each prompt:** Task definition, rules, output schema (JSON)

#### `config/fallback.js`
- **Purpose:** AI provider fallback chain configuration
- **Providers:** gemini (priority 1), groq (priority 2), huggingface (priority 3)
- **Embedding providers:** gemini

#### `config/constants.js`
- **Purpose:** ML module constants
- **Contains:** Model names, temperatures, max tokens, rate limit settings, theme maps, API endpoints

#### `models/llmModel.js`
- **Purpose:** Re-exports core providerManager + MODEL_MAP for task→model config

#### `models/fallbackHandler.js`
- **Purpose:** Generic fallback execution with timeout + retry + backoff

#### `models/embeddingModel.js`
- **Purpose:** Embedding generation via Gemini API
- **Fallback:** Returns zero-vector if all providers fail (768 dimensions)

#### Pipelines:
- **emotionPipeline.js:** Thin re-export from server/core/emotionPipeline
- **intentPipeline.js:** LLM-based → keyword fallback (?, remember, should, done)
- **memoryPipeline.js:** generateMemoryEmbedding → semanticSearch (cosine) → triggerVerification (socket)
- **personaPipeline.js:** rewriteTone (4 tones + custom) + detectConversationTone
- **truthPipeline.js:** detectClaim + calculateTruthScore (Bayesian) + getTruthIndicator
- **themePipeline.js:** mapEmotionToTheme + mapEmojiToTheme + getAllThemes
- **decidePipeline.js:** facilitateDecision (JSON output) + formatDecisionResult (vote aggregation)

#### Services:
- **vectorService.js:** Cosine similarity, normalization, euclidean distance, dot product, similarity matrix
- **mediaService.js:** Spotify + YouTube + Pexels + Pixabay + JioSaavn search wrappers
- **lyricsService.js:** Lyrics fetch from lyrics.ovh
- **factCheckService.js:** Google Fact Check Tools API + Bayesian community score

#### Utils:
- **textPreprocessor.js:** cleanText, detectLanguage, truncateMessages, estimateTokens, splitIntoChunks, removeEmojis, extractEmojis
- **responseParser.js:** parseAIResponse (JSON extraction from code blocks), safeParseJSON, extractJsonFromResponse, validateResponseSchema
- **rateLimiter.js:** TokenBucket + MultiProviderRateLimiter (per-provider buckets)
- **encryption.js:** AES-256-GCM encryptVector/decryptVector, deriveKey (PBKDF2), generateEncryptionKey, hashForIndexing, obfuscateVector

### 3.10 Client

#### Key files:
- **App.jsx:** Provider hierarchy: HelmetProvider → ThemeProvider → AuthProvider → SocketProvider → PersonaProvider → ErrorBoundary → AppRouter + Toaster + Google Analytics + GTM + Clarity scripts
- **Dashboard.jsx:** Main app (~700 lines). State: chats, activeChat, messages, suggestions, intents, typingUsers, 15+ UI toggles. Socket event handlers for 10+ message events. Intent filter, send/edit/delete/pin/forward/reply flows. Right panel switching (AI panel, bookmarks, profile, decide flow). Mobile nav bar.
- **MessageBubble.jsx:** Smart renderer - picks component by message type (text, image, video, gif, audio, voice, file, location, poll, sticker, emoji, song). Hover toolbar with react/reply/forward/more. Context menu. Reaction picker. Media preview modal.

---

## Section 4: APPLICATION FLOW

### Startup Flow

```
npm run dev (root)
  ├── concurrently
  │   ├── npm run dev:server
  │   │   └── nodemon server.js
  │   │       ├── dotenv.config()
  │   │       ├── Express app creation
  │   │       ├── HTTP server creation
  │   │       ├── Socket.IO creation (CORS: CLIENT_URL)
  │   │       ├── connectDB() → MongoDB Atlas
  │   │       ├── connectCloudinary() (optional)
  │   │       ├── cacheService.init() → Redis (fallback in-memory)
  │   │       ├── Middleware: helmet, cors, morgan, json(10mb), urlencoded, cookieParser, mongoSanitize, apiRateLimiter
  │   │       ├── Route mounting (15 route files)
  │   │       ├── Global error handler
  │   │       ├── Dev: seedTestUser() after 5s
  │   │       ├── Socket.IO auth middleware (JWT verify)
  │   │       ├── Socket.IO connection handler (19 events)
  │   │       ├── server.listen(PORT)
  │   │       └── Process handlers: unhandledRejection, uncaughtException
  │   │
  │   └── npm run dev:client
  │       └── vite (port 5173)
  │           ├── main.jsx → App.jsx
  │           ├── Provider tree (Helmet→Theme→Auth→Socket→Persona→ErrorBoundary)
  │           └── AppRouter.jsx (/, /login, /signup, /app, /app/memory)
  │
  └── Workers (standalone processes)
      ├── npm run worker:embedding
      ├── npm run worker:intent
      └── npm run worker:truth
```

### Request Lifecycle

```
Client Request
  ↓
Vite Proxy (dev: /api → localhost:5000)
  ↓
Express Server
  ↓
helmet (security headers)
  ↓
cors (CORS check)
  ↓
morgan (request logging)
  ↓
express.json / urlencoded (body parsing)
  ↓
cookieParser (cookie extraction)
  ↓
mongoSanitize (NoSQL injection prevention)
  ↓
apiRateLimiter (100 req/min)
  ↓
Route Matching
  ↓
authMiddleware (JWT verification) [if applicable]
  ↓
aiRateLimiter (20 req/min) [if AI route]
  ↓
Joi Validation (if applicable)
  ↓
Controller
  ├── Read from MongoDB (messages, chats, users)
  ├── CIL.analyze() [if AI route]
  │   ├── ConversationAnalyzer.analyze()
  │   │   ├── Emotion detection (rule → AI)
  │   │   ├── Timeline update
  │   │   ├── Topic extraction
  │   │   ├── State update
  │   │   ├── Relationship detection
  │   │   ├── Momentum calculation
  │   │   └── Snapshot creation (if interval)
  │   ├── FuturePrediction.predict()
  │   └── Cache result (300s TTL)
  ├── CIL.getRecommendations()
  │   └── RecommendationEngine (weighted scoring)
  ├── Parallel service calls (songs, videos)
  ├── Socket.IO emit (for real-time events)
  └── JSON response
  ↓
Response to Client
```

---

## Section 5: FEATURES

### 5.1 Real-Time Messaging
- **Files:** messageController.js, messageRoutes.js, ChatScreen.jsx, MessageBubble.jsx, MessageInput.jsx
- **Flow:** Send → Validate → Create Message → Emit via Socket.IO → Receive → Update UI
- **Message types:** text, emoji, gif, shayari, song, video, image, audio, file, system, poll, decision
- **Features:** Edit, delete (self/everyone), forward, pin, reply, silent mode, read receipts, delivery receipts, typing indicators

### 5.2 AI Suggestions
- **Files:** aiController.js, aiService.js, CIL, recommendationEngine.js, Dashboard.jsx
- **Endpoints:** GET /api/ai/suggestions/:chatId
- **Flow:** Load messages → CIL.analyze → CIL.getRecommendations → return + enrich with songs/videos
- **Output:** analysis (emotion, state, relationship, topic, momentum, predictions) + recommendations (emoji, sticker, shayari, song, reply)

### 5.3 Emotion Analysis
- **Files:** emotionPipeline.js, emotionTimeline.js, conversationAnalyzer.js, themePipeline.js
- **Rule engine:** 7 categories, keyword scoring + emoji detection + greeting/gratitude shortcuts
- **AI engine:** LLM with emotion prompt, returns emoji+shayari+song+video_query
- **Timeline:** Weighted 22-emotion scale, trend detection, volatility, escalation detection

### 5.4 Topic Tracking
- **Files:** topicEvolution.js
- **Categories:** 18 topics with keyword arrays
- **Features:** Current topic, topic history, change detection, trend analysis (diversifying/focused/emerging/inactive)

### 5.5 Conversation State
- **Files:** conversationState.js
- **States:** 12 with bidirectional valid transitions
- **Detection:** Keyword-based + question/exclamation boosting + length heuristic

### 5.6 Relationship Intelligence
- **Files:** relationshipEngine.js
- **Types:** 14 relationship types
- **Detection:** Indicator keywords + score-based (message count, emotion positivity, recency)
- **Confidence:** Tiered by message count (5/20/50/100)

### 5.7 Shayari Generation
- **Files:** shayariService.js, aiController.js (getShayari endpoint)
- **Sources:** Static collection (30+), AI-generated via LLM, CIL recommendations
- **Languages:** Hindi/Urdu

### 5.8 Music Search
- **Files:** songService.js, spotifyService.js
- **Sources:** iTunes → Deezer → Spotify → JioSaavn (parallel 4-tier)
- **Output:** Song title, artist, album art, preview URL, external URL

### 5.9 Video Search
- **Files:** videoService.js, youtubeService.js
- **Sources:** Dailymotion → YouTube → Pexels → Pixabay (parallel 4-tier)

### 5.10 Translation
- **Files:** translateService.js
- **Sources:** LibreTranslate → MyMemory → AI (3-tier fallback)
- **Languages:** 25 (Indian + international)
- **Language detection:** Unicode script regex

### 5.11 Conversation Summary
- **Files:** summaryService.js
- **Sources:** CIL snapshots (fast path) → AI (LLM) → Rule-based (keyword/pattern)
- **Output:** Summary, main points, tone, action items, unanswered questions

### 5.12 Message Rewrite (Persona)
- **Files:** personaPipeline.js, aiController.js (rewriteMessage)
- **Tones:** professional, casual, romantic, humorous, custom
- **Output:** Original, rewritten, changes description

### 5.13 TruthSync (Fact Checking)
- **Files:** truthPipeline.js, factCheckService.js, truthWorker.js, TruthScoreIndicator.jsx
- **Flow:** Message sent → detectClaim (LLM) → checkExternalSources (Google Fact Check) → create TruthClaim → community voting → Bayesian score
- **Components:** TruthScoreIndicator with color-coded score, voting, source display

### 5.14 Memory Search
- **Files:** memoryPipeline.js, embeddingService.js, embeddingWorker.js, MemorySearchPage.jsx
- **Flow:** Message sent → embeddingWorker generates encrypted vector → stored in MongoDB → search via cosine similarity
- **Verification:** Socket.IO-based peer verification flow
- **Encryption:** AES-256-GCM per-user key

### 5.15 Intent Classification
- **Files:** intentPipeline.js, intentService.js, intentWorker.js, IntentFilterBar.jsx
- **Categories:** task, social, question, idea, reminder
- **Flow:** LLM + keyword fallback → stored on Message → filterable in UI
- **Unread counts:** Per-intent unread message counts

### 5.16 Ghost Sessions
- **Files:** ghostController.js, GhostCollaboration.jsx
- **Features:** Anonymous temporary collaboration (whiteboard, document, code editor)
- **Tools:** Tldraw, ReactQuill, Monaco Editor
- **Lifecycle:** Session created with TTL → users join via Socket.IO → content syncs every 3s → destroyed on timer/action

### 5.17 DecideFlow (Group Decision Making)
- **Files:** decideController.js, decidePipeline.js, DecideFlow.jsx
- **Flow:** triggerDecision → AI summarizes conversation → generates poll options → detects deadlock → users vote → formatResult
- **Vote threshold:** 60% of participants

### 5.18 Bookmarks
- **Files:** bookmarkController.js, BookmarksPanel.jsx
- **Types:** emoji, shayari, song, video, text, image
- **Usage tracking:** incrementUsage for frequently-used bookmarks

### 5.19 Emotion Auto-Theme
- **Files:** ThemeContext.jsx, themePipeline.js
- **Mapping:** 10 emotion emoji → 6 themes (e.g., 😊 → aurora, 😢 → dark)
- **Toggle:** User can enable/disable in ThemeSwitcher

### 5.20 GIF / Sticker Search
- **Files:** emojiService.js (searchGiphy, searchLottieAnimations)
- **Sources:** Giphy API + LottieFiles API + curated fallback

---

## Section 6: AI SYSTEM

### Provider Architecture

```
chatCompletion(messages, options)
  │
  ├── Check response cache (prompt + system + task hash)
  │
  └── Iterate providers in priority order:
      │
      ├── Gemini (if API key configured)
      │   ├── Discover available models (live API call, 5min cache)
      │   ├── Try models in priority: 2.5-flash → 2.5-flash-lite → 2.0-flash → 1.5-flash
      │   ├── Per model: check circuit breaker → try with retries → record success/failure
      │   └── Gemini handler: REST API with generationConfig
      │
      ├── Groq (if API key configured)
      │   ├── Try models: deepseek-r1 → llama-4 → qwen → llama-3.3
      │   ├── OpenAI-compatible API
      │   └── Same circuit breaker + retry pattern
      │
      └── HuggingFace (if API key configured)
          ├── Single model: Meta-Llama-3-8B-Instruct
          ├── No retries (configurable)
          └── Inference API
```

### AI Router (Task → Model Priority)

| Task Type | Primary | Secondary | Temperature | Max Tokens |
|-----------|---------|-----------|-------------|------------|
| coding | gemini | deepseek-r1 | 0.2 | 1024 |
| reasoning | gemini | llama-4 | 0.3 | 1024 |
| creative | gemini | qwen-2.5-72b | 0.9 | 500 |
| translation | gemini | qwen-2.5-72b | 0.3 | 400 |
| general | gemini | llama-3.3 | 0.7 | 500 |
| emotion | gemini | llama-3.3 | 0.7 | 500 |
| intent | gemini | llama-3.3 | 0.3 | 150 |
| truth | gemini | mixtral-8x7b | 0.2 | 200 |
| persona | gemini | llama-3.3 | 0.8 | 300 |
| decide | gemini | llama-3.3 | 0.5 | 600 |

### Streaming

```
streamCompletion(messages)
  │
  └── Try Gemini SSE (streamGenerateContent?alt=sse)
      ├── Parse SSE events → yield text chunks
      └── On failure → fallback to non-streaming chatCompletion
```

### Circuit Breaker

```
isOpen(provider, model)
  │
  ├── CLOSED: Allow all requests
  ├── OPEN (after 3 failures):
  │   ├── After 30s → transition to HALF_OPEN
  │   └── During OPEN → reject immediately
  └── HALF_OPEN:
      ├── Allow 1 request
      ├── Success → transition to CLOSED (after 2 successes)
      └── Failure → back to OPEN
```

### Caching Strategy

| Cache Type | Key | TTL | Usage |
|-----------|-----|-----|-------|
| Response | hash(prompt+system+task) | 300s | AI responses |
| Semantic | hash(query) | 86400s | Emotion analysis, summaries |
| Prompt | hash(prompt+task) | 3600s | Processed prompts |
| CIL Analysis | cil:analysis:{chatId}:{msgId} | 300s | Conversation analysis |
| CIL Recommendations | cil:recs:{chatId}:{count} | 60s | Recommendation results |

---

## Section 7: CONVERSATION FLOW

### When User Sends a Message

```
1. Client: User types message + presses send
2. Client: MessageInput.jsx → messageService.send({ content, chatId, type, ... })
3. Client: api.js → axios POST /api/messages
4. Server: messageRoutes → authMiddleware → apiRateLimiter → messageController.sendMessage
5. Controller: Joi validation → check chat participant → create Message in DB
6. Controller: Update chat.lastMessage
7. Controller: Populate message (sender, replyTo)
8. Controller: socket.io emit 'message:receive' to chat room
9. Controller: Async: classifyMessageIntent (intentWorker or inline)
10. Server Response: 201 { message }
11. Client: Dashboard.jsx handleNewMessage → append to messages → scroll to bottom
12. Client: fetchSuggestions(chatId) → GET /api/ai/suggestions/:chatId
13. Server: aiController.getSuggestions
    a. Load messages from DB
    b. CIL.initialize(chatId, messages) — load into memory
    c. CIL.analyze(chatId, lastMsg) — full intelligence pipeline
        - detectEmotion (rule → AI fallback)
        - updateEmotionTimeline
        - extractTopics
        - detectConversationState
        - detectRelationship
        - calculateMomentum
        - predictFuture
        - createSnapshot if needed (every 10 msgs)
    d. CIL.getRecommendations(chatId) — weighted scoring
    e. Parallel: searchSongs, searchVideos
    f. Return { analysis, recommendations, songs, videos }
14. Client: Update suggestions state → render AI panel
15. Client: applyEmotionTheme (if enabled) → change theme based on detected emotion
```

---

## Section 8: DATABASE

### MongoDB Collections

| Collection | Documents | Key Fields | Indexes |
|-----------|-----------|------------|---------|
| users | User accounts | username*, email*, password, preferences, personas, refreshTokens | username (unique), email (unique) |
| messages | Chat messages | sender, chat, content, type, metadata, intents, readBy, deliveredBy, truthClaimRef | {chat, createdAt}, {chat, intents}, {sender, createdAt} |
| chats | Conversations | type (direct/group), participants, lastMessage, pinnedMessages, silentMessages | — |
| truthclaims | Fact-check claims | claimText, message, chat, submittedBy, votes, sources, truthScore | {message}, {chat, truthScore}, {category} |
| decisions | Group decisions | chat, createdBy, pollOptions, status, deadlock, compromise | — |
| memoryembeddings | Encrypted vector memories | message, chat, sender, encryptedVector, iv, salt, textSnippet, verifiedBy | {chat, isVerified}, {sender}, {'verifiedBy.user'} |

### Key Schema Details

**User.preferences** tree (depth: 3-4):
```
preferences: {
  account: { displayName, about },
  appearance: { fontSize, messageDensity, showTimestamps, enterToSend, ... },
  notifications: { pushEnabled, messagePreview, soundEnabled, doNotDisturb, ... },
  privacy: { lastSeen, readReceipts, onlineStatus, blockedUsers, ... },
  chat: { enterToSend, autoSaveMedia, linkPreviews, typingIndicators, ... },
  ai: { autoSuggestions, emotionDetection, truthSyncVisibility, smartReplies, factCheck, decideFlow, ... },
  ghostMode: { defaultDuration, autoEnable, visibility, typingDisguise },
  media: { autoDownloadPhotos, autoDownloadVideo, dataSaver, ... },
  accessibility: { fontSize, reduceMotion, highContrast, screenReader, ... },
  advanced: { messageHistoryDays, autoBackup, cacheEnabled, ... }
}
```

---

## Section 9: REDIS

### Cache Keys & TTL

| Pattern | Description | TTL |
|---------|-------------|-----|
| `emotune:resp:{hash}` | AI response cache | 300s |
| `emotune:sem:{hash}` | Semantic cache (emotion, summary) | 86400s |
| `emotune:prompt:{hash}` | Processed prompt cache | 3600s |
| `emotune:cil:analysis:{chatId}:{msgId}` | CIL analysis cache | 300s |
| `emotune:cil:recs:{chatId}:{count}` | CIL recommendations cache | 60s |

**Fallback:** When Redis is unavailable, the application falls back to in-memory caching (Map with 60s TTL).

---

## Section 10: AUTHENTICATION

### Auth Flow

```
Signup/Login
  ├── Joi validation (email, password >= 8 chars, username 3-30 chars)
  ├── Check duplicate (email or username)
  ├── Create User (bcrypt hash password, 12 rounds)
  ├── Generate accessToken (JWT, expiresIn: 7d)
  ├── Generate refreshToken (JWT, expiresIn: 30d)
  ├── Store refreshToken in user document
  ├── Set httpOnly cookie (sameSite: strict, secure in production)
  └── Return { user, accessToken, refreshToken }

Auth Middleware
  ├── Extract token: Authorization Bearer || cookies.token
  ├── Verify: jwt.verify(token, JWT_SECRET)
  ├── Find user by decoded.userId
  ├── Attach req.user, req.userId
  └── 401 on failure (TOKEN_EXPIRED for expired tokens)

Refresh Token
  ├── Receive refreshToken from body
  ├── Verify and decode
  ├── Compare with stored refreshToken
  ├── Generate new pair
  └── Store new refreshToken

Logout
  ├── Clear stored refreshToken
  ├── Clear httpOnly cookie
  └── Set status to offline
```

### Security Features
- **HttpOnly cookies** for access tokens (XSS protection)
- **SameSite: strict** (CSRF protection)
- **bcrypt 12 rounds** for password hashing
- **JWT with configurable expiry** (7d access, 30d refresh)
- **Rate limiting** on auth routes (10/min)
- **MongoDB sanitization** (NoSQL injection prevention)
- **Helmet** security headers
- **Input validation** via Joi schemas

---

## Section 11: API DOCUMENTATION

### Health

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | No | Server health + MongoDB + Cache + Metrics |
| GET | `/` | No | Root info |

### Auth

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| POST | `/api/auth/signup` | No | 10/min | Create account |
| POST | `/api/auth/login` | No | 10/min | Sign in |
| POST | `/api/auth/logout` | Yes | — | Sign out |
| POST | `/api/auth/refresh-token` | No | — | Refresh JWT |
| GET | `/api/auth/me` | Yes | — | Get current user |
| PATCH | `/api/auth/profile` | Yes | — | Update profile |
| POST | `/api/auth/seed` | No | 10/min | Seed test user |
| GET | `/api/auth/test-credentials` | No | — | Get test credentials |

### Messages

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| POST | `/api/messages` | Yes | 100/min | Send message |
| GET | `/api/messages/:chatId` | Yes | — | Get messages (paginated, intent-filtered) |
| DELETE | `/api/messages/:messageId` | Yes | — | Delete for me |
| DELETE | `/api/messages/:messageId/everyone` | Yes | — | Delete for everyone |
| PATCH | `/api/messages/:messageId/edit` | Yes | — | Edit message |
| POST | `/api/messages/forward` | Yes | — | Forward message |
| GET | `/api/messages/:chatId/counts` | Yes | — | Intent unread counts |
| POST | `/api/messages/:messageId/pin` | Yes | — | Pin message |
| POST | `/api/messages/:messageId/unpin` | Yes | — | Unpin message |
| PATCH | `/api/messages/read` | Yes | — | Mark messages as read |
| GET | `/api/messages/silent` | Yes | — | Get silent messages |
| POST | `/api/messages/accept-silent` | Yes | — | Accept silent message |

### Chats

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/chats` | Yes | Get user chats |
| POST | `/api/chats/direct/:userId` | Yes | Get or create direct chat |

### Users

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/users/search` | Yes | Search users |
| GET | `/api/users/me` | Yes | Get profile |
| PUT | `/api/users/profile` | Yes | Update profile |
| PUT | `/api/users/preferences` | Yes | Update preferences |
| PUT | `/api/users/password` | Yes | Change password |
| DELETE | `/api/users/account` | Yes | Delete account |
| GET | `/api/users/sessions` | Yes | Get sessions |
| POST | `/api/users/logout-other` | Yes | Logout other sessions |

### AI

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| GET | `/api/ai/suggestions/:chatId` | Yes | 20/min | Full AI suggestions |
| POST | `/api/ai/rewrite` | Yes | 20/min | Rewrite message tone |
| GET | `/api/ai/emotion-theme/:chatId` | Yes | 20/min | Get emotion + theme |
| POST | `/api/ai/translate` | Yes | 20/min | Translate message |
| GET | `/api/ai/emojis/:chatId` | Yes | — | Emoji suggestions |
| GET | `/api/ai/gifs/:chatId` | Yes | — | GIF + sticker suggestions |
| GET | `/api/ai/shayari/:chatId` | Yes | — | Shayari suggestions |
| GET | `/api/ai/songs/:chatId` | Yes | — | Song suggestions |
| GET | `/api/ai/videos/:chatId` | Yes | — | Video suggestions |
| GET | `/api/ai/summary/:chatId` | Yes | 20/min | Conversation summary |
| GET | `/api/ai/intelligence/:chatId` | Yes | — | Full conversation intelligence |
| GET | `/api/ai/stream/:chatId` | Yes | — | SSE streaming suggestions |
| GET | `/api/ai/metrics` | Yes | — | System metrics |
| GET | `/api/ai/cache` | Yes | — | Cache status |

### Memory

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/memory/search` | Yes | Semantic memory search |
| GET | `/api/memory` | Yes | Get memories (paginated) |
| POST | `/api/memory/:memoryId/verify` | Yes | Request verification |
| POST | `/api/memory/:memoryId/respond` | Yes | Respond to verification |

### Personas

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/personas` | Yes | Create persona (max 5) |
| GET | `/api/personas` | Yes | Get personas |
| PATCH | `/api/personas/:personaId` | Yes | Update persona |
| DELETE | `/api/personas/:personaId` | Yes | Delete persona |
| POST | `/api/personas/:personaId/activate` | Yes | Set active persona |

### Groups

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/groups` | Yes | Create group |
| GET | `/api/groups` | Yes | Get groups |
| POST | `/api/groups/add-member` | Yes | Add member |
| POST | `/api/groups/remove-member` | Yes | Remove member |

### Truth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/truth` | Yes | Create claim |
| GET | `/api/truth/:claimId` | Yes | Get claim |
| GET | `/api/truth/chat/:chatId` | Yes | Get chat claims |
| POST | `/api/truth/:claimId/vote` | Yes | Vote on claim |

### Ghost

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/ghost` | Yes | Create ghost session |
| GET | `/api/ghost/:chatId` | Yes | Get chat sessions |
| DELETE | `/api/ghost/:id` | Yes | Destroy session |

### Decide

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/decide/:chatId/trigger` | Yes | Trigger decision |
| POST | `/api/decide/:decisionId/vote` | Yes | Vote on decision |
| GET | `/api/decide/:decisionId` | Yes | Get decision |
| GET | `/api/decide/chat/:chatId` | Yes | Get chat decisions |

### Bookmarks

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/bookmarks` | Yes | Create bookmark |
| GET | `/api/bookmarks` | Yes | Get bookmarks |
| DELETE | `/api/bookmarks/:bookmarkId` | Yes | Delete bookmark |
| PATCH | `/api/bookmarks/:bookmarkId/use` | Yes | Increment usage |

### Upload

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/upload` | Yes | Upload file (multer → Cloudinary → local) |

---

## Section 12: FRONTEND

### Pages

1. **LandingPage** (`/`): 11-section marketing page with SEO/JSON-LD
2. **LoginPage** (`/login`): Auth form + social login + trust badges
3. **SignupPage** (`/signup`): Registration + password strength + social login
4. **Dashboard** (`/app`): Main chat application (~700 lines)
5. **MemorySearchPage** (`/app/memory`): Semantic memory search

### React Contexts

| Context | State | Key Methods |
|---------|-------|-------------|
| AuthContext | user, loading, token | login, signup, logout, updateUser, updatePreferences |
| SocketContext | socket, isConnected, onlineUsers | — (auto-manages connection lifecycle) |
| ThemeContext | theme, emotionThemeEnabled | setTheme, applyEmotionTheme, toggleEmotionTheme |
| PersonaContext | personas, activePersona | createPersona, updatePersona, deletePersona, setActivePersona |

### Component Architecture (Dashboard)

```
Dashboard
├── Sidebar (chats, quick actions, logout)
├── Main Pane
│   ├── Navbar (chat header, AI panel toggle, ghost, decide)
│   ├── IntentFilter (horizontal chips: live, unread, tasks, etc.)
│   ├── ChatScreen (message list with date separators)
│   │   └── MessageBubble (type-based renderer)
│   │       ├── BubbleContainer
│   │       ├── ReplyPreview
│   │       ├── TextMessage / ImageMessage / VideoMessage / etc.
│   │       ├── BubbleActions (hover toolbar)
│   │       ├── BubbleMenu (context menu)
│   │       ├── ReactionPicker
│   │       └── ReactionBar
│   ├── MessageInput (text input, emoji picker, silent toggle)
│   └── MessageInfoModal / ForwardModal / MediaPreviewModal
├── Right Panel (profile, AI suggestions, bookmarks, decide flow)
└── Mobile Nav (bottom tab bar for small screens)
```

### UI Component System

35+ reusable components in `components/ui/`:
- **Layout:** Panel, PanelHeader, PanelFooter, Surface, Section, ScrollArea
- **Surface:** Card, GlassCard, Modal, Sheet, Drawer, Sheet
- **Form:** Button, IconButton, SearchInput, Select, Toggle, Slider
- **Data:** Badge, Tag, Chip, StatusDot, Avatar, ListItem, AIChip
- **Navigation:** TabBar, Menu, MenuItem, Dropdown, ActionButton
- **Feedback:** Skeleton, LoadingSpinner, EmptyState, NotificationBadge, AnimatedCounter
- **Overlay:** Tooltip, ModalHeader, Divider, Carousel

---

## Section 13: DEPENDENCIES

### Server (package.json)

| Package | Purpose | Used In |
|---------|---------|---------|
| express | Web framework | server.js, all routes |
| mongoose 8 | MongoDB ODM | All models, controllers |
| socket.io 4 | Real-time bidirectional communication | server.js, all controllers |
| jsonwebtoken | JWT generation/verification | authMiddleware, jwt.js |
| bcryptjs | Password hashing | User model |
| @google/generative-ai | Gemini AI provider (npm package) | — (uses REST API instead) |
| openai 4 | OpenAI-compatible API client | — (uses axios for Groq) |
| axios | HTTP client | All service files |
| ioredis | Redis client | cacheService.js |
| bullmq | Background job queue | truthWorker, intentWorker, embeddingWorker |
| cloudinary | Cloud media management | cloudinaryService.js |
| multer | File upload handling | multer.js |
| express-rate-limit | Rate limiting | rateLimiter.js |
| helmet | Security headers | server.js |
| cors | Cross-origin requests | server.js |
| morgan | HTTP request logging | server.js |
| cookie-parser | Cookie parsing | server.js |
| express-mongo-sanitize | NoSQL injection prevention | server.js |
| joi | Request validation | validators.js |
| dotenv | Environment variables | server.js |
| nodemon (dev) | Auto-restart on changes | package.json scripts |

### Client (package.json)

| Package | Purpose | Used In |
|---------|---------|---------|
| react 18 | UI framework | All components |
| react-dom 18 | DOM rendering | main.jsx |
| react-router-dom 6 | Client-side routing | AppRouter.jsx |
| framer-motion | Animations | All components |
| socket.io-client | WebSocket client | SocketContext.jsx |
| axios | HTTP client | api.js |
| tailwindcss 3 | Utility CSS | All components |
| vite 5 | Build tool | vite.config.js |
| @vitejs/plugin-react | React fast refresh | vite.config.js |
| react-helmet-async | SEO/head management | App.jsx, pages |
| react-icons | Icon library | Every component |
| react-player | Media playback | VideoMessage, AudioMessage |
| react-markdown | Markdown rendering | — |
| date-fns | Date formatting | MessageBubble helpers |
| sonner | Toast notifications | App.jsx, Dashboard |
| clsx | Class merging | UI components |
| tailwind-merge | Tailwind class dedup | UI components |
| emoji-mart + data | Emoji picker | MessageInput |
| tldraw | Whiteboard canvas | GhostCollaboration |
| react-quill | Rich text editor | GhostCollaboration |
| @monaco-editor/react | Code editor | GhostCollaboration |

---

## Section 14: CONFIGURATION

### Environment Variables (server/.env)

| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| PORT | No | 5000 | server.js |
| NODE_ENV | No | development | Multiple |
| LOG_LEVEL | No | debug | core/logger.js |
| MONGO_URI | Yes | — | config/db.js |
| REDIS_URL | No | redis://localhost:6379 | core/cacheService.js |
| CACHE_TTL | No | 3600 | core/cacheService.js |
| RESPONSE_CACHE_TTL | No | 300 | core/cacheService.js |
| SEMANTIC_CACHE_TTL | No | 86400 | core/cacheService.js |
| CLIENT_URL | No | http://localhost:5173 | server.js |
| JWT_SECRET | Yes | — | utils/jwt.js |
| JWT_REFRESH_SECRET | Yes | — | utils/jwt.js |
| JWT_EXPIRY | No | 7d | utils/jwt.js |
| JWT_REFRESH_EXPIRY | No | 30d | utils/jwt.js |
| GEMINI_API_KEY | No | — | core/providerManager.js |
| GEMINI_BASE_URL | No | Google default | core/providerManager.js |
| GEMINI_DEFAULT_MODEL | No | gemini-2.5-flash | core/providerManager.js |
| GEMINI_EMBEDDING_MODEL | No | text-embedding-004 | core/config.js |
| GEMINI_TIMEOUT | No | 4000 | core/config.js |
| GEMINI_RETRIES | No | 1 | core/config.js |
| GEMINI_MODELS | No | priority list | core/config.js |
| GROQ_API_KEY | No | — | core/providerManager.js |
| GROQ_DEFAULT_MODEL | No | deepseek-r1-distill-llama-70b | core/providerManager.js |
| GROQ_TIMEOUT | No | 5000 | core/config.js |
| GROQ_MODELS | No | priority list | core/config.js |
| HUGGINGFACE_API_KEY | No | — | core/providerManager.js |
| HF_DEFAULT_MODEL | No | meta-llama/Meta-Llama-3-8B-Instruct | core/config.js |
| HF_TIMEOUT | No | 8000 | core/config.js |
| AI_TIMEOUT | No | 4000 | core/config.js |
| AI_RETRIES | No | 1 | core/config.js |
| AI_MAX_TOKENS | No | 500 | core/config.js |
| AI_TEMPERATURE | No | 0.7 | core/config.js |
| AI_REQUESTS_PER_MIN | No | 20 | core/config.js |
| AI_BURST_SIZE | No | 5 | ml/config/constants.js |
| AI_REFILL_RATE | No | 1 | ml/config/constants.js |
| AI_REFILL_INTERVAL_MS | No | 3000 | ml/config/constants.js |
| CB_FAILURE_THRESHOLD | No | 3 | core/circuitBreaker.js |
| CB_SUCCESS_THRESHOLD | No | 2 | core/circuitBreaker.js |
| CB_HALF_OPEN_MAX | No | 1 | core/circuitBreaker.js |
| CB_OPEN_TIMEOUT_MS | No | 30000 | core/circuitBreaker.js |
| HEALTH_CHECK_INTERVAL_MS | No | 60000 | core/circuitBreaker.js |
| CLOUDINARY_CLOUD_NAME | No | — | config/cloudinary.js |
| CLOUDINARY_API_KEY | No | — | config/cloudinary.js |
| CLOUDINARY_API_SECRET | No | — | config/cloudinary.js |
| YOUTUBE_API_KEY | No | — | videoService.js |
| PEXELS_API_KEY | No | — | videoService.js |
| PIXABAY_API_KEY | No | — | videoService.js |
| SPOTIFY_CLIENT_ID | No | — | spotifyService.js |
| SPOTIFY_CLIENT_SECRET | No | — | spotifyService.js |
| JIO_SAAVN_API | No | — | spotifyService.js |
| GOOGLE_FACT_CHECK_API_KEY | No | — | ml/services/factCheckService.js |
| GIPHY_API_KEY | No | — | emojiService.js |
| LIBRETRANSLATE_URL | No | https://libretranslate.de | translateService.js |

### Client Environment (client/.env)

| Variable | Default | Used By |
|----------|---------|---------|
| VITE_API_URL | http://localhost:5000/api | api.js |

---

## Section 15: SECURITY

### Implemented Measures

| Measure | Implementation | Location |
|---------|---------------|----------|
| Password hashing | bcrypt 12 rounds | User.js pre-save hook |
| JWT authentication | Access + Refresh tokens | utils/jwt.js |
| HttpOnly cookies | Token storage (XSS protection) | authController.js |
| SameSite cookies | strict mode (CSRF protection) | authController.js |
| Rate limiting | 3 tiers (100/20/10 per minute) | middleware/rateLimiter.js |
| Input validation | Joi schemas for all inputs | utils/validators.js |
| NoSQL injection | express-mongo-sanitize | server.js |
| Security headers | helmet (CSP disabled) | server.js |
| CORS | Restricted to CLIENT_URL | server.js |
| Error sanitization | No stack traces in production | middleware/errorHandler.js |
| Message authorization | Chat participant check | messageController.js |
| Soft delete | deletedFor array on messages | Message model |
| Account deletion | Soft delete (deletedAt field) | User model |
| Vector encryption | AES-256-GCM per-user key | ml/utils/encryption.js |
| Token refresh rotation | Old token invalidated on refresh | authController.js |
| Session management | Refresh token array per user | User model |

### Not Implemented (Future)
- Two-factor authentication (schema present, not wired)
- End-to-end message encryption (client stubs exist)
- Content Security Policy (disabled due to inline scripts)
- HTTPS in production

---

## Section 16: PERFORMANCE

### Optimizations

| Technique | Implementation | Benefit |
|-----------|---------------|---------|
| Dual caching | Redis + in-memory | Reduces AI calls, <1ms cache reads |
| Response caching | AI response cache (300s) | Same inputs skip AI entirely |
| Semantic caching | Emotion/summary cache (24h) | Reuses across similar messages |
| Parallel execution | Promise.all + parallelFallback | Non-blocking multi-source fetches |
| Rule engine first | Emotion analysis without AI | 90% of messages avoid AI cost |
| Snapshot memory | Compressed conversation history | Reduces AI prompt size |
| Lazy loading | Vite code splitting | Smaller initial bundle |
| Manual chunks | Vite rollupOptions | Optimal caching of vendor libs |
| CIL analysis cache | 300s per analysis | Reuses across 5-10 feature requests |
| Circuit breaker | Fast-fail for unhealthy providers | Prevents cascading failures |
| Background workers | BullMQ queues | Non-blocking AI processing |
| Connection pooling | MongoDB maxPoolSize=10 | Efficient database connections |
| Indexed queries | MongoDB indexes on hot fields | Fast message/chat retrieval |
| Debounced read receipts | 500ms debounce | Reduces DB writes |
| SSE streaming | Chunked AI responses | Progressive UI updates |
| Debounced typing | Socket events | Reduces network spam |

---

## Section 17: ERROR HANDLING

### Layers

| Layer | Strategy | Implementation |
|-------|----------|---------------|
| Controller | try/catch → error response | Every controller function |
| Global | Express error handler | middleware/errorHandler.js |
| Socket | try/catch in event handlers | server.js socket events |
| AI Provider | Retry with backoff | core/providerManager.js |
| AI Provider | Circuit breaker | core/circuitBreaker.js |
| External API | Sequential fallback | parallelFallback.js |
| External API | Promise.race with timeout | parallelFallback.js |
| MongoDB | Connection retry | config/db.js |
| Redis | Graceful degradation | core/cacheService.js |
| Background | Job retry with backoff | BullMQ worker config |
| Client | ErrorBoundary (React) | ErrorBoundary.jsx |
| Client | Toast notifications | sonner |
| Client | try/catch in API calls | All hook functions |

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "details": ["validation detail 1", "validation detail 2"],
  "code": "TOKEN_EXPIRED",
  "stack": "stack trace (development only)"
}
```

---

## Section 18: LOGGING

### Logger Architecture

| Logger | Location | Format | Storage |
|--------|----------|--------|---------|
| core/logger.js | server/core/logger.js | `[LEVEL] ISO_DATETIME message {json_meta}` | Console |
| utils/logger.js | server/utils/logger.js | `{timestamp, level, message, meta}` | Console + File (logs/YYYY-MM-DD.log) |
| morgan | server.js | HTTP request log | Console |
| metrics | server/core/logger.js | Aggregated counters | In-memory |

### Metrics Collected

| Metric | Type | Description |
|--------|------|-------------|
| aiCalls | Counter | Total AI provider calls |
| aiErrors | Counter | Total AI failures |
| aiLatencyMs | Array | Last 1000 latency samples |
| cacheHits | Counter | Cache hit count |
| cacheMisses | Counter | Cache miss count |
| providerCalls | Map | Per-provider:per-model call count |
| providerErrors | Map | Per-provider:per-model error count |
| providerLatency | Map | Per-provider:per-model latency samples |

---

## Section 19: INTEGRATIONS

| Service | Type | API | Authentication | Used For |
|---------|------|-----|---------------|----------|
| Google Gemini | AI | REST (generateContent) | API Key | Primary AI provider |
| Groq | AI | REST (OpenAI-compatible) | API Key | Secondary AI provider |
| HuggingFace | AI | REST (Inference API) | API Key | Tertiary AI fallback |
| MongoDB Atlas | Database | Mongoose 8 | Connection String | Primary database |
| Redis | Cache | ioredis | URL | Caching layer |
| Cloudinary | Media | SDK | API Key + Secret | File upload/CDN |
| Giphy | GIFs | REST | API Key | GIF search |
| LottieFiles | Animations | REST | — | Sticker/animation search |
| Spotify | Music | REST (OAuth) | Client ID + Secret | Song search |
| YouTube | Video | REST | API Key | Video search |
| Pexels | Video | REST | API Key | Video fallback |
| Pixabay | Video | REST | API Key | Video fallback |
| Deezer | Music | REST | — | Song search |
| iTunes | Music | REST | — | Song search |
| LibreTranslate | Translation | REST | — | Translation service |
| MyMemory | Translation | REST | — | Translation fallback |
| Google Fact Check | Fact-checking | REST | API Key | TruthSync |
| Google Analytics | Analytics | gtag.js | Measurement ID | Frontend analytics |
| Google Tag Manager | Tag management | GTM | Container ID | Frontend tags |
| Microsoft Clarity | Analytics | Script | Project ID | Frontend analytics |

---

## Section 20: FULL FEATURE MAP

| Feature | Controller | Service(s) | Route(s) | Model(s) | AI Pipeline | Ext. APIs | Cache |
|---------|-----------|------------|----------|----------|-------------|-----------|-------|
| Auth | authController | — | /api/auth/* | User | — | — | — |
| Send Message | messageController | intentService | POST /api/messages | Message, Chat | intentPipeline | — | — |
| AI Suggestions | aiController | aiService, emojiService, shayariService, songService, videoService | GET /api/ai/suggestions/:chatId | Message | emotionPipeline, CIL | Giphy, Spotify, YouTube, etc. | CIL (300s), Response (300s) |
| Emoji | aiController | emojiService | GET /api/ai/emojis/:chatId | Message | CIL | — | CIL |
| GIF | aiController | emojiService | GET /api/ai/gifs/:chatId | Message | — | Giphy, Lottie | — |
| Shayari | aiController | shayariService | GET /api/ai/shayari/:chatId | Message | CIL, personaPipeline | — | CIL |
| Songs | aiController | songService, spotifyService | GET /api/ai/songs/:chatId | Message | — | iTunes, Deezer, Spotify, JioSaavn | — |
| Videos | aiController | videoService, youtubeService | GET /api/ai/videos/:chatId | Message | — | Dailymotion, YouTube, Pexels, Pixabay | — |
| Summary | aiController | summaryService | GET /api/ai/summary/:chatId | Message | CIL, memory | — | Semantic (24h) |
| Translate | aiController | translateService | POST /api/ai/translate | — | — | LibreTranslate, MyMemory, Gemini | — |
| Rewrite | aiController | aiService | POST /api/ai/rewrite | — | personaPipeline | Gemini | — |
| Streaming | aiController | — | GET /api/ai/stream/:chatId | Message | Gemini SSE | Gemini | — |
| Intelligence | aiController | — | GET /api/ai/intelligence/:chatId | Message | CIL | — | CIL (300s) |
| Memory Search | memoryController | embeddingService | GET /api/memory/search | MemoryEmbedding, Message | memoryPipeline | Gemini (embedding) | — |
| Memory Verify | memoryController | — | POST /api/memory/:memoryId/verify | MemoryEmbedding | — | — | — |
| Personas | personaController | — | /api/personas/* | User | — | — | — |
| Groups | groupController | — | /api/groups/* | Chat | — | — | — |
| TruthSync | truthController | factCheckService | /api/truth/* | TruthClaim, Message | truthPipeline | Google Fact Check | — |
| Ghost | ghostController | — | /api/ghost/* | — | — | — | — |
| DecideFlow | decideController | — | /api/decide/* | Decision | decidePipeline | Gemini | — |
| Bookmarks | bookmarkController | — | /api/bookmarks/* | — | — | — | — |
| Upload | — | cloudinaryService | POST /api/upload | — | — | Cloudinary | — |
| File upload | — | multer | POST /api/upload | — | — | — | — |

---

## Section 21: APPLICATION LIFECYCLE

### From `npm start` to User Receives Response

```
npm start (root)
  ↓
cd server && node server.js
  ↓
dotenv.config() — loads .env
  ↓
Express app created
  ↓
HTTP server created (http.createServer)
  ↓
Socket.IO instantiated with CORS config
  ↓
connectDB() — MongoDB Atlas connection (max 5s timeout)
  ↓
connectCloudinary() — optional
  ↓
cacheService.init() — Redis connection (with in-memory fallback)
  ↓
Middleware stack:
  helmet → cors → morgan → json(10mb) → urlencoded → cookieParser → mongoSanitize → apiRateLimiter
  ↓
Route mounting (15 routers):
  /api/auth → authRoutes
  /api/messages → messageRoutes
  /api/chats → chatRoutes
  /api/users → userRoutes
  /api/ai → aiRoutes
  /api/groups → groupRoutes
  /api/bookmarks → bookmarkRoutes
  /api/memory → memoryRoutes
  /api/truth → truthRoutes
  /api/personas → personaRoutes
  /api/decide → decideRoutes
  /api/ghost → ghostRoutes
  /api/upload → uploadRoutes
  /uploads → static files
  /api/health → inline handler
  / → root info
  ↓
Error handler (last middleware)
  ↓
Dev mode: seedTestUser() after 5s
  ↓
Socket.IO middleware: JWT auth for WebSocket connections
  ↓
Socket.IO connection handler:
  - Track online users (Map)
  - Join user room (user:{userId})
  - Join chat rooms (chat._id)
  - 19 event handlers (typing, memory, ghost, decide, message lifecycle)
  ↓
server.listen(PORT)
  ↓
User sends HTTP request → Vite proxy (/api → localhost:5000) → Express
  ↓
Request passes through middleware → route → auth → validation → controller → service → DB/AI → response
  ↓
Response returns to client → React updates UI → Socket.IO events for real-time updates
```

---

## Section 22: CALL GRAPH

```
server.js
  ├── config/db.js
  ├── config/cloudinary.js
  ├── core/cacheService.js
  ├── core/logger.js
  ├── core/config.js
  ├── middleware/*.js
  ├── routes/*.js
  │   └── controllers/*.js
  │       ├── models/*.js (Mongoose)
  │       ├── services/*.js
  │       │   ├── core/providerManager.js
  │       │   │   ├── core/circuitBreaker.js
  │       │   │   ├── core/cacheService.js
  │       │   │   ├── core/config.js
  │       │   │   └── core/logger.js
  │       │   ├── intelligence/*.js
  │       │   │   └── core/emotionPipeline.js
  │       │   ├── ml/pipelines/*.js
  │       │   │   ├── ml/models/llmModel.js (→ core/providerManager)
  │       │   │   ├── ml/models/embeddingModel.js
  │       │   │   ├── ml/models/fallbackHandler.js
  │       │   │   └── ml/services/*.js
  │       │   └── external APIs (axios)
  │       └── utils/*.js
  ├── utils/seed.js
  └── workers/*.js
      ├── models/*.js
      ├── services/*.js
      └── ml/pipelines/*.js
```

---

## Section 23: DEPENDENCY GRAPH

```
Core Layer (server/core/)
  ├── config.js         ← no deps (reads .env)
  ├── logger.js         ← no deps
  ├── cacheService.js   ← config.js, logger.js, ioredis
  ├── circuitBreaker.js ← config.js, logger.js
  ├── providerManager.js ← config.js, logger.js, circuitBreaker.js, cacheService.js, axios
  └── emotionPipeline.js ← config.js, providerManager.js, logger.js, cacheService.js, ml/config/prompts.js, ml/utils/textPreprocessor.js

Intelligence Layer (server/intelligence/)
  ├── index.js          ← re-exports all modules
  ├── conversationIntelligenceLayer.js ← all other modules + core/cacheService + core/logger
  ├── conversationAnalyzer.js ← emotionTimeline, topicEvolution, conversationState, relationshipEngine, conversationMomentum, snapshotMemory, futurePrediction, core/emotionPipeline
  ├── emotionTimeline.js ← no deps
  ├── topicEvolution.js ← no deps
  ├── conversationState.js ← no deps
  ├── relationshipEngine.js ← no deps
  ├── conversationMomentum.js ← no deps
  ├── snapshotMemory.js ← no deps
  ├── futurePrediction.js ← conversationState (for STATES)
  ├── recommendationEngine.js ← no deps (pure logic)
  ├── vectorMemory.js ← no deps
  └── backgroundWorker.js ← core/logger

Services Layer (server/services/)
  ├── aiService.js      ← core/providerManager, core/logger, intelligence/CIL
  ├── emojiService.js   ← core/logger, parallelFallback, lottieService, core/emotionPipeline, intelligence/CIL, axios
  ├── shayariService.js ← utils/logger, utils/fallbackChain, parallelFallback, intelligence/CIL, axios
  ├── summaryService.js ← core/providerManager, parallelFallback, core/logger, core/cacheService, intelligence/CIL
  ├── translateService.js ← core/logger, parallelFallback, core/providerManager, axios
  ├── songService.js    ← utils/logger, parallelFallback, spotifyService, axios
  ├── videoService.js   ← utils/logger, parallelFallback, axios
  ├── spotifyService.js ← config/constants, utils/logger, axios
  ├── youtubeService.js ← config/constants, utils/logger, axios
  ├── lottieService.js  ← utils/logger, axios
  ├── intentService.js  ← ml/pipelines/intentPipeline, models/Message, utils/logger
  ├── factCheckService.js ← ml/pipelines/truthPipeline, ml/services/factCheckService, models/TruthClaim, utils/logger
  ├── embeddingService.js ← ml/models/embeddingModel, ml/pipelines/memoryPipeline, ml/services/vectorService, ml/utils/encryption, models/MemoryEmbedding, utils/logger
  ├── cloudinaryService.js ← config/cloudinary
  └── parallelFallback.js ← no deps

ML Layer (ml/)
  ├── config/prompts.js  ← no deps
  ├── config/fallback.js ← no deps (reads .env)
  ├── config/constants.js ← no deps
  ├── models/llmModel.js ← server/core/providerManager
  ├── models/fallbackHandler.js ← no deps (pure logic)
  ├── models/embeddingModel.js ← ml/config/fallback, ml/config/constants, ml/utils/rateLimiter, axios
  ├── pipelines/emotionPipeline.js ← server/core/emotionPipeline
  ├── pipelines/intentPipeline.js ← ml/models/llmModel, ml/config/prompts, ml/utils/textPreprocessor
  ├── pipelines/memoryPipeline.js ← ml/models/embeddingModel, ml/services/vectorService, ml/utils/textPreprocessor, ml/config/constants
  ├── pipelines/personaPipeline.js ← ml/models/llmModel, ml/config/prompts, ml/utils/textPreprocessor, ml/config/constants
  ├── pipelines/truthPipeline.js ← ml/models/llmModel, ml/config/prompts, ml/services/factCheckService, ml/utils/textPreprocessor, ml/config/constants
  ├── pipelines/themePipeline.js ← ml/config/constants
  ├── pipelines/decidePipeline.js ← ml/models/llmModel, ml/config/prompts, ml/config/constants
  ├── services/vectorService.js ← no deps
  ├── services/mediaService.js ← ml/config/constants, axios
  ├── services/lyricsService.js ← ml/config/constants, axios
  ├── services/factCheckService.js ← ml/config/constants, axios
  ├── utils/textPreprocessor.js ← no deps
  ├── utils/responseParser.js ← no deps
  ├── utils/rateLimiter.js ← ml/config/constants
  └── utils/encryption.js ← crypto (Node built-in)

Client Layer (client/src/)
  ├── main.jsx → App.jsx
  │   ├── contexts/AuthContext.jsx → services/api.js
  │   ├── contexts/SocketContext.jsx → hooks/useAuth.js, socket.io-client
  │   ├── contexts/ThemeContext.jsx ← no deps
  │   ├── contexts/PersonaContext.jsx → hooks/useAuth.js, services/api.js
  │   ├── components/ErrorBoundary/ErrorBoundary.jsx ← no deps
  │   ├── router/AppRouter.jsx → pages/*
  │   └── components/ui/index.js → 35+ UI components
  └── pages/Dashboard.jsx
      ├── contexts/* (all 4)
      ├── hooks/* (all 5)
      ├── components/ChatScreen/*, MessageBubble/*, MessageInput/*, Navbar/*, Sidebar/*
      ├── services/api.js, aiService.js
      └── components/ui/*
```

---

## Section 24: FEATURE DEPENDENCY MAP

```
Full AI Suggestions (/api/ai/suggestions/:chatId)
  ├── Emotion Analysis
  │   ├── Rule engine (core/emotionPipeline.classifyByRule)
  │   └── AI (core/emotionPipeline.analyzeEmotion → providerManager.chatCompletion)
  ├── Emotion Timeline (intelligence/emotionTimeline)
  ├── Topic Extraction (intelligence/topicEvolution)
  ├── Conversation State (intelligence/conversationState)
  ├── Relationship Detection (intelligence/relationshipEngine)
  ├── Conversation Momentum (intelligence/conversationMomentum)
  ├── Snapshot Memory (intelligence/snapshotMemory)
  ├── Future Prediction (intelligence/futurePrediction)
  └── Recommendation Engine (intelligence/recommendationEngine)
      ├── Emoji suggestions (emoji mood map + state map)
      ├── Sticker suggestions (mood-based lookup)
      ├── Shayari suggestions (mood-based type → static collection)
      ├── Song suggestions (mood-based genre)
      └── Reply suggestions (from prediction engine)

Quick Suggestions (legacy, /api/quick)
  └── Emotion Analysis → Emoji + Shayari + Song + Video

Translate (/api/ai/translate)
  └── LibreTranslate → MyMemory → AI (Gemini)

Summary (/api/ai/summary/:chatId)
  ├── CIL Snapshots (fast path)
  ├── AI Summary (LLM via providerManager)
  └── Rule-based Summary (keyword/pattern)

Rewrite (/api/ai/rewrite)
  └── Persona Pipeline → LLM (Gemini)

GIFs (/api/ai/gifs/:chatId)
  ├── Giphy API
  └── LottieFiles API + Curated

Songs (/api/ai/songs/:chatId)
  ├── iTunes API
  ├── Deezer API
  ├── Spotify API (→ JioSaavn fallback)
  └── JioSaavn API

Videos (/api/ai/videos/:chatId)
  ├── Dailymotion API
  ├── YouTube API
  ├── Pexels API
  └── Pixabay API

Memory Search (/api/memory/search)
  ├── Embedding Generation (Gemini)
  ├── Vector Encryption (AES-256-GCM)
  ├── Cosine Similarity Search
  └── Memory Verification Flow (Socket.IO)

TruthSync (/api/truth/*)
  ├── Claim Detection (LLM)
  ├── External Fact Check (Google Fact Check Tools)
  ├── Bayesian Score Calculation
  └── Community Voting

DecideFlow (/api/decide/*)
  ├── Conversation Analysis (LLM)
  ├── Poll Option Generation
  ├── Compromise Suggestion
  ├── Deadlock Detection
  └── Vote Aggregation

Ghost Sessions (/api/ghost/*)
  ├── Tldraw Whiteboard
  ├── ReactQuill Document Editor
  ├── Monaco Code Editor
  └── Real-time Sync via Socket.IO
```

---

## Section 25: PROJECT SUMMARY

### Executive Summary

**Emotune v2.0** is a sophisticated full-stack AI-powered conversation intelligence platform built on the MERN stack (MongoDB, Express, React, Node.js). It transcends traditional chat by adding a **Conversation Intelligence Layer (CIL)** that continuously analyzes every conversation for emotion, topic, state, relationship, and momentum — then proactively recommends emoji, GIFs, shayari, songs, videos, and replies.

### Architecture Assessment

**Strengths:**
- Clean separation of concerns: Core → Intelligence → Services → Controllers
- Single entry point (CIL) for all conversation analysis — no redundant AI calls
- Rule engine first, AI only when needed — minimizes API costs
- Comprehensive caching strategy (Redis + in-memory, 4 cache tiers)
- Circuit breaker pattern for AI provider resilience
- Parallel execution for external API calls (4-tier fallback chains)
- Full-duplex real-time communication (Socket.IO)
- Rich UI with 35+ reusable components and 20+ message type renderers
- Encrypted memory vectors with community verification
- Background workers for heavy AI tasks (BullMQ)

**Weaknesses / Areas for Improvement:**
- CIL state is stored in-memory (Map) — lost on server restart
- No database persistence for conversation intelligence data
- Some legacy code paths bypass CIL (e.g., old emotion pipeline calls)
- Test coverage is not visible (no test files found)
- Environment file committed to repository (secrets visible)
- No TypeScript — all JavaScript (potential for runtime type errors)
- Some utility modules have overlapping functionality (two logger implementations)
- Google Analytics / GTM / Clarity scripts hardcoded in App.jsx
- No CI/CD configuration visible
- No containerization (Docker) configuration
- No proper error monitoring integration (Sentry, etc.)
- No rate limiting for Socket.IO events

**Current State:** Production-ready with all core features implemented. Suitable for beta/early access launch.

### Feature Count: 20+ Features

| Category | Count | Features |
|----------|-------|----------|
| Core Messaging | 12 | Send, receive, edit, delete, forward, pin, reply, silent, read receipts, delivery receipts, typing, intent filter |
| AI Intelligence | 7 | Emotion analysis, topic tracking, state detection, relationship detection, momentum, prediction, recommendations |
| Content Suggestions | 6 | Emoji, GIF, sticker, shayari, song, video |
| Content Transformation | 3 | Translation, rewriting, summarization |
| Advanced AI | 4 | Memory search, truthSync, ghost sessions, decideFlow |
| User Experience | 5 | 6 themes, emotion auto-theme, personas, bookmarks, mobile nav |

### Technology Maturity

| Component | Maturity | Notes |
|-----------|----------|-------|
| Frontend Architecture | High | Clean component hierarchy, 35+ reusable UI components |
| Backend Architecture | High | Clean layered architecture, SOLID principles |
| AI Integration | High | Multi-provider with circuit breaker, caching, retries |
| Real-time | High | Full Socket.IO implementation with 19 event types |
| Database | Medium | Well-defined schemas, some missing indexes |
| Security | Medium | Good foundation, missing E2E encryption for messages |
| DevOps | Low | No CI/CD, Docker, or deployment configuration |
| Testing | Low | No visible test files |
| Monitoring | Medium | Good metrics/logging, no external monitoring |

### Future Scope

- **Database persistence for CIL:** Store conversation snapshots and analysis in MongoDB
- **E2E message encryption:** Wire up existing client-side encryption stubs
- **Voice/video calling:** WebRTC integration
- **AI voice assistant:** Text-to-speech + speech-to-text
- **Group intelligence:** Multi-user conversation context in CIL
- **Push notifications:** FCM/APNs integration
- **Progressive Web App:** Service worker + offline support
- **TypeScript migration:** Full type safety
- **Testing suite:** Jest + React Testing Library + Supertest
- **CI/CD pipeline:** GitHub Actions for test + build + deploy
- **Containerization:** Docker + docker-compose
- **Performance monitoring:** Sentry, DataDog, or similar
