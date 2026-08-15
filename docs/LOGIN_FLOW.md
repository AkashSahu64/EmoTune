# LOGIN FLOW — Complete Execution Trace

## Emotune v2.0.0 — Identity Module

---

## OVERVIEW

The login flow is a **stateless, JWT-based authentication** process with session management. Users can authenticate via three modes: **email**, **username**, or **phone** (E.164) — each paired with a password. The system performs rate limiting, AI-based risk analysis, account lockout detection, and device fingerprinting.

**New in v2.0:** Auto-detect login mode (email/username/phone), reusable form components, remember-me (session vs persistent cookie), AI security risk scoring, login history recording, device trust management.

---

## STEP-BY-STEP EXECUTION

### Phase 1: User Input

**File:** `client/src/pages/LoginPage.jsx`

1. User navigates to `/login`
   - `PublicRoute` checks authentication status
   - If already authenticated → redirect to `/app`
   - If loading → show `<Loader fullScreen />`

2. **Login mode auto-detection** — single input field that detects type:
   | Input Pattern | Detected Mode | Backend Field |
   |--------------|---------------|---------------|
   | Contains `@` | Email | `email` |
   | Starts with `+` | Phone | `phone` (stripped spaces → E.164) |
   | Otherwise | Username | `username` |

   Detection logic (module-level function, stable reference):
   ```javascript
   function detectMode(value) {
     if (value.includes('@')) return 'email';
     if (/^\+/.test(value.trim())) return 'phone';
     return 'username';
   }
   ```
   Three mode badges (Email / Username / Phone) auto-highlight below the input.

3. **Form fields:**
   - Identifier (single input, placeholder/type/autocomplete adapt to detected mode)
   - Password (with visibility toggle)
   - Remember me checkbox
   - Forgot password link → `/forgot-password`

4. **Client-side validation:**
   ```javascript
   if (!identifier.trim()) errs.identifier = 'Please enter your login details';
   if (!password) errs.password = 'Password is required';
   ```

   Form fields use `Input` and `FormField` components from `components/ui/Form/` with stable `useCallback` handlers — no focus loss.

5. On submit, builds payload based on active mode:
   ```javascript
   const payload = { password, rememberMe };
   if (loginMode === 'email') payload.email = identifier.trim();
   else if (loginMode === 'username') payload.username = identifier.trim();
   else if (loginMode === 'phone') payload.phone = identifier.replace(/\s/g, '');
   await login(payload);
   ```

### Phase 2: AuthContext.login()

**File:** `client/src/contexts/AuthContext.jsx`

```javascript
const login = async (credential, password) => {
  const payload = typeof credential === 'object'
    ? credential  // Object-style: login({ email, password, rememberMe })
    : { email: credential, password };  // Legacy positional: login(email, password)

  const { data } = await api.post('/identity/auth/login', payload);
  if (data.data?.accessToken) {
    localStorage.setItem('emotune_token', data.data.accessToken);
    setToken(data.data.accessToken);
  }
  setUser(data.data.user);
  setSession(data.data.session);
  return data;
};
```

Supports both object-style (with all fields) and legacy positional calls.

### Phase 3: API Request

`POST /api/identity/auth/login` with body:
```json
{
  "email": "john@example.com",
  "password": "P@ssw0rd!",
  "rememberMe": true
}
```

Or:
```json
{
  "phone": "+14155552671",
  "password": "P@ssw0rd!",
  "rememberMe": false
}
```

### Phase 4: Express Middleware Pipeline

1. `authRateLimiter.middleware()` — 5 requests/minute per IP (login-specific)
2. `extractDeviceInfo` — reads `X-Device-Fingerprint` header for device recognition
3. `validate(loginSchema)` — Joi validation

### Phase 5: Joi Schema Validation

**File:** `server/identity/validators/authValidators.js`

```javascript
loginSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  password: Joi.string().required(),
  username: Joi.string().optional().allow(''),
  phone: Joi.string().optional().allow('').custom(validateE164Phone),
  rememberMe: Joi.boolean().optional().default(false),
}).or('email', 'username', 'phone').messages({
  'object.missing': 'Provide email, username, or phone number',
});
```

Phone validation uses `libphonenumber-js` (same as signup). At least one of email/username/phone must be provided.

### Phase 6: Controller Logic

**File:** `server/identity/controllers/authController.js:62-117`

#### Step 6a: Extract fields
```javascript
const { email, username, phone, password, rememberMe, countryCode, deviceName } = req.body;
```

#### Step 6b: Call IdentityService.login()
```javascript
const result = await IdentityService.login({
  email, username, phone, password, countryCode,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  deviceFingerprint: req.headers['x-device-fingerprint'],
  deviceName,
});
```

#### Step 6c: Set refresh token cookie
```javascript
const cookieMaxAge = rememberMe
  ? IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAge      // 30 days
  : IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAgeSession;  // 1 day (session)

res.cookie('refreshToken', result.refreshToken, {
  httpOnly: true,
  secure: IDENTITY_CONFIG.security.secureCookies,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: cookieMaxAge,
});
```

#### Step 6d: Success Response (200)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... user.toPublicJSON() ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "session": { "id": "uuid", "deviceName": "..." },
    "risk": { "score": 0, "factors": [], "requiresVerification": false }
  }
}
```
- `risk` field only present when risk score > 0

### Phase 7: IdentityService.login()

**File:** `server/identity/services/identityService.js:92-188`

#### Step 7a: Find User by Identifier
```javascript
let user;
if (email) user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
else if (phone) user = await User.findOne({ phone }).select('+password');
else if (username) user = await User.findOne({ username: username.trim() }).select('+password');

if (!user) throw IdentityError.invalidCredentials();  // HTTP 401
```
- Same error message for wrong identifier OR wrong password (prevents enumeration)
- `.select('+password')` includes the normally-hidden password field

#### Step 7b: Check Account Deletion
```javascript
if (user.deletedAt) throw IdentityError.accountDeleted();  // HTTP 410
```

#### Step 7c: Verify Password
```javascript
const isMatch = await comparePassword(password, user.password);
if (!isMatch) {
  await loginHistoryService.recordLoginAttempt(user._id, 'login_failure', {
    ip, userAgent, deviceFingerprint,
    method: email ? 'email_password' : 'username_password',
    failureReason: 'wrong_password', success: false,
  });
  await this._checkAndLockAccount(user._id);  // Check if account should be locked
  throw IdentityError.invalidCredentials();  // HTTP 401
}
```

Uses **bcrypt.compare()** (12 rounds). On wrong password:
- Records failed login attempt
- Checks if account threshold reached → locks if 5+ consecutive failures
- Returns same `401 Invalid credentials` error

#### Step 7d: Account Lockout Check
```javascript
const isLocked = await loginHistoryService.isAccountLocked(user._id);
if (isLocked) {
  const remaining = await loginHistoryService.getRemainingLockoutTime(user._id);
  throw IdentityError.accountLocked(remaining);  // HTTP 423
}
```
- Lockout duration: 15 minutes
- Progressive delay: base 1000ms geometric backoff

#### Step 7e: AI Security Risk Analysis
```javascript
const risk = await aiSecurityService.shouldBlockLogin(user._id, {
  ip, userAgent, deviceFingerprint, location,
});

if (risk.shouldBlock) {
  await loginHistoryService.recordLoginAttempt(..., failureReason: 'blocked_by_ai_security');
  throw IdentityError.verificationRequired();
}
```

Risk factors evaluated:
- **Impossible travel** — previous login > 800km/h away
- **New device/geo** — first-time device or unusual region
- **Velocity** — rapid attempts from different locations
- Composite score 0-100, threshold 70

#### Step 7f: Update User Status
```javascript
user.status = 'online';
user.lastActive = new Date();
await user.save({ validateBeforeSave: false });
```

#### Step 7g: Create Session & Tokens
```javascript
const tokens = await this._createSessionAndTokens(user, {
  ip, userAgent, deviceFingerprint, deviceName, location,
});
```

Internal flow (`_createSessionAndTokens`):
1. Generate `tokenFamily` (UUID)
2. Generate initial access token with `sessionId: 'pending'`
3. Generate refresh token (crypto.randomBytes(32))
4. Get or create device (if fingerprint provided)
5. Create session document with:
   - `sessionId` (UUID)
   - `refreshTokenFamily` (UUID)
   - `refreshTokenHash` (SHA-256 of refresh token)
   - Device metadata
6. Generate final access token (15 min, includes `sessionId`)
7. Generate final refresh token as JWT (30 day, includes `family`, `version`, `jti`)
8. Store hash in session, return tokens

#### Step 7h: Auto-Trust Device
```javascript
if (tokens.device && deviceFingerprint && !tokens.device.isTrusted && !risk.requiresVerification) {
  if (IDENTITY_CONFIG.device.fingerprintEnabled) {
    await deviceService.trustDevice(tokens.device.deviceId, user._id);
  }
}
```
First-time devices from non-risky logins are auto-trusted.

#### Step 7i: Record Login History
```javascript
await loginHistoryService.recordLoginAttempt(user._id, 'login_success', {
  ip, userAgent, deviceFingerprint,
  deviceId: tokens.device?.deviceId,
  sessionId: tokens.session.sessionId,
  method: email ? 'email_password' : phone ? 'phone_password' : 'username_password',
  riskScore: risk.risk.score,
  riskFactors: risk.risk.factors,
  success: true,
});
```

#### Step 7j: Audit Log
```javascript
await logEvent({
  action: AUDIT_ACTIONS.LOGIN_SUCCESS,
  userId: user._id, sessionId, deviceId, ip, userAgent,
  riskScore: risk.risk.score,
});
```

### Phase 8: Client-Side After Login

#### Step 8a: Token Storage
```javascript
localStorage.setItem('emotune_token', data.data.accessToken);
```

#### Step 8b: State Update
```javascript
setToken(data.data.accessToken);   // Triggers SocketContext re-render → Socket.IO connect
setUser(data.data.user);            // Triggers ProtectedRoute re-render
toast.success('Welcome back!');
navigate('/app');
```

### Phase 9: Socket.IO Connection

**File:** `client/src/contexts/SocketContext.jsx`

The `token` state change from `null` to a string triggers `useEffect`:

```javascript
const newSocket = io('/', {
  auth: { token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
});
```

**Server-side Socket auth** (server.js):
1. `io.use()` middleware verifies access token
2. Fetches user from MongoDB
3. Attaches `socket.userId` and `socket.user`
4. Adds user to `onlineUsers` Map
5. Updates MongoDB status to `online`
6. Joins `user:{userId}` room
7. Fetches user's chats and joins their rooms
8. Broadcasts `user:online` to other clients
9. Sends `onlineUsers:list` to the connecting client

---

## ERROR SCENARIOS

| Scenario | HTTP | Error Code | Message |
|----------|------|-----------|---------|
| Missing identifier | 400 | `VALIDATION_ERROR` | "Provide email, username, or phone number" |
| Missing password | 400 | `VALIDATION_ERROR` | "\"password\" is required" |
| Invalid email format | 400 | `VALIDATION_ERROR` | "\"email\" must be a valid email" |
| Invalid phone format | 400 | `VALIDATION_ERROR` | "Invalid phone number format" |
| Wrong email/username/phone | 401 | `INVALID_CREDENTIALS` | "Invalid email or password" |
| Wrong password | 401 | `INVALID_CREDENTIALS` | "Invalid email or password" |
| Account locked | 423 | `ACCOUNT_LOCKED` | "Account locked. Try again in X minutes." |
| Account deleted | 410 | `ACCOUNT_DELETED` | "This account has been deleted" |
| AI risk blocked | 401 | `VERIFICATION_REQUIRED` | "Additional verification required" |
| Rate limited | 429 | Via express-rate-limit | "Too many auth attempts. Try again later." |
| Server error | 500 | — | "Login failed" |

---

## DATA FLOW DIAGRAM

```
 Browser                        Frontend                   Identity API               MongoDB
   │                               │                           │                        │
   │  Mode: Email/Username/Phone    │                           │                        │
   │  Fill identifier + password    │                           │                        │
   │──────────────────────────────>│                           │                        │
   │                               │  Validate client-side     │                        │
   │                               │  Build payload            │                        │
   │                               │  api.post('/login', {     │                        │
   │                               │    email/username/phone,  │                        │
   │                               │    password,              │                        │
   │                               │    rememberMe             │                        │
   │                               │  })                       │                        │
   │                               │──────────────────────────>│                        │
   │                               │                           │  authRateLimiter       │
   │                               │                           │  (5/min)               │
   │                               │                           │                        │
   │                               │                           │  Joi validate          │
   │                               │                           │  (email|username|phone  │
   │                               │                           │   + password)          │
   │                               │                           │                        │
   │                               │                           │  User.findOne(         │
   │                               │                           │    {email/phone/       │
   │                               │                           │     username})         │
   │                               │                           │  .select('+password')  │
   │                               │                           │──────────────────────> │
   │                               │                           │<────────────────────── │
   │                               │                           │                        │
   │                               │                           │  bcrypt.compare(       │
   │                               │                           │    password, hash)     │
   │                               │                           │                        │
   │                               │                           │  AI security check     │
   │                               │                           │  (impossible travel,   │
   │                               │                           │   velocity, new device)│
   │                               │                           │                        │
   │                               │                           │  Account lockout check │
   │                               │                           │                        │
   │                               │                           │  user.status='online'  │
   │                               │                           │  user.lastActive=now   │
   │                               │                           │  user.save()           │
   │                               │                           │──────────────────────> │
   │                               │                           │                        │
   │                               │                           │  Create session (      │
   │                               │                           │    sessionId, family,  │
   │                               │                           │    device, hash)       │
   │                               │                           │──────────────────────> │
   │                               │                           │                        │
   │                               │                           │  jwt.sign() x2         │
   │                               │                           │  (access + refresh)    │
   │                               │                           │                        │
   │                               │                           │  Record login history  │
   │                               │                           │──────────────────────> │
   │                               │                           │                        │
   │                               │                           │  Audit log event       │
   │                               │                           │  (LOGIN_SUCCESS)       │
   │                               │                           │                        │
   │                               │  ← 200 { user,            │                        │
   │                               │       accessToken,        │                        │
   │                               │       session }           │                        │
   │                               │  Set-Cookie: refreshToken │                        │
   │                               │  (httpOnly, path=/api/   │                        │
   │                               │   auth, maxAge based on  │                        │
   │                               │   rememberMe)             │                        │
   │                               │<──────────────────────────│                        │
   │                               │                           │                        │
   │                               │  localStorage.setItem()   │                        │
   │                               │  setToken() → Socket.IO   │                        │
   │                               │  setUser() → Protected    │                        │
   │                               │  Route → Dashboard        │                        │
   │                               │  navigate('/app')         │                        │
   │                               │                           │                        │
   │  Redirect to /app            │                           │                        │
   │<──────────────────────────────│                           │                        │
```
