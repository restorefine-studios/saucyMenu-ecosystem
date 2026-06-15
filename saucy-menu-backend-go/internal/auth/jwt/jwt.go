package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TODO: harden — the END_USER JWT is ported as-is from the Bun backend.
// Claims match the original @elysiajs/jwt shape exactly so end-user-app keeps working.

type EndUserClaims struct {
	ID           string `json:"id"`
	RestaurantID string `json:"restaurantId"`
	Role         string `json:"role"`
	SessionID    string `json:"sessionId"`
	jwt.RegisteredClaims
}

func SignEndUser(secret, id, restaurantID, sessionID string) (string, error) {
	claims := EndUserClaims{
		ID:           id,
		RestaurantID: restaurantID,
		Role:         "END_USER",
		SessionID:    sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func VerifyEndUser(secret, tokenStr string) (*EndUserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &EndUserClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*EndUserClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.Role != "END_USER" {
		return nil, errors.New("unauthorized: role mismatch")
	}
	return claims, nil
}
