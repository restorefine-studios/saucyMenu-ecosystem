package queue

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"strings"

	"github.com/hibiken/asynq"
)

const (
	TypeDishUpload  = "dish:upload"
	TypeDrinkUpload = "drink:upload"
	TypeTranslation = "translation:build"
)

// BulkUploadPayload is the task payload for dish:upload and drink:upload.
type BulkUploadPayload struct {
	RestaurantID string        `json:"restaurantId"`
	SectionID    string        `json:"sectionId"`
	MenuID       string        `json:"menuId"`
	Lang         string        `json:"lang"`
	Items        []BulkItem    `json:"items"`
}

type BulkItem struct {
	Name           string         `json:"name"`
	Type           string         `json:"type"`
	Description    string         `json:"description,omitempty"`
	Ingredients    []string       `json:"ingredients,omitempty"`
	Images         []string       `json:"images,omitempty"`
	Price          string         `json:"price,omitempty"`
	Section        string         `json:"section,omitempty"`
	SpiceLevel     string         `json:"spiceLevel,omitempty"`
	CookTime       *int32         `json:"cookTime,omitempty"`
	IsAlcoholic    *bool          `json:"isAlcoholic,omitempty"`
	Allergens      []BulkAllergen `json:"allergens,omitempty"`
	Addons         []BulkAddon    `json:"addons,omitempty"`
	Diets          []BulkDiet     `json:"diets,omitempty"`
	Variants       []BulkVariant  `json:"variants,omitempty"`
}

type BulkAllergen struct {
	Name     string `json:"name"`
	Severity string `json:"severity,omitempty"`
}

type BulkAddon struct {
	Name  string `json:"name"`
	Price string `json:"price,omitempty"`
}

type BulkDiet struct {
	Name string `json:"name"`
}

type BulkVariant struct {
	Name        string `json:"name"`
	Price       string `json:"price"`
	IsAvailable *bool  `json:"isAvailable,omitempty"`
}

// TranslationPayload is the task payload for translation:build.
type TranslationPayload struct {
	EntityType string            `json:"entityType"` // "menu_item", "menu_section", "menu", "tag", "addon", "variant"
	EntityID   string            `json:"entityId"`
	Fields     map[string]string `json:"fields"`
	SourceLang string            `json:"sourceLang"`
}

// NewClient creates an asynq client connected to the Upstash Redis URL.
// Supports both redis:// and rediss:// (TLS) schemes.
func NewClient(redisURL string) *asynq.Client {
	return asynq.NewClient(redisOpt(redisURL))
}

// NewServer creates an asynq server for the worker process.
func NewServer(redisURL string, concurrency int) *asynq.Server {
	return asynq.NewServer(redisOpt(redisURL), asynq.Config{
		Concurrency: concurrency,
		Queues: map[string]int{
			"translation": 3, // matches Bun's TranslationQueue concurrency
			"default":     5,
		},
	})
}

func redisOpt(rawURL string) asynq.RedisConnOpt {
	if strings.HasPrefix(rawURL, "rediss://") {
		u := strings.TrimPrefix(rawURL, "rediss://")
		// Parse password@host:port
		var password, addr string
		if at := strings.LastIndex(u, "@"); at >= 0 {
			password = u[:at]
			addr = u[at+1:]
		} else {
			addr = u
		}
		return asynq.RedisClientOpt{
			Addr:      addr,
			Password:  password,
			TLSConfig: &tls.Config{},
		}
	}
	return asynq.RedisClientOpt{Addr: strings.TrimPrefix(rawURL, "redis://")}
}

// EnqueueTranslation enqueues a translation task.
func EnqueueTranslation(ctx context.Context, client *asynq.Client, entityType, entityID, sourceLang string, fields map[string]string) error {
	payload, _ := json.Marshal(TranslationPayload{
		EntityType: entityType,
		EntityID:   entityID,
		Fields:     fields,
		SourceLang: sourceLang,
	})
	_, err := client.EnqueueContext(ctx, asynq.NewTask(TypeTranslation, payload), asynq.Queue("translation"))
	return err
}

// EnqueueBulkUpload enqueues a bulk upload task.
func EnqueueBulkUpload(ctx context.Context, client *asynq.Client, payload BulkUploadPayload) error {
	data, _ := json.Marshal(payload)
	_, err := client.EnqueueContext(ctx, asynq.NewTask(TypeDishUpload, data))
	return err
}
