# FRONTEND AUTH ARCHITECTURE

## Emotune v2.0.0 — Client-Side

---

## OVERVIEW

The frontend authentication system is a React context-based architecture with Axios interceptors, Socket.IO integration, and route guards. It communicates exclusively with the Identity Module API endpoints (`/identity/auth/*`).

The entire form system uses a reusable **Enterprise Form Component Library** (`client/src/components/ui/Form/`) that is shared across all auth pages and designed to be reused by Profile, Settings, Admin Panel, and other features.

---

## ENTERPRISE FORM COMPONENT LIBRARY

All form components are:
- Defined at **module level** (never inside a component function) — prevents focus loss from inline component redefinition
- Wrapped with `React.memo` — prevents unnecessary re-renders
- Use `forwardRef` — supports imperative focus management
- Fully **accessible** — ARIA attributes, keyboard navigation, screen reader support

### Component Tree

```
components/ui/Form/
├── index.js               # Barrel exports
├── Input.jsx              # Base text/email/tel input
├── PasswordInput.jsx      # Password with visibility + strength meter + requirements
├── PhoneInput.jsx         # Country selector + phone with E.164 formatting
├── CountrySelector.jsx    # Country code dropdown (50+ countries)
├── FormField.jsx          # Label + icon + input + error wrapper
├── FormLabel.jsx          # Uppercase styled label with required indicator
├── FormError.jsx          # Animated error message with AnimatePresence
├── FormCard.jsx           # Card container wrapper
└── OAuthButton.jsx        # Google OAuth button with SVG icon
```

### Input

**File:** `Input.jsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | string | `'text'` | Input type (text, email, tel, etc.) |
| `value` | string | — | Controlled value |
| `onChange` | function | — | Change handler |
| `onFocus` | function | — | Focus handler |
| `onBlur` | function | — | Blur handler |
| `state` | string | `'default'` | Visual state: `default`, `focused`, `error` |
| `autoComplete` | string | — | Autocomplete attribute |
| `inputMode` | string | — | Mobile keyboard mode |
| `ariaRequired` | boolean | — | ARIA required attribute |
| `ariaInvalid` | boolean | — | ARIA invalid attribute |
| `className` | string | `''` | Additional CSS classes |

**States visual mapping:**
```javascript
const INPUT_STATES = {
  error:   'border-[#EF4444] text-[#EF4444] ...',
  focused: 'border-[#3B82F6] text-[#F8FAFC] ...',
  default: 'border-[#252F45] text-[#F8FAFC] ...',
};
```

### PasswordInput

**File:** `PasswordInput.jsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showStrength` | boolean | `false` | Enable strength bar (Weak / Fair / Good / Strong / Very Strong) |
| `showRequirements` | boolean | `false` | Show inline requirement checklist |

**Requirements checklist (5 criteria):**
| Criteria | Test | Icon |
|----------|------|------|
| At least 8 characters | `val.length >= 8` | ✅ checkmark |
| One uppercase letter | `/[A-Z]/.test(val)` | ✅ checkmark |
| One lowercase letter | `/[a-z]/.test(val)` | ✅ checkmark |
| One number | `/\d/.test(val)` | ✅ checkmark |
| One special character | `/[!@#$%^&*(),.?":{}|<>_-]/.test(val)` | ✅ checkmark |

**Strength bar colors:**
| Score | Label | Color |
|-------|-------|-------|
| 0-1 | Weak | `#EF4444` (red) |
| 2 | Fair | `#F59E0B` (yellow) |
| 3 | Good | `#3B82F6` (blue) |
| 4 | Strong | `#22C55E` (green) |
| 5 | Very Strong | `#22C55E` (green, full width) |

### PhoneInput

**File:** `PhoneInput.jsx`

| Prop | Type | Description |
|------|------|-------------|
| `value` | string | Current phone value (E.164 format) |
| `countryCode` | string | ISO 3166-1 alpha-2 country code |
| `onPhoneChange` | function | Called with formatted E.164 string |
| `onCountryChange` | function | Called with select change event |
| `state` | string | Phone input visual state |
| `countryState` | string | Country selector visual state |

**E.164 formatting logic:**
```javascript
function formatPhoneInput(value, dialCode) {
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith(dialCode.replace('+', ''))) {
    digits = digits.slice(dialCode.length - 1);
  }
  const full = dialCode + digits;
  if (!digits) return '';
  return full;
}
```

- Strips non-digit characters
- Removes duplicate country code if user typed it
- Prepends dial code from selected country
- Returns `+916388065599` for India, `+14155552671` for US
- Supports paste (cleans pasted text)

### CountrySelector

**File:** `CountrySelector.jsx`

- 50+ countries with dial codes
- Exports `COUNTRIES`, `getDialCode(code)`, `getCountryByDial(dial)`
- Styled select with globe icon

### FormField

**File:** `FormField.jsx`

| Prop | Type | Description |
|------|------|-------------|
| `field` | string | Field name (used for error key and label htmlFor) |
| `label` | string | Uppercase label text |
| `required` | boolean | Shows red asterisk |
| `icon` | element | Left-side icon |
| `children` | node | Input component |
| `error` | string | Error message (or falsy) |
| `className` | string | Additional CSS |

Renders: `FormLabel` → `relative div` with icon + children → `FormError`

### FormError

**File:** `FormError.jsx`

- Uses `AnimatePresence` for smooth enter/exit
- Animated with framer-motion: `opacity: 0→1`, `y: -4→0`
- Has `role="alert"` for screen readers
- `key` prop set to `name` for stable identity

### OAuthButton

**File:** `OAuthButton.jsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClick` | function | — | Click handler |
| `loading` | boolean | `false` | Shows spinner |
| `disabled` | boolean | `false` | Disables button |
| `label` | string | `'Continue with Google'` | Button text |
| `provider` | string | `'google'` | Provider identifier |

Uses inline SVG for Google logo with official brand colors.

---

## KEY DESIGN PATTERNS FOR FOCUS STABILITY

### ✦ Root Cause of Focus Loss

The previous code had `InputWrapper` defined **inside** the component function:

```javascript
// ❌ BAD — causes focus loss on every keystroke
export default function SignupPage() {
  const InputWrapper = ({ field, label, children }) => ( ... )
  // ...
  return <InputWrapper>...</InputWrapper>
}
```

**Re-render chain:** User types → `setForm()` → React re-renders → new `InputWrapper` function → React sees different component type → **unmounts old + mounts new** `<input>` → focus lost.

### ✦ Solution: Stable Component References

1. **All components at module level** — `memo()` wraps them, stable reference across renders
2. **Event handlers use `useCallback([], [])`** — zero dependencies for handlers that use functional state updates
3. **Functional `setState`** — `setForm(prev => ...)` and `setErrors(prev => ...)` don't need dependencies
4. **Derived state with `useMemo`** — `activeMode`, `currentMode`, `inputState` are memoized
5. **No inline component definitions** — never create a component inside another component

### ✦ Handler Pattern

```javascript
// ✅ GOOD — zero dependencies, always stable
const updateField = useCallback((field) => (e) => {
  const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  setForm((prev) => ({ ...prev, [field]: value }));
  setErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });
}, []);
```

The outer function `updateField('fullName')` is called at render time to create the inner handler. The inner handler closes over `field` and uses functional `setState` to avoid stale closures.

---

## AUTH CONTEXT

**File:** `client/src/contexts/AuthContext.jsx`

### State
| Variable | Type | Persistence | Description |
|----------|------|-------------|-------------|
| `user` | Object / null | Refresh via API | Current user profile (from `toPublicJSON()`) |
| `loading` | boolean | No | Initial auth check in progress |
| `token` | string / null | `localStorage` | JWT access token |
| `session` | Object / null | No | Current session metadata |

### Methods

**login(credential, password?)**
- Object-style: `login({ email, password, rememberMe })`
- Legacy positional: `login(email, password)`
- POSTs to `/identity/auth/login`
- Stores `accessToken` in localStorage

**signup(username, email, password, extraFields?)**
- Object-style: `signup({ fullName, username, email, password, ... })`
- Legacy positional: `signup(username, email, password, extraFields)`
- POSTs to `/identity/auth/signup`

**logout()** — POSTs to `/logout`, clears localStorage and state.

### Initialization Flow
1. `AuthProvider` mounts → reads `emotune_token` from localStorage
2. If token exists → `GET /identity/auth/me` via `fetchUser()`
3. On 401 → `POST /identity/auth/refresh` with cookie → retry with new token
4. On refresh failure → clear everything

---

## AXIOS INTERCEPTOR

**File:** `client/src/services/api.js`

Attaches `Authorization: Bearer <token>` from localStorage to every request.

---

## ROUTE GUARDS

| Guard | Behavior |
|-------|----------|
| `PublicRoute` | If loading → Loader. If user → redirect to `/app`. Else → render children. |
| `ProtectedRoute` | If loading → Loader. If no user → redirect to `/login`. Else → render children. |

Routes:
| Path | Guard | Component |
|------|-------|-----------|
| `/` | Public | LandingPage |
| `/login` | Public | LoginPage |
| `/signup` | Public | SignupPage |
| `/auth/:provider/callback` | None | OAuthCallback |
| `/app` | Protected | Dashboard |
| `/app/memory` | Protected | MemorySearchPage |

---

## PAGES

### LoginPage

**File:** `client/src/pages/LoginPage.jsx`

| Feature | Detail |
|---------|--------|
| Identifier auto-detect | `user@example.com` → email, `+15551234567` → phone, `johndoe` → username |
| Mode indicators | 3 badges (Email / Username / Phone) auto-highlighted |
| Password | Visibility toggle (FiEye/FiEyeOff) |
| Remember me | Checkbox — extends refresh cookie to 30 days |
| Forgot password | Link to `/forgot-password` |
| Submit button | Gradient blue, loading spinner, framer-motion animation |
| Error handling | Inline per-field errors, toast on API failure |
| Social login | Google OAuth via SocialLoginButtons (lazy loaded) |

#### State Management
```javascript
const [identifier, setIdentifier] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [rememberMe, setRememberMe] = useState(false);
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState({});
const [focusedField, setFocusedField] = useState(null);
```

#### Auto-Detect Logic
```javascript
function detectMode(value) {
  if (value.includes('@')) return 'email';
  if (/^\+/.test(value.trim())) return 'phone';
  return 'username';
}
```
Re-computed on every identifier change via `useMemo`.

### SignupPage

**File:** `client/src/pages/SignupPage.jsx`

| Feature | Detail |
|---------|--------|
| Fields | fullName, username, email, PhoneInput (country + phone), password, confirmPassword, terms |
| Required | fullName, username, email, password, confirmPassword, acceptTerms |
| Optional | phone |
| Password strength | Live bar + 5-criteria checklist (animated expand on focus) |
| Phone auto-format | E.164 format with country code prepended |
| Terms consent | Checkbox with ToS and Privacy Policy links |
| Social login | Google OAuth via SocialLoginButtons (lazy loaded) |

#### State Management
```javascript
const [form, setForm] = useState(INITIAL_FORM);
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState({});
const [focusedField, setFocusedField] = useState(null);
```

#### Validation
```javascript
function validateForm(form) {
  const errs = {};
  if (!form.fullName.trim()) errs.fullName = 'Full name is required';
  if (!form.username.trim()) errs.username = 'Username is required';
  else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) errs.username = '...';
  if (!form.email.trim()) errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
  if (form.phone && !/^\+[1-9]\d{6,14}$/.test(form.phone)) errs.phone = 'Invalid phone number';
  if (!form.password) errs.password = 'Password is required';
  else if (form.password.length < 8) errs.password = 'At least 8 characters';
  if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
  if (!form.acceptTerms) errs.acceptTerms = 'You must accept the terms';
  return errs;
}
```

### OAuthCallback

**File:** `client/src/pages/OAuthCallback.jsx`

- Route: `/auth/:provider/callback`
- Reads `code` and `state` from URL search params
- **State validation:** compares `sessionStorage` state against returned state (prevents CSRF)
- Posts `{ provider, code }` to `POST /identity/auth/oauth/callback`
- Stores access token in localStorage
- Redirects to `/app` or shows error with redirect to `/login`

#### Status States
| State | Message | Visual |
|-------|---------|--------|
| Processing | `"Processing..."` | Blue spinner |
| Verifying | `"Verifying credentials..."` | Spinner with text |
| Signing in | `"Signing you in..."` | Final 500ms delay |
| Error | Auth error message | Red X icon + redirect countdown |

---

## COMPONENTS

### SocialLoginButtons

**File:** `client/src/components/auth/SocialLoginButtons.jsx`

- Dynamically fetches `GET /identity/auth/oauth/providers` on mount
- Only shows Google (other providers like Apple/Microsoft are disabled by default)
- Generates cryptographically random state via `crypto.randomUUID()`
- Stores `{ provider: 'google', state }` in `sessionStorage`
- Redirects browser to provider's authorization URL
- Proper cleanup in `useEffect` return (avoids state update after unmount)
- Returns `null` if no providers enabled

### BrandShowcase

**File:** `client/src/components/auth/BrandShowcase.jsx`

Desktop-only (`hidden lg:flex`): Logo → Tagline → Live AI Preview (3 demo conversations, auto-rotating chat bubbles) → Emotion Waves (animated bars) → Emoji Suggestions (cycling) → Feature Pills (6 features) → Live Stats (animated counter) → Trust indicator.

### PasswordStrength (legacy)

**File:** `client/src/components/auth/PasswordStrength.jsx`

Deprecated. Use `PasswordInput` with `showStrength` prop instead.

### TrustBadges

Security trust indicators displayed on auth pages.

### AuthFooter

Footer with legal links displayed on auth pages.

---

## DEPENDENCY GRAPH

```
main.jsx
└── App.jsx
    ├── HelmetProvider
    ├── AuthProvider (AuthContext.jsx)
    │   └── api.js (Axios instance)
    ├── ThemeProvider
    ├── SocketProvider
    │   └── useAuth() → AuthContext.token
    └── AppRouter.jsx
        ├── PublicRoute
        │   ├── LoginPage
        │   │   ├── useAuth() → login()
        │   │   ├── Form components (Input, FormField, FormCard, OAuthButton)
        │   │   ├── BrandShowcase
        │   │   ├── SocialLoginButtons (lazy)
        │   │   ├── TrustBadges
        │   │   └── AuthFooter
        │   └── SignupPage
        │       ├── useAuth() → signup()
        │       ├── Form components (Input, PasswordInput, PhoneInput, FormField, FormCard, OAuthButton)
        │       ├── BrandShowcase
        │       ├── SocialLoginButtons (lazy)
        │       ├── TrustBadges
        │       └── AuthFooter
        ├── ProtectedRoute → Dashboard
        └── OAuthCallback
            └── api.post('/oauth/callback')
```
