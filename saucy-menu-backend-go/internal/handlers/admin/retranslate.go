package admin

import (
	"net/http"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/translation"
)

type RetranslateHandler struct {
	q *sqlc.Queries
	t *translation.Enqueuer
}

func NewRetranslateHandler(q *sqlc.Queries, t *translation.Enqueuer) *RetranslateHandler {
	return &RetranslateHandler{q: q, t: t}
}

// POST /admin/retranslate-all
// Enqueues translation jobs for every menu item in the restaurant that has a
// non-empty name or description. Idempotent — safe to call multiple times.
func (h *RetranslateHandler) RetranslateAll(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	rid := user.RestaurantID

	ctx := r.Context()
	items, err := h.q.ListAllMenuItemsForRestaurant(ctx, rid)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch menu items")
		return
	}

	queued := 0
	for _, item := range items {
		fields := translation.Fields(
			"name", item.Name,
			"description", ptrStr(item.Description),
		)
		if len(fields) == 0 {
			continue
		}
		h.t.After(ctx, "menu_item", pgUUIDToString(item.ID), "en", fields)
		queued++
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"message": "Retranslation started",
		"queued":  queued,
	})
}
