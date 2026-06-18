package admin

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	auditpkg "github.com/restorefine-studios/saucy-menu-backend-go/internal/audit"
	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/translation"
)

type ClassificationsHandler struct {
	q     *sqlc.Queries
	audit *auditpkg.Logger
	t     *translation.Enqueuer
}

func NewClassificationsHandler(q *sqlc.Queries, audit *auditpkg.Logger, t *translation.Enqueuer) *ClassificationsHandler {
	return &ClassificationsHandler{q: q, audit: audit, t: t}
}

// GET /admin/classifications/allergens
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

// GET /admin/classifications/diets
func (h *ClassificationsHandler) ListDiets(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())
	diets, err := h.q.ListDietTagsByRestaurant(r.Context(), user.RestaurantID)
	if err != nil {
		httpx.WriteSuccess(w, http.StatusOK, []any{})
		return
	}
	result := make([]map[string]any, 0, len(diets))
	for _, d := range diets {
		result = append(result, map[string]any{
			"id":   pgUUIDToString(d.ID),
			"name": httpx.ResolveTranslatedField(d.Name, d.Translations, "name", lang),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// POST /admin/classifications/diets
func (h *ClassificationsHandler) CreateDiet(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body struct{ Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	key := slugify(body.Name)
	ctx := r.Context()

	existing, err := h.q.CheckDietTagExists(ctx, sqlc.CheckDietTagExistsParams{
		Lower: body.Name, RestaurantID: user.RestaurantID,
	})
	if err == nil && existing.Valid {
		httpx.WriteError(w, http.StatusBadRequest, "Tag already exists")
		return
	}

	id, err := h.q.CreateDietTag(ctx, sqlc.CreateDietTagParams{
		Lower: strings.ToLower(body.Name), Key: key, RestaurantID: user.RestaurantID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create diet")
		return
	}
	h.audit.Created(ctx, sqlc.AuditEntityDiets, id, user.ID, user.RestaurantID, body)
	h.t.After(ctx, "tag", pgUUIDToString(id), httpx.LangFromContext(ctx), translation.Fields("name", body.Name))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Diet created successfully"})
}

// PUT /admin/classifications/diets/:id
func (h *ClassificationsHandler) UpdateDiet(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid diet id")
		return
	}
	var body struct{ Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	key := slugify(body.Name)
	ctx := r.Context()

	existing, err := h.q.CheckDietTagKeyExists(ctx, sqlc.CheckDietTagKeyExistsParams{
		Key: key, RestaurantID: user.RestaurantID, ID: id,
	})
	if err == nil && existing.Valid {
		httpx.WriteError(w, http.StatusBadRequest, "Tag already exists")
		return
	}

	before, err := h.q.GetDietTagByID(ctx, sqlc.GetDietTagByIDParams{ID: id, RestaurantID: user.RestaurantID})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Diet not found")
		return
	}

	if err := h.q.UpdateDietTag(ctx, sqlc.UpdateDietTagParams{
		Lower: strings.ToLower(body.Name), Key: key, ID: id, RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update diet")
		return
	}
	h.audit.Updated(ctx, sqlc.AuditEntityDiets, id, user.ID, user.RestaurantID,
		map[string]any{"name": before.Name}, map[string]any{"name": body.Name})
	h.t.After(ctx, "tag", pgUUIDToString(id), httpx.LangFromContext(ctx), translation.Fields("name", body.Name))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Diet updated successfully"})
}

// DELETE /admin/classifications/diets/:id
func (h *ClassificationsHandler) DeleteDiet(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid diet id")
		return
	}
	ctx := r.Context()
	if err := h.q.DeleteDietTag(ctx, sqlc.DeleteDietTagParams{ID: id, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete diet")
		return
	}
	h.audit.Deleted(ctx, sqlc.AuditEntityDiets, id, user.ID, user.RestaurantID, nil)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Diet deleted successfully"})
}
