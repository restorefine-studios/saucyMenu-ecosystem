package super

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type SubscriptionsHandler struct{ q *sqlc.Queries }

func NewSubscriptionsHandler(q *sqlc.Queries) *SubscriptionsHandler {
	return &SubscriptionsHandler{q: q}
}

// GET /super/subscriptions/
func (h *SubscriptionsHandler) List(w http.ResponseWriter, r *http.Request) {
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
	var searchPtr, planPtr *string
	if s := q.Get("search"); s != "" {
		v := "%" + strings.ToLower(s) + "%"
		searchPtr = &v
	}
	if p := q.Get("plan"); p != "" {
		planPtr = &p
	}

	search := ptrStr(searchPtr)
	plan := ptrStr(planPtr)

	ctx := r.Context()
	total, _ := h.q.CountSubscriptionsForSuper(ctx)
	rows, err := h.q.ListSubscriptionsForSuper(ctx, sqlc.ListSubscriptionsForSuperParams{
		Column1: search,
		Column2: plan,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch subscriptions")
		return
	}

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		result = append(result, map[string]any{
			"status":               row.Status,
			"stripeSubscriptionId": row.StripeSubscriptionID,
			"currentPeriodStart":   pgTimestampToString(row.CurrentPeriodStart),
			"currentPeriodEnd":     pgTimestampToString(row.CurrentPeriodEnd),
			"userName":             row.UserName,
			"restaurantName":       row.RestaurantName,
			"planName":             row.PlanName,
		})
	}

	plans, _ := h.q.ListSubscriptionPlans(ctx)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data":    result,
		"pagination": map[string]any{
			"totalItems":      total,
			"limit":           limit,
			"offset":          offset,
			"hasNextPage":     int64(offset+limit) < total,
			"hasPreviousPage": offset > 0,
		},
		"plans": plans,
	})
}
