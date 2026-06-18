package admin

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	auditpkg "github.com/restorefine-studios/saucy-menu-backend-go/internal/audit"
	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/translation"
)

type SectionsHandler struct {
	q     *sqlc.Queries
	audit *auditpkg.Logger
	t     *translation.Enqueuer
}

func NewSectionsHandler(q *sqlc.Queries, audit *auditpkg.Logger, t *translation.Enqueuer) *SectionsHandler {
	return &SectionsHandler{q: q, audit: audit, t: t}
}

// POST /admin/menu-sections/:menuId
func (h *SectionsHandler) CreateSection(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	menuID, err := parseUUID(chi.URLParam(r, "menuId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menuId")
		return
	}
	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	// Verify the menu belongs to this restaurant before inserting
	if _, err := h.q.MenuBelongsToRestaurant(ctx, sqlc.MenuBelongsToRestaurantParams{
		ID:           menuID,
		RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusForbidden, "Menu not found")
		return
	}
	sec, err := h.q.CreateMenuSection(ctx, sqlc.CreateMenuSectionParams{
		MenuID:      menuID,
		Lower:       body.Name,
		Description: body.Description,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create section")
		return
	}

	h.audit.Created(ctx, sqlc.AuditEntityMenuSection, sec, user.ID, user.RestaurantID, body)
	h.t.After(ctx, "menu_section", pgUUIDToString(sec), httpx.LangFromContext(ctx),
		translation.Fields("name", body.Name, "description", ptrStr(body.Description)))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu section created successfully"})
}

// GET /admin/menu-sections/:menuId
func (h *SectionsHandler) ListSections(w http.ResponseWriter, r *http.Request) {
	lang := httpx.LangFromContext(r.Context())
	menuID, err := parseUUID(chi.URLParam(r, "menuId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menuId")
		return
	}

	sections, err := h.q.ListAdminSectionsByMenu(r.Context(), menuID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch sections")
		return
	}

	result := make([]map[string]any, 0, len(sections))
	for _, s := range sections {
		result = append(result, map[string]any{
			"id":          pgUUIDToString(s.ID),
			"name":        httpx.ResolveTranslatedField(s.Name, s.Translations, "name", lang),
			"sortOrder":   s.SortOrder,
			"menuId":      pgUUIDToString(s.MenuID),
			"description": ptrStr(s.Description),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// PUT /admin/menu-sections/:id
func (h *SectionsHandler) UpdateSection(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid section id")
		return
	}
	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := ""
	if body.Name != nil {
		name = *body.Name
	}
	ctx := r.Context()

	before, err := h.q.GetMenuSectionByID(ctx, sqlc.GetMenuSectionByIDParams{ID: id, RestaurantID: user.RestaurantID})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Section not found")
		return
	}

	if err := h.q.UpdateMenuSection(ctx, sqlc.UpdateMenuSectionParams{
		Lower:        name,
		Description:  body.Description,
		ID:           id,
		RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update section")
		return
	}

	after, _ := h.q.GetMenuSectionByID(ctx, sqlc.GetMenuSectionByIDParams{ID: id, RestaurantID: user.RestaurantID})
	h.audit.Updated(ctx, sqlc.AuditEntityMenuSection, id, user.ID, user.RestaurantID,
		map[string]any{"name": before.Name, "description": ptrStr(before.Description)},
		map[string]any{"name": after.Name, "description": ptrStr(after.Description)},
	)
	h.t.After(ctx, "menu_section", pgUUIDToString(id), httpx.LangFromContext(ctx),
		translation.Fields("name", name, "description", ptrStr(body.Description)))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu section updated successfully"})
}

// DELETE /admin/menu-sections/:id
func (h *SectionsHandler) DeleteSection(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	ctx := r.Context()
	if err := h.q.DeleteMenuSection(ctx, sqlc.DeleteMenuSectionParams{ID: id, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete section")
		return
	}

	h.audit.Deleted(ctx, sqlc.AuditEntityMenuSection, id, user.ID, user.RestaurantID, nil)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu section deleted successfully"})
}

// POST /admin/menu-sections/delete-and-move-items-to-other-section/:sectionId
func (h *SectionsHandler) DeleteAndMoveItems(w http.ResponseWriter, r *http.Request) {
	sectionID, err := parseUUID(chi.URLParam(r, "sectionId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid sectionId")
		return
	}
	var body struct {
		AdjacentSectionID string `json:"adjacentSectionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	targetID, err := parseUUID(body.AdjacentSectionID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid adjacentSectionId")
		return
	}

	user := authm.GetAdminUser(r.Context())
	ctx := r.Context()

	// Verify both sections belong to this restaurant
	if _, err := h.q.SectionBelongsToRestaurant(ctx, sqlc.SectionBelongsToRestaurantParams{
		ID: sectionID, RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusForbidden, "Section not found")
		return
	}
	if _, err := h.q.SectionBelongsToRestaurant(ctx, sqlc.SectionBelongsToRestaurantParams{
		ID: targetID, RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusForbidden, "Target section not found")
		return
	}

	if err := h.q.MoveMenuItemsToSection(ctx, sqlc.MoveMenuItemsToSectionParams{
		SectionID:   targetID,
		SectionID_2: sectionID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to move items")
		return
	}
	if err := h.q.DeleteMenuSection(ctx, sqlc.DeleteMenuSectionParams{ID: sectionID, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete section")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Items deleted and moved to other section successfully"})
}
