package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/hibiken/asynq"
	auditpkg "github.com/restorefine-studios/saucy-menu-backend-go/internal/audit"
	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/queue"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/translation"
)

type MenuItemsHandler struct {
	q           *sqlc.Queries
	audit       *auditpkg.Logger
	t           *translation.Enqueuer
	queueClient *asynq.Client
}

func NewMenuItemsHandler(q *sqlc.Queries, audit *auditpkg.Logger, t *translation.Enqueuer, queueClient ...*asynq.Client) *MenuItemsHandler {
	h := &MenuItemsHandler{q: q, audit: audit, t: t}
	if len(queueClient) > 0 {
		h.queueClient = queueClient[0]
	}
	return h
}

type menuItemVariantBody struct {
	Name        string  `json:"name"`
	Price       string  `json:"price"`
	IsAvailable *bool   `json:"isAvailable"`
	Image       *string `json:"image"`
}

type menuItemBody struct {
	Name               string                `json:"name"`
	Description        *string               `json:"description"`
	SectionID          string                `json:"sectionId"`
	Images             []string              `json:"images"`
	Price              string                `json:"price"`
	Type               string                `json:"type"`
	DiscountType       *string               `json:"discountType"`
	DiscountValue      *string               `json:"discountValue"`
	DiscountLabel      *string               `json:"discountLabel"`
	Ingredients        []string              `json:"ingredients"`
	IsAvailable        *bool                 `json:"isAvailable"`
	SpiceLevel         *string               `json:"spiceLevel"`
	CookTime           *int32                `json:"cookTime"`
	IsAlcoholic        *bool                 `json:"isAlcoholic"`
	HasVariants        *bool                 `json:"hasVariants"`
	IsChefsRecommended *bool                 `json:"isChefsRecommended"`
	IsPopular          *bool                 `json:"isPopular"`
	IsNew              *bool                 `json:"isNew"`
	IsLimitedTime      *bool                 `json:"isLimitedTime"`
	Allergens          []string              `json:"allergens"`
	AddOns             []string              `json:"addOns"`
	Tags               []string              `json:"tags"`
	Variants           []menuItemVariantBody `json:"variants"`
}

// snapshotMenuItem captures the full item state (including relations) in the
// same field shape as menuItemBody, so before/after audit log entries can be
// diffed field-by-field on the frontend.
func (h *MenuItemsHandler) snapshotMenuItem(ctx context.Context, id pgtype.UUID, restaurantID pgtype.UUID) (map[string]any, error) {
	item, err := h.q.GetAdminMenuItemByID(ctx, sqlc.GetAdminMenuItemByIDParams{ID: id, RestaurantID: restaurantID})
	if err != nil {
		return nil, err
	}

	ids := []pgtype.UUID{item.ID}
	tagRows, _ := h.q.ListItemTagsByItemIDs(ctx, ids)
	allergenRows, _ := h.q.ListItemAllergensByItemIDs(ctx, ids)
	addonRows, _ := h.q.ListItemAddonsByItemID(ctx, item.ID)
	variantRows, _ := h.q.ListItemVariantsByItemID(ctx, item.ID)

	tags := make([]string, 0, len(tagRows))
	for _, t := range tagRows {
		tags = append(tags, pgUUIDToString(t.ID))
	}
	allergens := make([]string, 0, len(allergenRows))
	for _, a := range allergenRows {
		allergens = append(allergens, pgUUIDToString(a.ID))
	}
	addons := make([]string, 0, len(addonRows))
	for _, a := range addonRows {
		addons = append(addons, pgUUIDToString(a.ID))
	}
	variants := make([]map[string]any, 0, len(variantRows))
	for _, v := range variantRows {
		variants = append(variants, map[string]any{"name": v.Name, "price": httpx.NumericToString(v.Price)})
	}

	return map[string]any{
		"name": item.Name, "description": ptrStr(item.Description), "images": item.Images,
		"price": httpx.NumericToString(item.Price), "type": item.Type,
		"discountType": item.DiscountType, "discountValue": httpx.NumericToString(item.DiscountValue),
		"discountLabel": item.DiscountLabel, "ingredients": item.Ingredients, "isAvailable": item.IsAvailable,
		"spiceLevel": item.SpiceLevel, "cookTime": item.CookTime, "isAlcoholic": item.IsAlcoholic,
		"hasVariants": item.HasVariants, "isChefsRecommended": item.IsChefsRecommended,
		"isPopular": item.IsPopular, "isNew": item.IsNew, "isLimitedTime": item.IsLimitedTime,
		"allergens": allergens, "addOns": addons, "tags": tags, "variants": variants,
	}, nil
}

func parsePrice(s string) pgtype.Numeric {
	if s == "" {
		return pgtype.Numeric{}
	}
	s = strings.ReplaceAll(s, ",", ".")
	var n pgtype.Numeric
	_ = n.Scan(s)
	return n
}

// POST /admin/menu-items/
func (h *MenuItemsHandler) CreateMenuItem(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body menuItemBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	sectionID, err := parseUUID(body.SectionID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid sectionId")
		return
	}
	itemType := body.Type
	if itemType == "" {
		itemType = "dish"
	}

	ctx := r.Context()
	itemID, err := h.q.CreateMenuItem(ctx, sqlc.CreateMenuItemParams{
		SectionID:          sectionID,
		RestaurantID:       user.RestaurantID,
		Name:               body.Name,
		Description:        body.Description,
		Images:             body.Images,
		Price:              parsePrice(body.Price),
		Type:               itemType,
		DiscountType:       body.DiscountType,
		DiscountValue:      parsePrice(ptrStr(body.DiscountValue)),
		DiscountLabel:      body.DiscountLabel,
		Ingredients:        body.Ingredients,
		IsAvailable:        body.IsAvailable,
		SpiceLevel:         (*sqlc.SpiceLevel)(body.SpiceLevel),
		CookTime:           body.CookTime,
		IsAlcoholic:        body.IsAlcoholic,
		HasVariants:        body.HasVariants,
		IsChefsRecommended: body.IsChefsRecommended,
		IsPopular:          body.IsPopular,
		IsNew:              body.IsNew,
		IsLimitedTime:      body.IsLimitedTime,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create menu item")
		return
	}

	insertItemRelations(ctx, h.q, h.t, itemID, body.Allergens, body.AddOns, body.Tags, body.Variants,
		httpx.LangFromContext(ctx))
	after, _ := h.snapshotMenuItem(ctx, itemID, user.RestaurantID)
	h.audit.Created(ctx, sqlc.AuditEntityMenuItem, itemID, user.ID, user.RestaurantID, after)
	h.t.After(ctx, "menu_item", pgUUIDToString(itemID), httpx.LangFromContext(ctx),
		translation.Fields(
			"description", ptrStr(body.Description),
			"ingredients", strings.Join(body.Ingredients, ","),
		))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu item created successfully"})
}

// GET /admin/menu-items/
func (h *MenuItemsHandler) ListMenuItems(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())
	q := r.URL.Query()

	limit, offset := 10, 0
	if l := q.Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			limit = v
		}
	}
	if o := q.Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil {
			offset = v
		}
	}

	var searchPtr *string
	if s := q.Get("search"); s != "" {
		v := "%" + strings.ToLower(s) + "%"
		searchPtr = &v
	}
	var sectionID pgtype.UUID
	if sid := q.Get("sectionId"); sid != "" {
		sectionID, _ = parseUUID(sid)
	}

	hasSectionFilter := sectionID.Valid
	searchStr := ""
	hasSearchFilter := false
	if searchPtr != nil {
		searchStr = *searchPtr
		hasSearchFilter = true
	}

	ctx := r.Context()
	total, _ := h.q.CountMenuItemsForAdmin(ctx, sqlc.CountMenuItemsForAdminParams{
		RestaurantID: user.RestaurantID,
		Column2:      hasSectionFilter,
		SectionID:    sectionID,
		Column4:      hasSearchFilter,
		Name:         searchStr,
	})
	items, err := h.q.ListMenuItemsForAdmin(ctx, sqlc.ListMenuItemsForAdminParams{
		RestaurantID: user.RestaurantID,
		Column2:      hasSectionFilter,
		SectionID:    sectionID,
		Column4:      hasSearchFilter,
		Name:         searchStr,
		Limit:        int32(limit),
		Offset:       int32(offset),
	})
	if err != nil || len(items) == 0 {
		httpx.WritePagedSuccess(w, http.StatusOK, []any{}, total, limit, offset)
		return
	}

	itemIDs := make([]pgtype.UUID, len(items))
	for i, it := range items {
		itemIDs[i] = it.ID
	}
	tagRows, _ := h.q.ListItemTagsByItemIDs(ctx, itemIDs)
	allergenRows, _ := h.q.ListItemAllergensByItemIDs(ctx, itemIDs)

	tagsMap := map[string][]map[string]any{}
	for _, t := range tagRows {
		id := pgUUIDToString(t.MenuItemID)
		tagsMap[id] = append(tagsMap[id], map[string]any{"id": pgUUIDToString(t.ID), "name": httpx.ResolveTranslatedField(t.Name, t.Translations, "name", lang)})
	}
	allergensMap := map[string][]map[string]any{}
	for _, a := range allergenRows {
		id := pgUUIDToString(a.MenuItemID)
		allergensMap[id] = append(allergensMap[id], map[string]any{"id": pgUUIDToString(a.ID), "name": httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang)})
	}

	result := make([]map[string]any, 0, len(items))
	for _, it := range items {
		mid := pgUUIDToString(it.ID)
		result = append(result, map[string]any{
			"id":                 mid,
			"sectionId":          pgUUIDToString(it.SectionID),
			"name":               it.Name,
			"description":        httpx.ResolveTranslatedField(ptrStr(it.Description), it.Translations, "description", lang),
			"images":             it.Images,
			"price":              httpx.NumericToString(it.Price),
			"type":               it.Type,
			"discountType":       it.DiscountType,
			"discountLabel":      it.DiscountLabel,
			"isAvailable":        it.IsAvailable,
			"isChefsRecommended": it.IsChefsRecommended,
			"isPopular":          it.IsPopular,
			"isNew":              it.IsNew,
			"isLimitedTime":      it.IsLimitedTime,
			"hasVariants":        it.HasVariants,
			"cookTime":           it.CookTime,
			"spiceLevel":         it.SpiceLevel,
			"isAlcoholic":        it.IsAlcoholic,
			"createdAt":          pgTimestampToString(it.CreatedAt),
			"tags":               tagsMap[mid],
			"allergens":          allergensMap[mid],
		})
	}
	httpx.WritePaginatedNested(w, http.StatusOK, result, total, limit, offset)
}

// GET /admin/menu-items/:id
func (h *MenuItemsHandler) GetMenuItem(w http.ResponseWriter, r *http.Request) {
	lang := httpx.LangFromContext(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	user := authm.GetAdminUser(r.Context())
	ctx := r.Context()
	item, err := h.q.GetAdminMenuItemByID(ctx, sqlc.GetAdminMenuItemByIDParams{
		ID:           id,
		RestaurantID: user.RestaurantID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Menu item not found")
		return
	}

	ids := []pgtype.UUID{item.ID}
	tagRows, _ := h.q.ListItemTagsByItemIDs(ctx, ids)
	allergenRows, _ := h.q.ListItemAllergensByItemIDs(ctx, ids)
	addonRows, _ := h.q.ListItemAddonsByItemID(ctx, item.ID)
	variantRows, _ := h.q.ListItemVariantsByItemID(ctx, item.ID)

	tags := make([]map[string]any, 0, len(tagRows))
	for _, t := range tagRows {
		tags = append(tags, map[string]any{"id": pgUUIDToString(t.ID), "name": httpx.ResolveTranslatedField(t.Name, t.Translations, "name", lang)})
	}
	allergens := make([]map[string]any, 0, len(allergenRows))
	for _, a := range allergenRows {
		allergens = append(allergens, map[string]any{"id": pgUUIDToString(a.ID), "name": httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang)})
	}
	addons := make([]map[string]any, 0, len(addonRows))
	for _, a := range addonRows {
		addons = append(addons, map[string]any{"id": pgUUIDToString(a.ID), "name": httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang), "price": httpx.NumericToString(a.Price)})
	}
	variants := make([]map[string]any, 0, len(variantRows))
	for _, v := range variantRows {
		variants = append(variants, map[string]any{"id": pgUUIDToString(v.ID), "name": httpx.ResolveTranslatedField(v.Name, v.Translations, "name", lang), "price": httpx.NumericToString(v.Price), "isAvailable": v.IsAvailable})
	}

	ingStr := strings.Join(item.Ingredients, ",")
	translatedIng := httpx.ResolveTranslatedField(ingStr, item.Translations, "ingredients", lang)
	ingredients := []string{}
	if translatedIng != "" {
		ingredients = strings.Split(translatedIng, ",")
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"id": pgUUIDToString(item.ID), "sectionId": pgUUIDToString(item.SectionID),
		"name": item.Name, "description": httpx.ResolveTranslatedField(ptrStr(item.Description), item.Translations, "description", lang),
		"images": item.Images, "price": httpx.NumericToString(item.Price), "type": item.Type,
		"discountType": item.DiscountType, "discountValue": httpx.NumericToString(item.DiscountValue),
		"discountStartAt": pgTimestampToString(item.DiscountStartAt), "discountEndAt": pgTimestampToString(item.DiscountEndAt),
		"discountLabel": item.DiscountLabel, "isAvailable": item.IsAvailable,
		"spiceLevel": item.SpiceLevel, "cookTime": item.CookTime, "isAlcoholic": item.IsAlcoholic,
		"hasVariants": item.HasVariants, "isChefsRecommended": item.IsChefsRecommended,
		"isPopular": item.IsPopular, "isNew": item.IsNew, "isLimitedTime": item.IsLimitedTime,
		"ingredients": ingredients, "tags": tags, "allergens": allergens, "addOns": addons, "variants": variants,
	})
}

// PUT /admin/menu-items/:id
func (h *MenuItemsHandler) UpdateMenuItem(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid item id")
		return
	}
	var body menuItemBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()

	// Verify ownership before any mutation — UpdateMenuItem uses Exec which
	// returns nil error even on 0 rows, so a cross-tenant ID would silently
	// pass through and allow relation mutations on another restaurant's item.
	before, err := h.snapshotMenuItem(ctx, id, user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Menu item not found")
		return
	}

	if err := h.q.UpdateMenuItem(ctx, sqlc.UpdateMenuItemParams{
		Column1: body.Name, Description: body.Description, Images: body.Images,
		Price: parsePrice(body.Price), DiscountType: body.DiscountType,
		DiscountValue: parsePrice(ptrStr(body.DiscountValue)), DiscountLabel: body.DiscountLabel,
		Ingredients: body.Ingredients, IsAvailable: body.IsAvailable,
		SpiceLevel: (*sqlc.SpiceLevel)(body.SpiceLevel), CookTime: body.CookTime,
		IsAlcoholic: body.IsAlcoholic, HasVariants: body.HasVariants,
		IsChefsRecommended: body.IsChefsRecommended, IsPopular: body.IsPopular,
		IsNew: body.IsNew, IsLimitedTime: body.IsLimitedTime,
		ID: id, RestaurantID: user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update menu item")
		return
	}

	if body.Allergens != nil {
		_ = h.q.DeleteMenuItemAllergens(ctx, id)
		for _, aID := range body.Allergens {
			if aid, err := parseUUID(aID); err == nil {
				_ = h.q.InsertMenuItemAllergen(ctx, sqlc.InsertMenuItemAllergenParams{MenuItemID: id, AllergenID: aid})
			}
		}
	}
	if body.Variants != nil {
		_ = h.q.DeleteMenuItemVariants(ctx, id)
		lang := httpx.LangFromContext(ctx)
		for _, v := range body.Variants {
			if vid, err := h.q.InsertMenuItemVariant(ctx, sqlc.InsertMenuItemVariantParams{
				ItemID: id, Name: v.Name, Price: parsePrice(v.Price), Image: v.Image,
			}); err == nil {
				h.t.After(ctx, "variant", pgUUIDToString(vid), lang, translation.Fields("name", v.Name))
			}
		}
	}
	if body.AddOns != nil {
		_ = h.q.DeleteMenuItemAddons(ctx, id)
		for _, aID := range body.AddOns {
			if aid, err := parseUUID(aID); err == nil {
				_ = h.q.InsertMenuItemAddon(ctx, sqlc.InsertMenuItemAddonParams{ItemID: id, AddonID: aid})
			}
		}
	}
	if body.Tags != nil {
		_ = h.q.DeleteMenuItemTags(ctx, id)
		for _, tID := range body.Tags {
			if tid, err := parseUUID(tID); err == nil {
				_ = h.q.InsertMenuItemTag(ctx, sqlc.InsertMenuItemTagParams{MenuItemID: id, TagID: tid})
			}
		}
	}

	after, _ := h.snapshotMenuItem(ctx, id, user.RestaurantID)
	h.audit.Updated(ctx, sqlc.AuditEntityMenuItem, id, user.ID, user.RestaurantID, before, after)
	h.t.After(ctx, "menu_item", pgUUIDToString(id), httpx.LangFromContext(ctx),
		translation.Fields(
			"description", ptrStr(body.Description),
			"ingredients", strings.Join(body.Ingredients, ","),
		))
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu item updated successfully"})
}

// DELETE /admin/menu-items/:id
func (h *MenuItemsHandler) DeleteMenuItem(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	ctx := r.Context()
	if err := h.q.DeleteMenuItem(ctx, sqlc.DeleteMenuItemParams{ID: id, RestaurantID: user.RestaurantID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete menu item")
		return
	}

	h.audit.Deleted(ctx, sqlc.AuditEntityMenuItem, id, user.ID, user.RestaurantID, nil)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Menu item deleted successfully"})
}

// POST /admin/menu-items/bulk-upload
// Enqueues items to Redis if UPSTASH_REDIS_URL is set, otherwise processes synchronously.
// Both paths call the same bulk insert logic from the queue package.
func (h *MenuItemsHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	var body struct {
		Items     []queue.BulkItem `json:"items"`
		SectionID string           `json:"sectionId"`
		MenuID    string           `json:"menuId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(body.Items) == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "items array is empty")
		return
	}

	payload := queue.BulkUploadPayload{
		RestaurantID: pgUUIDToString(user.RestaurantID),
		SectionID:    body.SectionID,
		MenuID:       body.MenuID,
		Lang:         lang,
		PerformedBy:  pgUUIDToString(user.ID),
		Items:        body.Items,
	}

	if h.queueClient != nil {
		if err := queue.EnqueueBulkUpload(r.Context(), h.queueClient, payload); err == nil {
			httpx.WriteSuccess(w, http.StatusOK, map[string]any{
				"success": true,
				"message": "Upload queued for background processing",
				"count":   len(body.Items),
			})
			return
		}
	}

	// Synchronous fallback: run inline (matches the Bun implementation)
	result := queue.ProcessBulkUploadSync(r.Context(), h.q, nil, h.audit, payload)
	httpx.WriteSuccess(w, http.StatusOK, result)
}

func insertItemRelations(ctx context.Context, q *sqlc.Queries, t *translation.Enqueuer,
	itemID pgtype.UUID, allergens, addons, tags []string, variants []menuItemVariantBody, lang string,
) {
	for _, aID := range allergens {
		if aid, err := parseUUID(aID); err == nil {
			_ = q.InsertMenuItemAllergen(ctx, sqlc.InsertMenuItemAllergenParams{MenuItemID: itemID, AllergenID: aid})
		}
	}
	for _, v := range variants {
		if vid, err := q.InsertMenuItemVariant(ctx, sqlc.InsertMenuItemVariantParams{
			ItemID: itemID, Name: v.Name, Price: parsePrice(v.Price), Image: v.Image,
		}); err == nil {
			t.After(ctx, "variant", pgUUIDToString(vid), lang, translation.Fields("name", v.Name))
		}
	}
	for _, aID := range addons {
		if aid, err := parseUUID(aID); err == nil {
			_ = q.InsertMenuItemAddon(ctx, sqlc.InsertMenuItemAddonParams{ItemID: itemID, AddonID: aid})
		}
	}
	for _, tID := range tags {
		if tid, err := parseUUID(tID); err == nil {
			_ = q.InsertMenuItemTag(ctx, sqlc.InsertMenuItemTagParams{MenuItemID: itemID, TagID: tid})
		}
	}
}
