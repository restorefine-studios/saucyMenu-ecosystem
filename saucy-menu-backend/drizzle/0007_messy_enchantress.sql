INSERT INTO "account" (
    id,
    account_id,
    provider_id,
    user_id,
    password,
    created_at,
    updated_at
)
SELECT
    pg_catalog.gen_random_uuid(),  -- generate new UUID for each account
    id::text,                       -- accountId = the user's own id (credential provider convention)
    'credential',                   -- providerId for email/password auth in better-auth
    id,                             -- userId foreign key
    password,                       -- migrate the password across
    created_at,
    updated_at
FROM "users"
WHERE password IS NOT NULL;        -- only users with a password (skip OAuth-only users)

ALTER TABLE "users" DROP COLUMN "password";--> statement-breakpoint