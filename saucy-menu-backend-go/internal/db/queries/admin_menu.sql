-- name: CreateMenu :one
INSERT INTO menu (id, restaurant_id, name, translation_status, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, 'pending', now(), now())
RETURNING id, name, description, active, start_time, end_time, created_at, updated_at;

-- name: GetMenuByIDForAdmin :one
SELECT id, name, description, translations, active, start_time, end_time, translation_status, created_at, updated_at
FROM menu WHERE id = $1 AND restaurant_id = $2;

-- name: ListMenuItemsByMenuForAdmin :many
SELECT id, name, description, translations, images, price, type, section_id, is_available,
       is_chefs_recommended, is_popular, is_new, is_limited_time, created_at
FROM menu_items WHERE section_id IN (
    SELECT id FROM menu_sections WHERE menu_id = $1
);

-- name: UpdateMenu :exec
UPDATE menu SET name = COALESCE(NULLIF($1, ''), name), description = COALESCE($2, description),
                active = COALESCE($3, active), start_time = COALESCE($4, start_time),
                end_time = COALESCE($5, end_time), translation_status = 'pending', updated_at = now()
WHERE id = $6 AND restaurant_id = $7;

-- name: DeleteMenu :exec
DELETE FROM menu WHERE id = $1 AND restaurant_id = $2;

-- name: ListMenusWithSections :many
SELECT m.id AS menu_id, m.name AS menu_name, m.translations AS menu_translations,
       ms.id AS section_id, ms.name AS section_name, ms.sort_order, ms.translations AS section_translations
FROM menu m
LEFT JOIN menu_sections ms ON ms.menu_id = m.id
WHERE m.restaurant_id = $1
ORDER BY m.created_at, ms.sort_order;

-- name: MenuBelongsToRestaurant :one
SELECT id FROM menu WHERE id = $1 AND restaurant_id = $2;

-- name: SectionBelongsToRestaurant :one
SELECT ms.id FROM menu_sections ms
JOIN menu m ON ms.menu_id = m.id
WHERE ms.id = $1 AND m.restaurant_id = $2;

-- name: CreateMenuSection :one
INSERT INTO menu_sections (id, menu_id, name, description, created_at)
VALUES (gen_random_uuid(), $1, lower($2), $3, now())
RETURNING id;

-- name: GetMenuSectionByID :one
SELECT ms.id, ms.menu_id, ms.name, ms.description
FROM menu_sections ms
JOIN menu m ON ms.menu_id = m.id
WHERE ms.id = $1 AND m.restaurant_id = $2;

-- name: ListAdminSectionsByMenu :many
SELECT id, name, sort_order, menu_id, description, translations
FROM menu_sections WHERE menu_id = $1 ORDER BY sort_order DESC;

-- name: UpdateMenuSection :exec
UPDATE menu_sections SET name = COALESCE(NULLIF(lower($1), ''), name),
                         description = COALESCE($2, description),
                         translation_status = 'pending'
WHERE menu_sections.id = $3
  AND menu_sections.menu_id IN (SELECT m.id FROM menu m WHERE m.restaurant_id = $4);

-- name: DeleteMenuSection :exec
DELETE FROM menu_sections WHERE menu_sections.id = $1
  AND menu_sections.menu_id IN (SELECT m.id FROM menu m WHERE m.restaurant_id = $2);

-- name: MoveMenuItemsToSection :exec
UPDATE menu_items SET section_id = $1 WHERE section_id = $2;

-- name: CreateMenuItem :one
INSERT INTO menu_items (id, section_id, restaurant_id, name, description, images, price, type,
    discount_type, discount_value, discount_start_at, discount_end_at, discount_label,
    ingredients, is_available, spice_level, cook_time, is_alcoholic, has_variants,
    is_chefs_recommended, is_popular, is_new, is_limited_time, translation_status, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
    $19, $20, $21, $22, 'pending', now())
RETURNING id;

-- name: CountMenuItemsForAdmin :one
SELECT COUNT(*) FROM menu_items
WHERE restaurant_id = $1
  AND (NOT $2 OR section_id = $3)
  AND (NOT $4 OR lower(name) LIKE $5);

-- name: ListMenuItemsForAdmin :many
SELECT id, section_id, name, description, translations, images, price, type,
       discount_type, discount_value, discount_label, is_available,
       is_chefs_recommended, is_popular, is_new, is_limited_time, has_variants,
       cook_time, spice_level, is_alcoholic, created_at
FROM menu_items
WHERE restaurant_id = $1
  AND (NOT $2 OR section_id = $3)
  AND (NOT $4 OR lower(name) LIKE $5)
ORDER BY created_at DESC
LIMIT $6 OFFSET $7;

-- name: GetAdminMenuItemByID :one
SELECT id, section_id, name, description, translations, ingredients, images, price, type,
       discount_type, discount_value, discount_start_at, discount_end_at, discount_label,
       is_available, spice_level, cook_time, is_alcoholic, has_variants,
       is_chefs_recommended, is_popular, is_new, is_limited_time, created_at
FROM menu_items WHERE id = $1 AND restaurant_id = $2;

-- name: UpdateMenuItem :exec
UPDATE menu_items SET
    name        = COALESCE(NULLIF($1, ''), name),
    description = COALESCE($2, description),
    images      = COALESCE($3, images),
    price       = COALESCE($4, price),
    discount_type       = COALESCE($5, discount_type),
    discount_value      = COALESCE($6, discount_value),
    discount_start_at   = COALESCE($7, discount_start_at),
    discount_end_at     = COALESCE($8, discount_end_at),
    discount_label      = COALESCE($9, discount_label),
    ingredients         = COALESCE($10, ingredients),
    is_available        = COALESCE($11, is_available),
    spice_level         = COALESCE($12, spice_level),
    cook_time           = COALESCE($13, cook_time),
    is_alcoholic        = COALESCE($14, is_alcoholic),
    has_variants        = COALESCE($15, has_variants),
    is_chefs_recommended= COALESCE($16, is_chefs_recommended),
    is_popular          = COALESCE($17, is_popular),
    is_new              = COALESCE($18, is_new),
    is_limited_time     = COALESCE($19, is_limited_time),
    translation_status  = 'pending'
WHERE id = $20 AND restaurant_id = $21;

-- name: DeleteMenuItem :exec
DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2;

-- name: DeleteMenuItemAllergens :exec
DELETE FROM menu_item_allergens WHERE menu_item_id = $1;

-- name: InsertMenuItemAllergen :exec
INSERT INTO menu_item_allergens (id, menu_item_id, allergen_id)
VALUES (gen_random_uuid(), $1, $2)
ON CONFLICT DO NOTHING;

-- name: DeleteMenuItemVariants :exec
DELETE FROM menu_item_variants WHERE item_id = $1;

-- name: InsertMenuItemVariant :one
INSERT INTO menu_item_variants (id, item_id, name, price, is_available, image, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, true, $4, now())
RETURNING id;

-- name: DeleteMenuItemAddons :exec
DELETE FROM menu_item_addons WHERE item_id = $1;

-- name: InsertMenuItemAddon :exec
INSERT INTO menu_item_addons (item_id, addon_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DeleteMenuItemTags :exec
DELETE FROM menu_item_tags WHERE menu_item_id = $1;

-- name: InsertMenuItemTag :exec
INSERT INTO menu_item_tags (id, menu_item_id, tag_id)
VALUES (gen_random_uuid(), $1, $2)
ON CONFLICT DO NOTHING;
