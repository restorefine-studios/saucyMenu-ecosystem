-- name: ListMenusByRestaurant :many
SELECT id, name, description, translations, active, start_time, end_time, created_at, updated_at
FROM menu
WHERE restaurant_id = $1;

-- name: ListMenuItemImagesForMenu :many
SELECT ms.menu_id, mi.images
FROM menu_sections ms
JOIN menu_items mi ON mi.section_id = ms.id
WHERE ms.menu_id = $1 AND array_length(mi.images, 1) > 0
ORDER BY mi.created_at;

-- name: ListAllMenuItemsForRestaurant :many
SELECT mi.id, mi.name, mi.description, mi.translations, mi.images, mi.price, mi.type,
       mi.section_id, mi.is_available, mi.created_at,
       ms.id AS ms_id, ms.name AS ms_name, ms.sort_order AS ms_sort_order,
       ms.translations AS ms_translations
FROM menu_items mi
LEFT JOIN menu_sections ms ON mi.section_id = ms.id
WHERE mi.restaurant_id = $1;

-- name: ListMenuItemsByMenu :many
SELECT mi.id, mi.section_id, mi.name, mi.description, mi.translations, mi.images, mi.price,
       mi.discount_type, mi.discount_value, mi.discount_start_at, mi.discount_end_at,
       mi.discount_label, mi.is_available, mi.spice_level, mi.cook_time, mi.is_alcoholic,
       mi.has_variants, mi.is_chefs_recommended, mi.is_popular, mi.is_new, mi.is_limited_time,
       mi.created_at, mi.type
FROM menu_items mi
JOIN menu_sections ms ON mi.section_id = ms.id
WHERE ms.menu_id = $1 AND mi.restaurant_id = $2
ORDER BY mi.created_at DESC;

-- name: GetMenuItemDetailByID :one
SELECT id, section_id, name, description, translations, ingredients, images, price,
       discount_type, discount_value, discount_start_at, discount_end_at, discount_label,
       is_available, spice_level, cook_time, is_alcoholic, has_variants,
       is_chefs_recommended, is_popular, is_new, is_limited_time, created_at, type
FROM menu_items
WHERE id = $1 AND restaurant_id = $2;

-- name: ListClassifiedMenuItems :many
SELECT mi.id, mi.name, mi.description, mi.translations, mi.images, mi.price, mi.type, mi.has_variants,
       mi.is_chefs_recommended, mi.is_popular, mi.is_new, mi.is_limited_time, mi.is_available, mi.created_at
FROM menu_items mi
JOIN menu_sections ms ON mi.section_id = ms.id
WHERE ms.menu_id = $1 AND mi.restaurant_id = $2
  AND (mi.is_chefs_recommended = true OR mi.is_popular = true OR mi.is_new = true OR mi.is_limited_time = true);

-- name: ListMenuSectionsByMenuID :many
SELECT ms.id, ms.name, ms.description, ms.translations, ms.sort_order, ms.created_at,
       m.name AS menu_name, m.translations AS menu_translations, m.description AS menu_description
FROM menu_sections ms
JOIN menu m ON ms.menu_id = m.id
WHERE ms.menu_id = $1 AND m.restaurant_id = $2
ORDER BY ms.sort_order ASC;

-- name: ListItemTagsByItemIDs :many
SELECT mit.menu_item_id, t.id, t.name, t.description, t.translations, t.type
FROM menu_item_tags mit
JOIN tags t ON mit.tag_id = t.id
WHERE mit.menu_item_id = ANY($1::uuid[]);

-- name: ListItemAllergensByItemIDs :many
SELECT mia.menu_item_id, a.id, a.name, a.translations
FROM menu_item_allergens mia
JOIN allergens a ON mia.allergen_id = a.id
WHERE mia.menu_item_id = ANY($1::uuid[]);

-- name: ListItemAddonsByItemID :many
SELECT a.id, a.name, a.price, a.translations
FROM menu_item_addons mia
JOIN addons a ON mia.addon_id = a.id
WHERE mia.item_id = $1;

-- name: ListItemVariantsByItemID :many
SELECT id, name, price, is_available, translations, image
FROM menu_item_variants
WHERE item_id = $1;

-- name: ListMenuItemsForAI :many
SELECT mi.id, mi.name, mi.description, mi.price, mi.images, mi.type
FROM menu_items mi
WHERE mi.restaurant_id = $1;

-- name: ListItemTagsForAI :many
SELECT mit.menu_item_id, t.name, t.type
FROM menu_item_tags mit
JOIN tags t ON mit.tag_id = t.id
WHERE mit.menu_item_id = ANY($1::uuid[]);

-- name: GetMenuItemForAI :one
SELECT mi.id, mi.name, mi.description, mi.price, mi.images, mi.type, mi.translations
FROM menu_items mi
WHERE mi.id = $1 AND mi.restaurant_id = $2;
