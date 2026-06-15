# Saucy Menu Backend — Go Migration Design

**Date:** 2026-05-31
**Status:** Draft for review
**Author:** Prabish + Claude

---

## 1. Goal & Non-Goals

### Goal
Port the existing Bun/Elysia/TypeScript backend (`saucy-menu-backend`, ~8,100 LOC)
to Go, producing a faster, higher-concurrency, more maintainable service that is
**behaviorally identical** to the current backend from the perspective of all
three client apps.

The motivations (in the user's words): the current backend feels like "old scroll"
(tangled Drizzle queries), Go can "handle larger requests and make the site much
faster," and the project was "poorly done by someone" — we want to make it
"prominent and best."

### Non-Goals (explicitly deferred to a later phase)
- **No database redesign.** Same Neon Postgres, same tables, same columns. The DB
  cleanup ("make it professional") happens *after* the frontend is settled.
- **No frontend changes.** `restaurant-admin`, `super-admin`, and `end-user-app`
  must keep working with zero code changes.
- **No auth redesign.** The weak hand-rolled `END_USER` JWT is ported *as-is* with
  a `TODO: harden` marker; it is not fixed during the port (fixing it would require
  touching `end-user-app`).
- **No new features.** Strict behavioral parity. Bugs are preserved unless they
  block the port, and any preserved bug is documented.

> **Update (2026-05-31): the backend is NOT in production yet.** This means we do
> NOT need to preserve existing sessions or password hashes. Contract parity with
> the three frontend clients is still required (they use the better-auth client
> library + the diner JWT shape), but data-preservation acceptance criteria in the
> auth spikes are relaxed — Spike B becomes "produce hashes the frontends'
> better-auth flow accepts," not "verify pre-existing prod hashes." Also: we build
> everything locally and **do not push to any remote** until the user reviews.

---

## 2. System Context (verified from real code)

There are **5 apps** in the `restorefine-studios` GitHub org. Only the backend is
being ported; the other four are clients or unrelated.

| App | Repo | Deploy target | Talks to backend? | Auth used |
|---|---|---|---|---|
| **Backend** | `saucy-menu-backend` | Fly.io (`saucy-menu-backend-staging.fly.dev`, prod `saucy-menu-backend`) | — | — |
| Restaurant admin | `restaurant-admin` | `dashboard.saucymenu.com` | Yes | **better-auth cookies** |
| Super admin | `super-admin` | `super-admin-79d.pages.dev` | Yes | **better-auth cookies** (+ admin plugin) |
| Diner app | `end-user-app` | `menu.saucymenu.com` | Yes | **hand-rolled JWT** (`END_USER`) |
| Marketing site | `saucymenu-ai` | (Vercel) | No (uses Supabase) | n/a |

All three real clients are cloned locally for contract verification:
`../restaurant-admin`, `../super-admin`, `../end-user-app`.

### The hard contract (what the Go backend MUST reproduce)
1. **Same route paths** under `/admin/*`, `/super/*`, `/user/*`, `/shared/*`,
   `/webhook/*`, plus the better-auth handler mounted at `/auth/*` (better-auth
   client `baseURL = SERVER_URL + "/auth"`).
2. **Same response envelope:** `{ success, data, message }` (clients read
   `res.data.data`, `res.data.message`).
3. **Same better-auth behavior:** cookie name prefix `saucy-menu-auth`, signed
   cookies, `sameSite=none; secure`, `credentials: include`. Endpoints actually
   used by clients: `sign-in/email`, `sign-up/email`, `sign-out`, `get-session`
   (with custom `currency` field injected), `email-otp/*`, and admin-plugin routes
   (impersonation → `impersonatedBy`).
4. **Same JWT flow for diners:** `POST /user/auth/session { restaurantId }` →
   `{ success, data: { sessionId, token, currency } }`, token signed with
   `JWT_SECRET`, claims `{ id, restaurantId, role: "END_USER", sessionId }`.
   Client sends `Authorization: Bearer <token>` + `lang` header.
5. **Same `lang` header behavior:** drives DeepL on-the-fly translation of
   `message`/`title` fields in responses, and per-row translation resolution.
6. **Same CORS trusted origins** (localhost dev ports + the three prod domains).
7. **Same media URL convention:** stored paths are relative; clients prepend
   `VITE_APP_MEDIA_URL` (`https://media.saucymenu.com/`).

---

## 3. Current Backend Inventory (what we're porting)

### Route groups (LOC)
- `/admin/*` — restaurant-admin API. Biggest surface. Auth (`auth.route.ts` 451),
  menu items (479), menu (274), bulk-menu service (503), sections (173),
  classifications (167), tags (146), addons (150), reviews, stats (70),
  subscriptions (123) + cron (93), audit.
- `/super/*` — super-admin API. Restaurants (241), auth (127), stats (85),
  subscriptions (67).
- `/user/*` — diner app API. Menu items (254), menu (188), drinks (125),
  preferences (137), AI chat (168), classifications (61), sections (51), reviews,
  auth/session (137).
- `/shared/*` — `auth` (forgot/verify/reset password, 117) + `base/setup` (112).
- `/webhook/stripe` — Stripe webhook handler (232), signature-verified.

### Cross-cutting concerns
- **Auth:** better-auth (cookies, OTP, admin plugin, custom session) for admins;
  hand-rolled `@elysiajs/jwt` for diners. Password hashing overridden to
  `Bun.password.hash`/`verify` (**argon2id** — critical for Go parity).
- **DB:** Drizzle ORM over Neon serverless Postgres (`drizzle-orm/neon-serverless`,
  `Pool`). ~25 tables across 10 schema files. Heavy use of `db.query.*` relational
  queries with nested `with`.
- **Queues:** Bee-Queue on Upstash Redis (TLS). Two queues: `dish-upload`,
  `drink-upload` (bulk Excel import → image upload → row insert). Plus an in-process
  `TranslationQueue` (concurrency 3) wrapping DeepL.
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/openai`) streaming `gpt-4o-mini`. Two
  endpoints: menu-wide chat and per-item chat. Returns a raw text stream
  (`text/plain`), client reads it incrementally and sniffs for a JSON
  `{ type: "menuItemResults" | "dishResults", ... }` payload.
- **Stripe:** subscriptions, checkout, webhooks, metered AI-token billing
  (`billing.meterEvents`), idempotent pending-event table, 2 cron jobs (sync every
  6h, process pending every 5m).
- **Translation:** DeepL (`deepl-node`). On-write: build translations for all
  `SUPPORTED_LANGUAGES` into a `translations` jsonb column. On-read: middleware
  translates `message`/`title` in the response when `lang != en`.
- **Storage:** Cloudflare R2. Two paths — Bun's native `S3Client` (in `index.ts`)
  and an external upload microservice (`UPLOAD_SERVICE_URL`, `deleteFromR2`).
- **Email:** Plunk (`@plunk/node`), React-email templates rendered to HTML (OTP,
  reset password, welcome, account release).
- **Excel:** `exceljs` — parse `.xlsx` with embedded images by cell position
  (`parseExcelWithImages`).
- **Logging:** pino + pino-pretty (+ Logtail transport).

### Environment variables (from `env.d.ts` + `fly.toml`)
`JWT_SECRET`, `DATABASE_URL`, `NODE_ENV`, `PLUNK_SECRET_KEY`, `UPSTASH_REDIS_URL`,
`REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PINO_TOKEN`, `PINO_SOURCE_URL`, `UPLOAD_SERVICE_URL`, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `DEEPL_API_KEY`,
`BETTER_AUTH_URL`, `MEDIA_SERVICE_URL`, `PORT`.

---

## 4. Target Go Architecture

### 4.1 Stack (recommended, "boring and proven")

| Concern | Choice | Rationale |
|---|---|---|
| Language | Go 1.23+ | Stated goal |
| HTTP router | **chi** (`go-chi/chi/v5`) | Tiny, idiomatic `net/http`, easy middleware groups that map 1:1 to Elysia's grouped routers |
| DB access | **sqlc** + **pgx/v5** | Write SQL, get typed Go. Replaces "old scroll" Drizzle queries with explicit, reviewable SQL. No ORM magic |
| Migrations | keep **drizzle-kit** (unchanged) this phase | DB is frozen; do not introduce a second migration tool yet. Fly release command stays as-is until cutover, then swapped to a no-op/`goose` later |
| Validation | **go-playground/validator** | Mirrors Zod/Elysia `t.Object` request schemas |
| Auth (admin) | hand-rolled better-auth-compatible package | No Go port exists; reproduce the contract (see §4.4) |
| Auth (diner) | `golang-jwt/jwt/v5` | Reproduce existing HS256 JWT exactly |
| Password hash | `golang.org/x/crypto/argon2` (+ scrypt fallback) | Must verify existing Bun-hashed passwords (see §4.4 spike) |
| Queues | **asynq** (Redis) | Replaces Bee-Queue; same Upstash Redis, supports TLS, retries, scheduler |
| Cron | asynq scheduler **or** `robfig/cron` | Replaces `@elysiajs/cron` |
| AI | `openai/openai-go` (official) | Streaming chat completions |
| Stripe | `stripe/stripe-go/v8x` (official) | Webhooks, subscriptions, meter events |
| Excel | `xuri/excelize/v2` | Parse `.xlsx` incl. embedded images by anchor |
| Email | Plunk via plain HTTP (`net/http`) + `html/template` | No official Go SDK; Plunk REST API is simple. Port React-email templates to Go templates |
| R2 | external upload service via HTTP (as today) + `aws-sdk-go-v2/s3` for the native path | Mirror both existing paths |
| Logging | **zerolog** or **slog** | Structured JSON logs; slog is stdlib |
| Config | `caarlos0/env` or stdlib | Typed env loading, fail-fast on missing required vars |

### 4.2 Project layout

```
saucy-menu-backend-go/
  cmd/
    server/main.go         # HTTP server entrypoint
    worker/main.go         # asynq worker entrypoint (queues + cron)
  internal/
    config/                # env loading, typed Config struct
    db/
      sqlc/                # generated code (queries.sql.go, models.go)
      queries/             # *.sql hand-written queries (sqlc input)
      db.go                # pgxpool setup
    httpx/                 # response envelope, error mapping, lang middleware
    auth/
      betterauth/          # cookie/session/OTP/admin-compatible impl
      jwt/                 # END_USER token sign/verify
      middleware.go        # adminAuth, superAdminAuth, userAuth
    handlers/
      admin/               # one file per resource, maps to old route files
      super/
      user/
      shared/
      webhook/
    services/
      menu/ subscriptions/ translation/ ai/ stats/ ...
    queue/
      tasks.go             # task type defs + payloads
      dishupload.go drinkupload.go
    integrations/
      stripe/ deepl/ openai/ plunk/ r2/
    email/                 # templates + render
    excel/                 # parseExcelWithImages equivalent
  migrations/              # (symlink/reference to existing drizzle output; not owned yet)
  docs/
  Dockerfile
  fly.toml
  go.mod
```

### 4.3 Request lifecycle (parity with Elysia middleware chain)
1. **Recover** panic → 500 `{ message }`.
2. **Request logging** (method, url, status, duration, ip, ua) — matches the pino
   `logRequest` derive.
3. **CORS** — same trusted origins, `credentials` allowed.
4. **Route to group** → group-level auth middleware:
   - `/admin/*` → better-auth session, require `role == "admin"`... *(see §4.4
     note: current code is inconsistent — `authPlugin` requires `role=="user"`,
     `superAdminAuthPlugin` requires `role=="admin"`. We reproduce the **actual
     wiring per route group**, not the misleading names.)*
   - `/super/*` → better-auth session, role check.
   - `/user/*` → JWT `END_USER`.
   - `/shared/*`, `/webhook/*` → public / signature-verified.
5. **Handler** → service → sqlc query.
6. **Response envelope** `{ success, data, message }`.
7. **Translation middleware** (`onAfterHandle`): if `lang` header set and != en,
   DeepL-translate `message`/`title` string fields before sending.
8. **Error mapping** (`onError`): map known errors to status + `{ message }`,
   mirroring the Elysia `onError` (VALIDATION→400, NOT_FOUND→404, PARSE→400, else
   use error's status or 500).

### 4.4 Auth — the high-risk component (REQUIRES A SPIKE BEFORE BUILDING)

better-auth has **no Go port**, so we reimplement the exact HTTP/cookie contract.
Two things must be reverse-engineered precisely from the better-auth `^1.5.4`
source and the live staging DB **before** writing the Go auth package:

**Spike A — Cookie format & signing.**
better-auth issues a signed session cookie named `saucy-menu-auth.session_token`
(prefix + `.session_token`). Determine: exact cookie name(s) incl. any
`__Secure-` prefixing, the value encoding (`token` vs `token.signature`), the HMAC
algorithm and the secret source (`BETTER_AUTH_SECRET`/`secret`), and how
`get-session` validates it. Acceptance: a cookie minted by the current Bun server
validates in Go, and vice-versa, against the same DB `session` row.

**Spike B — Password hash format.**
`lib/auth.ts` overrides hashing with `Bun.password.hash(password)` /
`Bun.password.verify`. Bun's default is **argon2id**. Confirm the exact algorithm,
parameters, and encoded string format of existing rows in the `account.password`
column, then implement a verifier in Go that accepts those hashes unchanged.
Acceptance: an existing admin can log in via the Go server with their current
password. New signups produce hashes the old server could also verify (or we
standardize forward — decision recorded in the spike).

**Endpoints to reproduce** (mounted at `/auth/*`, consumed by better-auth client):
- `POST /auth/sign-in/email`, `POST /auth/sign-up/email`, `POST /auth/sign-out`
- `GET  /auth/get-session` → returns `{ session, user }` with extra
  `user.currency` (from `getUserCurrencyAndLanguage`) and additional fields
  `restaurantId`, `languageId`, `setupComplete`.
- `POST /auth/email-otp/send-verification-otp`, `.../verify-email`,
  change-email + forget-password OTP flows (client uses
  `authClient.emailOtp.requestPasswordReset`).
- Admin plugin routes used by super-admin (`adminClient()`): impersonation
  (`impersonatedBy` column), ban fields (`banned`, `banReason`, `banExpires`).
- `databaseHooks.session.create.before`: reject login if the user's restaurant is
  `suspended` (FORBIDDEN). Must be reproduced.

**Diner JWT** (`/user/auth/session`): HS256 over `JWT_SECRET`, claims
`{ id, restaurantId, role:"END_USER", sessionId }`. `userAuthPlugin` verifies the
Bearer token and requires `role == "END_USER"`. Port verbatim. **Marked
`TODO: harden` for the later auth-cleanup phase.**

> The two admin frontends rely entirely on better-auth's client library, so the
> server contract must match byte-for-byte. This is the single biggest risk in the
> project and the spike is a hard gate before Phase 1 build.

### 4.5 Data access — replacing "old scroll" Drizzle queries
Drizzle's `db.query.*` with nested `with` becomes explicit SQL in `internal/db/queries/`,
compiled by sqlc into typed methods. Relational/nested results (e.g. menu item +
tags + addons + allergens) are assembled either via SQL `json_agg`/`LEFT JOIN` +
row mapping, or via a small number of follow-up queries — whichever is clearer per
case. This is where the "make it readable" goal is realized: every query is visible,
typed, and reviewable. Schema is **read** from the existing DB; we do not change it.

`numeric` price columns → `pgtype.Numeric` (or string) to avoid float rounding.
`jsonb translations` → `map[string]map[string]string` via `json.RawMessage`.
`text[]` arrays (`ingredients`, `images`) → `[]string` via pgx array support.

### 4.6 Queues & workers
A separate `cmd/worker` process runs asynq workers + the cron scheduler (mirrors
the current setup where the web process also drains Bee-Queue and runs
`@elysiajs/cron`). Tasks: `dish:upload`, `drink:upload` (payload = uploaded file
ref + restaurant context), processed by parsing the Excel, uploading images to R2
via the upload service, and inserting rows. Translation building (DeepL) becomes a
task or a bounded worker pool (concurrency 3, matching `TranslationQueue`). Cron:
`syncSubscriptions` (every 6h), `processPendingStripeEvents` (every 5m).

Same Upstash Redis (TLS). asynq supports `tls.Config` for `rediss://`.

### 4.7 Streaming AI
chi handler sets `Content-Type: text/plain; charset=utf-8`, flushes the OpenAI
stream chunk-by-chunk using `http.Flusher`. The system prompts (menu JSON, per-item
JSON) and the JSON-sniffing output contract are reproduced exactly so the diner
app's incremental parser keeps working. Note: the diner app posts to `/api/chat`
(its own proxy/route) which forwards to the backend — confirm the exact backend
path during Phase 2 (the backend file is `user/menu/ai.route.ts` at `/user/.../ai`).

---

## 5. Migration Strategy — Phased / Strangler (side-by-side on staging)

Build incrementally; run the Go service next to the Bun service on staging. After
each phase, point a staging client env (`VITE_APP_SERVER_URL`) at the Go service
and verify before moving on. Can stop or ship at any phase boundary.

- **Phase 0 — Foundation.** Repo scaffold, config, `pgxpool`, sqlc wired to the
  existing DB, logging, response envelope, error mapping, CORS, health check,
  Dockerfile, Fly app (staging). Deliverable: server boots, `/healthz` works,
  one trivial read endpoint returns real DB data.
- **Phase 1 — Auth (after Spikes A & B pass).** better-auth-compatible package +
  diner JWT + the three auth middlewares. Deliverable: an existing admin logs in
  from `restaurant-admin` (staging) against Go; `get-session` returns correct
  shape incl. `currency`; suspended-restaurant block works; diner `/user/auth/session`
  issues a working token.
- **Phase 2 — `/shared` + `/user` (diner app).** Lowest-risk business surface,
  highest traffic. Includes AI streaming, preferences, menu read endpoints.
  Deliverable: `end-user-app` (staging) fully functional on Go.
- **Phase 3 — `/admin` (largest).** All restaurant-admin endpoints incl. bulk
  Excel upload (→ queue), menu CRUD, classifications, tags, addons, stats, audit.
  Deliverable: `restaurant-admin` (staging) fully functional on Go.
- **Phase 4 — `/super` + webhooks + Stripe + cron.** super-admin endpoints,
  Stripe webhook (signature parity), subscription cron jobs, metered billing.
  Deliverable: `super-admin` (staging) functional; webhooks verified with Stripe
  CLI; cron jobs running in worker.
- **Phase 5 — Background jobs hardening + cutover.** Queues (dish/drink upload),
  DeepL translation jobs, email, R2 fully validated under load. Production cutover:
  switch DNS/Fly app, keep Bun deployable for instant rollback for ~1–2 weeks.

Each phase ends with: parity tests green, manual smoke test from the relevant
staging client, and a short written verification note.

---

## 6. Testing & Verification

- **Golden/contract tests:** for representative endpoints, capture the Bun
  response (status, headers, JSON) and assert the Go response matches. Drive both
  against the same staging DB snapshot.
- **Auth conformance:** automated tests that a Bun-minted cookie validates in Go
  and a Go-minted cookie validates in Bun (during overlap); existing password
  hashes verify.
- **Per-phase smoke tests:** run the real client app against the Go staging URL.
- **Stripe webhooks:** `stripe listen` / fixtures replayed against both backends,
  assert identical DB mutations.
- **Load check:** basic `k6`/`vegeta` comparison (Bun vs Go) on hot read paths to
  confirm the performance goal is actually met.
- Unit tests for pure logic (translation resolution, Excel parsing, envelope/error
  mapping, JWT claims).

---

## 7. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| better-auth cookie/session format mismatch | **High** | Spike A is a hard gate; cross-validate cookies both directions before any admin endpoint is built |
| Password hash format mismatch (argon2id params) | **High** | Spike B against real `account.password` rows; verifier must accept existing hashes |
| `numeric` price rounding | Medium | Use `pgtype.Numeric`/string end-to-end; never float |
| Nested relational queries hard to reproduce | Medium | Explicit SQL with `json_agg`; assemble in Go; covered by golden tests |
| Streaming/flush differences break diner chat | Medium | Reproduce `text/plain` + chunked flush + JSON-sniff contract; test against real client parser |
| Stripe API version / event-shape drift | Medium | Pin `apiVersion` `2025-04-30.basil`; replay real events; preserve pending-event idempotency table |
| Redis TLS (Upstash) config in asynq | Low | Configure `tls.Config`; verify connect early in Phase 0 |
| Hidden behavior in name-misleading auth plugins | Medium | Port by **actual wiring per route group**, not plugin names; document each |
| Bun-native S3 path vs upload service | Low | Mirror both; prefer the HTTP upload service path used elsewhere |

---

## 8. Open Questions (to resolve before/during Phase 0–1)
1. Exact backend path the diner chat hits (client posts to its own `/api/chat`
   proxy → which backend route?). Confirm in Phase 2.
2. `BETTER_AUTH_SECRET` value/availability for cookie signing parity (Spike A).
3. Whether new password hashes should stay Bun-compatible or standardize forward
   (decided in Spike B).
4. Go migration-tool choice for the *later* DB phase (goose vs atlas vs golang-migrate)
   — out of scope now, noted for continuity.

---

## 9. Definition of Done (for the whole migration)
- All `/admin`, `/super`, `/user`, `/shared`, `/webhook`, `/auth` routes ported with
  parity (golden tests green).
- All three real clients work against the Go backend on staging with **zero client
  code changes**.
- Queues, cron, Stripe webhooks, DeepL, OpenAI streaming, R2, email all functional.
- Production cutover complete with Bun retained for rollback.
- Documented `TODO`s for the deferred auth-hardening and DB-professionalization phase.
```