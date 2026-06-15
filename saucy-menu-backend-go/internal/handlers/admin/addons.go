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

type AddonsHandler struct {
	q     *sqlc.Queries
	audit *auditpkg.Logger
	t     *translation.Enqueuer
}

func NewAddonsHandler(q *sqlc.Queries, audit *auditpkg.Logger, t *translation.Enqueuer) *AddonsHandler {
	return &AddonsHandler{q: q, audit: audit, t: t}
}

// POST /admin/addons/
func (h *AddonsHandler) CreateAddon(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body struct {
		Name  string  `json:"name"`
		Price *string `json:"price"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	price := parsePrice("0.00")
	if body.Price != nil {
		price = parsePrice(*body.Price)
	}

	ctx := r.Context()
	id, err := h.q.CreateAddon(ctx, sqlc.CreateAddonParams{
		RestaurantID: user.RestaurantID,
		Lower:        strings.ToLower(body.Name),
		Price:        price,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create addon")
		return
	}

	h.audit.Created(ctx, sqlc.AuditEntityAddons, id, user.ID, user.RestaurantID, body)
	h.t.After(ctx, "addon", pgUUIDToString(id), httpx.LangFromContext(ctx), translation.Fields("name", body.Name))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Addon created successfully"})
}

// GET /admin/addons/
func (h *AddonsHandler) ListAddons(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	addons, err := h.q.ListAddonsByRestaurant(r.Context(), user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch addons")
		return
	}

	result := make([]map[string]any, 0, len(addons))
	for _, a := range addons {
		result = append(result, map[string]any{
			"id":    pgUUIDToString(a.ID),
			"name":  httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang),
			"price": httpx.NumericToString(a.Price),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /admin/addons/:id
func (h *AddonsHandler) GetAddon(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid addon id")
		return
	}
	addon, err := h.q.GetAddonByID(r.Context(), sqlc.GetAddonByIDParams{
		ID:           id,
		RestaurantID: user.RestaurantID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Addon not found")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"id":    pgUUIDToString(addon.ID),
		"name":  httpx.ResolveTranslatedField(addon.Name, addon.Translations, "name", lang),
		"price": httpx.NumericToString(addon.Price),
	})
}

// PUT /admin/addons/:id
func (h *AddonsHandler) UpdateAddon(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid addon id")
		return
	}
	var body struct {
		Name  *string `json:"name"`
		Price *string `json:"price"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	// Fetch existing (scoped to restaurant) to apply partial updates
	existing, err := h.q.GetAddonByID(ctx, sqlc.GetAddonByIDParams{
		ID:           id,
		RestaurantID: user.RestaurantID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Addon not found")
		return
	}
	name := existing.Name
	if body.Name != nil {
		name = strings.ToLower(*body.Name)
	}
	price := existing.Price
	if body.Price != nil {
		price = parsePrice(*body.Price)
	}

	if err := h.q.UpdateAddon(ctx, sqlc.UpdateAddonParams{
		Name:         name,
		Price:        price,
		ID:           id,
		RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update addon")
		return
	}

	h.audit.Updated(ctx, sqlc.AuditEntityAddons, id, user.ID, user.RestaurantID, nil, body)
	h.t.After(ctx, "addon", pgUUIDToString(id), httpx.LangFromContext(ctx), translation.Fields("name", ptrStr(body.Name)))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Addon updated successfully"})
}

// DELETE /admin/addons/:id
func (h *AddonsHandler) DeleteAddon(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid addon id")
		return
	}

	ctx := r.Context()
	if err := h.q.DeleteAddon(ctx, sqlc.DeleteAddonParams{ID: id, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete addon")
		return
	}

	h.audit.Deleted(ctx, sqlc.AuditEntityAddons, id, user.ID, user.RestaurantID, nil)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Addon deleted successfully"})
}
