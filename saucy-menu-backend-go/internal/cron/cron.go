package cron

import (
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/stripe"
)

// Start registers and starts all background cron jobs.
// Returns the cron runner so the caller can call Stop() on shutdown.
func Start(q *sqlc.Queries) *cron.Cron {
	c := cron.New()

	// Every 6 hours: sync subscription statuses from Stripe
	_, _ = c.AddFunc("0 */6 * * *", func() { syncSubscriptions(q) })

	// Every 5 minutes: process pending Stripe events
	_, _ = c.AddFunc("*/5 * * * *", func() { processPendingStripeEvents(q) })

	c.Start()
	log.Info().Msg("cron jobs started")
	return c
}

func syncSubscriptions(q *sqlc.Queries) {
	log.Debug().Msg("cron: syncSubscriptions started")
	ctx := newBgCtx()

	subs, err := q.ListActiveSubscriptions(ctx)
	if err != nil {
		log.Error().Err(err).Msg("cron: failed to list active subscriptions")
		return
	}

	for _, sub := range subs {
		stripeSub, err := stripe.RetrieveSubscription(sub.StripeSubscriptionID)
		if err != nil {
			log.Error().Err(err).Str("sub", sub.StripeSubscriptionID).Msg("cron: stripe retrieve failed")
			continue
		}
		if stripeSub.Status != "active" {
			status := string(stripeSub.Status)
			if status == "canceled" {
				status = "canceled"
			} else {
				status = "expired"
			}
			_ = q.UpdateSubscriptionStatus(ctx, sqlc.UpdateSubscriptionStatusParams{
				Status: &status,
				ID:     sub.ID,
			})
			log.Info().Str("sub", sub.StripeSubscriptionID).Str("status", status).Msg("cron: subscription status updated")
		}
	}
}

func processPendingStripeEvents(q *sqlc.Queries) {
	log.Debug().Msg("cron: processPendingStripeEvents started")
	ctx := newBgCtx()

	events, err := q.ListPendingStripeEvents(ctx)
	if err != nil {
		log.Error().Err(err).Msg("cron: failed to list pending stripe events")
		return
	}

	for _, event := range events {
		if event.RelatedID == nil {
			_ = q.DeletePendingStripeEvent(ctx, event.ID)
			continue
		}
		sub, err := q.GetSubscriptionByStripeID(ctx, *event.RelatedID)
		if err != nil {
			continue // subscription not in DB yet, leave for next run
		}

		if event.EventType == "invoice.paid" {
			var inv map[string]any
			if err := json.Unmarshal([]byte(event.Payload), &inv); err != nil {
				_ = q.DeletePendingStripeEvent(ctx, event.ID)
				continue
			}
			var start, end pgtype.Timestamp
			if lines, ok := inv["lines"].(map[string]any); ok {
				if data, ok := lines["data"].([]any); ok && len(data) > 0 {
					if period, ok := data[0].(map[string]any)["period"].(map[string]any); ok {
						if s, ok := period["start"].(float64); ok {
							start = pgtype.Timestamp{Time: time.Unix(int64(s), 0), Valid: true}
						}
						if e, ok := period["end"].(float64); ok {
							end = pgtype.Timestamp{Time: time.Unix(int64(e), 0), Valid: true}
						}
					}
				}
			}
			_ = q.UpdateSubscriptionFromWebhook(ctx, sqlc.UpdateSubscriptionFromWebhookParams{
				Status:             strPtr("paid"),
				CurrentPeriodStart: start,
				CurrentPeriodEnd:   end,
				ID:                 sub.ID,
			})
		}

		_ = q.DeletePendingStripeEvent(ctx, event.ID)
	}
}

// newBgCtx returns a context with a generous deadline for cron work.
func newBgCtx() interface {
	Deadline() (time.Time, bool)
	Done() <-chan struct{}
	Err() error
	Value(key any) any
} {
	// Use context.Background() via the interface
	return bgCtx{}
}

type bgCtx struct{}

func (bgCtx) Deadline() (time.Time, bool) { return time.Time{}, false }
func (bgCtx) Done() <-chan struct{}        { return nil }
func (bgCtx) Err() error                  { return nil }
func (bgCtx) Value(any) any               { return nil }

func strPtr(s string) *string { return &s }
