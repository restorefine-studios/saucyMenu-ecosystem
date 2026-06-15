package betterauth

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSignAndVerifyCookieRoundTrip(t *testing.T) {
	secret := "dev-better-auth-secret-change-me"
	token := "example-session-token-from-db"

	signed := SignToken(token, secret)
	got, ok := VerifyToken(signed, secret)
	require.True(t, ok)
	require.Equal(t, token, got)
}

func TestVerifyRejectsTamper(t *testing.T) {
	secret := "dev-better-auth-secret-change-me"
	signed := SignToken("tok", secret)
	_, ok := VerifyToken(signed+"x", secret)
	require.False(t, ok)
}

// TestMatchesBunReference pins the signature to the exact value produced by
// better-auth's makeSignature (HMAC-SHA256, standard base64).
// Verified from spikes/SPIKE-A-findings.md.
func TestMatchesBunReference(t *testing.T) {
	secret := "dev-better-auth-secret-change-me"
	token := "test-session-token-12345"
	// Expected: computed via Node.js / Spike A
	// crypto.createHmac('sha256', secret).update(token).digest('base64')
	expectedCookieValue := "test-session-token-12345.nJhdM3+u0IT0u5SmHAZOdVuygrsmQDYleI4XF9aKRME="

	got := SignToken(token, secret)
	require.Equal(t, expectedCookieValue, got)

	// Also verify round-trip
	tok, ok := VerifyToken(expectedCookieValue, secret)
	require.True(t, ok)
	require.Equal(t, token, tok)
}

func TestCookieNameDev(t *testing.T) {
	name := CookieName("saucy-menu-auth", false)
	require.Equal(t, "saucy-menu-auth.session_token", name)
}

func TestCookieNameProd(t *testing.T) {
	name := CookieName("saucy-menu-auth", true)
	require.Equal(t, "__Secure-saucy-menu-auth.session_token", name)
}
