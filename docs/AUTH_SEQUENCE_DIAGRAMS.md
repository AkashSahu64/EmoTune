# AUTH SEQUENCE DIAGRAMS

## Emotune v2.0.0

---

## SIGNUP SEQUENCE

```
Browser/React               Frontend(App)            API Server              MongoDB
    │                            │                        │                      │
    │  POST /signup form data    │                        │                      │
    │───────────────────────────>│                        │                      │
    │                            │                        │                      │
    │                            │  Client validation:    │                      │
    │                            │  ├── All fields filled │                      │
    │                            │  ├── password >= 8    │                      │
    │                            │  └── passwords match  │                      │
    │                            │                        │                      │
    │                            │  api.post('/auth/signup', {                   │
    │                            │    username, email,    │                      │
    │                            │    password            │                      │
    │                            │  })                    │                      │
    │                            │───────────────────────>│                      │
    │                            │                        │                      │
    │                            │                        │  Express Middleware  │
    │                            │                        │  ├── helmet          │
    │                            │                        │  ├── cors            │
    │                            │                        │  ├── morgan          │
    │                            │                        │  ├── json parser     │
    │                            │                        │  ├── cookieParser    │
    │                            │                        │  ├── mongoSanitize   │
    │                            │                        │  └── rateLimiter    │
    │                            │                        │                      │
    │                            │                        │  authController.signup
    │                            │                        │                      │
    │                            │                        │  1. Joi validate    │
    │                            │                        │     req.body         │
    │                            │                        │                      │
    │                            │                        │  2. Check duplicates │
    │                            │                        │─────────────────────>│
    │                            │                        │  User.findOne({$or}) │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  3. User.create()    │
    │                            │                        │─────────────────────>│
    │                            │                        │                      │
    │                            │                        │     pre('save')      │
    │                            │                        │     hook fires:     │
    │                            │                        │     bcrypt.hash(12)  │
    │                            │                        │                      │
    │                            │                        │  ← Document saved    │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  4. jwt.sign({userId})  → Access Token (7d)
    │                            │                        │  5. jwt.sign({userId})  → Refresh Token (30d)
    │                            │                        │                      │
    │                            │                        │  6. Store refresh    │
    │                            │                        │     token + metadata │
    │                            │                        │─────────────────────>│
    │                            │                        │  user.save()         │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  7. Set httpOnly     │
    │                            │                        │     cookie with      │
    │                            │                        │     accessToken      │
    │                            │                        │                      │
    │                            │  ← 201 {user,          │                      │
    │                            │       accessToken,     │                      │
    │                            │       refreshToken}    │                      │
    │                            │<───────────────────────│                      │
    │                            │                        │                      │
    │                            │  8. localStorage.setItem('emotune_token')
    │                            │  9. localStorage.setItem('emotune_refresh')
    │                            │  10. setToken(token) → triggers SocketContext
    │                            │  11. setUser(user)    → triggers ProtectedRoute
    │                            │                        │                      │
    │                            │  12. toast.success()   │                      │
    │                            │  13. navigate('/app')  │                      │
    │                            │                        │                      │
    │  Navigate to /app         │                        │                      │
    │<───────────────────────────│                        │                      │
```

---

## LOGIN SEQUENCE

```
Browser/React               Frontend(App)            API Server              MongoDB
    │                            │                        │                      │
    │  POST /login form data     │                        │                      │
    │───────────────────────────>│                        │                      │
    │                            │                        │                      │
    │                            │  Client validation:    │                      │
    │                            │  ├── email not empty   │                      │
    │                            │  └── password not empty│                      │
    │                            │                        │                      │
    │                            │  api.post('/auth/login',{email,password})
    │                            │───────────────────────>│                      │
    │                            │                        │                      │
    │                            │                        │  authRateLimiter:   │
    │                            │                        │  10 req/min check   │
    │                            │                        │                      │
    │                            │                        │  Joi validate:      │
    │                            │                        │  email, password    │
    │                            │                        │                      │
    │                            │                        │  1. User.findOne()  │
    │                            │                        │     {email}         │
    │                            │                        │     .select('+pass')│
    │                            │                        │─────────────────────>│
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  2. bcrypt.compare  │
    │                            │                        │     (candidate,hash)│
    │                            │                        │                      │
    │                            │                        │  3. status='online' │
    │                            │                        │     lastActive=now  │
    │                            │                        │                      │
    │                            │                        │  4. Generate tokens │
    │                            │                        │     (same as signup)│
    │                            │                        │                      │
    │                            │                        │  5. Store refresh   │
    │                            │                        │     token+history   │
    │                            │                        │─────────────────────>│
    │                            │                        │  user.save()         │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  6. Set httpOnly     │
    │                            │                        │     cookie           │
    │                            │                        │                      │
    │                            │  ← 200 {user, token, refreshToken}
    │                            │<───────────────────────│                      │
    │                            │                        │                      │
    │                            │  7. Store in localStorage
    │                            │  8. setToken, setUser
    │                            │                        │                      │
    │                            │  ──────────────────────────────────────────   │
    │                            │  Socket.IO Connection (triggered by token)    │
    │                            │  ──────────────────────────────────────────   │
    │                            │                        │                      │
    │                            │  9. io('/', {          │                      │
    │                            │       auth: { token }, │                      │
    │                            │       transports:      │                      │
    │                            │       ['websocket',    │                      │
    │                            │        'polling'] })   │                      │
    │                            │───────────────────────>│                      │
    │                            │                        │                      │
    │                            │                        │  10. io.use(auth):  │
    │                            │                        │      verifyAccessTkn│
    │                            │                        │      User.findById  │
    │                            │                        │─────────────────────>│
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  socket.userId=...  │
    │                            │                        │  socket.user=...    │
    │                            │                        │                      │
    │                            │                        │  11. Add to online  │
    │                            │                        │      Users Map      │
    │                            │                        │                      │
    │                            │                        │  12. Update status  │
    │                            │                        │─────────────────────>│
    │                            │                        │  findByIdAndUpdate  │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  13. Find user chats│
    │                            │                        │─────────────────────>│
    │                            │                        │  Chat.find()        │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │  ← onlineUsers:list   │  14. Join chat rooms │
    │                            │<───────────────────────│                      │
    │                            │                        │                      │
    │                            │  ← (broadcast)         │  15. Broadcast      │
    │                            │     user:online        │     user:online     │
    │                            │                        │                      │
    │  11. toast.success()       │                        │                      │
    │  12. navigate('/app')     │                        │                      │
    │<───────────────────────────│                        │                      │
```

---

## LOGOUT SEQUENCE

```
Browser/React               Frontend(App)            API Server              MongoDB
    │                            │                        │                      │
    │  Click Logout              │                        │                      │
    │───────────────────────────>│                        │                      │
    │                            │                        │                      │
    │                            │  1. api.post('/auth/   │                      │
    │                            │     logout') with      │                      │
    │                            │     Bearer token       │                      │
    │                            │───────────────────────>│                      │
    │                            │                        │                      │
    │                            │                        │  2. authMiddleware  │
    │                            │                        │     verify token    │
    │                            │                        │     find user       │
    │                            │                        │─────────────────────>│
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  3. status=offline  │
    │                            │                        │  4. lastActive=now  │
    │                            │                        │  5. refreshToken=null│
    │                            │                        │─────────────────────>│
    │                            │                        │  user.save()         │
    │                            │                        │<─────────────────────│
    │                            │                        │                      │
    │                            │                        │  6. clearCookie     │
    │                            │                        │     ('token')       │
    │                            │                        │                      │
    │                            │  ← 200 {message}       │                      │
    │                            │<───────────────────────│                      │
    │                            │                        │                      │
    │                            │  7. localStorage       │                      │
    │                            │     .removeItem('emo.. │                      │
    │                            │     _token')           │                      │
    │                            │     _refresh')         │                      │
    │                            │                        │                      │
    │                            │  8. setToken(null)     │                      │
    │                            │  9. setUser(null)      │                      │
    │                            │                        │                      │
    │                            │  ──────────────────────────────────────────   │
    │                            │  Socket Disconnect (triggered by token=null)  │
    │                            │  ──────────────────────────────────────────   │
    │                            │                        │                      │
    │                            │  socket.disconnect()   │                      │
    │                            │───────────────────────>│                      │
    │                            │                        │                      │
    │                            │                        │  10. Remove socket  │
    │                            │                        │      from Map       │
    │                            │                        │                      │
    │                            │                        │  11. If no more     │
    │                            │                        │      sockets:       │
    │                            │                        │      status=offline │
    │                            │                        │─────────────────────>│
    │                            │                        │                      │
    │                            │                        │  12. Broadcast      │
    │                            │                        │      user:offline   │
    │                            │                        │                      │
    │                            │  13. setOnlineUsers()  │                      │
    │                            │      clear onlineUsers │                      │
    │                            │                        │                      │
    │  Navigate to /login        │                        │                      │
    │<───────────────────────────│                        │                      │
```

---

## REFRESH TOKEN SEQUENCE

```
Client (Axios)              API Server                    MongoDB
    │                            │                          │
    │  Original API Request      │                          │
    │  Authorization: Bearer ... │                          │
    │───────────────────────────>│                          │
    │                            │                          │
    │  401 { error: 'Token      │                          │
    │        expired',           │                          │
    │        code: 'TOKEN_      │                          │
    │        EXPIRED' }          │                          │
    │<───────────────────────────│                          │
    │                            │                          │
    │  Axios interceptor catches │                          │
    │  status 401                │                          │
    │                            │                          │
    │  Checks _retry flag        │                          │
    │                            │                          │
    │  Reads localStorage        │                          │
    │  'emotune_refresh'         │                          │
    │                            │                          │
    │  POST /auth/refresh-token  │                          │
    │  { refreshToken: '...' }   │                          │
    │───────────────────────────>│                          │
    │                            │                          │
    │                            │  1. verifyRefreshToken() │
    │                            │     using JWT_REFRESH    │
    │                            │     _SECRET              │
    │                            │                          │
    │                            │  2. User.findById()      │
    │                            │     .select('+refresh   │
    │                            │     Token')              │
    │                            │─────────────────────────>│
    │                            │<─────────────────────────│
    │                            │                          │
    │                            │  3. Compare              │
    │                            │     user.refreshToken    │
    │                            │     === request.token     │
    │                            │                          │
    │                            │  4. Generate new tokens  │
    │                            │     accessToken (7d)     │
    │                            │     refreshToken (30d)   │
    │                            │                          │
    │                            │  5. Update               │
    │                            │     user.refreshToken    │
    │                            │─────────────────────────>│
    │                            │  user.save()             │
    │                            │<─────────────────────────│
    │                            │                          │
    │  200 { accessToken: '...', │                          │
    │        refreshToken: '...' }                          │
    │<───────────────────────────│                          │
    │                            │                          │
    │  Update localStorage       │                          │
    │  Retry original request    │                          │
    │  with new Authorization    │                          │
    │───────────────────────────>│                          │
    │                            │                          │
    │  200 { ... success ... }   │                          │
    │<───────────────────────────│                          │
```

---

## SOCKET CONNECTION (AUTHENTICATED)

```
Client (Socket.IO)          API Server                    MongoDB
    │                            │                          │
    │  io('/', {                 │                          │
    │    auth: { token },        │                          │
    │    transports: ['websocket']}                          │
    │───────────────────────────>│                          │
    │                            │                          │
    │                            │  io.use() middleware     │
    │                            │                          │
    │                            │  verifyAccessToken(token)│
    │                            │                          │
    │                            │  Find user by decoded    │
    │                            │  .userId                 │
    │                            │─────────────────────────>│
    │                            │  User.findById()         │
    │                            │<─────────────────────────│
    │                            │                          │
    │                            │  socket.userId = id      │
    │                            │  socket.user = user      │
    │                            │  next()                  │
    │                            │                          │
    │  connect (acknowledged)    │                          │
    │<───────────────────────────│                          │
    │                            │                          │
    │                            │  io.on('connection')     │
    │                            │                          │
    │                            │  Add to onlineUsers Map  │
    │                            │  (userId → Set<socketId>)│
    │                            │                          │
    │                            │  socket.join('user:{id}')│
    │                            │                          │
    │                            │  Find user's chats       │
    │                            │─────────────────────────>│
    │                            │  Chat.find(participants) │
    │                            │<─────────────────────────│
    │                            │                          │
    │                            │  Join each chat room     │
    │                            │                          │
    │                            │  Check ghost mode /      │
    │                            │  privacy settings for    │
    │                            │  visible online status   │
    │                            │                          │
    │  'onlineUsers:list'        │  Build visible list      │
    │  { onlineUserIds: [...] }  │                          │
    │<───────────────────────────│                          │
    │                            │                          │
    │  (other clients)           │                          │
    │  'user:online'             │  Broadcast to others     │
    │  { userId }                │  (if not ghost/hidden)   │
```

---

## FORGOT PASSWORD / RESET PASSWORD

**NOT IMPLEMENTED.** These flows do not exist in the codebase.

---

## VERIFICATION EMAIL

**NOT IMPLEMENTED.** No email verification flow exists.
