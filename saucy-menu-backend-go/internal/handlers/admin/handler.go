package admin

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hibiken/asynq"

	auditpkg "github.com/restorefine-studios/saucy-menu-backend-go/internal/audit"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	oaiclient "github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/openai"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/storage"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/translation"
)

// Routes mounts all /admin/* sub-routes onto r.
// The AdminAuth middleware is applied by the parent router.
func Routes(r chi.Router, q *sqlc.Queries, stripeKey string, oai *oaiclient.Client, s3 *storage.Client, asynqClient ...*asynq.Client) http.Handler {
	a := auditpkg.New(q)

	var qc *asynq.Client
	if len(asynqClient) > 0 {
		qc = asynqClient[0]
	}

	var t *translation.Enqueuer
	if qc != nil {
		t = translation.NewEnqueuer(qc)
	} else if oai != nil {
		t = translation.NewEnqueuerWithOpenAI(q, oai)
	} else {
		t = translation.NewEnqueuer(nil)
	}

	authH := NewAuthHandler(q)
	menuH := NewMenuHandler(q, a, t)
	secH := NewSectionsHandler(q, a, t)
	itemH := NewMenuItemsHandler(q, a, t, asynqClient...)
	tagH := NewTagsHandler(q, a, t)
	addonH := NewAddonsHandler(q, a, t)
	classH := NewClassificationsHandler(q, a, t)
	statsH := NewStatsHandler(q)
	revH := NewReviewsHandler(q)
	auditH := NewAuditLogsHandler(q)
	subH := NewSubscriptionsHandler(q, stripeKey)
	uploadH := NewUploadHandler(s3)
	formFieldConfigH := NewFormFieldConfigHandler(q)

	// Auth
	r.Post("/auth/setup", authH.Setup)
	r.Get("/auth/profile", authH.GetProfile)
	r.Put("/auth/setup", authH.UpdateSetup)
	r.Get("/auth/status", authH.GetStatus)

	// Menu — no trailing slashes so /admin/menu matches
	r.Post("/menu", menuH.CreateMenu)
	r.Get("/menu", menuH.ListMenus)
	r.Get("/menu/menus-sections", menuH.ListMenusWithSections)
	r.Get("/menu/{id}", menuH.GetMenu)
	r.Put("/menu/{id}", menuH.UpdateMenu)
	r.Delete("/menu/{id}", menuH.DeleteMenu)

	// Menu sections
	r.Post("/menu-sections/{menuId}", secH.CreateSection)
	r.Get("/menu-sections/{menuId}", secH.ListSections)
	r.Put("/menu-sections/{id}", secH.UpdateSection)
	r.Delete("/menu-sections/{id}", secH.DeleteSection)
	r.Post("/menu-sections/delete-and-move-items-to-other-section/{sectionId}", secH.DeleteAndMoveItems)

	// Menu items — no trailing slashes
	r.Post("/menu-items/bulk-upload", itemH.BulkUpload)
	r.Post("/menu-items", itemH.CreateMenuItem)
	r.Get("/menu-items", itemH.ListMenuItems)
	r.Get("/menu-items/{id}", itemH.GetMenuItem)
	r.Put("/menu-items/{id}", itemH.UpdateMenuItem)
	r.Delete("/menu-items/{id}", itemH.DeleteMenuItem)

	// Tags
	r.Post("/menu-tags/diet", tagH.CreateDietTag)
	r.Get("/menu-tags/diet", tagH.ListDietTags)
	r.Put("/menu-tags/diet/{id}", tagH.UpdateDietTag)
	r.Delete("/menu-tags/diet/{id}", tagH.DeleteDietTag)
	r.Get("/menu-tags/allergen", tagH.ListAllergenTags)

	// Addons — no trailing slashes
	r.Post("/addons", addonH.CreateAddon)
	r.Get("/addons", addonH.ListAddons)
	r.Get("/addons/{id}", addonH.GetAddon)
	r.Put("/addons/{id}", addonH.UpdateAddon)
	r.Delete("/addons/{id}", addonH.DeleteAddon)

	// Classifications
	r.Get("/classifications/allergens", classH.ListAllergens)
	r.Get("/classifications/diets", classH.ListDiets)
	r.Post("/classifications/diets", classH.CreateDiet)
	r.Put("/classifications/diets/{id}", classH.UpdateDiet)
	r.Delete("/classifications/diets/{id}", classH.DeleteDiet)

	// Stats — no trailing slashes
	r.Get("/stats", statsH.GetStats)
	r.Get("/stats/customers/chart", statsH.CustomerChart)
	r.Get("/stats/dishes-by-tags", statsH.DishesByTags)

	// Reviews — no trailing slash
	r.Get("/reviews", revH.ListReviews)

	// Audit — no trailing slash
	r.Get("/audit", auditH.ListAuditLogs)

	// Upload
	r.Post("/upload", uploadH.Upload)
	r.Delete("/upload/{key:.*}", uploadH.Delete)

	// Form field config — metadata-driven dish-item picker fields
	r.Get("/form-config/{formKey}", formFieldConfigH.Get)

	// Subscriptions
	r.Get("/subscriptions/system", subH.ListSystemPlans)
	r.Post("/subscriptions", subH.CreateCheckout)
	r.Post("/subscriptions/cancel", subH.CancelSubscription)

	// Translation — backfill all existing items
	if t != nil {
		retransH := NewRetranslateHandler(q, t)
		r.Post("/retranslate-all", retransH.RetranslateAll)
	}

	return r
}
