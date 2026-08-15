# Emotune Authentication Architecture

## Runtime authority

The identity module is the single authentication authority:

```text
client access token in React memory
        ↓
Authorization: Bearer <access JWT>
        ↓
server/identity/middleware/authMiddleware.js
        ↓
JWT issuer/audience/type/expiry validation
        ↓
MongoDB Session validation
        ↓
User status and device validation
        ↓
req.user + req.userId compatibility context
        ↓
resource authorization / RBAC / controller
```

`/api/auth/*` remains as a compatibility mount, but delegates to the identity routes. Refresh tokens are accepted only from the HTTP-only `refreshToken` cookie.

## Signup and login

```text
Signup/Login UI
  ↓
/api/identity/auth/signup or /login
  ↓
rate limit + validation + device extraction
  ↓
IdentityService
  ↓
bcrypt password comparison/hash
  ↓
MongoDB User + Session + Device + audit records
  ↓
15-minute access JWT + rotating 30-day refresh JWT cookie
```

When `EMAIL_VERIFICATION_REQUIRED=true`, signup sends a verification email and login rejects unverified accounts.

## Refresh

```text
API returns 401
  ↓
Axios refresh mutex
  ↓
POST /api/identity/auth/refresh
  ↓
CSRF header + HTTP-only refresh cookie
  ↓
JWT and session-family validation
  ↓
atomic compare-and-rotate refresh hash/version
  ↓
new access token + new cookie
  ↓
retry original request
```

Concurrent browser requests share one refresh promise, preventing refresh races from invalidating a legitimate session.

## Session revocation

Sessions are stored in `server/identity/models/Session.js`. Logout, password changes, account deletion, admin blocking, refresh-token reuse, and device removal deactivate sessions. The socket registry disconnects sockets associated with revoked sessions/users.

## Socket authentication

```text
Socket.IO auth.token
  ↓
jwtService.verifyAccessToken()
  ↓
sessionService.validateSession()
  ↓
user/device/status checks
  ↓
register socket by user and session
  ↓
join only authorized chat/decision/ghost rooms
```

Room IDs and event payload IDs are treated as untrusted input and are checked against MongoDB membership/ownership.

## Authorization

RBAC permission constants are defined in `server/identity/rbac/permissions.js` and are used consistently by admin routes and middleware. Resource authorization is enforced through `server/identity/middleware/resourceAuthorization.js` and controller-level ownership checks.

## OAuth

OAuth state is signed server-side, bound to provider, includes an expiration and nonce, and is validated at callback time. Google ID tokens are validated through Google's token-info endpoint for audience, subject, and nonce.

## Production configuration

Required production controls include:

- Strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- MongoDB and Redis connectivity
- SMTP configuration when email verification is required
- HTTPS so secure cookies are transmitted
- `CSRF_ENABLED=true`
- Google OAuth client credentials only when Google login is enabled

