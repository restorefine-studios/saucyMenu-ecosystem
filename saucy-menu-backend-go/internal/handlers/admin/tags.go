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

type TagsHandler struct {
	q     *sqlc.Queries
	audit *auditpkg.Logger
	t     *translation.Enqueuer
}

func NewTagsHandler(q *sqlc.Queries, audit *auditpkg.Logger, t *translation.Enqueuer) *TagsHandler {
	return &TagsHandler{q: q, audit: audit, t: t}
}

// POST /admin/menu-tags/diet
func (h *TagsHandler) CreateDietTag(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	existing, err := h.q.CheckDietTagExists(ctx, sqlc.CheckDietTagExistsParams{
		Lower:        body.Name,
		RestaurantID: user.RestaurantID,
	})
	if err == nil && existing.Valid {
		httpx.WriteError(w, http.StatusBadRequest, "Diet already exists")
		return
	}

	key := slugify(body.Name)
	id, err := h.q.CreateDietTag(ctx, sqlc.CreateDietTagParams{
		Lower:        strings.ToLower(body.Name),
		Key:          key,
		RestaurantID: user.RestaurantID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create diet tag")
		return
	}

	h.audit.Created(ctx, sqlc.AuditEntityDiets, id, user.ID, user.RestaurantID, body)
	h.t.After(ctx, "tag", pgUUIDToString(id), httpx.LangFromContext(ctx), translation.Fields("name", body.Name))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Diet created successfully"})
}

// GET /admin/menu-tags/diet
func (h *TagsHandler) ListDietTags(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	tags, err := h.q.ListDietTagsForAdmin(r.Context(), user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch diet tags")
		return
	}

	result := make([]map[string]any, 0, len(tags))
	for _, t := range tags {
		result = append(result, map[string]any{
			"id":       pgUUIDToString(t.ID),
			"name":     httpx.ResolveTranslatedField(t.Name, t.Translations, "name", lang),
			"key":      t.Key,
			"type":     t.Type,
			"isSystem": t.IsSystem,
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// PUT /admin/menu-tags/diet/:id
func (h *TagsHandler) UpdateDietTag(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid tag id")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	key := slugify(body.Name)
	ctx := r.Context()

	// Check key uniqueness (excluding self)
	existing, err := h.q.CheckDietTagKeyExists(ctx, sqlc.CheckDietTagKeyExistsParams{
		Key:          key,
		RestaurantID: user.RestaurantID,
		ID:           id,
	})
	if err == nil && existing.Valid {
		httpx.WriteError(w, http.StatusBadRequest, "Tag already exists")
		return
	}

	before, err := h.q.GetDietTagByID(ctx, sqlc.GetDietTagByIDParams{ID: id, RestaurantID: user.RestaurantID})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Diet tag not found")
		return
	}

	if err := h.q.UpdateDietTag(ctx, sqlc.UpdateDietTagParams{
		Lower: strings.ToLower(body.Name), Key: key, ID: id, RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update diet tag")
		return
	}

	h.audit.Updated(ctx, sqlc.AuditEntityDiets, id, user.ID, user.RestaurantID,
		map[string]any{"name": before.Name}, map[string]any{"name": body.Name})
	h.t.After(ctx, "tag", pgUUIDToString(id), httpx.LangFromContext(ctx), translation.Fields("name", body.Name))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Diet updated successfully"})
}

// DELETE /admin/menu-tags/diet/:id
func (h *TagsHandler) DeleteDietTag(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid tag id")
		return
	}

	ctx := r.Context()
	if err := h.q.DeleteDietTag(ctx, sqlc.DeleteDietTagParams{ID: id, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete diet tag")
		return
	}

	h.audit.Deleted(ctx, sqlc.AuditEntityDiets, id, user.ID, user.RestaurantID, nil)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Diet deleted successfully"})
}

// GET /admin/menu-tags/allergen  (read-only — allergens are system-managed)
func (h *TagsHandler) ListAllergenTags(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	tags, err := h.q.ListDietTagsByRestaurant(r.Context(), user.RestaurantID)
	if err != nil {
		httpx.WriteSuccess(w, http.StatusOK, []any{})
		return
	}

	result := make([]map[string]any, 0, len(tags))
	for _, t := range tags {
		result = append(result, map[string]any{
			"id":   pgUUIDToString(t.ID),
			"name": httpx.ResolveTranslatedField(t.Name, t.Translations, "name", lang),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}
