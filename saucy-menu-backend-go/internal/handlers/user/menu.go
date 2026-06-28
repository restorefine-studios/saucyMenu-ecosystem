package user

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type MenuHandler struct {
	q *sqlc.Queries
}

func NewMenuHandler(q *sqlc.Queries) *MenuHandler {
	return &MenuHandler{q: q}
}

// GET /user/menu/
func (h *MenuHandler) ListMenus(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}

	ctx := r.Context()
	menus, err := h.q.ListMenusByRestaurant(ctx, rid)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch menus")
		return
	}

	if len(menus) == 0 {
		httpx.WriteSuccess(w, http.StatusOK, []any{})
		return
	}

	// Build first-image map per menu
	imageMap := map[string]string{}
	for _, m := range menus {
		imgs, err := h.q.ListMenuItemImagesForMenu(ctx, m.ID)
		if err != nil {
			continue
		}
		for _, row := range imgs {
			if _, already := imageMap[pgUUIDToString(m.ID)]; already {
				break
			}
			for _, img := range row.Images {
				if img != "" && !strings.HasPrefix(img, "[") {
					imageMap[pgUUIDToString(m.ID)] = img
					break
				}
			}
		}
	}

	result := make([]map[string]any, 0, len(menus))
	for _, m := range menus {
		mid := pgUUIDToString(m.ID)
		result = append(result, map[string]any{
			"id":          mid,
			"name":        httpx.ResolveTranslatedField(m.Name, m.Translations, "name", lang),
			"description": httpx.ResolveTranslatedField(ptrStr(m.Description), m.Translations, "description", lang),
			"active":      m.Active,
			"startTime":   m.StartTime,
			"endTime":     m.EndTime,
			"createdAt":   pgTimestampToString(m.CreatedAt),
			"updatedAt":   pgTimestampToString(m.UpdatedAt),
			"image":       imageMap[mid],
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /user/menu/menu-items/all
func (h *MenuHandler) ListAllMenuItems(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}

	items, err := h.q.ListAllMenuItemsForRestaurant(r.Context(), rid)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch menu items")
		return
	}

	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		var section any
		if item.MsID.Valid {
			section = map[string]any{
				"id":        pgUUIDToString(item.MsID),
				"name":      httpx.ResolveTranslatedField(ptrStr(item.MsName), item.MsTranslations, "name", lang),
				"sortOrder": item.MsSortOrder,
			}
		}
		result = append(result, map[string]any{
			"id":          pgUUIDToString(item.ID),
			"name":        httpx.ResolveTranslatedField(item.Name, item.Translations, "name", lang),
			"description": httpx.ResolveTranslatedField(ptrStr(item.Description), item.Translations, "description", lang),
			"images":      item.Images,
			"price":       httpx.NumericToString(item.Price),
			"type":        item.Type,
			"isAvailable": item.IsAvailable,
			"createdAt":   pgTimestampToString(item.CreatedAt),
			"section":     section,
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /user/menu/items/:menuId  — single item by ID (despite the param name being menuId)
func (h *MenuHandler) GetMenuItemByID(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	itemID, err := parseUUID(chi.URLParam(r, "menuId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	item, err := h.q.GetMenuItemDetailByID(r.Context(), sqlc.GetMenuItemDetailByIDParams{
		ID:           itemID,
		RestaurantID: rid,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "item not found")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, menuItemDetailToMap(item, lang))
}

// GET /user/menu-items/?menuId=...&dietMode=bool&allergenMode=bool&search=...
func (h *MenuHandler) ListMenuItems(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	q := r.URL.Query()
	menuIDStr := q.Get("menuId")
	if menuIDStr == "" {
		httpx.WriteError(w, http.StatusBadRequest, "menuId is required")
		return
	}
	menuID, err := parseUUID(menuIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menuId")
		return
	}
	sectionIDStr := q.Get("sectionId")
	dietMode := q.Get("dietMode") == "true"
	allergenMode := q.Get("allergenMode") == "true"
	search := strings.ToLower(strings.TrimSpace(q.Get("search")))

	ctx := r.Context()
	items, err := h.q.ListMenuItemsByMenu(ctx, sqlc.ListMenuItemsByMenuParams{
		MenuID:       menuID,
		RestaurantID: rid,
	})
	if err != nil || len(items) == 0 {
		httpx.WriteSuccess(w, http.StatusOK, []any{})
		return
	}

	// Section filter — only return items belonging to the requested section
	if sectionIDStr != "" {
		filtered := items[:0]
		for _, it := range items {
			if pgUUIDToString(it.SectionID) == sectionIDStr {
				filtered = append(filtered, it)
			}
		}
		items = filtered
	}

	// Search filter
	if search != "" {
		filtered := items[:0]
		for _, it := range items {
			if strings.Contains(strings.ToLower(it.Name), search) {
				filtered = append(filtered, it)
			}
		}
		items = filtered
	}

	// Batch fetch tags + allergens
	itemIDs := make([]pgtype.UUID, len(items))
	for i, it := range items {
		itemIDs[i] = it.ID
	}

	tagRows, _ := h.q.ListItemTagsByItemIDs(ctx, itemIDs)
	allergenRows, _ := h.q.ListItemAllergensByItemIDs(ctx, itemIDs)
	ratingRows, _ := h.q.GetBulkItemRatings(ctx, itemIDs)

	ratingsMap := map[string][2]any{}
	for _, rr := range ratingRows {
		ratingsMap[pgUUIDToString(rr.ReviewableID)] = [2]any{numericToFloat(rr.AvgRating), rr.ReviewCount}
	}

	tagsMap := map[string][]map[string]any{}
	for _, row := range tagRows {
		id := pgUUIDToString(row.MenuItemID)
		tagsMap[id] = append(tagsMap[id], map[string]any{
			"id":   pgUUIDToString(row.ID),
			"name": httpx.ResolveTranslatedField(row.Name, row.Translations, "name", lang),
		})
	}
	allergensMap := map[string][]map[string]any{}
	for _, row := range allergenRows {
		id := pgUUIDToString(row.MenuItemID)
		allergensMap[id] = append(allergensMap[id], map[string]any{
			"id":   pgUUIDToString(row.ID),
			"name": httpx.ResolveTranslatedField(row.Name, row.Translations, "name", lang),
		})
	}

	// Session preference filtering
	var sessionTagIDs, sessionAllergenIDs map[string]bool
	if dietMode || allergenMode {
		sid, _ := parseUUID(user.SessionID)
		if dietMode {
			stags, _ := h.q.GetSessionPreferenceTags(ctx, sid)
			sessionTagIDs = make(map[string]bool, len(stags))
			for _, t := range stags {
				sessionTagIDs[pgUUIDToString(t)] = true
			}
		}
		if allergenMode {
			sallergens, _ := h.q.GetSessionPreferenceAllergens(ctx, sid)
			sessionAllergenIDs = make(map[string]bool, len(sallergens))
			for _, a := range sallergens {
				sessionAllergenIDs[pgUUIDToString(a)] = true
			}
		}
	}

	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		mid := pgUUIDToString(item.ID)

		// Diet filter: if dietMode and session has tags, item must match at least one
		if dietMode && len(sessionTagIDs) > 0 {
			matched := false
			for _, tag := range tagsMap[mid] {
				if sessionTagIDs[tag["id"].(string)] {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		// Allergen filter: if allergenMode and session has allergens, item must not contain any
		if allergenMode && len(sessionAllergenIDs) > 0 {
			blocked := false
			for _, allergen := range allergensMap[mid] {
				if sessionAllergenIDs[allergen["id"].(string)] {
					blocked = true
					break
				}
			}
			if blocked {
				continue
			}
		}

		rr := ratingsMap[mid]
		result = append(result, map[string]any{
			"id":              mid,
			"sectionId":       pgUUIDToString(item.SectionID),
			"name":            httpx.ResolveTranslatedField(item.Name, item.Translations, "name", lang),
			"description":     httpx.ResolveTranslatedField(ptrStr(item.Description), item.Translations, "description", lang),
			"images":          item.Images,
			"price":           httpx.NumericToString(item.Price),
			"discountType":    item.DiscountType,
			"discountValue":   httpx.NumericToString(item.DiscountValue),
			"discountStartAt": pgTimestampToString(item.DiscountStartAt),
			"discountEndAt":   pgTimestampToString(item.DiscountEndAt),
			"discountLabel":   item.DiscountLabel,
			"isAvailable":     item.IsAvailable,
			"spiceLevel":      item.SpiceLevel,
			"cookTime":        item.CookTime,
			"isAlcoholic":     item.IsAlcoholic,
			"hasVariants":     item.HasVariants,
			"isChefsRecommended": item.IsChefsRecommended,
			"isPopular":       item.IsPopular,
			"isNew":           item.IsNew,
			"isLimitedTime":   item.IsLimitedTime,
			"createdAt":       pgTimestampToString(item.CreatedAt),
			"type":            item.Type,
			"tags":            tagsMap[mid],
			"allergens":       allergensMap[mid],
			"averageRating":   rr[0],
			"reviewCount":     rr[1],
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /user/menu-items/classified-items
func (h *MenuHandler) ListClassifiedItems(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}

	menuIDStr := r.URL.Query().Get("menuId")
	if menuIDStr == "" {
		httpx.WriteError(w, http.StatusBadRequest, "menuId is required")
		return
	}
	menuID, err := parseUUID(menuIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menuId")
		return
	}

	items, err := h.q.ListClassifiedMenuItems(r.Context(), sqlc.ListClassifiedMenuItemsParams{
		MenuID:       menuID,
		RestaurantID: rid,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch classified items")
		return
	}

	classifiedIDs := make([]pgtype.UUID, len(items))
	for i, it := range items {
		classifiedIDs[i] = it.ID
	}
	classifiedRatingRows, _ := h.q.GetBulkItemRatings(r.Context(), classifiedIDs)
	classifiedRatingsMap := map[string][2]any{}
	for _, rr := range classifiedRatingRows {
		classifiedRatingsMap[pgUUIDToString(rr.ReviewableID)] = [2]any{numericToFloat(rr.AvgRating), rr.ReviewCount}
	}

	toItem := func(it sqlc.ListClassifiedMenuItemsRow) map[string]any {
		mid := pgUUIDToString(it.ID)
		rr := classifiedRatingsMap[mid]
		return map[string]any{
			"id":                 mid,
			"name":               httpx.ResolveTranslatedField(it.Name, it.Translations, "name", lang),
			"description":        httpx.ResolveTranslatedField(ptrStr(it.Description), it.Translations, "description", lang),
			"images":             it.Images,
			"price":              httpx.NumericToString(it.Price),
			"type":               it.Type,
			"hasVariants":        it.HasVariants,
			"isAvailable":        it.IsAvailable,
			"isChefsRecommended": it.IsChefsRecommended,
			"isPopular":          it.IsPopular,
			"isNew":              it.IsNew,
			"isLimitedTime":      it.IsLimitedTime,
			"averageRating":      rr[0],
			"reviewCount":        rr[1],
		}
	}

	data := map[string][]map[string]any{
		"chefsRecommended": {},
		"popular":          {},
		"new":              {},
		"limitedTime":      {},
	}
	for _, it := range items {
		m := toItem(it)
		if it.IsChefsRecommended != nil && *it.IsChefsRecommended {
			data["chefsRecommended"] = append(data["chefsRecommended"], m)
		}
		if it.IsPopular != nil && *it.IsPopular {
			data["popular"] = append(data["popular"], m)
		}
		if it.IsNew != nil && *it.IsNew {
			data["new"] = append(data["new"], m)
		}
		if it.IsLimitedTime != nil && *it.IsLimitedTime {
			data["limitedTime"] = append(data["limitedTime"], m)
		}
	}
	httpx.WriteSuccess(w, http.StatusOK, data)
}

// GET /user/menu-items/:id
func (h *MenuHandler) GetMenuItemDetail(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	itemID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	ctx := r.Context()
	item, err := h.q.GetMenuItemDetailByID(ctx, sqlc.GetMenuItemDetailByIDParams{
		ID:           itemID,
		RestaurantID: rid,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "item not found")
		return
	}

	// Batch tags, allergens, addons, variants
	ids := []pgtype.UUID{item.ID}
	tagRows, _ := h.q.ListItemTagsByItemIDs(ctx, ids)
	allergenRows, _ := h.q.ListItemAllergensByItemIDs(ctx, ids)
	addonRows, _ := h.q.ListItemAddonsByItemID(ctx, item.ID)
	variantRows, _ := h.q.ListItemVariantsByItemID(ctx, item.ID)

	tags := make([]map[string]any, 0, len(tagRows))
	for _, t := range tagRows {
		tags = append(tags, map[string]any{
			"id":   pgUUIDToString(t.ID),
			"name": httpx.ResolveTranslatedField(t.Name, t.Translations, "name", lang),
		})
	}
	allergens := make([]map[string]any, 0, len(allergenRows))
	for _, a := range allergenRows {
		allergens = append(allergens, map[string]any{
			"id":   pgUUIDToString(a.ID),
			"name": httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang),
		})
	}
	addons := make([]map[string]any, 0, len(addonRows))
	for _, a := range addonRows {
		addons = append(addons, map[string]any{
			"id":    pgUUIDToString(a.ID),
			"name":  httpx.ResolveTranslatedField(a.Name, a.Translations, "name", lang),
			"price": httpx.NumericToString(a.Price),
		})
	}
	variants := make([]map[string]any, 0, len(variantRows))
	for _, v := range variantRows {
		variants = append(variants, map[string]any{
			"id":          pgUUIDToString(v.ID),
			"name":        httpx.ResolveTranslatedField(v.Name, v.Translations, "name", lang),
			"price":       httpx.NumericToString(v.Price),
			"isAvailable": v.IsAvailable,
			"image":       v.Image,
		})
	}

	// Ingredients translated
	ingStr := strings.Join(item.Ingredients, ",")
	translatedIng := httpx.ResolveTranslatedField(ingStr, item.Translations, "ingredients", lang)
	ingredients := []string{}
	if translatedIng != "" {
		ingredients = strings.Split(translatedIng, ",")
	}

	result := menuItemDetailToMap(item, lang)
	result["tags"] = tags
	result["allergens"] = allergens
	result["addons"] = addons
	result["variants"] = variants
	result["ingredients"] = ingredients

	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /user/menu-sections/:menuId
func (h *MenuHandler) ListMenuSections(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	lang := httpx.LangFromContext(r.Context())

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	menuID, err := parseUUID(chi.URLParam(r, "menuId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid menuId")
		return
	}

	sections, err := h.q.ListMenuSectionsByMenuID(r.Context(), sqlc.ListMenuSectionsByMenuIDParams{
		MenuID:       menuID,
		RestaurantID: rid,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch sections")
		return
	}

	result := make([]map[string]any, 0, len(sections))
	for _, s := range sections {
		result = append(result, map[string]any{
			"id":          pgUUIDToString(s.ID),
			"name":        httpx.ResolveTranslatedField(s.Name, s.Translations, "name", lang),
			"description": ptrStr(s.Description),
			"sortOrder":   s.SortOrder,
			"createdAt":   pgTimestampToString(s.CreatedAt),
		})
	}

	menuTitle := ""
	menuDesc := ""
	if len(sections) > 0 {
		menuTitle = httpx.ResolveTranslatedField(sections[0].MenuName, sections[0].MenuTranslations, "name", lang)
		menuDesc = httpx.ResolveTranslatedField(ptrStr(sections[0].MenuDescription), sections[0].MenuTranslations, "description", lang)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success":         true,
		"menuTitle":       menuTitle,
		"menuDescription": menuDesc,
		"data":            result,
	})
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func menuItemDetailToMap(item sqlc.GetMenuItemDetailByIDRow, lang string) map[string]any {
	return map[string]any{
		"id":                 pgUUIDToString(item.ID),
		"sectionId":          pgUUIDToString(item.SectionID),
		"name":               httpx.ResolveTranslatedField(item.Name, item.Translations, "name", lang),
		"description":        httpx.ResolveTranslatedField(ptrStr(item.Description), item.Translations, "description", lang),
		"images":             item.Images,
		"price":              httpx.NumericToString(item.Price),
		"discountType":       item.DiscountType,
		"discountValue":      httpx.NumericToString(item.DiscountValue),
		"discountStartAt":    pgTimestampToString(item.DiscountStartAt),
		"discountEndAt":      pgTimestampToString(item.DiscountEndAt),
		"discountLabel":      item.DiscountLabel,
		"isAvailable":        item.IsAvailable,
		"spiceLevel":         item.SpiceLevel,
		"cookTime":           item.CookTime,
		"isAlcoholic":        item.IsAlcoholic,
		"hasVariants":        item.HasVariants,
		"isChefsRecommended": item.IsChefsRecommended,
		"isPopular":          item.IsPopular,
		"isNew":              item.IsNew,
		"isLimitedTime":      item.IsLimitedTime,
		"type":               item.Type,
		"createdAt":          pgTimestampToString(item.CreatedAt),
	}
}

func numericToFloat(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return 0
	}
	return f.Float64
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func parseUUID(s string) (pgtype.UUID, error) {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID")
	}
	var uid pgtype.UUID
	for i := 0; i < 16; i++ {
		var b byte
		if _, err := fmt.Sscanf(s[i*2:i*2+2], "%02x", &b); err != nil {
			return pgtype.UUID{}, err
		}
		uid.Bytes[i] = b
	}
	uid.Valid = true
	return uid, nil
}

func pgUUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func pgTimestampToString(t pgtype.Timestamp) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
}
