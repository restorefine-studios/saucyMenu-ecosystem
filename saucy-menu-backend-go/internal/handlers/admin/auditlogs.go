package admin

import (
	"encoding/json"
	"net/http"
	"strconv"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/jackc/pgx/v5/pgtype"
)

// rawJSONOrNil decodes a jsonb audit column for the API response, treating
// SQL NULL / JSON null / empty bytes as absent.
func rawJSONOrNil(b []byte) any {
	if len(b) == 0 {
		return nil
	}
	var v any
	if err := json.Unmarshal(b, &v); err != nil || v == nil {
		return nil
	}
	return v
}

type AuditLogsHandler struct{ q *sqlc.Queries }

func NewAuditLogsHandler(q *sqlc.Queries) *AuditLogsHandler { return &AuditLogsHandler{q: q} }

// GET /admin/audit/
func (h *AuditLogsHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
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

	entityFilter := q.Get("entity")
	actionFilter := q.Get("action")
	_ = pgtype.UUID{} // ensure pgtype import used

	ctx := r.Context()
	total, _ := h.q.CountAuditLogs(ctx, user.RestaurantID)
	logs, err := h.q.ListAuditLogs(ctx, sqlc.ListAuditLogsParams{
		RestaurantID: user.RestaurantID,
		Limit:        int32(limit),
		Offset:       int32(offset),
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch audit logs")
		return
	}

	result := make([]map[string]any, 0, len(logs))
	for _, log := range logs {
		// In-process filtering (entity/action)
		if entityFilter != "" && string(log.Entity) != entityFilter {
			continue
		}
		if actionFilter != "" && string(log.Action) != actionFilter {
			continue
		}
		result = append(result, map[string]any{
			"id":        pgUUIDToString(log.ID),
			"entity":    log.Entity,
			"entityId":  pgUUIDToString(log.EntityID),
			"action":    log.Action,
			"before":    rawJSONOrNil(log.Before),
			"after":     rawJSONOrNil(log.After),
			"createdAt": pgTimestamptzToString(log.CreatedAt),
			"user": map[string]any{
				"name":  log.UserName,
				"email": log.UserEmail,
				"role":  log.UserRole,
			},
		})
	}
	httpx.WritePaginatedSpread(w, http.StatusOK, result, total, limit, offset)
}
