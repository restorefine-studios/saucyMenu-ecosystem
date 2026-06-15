-- name: FindUserByEmail :one
SELECT id, email, name, role, restaurant_id, language_id, setup_complete,
       created_at, updated_at, email_verified, image, suspended, banned, ban_reason, ban_expires
FROM users
WHERE lower(email) = lower($1)
LIMIT 1;

-- name: FindUserByID :one
SELECT id, email, name, role, restaurant_id, language_id, setup_complete,
       created_at, updated_at, email_verified, image, suspended, banned, ban_reason, ban_expires
FROM users
WHERE id = $1;

-- name: FindCredentialAccount :one
SELECT id, account_id, provider_id, user_id, password, created_at, updated_at
FROM account
WHERE user_id = $1 AND provider_id = 'credential'
LIMIT 1;

-- name: IsRestaurantSuspended :one
SELECT r.suspended
FROM users u
JOIN restaurants r ON r.id = u.restaurant_id
WHERE u.id = $1;

-- name: CreateSession :one
INSERT INTO session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
VALUES (gen_random_uuid(), $1, $2, now(), now(), $3, $4, $5)
RETURNING *;

-- name: GetSessionByToken :one
SELECT * FROM session
WHERE token = $1 AND expires_at > now();

-- name: DeleteSessionByToken :exec
DELETE FROM session WHERE token = $1;

-- name: GetUserCurrency :one
SELECT c.id, c.code, c.name, c.symbol
FROM users u
JOIN restaurants r ON r.id = u.restaurant_id
JOIN currencies c ON c.id = r."currencyId"
WHERE u.id = $1;

-- name: CreateUser :one
INSERT INTO users (id, email, name, email_verified, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, false, now(), now())
RETURNING id, email, name, role, restaurant_id, language_id, setup_complete,
          created_at, updated_at, email_verified, image, suspended, banned, ban_reason, ban_expires;

-- name: CreateCredentialAccount :exec
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (gen_random_uuid(), $1, 'credential', $2, $3, now(), now());

-- name: CreateVerification :exec
INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, $3, now(), now());

-- name: GetVerificationByIdentifier :one
SELECT * FROM verification
WHERE identifier = $1 AND expires_at > now();

-- name: DeleteVerificationByIdentifier :exec
DELETE FROM verification WHERE identifier = $1;

-- name: UpdateVerificationValue :exec
UPDATE verification SET value = $1, updated_at = now() WHERE identifier = $2;

-- name: UpdateUserEmailVerified :exec
UPDATE users SET email_verified = true, updated_at = now()
WHERE id = $1;

-- name: UpdateAccountPassword :exec
UPDATE account SET password = $1, updated_at = now()
WHERE user_id = $2 AND provider_id = 'credential';

-- name: SetSessionImpersonatedBy :exec
UPDATE session SET impersonated_by = $1, updated_at = now()
WHERE id = $2;

-- name: BanUser :exec
UPDATE users SET banned = $1, ban_reason = $2, ban_expires = $3, updated_at = now()
WHERE id = $4;

-- name: CreateUserSession :one
INSERT INTO user_sessions (id, restaurant_id, created_at)
VALUES (gen_random_uuid(), $1, now())
RETURNING id;

-- name: GetUserSessionCurrency :one
SELECT c.id, c.code, c.name, c.symbol
FROM user_sessions us
JOIN restaurants r ON r.id = us.restaurant_id
JOIN currencies c ON c.id = r."currencyId"
WHERE us.id = $1;
