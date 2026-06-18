package main

import (
	"context"
	"os"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	auditpkg "github.com/restorefine-studios/saucy-menu-backend-go/internal/audit"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/cron"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/deepl"
	stripeint "github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/stripe"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/queue"
)

func main() {
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
		With().Timestamp().Logger()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	if cfg.UpstashRedisURL == "" {
		log.Fatal().Msg("UPSTASH_REDIS_URL is required for the worker")
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("db connect failed")
	}
	defer pool.Close()

	q := sqlc.New(pool)

	// Initialise Stripe for cron subscription sync
	if cfg.StripeSecretKey != "" {
		stripeint.Init(cfg.StripeSecretKey)
	}

	// Cron jobs (subscription sync + pending Stripe events)
	cronRunner := cron.Start(q)
	defer cronRunner.Stop()

	// asynq worker
	asynqClient := queue.NewClient(cfg.UpstashRedisURL)
	defer asynqClient.Close()

	dl := deepl.New(cfg.DeepLAPIKey)

	srv := queue.NewServer(cfg.UpstashRedisURL, 8)
	mux := asynq.NewServeMux()

	audit := auditpkg.New(q)
	bulkHandler := queue.HandleBulkUpload(q, asynqClient, audit)
	mux.HandleFunc(queue.TypeDishUpload, bulkHandler)
	mux.HandleFunc(queue.TypeDrinkUpload, bulkHandler)
	mux.HandleFunc(queue.TypeTranslation, queue.HandleTranslation(q, dl))

	log.Info().Msg("worker starting")
	if err := srv.Run(mux); err != nil {
		log.Fatal().Err(err).Msg("worker stopped")
	}
}
