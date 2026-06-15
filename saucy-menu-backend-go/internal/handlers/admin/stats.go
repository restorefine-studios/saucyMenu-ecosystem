package admin

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type StatsHandler struct{ q *sqlc.Queries }

func NewStatsHandler(q *sqlc.Queries) *StatsHandler { return &StatsHandler{q: q} }

// GET /admin/stats/
func (h *StatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	ctx := r.Context()
	totalSessions, _ := h.q.CountUserSessions(ctx, user.RestaurantID)
	totalDishes, _ := h.q.CountMenuItems(ctx, user.RestaurantID)
	totalAI, _ := h.q.CountAIUsage(ctx, user.RestaurantID)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"totalUsers":    totalSessions,
		"totalDishes":   totalDishes,
		"totalAiCredits": totalAI,
	})
}

// GET /admin/stats/customers/chart
func (h *StatsHandler) CustomerChart(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	q := r.URL.Query()

	var startPtr, endPtr pgtype.Timestamp
	if s := q.Get("startDate"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			startPtr = pgtype.Timestamp{Time: t, Valid: true}
		}
	}
	if e := q.Get("endDate"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			endPtr = pgtype.Timestamp{Time: t, Valid: true}
		}
	}

	rows, err := h.q.MonthlyCustomerCounts(r.Context(), sqlc.MonthlyCustomerCountsParams{
		RestaurantID: user.RestaurantID,
		Column2:      startPtr,
		Column3:      endPtr,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch chart data")
		return
	}

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		result = append(result, map[string]any{
			"month": pgTimestampToString(row.Month),
			"count": row.Count,
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// GET /admin/stats/dishes-by-tags
func (h *StatsHandler) DishesByTags(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	rows, err := h.q.DishesByTagCount(r.Context(), user.RestaurantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}
	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		result = append(result, map[string]any{"tagName": row.TagName, "count": row.Count})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}
