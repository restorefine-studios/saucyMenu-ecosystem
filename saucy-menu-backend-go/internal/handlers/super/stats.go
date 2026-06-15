package super

import (
	"net/http"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type StatsHandler struct{ q *sqlc.Queries }

func NewStatsHandler(q *sqlc.Queries) *StatsHandler { return &StatsHandler{q: q} }

// GET /super/stats/total
func (h *StatsHandler) Total(w http.ResponseWriter, r *http.Request) {
	totals, err := h.q.PlatformTotals(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"totalRestaurants":    totals.TotalRestaurants,
		"totalSessions":       totals.TotalSessions,
		"totalCreditsUsed":    totals.TotalCreditsUsed,
		"restaurantsThisMonth": totals.RestaurantsThisMonth,
		"sessionsThisMonth":   totals.SessionsThisMonth,
		"creditsThisMonth":    totals.CreditsThisMonth,
	})
}

// GET /super/stats/subscriptions
func (h *StatsHandler) Subscriptions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.q.SubscriptionStatsChart(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch subscription stats")
		return
	}
	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		result = append(result, map[string]any{
			"count":    row.Count,
			"month":    pgTimestampToString(row.Month),
			"planName": row.PlanName,
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}
