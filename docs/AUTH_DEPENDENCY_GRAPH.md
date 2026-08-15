# AUTH DEPENDENCY GRAPH

## Emotune v2.0.0

---

## 1. BACKEND AUTH DEPENDENCY GRAPH

```
server.js
├── dotenv (.env)
├── express
├── http
├── socket.io
│   └── ./utils/jwt.js ────────────────────────────────────────────────┐
│       ├── jsonwebtoken                                                │
│       └── ./config/constants.js                                       │
│           └── dotenv (.env)                                           │
├── mongoose
├── cors
├── helmet
├── morgan
├── cookie-parser
├── express-mongo-sanitize
├── ./config/db.js
│   ├── mongoose
│   └── dns
├── ./config/cloudinary.js
├── ./utils/jwt.js (same as above)                                      │
├── ./models/User.js ◄━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘
│   ├── mongoose
│   └── bcryptjs
├── ./models/Chat.js
├── ./middleware/errorHandler.js
│   └── ./utils/logger.js
├── ./middleware/rateLimiter.js
│   └── express-rate-limit
├── ./core/cacheService.js
│   └── ioredis
├── ./core/config.js
│   └── dotenv (.env)
├── ./core/configValidator.js
├── ./core/gracefulShutdown.js
│   ├── mongoose
│   ├── ./core/logger.js
│   ├── ./core/cacheService.js
│   └── ./workers/*Worker.js
├── ./core/healthCheck.js
│   ├── mongoose
│   ├── os
│   ├── ./core/config.js
│   └── ./core/cacheService.js
│
├── ./routes/authRoutes.js
│   ├── express.Router()
│   ├── ./controllers/authController.js
│   │   ├── User (./models/User.js)
│   │   ├── generateAccessToken, generateRefreshToken, 
│   │   │   verifyRefreshToken (./utils/jwt.js)
│   │   ├── signupSchema, loginSchema (./utils/validators.js)
│   │   │   └── joi
│   │   └── logger (./utils/logger.js)
│   ├── authMiddleware (./middleware/authMiddleware.js)
│   │   ├── verifyAccessToken (./utils/jwt.js)
│   │   └── User (./models/User.js)
│   └── authRateLimiter (./middleware/rateLimiter.js)
│
├── ./routes/userRoutes.js
│   ├── express.Router()
│   ├── ./controllers/chatController.js (searchUsers only)
│   ├── ./controllers/userController.js
│   │   ├── User (./models/User.js)
│   │   ├── Chat (./models/Chat.js)
│   │   ├── updateProfileSchema, changePasswordSchema, 
│   │   │   preferencesSchema (./utils/validators.js)
│   │   │   └── joi
│   │   └── logger (./utils/logger.js)
│   └── authMiddleware (./middleware/authMiddleware.js)
│
├── ./routes/aiRoutes.js → authMiddleware
├── ./routes/chatRoutes.js → authMiddleware
├── ./routes/messageRoutes.js → authMiddleware
├── ./routes/dnaRoutes.js → authMiddleware
├── ./routes/memoryRoutes.js → authMiddleware
├── ./routes/bookmarkRoutes.js → authMiddleware
├── ./routes/personaRoutes.js → authMiddleware
├── ./routes/uploadRoutes.js → authMiddleware
└── ... other routes → authMiddleware
```

---

## 2. FRONTEND AUTH DEPENDENCY GRAPH

```
client/src/main.jsx
└── App (./App.jsx)
    ├── react-helmet-async (HelmetProvider)
    ├── ./contexts/ThemeContext.jsx
    │   └── React.createContext, useState, useEffect, useCallback
    ├── ./contexts/AuthContext.jsx ◄━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┐
    │   ├── React.createContext, useState, useEffect, useCallback │
    │   └── ./services/api.js ◄━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┼──┐
    │       └── axios                                              │  │
    ├── ./contexts/SocketContext.jsx                                │  │
    │   ├── socket.io-client (io)                                  │  │
    │   └── ./hooks/useAuth.js ◄━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘  │
    │       └── React.useContext(AuthContext)                        │  │
    ├── ./contexts/PersonaContext.jsx                                │  │
    │   ├── ./services/api.js ──────────────────────────────────────┘  │
    │   └── ./hooks/useAuth.js                                         │
    ├── ./components/ErrorBoundary/ErrorBoundary.jsx                   │
    ├── ./router/AppRouter.jsx                                         │
    │   ├── react-router-dom (BrowserRouter, Routes, Route, Navigate)  │
    │   └── ./hooks/useAuth.js ────────────────────────────────────────┘
    │       ├── ./pages/LandingPage.jsx
    │       ├── ./pages/LoginPage.jsx
    │       │   ├── ./hooks/useAuth.js
    │       │   ├── react-router-dom (Link, useNavigate)
    │       │   ├── sonner (toast)
    │       │   ├── framer-motion (motion)
    │       │   ├── react-icons/fi
    │       │   ├── react-helmet-async
    │       │   ├── ./components/SEO/SEO.jsx
    │       │   ├── ./components/auth/BrandShowcase.jsx
    │       │   ├── ./components/auth/SocialLoginButtons.jsx
    │       │   ├── ./components/auth/TrustBadges.jsx
    │       │   └── ./components/auth/AuthFooter.jsx
    │       ├── ./pages/SignupPage.jsx
    │       │   ├── ./hooks/useAuth.js
    │       │   ├── react-router-dom (Link, useNavigate)
    │       │   ├── sonner (toast)
    │       │   ├── framer-motion (motion)
    │       │   ├── react-icons/fi
    │       │   ├── react-helmet-async
    │       │   ├── ./components/SEO/SEO.jsx
    │       │   ├── ./components/auth/BrandShowcase.jsx
    │       │   ├── ./components/auth/SocialLoginButtons.jsx
    │       │   ├── ./components/auth/PasswordStrength.jsx
    │       │   ├── ./components/auth/TrustBadges.jsx
    │       │   └── ./components/auth/AuthFooter.jsx
    │       └── ./pages/Dashboard.jsx
    │           ├── ./hooks/useAuth.js
    │           ├── ./hooks/useSocket.js
    │           │   └── React.useContext(SocketContext)
    │           ├── ./hooks/useTheme.js
    │           ├── ./hooks/usePersona.js
    │           └── ... many components
    └── sonner (Toaster)
```

---

## 3. AUTH FILE DEPENDENCY MAP

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENVIRONMENT                                 │
│                    .env / .env.example                               │
│                    JWT_SECRET, JWT_REFRESH_SECRET,                   │
│                    JWT_EXPIRY, JWT_REFRESH_EXPIRY                    │
└───────────┬─────────────────────────────────────────────────────────┘
            │ reads
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  server/config/constants.js    server/core/config.js                │
│  ├── JWT_SECRET                ├── CONFIG.jwt.secret                │
│  ├── JWT_REFRESH_SECRET        ├── CONFIG.jwt.refreshSecret         │
│  ├── JWT_EXPIRY                ├── CONFIG.jwt.expiry                │
│  └── JWT_REFRESH_EXPIRY        └── CONFIG.jwt.refreshExpiry         │
└───────────┬─────────────────────────────────────────────────────────┘
            │ imported by
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     server/utils/jwt.js                              │
│  ├── generateAccessToken(userId)                                     │
│  │   └── jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY })│
│  ├── generateRefreshToken(userId)                                    │
│  │   └── jwt.sign({ userId }, JWT_REFRESH_SECRET, {                  │
│  │       expiresIn: JWT_REFRESH_EXPIRY })                            │
│  ├── verifyAccessToken(token)                                        │
│  │   └── jwt.verify(token, JWT_SECRET)                               │
│  └── verifyRefreshToken(token)                                       │
│      └── jwt.verify(token, JWT_REFRESH_SECRET)                       │
└──────┬──────────────┬───────────────────────────────────────────────┘
       │              │
       │ imported by  │ imported by
       ▼              ▼
┌──────────────────┐ ┌────────────────────────────────────────────────┐
│ authMiddleware   │ │ authController.js                               │
│ .js              │ │ ├── signup()                                     │
│                  │ │ │   ├── Joi signupSchema validate()              │
│ ├── verifyAccess │ │ │   ├── User.findOne({$or})                     │
│ │   Token()      │ │ │   ├── User.create() → pre('save') bcrypt hash│
│ ├── User.findById│ │ │   ├── generateAccessToken()                   │
│ │   (userId)     │ │ │   ├── generateRefreshToken()                  │
│ └── req.user,    │ │ │   ├── user.refreshToken = ...                │
│      req.userId  │ │ │   ├── user.refreshTokens.push(...)           │
│                  │ │ │   ├── res.cookie('token', ...)                │
│                  │ │ │   └── res.status(201).json()                  │
│                  │ │ │                                               │
│                  │ │ ├── login()                                     │
│                  │ │ │   ├── Joi loginSchema validate()              │
│                  │ │ │   ├── User.findOne().select('+password')      │
│                  │ │ │   ├── user.comparePassword() → bcrypt.compare│
│                  │ │ │   ├── [same token/cookie logic as signup]     │
│                  │ │ │   └── user.status = 'online'                  │
│                  │ │ │                                               │
│                  │ │ ├── logout()                                    │
│                  │ │ │   ├── User.findById(req.userId)               │
│                  │ │ │   ├── user.refreshToken = null               │
│                  │ │ │   ├── user.status = 'offline'                │
│                  │ │ │   └── res.clearCookie('token')               │
│                  │ │ │                                               │
│                  │ │ ├── refreshToken()                              │
│                  │ │ │   ├── verifyRefreshToken()                    │
│                  │ │ │   ├── User.findById().select('+refreshToken')│
│                  │ │ │   ├── Compare tokens                         │
│                  │ │ │   ├── Generate new tokens                    │
│                  │ │ │   └── Update user.refreshToken               │
│                  │ │ │                                               │
│                  │ │ ├── getMe()                                     │
│                  │ │ │   └── User.findById(req.userId)               │
│                  │ │ │                                               │
│                  │ │ └── updateProfile()                             │
│                  │ │     └── User.findByIdAndUpdate()                │
│                  │ │                                                 │
│                  │ └── depends on: User, jwt, validators, logger    │
│                  └────────────────────────────────────────────────────┘
│
│ imported by
▼
┌─────────────────────────────────────────────────────────────────────┐
│  server/routes/authRoutes.js                                        │
│  ├── POST /signup → authRateLimiter, signup                         │
│  ├── POST /login → authRateLimiter, login                           │
│  ├── POST /logout → authMiddleware, logout                          │
│  ├── POST /refresh-token → refreshToken                             │
│  ├── GET /me → authMiddleware, getMe                                │
│  ├── PATCH /profile → authMiddleware, updateProfile                 │
│  ├── POST /seed → authRateLimiter, seedTestUser                     │
│  └── GET /test-credentials → getTestCredentials                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. FULL AUTH DATA FLOW

```
                        ┌─────────────────────┐
                        │    Browser/Memory    │
                        │  localStorage        │
                        │  ├─ emotune_token    │
                        │  └─ emotune_refresh  │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │         Axios Client         │
                    │  (client/src/services/api.js)│
                    │                              │
                    │  Request Interceptor:        │
                    │  Reads emotune_token from    │
                    │  localStorage, adds          │
                    │  Authorization: Bearer       │
                    │                              │
                    │  Response Interceptor:       │
                    │  401 → refresh token flow   │
                    └──────────────┬──────────────┘
                                   │ HTTP
                                   ▼
                    ┌──────────────────────────────┐
                    │      Express Middleware       │
                    │  (in order):                  │
                    │  helmet → cors → morgan →     │
                    │  json → urlencoded →          │
                    │  cookieParser → mongoSanitize │
                    │  → apiRateLimiter             │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │    Route-Specific Middleware  │
                    │  authRateLimiter (10/min)    │
                    │  or                         │
                    │  authMiddleware:              │
                    │  ├─ Extract token             │
                    │  ├─ jwt.verify()              │
                    │  ├─ User.findById()           │
                    │  └─ Attach req.user/req.userId│
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │   Controller/Service Layer   │
                    │  (authController.js,         │
                    │   userController.js)         │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │      Data Access Layer       │
                    │  User Model (Mongoose)       │
                    │  ├─ pre('save') bcrypt hash  │
                    │  ├─ comparePassword()        │
                    │  └─ toPublicJSON()           │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                           ┌──────────────┐
                           │   MongoDB     │
                           │  users collection│
                           └──────────────┘
```

---

## 5. SOCKET.IO AUTH DEPENDENCY

```
SocketContext.jsx (Client)
├── socket.io-client (io)
└── useAuth() → AuthContext.token
    │
    │  io('/', { auth: { token } })
    ▼
server.js (Server)
├── io.use() middleware
│   ├── verifyAccessToken(token) → jwt.verify()
│   ├── User.findById()
│   └── Attach to socket.userId
│
├── io.on('connection')
│   ├── onlineUsers Map (in-memory)
│   ├── User.findByIdAndUpdate(status)
│   ├── Broadcast events
│   └── Chat.find() → join rooms
│
└── io.on('disconnect')
    ├── onlineUsers Map cleanup
    ├── User.findByIdAndUpdate(status)
    └── Broadcast events
```

---

## 6. AUTH MIDDLEWARE USAGE (Routes that require auth)

```
authMiddleware is used by:
├── authRoutes.js:  POST /logout, GET /me, PATCH /profile
├── userRoutes.js:  GET /search, GET /me, PUT /profile, PUT /preferences,
│                   PUT /password, DELETE /account, GET /sessions,
│                   POST /logout-other
├── aiRoutes.js:    All 13 endpoints
├── chatRoutes.js:  Both endpoints (GET /, POST /direct/:userId)
├── messageRoutes.js: All 11 endpoints
├── dnaRoutes.js:   All 6 endpoints
├── memoryRoutes.js: All 4 endpoints
├── bookmarkRoutes.js
├── personaRoutes.js
├── uploadRoutes.js
├── feedbackRoutes.js
├── analyticsRoutes.js
├── ghostRoutes.js
├── decideRoutes.js
├── truthRoutes.js
├── storyRoutes.js
├── groupIntelligenceRoutes.js
├── communityRoutes.js
└── orchestratorRoutes.js
```

**Total: 18 route files use authMiddleware**

---

## 7. THIRD-PARTY DEPENDENCIES (Auth-Related)

### Server (package.json)
| Package | Version | Auth Usage |
|---------|---------|------------|
| `bcryptjs` | ^2.4.3 | Password hashing and comparison |
| `jsonwebtoken` | ^9.0.2 | JWT signing and verification |
| `joi` | ^17.11.0 | Request body validation |
| `cookie-parser` | ^1.4.6 | Cookie parsing for token fallback |
| `express-rate-limit` | ^7.1.4 | Rate limiting on auth endpoints |
| `helmet` | ^7.1.0 | Security headers (CSP disabled) |
| `cors` | ^2.8.5 | Cross-origin restrictions |
| `express-mongo-sanitize` | ^2.2.0 | NoSQL injection prevention |
| `mongoose` | ^8.0.0 | Database ORM, schema definition |
| `ioredis` | ^5.3.2 | Redis (NOT used for auth) |

### Client (package.json)
| Package | Version | Auth Usage |
|---------|---------|------------|
| `axios` | ^1.6.0 | HTTP client with interceptors |
| `react-router-dom` | ^6.20.0 | Protected/Public route guards |
| `socket.io-client` | ^4.7.2 | Authenticated WebSocket connections |
| `sonner` | ^1.2.0 | Toast notifications for auth events |
