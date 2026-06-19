-- name: GetFormFieldConfig :one
SELECT form_key, config, updated_at, updated_by
FROM form_field_configs
WHERE form_key = $1;

-- name: UpsertFormFieldConfig :exec
INSERT INTO form_field_configs (form_key, config, updated_at, updated_by)
VALUES ($1, $2::jsonb, now(), $3)
ON CONFLICT (form_key) DO UPDATE
  SET config = $2::jsonb, updated_at = now(), updated_by = $3;
