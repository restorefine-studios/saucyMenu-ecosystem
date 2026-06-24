package stripe

import (
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/subscription"
	"github.com/stripe/stripe-go/v82/webhook"
)

// Init sets the Stripe API key globally. Call once from main or router setup.
func Init(secretKey string) {
	stripe.Key = secretKey
}

// APIVersion is the Stripe API version pinned to match the Bun backend.
const APIVersion = "2025-04-30.basil"

// CreateCheckoutSession creates a Stripe hosted checkout session for a subscription.
func CreateCheckoutSession(priceID, customerEmail, successURL, userID string) (*stripe.CheckoutSession, error) {
	params := &stripe.CheckoutSessionParams{
		SuccessURL: stripe.String(successURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
		},
		PaymentMethodTypes: stripe.StringSlice([]string{"card", "paypal"}),
		Mode:               stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		CustomerEmail:      stripe.String(customerEmail),
		Metadata:           map[string]string{"userId": userID, "priceId": priceID},
	}
	return session.New(params)
}

// CancelSubscriptionAtPeriodEnd sets cancel_at_period_end = true on the Stripe subscription.
func CancelSubscriptionAtPeriodEnd(stripeSubID, userID string) (*stripe.Subscription, error) {
	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
		Metadata:          map[string]string{"userId": userID},
	}
	return subscription.Update(stripeSubID, params)
}

// RetrieveSubscription fetches a Stripe subscription by ID.
func RetrieveSubscription(subID string) (*stripe.Subscription, error) {
	return subscription.Get(subID, nil)
}

// ConstructWebhookEvent validates the Stripe webhook signature and returns the event.
func ConstructWebhookEvent(payload []byte, sig, secret string) (stripe.Event, error) {
	return webhook.ConstructEvent(payload, sig, secret)
}
