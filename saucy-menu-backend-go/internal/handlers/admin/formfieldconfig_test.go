package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/go-chi/chi/v5"
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

func TestGetFormFieldConfig_DishItem(t *testing.T) {
	pool := newTestPool(t)
	h := NewFormFieldConfigHandler(sqlc.New(pool))

	r := chi.NewRouter()
	r.Get("/admin/form-config/{formKey}", h.Get)

	req := httptest.NewRequest(http.MethodGet, "/admin/form-config/dish_item", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, 200, rec.Code)

	var body struct {
		Success bool `json:"success"`
		Data    struct {
			Fields []map[string]any `json:"fields"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.True(t, body.Success)
	require.Len(t, body.Data.Fields, 4)
	require.Equal(t, "allergens", body.Data.Fields[0]["key"])
}

func TestGetFormFieldConfig_UnknownFormKey(t *testing.T) {
	pool := newTestPool(t)
	h := NewFormFieldConfigHandler(sqlc.New(pool))

	r := chi.NewRouter()
	r.Get("/admin/form-config/{formKey}", h.Get)

	req := httptest.NewRequest(http.MethodGet, "/admin/form-config/no_such_form", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, 404, rec.Code)
}
