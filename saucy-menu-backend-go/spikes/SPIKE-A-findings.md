# Spike A — better-auth Cookie Format

## Status: COMPLETE

## Cookie Name

Cookie name = `${cookiePrefix}.session_token`

Our config in `src/lib/auth.ts` sets `advanced.cookiePrefix: 'saucy-menu-auth'`, so:

**Cookie name: `saucy-menu-auth.session_token`**

The `secureCookiePrefix` (`__Secure-`) is only added when `useSecureCookies` is true,
which happens when:
- `advanced.useSecureCookies` is explicitly set, OR
- the `baseURL` starts with `https://`

In production, `BETTER_AUTH_URL` starts with `https://`, so the production cookie name
will be `__Secure-saucy-menu-auth.session_token`. In development (http), no prefix.

**Go must check both** — verify against the name the client sends, regardless of prefix.

## Cookie Attributes (from `lib/auth.ts` config)

```
HttpOnly: true
SameSite: none   (from advanced.defaultCookieAttributes)
Secure: true     (from advanced.defaultCookieAttributes)
Path: /
MaxAge: 604800   (7 days — default session expiry)
```

## Cookie Value Format

**Scheme:** `<session_token> + "." + base64(HMAC-SHA256(session_token, BETTER_AUTH_SECRET))`

Source: `node_modules/better-auth/dist/plugins/test-utils/cookie-builder.mjs`:
```js
async function signCookieValue(value, secret) {
    return `${value}.${await makeSignature(value, secret)}`;
}
```

`makeSignature` (from `dist/crypto/index.mjs`):
```js
const algorithm = { name: "HMAC", hash: "SHA-256" };
const makeSignature = async (value, secret) => {
    const key = await getCryptoKey(secret);  // importKey("raw", utf8(secret), HMAC/SHA256)
    const signature = await subtle.sign("HMAC", key, utf8(value));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
    //    ^^^^ standard Base64 (NOT url-safe), including trailing '=' padding
};
```

### Verified example

With `secret = "dev-better-auth-secret-change-me"` and `token = "test-session-token-12345"`:
```
signature:    nJhdM3+u0IT0u5SmHAZOdVuygrsmQDYleI4XF9aKRME=
cookie_value: test-session-token-12345.nJhdM3+u0IT0u5SmHAZOdVuygrsmQDYleI4XF9aKRME=
```

Verified with Node.js:
```js
const crypto = require('crypto');
const key = crypto.createHmac('sha256', Buffer.from(secret, 'utf8'));
key.update(Buffer.from(token, 'utf8'));
const sig = Buffer.from(key.digest()).toString('base64'); // === btoa(...)
```

## Session Lookup

After extracting the raw `session_token` from the cookie value, the server looks up:
```sql
SELECT * FROM session WHERE token = $1 AND expires_at > now()
```
Then joins to `users` for the user record. The custom `currency` field is added by
`getUserCurrencyAndLanguage(user.id)` and injected into the session response.

## get-session Response Shape

```json
{
  "session": {
    "id": "uuid",
    "userId": "uuid",
    "token": "string",
    "expiresAt": "ISO8601",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "ipAddress": "string|null",
    "userAgent": "string|null",
    "impersonatedBy": "string|null"
  },
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "image": "string|null",
    "emailVerified": bool,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "role": "user|admin",
    "banned": bool,
    "banReason": "string|null",
    "banExpires": "ISO8601|null",
    "restaurantId": "uuid|null",
    "languageId": "uuid|null",
    "setupComplete": bool,
    "currency": { "code": "GBP", "name": "British Pound", "symbol": "£" }
  }
}
```

## Go Implementation Plan

In `internal/auth/betterauth/cookie.go`:
- `SignToken(token, secret string) string` → `token + "." + base64.StdEncoding.EncodeToString(HMAC-SHA256(token, secret))`
- `VerifyToken(cookieValue, secret string) (token string, ok bool)` → split on last ".", verify sig, return token
- Cookie name lookup: check both `saucy-menu-auth.session_token` and `__Secure-saucy-menu-auth.session_token`
