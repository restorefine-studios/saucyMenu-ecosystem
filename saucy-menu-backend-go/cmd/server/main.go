package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/cron"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/router"
)

func main() {
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
		With().Timestamp().Logger()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("db connect failed")
	}
	defer pool.Close()

	// Start background cron jobs (Stripe sync + pending event processing)
	if cfg.StripeSecretKey != "" {
		cronRunner := cron.Start(sqlc.New(pool))
		defer cronRunner.Stop()
	}

	h := router.New(pool, cfg)
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           h,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second, // generous for AI streaming responses
		IdleTimeout:       120 * time.Second,
	}

	log.Info().Str("addr", srv.Addr).Str("env", cfg.NodeEnv).Msg("saucy-menu-go starting")
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal().Err(err).Msg("server stopped")
	}
}
