-- name: GetAdminProfile :one
SELECT u.id, u.email, u.name, u.role, u.language_id,
       r.id AS restaurant_id, r.name AS restaurant_name, r.address, r.image,
       r.description, r.banner_url, r."currencyId" AS restaurant_currency_id, r.slug
FROM users u
LEFT JOIN restaurants r ON r.id = u.restaurant_id
WHERE u.id = $1;

-- name: CreateRestaurant :one
INSERT INTO restaurants (id, name, description, image, "currencyId", status, created_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, 'COMPLETED', now())
RETURNING id;

-- name: UpdateRestaurantForSetup :exec
UPDATE restaurants SET name = $1, description = $2, image = COALESCE($3, image),
                       "currencyId" = $4, status = 'COMPLETED'
WHERE id = $5;

-- name: UpdateRestaurantInfo :exec
UPDATE restaurants SET
    name        = COALESCE($1, name),
    description = COALESCE($2, description),
    image       = COALESCE($3, image),
    address     = COALESCE($4, address),
    banner_url  = COALESCE($5, banner_url),
    "currencyId"= COALESCE($6, "currencyId")
WHERE id = $7;

-- name: LinkUserToRestaurant :exec
UPDATE users SET restaurant_id = $1, language_id = $2, setup_complete = true, updated_at = now()
WHERE id = $3;

-- name: GetUserWithRestaurantStatus :one
SELECT u.id, u.email, u.name, u.role, u.restaurant_id, u.setup_complete,
       r.suspended
FROM users u
LEFT JOIN restaurants r ON r.id = u.restaurant_id
WHERE u.id = $1;

-- name: UpdateUserEmail :exec
UPDATE users SET email = $1, updated_at = now() WHERE id = $2;

-- name: UpdateUserLanguage :exec
UPDATE users SET language_id = $1, updated_at = now() WHERE id = $2;
