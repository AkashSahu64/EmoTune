# OAUTH ARCHITECTURE

## Emotune v2.0.0 — Identity Module

---

## OVERVIEW

The OAuth system provides third-party authentication via Google, Apple, and Microsoft. Only Google is enabled by default (configurable via environment variables); Apple and Microsoft are disabled out-of-the-box and require explicit configuration.

**Design principles:**
- **Disabled by default** — each provider requires `clientId` + `clientSecret` env vars
- **Dynamic discovery** — client fetches `GET /oauth/providers` to know which are enabled
- **Standard authorization code flow** — OAuth 2.0 with PKCE-ready state parameter
- **Account linking** — OAuth can be linked/unlinked to existing accounts
- **Automatic provisioning** — new OAuth users get a full account + AI profile

---

## SUPPORTED PROVIDERS

| Provider | Class | Default | Env Variable |
|----------|-------|---------|-------------|
| Google | `GoogleOAuthProvider` | Enabled (if configured) | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` |
| Apple | `AppleOAuthProvider` | Disabled | `APPLE_OAUTH_CLIENT_ID`, `APPLE_OAUTH_CLIENT_SECRET` |
| Microsoft | `MicrosoftOAuthProvider` | Disabled | `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` |

**GitHub was removed in v2.0** — no longer supported.

---

## BACKEND ARCHITECTURE

### Provider Base Class

**File:** `server/identity/oauth/index.js`

All providers extend `BaseOAuthProvider`:

```javascript
class BaseOAuthProvider {
  constructor(config) {
    this.config = config;       // From identityConfig.js
    this.name = 'base';
  }

  isEnabled()                   // config.enabled && config.clientId
  getAuthorizationUrl(state)    // Returns null if disabled
  async exchangeCode(code)      // POST to token endpoint
  async getUserProfile(token)   // GET userinfo endpoint
  getClientId()                 // Returns config.clientId
}
```

### Provider Registry

```javascript
const getOAuthProvider = (provider) => {
  const providers = {
    google: GoogleOAuthProvider,
    apple: AppleOAuthProvider,
    microsoft: MicrosoftOAuthProvider,
  };
  const ProviderClass = providers[provider];
  if (!ProviderClass) return null;
  return new ProviderClass();
};

const getEnabledOAuthProviders = () => {
  return ['google', 'apple', 'microsoft']
    .map(p => ({ provider: p, instance: getOAuthProvider(p) }))
    .filter(({ instance }) => instance && instance.isEnabled())
    .map(({ provider, instance }) => ({
      provider,
      clientId: instance.getClientId(),
      authorizationUrl: instance.getAuthorizationUrl('state_placeholder')
        .replace('&state=state_placeholder', ''),
    }));
};
```

### GoogleOAuthProvider

| Property | Value |
|----------|-------|
| Authorization endpoint | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token endpoint | `https://oauth2.googleapis.com/token` |
| Userinfo endpoint | `https://www.googleapis.com/oauth2/v2/userinfo` |
| Scopes | `openid email profile` |
| Extra params | `access_type: offline, prompt: consent` |
| Redirect URI | `{CLIENT_URL}/auth/google/callback` |

Profile response format:
```javascript
{ id, email, name, avatar: picture, verified: verified_email }
```

### AppleOAuthProvider

| Property | Value |
|----------|-------|
| Authorization endpoint | `https://appleid.apple.com/auth/authorize` |
| Token endpoint | `https://appleid.apple.com/auth/token` |
| Response mode | `form_post` |
| Scopes | `name email` |
| Redirect URI | `{CLIENT_URL}/auth/apple/callback` |

Profile: decoded from id_token via `jsonwebtoken.decode()`.

### MicrosoftOAuthProvider

| Property | Value |
|----------|-------|
| Authorization endpoint | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| Token endpoint | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| Userinfo endpoint | `https://graph.microsoft.com/v1.0/me` |
| Scopes | `openid email profile User.Read` |
| Redirect URI | `{CLIENT_URL}/auth/microsoft/callback` |

Profile: mapped from Microsoft Graph response.

---

## CLIENT-SIDE ARCHITECTURE

### SocialLoginButtons

**File:** `client/src/components/auth/SocialLoginButtons.jsx`

- Fetches enabled providers from `GET /identity/auth/oauth/providers` on mount
- Only renders the Google button (since Apple/Microsoft are disabled by default)
- Generates a random state parameter with `crypto.randomUUID()`
- Stores `{ provider: 'google', state }` in `sessionStorage`
- Redirects browser to provider's authorization URL with state parameter
- Shows loading spinner during redirect
- Shows error state if OAuth check fails
- Implements cleanup via `useEffect` return (prevents state updates after unmount)

### OAuthCallback

**File:** `client/src/pages/OAuthCallback.jsx`

- URL pattern: `/auth/:provider/callback` (handled by React Router)
- Reads `code` and `state` from URL search params
- **State validation:** compares `sessionStorage` state against returned state
  - Prevents CSRF attacks on OAuth callback
  - Clears sessionStorage after successful validation
- Posts `{ provider, code }` to `POST /identity/auth/oauth/callback`
- Stores access token in localStorage on success
- Redirects to `/app` (with 500ms delay for UX)
- Shows animated status: `Processing...` → `Verifying credentials...` → `Signing you in...`
- Shows error state with redirect back to `/login` after 4 seconds

---

## OAUTH FLOW

### Step-by-step

```
  Browser                          Client                         Identity API                 MongoDB
    │                                │                                │                        │
    │  1. Visit /login               │                                │                        │
    │───────────────────────────────>│                                │                        │
    │                                │  2. SocialLoginButtons         │                        │
    │                                │     GET /oauth/providers      │                        │
    │                                │───────────────────────────────>│                        │
    │                                │<───────────────────────────────│                        │
    │                                │     { providers: [{            │                        │
    │                                │       provider: 'google',      │                        │
    │                                │       clientId: '...',         │                        │
    │                                │       authorizationUrl: '...'  │                        │
    │                                │     }]}                        │                        │
    │                                │                                │                        │
    │  3. Click "Continue with       │                                │                        │
    │     Google"                    │                                │                        │
    │───────────────────────────────>│                                │                        │
    │                                │  4. Generate random state      │                        │
    │                                │     sessionStorage.setItem(    │                        │
    │                                │       'oauth_state', state)   │                        │
    │                                │     window.location.href =     │                        │
    │                                │       authorizationUrl + state │                        │
    │                                │                                │                        │
    │  5. Redirect to Google         │                                │                        │
    │<───────────────────────────────│                                │                        │
    │                                │                                │                        │
    │  ┌─────────────────────┐       │                                │                        │
    │  │  Google OAuth Page   │      │                                │                        │
    │  │  User consents       │      │                                │                        │
    │  └──────────┬──────────┘       │                                │                        │
    │             │                  │                                │                        │
    │  6. Redirect to               │                                │                        │
    │     /auth/google/callback     │                                │                        │
    │     ?code=AUTH_CODE           │                                │                        │
    │     &state=STATE              │                                │                        │
    │───────────────────────────────>│                                │                        │
    │                                │  7. OAuthCallback.jsx          │                        │
    │                                │     Validate state vs storage  │                        │
    │                                │     Clear sessionStorage       │                        │
    │                                │                                │                        │
    │                                │  8. POST /oauth/callback       │                        │
    │                                │     { provider: 'google',      │                        │
    │                                │       code: AUTH_CODE }       │                        │
    │                                │───────────────────────────────>│                        │
    │                                │                                │                        │
    │                                │                                │  9. Exchange code      │
    │                                │                                │     POST to Google     │
    │                                │                                │     Token endpoint     │
    │                                │                                │     → { access_token,  │
    │                                │                                │       id_token }       │
    │                                │                                │                        │
    │                                │                                │  10. GET userinfo      │
    │                                │                                │      → { id, email,    │
    │                                │                                │        name, picture,  │
    │                                │                                │        verified_email }│
    │                                │                                │                        │
    │                                │                                │  11. Find/Create user  │
    │                                │                                │     User.findOne({     │
    │                                │                                │       email })         │
    │                                │                                │──────────────────────> │
    │                                │                                │<────────────────────── │
    │                                │                                │                        │
    │                                │                                │  12. If new: User.     │
    │                                │                                │      create({ email,   │
    │                                │                                │      username, display │
    │                                │                                │      Name, avatar,     │
    │                                │                                │      emailVerified,    │
    │                                │                                │      oauthProviders } │
    │                                │                                │──────────────────────> │
    │                                │                                │                        │
    │                                │                                │  13. Create session    │
    │                                │                                │      + tokens          │
    │                                │                                │                        │
    │                                │                                │  14. Init AI profile   │
    │                                │                                │      (ConversationDNA) │
    │                                │                                │──────────────────────> │
    │                                │                                │                        │
    │                                │                                │  15. Audit log         │
    │                                │                                │      (OAUTH_LOGIN)     │
    │                                │                                │                        │
    │                                │  ← 200 { user,                │                        │
    │                                │       accessToken,            │                        │
    │                                │       session }               │                        │
    │                                │  Set-Cookie: refreshToken     │                        │
    │                                │<───────────────────────────────│                        │
    │                                │                                │                        │
    │                                │  16. localStorage.setItem()   │                        │
    │                                │  17. window.location.href     │                        │
    │                                │      = '/app'                 │                        │
    │                                │                                │                        │
    │  18. Redirect to /app         │                                │                        │
    │<───────────────────────────────│                                │                        │
```

### Account Linking

Existing users can link OAuth providers via:
- `POST /oauth/link` — requires authentication + OAuth code
- `DELETE /oauth/unlink/:provider` — requires authentication

**Constraints:**
- Cannot link an OAuth account already in use by another user
- Cannot unlink the last authentication method (if user has no password set)

---

## API ENDPOINTS

### GET /oauth/providers

Returns list of enabled OAuth providers:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "google",
        "clientId": "123456789-xxxxx.apps.googleusercontent.com",
        "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
      }
    ]
  }
}
```

### POST /oauth/callback

Exchanges authorization code for JWT tokens. Requires `state` validation on client side.

**Request:**
```json
{ "provider": "google", "code": "AUTH_CODE" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "OAuth login successful",
  "data": {
    "user": { ... toPublicJSON() ... },
    "accessToken": "eyJ...",
    "session": { "id": "uuid" }
  }
}
```

**Errors:**
- 400 — Provider not available / disabled
- 400 — Token exchange failed (invalid code)
- 500 — Profile fetch or user creation failed

### POST /oauth/link

Link OAuth provider to existing authenticated account.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "provider": "google", "code": "AUTH_CODE" }
```

**Response (200):**
```json
{ "success": true, "message": "OAuth provider \"google\" linked successfully" }
```

### DELETE /oauth/unlink/:provider

Unlink OAuth provider from account.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "success": true, "message": "OAuth provider \"google\" unlinked successfully" }
```

**Errors:**
- 400 — Cannot unlink the only auth method (no password set)

---

## CONFIGURATION

### Environment Variables (.env)

```bash
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Apple OAuth (disabled if not set)
APPLE_OAUTH_CLIENT_ID=
APPLE_OAUTH_CLIENT_SECRET=

# Microsoft OAuth (disabled if not set)
MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=

# Client URL (used for OAuth redirect URIs)
CLIENT_URL=http://localhost:5173
```

### Redirect URIs

Each provider redirects to the client app after user consent:

| Provider | Redirect URI Pattern |
|----------|---------------------|
| Google | `{CLIENT_URL}/auth/google/callback` |
| Apple | `{CLIENT_URL}/auth/apple/callback` |
| Microsoft | `{CLIENT_URL}/auth/microsoft/callback` |

These must be registered in each provider's developer console.

---

## SECURITY CONSIDERATIONS

1. **State parameter** prevents CSRF attacks on OAuth callback
2. **Random UUID** state generated via `crypto.randomUUID()` per login attempt
3. **SessionStorage** (not localStorage) for state — cleared on navigation
4. **Code exchange** is server-side — access token never exposed to client
5. **Email uniqueness** — OAuth users are matched by email; duplicate emails are linked (not replaced)
6. **Token expiry** — OAuth-created accounts use same JWT expiry as normal accounts
7. **Audit trail** — all OAuth events logged with provider name
8. **Configurable** — providers disabled by default; require intentional env var setup
