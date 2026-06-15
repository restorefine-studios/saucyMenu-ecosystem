-- name: ListRestaurantsForSuper :many
SELECT id, name, address, image, description, status, admin_email, suspended,
       "currencyId" AS currency_id, created_at
FROM restaurants
WHERE ($1 = '' OR lower(name) LIKE lower($1))
  AND ($2 = '' OR status::text = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountRestaurantsForSuper :one
SELECT COUNT(*) FROM restaurants
WHERE ($1 = '' OR lower(name) LIKE lower($1))
  AND ($2 = '' OR status::text = $2);

-- name: GetRestaurantDetailForSuper :one
SELECT id, name, address, image, description, status, admin_email, suspended,
       suspended_reason, suspended_at, "currencyId" AS currency_id, created_at
FROM restaurants WHERE id = $1;

-- name: CountUserSessionsForRestaurant :one
SELECT COUNT(*) FROM user_sessions WHERE restaurant_id = $1;

-- name: CountReviewsForRestaurant :one
SELECT COUNT(*) FROM reviews WHERE restaurant_id = $1;

-- name: AIUsageChartForRestaurant :many
SELECT COUNT(id)::bigint AS count,
       DATE_TRUNC('month', created_at)::timestamp AS month
FROM ai_usage_logs
WHERE restaurant_id = $1
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- name: ToggleRestaurantSuspended :exec
UPDATE restaurants
SET suspended = $1, suspended_reason = $2, suspended_at = $3, suspended_by = $4
WHERE id = $5;

-- name: DeleteRestaurantByID :exec
DELETE FROM restaurants WHERE id = $1;

-- name: GetRestaurantBySlug :one
SELECT id, name, slug FROM restaurants WHERE slug = $1;

-- name: SetRestaurantSlug :exec
UPDATE restaurants SET slug = $1 WHERE id = $2;

-- name: CreateRestaurantForSuper :one
INSERT INTO restaurants (id, name, "currencyId", admin_email, status, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, 'PENDING', now())
RETURNING id;

-- name: SetRestaurantStatus :exec
UPDATE restaurants SET status = $1 WHERE id = $2;

-- name: CreateAdminUser :one
INSERT INTO users (id, email, name, role, restaurant_id, email_verified, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, 'user', $3, true, now(), now())
RETURNING id;

-- name: CreateSuperAdminUser :one
INSERT INTO users (id, email, name, role, email_verified, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, 'admin', true, now(), now())
RETURNING id;

-- name: SetUserPassword :exec
UPDATE account SET password = $1, updated_at = now()
WHERE user_id = $2 AND provider_id = 'credential';

-- name: GetUserByEmailForSuper :one
SELECT id, email, name FROM users WHERE email = $1;

-- name: ListSubscriptionsForSuper :many
SELECT us.status, us.stripe_subscription_id, us.current_period_start, us.current_period_end,
       u.name AS user_name, r.name AS restaurant_name, sp.name AS plan_name
FROM user_subscriptions us
LEFT JOIN users u ON us.user_id = u.id
LEFT JOIN restaurants r ON u.restaurant_id = r.id
LEFT JOIN subscriptions_plans sp ON sp.id = us.plan_id
WHERE ($1 = '' OR lower(r.name) LIKE lower($1))
  AND ($2 = '' OR sp.name = $2)
ORDER BY us.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountSubscriptionsForSuper :one
SELECT COUNT(*) FROM user_subscriptions;

-- name: ListSubscriptionPlans :many
SELECT name FROM subscriptions_plans ORDER BY name;

-- name: SubscriptionStatsChart :many
SELECT COUNT(us.id)::bigint AS count,
       DATE_TRUNC('month', us.created_at)::timestamp AS month,
       sp.name AS plan_name
FROM user_subscriptions us
INNER JOIN subscriptions_plans sp ON us.plan_id = sp.id
GROUP BY sp.name, DATE_TRUNC('month', us.created_at)
ORDER BY month, sp.name;

-- name: PlatformTotals :one
SELECT
  (SELECT COUNT(*) FROM restaurants)::bigint AS total_restaurants,
  (SELECT COUNT(*) FROM user_sessions)::bigint AS total_sessions,
  (SELECT COUNT(*) FROM ai_usage_logs)::bigint AS total_credits_used,
  (SELECT COUNT(*) FROM restaurants WHERE created_at >= date_trunc('month', now()))::bigint AS restaurants_this_month,
  (SELECT COUNT(*) FROM user_sessions WHERE created_at >= date_trunc('month', now()))::bigint AS sessions_this_month,
  (SELECT COUNT(*) FROM ai_usage_logs WHERE created_at >= date_trunc('month', now()))::bigint AS credits_this_month;

-- name: CreateAllergen :one
INSERT INTO allergens (id, name, created_at)
VALUES (gen_random_uuid(), $1, now())
RETURNING id;

-- name: UpdateAllergen :exec
UPDATE allergens SET name = $1 WHERE id = $2;

-- name: DeleteAllergen :exec
DELETE FROM allergens WHERE id = $1;

-- name: ListPendingStripeEvents :many
SELECT id, event_id, event_type, related_id, payload FROM pending_stripe_events
ORDER BY received_at;

-- name: DeletePendingStripeEvent :exec
DELETE FROM pending_stripe_events WHERE id = $1;

-- name: InsertPendingStripeEvent :exec
INSERT INTO pending_stripe_events (id, event_id, event_type, related_id, payload, received_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, now())
ON CONFLICT (event_id) DO NOTHING;

-- name: ListActiveSubscriptions :many
SELECT id, stripe_subscription_id, status FROM user_subscriptions WHERE status = 'active';

-- name: UpdateSubscriptionStatus :exec
UPDATE user_subscriptions SET status = $1, updated_at = now() WHERE id = $2;

-- name: UpsertSubscription :exec
INSERT INTO user_subscriptions (id, user_id, stripe_subscription_id, stripe_customer_id, price_id, status, plan_id, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now(), now())
ON CONFLICT (user_id) DO UPDATE
  SET stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_customer_id     = EXCLUDED.stripe_customer_id,
      price_id               = EXCLUDED.price_id,
      status                 = EXCLUDED.status,
      plan_id                = EXCLUDED.plan_id,
      updated_at             = now();

-- name: UpdateSubscriptionFromWebhook :exec
UPDATE user_subscriptions SET
  status = $1, price_id = $2, updated_at = now(),
  current_period_start = $3, current_period_end = $4
WHERE id = $5;

-- name: GetSubscriptionByStripeID :one
SELECT id, user_id FROM user_subscriptions WHERE stripe_subscription_id = $1;

-- name: GetPlanByProductID :one
SELECT id, price_id FROM subscriptions_plans WHERE product_id = $1;

-- name: GetPlanByPriceID :one
SELECT id FROM subscriptions_plans WHERE price_id = $1;

-- name: UpsertSubscriptionPlan :exec
INSERT INTO subscriptions_plans (id, product_id, name, price_id, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, now())
ON CONFLICT (name) DO UPDATE
  SET price_id   = COALESCE(EXCLUDED.price_id, subscriptions_plans.price_id),
      product_id = EXCLUDED.product_id;

-- name: UpdateSubscriptionPlanPrice :exec
UPDATE subscriptions_plans SET price_id = $1 WHERE product_id = $2;

-- name: DeleteSubscriptionPlan :exec
DELETE FROM subscriptions_plans WHERE product_id = $1;

-- name: GetSubscriptionByUserID :one
SELECT id, stripe_subscription_id, status FROM user_subscriptions WHERE user_id = $1;

-- name: UpdateSubscriptionCancelAtPeriodEnd :exec
UPDATE user_subscriptions SET cancel_at_period_end = $1, status = $2, updated_at = now()
WHERE stripe_subscription_id = $3;

-- name: UpdateSubscriptionFull :exec
UPDATE user_subscriptions SET
  status = $1, current_period_start = $2, current_period_end = $3,
  canceled_at = $4, price_id = $5, stripe_subscription_id = $6, updated_at = now()
WHERE stripe_subscription_id = $7;
