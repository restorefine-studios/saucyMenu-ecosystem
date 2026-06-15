package super

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/plunk"
)

// Routes mounts all /super/* routes onto r.
// The SuperAdminAuth middleware (except /auth/signup) is applied by the parent router.
func Routes(r chi.Router, q *sqlc.Queries, cfg *config.Config) http.Handler {
	plunkClient := plunk.New(cfg.PlunkSecretKey)

	restoH := NewRestaurantsHandler(q, plunkClient)
	statsH := NewStatsHandler(q)
	subH := NewSubscriptionsHandler(q)
	allergenH := NewAllergensHandler(q)

	// Everything below is already behind SuperAdminAuth from the parent router
	r.Get("/restaurants", restoH.List)
	r.Post("/restaurants", restoH.Create)
	r.Post("/restaurants/release-account", restoH.ReleaseAccount)
	r.Get("/restaurants/{id}", restoH.GetDetail)
	r.Get("/restaurants/{id}/ai-usage", restoH.AIUsage)
	r.Post("/restaurants/alter-suspend/{id}", restoH.AlterSuspend)

	r.Get("/stats/total", statsH.Total)
	r.Get("/stats/subscriptions", statsH.Subscriptions)

	r.Get("/subscriptions", subH.List)

	r.Get("/menu/allergens", allergenH.List)
	r.Post("/menu/allergens", allergenH.Create)
	r.Put("/menu/allergens/{id}", allergenH.Update)
	r.Delete("/menu/allergens/{id}", allergenH.Delete)

	return r
}
