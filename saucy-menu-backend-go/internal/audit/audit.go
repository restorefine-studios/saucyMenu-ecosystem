package audit

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
)

type Logger struct {
	q *sqlc.Queries
}

func New(q *sqlc.Queries) *Logger {
	return &Logger{q: q}
}

func (l *Logger) log(ctx context.Context, entity sqlc.AuditEntity, entityID, performedBy, restaurantID pgtype.UUID, action sqlc.AuditAction, before, after any) {
	beforeJSON := marshalJSON(before)
	afterJSON := marshalJSON(after)

	if err := l.q.InsertAuditLog(ctx, sqlc.InsertAuditLogParams{
		Entity:       entity,
		EntityID:     entityID,
		Action:       action,
		PerformedBy:  performedBy,
		Column5:      beforeJSON,
		Column6:      afterJSON,
		RestaurantID: restaurantID,
	}); err != nil {
		log.Error().Err(err).Str("entity", string(entity)).Msg("audit log insert failed")
	}
}

func (l *Logger) Created(ctx context.Context, entity sqlc.AuditEntity, entityID, performedBy, restaurantID pgtype.UUID, after any) {
	l.log(ctx, entity, entityID, performedBy, restaurantID, sqlc.AuditActionCREATE, nil, after)
}

func (l *Logger) Updated(ctx context.Context, entity sqlc.AuditEntity, entityID, performedBy, restaurantID pgtype.UUID, before, after any) {
	l.log(ctx, entity, entityID, performedBy, restaurantID, sqlc.AuditActionUPDATE, before, after)
}

func (l *Logger) Deleted(ctx context.Context, entity sqlc.AuditEntity, entityID, performedBy, restaurantID pgtype.UUID, before any) {
	l.log(ctx, entity, entityID, performedBy, restaurantID, sqlc.AuditActionDELETE, before, nil)
}

func marshalJSON(v any) []byte {
	if v == nil {
		return []byte("null")
	}
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("null")
	}
	return b
}
