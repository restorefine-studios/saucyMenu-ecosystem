# Environment Variables

## Phase 0 (required now)

| Variable | Description | Fly secret (prod) |
|---|---|---|
| `DATABASE_URL` | Supabase transaction-mode pooler URL (port 6543, pgbouncer=true) | `DATABASE_URL` |
| `DIRECT_URL` | Supabase direct/session URL (port 5432, for migrations) | — |
| `JWT_SECRET` | HS256 secret for signing `END_USER` diner JWTs | `JWT_SECRET` |
| `BETTER_AUTH_SECRET` | HMAC secret for better-auth session cookies | `BETTER_AUTH_SECRET` |
| `BETTER_AUTH_URL` | Public URL of this server (drives secure-cookie prefix) | `BETTER_AUTH_URL` |
| `PORT` | HTTP listen port (default `8080`) | set via `fly.toml` |
| `NODE_ENV` | `development` or `production` (gates localhost CORS origins) | `NODE_ENV` |

## Phase 1 (auth routes)

All Phase 0 vars, plus:

| Variable | Description | Fly secret |
|---|---|---|
| `RESEND_API_KEY` | Resend email API key (OTP, welcome, reset-password emails) | `RESEND_API_KEY` |

## Phase 2+ (integrations)

| Variable | Description | Fly secret |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for AI chat routes | `OPENAI_API_KEY` |
| `DEEPL_API_KEY` | DeepL translation API key | `DEEPL_API_KEY` |
| `UPSTASH_REDIS_URL` | Redis URL for queues + caching | `UPSTASH_REDIS_URL` |
| `UPLOAD_SERVICE_URL` | Internal image upload microservice URL | `UPLOAD_SERVICE_URL` |
| `MEDIA_SERVICE_URL` | Public CDN base URL for media paths | `MEDIA_SERVICE_URL` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | `R2_ACCOUNT_ID` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key | `R2_ACCESS_KEY_ID` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret | `R2_SECRET_ACCESS_KEY` |
| `R2_BUCKET_NAME` | Cloudflare R2 bucket name | `R2_BUCKET_NAME` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `STRIPE_SECRET_KEY` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `STRIPE_WEBHOOK_SECRET` |

## Notes

- Supabase uses **two different connection strings**: the transaction-mode pooler (`DATABASE_URL`, port 6543) for the running app, and the direct URL (`DIRECT_URL`, port 5432) for schema migrations. The Go server only uses `DATABASE_URL` at runtime.
- `BETTER_AUTH_URL` starting with `https://` triggers the `__Secure-` cookie prefix. In development, use `http://localhost:8080`.
- `NODE_ENV=development` adds `localhost:5173` and `localhost:5174` to the CORS allowed origins. Never set this in production.
