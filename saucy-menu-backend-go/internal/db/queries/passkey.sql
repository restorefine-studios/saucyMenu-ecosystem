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
