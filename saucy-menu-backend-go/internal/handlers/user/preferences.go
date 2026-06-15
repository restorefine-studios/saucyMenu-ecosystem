package user

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type PreferencesHandler struct {
	q *sqlc.Queries
}

func NewPreferencesHandler(q *sqlc.Queries) *PreferencesHandler {
	return &PreferencesHandler{q: q}
}

// GET /user/preferences/?type=...
func (h *PreferencesHandler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	tagType := r.URL.Query().Get("type")

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}

	var result []map[string]any
	if tagType != "" {
		tags, err := h.q.ListTagsByRestaurantAndType(r.Context(), sqlc.ListTagsByRestaurantAndTypeParams{
			RestaurantID: rid,
			Type:         sqlc.TagType(tagType),
		})
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch tags")
			return
		}
		result = make([]map[string]any, 0, len(tags))
		for _, t := range tags {
			result = append(result, map[string]any{
				"id":   pgUUIDToString(t.ID),
				"name": t.Name,
				"type": t.Type,
			})
		}
	} else {
		tags, err := h.q.ListTagsByRestaurant(r.Context(), rid)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch tags")
			return
		}
		result = make([]map[string]any, 0, len(tags))
		for _, t := range tags {
			result = append(result, map[string]any{
				"id":   pgUUIDToString(t.ID),
				"name": t.Name,
				"type": t.Type,
			})
		}
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// POST /user/preferences/
func (h *PreferencesHandler) SavePreferences(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	var body struct {
		Diets     []string `json:"diets"`
		Allergens []string `json:"allergens"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	sid, err := parseUUID(user.SessionID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid sessionId in token")
		return
	}

	ctx := r.Context()

	if body.Diets != nil {
		if err := h.q.DeleteSessionTags(ctx, sid); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "failed to update diets")
			return
		}
		for _, dietID := range body.Diets {
			tid, err := parseUUID(dietID)
			if err != nil {
				continue
			}
			_ = h.q.InsertSessionTag(ctx, sqlc.InsertSessionTagParams{
				SessionID: sid,
				TagID:     tid,
			})
		}
	}

	if body.Allergens != nil {
		if err := h.q.DeleteSessionAllergens(ctx, sid); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "failed to update allergens")
			return
		}
		for _, allergenID := range body.Allergens {
			aid, err := parseUUID(allergenID)
			if err != nil {
				continue
			}
			_ = h.q.InsertSessionAllergen(ctx, sqlc.InsertSessionAllergenParams{
				SessionID: sid,
				AllergenID: pgtype.UUID(aid),
			})
		}
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Preferences updated successfully"})
}
