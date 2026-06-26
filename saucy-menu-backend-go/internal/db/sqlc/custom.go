package sqlc

import "context"

// GetRestaurantAIEnabled returns true when the restaurant's admin holds an active
// Pro or Premium subscription (anything that isn't Standard).
func (q *Queries) GetRestaurantAIEnabled(ctx context.Context, restaurantID interface{}) (bool, error) {
	const sql = `
		SELECT EXISTS (
			SELECT 1
			FROM users u
			JOIN user_subscriptions us ON us.user_id = u.id
			JOIN subscriptions_plans sp ON sp.price_id = us.price_id
			WHERE u.restaurant_id = $1
			  AND us.status IS NOT NULL
			  AND us.status != 'canceled'
			  AND sp.name NOT ILIKE 'standard%'
		)
	`
	var enabled bool
	err := q.db.QueryRow(ctx, sql, restaurantID).Scan(&enabled)
	return enabled, err
}
