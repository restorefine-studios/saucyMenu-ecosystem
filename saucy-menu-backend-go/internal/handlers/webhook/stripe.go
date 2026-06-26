package webhook

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"
	stripelib "github.com/stripe/stripe-go/v82"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/plunk"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/stripe"
)

type StripeHandler struct {
	q             *sqlc.Queries
	webhookSecret string
	resendKey     string
}

func NewStripeHandler(q *sqlc.Queries, webhookSecret, resendKey string) *StripeHandler {
	return &StripeHandler{q: q, webhookSecret: webhookSecret, resendKey: resendKey}
}

// POST /webhook/stripe
func (h *StripeHandler) Handle(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1 MB max
	if err != nil {
		http.Error(w, "read error", http.StatusBadRequest)
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	log.Debug().Int("secret_len", len(h.webhookSecret)).Bool("sig_present", sig != "").Msg("webhook received")
	event, err := stripe.ConstructWebhookEvent(body, sig, h.webhookSecret)
	if err != nil {
		log.Error().
			Err(err).
			Int("secret_len", len(h.webhookSecret)).
			Int("sig_len", len(sig)).
			Int("body_len", len(body)).
			Msg("stripe webhook signature verification failed")
		http.Error(w, "Webhook Error", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	switch event.Type {

	case "checkout.session.completed":
		var sess stripelib.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			log.Error().Err(err).Msg("checkout.session.completed: failed to unmarshal")
			break
		}
		userID := sess.Metadata["userId"]
		priceID := sess.Metadata["priceId"]
		log.Info().Str("userId", userID).Str("priceId", priceID).Msg("checkout.session.completed received")
		if userID == "" {
			log.Error().Msg("checkout.session.completed: userId missing from metadata")
			break
		}
		uid, err := parseUUID(userID)
		if err != nil {
			log.Error().Err(err).Str("userId", userID).Msg("checkout.session.completed: failed to parse userId")
			break
		}
		plan, _ := h.q.GetPlanByPriceID(ctx, &priceID)
		subID := ""
		if sess.Subscription != nil {
			subID = sess.Subscription.ID
		}
		customerID := ""
		if sess.Customer != nil {
			customerID = sess.Customer.ID
		}
		log.Info().Str("subId", subID).Str("customerId", customerID).Bool("planValid", plan.Valid).Msg("checkout.session.completed: upserting subscription")
		if err := h.q.UpsertSubscription(ctx, sqlc.UpsertSubscriptionParams{
			UserID:               uid,
			StripeSubscriptionID: subID,
			StripeCustomerID:     customerID,
			PriceID:              &priceID,
			Status:               strPtr("active"),
			PlanID:               plan,
		}); err != nil {
			log.Error().Err(err).Str("userId", userID).Msg("checkout.session.completed: UpsertSubscription failed")
		} else {
			log.Info().Str("userId", userID).Msg("checkout.session.completed: subscription saved OK")
		}

		// Send confirmation email
		if h.resendKey != "" && sess.CustomerEmail != "" {
			go func() {
				emailClient := plunk.New(h.resendKey)
				planName := "your plan"
				if plan.Valid {
					// plan is a UUID — just use what we have from the session
				}
				_ = emailClient.Send(plunk.SendParams{
					To:      sess.CustomerEmail,
					Subject: "You're subscribed to SaucyMenu!",
					Body: fmt.Sprintf(
						"Hi there,\n\nThank you for subscribing to SaucyMenu %s!\n\nYour subscription is now active. Log in to your dashboard to start building your menu.\n\nWelcome aboard!\n\nThe SaucyMenu Team",
						planName,
					),
				})
			}()
		}

	case "product.created":
		var prod stripelib.Product
		if err := json.Unmarshal(event.Data.Raw, &prod); err != nil {
			break
		}
		_ = h.q.UpsertSubscriptionPlan(ctx, sqlc.UpsertSubscriptionPlanParams{
			ProductID: prod.ID,
			Name:      prod.Name,
			PriceID:   nil,
		})

	case "product.deleted":
		var prod stripelib.Product
		if err := json.Unmarshal(event.Data.Raw, &prod); err != nil {
			break
		}
		_ = h.q.DeleteSubscriptionPlan(ctx, prod.ID)

	case "product.updated":
		var prod stripelib.Product
		if err := json.Unmarshal(event.Data.Raw, &prod); err != nil {
			break
		}
		defaultPrice := ""
		if prod.DefaultPrice != nil {
			defaultPrice = prod.DefaultPrice.ID
		}
		_ = h.q.UpsertSubscriptionPlan(ctx, sqlc.UpsertSubscriptionPlanParams{
			ProductID: prod.ID,
			Name:      prod.Name,
			PriceID:   strPtr(defaultPrice),
		})

	case "price.created":
		var p stripelib.Price
		if err := json.Unmarshal(event.Data.Raw, &p); err != nil {
			break
		}
		productID := ""
		if p.Product != nil {
			productID = p.Product.ID
		}
		_ = h.q.UpsertSubscriptionPlan(ctx, sqlc.UpsertSubscriptionPlanParams{
			ProductID: productID,
			PriceID:   strPtr(p.ID),
			Name:      "Unknown (from price.created)",
		})

	case "invoice.paid":
		var inv stripelib.Invoice
		if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
			break
		}
		subID := ""
		if inv.Parent != nil && inv.Parent.SubscriptionDetails != nil {
			subID = inv.Parent.SubscriptionDetails.Subscription.ID
		}
		existing, err := h.q.GetSubscriptionByStripeID(ctx, subID)
		if err != nil {
			// Store for later processing
			_ = h.q.InsertPendingStripeEvent(ctx, sqlc.InsertPendingStripeEventParams{
				EventID:   event.ID,
				EventType: "invoice.paid",
				RelatedID: &subID,
				Payload:   string(event.Data.Raw),
			})
			break
		}
		var start, end pgtype.Timestamp
		if len(inv.Lines.Data) > 0 {
			start = pgtype.Timestamp{Time: time.Unix(inv.Lines.Data[0].Period.Start, 0), Valid: true}
			end = pgtype.Timestamp{Time: time.Unix(inv.Lines.Data[0].Period.End, 0), Valid: true}
		}
		priceID := ""
		if len(inv.Lines.Data) > 0 && inv.Lines.Data[0].Pricing != nil && inv.Lines.Data[0].Pricing.PriceDetails != nil {
			priceID = inv.Lines.Data[0].Pricing.PriceDetails.Price
		}
		_ = h.q.UpdateSubscriptionFromWebhook(ctx, sqlc.UpdateSubscriptionFromWebhookParams{
			Status:              strPtr("paid"),
			PriceID:             &priceID,
			CurrentPeriodStart:  start,
			CurrentPeriodEnd:    end,
			ID:                  existing.ID,
		})

	case "customer.subscription.updated":
		var sub stripelib.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			break
		}
		activeItem := sub.Items.Data[0]
		var start, end, canceledAt pgtype.Timestamp
		if activeItem != nil {
			start = pgtype.Timestamp{Time: time.Unix(activeItem.CurrentPeriodStart, 0), Valid: true}
			end = pgtype.Timestamp{Time: time.Unix(activeItem.CurrentPeriodEnd, 0), Valid: true}
		}
		if sub.CanceledAt > 0 {
			canceledAt = pgtype.Timestamp{Time: time.Unix(sub.CanceledAt, 0), Valid: true}
		}
		priceID := ""
		if activeItem != nil && activeItem.Price != nil {
			priceID = activeItem.Price.ID
		}
		_ = h.q.UpdateSubscriptionFull(ctx, sqlc.UpdateSubscriptionFullParams{
			Status:                 strPtr(string(sub.Status)),
			CurrentPeriodStart:     start,
			CurrentPeriodEnd:       end,
			CanceledAt:             canceledAt,
			PriceID:                &priceID,
			StripeSubscriptionID:   sub.ID,
			StripeSubscriptionID_2: sub.ID,
		})

	case "customer.subscription.deleted":
		var sub stripelib.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			break
		}
		_ = h.q.UpdateSubscriptionCancelAtPeriodEnd(ctx, sqlc.UpdateSubscriptionCancelAtPeriodEndParams{
			CancelAtPeriodEnd:    boolPtr(true),
			Status:               strPtr("canceled"),
			StripeSubscriptionID: sub.ID,
		})

	default:
		log.Debug().Str("type", string(event.Type)).Msg("unhandled stripe event")
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("Webhook received successfully"))
}

func strPtr(s string) *string { return &s }
func boolPtr(b bool) *bool    { return &b }

func parseUUID(s string) (pgtype.UUID, error) {
	clean := strings.ReplaceAll(s, "-", "")
	if len(clean) != 32 {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID length")
	}
	var uid pgtype.UUID
	for i := 0; i < 16; i++ {
		v, err := strconv.ParseUint(clean[i*2:i*2+2], 16, 8)
		if err != nil {
			return pgtype.UUID{}, fmt.Errorf("invalid UUID character at position %d: %w", i*2, err)
		}
		uid.Bytes[i] = byte(v)
	}
	uid.Valid = true
	return uid, nil
}
