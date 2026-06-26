package admin

import (
	"encoding/json"
	"net/http"

	authm "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/stripe"
)

type SubscriptionsHandler struct {
	q          *sqlc.Queries
	stripeKey  string
}

func NewSubscriptionsHandler(q *sqlc.Queries, stripeKey ...string) *SubscriptionsHandler {
	key := ""
	if len(stripeKey) > 0 {
		key = stripeKey[0]
	}
	return &SubscriptionsHandler{q: q, stripeKey: key}
}

// GET /admin/subscriptions/system
func (h *SubscriptionsHandler) ListSystemPlans(w http.ResponseWriter, r *http.Request) {
	user := authm.GetAdminUser(r.Context())
	plans, err := h.q.ListSubscriptionPlansWithStatus(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch plans")
		return
	}
	result := make([]map[string]any, 0, len(plans))
	for _, p := range plans {
		var renewalDate *string
		if p.CurrentPeriodEnd.Valid {
			s := p.CurrentPeriodEnd.Time.UTC().Format("2 Jan 2006")
			renewalDate = &s
		}
		result = append(result, map[string]any{
			"name":            p.Name,
			"stripePriceId":   p.StripePriceID,
			"stripeProductId": p.StripeProductID,
			"status":          p.Status,
			"subscribed":      p.Status != nil && *p.Status != "canceled",
			"currentPeriodEnd": renewalDate,
			"cancelAtPeriodEnd": p.CancelAtPeriodEnd != nil && *p.CancelAtPeriodEnd,
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// POST /admin/subscriptions/
func (h *SubscriptionsHandler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	if h.stripeKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Stripe not configured")
		return
	}
	user := authm.GetAdminUser(r.Context())
	var body struct {
		PriceID    string `json:"priceId"`
		SuccessURL string `json:"success_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.PriceID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "priceId is required")
		return
	}

	ctx := r.Context()
	// Check if already subscribed
	existing, err := h.q.GetUserSubscriptionByUserID(ctx, user.ID)
	if err == nil && existing.Status != nil && *existing.Status != "canceled" {
		httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": false, "message": "Already subscribed to a plan"})
		return
	}

	// Make sure the price ID actually belongs to one of our plans before sending it to Stripe.
	if _, err := h.q.GetPlanByPriceID(ctx, &body.PriceID); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Unknown price for plan")
		return
	}

	sess, err := stripe.CreateCheckoutSession(
		body.PriceID, user.Email, body.SuccessURL, pgUUIDToString(user.ID),
	)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create checkout session")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"url": sess.URL})
}

// POST /admin/subscriptions/cancel
func (h *SubscriptionsHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	if h.stripeKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Stripe not configured")
		return
	}
	user := authm.GetAdminUser(r.Context())

	ctx := r.Context()
	sub, err := h.q.GetUserSubscriptionByUserID(ctx, user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "No subscription found")
		return
	}

	if _, err := stripe.CancelSubscriptionAtPeriodEnd(sub.StripeSubscriptionID, pgUUIDToString(user.ID)); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to cancel subscription")
		return
	}

	// Update local DB to reflect cancellation
	_ = h.q.UpdateSubscriptionCancelAtPeriodEnd(ctx, sqlc.UpdateSubscriptionCancelAtPeriodEndParams{
		CancelAtPeriodEnd:    boolPtr(true),
		Status:               strPtr("active"),
		StripeSubscriptionID: sub.StripeSubscriptionID,
	})

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Subscription will be cancelled at period end"})
}

func strPtr(s string) *string { return &s }
func boolPtr(b bool) *bool    { return &b }
