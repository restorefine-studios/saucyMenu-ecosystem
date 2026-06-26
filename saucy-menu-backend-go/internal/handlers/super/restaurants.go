package super

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/passwordhash"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/plunk"
)

type RestaurantsHandler struct {
	q     *sqlc.Queries
	plunk *plunk.Client
}

func NewRestaurantsHandler(q *sqlc.Queries, plunk *plunk.Client) *RestaurantsHandler {
	return &RestaurantsHandler{q: q, plunk: plunk}
}

// GET /super/restaurants/
func (h *RestaurantsHandler) List(w http.ResponseWriter, r *http.Request) {
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
	var searchPtr, statusPtr *string
	if s := q.Get("search"); s != "" {
		v := "%" + strings.ToLower(s) + "%"
		searchPtr = &v
	}
	if s := q.Get("status"); s != "" {
		statusPtr = &s
	}

	search := ptrStr(searchPtr)
	status := ptrStr(statusPtr)

	ctx := r.Context()
	total, _ := h.q.CountRestaurantsForSuper(ctx, sqlc.CountRestaurantsForSuperParams{
		Column1: search,
		Column2: status,
	})
	rows, err := h.q.ListRestaurantsForSuper(ctx, sqlc.ListRestaurantsForSuperParams{
		Column1: search,
		Column2: status,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch restaurants")
		return
	}

	result := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		result = append(result, map[string]any{
			"id":          pgUUIDToString(r.ID),
			"name":        r.Name,
			"address":     r.Address,
			"image":       r.Image,
			"description": r.Description,
			"status":      r.Status,
			"email":       r.AdminEmail,
			"suspended":   r.Suspended,
			"createdAt":   pgTimestampToString(r.CreatedAt),
		})
	}
	httpx.WritePaginatedSpread(w, http.StatusOK, result, total, limit, offset)
}

// POST /super/restaurants/
func (h *RestaurantsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name           string `json:"name"`
		Email          string `json:"email"`
		RestaurantName string `json:"restaurantName"`
		CurrencyID     string `json:"currencyId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	cid, err := parseUUID(body.CurrencyID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid currencyId")
		return
	}

	ctx := r.Context()

	// Check duplicate
	existing, _ := h.q.GetUserByEmailForSuper(ctx, strings.ToLower(body.Email))
	if existing.ID.Valid {
		httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": false, "message": "Restaurant already exists"})
		return
	}

	// Generate slug from restaurant name
	slug := generateSlug(body.RestaurantName)

	rid, err := h.q.CreateRestaurantForSuper(ctx, sqlc.CreateRestaurantForSuperParams{
		Name:       &body.RestaurantName,
		CurrencyId: cid,
		AdminEmail: &body.Email,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create restaurant")
		return
	}

	// Store slug
	_ = h.q.SetRestaurantSlug(ctx, sqlc.SetRestaurantSlugParams{Slug: &slug, ID: rid})

	// Create admin user with temporary password
	userID, err := h.q.CreateAdminUser(ctx, sqlc.CreateAdminUserParams{
		Email:        strings.ToLower(body.Email),
		Name:         body.Name,
		RestaurantID: rid,
	})
	if err != nil {
		// Compensate — roll back the restaurant
		_ = h.q.DeleteRestaurantByID(ctx, rid)
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create admin user")
		return
	}

	// Generate a cryptographically random temporary password.
	// The account is unusable until super-admin calls release-account, which replaces it.
	tempBytes := make([]byte, 16)
	_, _ = rand.Read(tempBytes)
	tempPassword := hex.EncodeToString(tempBytes)
	hashed, err := passwordhash.Hash(tempPassword)
	if err == nil {
		accountID := pgUUIDToString(userID)
		_ = h.q.CreateCredentialAccount(ctx, sqlc.CreateCredentialAccountParams{
			AccountID: accountID,
			UserID:    userID,
			Password:  &hashed,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"message": "Restaurant added successfully",
		"id":      pgUUIDToString(rid),
	})
}

// POST /super/restaurants/release-account
func (h *RestaurantsHandler) ReleaseAccount(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RestaurantID string `json:"restaurantId"`
		Email        string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	rid, err := parseUUID(body.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId")
		return
	}

	// Find or create the user for this restaurant
	user, err := h.q.GetUserByEmailForSuper(ctx, strings.ToLower(body.Email))
	if err != nil {
		// User doesn't exist yet — create them now
		newID, createErr := h.q.CreateAdminUser(ctx, sqlc.CreateAdminUserParams{
			Email:        strings.ToLower(body.Email),
			Name:         body.Email, // use email as name placeholder
			RestaurantID: rid,
		})
		if createErr != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Failed to create user account")
			return
		}
		user, _ = h.q.GetUserByEmailForSuper(ctx, strings.ToLower(body.Email))
		// Create credential account entry
		accountID := pgUUIDToString(newID)
		_ = h.q.CreateCredentialAccount(ctx, sqlc.CreateCredentialAccountParams{
			AccountID: accountID,
			UserID:    newID,
			Password:  nil,
		})
	}

	// Generate a cryptographically strong temporary password (16 bytes = 32 hex chars)
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	code := hex.EncodeToString(b)

	hashed, err := passwordhash.Hash(code)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to generate password")
		return
	}

	if err := h.q.SetUserPassword(ctx, sqlc.SetUserPasswordParams{
		Password: &hashed,
		UserID:   user.ID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to set password")
		return
	}

	released := sqlc.RetaurantSetupStatusRELEASED
	_ = h.q.SetRestaurantStatus(ctx, sqlc.SetRestaurantStatusParams{
		Status: &released,
		ID:     rid,
	})

	// Send email synchronously so we can catch errors
	if err := h.plunk.Send(plunk.SendParams{
		To:      body.Email,
		Subject: "First Time Login — SaucyMenu",
		Body:    "Hi " + user.Name + ",\n\nYour account has been released. Login at https://dashboard.saucymenu.com\n\nEmail: " + body.Email + "\nPassword: " + code + "\n\nPlease change your password after first login.",
	}); err != nil {
		// Log but don't fail the request — password is already set
		fmt.Printf("[WARN] release-account email failed for %s: %v\n", body.Email, err)
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Account Release successful"})
}

// GET /super/restaurants/:id
func (h *RestaurantsHandler) GetDetail(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}

	ctx := r.Context()
	resto, err := h.q.GetRestaurantDetailForSuper(ctx, id)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Restaurant not found")
		return
	}

	totalUsers, _ := h.q.CountUserSessionsForRestaurant(ctx, id)
	totalRatings, _ := h.q.CountReviewsForRestaurant(ctx, id)

	// Bun format: { success, data, totals } — not nested inside data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data": map[string]any{
			"id":              pgUUIDToString(resto.ID),
			"name":            resto.Name,
			"address":         resto.Address,
			"image":           resto.Image,
			"description":     resto.Description,
			"status":          resto.Status,
			"suspended":       resto.Suspended,
			"suspendedReason": resto.SuspendedReason,
		},
		"totals": map[string]any{
			"users":   totalUsers,
			"ratings": totalRatings,
		},
	})
}

// GET /super/restaurants/:id/ai-usage
func (h *RestaurantsHandler) AIUsage(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}

	rows, err := h.q.AIUsageChartForRestaurant(r.Context(), id)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch AI usage")
		return
	}

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		result = append(result, map[string]any{
			"count": row.Count,
			"month": pgTimestampToString(row.Month),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// POST /super/restaurants/alter-suspend/:id
func (h *RestaurantsHandler) AlterSuspend(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		SuspendedReason *string `json:"suspendedReason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	ctx := r.Context()
	resto, err := h.q.GetRestaurantDetailForSuper(ctx, id)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Restaurant not found")
		return
	}

	now := pgtype.Timestamp{Time: time.Now(), Valid: true}
	if err := h.q.ToggleRestaurantSuspended(ctx, sqlc.ToggleRestaurantSuspendedParams{
		Suspended:       !resto.Suspended,
		SuspendedReason: body.SuspendedReason,
		SuspendedAt:     now,
		SuspendedBy:     pgtype.UUID{}, // no "performed by" user in super context
		ID:              id,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update suspension")
		return
	}

	msg := "Restaurant suspended"
	if resto.Suspended {
		msg = "Restaurant unsuspended"
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": msg})
}
