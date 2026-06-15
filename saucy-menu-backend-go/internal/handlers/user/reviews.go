package user

import (
	"encoding/json"
	"net/http"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type ReviewsHandler struct {
	q *sqlc.Queries
}

func NewReviewsHandler(q *sqlc.Queries) *ReviewsHandler {
	return &ReviewsHandler{q: q}
}

// POST /user/reviews/
func (h *ReviewsHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	user := authm.GetEndUser(r.Context())
	var body struct {
		Rating       int32  `json:"rating"`
		Comment      string `json:"comment"`
		ReviewableID string `json:"reviewableId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.ReviewableID == "" || body.Comment == "" {
		httpx.WriteError(w, http.StatusBadRequest, "rating, comment and reviewableId are required")
		return
	}

	rid, err := parseUUID(user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid restaurantId in token")
		return
	}
	reviewableID, err := parseUUID(body.ReviewableID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid reviewableId")
		return
	}

	// Verify the item being reviewed belongs to this restaurant
	if _, err := h.q.MenuItemBelongsToRestaurant(r.Context(), sqlc.MenuItemBelongsToRestaurantParams{
		ID:           reviewableID,
		RestaurantID: rid,
	}); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "item not found")
		return
	}

	if err := h.q.CreateReview(r.Context(), sqlc.CreateReviewParams{
		ReviewableID: reviewableID,
		Rating:       body.Rating,
		Comment:      body.Comment,
		RestaurantID: rid,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to create review")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Review Created Successfully"})
}

// GET /user/reviews?itemId=xxx
func (h *ReviewsHandler) GetReviews(w http.ResponseWriter, r *http.Request) {
	itemIDStr := r.URL.Query().Get("itemId")
	if itemIDStr == "" {
		httpx.WriteError(w, http.StatusBadRequest, "itemId is required")
		return
	}
	itemID, err := parseUUID(itemIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid itemId")
		return
	}
	reviews, err := h.q.GetReviewsForItem(r.Context(), itemID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch reviews")
		return
	}
	type row struct {
		ID        string `json:"id"`
		Rating    int32  `json:"rating"`
		Comment   string `json:"comment"`
		CreatedAt string `json:"createdAt"`
	}
	out := make([]row, 0, len(reviews))
	for _, rv := range reviews {
		out = append(out, row{
			ID:        pgUUIDToString(rv.ID),
			Rating:    rv.Rating,
			Comment:   rv.Comment,
			CreatedAt: rv.CreatedAt.Time.Format("2006-01-02"),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, out)
}
