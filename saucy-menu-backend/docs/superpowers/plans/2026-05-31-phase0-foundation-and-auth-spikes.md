# Phase 0 — Go Backend Foundation + Auth Spikes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Go service that connects to the existing Postgres schema via sqlc/pgx, serves the public `/shared/base/setup` endpoint with byte-compatible JSON, and resolves the two auth unknowns (better-auth cookie format + password hashing) via runnable spikes — proving the whole migration approach before any large surface is ported.

**Architecture:** chi router on `net/http`, sqlc-generated typed queries over a pgxpool, a shared response-envelope + error-mapping layer, and a `lang`-header translation hook. Built as `cmd/server` (web) with room for `cmd/worker` later. Everything runs locally against a Homebrew Postgres seeded from the existing drizzle migrations. **Nothing is pushed to any remote.**

**Tech Stack:** Go 1.23, go-chi/chi/v5, jackc/pgx/v5 + sqlc, go-playground/validator/v10, golang-jwt/jwt/v5, golang.org/x/crypto (argon2/scrypt), zerolog, caarlos0/env/v11, stretchr/testify.

---

## Context & Constraints (read first)

- **Not in production yet** → no data preservation needed. Auth spikes prove *contract* parity (the frontend better-auth client + diner JWT must work), not migration of existing hashes/sessions.
- **Do NOT push** to any git remote. Local commits on a feature branch only.
- **Do NOT change** the existing Bun backend, the DB schema, or any frontend repo.
- The Go project lives in a **new sibling directory** so the Bun repo is untouched:
  `/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend-go`
- Reference (read-only) sources:
  - Bun backend: `../saucy-menu-backend`
  - Schema SQL: `../saucy-menu-backend/drizzle/*.sql`
  - Clients: `../restaurant-admin`, `../super-admin`, `../end-user-app`
- `.env` values come later. Build against `.env.example`; tests use a local throwaway DB.

### Local prerequisites (one-time, manual — confirm before Task 1)
- Go 1.23.5 ✓ (already installed)
- Postgres for local dev/test. Install if missing: `brew install postgresql@16 && brew services start postgresql@16`
- sqlc (installed in Task 1 via `go install`)

### File Structure (created across the tasks below)
```
saucy-menu-backend-go/
  go.mod
  .gitignore
  .env.example
  sqlc.yaml
  Makefile
  README.md
  cmd/server/main.go            # entrypoint: load config, build router, listen
  internal/
    config/config.go            # typed env config, fail-fast
    config/config_test.go
    db/db.go                    # pgxpool constructor
    db/schema.sql               # concatenated drizzle DDL (sqlc input)
    db/queries/setup.sql        # hand-written queries for sqlc
    db/sqlc/                    # GENERATED (db.go, models.go, setup.sql.go)
    httpx/envelope.go           # Success/Error JSON envelope helpers
    httpx/envelope_test.go
    httpx/errors.go             # AppError + error->status mapping
    httpx/errors_test.go
    httpx/middleware.go         # request logging, recover, lang context
    router/router.go            # chi router wiring, CORS, route groups
    handlers/shared/setup.go    # GET /shared/base/setup
    handlers/shared/setup_test.go
    auth/passwordhash/hash.go   # argon2id hash/verify (Spike B result)
    auth/passwordhash/hash_test.go
    auth/betterauth/cookie.go   # signed-cookie encode/decode (Spike A result)
    auth/betterauth/cookie_test.go
  spikes/
    cookie_probe/main.go        # mints a cookie via Bun better-auth, dumps format
    SPIKE-A-findings.md
    SPIKE-B-findings.md
  docs/
    ENV.md                      # documents every env var + where it comes from
```

---

## Task 1: Scaffold Go module + tooling

**Files:**
- Create: `saucy-menu-backend-go/go.mod` (via `go mod init`)
- Create: `saucy-menu-backend-go/.gitignore`
- Create: `saucy-menu-backend-go/.env.example`
- Create: `saucy-menu-backend-go/Makefile`
- Create: `saucy-menu-backend-go/README.md`

- [ ] **Step 1: Create the project dir and init the module**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu"
mkdir -p saucy-menu-backend-go && cd saucy-menu-backend-go
go mod init github.com/restorefine-studios/saucy-menu-backend-go
git init
```
Expected: `go.mod` created with `go 1.23`; empty git repo initialized.

- [ ] **Step 2: Add core dependencies**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend-go"
go get github.com/go-chi/chi/v5@latest
go get github.com/go-chi/cors@latest
go get github.com/jackc/pgx/v5@latest
go get github.com/rs/zerolog@latest
go get github.com/caarlos0/env/v11@latest
go get github.com/go-playground/validator/v10@latest
go get github.com/golang-jwt/jwt/v5@latest
go get golang.org/x/crypto@latest
go get github.com/stretchr/testify@latest
```
Expected: all modules added to `go.mod`/`go.sum`, no errors.

- [ ] **Step 3: Install sqlc**

Run:
```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
"$(go env GOPATH)/bin/sqlc" version
```
Expected: prints a version like `v1.27.0`. (If `sqlc` isn't on PATH, use the full `$(go env GOPATH)/bin/sqlc` path in later steps.)

- [ ] **Step 4: Write `.gitignore`**

```gitignore
# binaries
/bin/
/tmp/
*.test
*.out

# env
.env
.env.*
!.env.example

# os
.DS_Store

# local db dumps
/backups/
```

- [ ] **Step 5: Write `.env.example`**

```dotenv
# Server
PORT=8080
NODE_ENV=development

# Database (local dev points at a local Postgres; prod/staging come from Fly secrets later)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/saucy_menu_dev?sslmode=disable

# Auth
JWT_SECRET=dev-jwt-secret-change-me
BETTER_AUTH_SECRET=dev-better-auth-secret-change-me
BETTER_AUTH_URL=http://localhost:8080

# Integrations (not needed for Phase 0; placeholders so config loads)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
DEEPL_API_KEY=
PLUNK_SECRET_KEY=
UPSTASH_REDIS_URL=
UPLOAD_SERVICE_URL=
MEDIA_SERVICE_URL=https://media.saucymenu.com/
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

- [ ] **Step 6: Write `Makefile`**

```makefile
SQLC := $(shell go env GOPATH)/bin/sqlc

.PHONY: sqlc test run tidy
sqlc:
	$(SQLC) generate
test:
	go test ./...
run:
	go run ./cmd/server
tidy:
	go mod tidy
```

- [ ] **Step 7: Write a minimal `README.md`**

```markdown
# saucy-menu-backend-go

Go port of saucy-menu-backend. Phase 0: foundation + auth spikes.
See ../saucy-menu-backend/docs/superpowers/specs/2026-05-31-go-backend-migration-design.md

## Dev
- `make sqlc`  regenerate DB code
- `make test`  run tests
- `make run`   start server (needs .env)
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Go module, tooling, env template"
```

---

## Task 2: Local DB from existing schema

**Files:**
- Create: `saucy-menu-backend-go/internal/db/schema.sql`

- [ ] **Step 1: Create the local dev + test databases**

Run:
```bash
createdb saucy_menu_dev 2>/dev/null; createdb saucy_menu_test 2>/dev/null; echo done
```
Expected: `done` (ignore "already exists").

- [ ] **Step 2: Build `schema.sql` by concatenating the drizzle migrations in order**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend-go"
mkdir -p internal/db
: > internal/db/schema.sql
for f in $(ls ../saucy-menu-backend/drizzle/[0-9]*.sql | sort); do
  echo "-- >>> $f" >> internal/db/schema.sql
  cat "$f" >> internal/db/schema.sql
  echo "" >> internal/db/schema.sql
done
wc -l internal/db/schema.sql
```
Expected: a single file, several hundred lines.

- [ ] **Step 3: Load schema into both DBs; fix statement-breakpoint markers if needed**

Run:
```bash
# drizzle uses "--> statement-breakpoint" comments; psql ignores comments, so this loads directly
psql saucy_menu_dev  -v ON_ERROR_STOP=1 -f internal/db/schema.sql
psql saucy_menu_test -v ON_ERROR_STOP=1 -f internal/db/schema.sql
```
Expected: both load with no errors. If a later migration ALTERs a table created earlier, order (already sorted) handles it. If any statement fails, read the error, confirm it's an ordering/`IF NOT EXISTS` issue, and adjust `schema.sql` (this is expected hand-work, not a placeholder — the fix is: wrap re-runs by dropping/recreating the DB with `dropdb saucy_menu_test && createdb saucy_menu_test` then reload).

- [ ] **Step 4: Verify key tables exist**

Run:
```bash
psql saucy_menu_dev -c "\dt" | grep -E "users|restaurants|menu_items|session|account|verification|languages|currencies"
```
Expected: all those table names appear.

- [ ] **Step 5: Seed minimal data for the setup endpoint test**

Run:
```bash
psql saucy_menu_test -c "INSERT INTO currencies (code,name,symbol) VALUES ('GBP','British Pound','£') ON CONFLICT (code) DO NOTHING;"
psql saucy_menu_test -c "INSERT INTO languages (code,name,flag,is_active,sort_order) VALUES ('en-GB','English','🇬🇧',true,0) ON CONFLICT (code) DO NOTHING;"
```
Expected: `INSERT 0 1` (or `0 0` if already present).

- [ ] **Step 6: Commit**

```bash
git add internal/db/schema.sql
git commit -m "feat(db): import existing schema from drizzle migrations"
```

---

## Task 3: Config loader (TDD)

**Files:**
- Create: `saucy-menu-backend-go/internal/config/config.go`
- Test: `saucy-menu-backend-go/internal/config/config_test.go`

- [ ] **Step 1: Write the failing test**

```go
package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://localhost/x")
	t.Setenv("JWT_SECRET", "j")
	t.Setenv("BETTER_AUTH_SECRET", "b")
	t.Setenv("PORT", "9999")

	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, "postgres://localhost/x", cfg.DatabaseURL)
	require.Equal(t, "9999", cfg.Port)
	require.Equal(t, "j", cfg.JWTSecret)
	require.Equal(t, "b", cfg.BetterAuthSecret)
}

func TestLoadMissingRequiredFails(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("BETTER_AUTH_SECRET", "")
	_, err := Load()
	require.Error(t, err)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/config/ -run TestLoad -v`
Expected: FAIL / build error (`Load` undefined).

- [ ] **Step 3: Write minimal implementation**

```go
package config

import "github.com/caarlos0/env/v11"

type Config struct {
	Port             string `env:"PORT" envDefault:"8080"`
	NodeEnv          string `env:"NODE_ENV" envDefault:"development"`
	DatabaseURL      string `env:"DATABASE_URL,required"`
	JWTSecret        string `env:"JWT_SECRET,required"`
	BetterAuthSecret string `env:"BETTER_AUTH_SECRET,required"`
	BetterAuthURL    string `env:"BETTER_AUTH_URL" envDefault:"http://localhost:8080"`
	MediaServiceURL  string `env:"MEDIA_SERVICE_URL"`
	UpstashRedisURL  string `env:"UPSTASH_REDIS_URL"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/config/ -v`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add internal/config/
git commit -m "feat(config): typed env config with fail-fast on required vars"
```

---

## Task 4: Response envelope (TDD)

**Files:**
- Create: `saucy-menu-backend-go/internal/httpx/envelope.go`
- Test: `saucy-menu-backend-go/internal/httpx/envelope_test.go`

The Bun backend returns `{ success, data, message }`. Clients read `res.data.data` and `res.data.message`. `success` is present on most success responses; `message` only on some. We reproduce: success → `{success:true, data:<payload>}`; error → `{message:"..."}` (matches the Elysia `onError` which returns only `{message}`).

- [ ] **Step 1: Write the failing test**

```go
package httpx

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestWriteSuccess(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteSuccess(rec, 200, map[string]any{"x": 1})

	require.Equal(t, 200, rec.Code)
	require.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, true, body["success"])
	require.Equal(t, map[string]any{"x": float64(1)}, body["data"])
}

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, 400, "bad thing")

	require.Equal(t, 400, rec.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, "bad thing", body["message"])
	_, hasSuccess := body["success"]
	require.False(t, hasSuccess)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/httpx/ -run TestWrite -v`
Expected: FAIL (undefined `WriteSuccess`/`WriteError`).

- [ ] **Step 3: Write minimal implementation**

```go
package httpx

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteSuccess emits {success:true, data:<payload>}.
func WriteSuccess(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, map[string]any{"success": true, "data": data})
}

// WriteError emits {message:"..."} to match the Elysia onError shape.
func WriteError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"message": message})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/httpx/ -run TestWrite -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/httpx/envelope.go internal/httpx/envelope_test.go
git commit -m "feat(httpx): success/error response envelope matching Elysia shape"
```

---

## Task 5: AppError + error→status mapping (TDD)

**Files:**
- Create: `saucy-menu-backend-go/internal/httpx/errors.go`
- Test: `saucy-menu-backend-go/internal/httpx/errors_test.go`

Mirrors the Elysia `onError`: known status on the error wins; else 500. VALIDATION→400, NOT_FOUND→404, PARSE→400 handled by callers constructing AppError with those codes.

- [ ] **Step 1: Write the failing test**

```go
package httpx

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAppErrorStatusAndMessage(t *testing.T) {
	e := NewAppError(404, "not found")
	require.Equal(t, 404, e.Status)
	require.Equal(t, "not found", e.Error())
}

func TestStatusFromPlainErrorIs500(t *testing.T) {
	status, msg := StatusAndMessage(errors.New("boom"))
	require.Equal(t, 500, status)
	require.Equal(t, "boom", msg)
}

func TestStatusFromAppError(t *testing.T) {
	status, msg := StatusAndMessage(NewAppError(400, "bad"))
	require.Equal(t, 400, status)
	require.Equal(t, "bad", msg)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/httpx/ -run "TestApp|TestStatus" -v`
Expected: FAIL (undefined symbols).

- [ ] **Step 3: Write minimal implementation**

```go
package httpx

type AppError struct {
	Status  int
	Message string
}

func (e *AppError) Error() string { return e.Message }

func NewAppError(status int, message string) *AppError {
	return &AppError{Status: status, Message: message}
}

// StatusAndMessage extracts an HTTP status + client message from any error,
// mirroring the Elysia onError: AppError status wins, otherwise 500.
func StatusAndMessage(err error) (int, string) {
	if ae, ok := err.(*AppError); ok {
		return ae.Status, ae.Message
	}
	return 500, err.Error()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/httpx/ -v`
Expected: PASS (all httpx tests).

- [ ] **Step 5: Commit**

```bash
git add internal/httpx/errors.go internal/httpx/errors_test.go
git commit -m "feat(httpx): AppError and error-to-status mapping"
```

---

## Task 6: pgx pool + sqlc config

**Files:**
- Create: `saucy-menu-backend-go/sqlc.yaml`
- Create: `saucy-menu-backend-go/internal/db/queries/setup.sql`
- Create: `saucy-menu-backend-go/internal/db/db.go`
- Generated: `saucy-menu-backend-go/internal/db/sqlc/*`

- [ ] **Step 1: Write `sqlc.yaml`**

```yaml
version: "2"
sql:
  - engine: "postgresql"
    schema: "internal/db/schema.sql"
    queries: "internal/db/queries"
    gen:
      go:
        package: "sqlc"
        out: "internal/db/sqlc"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_pointers_for_null_types: true
```

- [ ] **Step 2: Write the first queries file**

```sql
-- name: ListActiveLanguages :many
SELECT id, code, name, flag, is_active, sort_order
FROM languages
WHERE is_active = true
ORDER BY sort_order ASC;

-- name: ListCurrencies :many
SELECT id, code, name, symbol
FROM currencies;
```

- [ ] **Step 3: Generate sqlc code**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend-go"
make sqlc
ls internal/db/sqlc
```
Expected: `db.go`, `models.go`, `setup.sql.go` generated; no errors. If sqlc complains about a schema statement (e.g. a drizzle-ism), note it in `spikes/SPIKE-B-findings.md` style — but most likely it parses cleanly. Fix any unparseable DDL by editing `schema.sql` minimally (documented inline).

- [ ] **Step 4: Write the pool constructor**

```go
package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
```

- [ ] **Step 5: Verify it builds**

Run: `go build ./...`
Expected: builds with no errors.

- [ ] **Step 6: Commit**

```bash
git add sqlc.yaml internal/db/
git commit -m "feat(db): pgx pool + sqlc setup queries (languages, currencies)"
```

---

## Task 7: `/shared/base/setup` handler (TDD, integration)

**Files:**
- Create: `saucy-menu-backend-go/internal/handlers/shared/setup.go`
- Test: `saucy-menu-backend-go/internal/handlers/shared/setup_test.go`

Parity target (from `../saucy-menu-backend/src/api/shared/base/base.routes.ts`):
`GET /shared/base/setup` → `{ success:true, data:{ languages:[...], currencies:[...] } }`.
Redis caching from the original is **intentionally dropped in Phase 0** (DB read is fine; caching can return in a later phase). This is a deliberate, documented deviation — behavior/response shape is identical, only the cache layer differs.

- [ ] **Step 1: Write the failing integration test**

```go
package shared

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
)

func testDBURL() string {
	if v := os.Getenv("TEST_DATABASE_URL"); v != "" {
		return v
	}
	return "postgres://localhost:5432/saucy_menu_test?sslmode=disable"
}

func TestSetupReturnsLanguagesAndCurrencies(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testDBURL())
	require.NoError(t, err)
	defer pool.Close()

	h := NewSetupHandler(sqlc.New(pool))

	req := httptest.NewRequest(http.MethodGet, "/shared/base/setup", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, 200, rec.Code)

	var body struct {
		Success bool `json:"success"`
		Data    struct {
			Languages  []map[string]any `json:"languages"`
			Currencies []map[string]any `json:"currencies"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.True(t, body.Success)
	require.GreaterOrEqual(t, len(body.Languages()+0), 0) // compile guard; real asserts below
	require.NotEmpty(t, body.Data.Languages)
	require.NotEmpty(t, body.Data.Currencies)
}
```

> Note: remove the `body.Languages()+0` compile-guard line before running — it's an
> intentional reminder that the struct uses `body.Data.Languages`. Final assertions
> are the two `require.NotEmpty` lines. (Kept explicit so the worker doesn't invent
> assertions.)

Corrected test body (use this — it replaces the guard line):

```go
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.True(t, body.Success)
	require.NotEmpty(t, body.Data.Languages)
	require.NotEmpty(t, body.Data.Currencies)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/handlers/shared/ -run TestSetup -v`
Expected: FAIL (undefined `NewSetupHandler`).

- [ ] **Step 3: Write minimal implementation**

```go
package shared

import (
	"net/http"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type SetupHandler struct {
	q *sqlc.Queries
}

func NewSetupHandler(q *sqlc.Queries) *SetupHandler {
	return &SetupHandler{q: q}
}

func (h *SetupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	langs, err := h.q.ListActiveLanguages(ctx)
	if err != nil {
		status, msg := httpx.StatusAndMessage(err)
		httpx.WriteError(w, status, msg)
		return
	}
	currencies, err := h.q.ListCurrencies(ctx)
	if err != nil {
		status, msg := httpx.StatusAndMessage(err)
		httpx.WriteError(w, status, msg)
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"languages":  langs,
		"currencies": currencies,
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/handlers/shared/ -run TestSetup -v`
Expected: PASS (requires Task 2 seed rows present).

- [ ] **Step 5: Commit**

```bash
git add internal/handlers/shared/
git commit -m "feat(shared): GET /shared/base/setup parity endpoint"
```

---

## Task 8: Middleware — recover, request log, lang context (TDD)

**Files:**
- Create: `saucy-menu-backend-go/internal/httpx/middleware.go`
- Test: `saucy-menu-backend-go/internal/httpx/middleware_test.go`

- [ ] **Step 1: Write the failing test**

```go
package httpx

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRecoverMiddlewareReturns500(t *testing.T) {
	h := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("kaboom")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	require.Equal(t, 500, rec.Code)
}

func TestLangContextDefaultsToEn(t *testing.T) {
	var got string
	h := LangContext(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = LangFromContext(r.Context())
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	require.Equal(t, "en", got)
}

func TestLangContextReadsHeader(t *testing.T) {
	var got string
	h := LangContext(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = LangFromContext(r.Context())
	}))
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("lang", "fr")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	require.Equal(t, "fr", got)
}

var _ = context.Background
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/httpx/ -run "TestRecover|TestLang" -v`
Expected: FAIL (undefined `Recover`, `LangContext`, `LangFromContext`).

- [ ] **Step 3: Write minimal implementation**

```go
package httpx

import (
	"context"
	"net/http"

	"github.com/rs/zerolog/log"
)

type ctxKey string

const langKey ctxKey = "lang"

// Recover converts panics into a 500 {message} response.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error().Interface("panic", rec).Str("url", r.URL.String()).Msg("recovered panic")
				WriteError(w, http.StatusInternalServerError, "Internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// LangContext stores the `lang` header (default "en") in the request context.
func LangContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lang := r.Header.Get("lang")
		if lang == "" {
			lang = "en"
		}
		ctx := context.WithValue(r.Context(), langKey, lang)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func LangFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(langKey).(string); ok {
		return v
	}
	return "en"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/httpx/ -v`
Expected: PASS (all httpx tests).

- [ ] **Step 5: Commit**

```bash
git add internal/httpx/middleware.go internal/httpx/middleware_test.go
git commit -m "feat(httpx): recover, lang-context middleware"
```

---

## Task 9: Router wiring + health + server entrypoint

**Files:**
- Create: `saucy-menu-backend-go/internal/router/router.go`
- Create: `saucy-menu-backend-go/cmd/server/main.go`

- [ ] **Step 1: Write the router**

```go
package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/shared"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

func New(pool *pgxpool.Pool) http.Handler {
	q := sqlc.New(pool)
	r := chi.NewRouter()

	r.Use(httpx.Recover)
	r.Use(httpx.LangContext)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:5173", "http://localhost:5174",
			"https://dashboard.saucymenu.com", "https://saucymenu.com",
			"https://super-admin-79d.pages.dev", "https://menu.saucymenu.com",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "lang"},
		AllowCredentials: true,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteSuccess(w, http.StatusOK, map[string]any{"status": "ok"})
	})

	r.Route("/shared", func(r chi.Router) {
		r.Get("/base/setup", shared.NewSetupHandler(q).ServeHTTP)
	})

	return r
}
```

- [ ] **Step 2: Write the server entrypoint**

```go
package main

import (
	"context"
	"net/http"
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/router"
)

func main() {
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).With().Timestamp().Logger()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("db connect failed")
	}
	defer pool.Close()

	h := router.New(pool)
	addr := ":" + cfg.Port
	log.Info().Str("addr", addr).Msg("starting server")
	if err := http.ListenAndServe(addr, h); err != nil {
		log.Fatal().Err(err).Msg("server stopped")
	}
}
```

- [ ] **Step 3: Build and smoke-test against the dev DB**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend-go"
cp .env.example .env
# seed dev db like the test db
psql saucy_menu_dev -c "INSERT INTO currencies (code,name,symbol) VALUES ('GBP','British Pound','£') ON CONFLICT (code) DO NOTHING;"
psql saucy_menu_dev -c "INSERT INTO languages (code,name,flag,is_active,sort_order) VALUES ('en-GB','English','🇬🇧',true,0) ON CONFLICT (code) DO NOTHING;"
set -a; source .env; set +a
go run ./cmd/server &
SRV=$!; sleep 2
curl -s localhost:8080/healthz; echo
curl -s localhost:8080/shared/base/setup; echo
kill $SRV
```
Expected: healthz → `{"data":{"status":"ok"},"success":true}`; setup → JSON with `success:true` and non-empty `languages`/`currencies`.

- [ ] **Step 4: Commit**

```bash
git add internal/router/ cmd/server/
git commit -m "feat(server): chi router, CORS, health, setup route, entrypoint"
```

---

## Task 10: SPIKE A — better-auth cookie format

**Goal:** Determine exactly how better-auth `^1.5.4` names, encodes, and signs the
session cookie for THIS config, so the Go auth package (Phase 1) is provably
compatible with the better-auth client used by `restaurant-admin`/`super-admin`.

**Files:**
- Create: `saucy-menu-backend-go/spikes/cookie_probe/main.go` (optional helper)
- Create: `saucy-menu-backend-go/spikes/SPIKE-A-findings.md`

- [ ] **Step 1: Run the existing Bun backend locally with a known secret**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend"
# point it at the local dev DB and a known better-auth secret
DATABASE_URL="postgres://localhost:5432/saucy_menu_dev?sslmode=disable" \
BETTER_AUTH_SECRET="dev-better-auth-secret-change-me" \
BETTER_AUTH_URL="http://localhost:3000" \
JWT_SECRET="dev-jwt-secret-change-me" \
NODE_ENV=development \
bun run src/index.ts &
```
Expected: Elysia boots on its port. (If it fails due to other required env, set the missing ones to dummy values; document which.)

- [ ] **Step 2: Create a user + sign in, capture the Set-Cookie header**

Run:
```bash
BASE=http://localhost:3000
curl -s -X POST "$BASE/auth/sign-up/email" \
  -H 'content-type: application/json' \
  -d '{"email":"spike@example.com","password":"Password123!","name":"Spike"}' -i | sed -n '1,40p'
curl -s -X POST "$BASE/auth/sign-in/email" \
  -H 'content-type: application/json' \
  -d '{"email":"spike@example.com","password":"Password123!"}' -i | tee /tmp/signin.txt | sed -n '1,40p'
```
Expected: a `Set-Cookie:` header. Record the exact cookie **name** (e.g.
`saucy-menu-auth.session_token` or `__Secure-...`), attributes (`HttpOnly`,
`SameSite`, `Secure`, `Path`, `Max-Age`), and value structure.

- [ ] **Step 3: Decode the cookie value structure**

Inspect the cookie value from `/tmp/signin.txt`. Determine: is it `<token>` or
`<token>.<signature>`? Is the signature base64url HMAC-SHA256 of the token using
`BETTER_AUTH_SECRET`? Cross-check by querying the DB:
```bash
psql saucy_menu_dev -c "SELECT token, left(token,8) AS tok8, expires_at FROM session ORDER BY created_at DESC LIMIT 1;"
```
Compare the DB `session.token` to the cookie value's token part.

- [ ] **Step 4: Confirm get-session round-trips**

Run:
```bash
COOKIE=$(grep -i '^set-cookie:' /tmp/signin.txt | head -1 | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1)
curl -s "$BASE/auth/get-session" -H "cookie: $COOKIE" | head -c 600; echo
```
Expected: JSON `{ session, user }` incl. the custom `currency` field and the extra
`restaurantId`/`languageId`/`setupComplete` fields. Record the exact JSON shape.

- [ ] **Step 5: Write findings**

In `spikes/SPIKE-A-findings.md` record, with concrete evidence:
- exact cookie name(s) and all attributes
- value format (`token` vs `token.signature`), signature algorithm + input, secret source
- the `get-session` response JSON shape (field names, nesting, the custom fields)
- a worked example: a real token + its computed signature, and the Go pseudocode to reproduce it

**Acceptance:** the doc contains enough to implement `auth/betterauth/cookie.go`
deterministically — i.e. given `BETTER_AUTH_SECRET` and a session token, Go can
produce the identical cookie value, and parse/verify an incoming one.

- [ ] **Step 6: Commit**

```bash
git add spikes/SPIKE-A-findings.md spikes/cookie_probe/ 2>/dev/null
git commit -m "spike(auth): document better-auth cookie format (Spike A)"
```

---

## Task 11: SPIKE A result — `auth/betterauth/cookie.go` (TDD)

**Files:**
- Create: `saucy-menu-backend-go/internal/auth/betterauth/cookie.go`
- Test: `saucy-menu-backend-go/internal/auth/betterauth/cookie_test.go`

> The exact algorithm comes from Spike A. The test below assumes the common
> better-auth scheme: cookie value = `token + "." + base64url(HMAC_SHA256(token, secret))`.
> **If Spike A shows a different scheme, adjust the implementation AND this test to
> match the documented findings** — the test must encode the real, verified format,
> not this assumption.

- [ ] **Step 1: Write the failing test (using a value verified in Spike A)**

```go
package betterauth

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSignAndVerifyCookieRoundTrip(t *testing.T) {
	secret := "dev-better-auth-secret-change-me"
	token := "example-session-token-from-db"

	signed := SignToken(token, secret)
	got, ok := VerifyToken(signed, secret)
	require.True(t, ok)
	require.Equal(t, token, got)
}

func TestVerifyRejectsTamper(t *testing.T) {
	secret := "dev-better-auth-secret-change-me"
	signed := SignToken("tok", secret)
	_, ok := VerifyToken(signed+"x", secret)
	require.False(t, ok)
}

// TestMatchesBunReference pins the format to a value captured in Spike A.
// Replace EXPECTED with the real signed value observed from the Bun server
// for token "REPLACE_WITH_REAL_TOKEN" and the dev secret. Skipped until filled.
func TestMatchesBunReference(t *testing.T) {
	t.Skip("fill in from spikes/SPIKE-A-findings.md before enabling")
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/auth/betterauth/ -v`
Expected: FAIL (undefined `SignToken`/`VerifyToken`).

- [ ] **Step 3: Implement per Spike A findings**

```go
package betterauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strings"
)

// SignToken returns the cookie value for a session token.
// NOTE: confirm this scheme against spikes/SPIKE-A-findings.md.
func SignToken(token, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(token))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return token + "." + sig
}

// VerifyToken validates a cookie value and returns the embedded token.
func VerifyToken(value, secret string) (string, bool) {
	i := strings.LastIndex(value, ".")
	if i < 0 {
		return "", false
	}
	token, sig := value[:i], value[i+1:]
	expected := SignToken(token, secret)
	if subtle.ConstantTimeCompare([]byte(value), []byte(expected)) == 1 {
		_ = sig
		return token, true
	}
	return "", false
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/auth/betterauth/ -v`
Expected: PASS (round-trip + tamper). The pinned reference test stays skipped until
filled from Spike A.

- [ ] **Step 5: Fill and enable the reference test**

Using a real token+signed value from Spike A, replace the `t.Skip` test body with
a concrete assertion that `SignToken(realToken, devSecret) == realSignedValue`.
Run: `go test ./internal/auth/betterauth/ -run TestMatchesBunReference -v`
Expected: PASS — this is the proof of byte-compatibility with better-auth.

- [ ] **Step 6: Commit**

```bash
git add internal/auth/betterauth/
git commit -m "feat(auth): better-auth-compatible cookie sign/verify (Spike A result)"
```

---

## Task 12: SPIKE B — password hash format + Go verifier (TDD)

**Goal:** Match the password hashing so the Go auth package produces/accepts hashes
compatible with the rest of the system. Since we're pre-production, the key
requirement is: **Go's sign-in must verify a password against a hash created by the
same scheme better-auth uses with `Bun.password` here.**

**Files:**
- Create: `saucy-menu-backend-go/spikes/SPIKE-B-findings.md`
- Create: `saucy-menu-backend-go/internal/auth/passwordhash/hash.go`
- Test: `saucy-menu-backend-go/internal/auth/passwordhash/hash_test.go`

- [ ] **Step 1: Capture a real hash from the Bun flow**

Using the user created in Spike A, read the stored hash:
```bash
psql saucy_menu_dev -c "SELECT a.password FROM account a JOIN users u ON u.id=a.user_id WHERE u.email='spike@example.com' AND a.provider_id='credential';"
```
Record the full hash string. Identify the format prefix: `$argon2id$...`,
`$argon2i$...`, `$scrypt$...`, or a custom `salt:hash` form. Document the exact
algorithm + parameters in `spikes/SPIKE-B-findings.md`.

> Reference: `../saucy-menu-backend/src/lib/auth.ts` overrides hashing with
> `Bun.password.hash(password)` / `Bun.password.verify`. Bun's default is argon2id.
> Confirm against the real stored string — do not assume.

- [ ] **Step 2: Write the failing test using the captured hash**

```go
package passwordhash

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// realHash + realPassword come from spikes/SPIKE-B-findings.md (captured from Bun).
const realPassword = "Password123!"
const realHash = "REPLACE_WITH_HASH_FROM_SPIKE_B"

func TestVerifyAcceptsBunHash(t *testing.T) {
	if realHash == "REPLACE_WITH_HASH_FROM_SPIKE_B" {
		t.Skip("fill realHash from spikes/SPIKE-B-findings.md")
	}
	ok, err := Verify(realPassword, realHash)
	require.NoError(t, err)
	require.True(t, ok)
}

func TestHashThenVerifyRoundTrip(t *testing.T) {
	h, err := Hash("hunter2")
	require.NoError(t, err)
	ok, err := Verify("hunter2", h)
	require.NoError(t, err)
	require.True(t, ok)

	bad, err := Verify("wrong", h)
	require.NoError(t, err)
	require.False(t, bad)
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `go test ./internal/auth/passwordhash/ -v`
Expected: FAIL (undefined `Hash`/`Verify`).

- [ ] **Step 4: Implement argon2id hash/verify (adjust to Spike B findings)**

```go
package passwordhash

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Parameters: confirm against spikes/SPIKE-B-findings.md (Bun argon2id defaults).
const (
	argonTime    = 2
	argonMemory  = 19 * 1024 // 19 MiB (Bun default-ish; verify)
	argonThreads = 1
	argonKeyLen  = 32
	argonSaltLen = 16
)

// Hash produces a PHC-format argon2id string: $argon2id$v=19$m=...,t=...,p=...$salt$hash
func Hash(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// Verify checks a password against a PHC argon2id hash.
func Verify(password, encoded string) (bool, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errors.New("unsupported hash format")
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return false, err
	}
	var m uint32
	var t, p uint32
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false, err
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}
	got := argon2.IDKey([]byte(password), salt, t, m, uint8(p), uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
```

- [ ] **Step 5: Run round-trip; then fill the real hash and run the Bun-compat test**

Run: `go test ./internal/auth/passwordhash/ -run RoundTrip -v`
Expected: PASS.

Then paste the captured hash into `realHash`, and if Spike B shows different
encoding (e.g. base64 std vs rawstd, or different `m/t/p`), adjust `Verify`/params
to match. Run:
`go test ./internal/auth/passwordhash/ -run TestVerifyAcceptsBunHash -v`
Expected: PASS — Go verifies a real Bun-created hash. **This is the Spike B gate.**

- [ ] **Step 6: Write findings + commit**

Record the confirmed algorithm, params, and encoding in
`spikes/SPIKE-B-findings.md`, and the decision (match Bun exactly vs standardize
forward on this argon2id PHC format — acceptable since pre-production).
```bash
git add internal/auth/passwordhash/ spikes/SPIKE-B-findings.md
git commit -m "feat(auth): argon2id password hash/verify + Spike B findings"
```

---

## Task 13: Phase 0 wrap-up — docs + full test run

**Files:**
- Create: `saucy-menu-backend-go/docs/ENV.md`

- [ ] **Step 1: Document env vars**

Write `docs/ENV.md` listing every variable from `.env.example`, what it's for,
which downstream phase needs it, and where the real value comes from (Fly secret
name on `saucy-menu-backend`). Mark which are required for Phase 0 (`DATABASE_URL`,
`JWT_SECRET`, `BETTER_AUTH_SECRET`) vs later.

- [ ] **Step 2: Run the entire test suite**

Run:
```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/saucy-menu-backend-go"
set -a; source .env; set +a
go vet ./...
go test ./... -v
```
Expected: `go vet` clean; all tests PASS (the two spike "reference" tests enabled
and green after Tasks 11 & 12).

- [ ] **Step 3: Final commit**

```bash
git add docs/ENV.md
git commit -m "docs: env reference; Phase 0 foundation complete"
```

- [ ] **Step 4: STOP for user review**

Do **not** push. Surface to the user: Phase 0 is complete and locally green,
including both auth spikes proven. Await review before Phase 1.

---

## Self-Review Notes

- **Spec coverage:** Phase 0 of the design (§5) = scaffold, config, pgxpool, sqlc,
  logging, envelope, error mapping, CORS, health, one real read endpoint → Tasks
  1–9. Auth spikes A & B (§4.4, hard gate) → Tasks 10–12. ✓
- **Deviations documented:** Redis caching on `/setup` intentionally dropped in
  Phase 0 (Task 7) — response shape identical. ✓
- **Pre-production relaxation:** Spike B accepts "match the scheme" rather than
  "verify pre-existing prod hashes," per the design update. ✓
- **Placeholders:** the two spike-dependent tests (Tasks 11 & 12) ship with
  explicit `t.Skip`/`REPLACE_…` markers AND a step to fill them from the findings
  docs — this is deliberate (the real values are produced during the spike), not a
  vague placeholder. Every other step has complete code/commands.
- **Type consistency:** `WriteSuccess/WriteError`, `StatusAndMessage`, `NewAppError`,
  `LangContext/LangFromContext`, `SignToken/VerifyToken`, `Hash/Verify`,
  `sqlc.New`, `NewSetupHandler` are defined once and used consistently. ✓
- **Known follow-ups (next plans, not gaps here):** Phase 1 builds the auth
  middlewares + better-auth endpoints on top of Tasks 11–12; the diner JWT
  (`golang-jwt`) is Phase 1; module import path assumes the org repo name.
```