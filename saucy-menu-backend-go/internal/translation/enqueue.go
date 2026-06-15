package translation

import (
	"context"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/queue"
)

// Enqueuer wraps an asynq client and provides a no-op safe way to fire
// translation tasks after admin writes. If the client is nil (no Redis
// configured), calls are silently dropped — the entity keeps
// translation_status='pending' and can be retranslated later.
type Enqueuer struct {
	client *asynq.Client
}

func NewEnqueuer(client *asynq.Client) *Enqueuer {
	return &Enqueuer{client: client}
}

// After enqueues a translation task for an entity. Always non-blocking:
// uses a goroutine so it never slows down the HTTP response.
// fields should only contain non-empty strings (caller filters).
func (e *Enqueuer) After(ctx context.Context, entityType, entityID, sourceLang string, fields map[string]string) {
	if e.client == nil {
		return
	}
	if len(fields) == 0 {
		return
	}
	// Copy context values but detach cancellation so the goroutine outlives the request.
	go func() {
		if err := queue.EnqueueTranslation(context.Background(), e.client, entityType, entityID, sourceLang, fields); err != nil {
			log.Error().Err(err).
				Str("entity", entityType).
				Str("id", entityID).
				Msg("translation enqueue failed")
		}
	}()
}

// Fields builds a translation fields map from optional string pairs,
// dropping any empty values. Mirrors the TS pickTruthy() utility.
//
// Usage: Fields("name", name, "description", desc)
func Fields(pairs ...string) map[string]string {
	out := make(map[string]string, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		if pairs[i+1] != "" {
			out[pairs[i]] = pairs[i+1]
		}
	}
	return out
}
