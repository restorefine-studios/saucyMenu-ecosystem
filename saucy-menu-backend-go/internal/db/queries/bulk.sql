-- name: FindAddonByName :one
SELECT id FROM addons WHERE lower(name) = lower($1) AND restaurant_id = $2 LIMIT 1;

-- name: FindAllergenByName :one
SELECT id FROM allergens WHERE lower(name) = lower($1) LIMIT 1;

-- name: FindMenuSectionByName :one
SELECT id FROM menu_sections WHERE lower(name) = lower($1) AND menu_id = $2 LIMIT 1;

-- name: FindDietTagByName :one
SELECT id FROM tags WHERE lower(name) = lower($1) AND type = 'diet' AND restaurant_id = $2 LIMIT 1;

-- name: BulkInsertMenuItemAllergen :exec
INSERT INTO menu_item_allergens (id, menu_item_id, allergen_id, severity)
VALUES (gen_random_uuid(), $1, $2, $3)
ON CONFLICT DO NOTHING;

-- Translation update queries (called by the worker after DeepL)
-- name: UpdateMenuItemTranslations :exec
UPDATE menu_items SET translations = $1, translation_status = $2 WHERE id = $3;

-- name: UpdateMenuTranslations :exec
UPDATE menu SET translations = $1, translation_status = $2 WHERE id = $3;

-- name: UpdateMenuSectionTranslations :exec
UPDATE menu_sections SET translations = $1, translation_status = $2 WHERE id = $3;

-- name: UpdateTagTranslations :exec
UPDATE tags SET translations = $1, translation_status = $2 WHERE id = $3;

-- name: UpdateAddonTranslations :exec
UPDATE addons SET translations = $1, translation_status = $2 WHERE id = $3;

-- name: UpdateMenuItemVariantTranslations :exec
UPDATE menu_item_variants SET translations = $1, translation_status = $2 WHERE id = $3;
