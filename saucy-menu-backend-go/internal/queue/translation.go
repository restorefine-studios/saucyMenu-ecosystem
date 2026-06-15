package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/deepl"
)

// HandleTranslation processes a translation:build task.
// Calls DeepL for all supported languages and updates the entity's translations column.
func HandleTranslation(q *sqlc.Queries, dl *deepl.Client) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload TranslationPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("translation: unmarshal: %w", err)
		}
		if len(payload.Fields) == 0 {
			return nil
		}

		sourceLang := payload.SourceLang
		if sourceLang == "" {
			sourceLang = "en"
		}

		translations, err := dl.BuildTranslations(payload.Fields, sourceLang)
		if err != nil {
			return fmt.Errorf("translation: deepl: %w", err)
		}

		translationsJSON, _ := json.Marshal(translations)

		entityID, err := parseUUID(payload.EntityID)
		if err != nil {
			return fmt.Errorf("translation: invalid entityId: %w", err)
		}

		status := "completed"
		switch payload.EntityType {
		case "menu_item":
			err = q.UpdateMenuItemTranslations(ctx, sqlc.UpdateMenuItemTranslationsParams{
				Translations: translationsJSON, TranslationStatus: &status, ID: entityID,
			})
		case "menu":
			err = q.UpdateMenuTranslations(ctx, sqlc.UpdateMenuTranslationsParams{
				Translations: translationsJSON, TranslationStatus: &status, ID: entityID,
			})
		case "menu_section":
			err = q.UpdateMenuSectionTranslations(ctx, sqlc.UpdateMenuSectionTranslationsParams{
				Translations: translationsJSON, TranslationStatus: &status, ID: entityID,
			})
		case "tag":
			tsCompleted := sqlc.TranslationStatusCompleted
			err = q.UpdateTagTranslations(ctx, sqlc.UpdateTagTranslationsParams{
				Translations: translationsJSON, TranslationStatus: &tsCompleted, ID: entityID,
			})
		case "addon":
			err = q.UpdateAddonTranslations(ctx, sqlc.UpdateAddonTranslationsParams{
				Translations: translationsJSON, TranslationStatus: &status, ID: entityID,
			})
		case "variant":
			err = q.UpdateMenuItemVariantTranslations(ctx, sqlc.UpdateMenuItemVariantTranslationsParams{
				Translations: translationsJSON, TranslationStatus: &status, ID: entityID,
			})
		default:
			log.Warn().Str("entityType", payload.EntityType).Msg("translation: unknown entity type")
			return nil
		}

		if err != nil {
			return fmt.Errorf("translation: db update for %s %s: %w", payload.EntityType, payload.EntityID, err)
		}

		log.Debug().Str("type", payload.EntityType).Str("id", payload.EntityID).Msg("translation: completed")
		return nil
	}
}
