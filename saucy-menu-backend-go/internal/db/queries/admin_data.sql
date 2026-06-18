-- name: CreateAddon :one
INSERT INTO addons (id, restaurant_id, name, price, translation_status, created_at)
VALUES (gen_random_uuid(), $1, lower($2), $3, 'pending', now())
RETURNING id;

-- name: ListAddonsByRestaurant :many
SELECT id, name, price, translations, created_at
FROM addons WHERE restaurant_id = $1 ORDER BY created_at ASC;

-- name: GetAddonByID :one
SELECT id, name, price, translations FROM addons WHERE id = $1 AND restaurant_id = $2;

-- name: UpdateAddon :exec
UPDATE addons SET name = COALESCE($1, name), price = COALESCE($2, price),
                  translation_status = 'pending'
WHERE id = $3 AND restaurant_id = $4;

-- name: DeleteAddon :exec
DELETE FROM addons WHERE id = $1 AND restaurant_id = $2;

-- name: CheckDietTagExists :one
SELECT id FROM tags
WHERE lower(name) = lower($1) AND type = 'diet' AND restaurant_id = $2
LIMIT 1;

-- name: CheckDietTagKeyExists :one
SELECT id FROM tags
WHERE key = $1 AND type = 'diet' AND restaurant_id = $2 AND id != $3
LIMIT 1;

-- name: GetDietTagByID :one
SELECT id, name, key FROM tags WHERE id = $1 AND type = 'diet' AND restaurant_id = $2;

-- name: CreateDietTag :one
INSERT INTO tags (id, name, key, type, restaurant_id, translation_status, created_at)
VALUES (gen_random_uuid(), lower($1), $2, 'diet', $3, 'pending', now())
RETURNING id;

-- name: UpdateDietTag :exec
UPDATE tags SET name = lower($1), key = $2, translation_status = 'pending'
WHERE id = $3 AND type = 'diet' AND restaurant_id = $4 AND is_system = false;

-- name: DeleteDietTag :exec
DELETE FROM tags WHERE id = $1 AND type = 'diet' AND restaurant_id = $2 AND is_system = false;

-- name: ListDietTagsForAdmin :many
SELECT id, name, key, translations, type, is_system, created_at
FROM tags WHERE restaurant_id = $1 AND type = 'diet' ORDER BY created_at DESC;

-- name: CountUserSessions :one
SELECT COUNT(*) FROM user_sessions WHERE restaurant_id = $1;

-- name: CountMenuItems :one
SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1;

-- name: CountAIUsage :one
SELECT COUNT(*) FROM ai_usage_logs WHERE restaurant_id = $1;

-- name: MonthlyCustomerCounts :many
SELECT DATE_TRUNC('month', created_at)::timestamp AS month, COUNT(*)::bigint AS count
FROM user_sessions
WHERE restaurant_id = $1
  AND ($2::timestamp IS NULL OR created_at >= $2)
  AND ($3::timestamp IS NULL OR created_at <= $3)
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY DATE_TRUNC('month', created_at);

-- name: DishesByTagCount :many
SELECT t.name AS tag_name, COUNT(mit.menu_item_id)::bigint AS count
FROM menu_item_tags mit
JOIN tags t ON mit.tag_id = t.id
WHERE (t.restaurant_id = $1 OR t.is_system = true) AND t.type = 'diet'
GROUP BY t.name
ORDER BY COUNT(mit.menu_item_id) DESC;

-- name: ListReviewsForAdmin :many
SELECT r.id, r.rating, r.comment, r.created_at, r.reviewable_id,
       mi.name AS item_name, mi.id AS item_id
FROM reviews r
LEFT JOIN menu_items mi ON mi.id = r.reviewable_id
WHERE r.restaurant_id = $1
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountReviews :one
SELECT COUNT(*) FROM reviews WHERE restaurant_id = $1;

-- name: InsertAuditLog :exec
INSERT INTO audit_logs (id, entity, entity_id, action, performed_by, before, after, restaurant_id, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, now());

-- name: ListAuditLogs :many
SELECT al.id, al.entity, al.entity_id, al.action, al.before, al.after, al.created_at,
       u.name AS user_name, u.email AS user_email, u.role AS user_role
FROM audit_logs al
LEFT JOIN users u ON u.id = al.performed_by
WHERE al.restaurant_id = $1
ORDER BY al.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountAuditLogs :one
SELECT COUNT(*) FROM audit_logs WHERE restaurant_id = $1;

-- name: ListSubscriptionPlansWithStatus :many
SELECT sp.name, sp.product_id AS stripe_product_id, sp.price_id AS stripe_price_id,
       us.status, us.current_period_end, us.cancel_at_period_end
FROM subscriptions_plans sp
LEFT JOIN user_subscriptions us ON us.price_id = sp.price_id AND us.user_id = $1;

-- name: GetUserSubscriptionByUserID :one
SELECT id, stripe_subscription_id, stripe_customer_id, price_id, status, cancel_at_period_end
FROM user_subscriptions WHERE user_id = $1;
