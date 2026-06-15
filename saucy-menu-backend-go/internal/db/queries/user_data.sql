-- name: ListAllergens :many
SELECT id, name, translations FROM allergens ORDER BY name;

-- name: ListDietTagsByRestaurant :many
SELECT id, name, description, translations
FROM tags
WHERE type = 'diet' AND (restaurant_id = $1 OR is_system = true)
ORDER BY name;

-- name: ListTagsByRestaurant :many
SELECT id, name, type FROM tags WHERE restaurant_id = $1 ORDER BY name;

-- name: ListTagsByRestaurantAndType :many
SELECT id, name, type FROM tags WHERE restaurant_id = $1 AND type = $2 ORDER BY name;

-- name: GetSessionPreferenceTags :many
SELECT tag_id FROM user_session_tags WHERE session_id = $1;

-- name: GetSessionPreferenceAllergens :many
SELECT allergen_id FROM user_session_allergens WHERE session_id = $1;

-- name: DeleteSessionTags :exec
DELETE FROM user_session_tags WHERE session_id = $1;

-- name: InsertSessionTag :exec
INSERT INTO user_session_tags (session_id, tag_id) VALUES ($1, $2);

-- name: DeleteSessionAllergens :exec
DELETE FROM user_session_allergens WHERE session_id = $1;

-- name: InsertSessionAllergen :exec
INSERT INTO user_session_allergens (session_id, allergen_id) VALUES ($1, $2);

-- name: MenuItemBelongsToRestaurant :one
SELECT id FROM menu_items WHERE id = $1 AND restaurant_id = $2;

-- name: GetReviewsForItem :many
SELECT id, rating, comment, created_at
FROM reviews
WHERE reviewable_id = $1
ORDER BY created_at DESC
LIMIT 20;

-- name: CreateReview :exec
INSERT INTO reviews (id, reviewable_id, rating, comment, restaurant_id, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, now());

-- name: GetRestaurantForDiner :one
SELECT id, name, description, image, banner_url, address, phone, website, slug FROM restaurants WHERE id = $1;

-- name: GetAISessionInfo :one
SELECT r.id, us.stripe_customer_id, us.stripe_subscription_id
FROM restaurants r
LEFT JOIN users u ON u.restaurant_id = r.id
LEFT JOIN user_subscriptions us ON us.user_id = u.id
WHERE r.id = $1
LIMIT 1;
