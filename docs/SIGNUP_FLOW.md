# SIGNUP FLOW — Complete Execution Trace

## Emotune v2.0.0 — Identity Module

---

## OVERVIEW

The signup flow creates a new user in MongoDB, generates JWT tokens (access + refresh), creates a session, initializes an AI profile (ConversationDNA), sets cookies, and returns user data. The user is immediately authenticated upon signup — no email verification required.

**New in v2.0:** Full name, E.164 phone auto-formatting via PhoneInput component, country code selector, password strength meter + requirements checklist, enterprise form component library with zero focus-loss.

---

## STEP-BY-STEP EXECUTION

### Phase 1: User Input

**File:** `client/src/pages/SignupPage.jsx`

Uses reusable form components from `client/src/components/ui/Form/`:
- `Input` — text/email/tel fields (fullName, username, email)
- `PasswordInput` — password + confirmPassword with strength meter + requirements checklist
- `PhoneInput` — country code selector + phone input with E.164 auto-formatting
- `FormField` — label + icon + error wrapping
- `FormCard` — card container
- `OAuthButton` — Google OAuth button (via lazy-loaded SocialLoginButtons)

1. User navigates to `/signup`
   - `PublicRoute` checks authentication status from `AuthContext`
   - If already authenticated → redirect to `/app`
   - If loading → show `<Loader fullScreen />`

2. **Form fields:**
   | Field | Component | Type | Required | Validation |
   |-------|-----------|------|----------|------------|
   | fullName | Input | text | Yes | Min 1 char, max 100 |
   | username | Input | text | Yes | 3-30 chars, `/^[a-zA-Z0-9_]{3,30}$/` |
   | email | Input | email | Yes | Valid email format |
   | phone + country | PhoneInput | tel + select | No | E.164 auto-formatted via `parsePhoneNumberFromString` |
   | password | PasswordInput | password | Yes | Min 8 chars, strength meter |
   | confirmPassword | PasswordInput | password | Yes | Must match password |
   | acceptTerms | checkbox | checkbox | Yes | Must be checked |

3. **UI features:**
   - Dark theme with glassmorphism panels
   - Animated inputs with framer-motion (`motion.form`, `motion.div`)
   - Inline validation errors per field with animated `FormError` component
   - Password visibility toggle per field
   - **Password strength bar** (5 levels: Weak → Very Strong) with live `calcStrength()`
   - **Password requirements checklist** (animated expand on password focus):
     - At least 8 characters
     - One uppercase letter
     - One lowercase letter
     - One number
     - One special character
   - Phone auto-formats to E.164 (`+916388065599`) — strips non-digits, prepends country code
   - Terms of Service and Privacy Policy links
   - Google OAuth button via `SocialLoginButtons` (lazy loaded)
   - Brand showcase with live AI conversation demo on desktop

4. **Client-side validation** (`validateForm` function at module level):
   ```javascript
   function validateForm(form) {
     const errs = {};
     if (!form.fullName.trim()) errs.fullName = 'Full name is required';
     if (!form.username.trim()) errs.username = 'Username is required';
     else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) errs.username = '...';
     if (!form.email.trim()) errs.email = 'Email is required';
     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
     if (form.phone && !/^\+[1-9]\d{6,14}$/.test(form.phone)) errs.phone = 'Invalid phone';
     if (!form.password) errs.password = 'Password is required';
     else if (form.password.length < 8) errs.password = 'At least 8 characters';
     if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
     if (!form.acceptTerms) errs.acceptTerms = 'You must accept the terms';
     return errs;
   }
   ```
   Note: This function is defined at module level to avoid recreation on every render.

### Focus Stability

The previous implementation defined `InputWrapper` inside the component function (`SignupPage.jsx:124`), causing React to **unmount + remount** `<input>` elements on every keystroke (new function reference = new component type). The fix:

- All form components imported from `components/ui/Form/` — stable module-level references with `React.memo`
- Event handlers use `useCallback([], [])` with functional `setState` — never recreated across renders
- Derived state uses `useMemo` — avoids recomputation without dependency churn
- No inline component definitions anywhere

**Result:** Cursor stays inside input field on every keystroke. No flickering. No remount.

5. Calls `signup(payload)` from `useAuth()`, where payload is:
   ```javascript
   { fullName, username, email, password, confirmPassword, countryCode, phone }
   ```
   Phone is already in E.164 format from PhoneInput.

### Phase 2: AuthContext.signup()

**File:** `client/src/contexts/AuthContext.jsx`

```javascript
const signup = async (username, email, password, extraFields) => {
  const payload = typeof username === 'object'
    ? username  // Object-style: signup({ fullName, username, email, ... })
    : { username, email, password, ...extraFields };  // Legacy positional

  const { data } = await api.post('/identity/auth/signup', payload);
  if (data.data?.accessToken) {
    localStorage.setItem('emotune_token', data.data.accessToken);
    setToken(data.data.accessToken);
  }
  setUser(data.data.user);
  setSession(data.data.session);
  return data;
};
```

Supports both positional and object-style calls for backward compatibility.

### Phase 3: API Request

`POST /api/identity/auth/signup` with body:
```json
{
  "fullName": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "P@ssw0rd!",
  "confirmPassword": "P@ssw0rd!",
  "countryCode": "US",
  "phone": "+14155552671"
}
```

### Phase 4: Express Middleware Pipeline

1. `signupRateLimiter` → 3 requests/minute per IP
2. `extractDeviceInfo` → reads `X-Device-Fingerprint` header
3. `validate(signupSchema)` → Joi validation

### Phase 5: Joi Schema Validation

**File:** `server/identity/validators/authValidators.js`

```javascript
signupSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).required(),
  username: Joi.string().pattern(/^[a-zA-Z0-9_]{3,30}$/).required(),
  email: Joi.string().email().required(),
  countryCode: Joi.string().valid(...COUNTRY_CODES).optional().allow(''),
  phone: Joi.string().optional().allow('').custom(validateE164Phone),
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  deviceName: Joi.string().max(100).optional(),
  timezone: Joi.string().optional(),
  language: Joi.string().valid('en','hi','es','fr','de','ja','zh','ar','pt','ru').optional(),
});
```

Phone validation uses `libphonenumber-js` `parsePhoneNumberFromString` → `format('E.164')`.

### Phase 6: Controller Logic

**File:** `server/identity/controllers/authController.js:13-60`

#### Step 6a: Extract fields
```javascript
const { username, email, password, fullName, phone, countryCode, deviceName, timezone, language } = req.body;
```

#### Step 6b: Call IdentityService.signup()
```javascript
const result = await IdentityService.signup({
  username, email, password, fullName, phone, countryCode,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  deviceFingerprint: req.headers['x-device-fingerprint'],
  deviceName, timezone, language,
});
```

#### Step 6c: Set refresh token cookie
```javascript
res.cookie('refreshToken', result.refreshToken, {
  httpOnly: true,
  secure: IDENTITY_CONFIG.security.secureCookies,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: IDENTITY_CONFIG.jwt.refreshToken.cookieMaxAge,  // 30 days
});
```

#### Step 6d: Success Response (201)
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { ... user.toPublicJSON() ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "session": { "id": "uuid", "deviceName": "..." }
  }
}
```

### Phase 7: IdentityService.signup()

**File:** `server/identity/services/identityService.js:15-90`

#### Step 7a: Duplicate Check
```javascript
const existingUser = await User.findOne({
  $or: [
    { email: email?.toLowerCase().trim() },
    { username: username?.trim() },
    ...(phone ? [{ phone }] : []),
  ],
});
```
- Checks email, username, AND phone for duplicates
- Specific error per duplicate: `DUPLICATE_EMAIL`, `DUPLICATE_USERNAME`, `DUPLICATE_PHONE`
- HTTP 409 Conflict

#### Step 7b: Password Strength Validation
```javascript
if (password) {
  const errors = passwordService.validatePasswordStrength(password);
  if (errors.length > 0) throw IdentityError(...);
}
```
- Server enforces: 8+ chars, uppercase, lowercase, number, special character
- HTTP 400 `WEAK_PASSWORD`

#### Step 7c: User Creation
```javascript
const userData = {
  username,
  email: email?.toLowerCase().trim(),
  password,
  ...(fullName && { fullName }),
  ...(phone && { phone }),
  ...(countryCode && { countryCode }),
  roles: ['user'],
};
const user = await User.create(userData);
```

**Database Operation:**
1. Mongoose creates User document
2. **Pre-save hook fires** (User.js):
   - `pre('save')` → `bcrypt.hash(password, 12)` → stores hash
   - Only fires when `password` is modified

#### Step 7d: Password History
```javascript
await passwordService.addPasswordHistory(user._id, user.password, 'user');
```
- Tracks last 5 password hashes
- Prevents password reuse on future changes

#### Step 7e: Create Session & Tokens
```javascript
const tokens = await this._createSessionAndTokens(user, { ip, userAgent, deviceFingerprint, deviceName });
```
- Generates unique token family (UUID)
- Creates access token (15 min) + refresh token (30 day)
- Creates session document in MongoDB
- Handles device fingerprinting (create/trust device)
- Generates final refresh token as JWT signed with session metadata

#### Step 7f: Record Login History
```javascript
await loginHistoryService.recordLoginAttempt(user._id, 'signup', {
  ip, userAgent, deviceFingerprint,
  method: 'email_password',  // or phone_password
  success: true,
  sessionId: tokens.session.sessionId,
});
```

#### Step 7g: Initialize AI Profile
```javascript
await this._initAIProfile(user._id, options);
```
- Creates `ConversationDNA` document for the new user
- Initializes with: primary language, timezone, active hour
- Starts with confidence 1.0, zero conversation stats
- **New in v2.0:** Called for both manual signup AND OAuth login

#### Step 7h: Audit Log
```javascript
await logEvent({
  action: AUDIT_ACTIONS.SIGNUP,
  userId: user._id, ip, userAgent,
  metadata: { method: 'email_password' },
});
```

### Phase 8: Client-Side After Signup

#### Step 8a: Token Storage
```javascript
localStorage.setItem('emotune_token', data.data.accessToken);
```

#### Step 8b: State Update → Socket Connection → Navigation
```javascript
setToken(data.data.accessToken);  // Triggers Socket.IO connect
setUser(data.data.user);          // Triggers ProtectedRoute render
toast.success('Account created! Welcome to Emotune');
navigate('/app');
```

---

## USER CREATED DATA (MongoDB Document)

```javascript
{
  "_id": ObjectId("..."),
  "fullName": "John Doe",           // NEW in v2.0
  "username": "johndoe",
  "email": "john@example.com",
  "password": "$2a$12$...",        // bcrypt hash
  "phone": "+14155552671",          // E.164 format, unique sparse index
  "countryCode": "US",
  "emailVerified": false,
  "roles": ["user"],
  "oauthProviders": [],
  "avatar": "",
  "status": "offline",
  "bio": "",
  "wallpaper": "",
  "personas": [],
  "settings": { ... default settings ... },
  "preferences": { ... extensive nested preferences ... },
  "lastActive": ISODate("..."),
  "deletedAt": null,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

---

## COMPARISON: v1.x vs v2.0 SIGNUP

| Aspect | v1.x | v2.0 |
|--------|------|------|
| Full name | Not collected | Required (`fullName`) |
| Phone | String field (no validation) | E.164 validated via libphonenumber-js |
| Country code | Not collected | ISO alpha-2 select |
| Duplicate check | email + username only | email + username + phone |
| Password requirements | Client-only checklist | Server-enforced (uppercase, lowercase, number, special) |
| AI profile init | Not created | ConversationDNA created on signup |
| Terms acceptance | Not required | Checkbox required |
| Rate limit | 10/min | 3/min |
| Error format | `{ error: "..." }` | `{ success: false, error, code, details }` |
| Session management | Simple token storage | Full session + device tracking |
| Audit logging | None | Full audit trail |
