package user

import (
	"net/http"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type ClassificationsHandler struct {
	q *sqlc.Queries
}

func NewClassificationsHandler(q *sqlc.Queries) *ClassificationsHandler {
	return &ClassificationsHandler{q: q}
}

// GET /user/classifications/allergens
func (h *ClassificationsHandler) ListAllergens(w http.ResponseWriter, r *http.Request) {
	lang := httpx.LangFromContext(r.Context())

	allergens, err := h.q.ListAllergens(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch allergens")
		return
	}

	result := make([]map[string]any, 0, len(allergens))
	for _, a := range allergens {
		result = append(result, map[string]any{
			"id":   pgUUIDToString(a.ID),
			"name": httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /user/classifications/diets
func (h *ClassificationsHandler) ListDiets(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}

	diets, err := h.q.ListDietTagsByRestaurant(r.Context(), rid)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch diets")
		return
	}

	result := make([]map[string]any, 0, len(diets))
	for _, d := range diets {
		result = append(result, map[string]any{
			"id":          pgUUIDToString(d.ID),
			"name":        httpx.ResolveTranslatedField(d.Name, d.Translations, "name", lang),
			"description": httpx.ResolveTranslatedField(ptrStr(d.Description), d.Translations, "description", lang),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}
