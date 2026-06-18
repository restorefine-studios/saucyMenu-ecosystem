package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"

	auditpkg "github.com/restorefine-studios/saucy-menu-backend-go/internal/audit"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
)

// HandleBulkUpload processes a dish:upload or drink:upload task.
// It mirrors the bulkUploadMenuItems function in bulk-menu.service.ts.
func HandleBulkUpload(q *sqlc.Queries, client *asynq.Client, audit *auditpkg.Logger) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload BulkUploadPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("bulkupload: unmarshal payload: %w", err)
		}

		rid, err := parseUUID(payload.RestaurantID)
		if err != nil {
			return fmt.Errorf("bulkupload: invalid restaurantId: %w", err)
		}
		baseSectionID, _ := parseUUID(payload.SectionID)
		menuID, err := parseUUID(payload.MenuID)
		if err != nil {
			return fmt.Errorf("bulkupload: invalid menuId: %w", err)
		}
		performedBy, _ := parseUUID(payload.PerformedBy)

		created, failed, errors := 0, 0, []string{}

		for i, item := range payload.Items {
			sectionID := baseSectionID

			// Get or create section from item.Section field
			if item.Section != "" {
				found, err := q.FindMenuSectionByName(ctx, sqlc.FindMenuSectionByNameParams{
					Lower:  item.Section,
					MenuID: menuID,
				})
				if err != nil {
					// Create new section
					newSec, err := q.CreateMenuSection(ctx, sqlc.CreateMenuSectionParams{
						MenuID: menuID,
						Lower:  item.Section,
					})
					if err != nil {
						log.Error().Err(err).Int("row", i+1).Msg("bulkupload: create section failed")
					} else {
						sectionID = newSec
						enqueueTranslationSafe(ctx, client, "menu_section", pgUUIDToString(newSec),
							payload.Lang, map[string]string{"name": item.Section})
						if audit != nil {
							audit.Created(ctx, sqlc.AuditEntityMenuSection, newSec, performedBy, rid,
								map[string]any{"name": item.Section})
						}
					}
				} else {
					sectionID = found
				}
			}

			itemID, err := insertBulkItem(ctx, q, item, rid, sectionID)
			if err != nil {
				failed++
				errors = append(errors, fmt.Sprintf("row %d (%s): %s", i+1, item.Name, err.Error()))
				continue
			}

			// Insert relations
			insertBulkRelations(ctx, q, client, itemID, rid, item, payload.Lang)
			if audit != nil {
				audit.Created(ctx, sqlc.AuditEntityMenuItem, itemID, performedBy, rid, item)
			}

			// Enqueue translation for this item
			fields := map[string]string{}
			if item.Description != "" {
				fields["description"] = item.Description
			}
			if len(item.Ingredients) > 0 {
				fields["ingredients"] = strings.Join(item.Ingredients, ",")
			}
			if len(fields) > 0 {
				enqueueTranslationSafe(ctx, client, "menu_item", pgUUIDToString(itemID), payload.Lang, fields)
			}

			created++
		}

		log.Info().Int("created", created).Int("failed", failed).
			Strs("errors", errors).Msg("bulkupload: completed")
		return nil
	}
}

func insertBulkItem(ctx context.Context, q *sqlc.Queries, item BulkItem, restaurantID, sectionID pgtype.UUID) (pgtype.UUID, error) {
	itemType := item.Type
	if itemType == "" {
		itemType = "dish"
	}
	return q.CreateMenuItem(ctx, sqlc.CreateMenuItemParams{
		SectionID:    sectionID,
		RestaurantID: restaurantID,
		Name:         item.Name,
		Description:  strPtrOrNil(item.Description),
		Images:       item.Images,
		Price:        parseNumeric(item.Price),
		Type:         itemType,
		Ingredients:  item.Ingredients,
		IsAvailable:  boolPtr(true),
		SpiceLevel:   (*sqlc.SpiceLevel)(strPtrOrNil(item.SpiceLevel)),
		CookTime:     item.CookTime,
		IsAlcoholic:  item.IsAlcoholic,
	})
}

func insertBulkRelations(ctx context.Context, q *sqlc.Queries, client *asynq.Client, itemID, restaurantID pgtype.UUID, item BulkItem, lang string) {
	for _, addonData := range item.Addons {
		addonID, err := q.FindAddonByName(ctx, sqlc.FindAddonByNameParams{
			Lower:        addonData.Name,
			RestaurantID: restaurantID,
		})
		if err != nil {
			addonID, err = q.CreateAddon(ctx, sqlc.CreateAddonParams{
				RestaurantID: restaurantID,
				Lower:        strings.ToLower(addonData.Name),
				Price:        parseNumeric(addonData.Price),
			})
			if err == nil {
				enqueueTranslationSafe(ctx, client, "addon", pgUUIDToString(addonID), lang,
					map[string]string{"name": addonData.Name})
			}
		}
		if addonID.Valid {
			_ = q.InsertMenuItemAddon(ctx, sqlc.InsertMenuItemAddonParams{
				ItemID: itemID, AddonID: addonID,
			})
		}
	}

	for _, allergenData := range item.Allergens {
		allergenID, err := q.FindAllergenByName(ctx, allergenData.Name)
		if err != nil {
			allergenID, err = q.CreateAllergen(ctx, allergenData.Name)
			if err != nil {
				continue
			}
		}
		sev := allergenData.Severity
		_ = q.BulkInsertMenuItemAllergen(ctx, sqlc.BulkInsertMenuItemAllergenParams{
			MenuItemID: itemID,
			AllergenID: allergenID,
			Severity:   strPtrOrNil(sev),
		})
	}

	for _, dietData := range item.Diets {
		dietID, err := q.FindDietTagByName(ctx, sqlc.FindDietTagByNameParams{
			Lower:        dietData.Name,
			RestaurantID: restaurantID,
		})
		if err != nil {
			key := slugify(dietData.Name)
			dietID, err = q.CreateDietTag(ctx, sqlc.CreateDietTagParams{
				Lower:        strings.ToLower(dietData.Name),
				Key:          key,
				RestaurantID: restaurantID,
			})
			if err == nil {
				enqueueTranslationSafe(ctx, client, "tag", pgUUIDToString(dietID), lang,
					map[string]string{"name": dietData.Name})
			}
		}
		if dietID.Valid {
			_ = q.InsertMenuItemTag(ctx, sqlc.InsertMenuItemTagParams{
				MenuItemID: itemID, TagID: dietID,
			})
		}
	}

	for _, v := range item.Variants {
		if vid, err := q.InsertMenuItemVariant(ctx, sqlc.InsertMenuItemVariantParams{
			ItemID: itemID,
			Name:   v.Name,
			Price:  parseNumeric(v.Price),
		}); err == nil {
			enqueueTranslationSafe(ctx, client, "variant", pgUUIDToString(vid), "en",
				map[string]string{"name": v.Name})
		}
	}
}

// ProcessBulkUploadSync runs the bulk upload logic inline (no queue).
// Used as a fallback when Redis is not configured.
func ProcessBulkUploadSync(ctx context.Context, q *sqlc.Queries, client *asynq.Client, audit *auditpkg.Logger, payload BulkUploadPayload) map[string]any {
	rid, err := parseUUID(payload.RestaurantID)
	if err != nil {
		return map[string]any{"success": false, "message": "invalid restaurantId"}
	}
	baseSectionID, _ := parseUUID(payload.SectionID)
	menuID, _ := parseUUID(payload.MenuID)
	performedBy, _ := parseUUID(payload.PerformedBy)

	created, failed := 0, 0
	errList := []map[string]any{}
	itemIDs := []string{}

	for i, item := range payload.Items {
		sectionID := baseSectionID

		if item.Section != "" {
			if found, err := q.FindMenuSectionByName(ctx, sqlc.FindMenuSectionByNameParams{
				Lower:  item.Section,
				MenuID: menuID,
			}); err == nil {
				sectionID = found
			} else if newSec, err := q.CreateMenuSection(ctx, sqlc.CreateMenuSectionParams{
				MenuID: menuID, Lower: item.Section,
			}); err == nil {
				sectionID = newSec
				if audit != nil {
					audit.Created(ctx, sqlc.AuditEntityMenuSection, newSec, performedBy, rid,
						map[string]any{"name": item.Section})
				}
			}
		}

		itemID, err := insertBulkItem(ctx, q, item, rid, sectionID)
		if err != nil {
			failed++
			errList = append(errList, map[string]any{"row": i + 1, "item": item.Name, "error": err.Error()})
			continue
		}
		insertBulkRelations(ctx, q, client, itemID, rid, item, payload.Lang)
		if audit != nil {
			audit.Created(ctx, sqlc.AuditEntityMenuItem, itemID, performedBy, rid, item)
		}
		created++
		itemIDs = append(itemIDs, pgUUIDToString(itemID))
	}

	return map[string]any{
		"success": failed == 0,
		"created": created,
		"failed":  failed,
		"errors":  errList,
		"items":   itemIDs,
	}
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func enqueueTranslationSafe(ctx context.Context, client *asynq.Client, entityType, entityID, sourceLang string, fields map[string]string) {
	if client == nil {
		return
	}
	if err := EnqueueTranslation(ctx, client, entityType, entityID, sourceLang, fields); err != nil {
		log.Error().Err(err).Str("entity", entityType).Str("id", entityID).Msg("enqueue translation failed")
	}
}

func parseUUID(s string) (pgtype.UUID, error) {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID")
	}
	var uid pgtype.UUID
	for i := 0; i < 16; i++ {
		v, err := strconv.ParseUint(s[i*2:i*2+2], 16, 8)
		if err != nil {
			return pgtype.UUID{}, err
		}
		uid.Bytes[i] = byte(v)
	}
	uid.Valid = true
	return uid, nil
}

func pgUUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func parseNumeric(s string) pgtype.Numeric {
	if s == "" {
		return pgtype.Numeric{}
	}
	s = strings.ReplaceAll(s, ",", ".")
	var n pgtype.Numeric
	_ = n.Scan(s)
	return n
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func boolPtr(b bool) *bool { return &b }

var slugRe = regexp.MustCompile(`[^a-z0-9\s]`)
var spaceRe = regexp.MustCompile(`\s+`)

func slugify(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = slugRe.ReplaceAllString(slug, "")
	slug = spaceRe.ReplaceAllString(slug, "_")
	return strings.Trim(slug, "_")
}
