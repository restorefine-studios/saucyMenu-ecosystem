package admin

import (
	"net/http"
	"strconv"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type ReviewsHandler struct{ q *sqlc.Queries }

func NewReviewsHandler(q *sqlc.Queries) *ReviewsHandler { return &ReviewsHandler{q: q} }

// GET /admin/reviews/
func (h *ReviewsHandler) ListReviews(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
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
	var ratingPtr *int32
	if rs := q.Get("rating"); rs != "" {
		if rv, err := strconv.Atoi(rs); err == nil {
			v := int32(rv)
			ratingPtr = &v
		}
	}

	ctx := r.Context()
	total, _ := h.q.CountReviews(ctx, user.RestaurantID)
	reviews, err := h.q.ListReviewsForAdmin(ctx, sqlc.ListReviewsForAdminParams{
		RestaurantID: user.RestaurantID,
		Limit:        int32(limit),
		Offset:       int32(offset),
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch reviews")
		return
	}

	result := make([]map[string]any, 0, len(reviews))
	for _, rev := range reviews {
		if ratingPtr != nil && rev.Rating != *ratingPtr {
			continue
		}
		result = append(result, map[string]any{
			"id":      pgUUIDToString(rev.ID),
			"rating":  rev.Rating,
			"comment": rev.Comment,
			"review": map[string]any{
				"id": pgUUIDToString(rev.ID), "rating": rev.Rating, "comment": rev.Comment,
				"createdAt": pgTimestampToString(rev.CreatedAt),
			},
			"menuItem": map[string]any{
				"id": pgUUIDToString(rev.ItemID), "name": rev.ItemName,
			},
		})
	}
	httpx.WritePaginatedSpread(w, http.StatusOK, result, total, limit, offset)
}
