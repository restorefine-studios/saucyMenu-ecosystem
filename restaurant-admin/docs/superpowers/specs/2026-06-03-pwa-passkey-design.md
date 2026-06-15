# PWA + Passkey (Face ID) Login — Design Spec
Date: 2026-06-03  
App: `restaurant-admin` (Vite + React SPA)  
Backend: `saucy-menu-backend-go` (Go + chi + sqlc)

---

## Overview

Convert the restaurant-admin SPA into an installable PWA that feels like a native mobile app on iPhone/Android. Add passkey (WebAuthn platform authenticator) login — Face ID on iPhone, fingerprint/Face ID on Android, Touch ID on Mac — stored automatically in iCloud Keychain / Google Password Manager. Email/password login remains unchanged alongside it.

---

## 1. PWA Setup

**Package:** `vite-plugin-pwa` (Workbox-backed, zero-config service worker).

**Manifest (`manifest.webmanifest`):**
- `name`: "Saucy Menu"
- `short_name`: "Saucy Menu"
- `theme_color`: `#f97316` (orange-500)
- `background_color`: `#ffffff`
- `display`: `standalone`
- `start_url`: `/admin/dashboard`
- `scope`: `/`
- Icons: 192×192 and 512×512 PNG (maskable + any purpose)

**Service worker strategy:** Cache-first for the app shell (HTML, JS, CSS, fonts, static assets). Network-first for all API calls — if offline, API requests fail with a toast "No internet connection", the app does not attempt to cache API responses.

**iOS meta tags** added to `index.html`:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Saucy Menu" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

**Install prompt:** A one-time dismissible banner component (`<InstallPrompt />`) shown after the user's first successful login. Uses the `beforeinstallprompt` event (Android/desktop Chrome). On iOS, shows a manual instruction sheet ("Tap Share → Add to Home Screen"). Banner state stored in `localStorage` (never show again once dismissed).

---

## 2. Passkey Architecture

### How it works
WebAuthn with `authenticatorAttachment: "platform"` and `residentKey: "required"`. The private key is generated in the device's Secure Enclave and **never leaves the device**. The OS stores it in:
- iPhone/iPad/Mac → **iCloud Keychain** (syncs across Apple devices)
- Android → **Google Password Manager** (syncs across Android devices)
- Samsung → **Samsung Pass**

The Go backend stores only the **public key credential** (credential ID + COSE-encoded public key + sign count). Face ID / Touch ID unlocks the private key locally to sign a server challenge; the server verifies the signature.

### DB Schema (new table)
```sql
CREATE TABLE passkey_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,       -- base64url-encoded
  public_key    BYTEA NOT NULL,             -- COSE-encoded public key
  sign_count    BIGINT NOT NULL DEFAULT 0,  -- replay attack counter
  aaguid        TEXT NOT NULL,              -- authenticator type identifier
  device_name   TEXT NOT NULL DEFAULT '',   -- user-facing label (e.g. "iPhone 15")
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON passkey_credentials(user_id);
```

### Go library
`github.com/go-webauthn/webauthn` — handles CBOR parsing, challenge generation, assertion verification, sign count validation.

### WebAuthn config (Go)
```go
wconfig := &webauthn.Config{
    RPDisplayName: "Saucy Menu",
    RPID:          "yourdomain.com",           // MUST be set to the actual deployed domain (e.g. admin.saucymenu.com) — cannot be localhost in production
    RPOrigins:     []string{"https://yourdomain.com"},
    AuthenticatorSelection: protocol.AuthenticatorSelection{
        AuthenticatorAttachment: protocol.Platform,
        ResidentKey:             protocol.ResidentKeyRequirementRequired,
        UserVerification:        protocol.VerificationRequired,
    },
}
```

---

## 3. Backend Endpoints

All under `/auth/passkey/`, protected by the existing session middleware (register endpoints require an active session; login endpoints are public).

| Method | Path | Auth required | Purpose |
|--------|------|---------------|---------|
| POST | `/auth/passkey/register/begin` | Yes | Returns `PublicKeyCredentialCreationOptions` JSON, stores challenge in session |
| POST | `/auth/passkey/register/finish` | Yes | Verifies credential, inserts into `passkey_credentials` |
| POST | `/auth/passkey/login/begin` | No | Returns `PublicKeyCredentialRequestOptions` JSON, stores challenge in session |
| POST | `/auth/passkey/login/finish` | No | Verifies assertion, updates sign count, issues session cookie |
| GET | `/auth/passkey/status` | Yes | Returns `{ registered: bool, credentials: [{id, deviceName, createdAt}] }` |
| DELETE | `/auth/passkey/:credentialId` | Yes | Removes a specific passkey credential for the authenticated user |

Challenge storage: server-side session (same session store as the existing auth system), TTL 5 minutes.

---

## 4. Frontend Auth Flow

### Registration (one-time per device)
1. User completes email/password login → navigated to dashboard
2. `usePasskeySetup` hook checks: has passkey been registered on this device? (checks `localStorage` flag + calls `GET /auth/passkey/status`)
3. If not registered: `<PasskeyRegistrationDrawer />` (vaul bottom sheet) appears
4. User taps "Enable Face ID" → calls `POST /auth/passkey/register/begin`, then `navigator.credentials.create()`, then `POST /auth/passkey/register/finish`
5. On success: set `localStorage` flag `passkeyRegistered: true`, dismiss drawer
6. User taps "Not now" → set `localStorage` flag `passkeyPromptDismissed: true`, do not prompt again (unless reset from Settings)

### Session lock (1-minute timeout)
- On app mount and on `visibilitychange` (foreground event): check `sessionStorage.passkeyLockedAt`
- On `visibilitychange` (backgrounding) and `pagehide`: write current timestamp to `sessionStorage.passkeyLockedAt`
- On foreground: if `passkeyRegistered === true` AND elapsed < 60 000ms → show `<BiometricLockScreen />`
- On foreground: if elapsed ≥ 60 000ms OR no valid session → redirect to `/auth` (full login)

### Passkey login (from full login page)
- Login page detects `passkeyRegistered === true` → renders "Use Face ID" button above the email/password form
- Button tap → `POST /auth/passkey/login/begin`, `navigator.credentials.get()`, `POST /auth/passkey/login/finish`
- On success → navigate to dashboard

---

## 5. UI Components

### `<BiometricLockScreen />`
Full-screen white overlay (z-index above everything). Auto-triggers `navigator.credentials.get()` on mount.

Layout (centred column):
- Saucy Menu logo (top)
- User avatar + "Welcome back, [Name]" 
- Fingerprint/Face ID icon button (large, orange, tappable)
- "Verifying…" spinner state during challenge
- "Sign in differently" text link → clears lock state, goes to `/auth`

### `<PasskeyRegistrationDrawer />`
Vaul bottom sheet, non-dismissible by swipe (important: user must explicitly choose).
- Face ID icon (top, centred)
- Headline: "Sign in faster with Face ID"
- Body: "Use Face ID or Touch ID to unlock the app instantly. Your credentials are stored securely in your device's keychain."
- Primary button: "Enable Face ID" (orange, full width)
- Secondary: "Not now" (grey text, below)

### Login page additions
- Conditional render: if `passkeyRegistered === true`
  - Orange button: "Use Face ID / Passkey" with fingerprint icon
  - Grey divider: "or sign in with email"
- Existing form below, unchanged

### Settings → Security section
- Toggle row: "Face ID / Passkey"
- If enabled: list of registered devices (device_name + created_at)
- Delete button per device → calls `DELETE /auth/passkey/:credentialId`
- "Add passkey" button → re-triggers registration flow

---

## 6. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| User cancels Face ID prompt | Toast: "Face ID cancelled" — stay on lock screen |
| Face ID fails (not recognised) | Native OS handles retries; on final failure, toast + "Sign in differently" link |
| No passkey support (old browser) | "Use Face ID" button is not rendered (`PublicKeyCredential` feature-detected) |
| Network error during challenge | Toast: "Could not connect. Try again." |
| Sign count mismatch (replay attack) | Backend returns 401, frontend shows "Security error — please sign in again", clears passkey flag |

---

## 7. Out of Scope

- Cross-device passkey sync management (handled transparently by OS)
- Roaming authenticators (YubiKey etc.)
- Passkey login on the super-admin or end-user-app frontends
- Push notifications / background sync (future PWA features)
