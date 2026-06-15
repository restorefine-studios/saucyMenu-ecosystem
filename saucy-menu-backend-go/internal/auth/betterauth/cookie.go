package betterauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strings"
)

// SignToken produces the signed cookie value used by better-auth.
// Format: "<token>.<base64(HMAC-SHA256(token, secret))>"
// Uses standard base64 encoding (with padding) to match btoa() in the browser.
// See spikes/SPIKE-A-findings.md for the verified reference values.
func SignToken(token, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(token))
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return token + "." + sig
}

// VerifyToken validates a signed cookie value and returns the embedded token.
// Returns ("", false) if the value is malformed or the signature does not match.
func VerifyToken(value, secret string) (string, bool) {
	i := strings.LastIndex(value, ".")
	if i < 0 {
		return "", false
	}
	token := value[:i]
	expected := SignToken(token, secret)
	if subtle.ConstantTimeCompare([]byte(value), []byte(expected)) == 1 {
		return token, true
	}
	return "", false
}

// CookieName returns the session_token cookie name for the given prefix.
// In production (secure=true) the __Secure- prefix is added, matching
// better-auth's behaviour when BETTER_AUTH_URL starts with https://.
func CookieName(prefix string, secure bool) string {
	name := prefix + ".session_token"
	if secure {
		return "__Secure-" + name
	}
	return name
}
