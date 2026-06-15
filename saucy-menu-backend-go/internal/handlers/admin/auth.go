package admin

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type AuthHandler struct {
	q *sqlc.Queries
}

func NewAuthHandler(q *sqlc.Queries) *AuthHandler {
	return &AuthHandler{q: q}
}

// POST /admin/auth/setup — initial brand/restaurant setup
func (h *AuthHandler) Setup(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Image       *string `json:"image"`
		CurrencyID  string  `json:"currencyId"`
		LanguageID  string  `json:"languageId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if user.SetupComplete != nil && *user.SetupComplete {
		httpx.WriteError(w, http.StatusBadRequest, "Brand has already been setup")
		return
	}

	cid, err := parseUUID(body.CurrencyID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid currencyId")
		return
	}
	lid, err := parseUUID(body.LanguageID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid languageId")
		return
	}

	ctx := r.Context()

	var restaurantID = user.RestaurantID
	if restaurantID.Valid {
		// Update existing restaurant
		if err := h.q.UpdateRestaurantForSetup(ctx, sqlc.UpdateRestaurantForSetupParams{
			Name:       &body.Name,
			Description: &body.Description,
			Image:       body.Image,
			CurrencyId:  cid,
			ID:          restaurantID,
		}); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Failed to update brand")
			return
		}
	} else {
		// Create new restaurant
		newResto, err := h.q.CreateRestaurant(ctx, sqlc.CreateRestaurantParams{
			Name:        &body.Name,
			Description: &body.Description,
			Image:       body.Image,
			CurrencyId:  cid,
		})
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Failed to create brand")
			return
		}
		restaurantID = newResto
	}

	if err := h.q.LinkUserToRestaurant(ctx, sqlc.LinkUserToRestaurantParams{
		RestaurantID: restaurantID,
		LanguageID:   lid,
		ID:           user.ID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update user profile")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Brand setup complete"})
}

// GET /admin/auth/profile
func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())

	profile, err := h.q.GetAdminProfile(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "User not found")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"email":      profile.Email,
		"name":       profile.Name,
		"role":       profile.Role,
		"languageId": pgUUIDToString(profile.LanguageID),
		"restaurant": map[string]any{
			"id":          pgUUIDToString(profile.RestaurantID),
			"name":        profile.RestaurantName,
			"address":     profile.Address,
			"image":       profile.Image,
			"description": profile.Description,
			"currencyId":  pgUUIDToString(profile.RestaurantCurrencyID),
			"slug":        profile.Slug,
		},
	})
}

// PUT /admin/auth/setup — update restaurant info
func (h *AuthHandler) UpdateSetup(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Image       *string `json:"image"`
		Address     *string `json:"address"`
		BannerURL   *string `json:"bannerUrl"`
		CurrencyID  *string `json:"currencyId"`
		LanguageID  *string `json:"languageId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !user.RestaurantID.Valid {
		httpx.WriteError(w, http.StatusBadRequest, "No restaurant linked to account")
		return
	}

	ctx := r.Context()
	var cid pgtype.UUID
	if body.CurrencyID != nil {
		cid, _ = parseUUID(*body.CurrencyID)
	}

	if err := h.q.UpdateRestaurantInfo(ctx, sqlc.UpdateRestaurantInfoParams{
		Name:        body.Name,
		Description: body.Description,
		Image:       body.Image,
		Address:     body.Address,
		BannerUrl:   body.BannerURL,
		CurrencyId:  cid,
		ID:          user.RestaurantID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update info")
		return
	}

	if body.LanguageID != nil {
		lid, err := parseUUID(*body.LanguageID)
		if err == nil {
			_ = h.q.UpdateUserLanguage(ctx, sqlc.UpdateUserLanguageParams{
				LanguageID: lid,
				ID:         user.ID,
			})
		}
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Info Updated Successfully"})
}

// GET /admin/auth/status
func (h *AuthHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	info, err := h.q.GetUserWithRestaurantStatus(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "User not found")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"suspended": info.Suspended,
	})
}
