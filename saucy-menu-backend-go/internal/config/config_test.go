package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoadFromEnv(t *testing.T) {
	cfg, err := loadFrom(map[string]string{
		"DATABASE_URL":       "postgres://localhost/x",
		"JWT_SECRET":         "j",
		"BETTER_AUTH_SECRET": "b",
		"PORT":               "9999",
	})
	require.NoError(t, err)
	require.Equal(t, "postgres://localhost/x", cfg.DatabaseURL)
	require.Equal(t, "9999", cfg.Port)
	require.Equal(t, "j", cfg.JWTSecret)
	require.Equal(t, "b", cfg.BetterAuthSecret)
}

func TestLoadMissingRequiredFails(t *testing.T) {
	// Empty map means all required fields are absent — must error.
	_, err := loadFrom(map[string]string{})
	require.Error(t, err)
}
