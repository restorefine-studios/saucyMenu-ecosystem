package shared

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
)

func testDBURL() string {
	if v := os.Getenv("DATABASE_URL"); v != "" {
		return v
	}
	return "postgres://localhost:5432/saucy_menu_test?sslmode=disable"
}

func newTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	cfg, err := pgxpool.ParseConfig(testDBURL())
	require.NoError(t, err)
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	return pool
}

func TestSetupReturnsLanguagesAndCurrencies(t *testing.T) {
	pool := newTestPool(t)
	h := NewSetupHandler(sqlc.New(pool))

	req := httptest.NewRequest(http.MethodGet, "/shared/base/setup", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, 200, rec.Code)

	var body struct {
		Success bool `json:"success"`
		Data    struct {
			Languages  []map[string]any `json:"languages"`
			Currencies []map[string]any `json:"currencies"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.True(t, body.Success)
	require.NotEmpty(t, body.Data.Languages)
	require.NotEmpty(t, body.Data.Currencies)
}
