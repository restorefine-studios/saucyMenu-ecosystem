package super

import (
	"bytes"
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

func TestFormFieldConfig_GetThenPut_RoundTrip(t *testing.T) {
	pool := newTestPool(t)
	q := sqlc.New(pool)
	h := NewFormFieldConfigHandler(q)

	r := chi.NewRouter()
	r.Get("/super/form-config/{formKey}", h.Get)
	r.Put("/super/form-config/{formKey}", h.Update)

	// Reorder: swap diets and allergens to sortOrder 1 and 0 respectively, hide ingredients.
	payload := []byte(`{
		"fields": [
			{ "key": "diets", "label": "Diets", "visible": true, "required": false, "sortOrder": 0, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/diets" } },
			{ "key": "allergens", "label": "Allergens", "visible": true, "required": true, "sortOrder": 1, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/allergens" } },
			{ "key": "addons", "label": "Extras", "visible": true, "required": false, "sortOrder": 2, "optionsSource": { "type": "lookup", "endpoint": "/admin/addons" } },
			{ "key": "ingredients", "label": "Ingredients", "visible": false, "required": false, "sortOrder": 3, "optionsSource": { "type": "freetext" } }
		]
	}`)

	putReq := httptest.NewRequest(http.MethodPut, "/super/form-config/dish_item", bytes.NewReader(payload))
	putRec := httptest.NewRecorder()
	r.ServeHTTP(putRec, putReq)
	require.Equal(t, 200, putRec.Code, putRec.Body.String())

	getReq := httptest.NewRequest(http.MethodGet, "/super/form-config/dish_item", nil)
	getRec := httptest.NewRecorder()
	r.ServeHTTP(getRec, getReq)
	require.Equal(t, 200, getRec.Code)

	var body struct {
		Data struct {
			Fields []map[string]any `json:"fields"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &body))
	require.Len(t, body.Data.Fields, 4)
	require.Equal(t, "diets", body.Data.Fields[0]["key"])
	require.Equal(t, "addons", body.Data.Fields[2]["key"])
	require.Equal(t, "Extras", body.Data.Fields[2]["label"])
	require.Equal(t, false, body.Data.Fields[3]["visible"])

	// Restore the original seeded config so other tests in this package see
	// the default ordering.
	restore := []byte(`{
		"fields": [
			{ "key": "allergens", "label": "Allergens", "visible": true, "required": false, "sortOrder": 0, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/allergens" } },
			{ "key": "diets", "label": "Diets", "visible": true, "required": false, "sortOrder": 1, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/diets" } },
			{ "key": "addons", "label": "Add-ons", "visible": true, "required": false, "sortOrder": 2, "optionsSource": { "type": "lookup", "endpoint": "/admin/addons" } },
			{ "key": "ingredients", "label": "Ingredients", "visible": true, "required": false, "sortOrder": 3, "optionsSource": { "type": "freetext" } }
		]
	}`)
	restoreReq := httptest.NewRequest(http.MethodPut, "/super/form-config/dish_item", bytes.NewReader(restore))
	restoreRec := httptest.NewRecorder()
	r.ServeHTTP(restoreRec, restoreReq)
	require.Equal(t, 200, restoreRec.Code)
}

func TestFormFieldConfig_Put_RejectsUnknownKey(t *testing.T) {
	pool := newTestPool(t)
	h := NewFormFieldConfigHandler(sqlc.New(pool))

	r := chi.NewRouter()
	r.Put("/super/form-config/{formKey}", h.Update)

	payload := []byte(`{"fields":[{"key":"made_up","label":"X","visible":true,"required":false,"sortOrder":0,"optionsSource":{"type":"freetext"}}]}`)
	req := httptest.NewRequest(http.MethodPut, "/super/form-config/dish_item", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, 400, rec.Code)
}

func TestFormFieldConfig_Put_RejectsBadSortOrder(t *testing.T) {
	pool := newTestPool(t)
	h := NewFormFieldConfigHandler(sqlc.New(pool))

	r := chi.NewRouter()
	r.Put("/super/form-config/{formKey}", h.Update)

	payload := []byte(`{"fields":[
		{"key":"allergens","label":"A","visible":true,"required":false,"sortOrder":0,"optionsSource":{"type":"lookup","endpoint":"/admin/classifications/allergens"}},
		{"key":"diets","label":"D","visible":true,"required":false,"sortOrder":0,"optionsSource":{"type":"lookup","endpoint":"/admin/classifications/diets"}}
	]}`)
	req := httptest.NewRequest(http.MethodPut, "/super/form-config/dish_item", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, 400, rec.Code)
}
