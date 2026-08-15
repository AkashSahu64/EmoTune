# AUTH API DOCUMENTATION

## Emotune v2.0.0

Base URL: `/api`

---

## AUTHENTICATION ROUTES

---

### POST /api/auth/signup
Create a new user account.

**Rate Limit:** 10 requests per minute per IP

**Request Body:**
```json
{
  "username": "string (3-30 chars, required)",
  "email": "string (valid email format, required)",
  "password": "string (8-128 chars, required)"
}
```

**Success Response (201):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "johndoe@example.com",
    "avatar": "",
    "phone": "",
    "wallpaper": "",
    "status": "offline",
    "bio": "",
    "personas": [],
    "settings": {
      "autoTheme": true,
      "currentTheme": "dark",
      "emotionTheme": true,
      "soundEnabled": true,
      "silentMode": false,
      "ghostModeDefault": false
    },
    "preferences": { ... extensive preferences object ... },
    "lastActive": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Cookies Set:**
```
token=<accessToken>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "\"username\" is required" }` | Missing or invalid field |
| 400 | `{ "error": "\"password\" length must be at least 8 characters long" }` | Password too short |
| 409 | `{ "error": "User with this email or username already exists" }` | Duplicate email or username |
| 500 | `{ "error": "Signup failed" }` | Server error |

**Validation (Joi schema):**
- `username`: string, min 3, max 30, required
- `email`: valid email, required
- `password`: string, min 8, max 128, required

**Backend Logic:** `server/controllers/authController.js:6-45`

---

### POST /api/auth/login
Authenticate with email and password.

**Rate Limit:** 10 requests per minute per IP

**Request Body:**
```json
{
  "email": "string (valid email, required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "user": { ... same user object as signup ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Cookies Set:**
```
token=<accessToken>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "\"email\" must be a valid email" }` | Invalid email format |
| 401 | `{ "error": "Invalid email or password" }` | Wrong email OR wrong password (same message) |
| 429 | `{ "error": "Too many auth attempts. Try again later." }` | Rate limited |
| 500 | `{ "error": "Login failed" }` | Server error |

**Backend Logic:** `server/controllers/authController.js:47-91`

---

### POST /api/auth/logout
Invalidate the current session.

**Authentication Required:** Yes (Bearer token or cookie)

**Request Body:** None

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
```
token=; Max-Age=0
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Not authorized, no token provided" }` | Missing token |
| 401 | `{ "error": "Not authorized, invalid token" }` | Invalid/expired token |
| 500 | `{ "error": "Logout failed" }` | Server error |

**Side Effects:**
- User status set to `offline`
- `user.refreshToken` set to `null`
- `refreshTokens` array NOT modified
- Socket.IO disconnect handled client-side

**Backend Logic:** `server/controllers/authController.js:93-109`

---

### POST /api/auth/refresh-token
Exchange a refresh token for new access and refresh tokens.

**Authentication Required:** No

**Rate Limit:** Inherits general API rate limit (100/min)

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Refresh token required" }` | Missing refreshToken field |
| 401 | `{ "error": "Invalid refresh token" }` | Token expired, wrong secret, or user mismatch |
| 500 | `{ "error": "Token refresh error" }` | Server error |

**Logic:**
1. `verifyRefreshToken(refreshToken)` decodes using `JWT_REFRESH_SECRET`
2. `User.findById(decoded.userId).select('+refreshToken')`
3. Compares `user.refreshToken !== refreshToken` (string equality)
4. Generates new access + refresh tokens
5. Updates `user.refreshToken` with new refresh token
6. **Note:** Does NOT update `refreshTokens` array (no history of refresh)

**Backend Logic:** `server/controllers/authController.js:111-136`

---

### GET /api/auth/me
Get the current authenticated user's profile.

**Authentication Required:** Yes

**Request Parameters:** None

**Success Response (200):**
```json
{
  "user": { ... full user object (toPublicJSON) ... }
}
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Not authorized, no token provided" }` | Missing token |
| 404 | `{ "error": "User not found" }` | User deleted or invalid ID in token |
| 500 | `{ "error": "Failed to fetch profile" }` | Server error |

**Backend Logic:** `server/controllers/authController.js:138-147`

---

### PATCH /api/auth/profile
Update the current user's profile.

**Authentication Required:** Yes

**Request Body (all optional):**
```json
{
  "username": "string (3-30 chars)",
  "avatar": "string",
  "bio": "string (max 200)",
  "settings": {
    "autoTheme": true,
    "currentTheme": "dark",
    "emotionTheme": true,
    "soundEnabled": true,
    "silentMode": false,
    "ghostModeDefault": false
  }
}
```

**Success Response (200):**
```json
{
  "user": { ... updated user object ... }
}
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Username already taken" }` | Duplicate username |
| 401 | `{ "error": "Not authorized" }` | Missing/invalid token |
| 404 | `{ "error": "User not found" }` | User not found |
| 500 | `{ "error": "Profile update failed" }` | Server error |

**Backend Logic:** `server/controllers/authController.js:168-183`

---

## USER MANAGEMENT ROUTES

---

### GET /api/users/me
Alternative endpoint for getting current user.

**Authentication Required:** Yes

**Backend Logic:** `server/controllers/userController.js:6-15`

---

### PUT /api/users/profile
Update profile with additional fields.

**Authentication Required:** Yes

**Request Body (all optional):**
```json
{
  "username": "string",
  "bio": "string",
  "phone": "string",
  "avatar": "string",
  "wallpaper": "string",
  "displayName": "string",
  "about": "string"
}
```

**Backend Logic:** `server/controllers/userController.js:17-53`

---

### PUT /api/users/preferences
Update user preferences.

**Authentication Required:** Yes

**Request Body:** Partial preferences object (see validators.js `preferencesSchema`)

Categories: `account`, `appearance`, `notifications`, `privacy`, `chat`, `ai`, `ghostMode`, `media`, `accessibility`, `advanced`

**Backend Logic:** `server/controllers/userController.js:55-75`

---

### PUT /api/users/password
Change the current user's password.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (8-128 chars, required)"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Current password is incorrect" }` | Wrong current password |
| 400 | `{ "error": "Validation error" }` | Invalid new password |
| 404 | `{ "error": "User not found" }` | User not found |
| 500 | `{ "error": "Server error" }` | Internal error |

**Backend Logic:** `server/controllers/userController.js:77-96`

---

### DELETE /api/users/account
Permanently delete the current user's account.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "message": "Account deleted permanently"
}
```

**What happens to data:**
- `deletedAt` set to current timestamp
- `username` changed to `deleted_<user_id>`
- `email` changed to `deleted_<user_id>@emotune.app`
- `password` replaced with hash of `'deleted_account'`
- `status` set to `offline`
- All personal data cleared: avatar, bio, phone, wallpaper, personas, settings, preferences
- `refreshToken` set to null
- **Chat messages are NOT deleted** - they remain with the original sender ID

**Backend Logic:** `server/controllers/userController.js:98-129`

---

### GET /api/users/sessions
List all active sessions (refresh tokens).

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "sessions": [
    {
      "id": 0,
      "userAgent": "Mozilla/5.0...",
      "ip": "::1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

**Backend Logic:** `server/controllers/userController.js:131-149`

---

### POST /api/users/logout-other
Terminate all other sessions except the current one.

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "message": "Other sessions terminated"
}
```

**Logic:** Clears `refreshTokens` array and re-adds only the current `refreshToken`.

**Backend Logic:** `server/controllers/userController.js:151-165`

---

## DEVELOPMENT ROUTES

---

### POST /api/auth/seed
Create a test user for development.

**Rate Limit:** 10 requests per minute

**Authentication Required:** No

**Test User Credentials:**
```json
{
  "username": "testuser",
  "email": "test@emotune.app",
  "password": "Test1234!"
}
```

**Success Response (200):**
```json
{
  "message": "Test user ready",
  "credentials": {
    "username": "testuser",
    "email": "test@emotune.app",
    "password": "Test1234!"
  }
}
```

**Note:** Only works in development mode (`NODE_ENV=development`).

**Backend Logic:** `server/controllers/authController.js:149-161`

---

### GET /api/auth/test-credentials
Get test user credentials without creating the user.

**Authentication Required:** No

**Success Response (200):**
```json
{
  "credentials": {
    "username": "testuser",
    "email": "test@emotune.app",
    "password": "Test1234!"
  }
}
```

**Backend Logic:** `server/controllers/authController.js:163-166`

---

## ERROR CODES REFERENCE

| Code | Meaning | Where |
|------|---------|-------|
| `TOKEN_EXPIRED` | Access token has expired | `authMiddleware.js:30` |
| `ValidationError` | Mongoose validation failed | `errorHandler.js:11` |
| `CastError` | Invalid MongoDB ObjectId | `errorHandler.js:16` |
| `11000` | MongoDB duplicate key | `errorHandler.js:20` |

---

## RESPONSE FORMAT

All API responses follow a consistent format:

**Success:** `{ data }` (direct JSON response)

**Error (all endpoints):**
```json
{
  "error": "Human-readable error message",
  "details": ["array of detailed messages"]  // Only for validation errors
}
```
