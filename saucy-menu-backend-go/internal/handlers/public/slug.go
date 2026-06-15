package public

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type SlugHandler struct {
	q *sqlc.Queries
}

func NewSlugHandler(q *sqlc.Queries) *SlugHandler {
	return &SlugHandler{q: q}
}

// GET /r/:slug — public endpoint, returns restaurant ID for the diner app
func (h *SlugHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		httpx.WriteError(w, http.StatusBadRequest, "slug is required")
		return
	}

	resto, err := h.q.GetRestaurantBySlug(r.Context(), &slug)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "restaurant not found")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"id":   pgUUIDToString(resto.ID),
		"name": resto.Name,
		"slug": resto.Slug,
	})
}

func pgUUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
