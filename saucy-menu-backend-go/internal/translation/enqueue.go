package translation

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/openai"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/queue"
)

// Enqueuer fires translation work after admin writes.
// Priority: asynq queue (Redis) → inline OpenAI goroutine → no-op.
type Enqueuer struct {
	client  *asynq.Client
	oai     *openai.Client
	queries *sqlc.Queries
}

func NewEnqueuer(client *asynq.Client) *Enqueuer {
	return &Enqueuer{client: client}
}

// NewEnqueuerWithOpenAI creates an enqueuer that translates inline (no Redis needed).
func NewEnqueuerWithOpenAI(q *sqlc.Queries, oai *openai.Client) *Enqueuer {
	return &Enqueuer{queries: q, oai: oai}
}

// After fires translation for an entity. Always non-blocking.
func (e *Enqueuer) After(ctx context.Context, entityType, entityID, sourceLang string, fields map[string]string) {
	if len(fields) == 0 {
		return
	}
	if e.client != nil {
		go func() {
			if err := queue.EnqueueTranslation(context.Background(), e.client, entityType, entityID, sourceLang, fields); err != nil {
				log.Error().Err(err).Str("entity", entityType).Str("id", entityID).Msg("translation enqueue failed")
			}
		}()
		return
	}
	if e.oai != nil && e.queries != nil {
		go func() {
			if err := translateAndSave(context.Background(), e.queries, e.oai, entityType, entityID, sourceLang, fields); err != nil {
				log.Error().Err(err).Str("entity", entityType).Str("id", entityID).Msg("inline translation failed")
			}
		}()
	}
}

// translateAndSave calls DeepL and writes the result directly to the DB.
// This is the Redis-free path used when no asynq client is configured.
func translateAndSave(ctx context.Context, q *sqlc.Queries, oai *openai.Client, entityType, entityID, sourceLang string, fields map[string]string) error {
	if sourceLang == "" {
		sourceLang = "en"
	}
	translations, err := oai.BuildTranslations(fields, sourceLang)
	if err != nil {
		return fmt.Errorf("deepl: %w", err)
	}
	translationsJSON, _ := json.Marshal(translations)

	id, err := parseUUID(entityID)
	if err != nil {
		return fmt.Errorf("invalid entityId: %w", err)
	}

	status := "completed"
	switch entityType {
	case "menu_item":
		err = q.UpdateMenuItemTranslations(ctx, sqlc.UpdateMenuItemTranslationsParams{
			Translations: translationsJSON, TranslationStatus: &status, ID: id,
		})
	case "menu":
		err = q.UpdateMenuTranslations(ctx, sqlc.UpdateMenuTranslationsParams{
			Translations: translationsJSON, TranslationStatus: &status, ID: id,
		})
	case "menu_section":
		err = q.UpdateMenuSectionTranslations(ctx, sqlc.UpdateMenuSectionTranslationsParams{
			Translations: translationsJSON, TranslationStatus: &status, ID: id,
		})
	case "tag":
		tsCompleted := sqlc.TranslationStatusCompleted
		err = q.UpdateTagTranslations(ctx, sqlc.UpdateTagTranslationsParams{
			Translations: translationsJSON, TranslationStatus: &tsCompleted, ID: id,
		})
	case "addon":
		err = q.UpdateAddonTranslations(ctx, sqlc.UpdateAddonTranslationsParams{
			Translations: translationsJSON, TranslationStatus: &status, ID: id,
		})
	case "variant":
		err = q.UpdateMenuItemVariantTranslations(ctx, sqlc.UpdateMenuItemVariantTranslationsParams{
			Translations: translationsJSON, TranslationStatus: &status, ID: id,
		})
	default:
		log.Warn().Str("entityType", entityType).Msg("translation: unknown entity type")
	}
	if err != nil {
		return fmt.Errorf("db update %s %s: %w", entityType, entityID, err)
	}
	log.Info().Str("type", entityType).Str("id", entityID).Msg("translation: completed inline")
	return nil
}

// Fields builds a translation fields map from optional string pairs,
// dropping any empty values.
func Fields(pairs ...string) map[string]string {
	out := make(map[string]string, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		if pairs[i+1] != "" {
			out[pairs[i]] = pairs[i+1]
		}
	}
	return out
}

func parseUUID(s string) (pgtype.UUID, error) {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID length")
	}
	var uid pgtype.UUID
	for i := 0; i < 16; i++ {
		var b byte
		if _, err := fmt.Sscanf(s[i*2:i*2+2], "%02x", &b); err != nil {
			return pgtype.UUID{}, err
		}
		uid.Bytes[i] = b
	}
	uid.Valid = true
	return uid, nil
}
