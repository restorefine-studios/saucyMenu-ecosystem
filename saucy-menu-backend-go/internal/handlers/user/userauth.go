package user

import (
	"encoding/json"
	"net/http"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	userjwt "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/jwt"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type AuthHandler struct {
	q         *sqlc.Queries
	jwtSecret string
}

func NewAuthHandler(q *sqlc.Queries, jwtSecret string) *AuthHandler {
	return &AuthHandler{q: q, jwtSecret: jwtSecret}
}

// POST /user/auth/session
// Creates a diner session and returns a signed END_USER JWT.
func (h *AuthHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RestaurantID string `json:"restaurantId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.RestaurantID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "restaurantId is required")
		return
	}

	rid, err := parseUUID(body.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId")
		return
	}

	ctx := r.Context()
	sessionID, err := h.q.CreateUserSession(ctx, rid)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	sidStr := pgUUIDToString(sessionID)

	token, err := userjwt.SignEndUser(h.jwtSecret, sidStr, body.RestaurantID, sidStr)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to sign token")
		return
	}

	var currency any
	if cur, err := h.q.GetUserSessionCurrency(ctx, sessionID); err == nil {
		currency = map[string]any{
			"id":     pgUUIDToString(cur.ID),
			"code":   cur.Code,
			"name":   cur.Name,
			"symbol": cur.Symbol,
		}
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"sessionId": sidStr,
		"token":     token,
		"currency":  currency,
	})
}

// GET /user/auth/restaurant
func (h *AuthHandler) GetRestaurant(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	ctx := r.Context()
	resto, err := h.q.GetRestaurantForDiner(ctx, rid)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "restaurant not found")
		return
	}

	var avgRating float64
	var reviewCount int64
	if rating, err := h.q.GetRestaurantAverageRating(ctx, rid); err == nil {
		avgRating = numericToFloat(rating.AvgRating)
		reviewCount = rating.ReviewCount
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"id":            pgUUIDToString(resto.ID),
		"name":          resto.Name,
		"description":   resto.Description,
		"image":         resto.Image,
		"bannerUrl":     resto.BannerUrl,
		"address":       resto.Address,
		"phone":         resto.Phone,
		"website":       resto.Website,
		"slug":          resto.Slug,
		"averageRating": avgRating,
		"reviewCount":   reviewCount,
	})
}

// POST /user/auth/ai/generate — log AI token usage for Stripe metered billing
func (h *AuthHandler) LogAIUsage(w http.ResponseWriter, r *http.Request) {
	// TODO: Stripe metered billing — Phase 4
	// Receiving and acknowledging the request now to keep the contract intact.
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "logged"})
}

