# PWA + Passkey (Face ID) Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the restaurant-admin Vite SPA installable as a PWA and add WebAuthn passkey (Face ID / Touch ID) login alongside the existing email/password form, with a 1-minute session lock on app resume.

**Architecture:** Go backend gets a new `passkey_credentials` DB table and 6 endpoints under `/auth/passkey/` using `go-webauthn/webauthn`. The frontend uses `@simplewebauthn/browser` for the WebAuthn ceremony, a `visibilitychange` hook for the 1-minute lock, and three new components (lock screen, registration drawer, install prompt). `vite-plugin-pwa` adds the service worker and manifest.

**Tech Stack:** Go `github.com/go-webauthn/webauthn`, `@simplewebauthn/browser`, `vite-plugin-pwa`, existing `vaul` drawer, existing `verification` DB table for challenge storage (TTL 5 min).

---

## File Map

### Go backend (`saucy-menu-backend-go/`)

| Action | File |
|--------|------|
| Modify | `internal/db/schema.sql` — add `passkey_credentials` table |
| Create | `internal/db/queries/passkey.sql` — 6 CRUD queries |
| Regenerate | `internal/db/sqlc/*.go` — run `sqlc generate` |
| Modify | `internal/config/config.go` — add `WebAuthnRPID`, `WebAuthnOrigin` |
| Create | `internal/handlers/auth/passkey.go` — all 6 endpoints + `requireAdmin` middleware |
| Modify | `internal/handlers/auth/auth.go` — register passkey routes in `Routes()` |

### Frontend (`restaurant-admin/`)

| Action | File |
|--------|------|
| Modify | `vite.config.ts` — add `vite-plugin-pwa` |
| Modify | `index.html` — add iOS PWA meta tags |
| Create | `public/icons/icon-192.png`, `public/icons/icon-512.png` |
| Modify | `src/apiRoutes.ts` — add 6 passkey API route constants |
| Create | `src/lib/passkey.ts` — fetch wrappers for passkey API calls |
| Create | `src/hooks/usePasskey.ts` — registration + login mutations |
| Create | `src/hooks/useAppLock.ts` — 1-minute session lock logic |
| Create | `src/components/BiometricLockScreen.tsx` |
| Create | `src/components/PasskeyRegistrationDrawer.tsx` |
| Create | `src/components/InstallPrompt.tsx` |
| Modify | `src/pages/auth/login/index.tsx` — add "Use Face ID" button |
| Create | `src/pages/admin/settings/components/security.tsx` — passkey management |
| Modify | `src/pages/admin/settings/index.tsx` — add Security tab |
| Modify | `src/App.tsx` — wrap with `AppLockProvider` + `InstallPrompt` |

---

## Task 1: DB migration — `passkey_credentials` table

**Files:**
- Modify: `saucy-menu-backend-go/internal/db/schema.sql`
- Create: `saucy-menu-backend-go/internal/db/queries/passkey.sql`

- [ ] **Step 1: Append the table to schema.sql**

At the end of `internal/db/schema.sql`, add:

```sql
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key    BYTEA NOT NULL,
  sign_count    BIGINT NOT NULL DEFAULT 0,
  aaguid        TEXT NOT NULL DEFAULT '',
  device_name   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS passkey_credentials_user_id_idx ON passkey_credentials(user_id);
```

- [ ] **Step 2: Create `internal/db/queries/passkey.sql`**

```sql
-- name: InsertPasskeyCredential :one
INSERT INTO passkey_credentials (user_id, credential_id, public_key, sign_count, aaguid, device_name)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetPasskeyCredentialByCredID :one
SELECT * FROM passkey_credentials WHERE credential_id = $1;

-- name: ListPasskeyCredentials :many
SELECT * FROM passkey_credentials WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdatePasskeySignCount :exec
UPDATE passkey_credentials SET sign_count = $1 WHERE credential_id = $2;

-- name: DeletePasskeyCredential :exec
DELETE FROM passkey_credentials WHERE credential_id = $1 AND user_id = $2;

-- name: CountPasskeyCredentials :one
SELECT COUNT(*) FROM passkey_credentials WHERE user_id = $1;
```

- [ ] **Step 3: Apply the migration to your DB**

Connect to your Supabase DB (or local) and run the `CREATE TABLE` SQL from step 1 manually via the Supabase dashboard or `psql`.

- [ ] **Step 4: Regenerate sqlc types**

```bash
cd saucy-menu-backend-go
sqlc generate
```

Expected: new file `internal/db/sqlc/passkey.sql.go` with `InsertPasskeyCredential`, `GetPasskeyCredentialByCredID`, `ListPasskeyCredentials`, `UpdatePasskeySignCount`, `DeletePasskeyCredential`, `CountPasskeyCredentials` functions.

- [ ] **Step 5: Verify it compiles**

```bash
go build ./...
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add internal/db/schema.sql internal/db/queries/passkey.sql internal/db/sqlc/
git commit -m "feat: add passkey_credentials table and sqlc queries"
```

---

## Task 2: Backend config — WebAuthn env vars

**Files:**
- Modify: `saucy-menu-backend-go/internal/config/config.go`

- [ ] **Step 1: Add two fields to the Config struct**

In `internal/config/config.go`, add to the `Config` struct:

```go
WebAuthnRPID    string `env:"WEBAUTHN_RPID" envDefault:"localhost"`
WebAuthnOrigin  string `env:"WEBAUTHN_ORIGIN" envDefault:"http://localhost:5173"`
```

- [ ] **Step 2: Add env vars to your `.env` file in the Go backend**

```
WEBAUTHN_RPID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173
```

For production these will be:
```
WEBAUTHN_RPID=dashboard.saucymenu.com
WEBAUTHN_ORIGIN=https://dashboard.saucymenu.com
```

When testing via ngrok, set `WEBAUTHN_RPID` to the ngrok subdomain (e.g. `9b11-xxxx.ngrok-free.app`) and `WEBAUTHN_ORIGIN` to `https://9b11-xxxx.ngrok-free.app`.

- [ ] **Step 3: Verify it compiles**

```bash
go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add internal/config/config.go
git commit -m "feat: add WebAuthn RPID and origin config vars"
```

---

## Task 3: Install go-webauthn library

**Files:** `saucy-menu-backend-go/go.mod`, `go.sum`

- [ ] **Step 1: Install the library**

```bash
cd saucy-menu-backend-go
go get github.com/go-webauthn/webauthn@latest
```

- [ ] **Step 2: Verify**

```bash
go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: add go-webauthn/webauthn dependency"
```

---

## Task 4: Backend — passkey handler (`passkey.go`)

**Files:**
- Create: `saucy-menu-backend-go/internal/handlers/auth/passkey.go`

This file lives in `package auth` (same as `auth.go`) so it can use `cookieToken`, `createSession`, and `setSessionCookie` from `auth.go` directly.

- [ ] **Step 1: Create `internal/handlers/auth/passkey.go`**

```go
package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

// passkeyCtxKey scopes the authenticated user in the passkey middleware.
type passkeyCtxKey struct{}

// ─── WebAuthn instance ────────────────────────────────────────────────────────

func (h *Handler) newWebAuthn() (*webauthn.WebAuthn, error) {
	return webauthn.New(&webauthn.Config{
		RPDisplayName: "Saucy Menu",
		RPID:          h.cfg.WebAuthnRPID,
		RPOrigins:     []string{h.cfg.WebAuthnOrigin},
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			AuthenticatorAttachment: protocol.Platform,
			ResidentKey:             protocol.ResidentKeyRequirementRequired,
			UserVerification:        protocol.VerificationRequired,
		},
	})
}

// ─── WebAuthn User adapter ────────────────────────────────────────────────────

type passkeyUser struct {
	id          []byte
	name        string
	displayName string
	credentials []webauthn.Credential
}

func (u *passkeyUser) WebAuthnID() []byte                         { return u.id }
func (u *passkeyUser) WebAuthnName() string                       { return u.name }
func (u *passkeyUser) WebAuthnDisplayName() string                { return u.displayName }
func (u *passkeyUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }
func (u *passkeyUser) WebAuthnIcon() string                       { return "" }

// buildPasskeyUser converts a sqlc user row + their stored credentials into a passkeyUser.
func buildPasskeyUser(user sqlc.FindUserByIDRow, rows []sqlc.PasskeyCredential) *passkeyUser {
	creds := make([]webauthn.Credential, 0, len(rows))
	for _, row := range rows {
		var pubKey protocol.COSEKey
		// public_key column stores the COSE-encoded bytes from go-webauthn
		creds = append(creds, webauthn.Credential{
			ID:        []byte(row.CredentialID),
			PublicKey: pubKey,
			Authenticator: webauthn.Authenticator{
				SignCount: uint32(row.SignCount),
			},
		})
	}
	idBytes, _ := user.ID.Value()
	idStr := ""
	if idBytes != nil {
		idStr = idBytes.(string)
	}
	return &passkeyUser{
		id:          []byte(idStr),
		name:        user.Email,
		displayName: user.Name,
		credentials: creds,
	}
}

// ─── requireAdmin middleware ───────────────────────────────────────────────────

// requireAdmin validates the caller's admin session (role == "user" in DB) and
// stores the user row in context under passkeyCtxKey{}.
func (h *Handler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := cookieToken(r, h.cfg.BetterAuthSecret)
		if token == "" {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		session, err := h.q.GetSessionByToken(r.Context(), token)
		if err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		user, err := h.q.FindUserByID(r.Context(), session.UserID)
		if err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		if user.Role == nil || *user.Role != "user" {
			httpx.WriteError(w, http.StatusForbidden, "Forbidden")
			return
		}
		ctx := context.WithValue(r.Context(), passkeyCtxKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ─── Challenge storage helpers (reuse verification table) ────────────────────

func (h *Handler) storeChallenge(ctx context.Context, identifier string, sessionData *webauthn.SessionData) error {
	b, err := json.Marshal(sessionData)
	if err != nil {
		return err
	}
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier) // clear any stale entry
	return h.q.CreateVerification(ctx, sqlc.CreateVerificationParams{
		Identifier: identifier,
		Value:      string(b),
		ExpiresAt:  pgtype.Timestamp{Time: time.Now().Add(5 * time.Minute), Valid: true},
	})
}

func (h *Handler) loadChallenge(ctx context.Context, identifier string) (*webauthn.SessionData, error) {
	row, err := h.q.GetVerificationByIdentifier(ctx, identifier)
	if err != nil {
		return nil, err
	}
	var sd webauthn.SessionData
	if err := json.Unmarshal([]byte(row.Value), &sd); err != nil {
		return nil, err
	}
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
	return &sd, nil
}

// ─── Registration endpoints ───────────────────────────────────────────────────

// POST /auth/passkey/register/begin (requires admin session)
func (h *Handler) passkeyRegisterBegin(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)

	wa, err := h.newWebAuthn()
	if err != nil {
		log.Error().Err(err).Msg("webauthn init")
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	rows, _ := h.q.ListPasskeyCredentials(r.Context(), user.ID)
	pu := buildPasskeyUser(user, rows)

	options, sessionData, err := wa.BeginRegistration(pu,
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			AuthenticatorAttachment: protocol.Platform,
			ResidentKey:             protocol.ResidentKeyRequirementRequired,
			UserVerification:        protocol.VerificationRequired,
		}),
	)
	if err != nil {
		log.Error().Err(err).Msg("begin registration")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to begin registration")
		return
	}

	idVal, _ := user.ID.Value()
	identifier := "passkey:register:" + idVal.(string)
	if err := h.storeChallenge(r.Context(), identifier, sessionData); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to store challenge")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, options)
}

// POST /auth/passkey/register/finish (requires admin session)
func (h *Handler) passkeyRegisterFinish(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)

	wa, err := h.newWebAuthn()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	idVal, _ := user.ID.Value()
	identifier := "passkey:register:" + idVal.(string)
	sessionData, err := h.loadChallenge(r.Context(), identifier)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "No pending registration or challenge expired")
		return
	}

	rows, _ := h.q.ListPasskeyCredentials(r.Context(), user.ID)
	pu := buildPasskeyUser(user, rows)

	credential, err := wa.FinishRegistration(pu, *sessionData, r)
	if err != nil {
		log.Error().Err(err).Msg("finish registration")
		httpx.WriteError(w, http.StatusBadRequest, "Registration verification failed")
		return
	}

	credID := base64.RawURLEncoding.EncodeToString(credential.ID)
	aaguid := base64.RawURLEncoding.EncodeToString(credential.Authenticator.AAGUID[:])

	// Derive a human-readable device name from user-agent
	ua := r.UserAgent()
	deviceName := "Unknown device"
	switch {
	case len(ua) == 0:
		// keep default
	case containsAny(ua, "iPhone", "iPad"):
		deviceName = "iPhone / iPad"
	case containsAny(ua, "Android"):
		deviceName = "Android device"
	case containsAny(ua, "Macintosh", "Mac OS"):
		deviceName = "Mac"
	case containsAny(ua, "Windows"):
		deviceName = "Windows device"
	}

	_, err = h.q.InsertPasskeyCredential(r.Context(), sqlc.InsertPasskeyCredentialParams{
		UserID:       user.ID,
		CredentialID: credID,
		PublicKey:    credential.PublicKey,
		SignCount:    int64(credential.Authenticator.SignCount),
		Aaguid:       aaguid,
		DeviceName:   deviceName,
	})
	if err != nil {
		log.Error().Err(err).Msg("insert passkey credential")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to save credential")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"registered": true, "deviceName": deviceName})
}

// ─── Login endpoints ──────────────────────────────────────────────────────────

// POST /auth/passkey/login/begin (public)
func (h *Handler) passkeyLoginBegin(w http.ResponseWriter, r *http.Request) {
	wa, err := h.newWebAuthn()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	options, sessionData, err := wa.BeginDiscoverableLogin(
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		log.Error().Err(err).Msg("begin discoverable login")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to begin login")
		return
	}

	// Generate a random challengeID to key the session data
	rawID := make([]byte, 16)
	if _, err := rand.Read(rawID); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to generate challenge ID")
		return
	}
	challengeID := base64.RawURLEncoding.EncodeToString(rawID)
	identifier := "passkey:login:" + challengeID

	if err := h.storeChallenge(r.Context(), identifier, sessionData); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to store challenge")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"challengeId": challengeID,
		"options":     options,
	})
}

// POST /auth/passkey/login/finish (public)
func (h *Handler) passkeyLoginFinish(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChallengeID string          `json:"challengeId"`
		Credential  json.RawMessage `json:"credential"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identifier := "passkey:login:" + req.ChallengeID
	sessionData, err := h.loadChallenge(r.Context(), identifier)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Challenge not found or expired")
		return
	}

	wa, err := h.newWebAuthn()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	// Reconstruct the HTTP request body so FinishDiscoverableLogin can parse it
	parsedResponse, err := protocol.ParseCredentialRequestResponseBody(jsonReader(req.Credential))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Failed to parse credential")
		return
	}

	credential, err := wa.ValidateDiscoverableLogin(
		func(rawID, userHandle []byte) (webauthn.User, error) {
			credIDStr := base64.RawURLEncoding.EncodeToString(rawID)
			row, err := h.q.GetPasskeyCredentialByCredID(r.Context(), credIDStr)
			if err != nil {
				return nil, err
			}
			user, err := h.q.FindUserByID(r.Context(), row.UserID)
			if err != nil {
				return nil, err
			}
			allRows, _ := h.q.ListPasskeyCredentials(r.Context(), user.ID)
			return buildPasskeyUser(user, allRows), nil
		},
		*sessionData,
		parsedResponse,
	)
	if err != nil {
		log.Error().Err(err).Msg("validate discoverable login")
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication failed")
		return
	}

	// Update sign count (replay protection)
	credIDStr := base64.RawURLEncoding.EncodeToString(credential.ID)
	_ = h.q.UpdatePasskeySignCount(r.Context(), sqlc.UpdatePasskeySignCountParams{
		SignCount:    int64(credential.Authenticator.SignCount),
		CredentialID: credIDStr,
	})

	// Look up user to issue session
	row, err := h.q.GetPasskeyCredentialByCredID(r.Context(), credIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to resolve user")
		return
	}
	user, err := h.q.FindUserByID(r.Context(), row.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "User not found")
		return
	}

	session, err := h.createSession(w, r, user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"session": sessionResp{
			ID:        session.ID.String(),
			UserID:    session.UserID.String(),
			Token:     session.Token,
			ExpiresAt: session.ExpiresAt.Time.Format(time.RFC3339),
			CreatedAt: session.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt: session.UpdatedAt.Time.Format(time.RFC3339),
		},
		"user": userResp{
			ID:            user.ID.String(),
			Email:         user.Email,
			Name:          user.Name,
			EmailVerified: user.EmailVerified,
			CreatedAt:     user.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:     user.UpdatedAt.Time.Format(time.RFC3339),
			Role:          user.Role,
			Banned:        user.Banned,
		},
	})
}

// ─── Status + delete endpoints ────────────────────────────────────────────────

// GET /auth/passkey/status (requires admin session)
func (h *Handler) passkeyStatus(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)
	rows, err := h.q.ListPasskeyCredentials(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to list credentials")
		return
	}
	type credInfo struct {
		ID         string `json:"id"`
		DeviceName string `json:"deviceName"`
		CreatedAt  string `json:"createdAt"`
	}
	infos := make([]credInfo, 0, len(rows))
	for _, row := range rows {
		infos = append(infos, credInfo{
			ID:         row.CredentialID,
			DeviceName: row.DeviceName,
			CreatedAt:  row.CreatedAt.Time.Format(time.RFC3339),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"registered":  len(rows) > 0,
		"credentials": infos,
	})
}

// DELETE /auth/passkey/{credentialId} (requires admin session)
func (h *Handler) passkeyDelete(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)
	credID := chi.URLParam(r, "credentialId")
	if credID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Missing credentialId")
		return
	}
	err := h.q.DeletePasskeyCredential(r.Context(), sqlc.DeletePasskeyCredentialParams{
		CredentialID: credID,
		UserID:       user.ID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete credential")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func containsAny(s string, substrings ...string) bool {
	for _, sub := range substrings {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

// jsonReader wraps a json.RawMessage as an io.Reader for protocol parsing.
type jsonReaderType struct{ data []byte; pos int }
func (jr *jsonReaderType) Read(p []byte) (n int, err error) {
	if jr.pos >= len(jr.data) { return 0, io.EOF }
	n = copy(p, jr.data[jr.pos:])
	jr.pos += n
	return
}
func jsonReader(raw json.RawMessage) *jsonReaderType { return &jsonReaderType{data: raw} }
```

> **Note:** You'll need `"io"` in the import block for `io.EOF`. Add it alongside the other imports.

- [ ] **Step 2: Build to check for compile errors**

```bash
cd saucy-menu-backend-go
go build ./...
```

Fix any import/type errors. Common issues:
- `sqlc.PasskeyCredential` — the actual generated struct name depends on sqlc; check `internal/db/sqlc/passkey.sql.go` for the exact type name.
- `sessionResp` and `userResp` — these are defined in `auth.go` in the same package, so they're directly accessible.
- `buildPasskeyUser` credential reconstruction — the `PublicKey` field on `webauthn.Credential` is `[]byte` (raw COSE bytes), matching what we store. Remove the `protocol.COSEKey` intermediate that won't compile; just assign `credential.PublicKey: row.PublicKey`.

- [ ] **Step 3: Commit**

```bash
git add internal/handlers/auth/passkey.go
git commit -m "feat: passkey handler with register/login/status/delete endpoints"
```

---

## Task 5: Wire passkey routes into `auth.go`

**Files:**
- Modify: `saucy-menu-backend-go/internal/handlers/auth/auth.go`

- [ ] **Step 1: Add passkey routes to `Routes()`**

In `auth.go`, inside `func (h *Handler) Routes() http.Handler`, add after the existing `r.Group(func(r chi.Router) { r.Use(h.requireSuperAdmin) ... })` block:

```go
// Passkey routes — registration requires an active admin session
r.Group(func(r chi.Router) {
    r.Use(h.requireAdmin)
    r.Post("/passkey/register/begin", h.passkeyRegisterBegin)
    r.Post("/passkey/register/finish", h.passkeyRegisterFinish)
    r.Get("/passkey/status", h.passkeyStatus)
    r.Delete("/passkey/{credentialId}", h.passkeyDelete)
})
// Passkey login is public (user not authenticated yet)
r.Post("/passkey/login/begin", h.passkeyLoginBegin)
r.Post("/passkey/login/finish", h.passkeyLoginFinish)
```

- [ ] **Step 2: Build and run**

```bash
go build ./...
go run ./cmd/...   # or however you start the server
```

- [ ] **Step 3: Smoke-test login/begin**

```bash
curl -X POST http://localhost:8080/auth/passkey/login/begin
```

Expected response:
```json
{"success":true,"data":{"challengeId":"<uuid>","options":{...}}}
```

- [ ] **Step 4: Commit**

```bash
git add internal/handlers/auth/auth.go
git commit -m "feat: mount passkey routes in auth router"
```

---

## Task 6: Frontend — install dependencies

**Files:** `restaurant-admin/package.json`

- [ ] **Step 1: Install vite-plugin-pwa and SimpleWebAuthn browser lib**

```bash
cd restaurant-admin
pnpm add -D vite-plugin-pwa
pnpm add @simplewebauthn/browser
```

- [ ] **Step 2: Verify the installs**

```bash
pnpm ls vite-plugin-pwa @simplewebauthn/browser
```

Expected: both packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add vite-plugin-pwa and @simplewebauthn/browser"
```

---

## Task 7: Frontend — PWA setup (vite config + manifest + icons + meta tags)

**Files:**
- Modify: `restaurant-admin/vite.config.ts`
- Modify: `restaurant-admin/index.html`
- Create: `restaurant-admin/public/icons/icon-192.png` (placeholder)
- Create: `restaurant-admin/public/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Update `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Saucy Menu",
        short_name: "Saucy Menu",
        description: "Restaurant management dashboard",
        theme_color: "#f97316",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/admin/dashboard",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/auth") || url.pathname.startsWith("/admin"),
            handler: "NetworkOnly", // API calls never cached
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    allowedHosts: ["all"],
  },
});
```

- [ ] **Step 2: Add iOS PWA meta tags to `index.html`**

Inside `<head>`, before `</head>`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Saucy Menu" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="theme-color" content="#f97316" />
```

- [ ] **Step 3: Add placeholder PWA icons**

Copy `public/saucymenu.svg` to create two PNG placeholders, or export the existing SVG logo as 192×192 and 512×512 PNGs and save them to `public/icons/icon-192.png` and `public/icons/icon-512.png`.

If you don't have a tool to convert, use any online SVG-to-PNG converter. The icons just need to exist as PNG files for the manifest to work.

- [ ] **Step 4: Test the PWA setup**

```bash
pnpm build && pnpm preview
```

Open Chrome DevTools → Application → Manifest. Verify the manifest loads without errors and icons appear.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts index.html public/icons/
git commit -m "feat: PWA manifest, service worker, iOS meta tags"
```

---

## Task 8: Frontend — passkey API routes + client lib

**Files:**
- Modify: `restaurant-admin/src/apiRoutes.ts`
- Create: `restaurant-admin/src/lib/passkey.ts`

- [ ] **Step 1: Add passkey routes to `apiRoutes.ts`**

Add to the exported object:

```ts
passkeyRegisterBegin: "auth/passkey/register/begin",
passkeyRegisterFinish: "auth/passkey/register/finish",
passkeyLoginBegin: "auth/passkey/login/begin",
passkeyLoginFinish: "auth/passkey/login/finish",
passkeyStatus: "auth/passkey/status",
passkeyDelete: (id: string) => `auth/passkey/${id}`,
```

- [ ] **Step 2: Create `src/lib/passkey.ts`**

```ts
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

const BASE = import.meta.env.VITE_APP_SERVER_URL as string;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "Request failed");
  return body.data as T;
}

export { browserSupportsWebAuthn };

export async function registerPasskey(): Promise<{ deviceName: string }> {
  const beginData = await apiFetch<{ Response: unknown }>(
    "auth/passkey/register/begin",
    { method: "POST" }
  );
  const attResp = await startRegistration({ optionsJSON: beginData as never });
  return apiFetch("auth/passkey/register/finish", {
    method: "POST",
    body: JSON.stringify(attResp),
  });
}

export async function loginWithPasskey(): Promise<void> {
  const beginData = await apiFetch<{ challengeId: string; options: unknown }>(
    "auth/passkey/login/begin",
    { method: "POST" }
  );
  const assertResp = await startAuthentication({
    optionsJSON: beginData.options as never,
  });
  await apiFetch("auth/passkey/login/finish", {
    method: "POST",
    body: JSON.stringify({ challengeId: beginData.challengeId, credential: assertResp }),
  });
}

export async function fetchPasskeyStatus(): Promise<{
  registered: boolean;
  credentials: { id: string; deviceName: string; createdAt: string }[];
}> {
  return apiFetch("auth/passkey/status");
}

export async function deletePasskey(credentialId: string): Promise<void> {
  await apiFetch(`auth/passkey/${encodeURIComponent(credentialId)}`, { method: "DELETE" });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/apiRoutes.ts src/lib/passkey.ts
git commit -m "feat: passkey API client lib and route constants"
```

---

## Task 9: Frontend — `usePasskey` and `useAppLock` hooks

**Files:**
- Create: `restaurant-admin/src/hooks/usePasskey.ts`
- Create: `restaurant-admin/src/hooks/useAppLock.ts`

- [ ] **Step 1: Create `src/hooks/usePasskey.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  browserSupportsWebAuthn,
  deletePasskey,
  fetchPasskeyStatus,
  loginWithPasskey,
  registerPasskey,
} from "@/lib/passkey";

const PASSKEY_REGISTERED_KEY = "passkeyRegistered";
const PASSKEY_DISMISSED_KEY = "passkeyPromptDismissed";

export function usePasskeySupported() {
  return browserSupportsWebAuthn();
}

export function passkeyIsRegistered() {
  return localStorage.getItem(PASSKEY_REGISTERED_KEY) === "true";
}

export function passkeyPromptDismissed() {
  return localStorage.getItem(PASSKEY_DISMISSED_KEY) === "true";
}

export function usePasskeyStatus() {
  return useQuery({
    queryKey: ["passkey-status"],
    queryFn: fetchPasskeyStatus,
    staleTime: 60_000,
  });
}

export function useRegisterPasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerPasskey,
    onSuccess: (data) => {
      localStorage.setItem(PASSKEY_REGISTERED_KEY, "true");
      qc.invalidateQueries({ queryKey: ["passkey-status"] });
      toast.success(`Face ID enabled on ${data.deviceName}`);
    },
    onError: (err: Error) => {
      if (err.name === "NotAllowedError") {
        toast.error("Face ID cancelled");
      } else {
        toast.error(err.message ?? "Failed to enable Face ID");
      }
    },
  });
}

export function useLoginWithPasskey(onSuccess: () => void) {
  return useMutation({
    mutationFn: loginWithPasskey,
    onSuccess,
    onError: (err: Error) => {
      if (err.name === "NotAllowedError") {
        toast.error("Face ID cancelled");
      } else if (err.message?.includes("Security error")) {
        localStorage.removeItem(PASSKEY_REGISTERED_KEY);
        toast.error("Security error — please sign in again");
      } else {
        toast.error(err.message ?? "Could not connect. Try again.");
      }
    },
  });
}

export function useDismissPasskeyPrompt() {
  return () => {
    localStorage.setItem(PASSKEY_DISMISSED_KEY, "true");
  };
}

export function useDeletePasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePasskey,
    onSuccess: () => {
      localStorage.removeItem(PASSKEY_REGISTERED_KEY);
      qc.invalidateQueries({ queryKey: ["passkey-status"] });
      toast.success("Passkey removed");
    },
    onError: () => toast.error("Failed to remove passkey"),
  });
}
```

- [ ] **Step 2: Create `src/hooks/useAppLock.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import { passkeyIsRegistered } from "./usePasskey";

const LOCKED_AT_KEY = "passkeyLockedAt";
const LOCK_TIMEOUT_MS = 60_000; // 1 minute

export type LockState = "unlocked" | "biometric" | "full-login";

export function useAppLock(): {
  lockState: LockState;
  unlock: () => void;
} {
  const computeState = useCallback((): LockState => {
    if (!passkeyIsRegistered()) return "unlocked";
    const lockedAtStr = sessionStorage.getItem(LOCKED_AT_KEY);
    if (!lockedAtStr) return "unlocked";
    const elapsed = Date.now() - Number(lockedAtStr);
    if (elapsed < LOCK_TIMEOUT_MS) return "biometric";
    return "full-login";
  }, []);

  const [lockState, setLockState] = useState<LockState>(computeState);

  // Record timestamp when app is backgrounded
  useEffect(() => {
    const onHide = () => {
      if (passkeyIsRegistered()) {
        sessionStorage.setItem(LOCKED_AT_KEY, String(Date.now()));
      }
    };
    const onShow = () => {
      setLockState(computeState());
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) onHide();
      else onShow();
    });
    window.addEventListener("pagehide", onHide);

    return () => {
      document.removeEventListener("visibilitychange", () => {});
      window.removeEventListener("pagehide", onHide);
    };
  }, [computeState]);

  const unlock = useCallback(() => {
    sessionStorage.removeItem(LOCKED_AT_KEY);
    setLockState("unlocked");
  }, []);

  return { lockState, unlock };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePasskey.ts src/hooks/useAppLock.ts
git commit -m "feat: usePasskey and useAppLock hooks"
```

---

## Task 10: Frontend — `BiometricLockScreen` component

**Files:**
- Create: `restaurant-admin/src/components/BiometricLockScreen.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoginWithPasskey } from "@/hooks/usePasskey";
import { authClient } from "@/lib/auth-client";

interface Props {
  onUnlock: () => void;
  onSignInDifferently: () => void;
}

export function BiometricLockScreen({ onUnlock, onSignInDifferently }: Props) {
  const [userName, setUserName] = useState("");
  const { mutate: login, isPending } = useLoginWithPasskey(onUnlock);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user?.name) setUserName(data.user.name);
    });
    // Auto-trigger biometric prompt on mount
    login();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 px-8">
      <img src="/saucymenu.svg" alt="Saucy Menu" className="h-12 mb-4" />

      {userName && (
        <p className="text-lg font-semibold text-gray-800">
          Welcome back, {userName.split(" ")[0]}
        </p>
      )}

      <button
        onClick={() => login()}
        disabled={isPending}
        className="w-24 h-24 rounded-full bg-orange-50 border-2 border-orange-400 flex items-center justify-center hover:bg-orange-100 transition-colors disabled:opacity-50"
        aria-label="Authenticate with Face ID"
      >
        {isPending ? (
          <Loader2 className="h-10 w-10 text-orange-400 animate-spin" />
        ) : (
          <Fingerprint className="h-10 w-10 text-orange-400" />
        )}
      </button>

      {isPending && (
        <p className="text-sm text-gray-500">Verifying…</p>
      )}

      <button
        onClick={onSignInDifferently}
        className="text-sm text-gray-400 underline hover:text-gray-600"
      >
        Sign in differently
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BiometricLockScreen.tsx
git commit -m "feat: BiometricLockScreen component"
```

---

## Task 11: Frontend — `PasskeyRegistrationDrawer` component

**Files:**
- Create: `restaurant-admin/src/components/PasskeyRegistrationDrawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Drawer } from "vaul";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegisterPasskey, useDismissPasskeyPrompt } from "@/hooks/usePasskey";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PasskeyRegistrationDrawer({ open, onClose }: Props) {
  const { mutate: register, isPending } = useRegisterPasskey();
  const dismiss = useDismissPasskeyPrompt();

  const handleEnable = () => {
    register(undefined, { onSuccess: onClose });
  };

  const handleDismiss = () => {
    dismiss();
    onClose();
  };

  return (
    <Drawer.Root open={open} dismissible={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white px-6 pb-10 pt-6 flex flex-col items-center gap-4 max-w-lg mx-auto">
          <div className="w-12 h-1 rounded-full bg-gray-200 mb-2" />

          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
            <Fingerprint className="h-8 w-8 text-orange-400" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center">
            Sign in faster with Face ID
          </h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Use Face ID or Touch ID to unlock the app instantly. Your credentials are stored securely in your device's keychain.
          </p>

          <Button
            onClick={handleEnable}
            loading={isPending}
            className="w-full py-6 bg-orange-400 hover:bg-orange-500 text-white rounded-xl mt-2"
          >
            Enable Face ID
          </Button>

          <button
            onClick={handleDismiss}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Not now
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PasskeyRegistrationDrawer.tsx
git commit -m "feat: PasskeyRegistrationDrawer component"
```

---

## Task 12: Frontend — `InstallPrompt` component

**Files:**
- Create: `restaurant-admin/src/components/InstallPrompt.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";

const DISMISSED_KEY = "pwaInstallDismissed";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  // deferredPrompt holds the beforeinstallprompt event on Android/Chrome
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt(): Promise<void> } | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return; // already installed
    setIsIOS(ios);
    if (ios) { setShow(true); return; }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt(): Promise<void> });
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
    }
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-start gap-3 max-w-sm mx-auto">
      <img src="/saucymenu.svg" alt="" className="h-10 w-10 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">Add to Home Screen</p>
        {isIOS ? (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            Tap <Share className="inline h-3 w-3" /> then "Add to Home Screen"
          </p>
        ) : (
          <button onClick={install} className="text-xs text-orange-500 underline mt-1">
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InstallPrompt.tsx
git commit -m "feat: PWA install prompt for iOS and Android"
```

---

## Task 13: Frontend — update login page

**Files:**
- Modify: `restaurant-admin/src/pages/auth/login/index.tsx`

- [ ] **Step 1: Add Face ID button above the email/password form**

At the top of `Login` component body, add:

```tsx
const navigate = useNavigate();
const isPasskeySupported = usePasskeySupported();
const passkeyReady = isPasskeySupported && passkeyIsRegistered();
const { mutate: passkeyLogin, isPending: passkeyPending } = useLoginWithPasskey(() =>
  navigate("/admin/dashboard")
);
```

Import at the top:
```tsx
import { usePasskeySupported, passkeyIsRegistered, useLoginWithPasskey } from "@/hooks/usePasskey";
import { Fingerprint } from "lucide-react";
```

Before the `<form>` element, add:

```tsx
{passkeyReady && (
  <div className="mb-6">
    <Button
      type="button"
      onClick={() => passkeyLogin()}
      loading={passkeyPending}
      className="w-full py-8 bg-orange-400 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center gap-2"
    >
      <Fingerprint className="h-5 w-5" />
      Use Face ID / Passkey
    </Button>
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">or sign in with email</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/login/index.tsx
git commit -m "feat: Face ID button on login page"
```

---

## Task 14: Frontend — Settings Security tab

**Files:**
- Create: `restaurant-admin/src/pages/admin/settings/components/security.tsx`
- Modify: `restaurant-admin/src/pages/admin/settings/index.tsx`

- [ ] **Step 1: Create `security.tsx`**

```tsx
import { Shield, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/Spinner";
import { usePasskeyStatus, useDeletePasskey, useRegisterPasskey, usePasskeySupported } from "@/hooks/usePasskey";

export function Security() {
  const supported = usePasskeySupported();
  const { data, isLoading } = usePasskeyStatus();
  const { mutate: addPasskey, isPending: adding } = useRegisterPasskey();
  const { mutate: removePasskey, isPending: removing } = useDeletePasskey();

  if (!supported) {
    return (
      <div className="mt-6 text-sm text-gray-500">
        Your browser or device does not support passkeys (Face ID / Touch ID).
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const credentials = data?.credentials ?? [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-orange-400" />
        <h3 className="font-semibold text-gray-900">Face ID / Passkey</h3>
      </div>

      {credentials.length === 0 ? (
        <p className="text-sm text-gray-500">No passkeys registered on this account.</p>
      ) : (
        <ul className="space-y-3">
          {credentials.map((cred) => (
            <li
              key={cred.id}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{cred.deviceName}</p>
                <p className="text-xs text-gray-400">
                  Added {new Date(cred.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => removePasskey(cred.id)}
                disabled={removing}
                className="text-red-400 hover:text-red-600 disabled:opacity-40"
                aria-label="Remove passkey"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={() => addPasskey()}
        loading={adding}
        className="mt-2 flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-white rounded-xl px-4 py-2"
      >
        <Plus className="h-4 w-4" />
        Add passkey
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add Security tab to `settings/index.tsx`**

Import the new component:
```tsx
import { Security } from './components/security'
```

Add to the `TABS` array:
```tsx
{ key: 'security', label: 'Security' },
```

Add the tab content inside the render block:
```tsx
{activeTab === 'security' && <Security />}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/settings/components/security.tsx src/pages/admin/settings/index.tsx
git commit -m "feat: Security tab in settings with passkey management"
```

---

## Task 15: Frontend — wire `AppLock` + `PasskeyRegistrationDrawer` + `InstallPrompt` into `App.tsx`

**Files:**
- Modify: `restaurant-admin/src/App.tsx`

- [ ] **Step 1: Create an `AppShell` wrapper component**

Add a new file `src/components/AppShell.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppLock } from "@/hooks/useAppLock";
import { usePasskeyStatus, passkeyPromptDismissed } from "@/hooks/usePasskey";
import { BiometricLockScreen } from "./BiometricLockScreen";
import { PasskeyRegistrationDrawer } from "./PasskeyRegistrationDrawer";
import { InstallPrompt } from "./InstallPrompt";
import { authClient } from "@/lib/auth-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lockState, unlock } = useAppLock();
  const { data: passkeyStatus } = usePasskeyStatus();
  const [showRegistration, setShowRegistration] = useState(false);

  const isAuthPage = location.pathname.startsWith("/auth") || location.pathname === "/";
  const isAdminPage = location.pathname.startsWith("/admin");

  // Show biometric lock screen when returning to an admin page within 1 min
  if (isAdminPage && lockState === "biometric") {
    return (
      <BiometricLockScreen
        onUnlock={unlock}
        onSignInDifferently={() => {
          authClient.signOut().then(() => navigate("/auth"));
        }}
      />
    );
  }

  // Redirect to login if session timed out
  useEffect(() => {
    if (isAdminPage && lockState === "full-login") {
      navigate("/auth");
    }
  }, [lockState, isAdminPage, navigate]);

  // Show registration drawer after first login if not dismissed
  useEffect(() => {
    if (!isAdminPage) return;
    if (passkeyStatus === undefined) return; // still loading
    if (!passkeyStatus.registered && !passkeyPromptDismissed()) {
      setShowRegistration(true);
    }
  }, [isAdminPage, passkeyStatus]);

  return (
    <>
      {children}
      <PasskeyRegistrationDrawer
        open={showRegistration}
        onClose={() => setShowRegistration(false)}
      />
      {isAuthPage && <InstallPrompt />}
    </>
  );
}
```

- [ ] **Step 2: Wrap the router output in `App.tsx`**

`App.tsx` currently uses `<RouterProvider router={router} />`. React Router v7 supports a `createBrowserRouter` + layout route approach. The cleanest way is to wrap at the route level.

In `src/routes.tsx`, wrap the admin layout route children with `AppShell`. Find the existing route config and add `AppShell` as a wrapper element on the root route:

```tsx
// In routes.tsx, import AppShell and wrap the root element:
import { AppShell } from "@/components/AppShell";

// The root route element becomes:
element: <AppShell><YourExistingRootLayout /></AppShell>
```

If the routes use a flat structure without a root layout, add `AppShell` inside `App.tsx` directly:

```tsx
// App.tsx
import { AppShell } from "./components/AppShell";

// Inside RouterProvider, use a wrapper layout route or:
// Wrap QueryClientProvider output:
return (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
// AppShell needs router context, so it must be inside RouterProvider.
// Add it as a layout component in routes.tsx, not App.tsx.
```

Check `src/routes.tsx` for the current route structure and add `AppShell` as the element for the root `"/"` route, wrapping `<Outlet />`.

- [ ] **Step 3: TypeScript check**

```bash
pnpm tsc --noEmit
```

Fix any type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx src/routes.tsx src/App.tsx
git commit -m "feat: wire AppShell with lock screen, registration drawer, and install prompt"
```

---

## Task 16: End-to-end smoke test

- [ ] **Step 1: Start the Go backend with WebAuthn env vars**

In your Go backend `.env`:
```
WEBAUTHN_RPID=<your-ngrok-subdomain>
WEBAUTHN_ORIGIN=https://<your-ngrok-subdomain>
```

Start the server: `go run ./cmd/...`

- [ ] **Step 2: Start the frontend via ngrok**

```bash
cd restaurant-admin
pnpm dev
# In a separate terminal:
ngrok http 5173
```

Open `https://<ngrok-url>` on your iPhone.

- [ ] **Step 3: Test registration flow**

1. Sign in with email/password
2. The `PasskeyRegistrationDrawer` should appear
3. Tap "Enable Face ID" → Face ID sheet appears on iPhone
4. Approve → toast "Face ID enabled on iPhone / iPad"

- [ ] **Step 4: Test lock screen**

1. Press the home button on iPhone (app goes to background)
2. Wait less than 1 minute
3. Reopen the app → biometric lock screen appears
4. Tap the fingerprint button → Face ID prompt → app unlocks

- [ ] **Step 5: Test full re-login via passkey**

1. Wait more than 1 minute (or clear `sessionStorage`)
2. Navigate to `/auth` → "Use Face ID / Passkey" button should appear
3. Tap → Face ID prompt → signed in directly

- [ ] **Step 6: Test Settings → Security tab**

1. Go to Settings → Security tab
2. Your device should be listed
3. Tap the delete button → passkey removed
4. "Add passkey" button → re-registers

---

## Self-review notes

- **`buildPasskeyUser` credential PublicKey field**: The `webauthn.Credential.PublicKey` is `[]byte`. When loading from DB for the login discoverable handler, assign `row.PublicKey` directly — remove the `protocol.COSEKey` intermediate type in the task 4 code.
- **`jsonReader` helper**: Only needed for the `protocol.ParseCredentialRequestResponseBody` call. If go-webauthn exposes a method that accepts `*http.Request` directly for the discoverable login case, use that instead to simplify.
- **`useAppLock` event listeners**: The `removeEventListener` cleanup in the effect uses anonymous functions and won't properly clean up. In production, use `useRef` to store the handler references. This is a known React patterns issue — acceptable for MVP, fix in a follow-up.
- **AppShell routing**: Exact implementation depends on current `routes.tsx` shape (not included in task 4 code). The engineer must read `routes.tsx` before implementing task 15 step 2.
