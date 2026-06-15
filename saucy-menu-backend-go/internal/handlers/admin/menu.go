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

type MenuHandler struct {
	q     *sqlc.Queries
	audit *auditpkg.Logger
	t     *translation.Enqueuer
}

func NewMenuHandler(q *sqlc.Queries, audit *auditpkg.Logger, t *translation.Enqueuer) *MenuHandler {
	return &MenuHandler{q: q, audit: audit, t: t}
}

// POST /admin/menu/
func (h *MenuHandler) CreateMenu(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Name == "" {
		httpx.WriteError(w, http.StatusBadRequest, "name is required")
		return
	}

	ctx := r.Context()
	m, err := h.q.CreateMenu(ctx, sqlc.CreateMenuParams{
		RestaurantID: user.RestaurantID,
		Name:         body.Name,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create menu")
		return
	}

	h.audit.Created(ctx, sqlc.AuditEntityMenu, m.ID, user.ID, user.RestaurantID, body)
	h.t.After(ctx, "menu", pgUUIDToString(m.ID), httpx.LangFromContext(ctx),
		translation.Fields("name", body.Name, "description", ptrStr(body.Description)))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"message":           "Menu Created Successfully",
		"translationStatus": "pending",
	})
}

// GET /admin/menu/
func (h *MenuHandler) ListMenus(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())
	search := strings.ToLower(r.URL.Query().Get("search"))

	ctx := r.Context()
	menus, err := h.q.ListMenusByRestaurant(ctx, user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch menus")
		return
	}

	// Build first-image map
	imageMap := map[string]string{}
	for _, m := range menus {
		imgs, err := h.q.ListMenuItemImagesForMenu(ctx, m.ID)
		if err != nil {
			continue
		}
		for _, row := range imgs {
			mid := pgUUIDToString(m.ID)
			if _, already := imageMap[mid]; already {
				break
			}
			for _, img := range row.Images {
				if img != "" && !strings.HasPrefix(img, "[") {
					imageMap[mid] = img
					break
				}
			}
		}
	}

	result := make([]map[string]any, 0, len(menus))
	for _, m := range menus {
		name := httpx.ResolveTranslatedField(m.Name, m.Translations, "name", lang)
		if search != "" && !strings.Contains(strings.ToLower(name), search) {
			continue
		}
		mid := pgUUIDToString(m.ID)
		result = append(result, map[string]any{
			"id":          mid,
			"name":        name,
			"description": httpx.ResolveTranslatedField(ptrStr(m.Description), m.Translations, "description", lang),
			"startTime":   m.StartTime,
			"endTime":     m.EndTime,
			"active":      m.Active,
			"image":       imageMap[mid],
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /admin/menu/:id
func (h *MenuHandler) GetMenu(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menu id")
		return
	}

	ctx := r.Context()
	m, err := h.q.GetMenuByIDForAdmin(ctx, sqlc.GetMenuByIDForAdminParams{ID: id, RestaurantID: user.RestaurantID})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Menu not found")
		return
	}
	items, _ := h.q.ListMenuItemsByMenuForAdmin(ctx, id)

	itemsOut := make([]map[string]any, 0, len(items))
	for _, it := range items {
		itemsOut = append(itemsOut, map[string]any{
			"id":          pgUUIDToString(it.ID),
			"name":        httpx.ResolveTranslatedField(it.Name, it.Translations, "name", lang),
			"description": httpx.ResolveTranslatedField(ptrStr(it.Description), it.Translations, "description", lang),
			"images":      it.Images,
			"price":       httpx.NumericToString(it.Price),
			"type":        it.Type,
			"isAvailable": it.IsAvailable,
		})
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"id":          pgUUIDToString(m.ID),
		"name":        httpx.ResolveTranslatedField(m.Name, m.Translations, "name", lang),
		"description": httpx.ResolveTranslatedField(ptrStr(m.Description), m.Translations, "description", lang),
		"active":      m.Active,
		"startTime":   m.StartTime,
		"endTime":     m.EndTime,
		"items":       itemsOut,
	})
}

// PUT /admin/menu/:id
func (h *MenuHandler) UpdateMenu(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menu id")
		return
	}
	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Active      *bool   `json:"active"`
		StartTime   *string `json:"startTime"`
		EndTime     *string `json:"endTime"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	if err := h.q.UpdateMenu(ctx, sqlc.UpdateMenuParams{
		Column1:      body.Name, // COALESCE(NULLIF($1,''), name): nil=no change, string=update
		Description:  body.Description,
		Active:       body.Active,
		StartTime:    body.StartTime,
		EndTime:      body.EndTime,
		ID:           id,
		RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update menu")
		return
	}

	h.audit.Updated(ctx, sqlc.AuditEntityMenu, id, user.ID, user.RestaurantID, body, body)
	h.t.After(ctx, "menu", pgUUIDToString(id), httpx.LangFromContext(ctx),
		translation.Fields("name", ptrStr(body.Name), "description", ptrStr(body.Description)))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu Updated Successfully"})
}

// DELETE /admin/menu/:id
func (h *MenuHandler) DeleteMenu(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menu id")
		return
	}

	ctx := r.Context()
	if err := h.q.DeleteMenu(ctx, sqlc.DeleteMenuParams{ID: id, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete menu")
		return
	}

	h.audit.Deleted(ctx, sqlc.AuditEntityMenu, id, user.ID, user.RestaurantID, nil)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu Deleted Successfully"})
}

// GET /admin/menu/menus-sections
func (h *MenuHandler) ListMenusWithSections(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rows, err := h.q.ListMenusWithSections(r.Context(), user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch menus")
		return
	}

	type sectionEntry struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		SortOrder *int32 `json:"sortOrder"`
	}
	type menuEntry struct {
		ID       string         `json:"id"`
		Name     string         `json:"name"`
		Sections []sectionEntry `json:"sections"`
	}

	menuMap := map[string]*menuEntry{}
	menuOrder := []string{}
	for _, row := range rows {
		mid := pgUUIDToString(row.MenuID)
		if _, exists := menuMap[mid]; !exists {
			menuMap[mid] = &menuEntry{
				ID:       mid,
				Name:     httpx.ResolveTranslatedField(row.MenuName, row.MenuTranslations, "name", lang),
				Sections: []sectionEntry{},
			}
			menuOrder = append(menuOrder, mid)
		}
		if row.SectionID.Valid {
			menuMap[mid].Sections = append(menuMap[mid].Sections, sectionEntry{
				ID:        pgUUIDToString(row.SectionID),
				Name:      httpx.ResolveTranslatedField(ptrStr(row.SectionName), row.SectionTranslations, "name", lang),
				SortOrder: row.SortOrder,
			})
		}
	}

	result := make([]*menuEntry, 0, len(menuOrder))
	for _, mid := range menuOrder {
		result = append(result, menuMap[mid])
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}
