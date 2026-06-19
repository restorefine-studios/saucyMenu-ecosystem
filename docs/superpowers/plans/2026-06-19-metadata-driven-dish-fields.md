# Metadata-Driven Dish-Item Picker Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let super-admin reorder, show/hide, relabel, and toggle required on the four picker fields (allergens, diets, addons, ingredients) of the restaurant-admin dish form at runtime, with no code deploy.

**Architecture:** A single JSONB config document (`form_field_configs` table, `form_key='dish_item'`) holds an ordered array of field definitions. `saucy-menu-backend-go` exposes a read endpoint to restaurant-admin and read+write endpoints to super-admin, with server-side validation of keys and sort order. restaurant-admin replaces its four hardcoded picker components with one generic `MetaPickerField` driven by the fetched config. super-admin gets a new page to edit the config.

**Tech Stack:** Go (chi, pgx/v5, sqlc) on the backend; React + TanStack Query + TanStack Form on restaurant-admin; React + TanStack Query on super-admin.

## Global Constraints

- Storage is a single JSONB document per form (`form_key`), not a relational per-field table — see spec section "Storage & data model".
- Only these four `key`s are valid for `form_key='dish_item'`: `allergens`, `diets`, `addons`, `ingredients`. No new keys may be added at runtime — see spec "Explicitly out of scope".
- `sortOrder` must be a 0..n-1 permutation with no gaps or duplicates, validated server-side before any write.
- Relabeling sets a literal string; i18n is dropped for a relabeled field once set — see spec "Explicitly out of scope".
- No new frontend test-runner dependency is being introduced (neither restaurant-admin nor super-admin currently has one) — frontend tasks are verified manually via the dev server, not automated tests.
- No new backend dependency for drag/reorder — super-admin UI uses up/down buttons, not a drag library (none exists in either frontend app today).

---

### Task 1: `form_field_configs` table + seed row

**Files:**
- Modify: `saucy-menu-backend-go/internal/db/schema.sql` (append)
- Create: `saucy-menu-backend-go/internal/db/queries/form_field_configs.sql`

**Interfaces:**
- Produces: sqlc-generated `GetFormFieldConfig(ctx, formKey string) (FormFieldConfig, error)` and `UpsertFormFieldConfig(ctx, UpsertFormFieldConfigParams) error` — exact Go signatures appear after `make sqlc` runs in Step 4 below; later tasks call them by these names.

- [ ] **Step 1: Append the table definition to `schema.sql`**

Add this block at the end of `internal/db/schema.sql`:

```sql
-- >>> form_field_configs for metadata-driven dish-item picker fields
CREATE TABLE IF NOT EXISTS form_field_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key    TEXT UNIQUE NOT NULL,
  config      JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);

INSERT INTO form_field_configs (form_key, config)
VALUES (
  'dish_item',
  '{
    "fields": [
      { "key": "allergens", "label": "Allergens", "visible": true, "required": false, "sortOrder": 0, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/allergens" } },
      { "key": "diets", "label": "Diets", "visible": true, "required": false, "sortOrder": 1, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/diets" } },
      { "key": "addons", "label": "Add-ons", "visible": true, "required": false, "sortOrder": 2, "optionsSource": { "type": "lookup", "endpoint": "/admin/addons" } },
      { "key": "ingredients", "label": "Ingredients", "visible": true, "required": false, "sortOrder": 3, "optionsSource": { "type": "freetext" } }
    ]
  }'::jsonb
)
ON CONFLICT (form_key) DO NOTHING;
```

- [ ] **Step 2: Apply this SQL to the actual database**

Run (from `saucy-menu-backend-go/`, using the `DATABASE_URL` from your local `.env`):

```bash
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS form_field_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key    TEXT UNIQUE NOT NULL,
  config      JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);
"
```

Then run the `INSERT ... ON CONFLICT DO NOTHING` statement from Step 1 the same way. Confirm with:

```bash
psql "$DATABASE_URL" -c "SELECT form_key, jsonb_array_length(config->'fields') FROM form_field_configs;"
```

Expected output: one row, `dish_item | 4`.

- [ ] **Step 3: Create the sqlc query file**

Create `internal/db/queries/form_field_configs.sql`:

```sql
-- name: GetFormFieldConfig :one
SELECT form_key, config, updated_at, updated_by
FROM form_field_configs
WHERE form_key = $1;

-- name: UpsertFormFieldConfig :exec
INSERT INTO form_field_configs (form_key, config, updated_at, updated_by)
VALUES ($1, $2::jsonb, now(), $3)
ON CONFLICT (form_key) DO UPDATE
  SET config = $2::jsonb, updated_at = now(), updated_by = $3;
```

- [ ] **Step 4: Regenerate sqlc and verify the build**

```bash
make sqlc
go build ./...
```

Expected: no errors. Confirm the new types exist:

```bash
grep -n "FormFieldConfig\b" internal/db/sqlc/models.go internal/db/sqlc/form_field_configs.sql.go
```

Expected: a `FormFieldConfig` struct in `models.go` (fields `FormKey string`, `Config []byte`, `UpdatedAt pgtype.Timestamptz`, `UpdatedBy pgtype.UUID`), and `GetFormFieldConfig`/`UpsertFormFieldConfig` functions in `form_field_configs.sql.go`.

- [ ] **Step 5: Commit**

```bash
git add internal/db/schema.sql internal/db/queries/form_field_configs.sql internal/db/sqlc/
git commit -m "Add form_field_configs table for metadata-driven dish picker fields"
```

---

### Task 2: `formconfig` validation package

**Files:**
- Create: `saucy-menu-backend-go/internal/formconfig/formconfig.go`
- Test: `saucy-menu-backend-go/internal/formconfig/formconfig_test.go`

**Interfaces:**
- Consumes: nothing (pure logic, no DB).
- Produces:
  - `type OptionsSource struct { Type string \`json:"type"\`; Endpoint string \`json:"endpoint,omitempty"\` }`
  - `type FieldConfig struct { Key string \`json:"key"\`; Label string \`json:"label"\`; Visible bool \`json:"visible"\`; Required bool \`json:"required"\`; SortOrder int \`json:"sortOrder"\`; OptionsSource OptionsSource \`json:"optionsSource"\` }`
  - `type FormFieldsPayload struct { Fields []FieldConfig \`json:"fields"\` }`
  - `func ValidateKeys(formKey string, fields []FieldConfig) error`
  - `func ValidateSortOrder(fields []FieldConfig) error`
  - Later tasks (3, 4) import this package as `"github.com/restorefine-studios/saucy-menu-backend-go/internal/formconfig"`.

- [ ] **Step 1: Write the failing tests**

Create `internal/formconfig/formconfig_test.go`:

```go
package formconfig

import "testing"

func TestValidateSortOrder(t *testing.T) {
	cases := []struct {
		name    string
		fields  []FieldConfig
		wantErr bool
	}{
		{"valid permutation", []FieldConfig{{SortOrder: 0}, {SortOrder: 1}, {SortOrder: 2}, {SortOrder: 3}}, false},
		{"duplicate", []FieldConfig{{SortOrder: 0}, {SortOrder: 0}, {SortOrder: 1}, {SortOrder: 2}}, true},
		{"gap", []FieldConfig{{SortOrder: 0}, {SortOrder: 1}, {SortOrder: 3}}, true},
		{"negative", []FieldConfig{{SortOrder: -1}, {SortOrder: 0}}, true},
		{"out of range", []FieldConfig{{SortOrder: 0}, {SortOrder: 5}}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateSortOrder(c.fields)
			if c.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !c.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

func TestValidateKeys(t *testing.T) {
	cases := []struct {
		name    string
		formKey string
		fields  []FieldConfig
		wantErr bool
	}{
		{"all valid", "dish_item", []FieldConfig{{Key: "allergens"}, {Key: "diets"}, {Key: "addons"}, {Key: "ingredients"}}, false},
		{"unknown key", "dish_item", []FieldConfig{{Key: "allergens"}, {Key: "made_up_field"}}, true},
		{"unknown form", "drink_item", []FieldConfig{{Key: "allergens"}}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateKeys(c.formKey, c.fields)
			if c.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !c.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
go test ./internal/formconfig/... -v
```

Expected: FAIL — `formconfig` package / `FieldConfig` / `ValidateSortOrder` / `ValidateKeys` not defined.

- [ ] **Step 3: Write the implementation**

Create `internal/formconfig/formconfig.go`:

```go
package formconfig

import "fmt"

type OptionsSource struct {
	Type     string `json:"type"`
	Endpoint string `json:"endpoint,omitempty"`
}

type FieldConfig struct {
	Key           string        `json:"key"`
	Label         string        `json:"label"`
	Visible       bool          `json:"visible"`
	Required      bool          `json:"required"`
	SortOrder     int           `json:"sortOrder"`
	OptionsSource OptionsSource `json:"optionsSource"`
}

type FormFieldsPayload struct {
	Fields []FieldConfig `json:"fields"`
}

var allowedKeys = map[string][]string{
	"dish_item": {"allergens", "diets", "addons", "ingredients"},
}

// ValidateKeys rejects any field whose Key is not in the allowlist for formKey,
// and rejects formKey itself if it has no allowlist entry.
func ValidateKeys(formKey string, fields []FieldConfig) error {
	allowed, ok := allowedKeys[formKey]
	if !ok {
		return fmt.Errorf("unknown form key %q", formKey)
	}
	allowedSet := make(map[string]bool, len(allowed))
	for _, k := range allowed {
		allowedSet[k] = true
	}
	for _, f := range fields {
		if !allowedSet[f.Key] {
			return fmt.Errorf("field key %q is not allowed for form %q", f.Key, formKey)
		}
	}
	return nil
}

// ValidateSortOrder requires SortOrder values across fields to form an exact
// 0..n-1 permutation — no gaps, no duplicates, no out-of-range values.
func ValidateSortOrder(fields []FieldConfig) error {
	seen := make([]bool, len(fields))
	for _, f := range fields {
		if f.SortOrder < 0 || f.SortOrder >= len(fields) || seen[f.SortOrder] {
			return fmt.Errorf("sortOrder must be a 0..%d permutation with no gaps or duplicates", len(fields)-1)
		}
		seen[f.SortOrder] = true
	}
	return nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/formconfig/... -v
```

Expected: PASS, all subtests green.

- [ ] **Step 5: Commit**

```bash
git add internal/formconfig/
git commit -m "Add formconfig package for dish-item field-config validation"
```

---

### Task 3: `GET /admin/form-config/{formKey}` (restaurant-admin read)

**Files:**
- Create: `saucy-menu-backend-go/internal/handlers/admin/formfieldconfig.go`
- Modify: `saucy-menu-backend-go/internal/handlers/admin/handler.go`
- Test: `saucy-menu-backend-go/internal/handlers/admin/formfieldconfig_test.go`

**Interfaces:**
- Consumes: `sqlc.Queries.GetFormFieldConfig` (Task 1), `formconfig.FieldConfig`/`FormFieldsPayload` (Task 2, used only for the JSON shape on the wire — the handler passes the stored `Config []byte` straight through, see Step 3).
- Produces: route `GET /admin/form-config/{formKey}` returning `{"success":true,"data":{"fields":[...]}}`.

- [ ] **Step 1: Write the failing test**

Create `internal/handlers/admin/formfieldconfig_test.go`:

```go
package admin

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"context"

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/handlers/admin/... -run TestGetFormFieldConfig -v
```

Expected: FAIL with `NewFormFieldConfigHandler` undefined (compile error).

- [ ] **Step 3: Write the implementation**

Create `internal/handlers/admin/formfieldconfig.go`:

```go
package admin

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type FormFieldConfigHandler struct{ q *sqlc.Queries }

func NewFormFieldConfigHandler(q *sqlc.Queries) *FormFieldConfigHandler {
	return &FormFieldConfigHandler{q: q}
}

// GET /admin/form-config/{formKey}
func (h *FormFieldConfigHandler) Get(w http.ResponseWriter, r *http.Request) {
	formKey := chi.URLParam(r, "formKey")
	row, err := h.q.GetFormFieldConfig(r.Context(), formKey)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "form config not found")
		return
	}
	httpx.WriteRawJSON(w, http.StatusOK, row.Config)
}
```

This calls `httpx.WriteRawJSON`, which doesn't exist yet — `WriteSuccess` json-marshals its `data` argument, but `row.Config` is already a `[]byte` of `{"fields": [...]}` and double-marshaling would wrap it as a JSON string instead of an object. Add the helper alongside the existing `Write*` functions:

In `internal/httpx/` find the file containing `func WriteSuccess` (run `grep -rn "func WriteSuccess" internal/httpx/` to locate it) and add this function in the same file, right after `WriteSuccess`:

```go
// WriteRawJSON writes {"success": true, "data": <rawJSON>} where rawJSON is
// embedded as-is (not re-marshaled) — for handlers that already hold a JSON
// document (e.g. a JSONB column read straight from the DB).
func WriteRawJSON(w http.ResponseWriter, status int, rawJSON []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"success":true,"data":`))
	w.Write(rawJSON)
	w.Write([]byte(`}`))
}
```

- [ ] **Step 4: Wire the route into `handler.go`**

In `internal/handlers/admin/handler.go`, add after the `uploadH := NewUploadHandler(s3)` line:

```go
	formFieldConfigH := NewFormFieldConfigHandler(q)
```

And add this route in the "Upload" section (or any clearly-labeled section) — after the `r.Delete("/upload/{key:.*}", uploadH.Delete)` line:

```go
	// Form field config — metadata-driven dish-item picker fields
	r.Get("/form-config/{formKey}", formFieldConfigH.Get)
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
go test ./internal/handlers/admin/... -run TestGetFormFieldConfig -v
```

Expected: PASS for both `TestGetFormFieldConfig_DishItem` and `TestGetFormFieldConfig_UnknownFormKey`.

- [ ] **Step 6: Commit**

```bash
git add internal/handlers/admin/formfieldconfig.go internal/handlers/admin/formfieldconfig_test.go internal/handlers/admin/handler.go internal/httpx/
git commit -m "Add GET /admin/form-config/:formKey for restaurant-admin"
```

---

### Task 4: `GET`/`PUT /super/form-config/{formKey}` (super-admin read+write)

**Files:**
- Create: `saucy-menu-backend-go/internal/handlers/super/formfieldconfig.go`
- Modify: `saucy-menu-backend-go/internal/handlers/super/handler.go`
- Test: `saucy-menu-backend-go/internal/handlers/super/formfieldconfig_test.go`

**Interfaces:**
- Consumes: `sqlc.Queries.GetFormFieldConfig`/`UpsertFormFieldConfig` (Task 1), `formconfig.FieldConfig`/`FormFieldsPayload`/`ValidateKeys`/`ValidateSortOrder` (Task 2), `httpx.WriteRawJSON` (Task 3), `auth.GetAdminUser(ctx)` (existing — returns `*sqlc.FindUserByIDRow`, works under both `AdminAuth` and `SuperAdminAuth` since both set the same context key).
- Produces: routes `GET /super/form-config/{formKey}` and `PUT /super/form-config/{formKey}`.

- [ ] **Step 1: Write the failing tests**

Create `internal/handlers/super/formfieldconfig_test.go`:

```go
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
go test ./internal/handlers/super/... -run TestFormFieldConfig -v
```

Expected: FAIL — `NewFormFieldConfigHandler` undefined in package `super` (compile error).

- [ ] **Step 3: Write the implementation**

Create `internal/handlers/super/formfieldconfig.go`:

```go
package super

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/formconfig"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type FormFieldConfigHandler struct{ q *sqlc.Queries }

func NewFormFieldConfigHandler(q *sqlc.Queries) *FormFieldConfigHandler {
	return &FormFieldConfigHandler{q: q}
}

// GET /super/form-config/{formKey}
func (h *FormFieldConfigHandler) Get(w http.ResponseWriter, r *http.Request) {
	formKey := chi.URLParam(r, "formKey")
	row, err := h.q.GetFormFieldConfig(r.Context(), formKey)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "form config not found")
		return
	}
	httpx.WriteRawJSON(w, http.StatusOK, row.Config)
}

// PUT /super/form-config/{formKey}
func (h *FormFieldConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	formKey := chi.URLParam(r, "formKey")

	var payload formconfig.FormFieldsPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := formconfig.ValidateKeys(formKey, payload.Fields); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := formconfig.ValidateSortOrder(payload.Fields); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	configJSON, err := json.Marshal(payload)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to encode config")
		return
	}

	var updatedBy pgtype.UUID
	if user := auth.GetAdminUser(r.Context()); user != nil {
		updatedBy = user.ID
	}

	if err := h.q.UpsertFormFieldConfig(r.Context(), sqlc.UpsertFormFieldConfigParams{
		FormKey:   formKey,
		Config:    configJSON,
		UpdatedBy: updatedBy,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to save form config")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Form config updated successfully"})
}
```

This references `pgtype.UUID` — add the import:

```go
	"github.com/jackc/pgx/v5/pgtype"
```

(insert it in the import block, alphabetically among the existing imports, i.e. right after `"github.com/go-chi/chi/v5"`).

- [ ] **Step 4: Wire the routes into `handler.go`**

In `internal/handlers/super/handler.go`, add after `allergenH := NewAllergensHandler(q)`:

```go
	formFieldConfigH := NewFormFieldConfigHandler(q)
```

And add after the `r.Delete("/menu/allergens/{id}", allergenH.Delete)` line:

```go
	r.Get("/form-config/{formKey}", formFieldConfigH.Get)
	r.Put("/form-config/{formKey}", formFieldConfigH.Update)
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
go test ./internal/handlers/super/... -run TestFormFieldConfig -v
```

Expected: PASS for all three tests.

- [ ] **Step 6: Run the full backend test suite to check for regressions**

```bash
go test ./...
```

Expected: PASS (no existing test broken).

- [ ] **Step 7: Commit**

```bash
git add internal/handlers/super/formfieldconfig.go internal/handlers/super/formfieldconfig_test.go internal/handlers/super/handler.go
git commit -m "Add GET/PUT /super/form-config/:formKey for super-admin"
```

---

### Task 5: restaurant-admin — `useFormFieldConfig` hook + `useLookupOptions` hook

**Files:**
- Modify: `restaurant-admin/src/apiRoutes.ts`
- Modify: `restaurant-admin/src/hooks/useFetchData.ts`

**Interfaces:**
- Consumes: backend route `GET /admin/form-config/dish_item` (Task 3).
- Produces:
  - `apiRoutes.formConfig` (string, `"admin/form-config"`)
  - `useFormFieldConfig(formKey: string)` → `UseQueryResult<{ fields: FieldConfig[] }>`
  - `useLookupOptions(endpoint: string)` → `UseQueryResult<{ id: string; name: string }[]>`
  - `type FieldConfig` exported from `useFetchData.ts` — Task 7/9 import this type.

- [ ] **Step 1: Add the route constant**

In `src/apiRoutes.ts`, add this line inside the exported object (alongside the other `admin/...` entries, e.g. right after `addOns: (id?: string) => ...`):

```ts
  formConfig: (formKey: string) => `admin/form-config/${formKey}`,
```

- [ ] **Step 2: Add the hooks**

In `src/hooks/useFetchData.ts`, add near the bottom of the file (after `useAddons`):

```ts
export interface OptionsSource {
  type: "lookup" | "freetext";
  endpoint?: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  visible: boolean;
  required: boolean;
  sortOrder: number;
  optionsSource: OptionsSource;
}

export const useFormFieldConfig = (formKey: string) => {
  const getConfig = async () => {
    const res = await axiosInstance.get(apiRoutes.formConfig(formKey));
    return res.data as { fields: FieldConfig[] };
  };
  return useQuery({
    queryKey: ["form_field_config", formKey],
    queryFn: getConfig,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLookupOptions = (endpoint?: string) => {
  const getOptions = async () => {
    const res = await axiosInstance.get(endpoint as string);
    return (res.data?.data ?? res.data ?? []) as { id: string; name: string }[];
  };
  return useQuery({
    queryKey: ["lookup", endpoint],
    queryFn: getOptions,
    enabled: !!endpoint,
    staleTime: 5 * 60 * 1000,
  });
};
```

`apiRoutes.formConfig` returns a relative path (`admin/form-config/dish_item`), but the existing lookup endpoints in `optionsSource.endpoint` (e.g. `/admin/classifications/allergens`) are written with a leading slash to match how `apiRoutes.allegens`/`apiRoutes.diets`/`apiRoutes.addOns()` are already defined elsewhere in this file — `axiosInstance` is configured with a `baseURL`, so both forms resolve correctly; this is consistent with the existing mixed usage already in `apiRoutes.ts`.

- [ ] **Step 3: Manually verify**

Start the dev server and confirm the new hook fetches successfully:

```bash
npm run dev
```

In the browser devtools console on any authenticated `/admin/*` page, run:

```js
fetch('/api/admin/form-config/dish_item', { credentials: 'include' }).then(r => r.json()).then(console.log)
```

(Adjust the path prefix to match whatever proxy/base URL `axiosInstance` uses in dev — check `src/lib/utils.ts` for the configured `baseURL` if this 404s.) Expected: a JSON object with a `fields` array of length 4.

- [ ] **Step 4: Commit**

```bash
git add src/apiRoutes.ts src/hooks/useFetchData.ts
git commit -m "Add useFormFieldConfig and useLookupOptions hooks"
```

---

### Task 6: `CheckboxGrid` component (extracted, generic)

**Files:**
- Create: `restaurant-admin/src/pages/admin/menus/items/add/components/CheckboxGrid.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CheckboxGrid` component — Task 9 (`MetaPickerField`) renders this for `optionsSource.type === 'lookup'`.

- [ ] **Step 1: Create the component**

This is extracted directly from the existing `allergens.tsx`/`diets.tsx`/`addons.tsx` checkbox-grid markup (the grid in each of those files is identical apart from the data source), parameterized by props. The "add new option" modal that `diets.tsx`/`addons.tsx` have (but `allergens.tsx` doesn't) stays **outside** this component — `CheckboxGrid` only renders selection, not creation, since allergens has no creation flow and folding an optional modal into this component would require passing through label/placeholder/mutation-key props that only two of the three lookup fields need. `MetaPickerField` (Task 9) composes `CheckboxGrid` with a separate, per-key "add new" control where applicable.

Create `src/pages/admin/menus/items/add/components/CheckboxGrid.tsx`:

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/input";

interface Option {
  id: string;
  name: string;
}

interface CheckboxGridProps {
  label: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  headerAction?: React.ReactNode;
}

export function CheckboxGrid({
  label,
  options,
  value,
  onChange,
  headerAction,
}: CheckboxGridProps) {
  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {headerAction}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {options.map((item) => (
          <div key={item.id} className="flex items-center space-x-2 capitalize">
            <Checkbox
              id={item.id}
              name={item.name}
              checked={value.includes(item.id)}
              onCheckedChange={() => toggle(item.id)}
            />
            <Label htmlFor={item.id} className="text-sm font-normal capitalize">
              {item.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

This component has no behavior yet to exercise on its own — it's verified end-to-end once Task 9 wires it up. No action needed here beyond confirming it compiles:

```bash
npx tsc --noEmit
```

Expected: no errors referencing `CheckboxGrid.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/menus/items/add/components/CheckboxGrid.tsx
git commit -m "Extract generic CheckboxGrid component"
```

---

### Task 7: `TagInput` component (extracted from the inline ingredients builder)

**Files:**
- Create: `restaurant-admin/src/pages/admin/menus/items/add/components/TagInput.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TagInput` component, props `{ label: string; value: string[]; onChange: (v: string[]) => void }` — Task 9 renders this for `optionsSource.type === 'freetext'`.

- [ ] **Step 1: Create the component**

This ports the row-builder logic currently duplicated inline in `add/index.tsx` (lines ~76-78, ~241-290, ~526-584) and `edit-dish/index.tsx` (the equivalent `ingredients`/`addIngredient`/`removeIngredient`/`updateIngredient` block) — including the comma-paste-splitting behavior, which is the reason this can't just be a plain multi-select chip input. The component manages its own row-id state internally and emits a flat `string[]` of non-empty names via `onChange`.

Create `src/pages/admin/menus/items/add/components/TagInput.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { InputComponent, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PlusCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Row {
  id: string;
  name: string;
}

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagInput({ label, value, onChange }: TagInputProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>(
    value.length > 0
      ? value.map((name, i) => ({ id: String(i), name }))
      : [{ id: "1", name: "" }],
  );

  // Keep the flat string[] in sync whenever rows change.
  useEffect(() => {
    const names = rows.map((r) => r.name).filter((n) => n.trim().length > 0);
    onChange(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { id: String(prev.length + 1), name: "" }]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const updateRow = useCallback((id: string, val: string) => {
    if (!val.includes(",")) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: val } : r)));
      return;
    }
    const parts = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: val.replace(/,/g, "").trim() } : r)),
      );
      return;
    }
    const [first, ...rest] = parts;
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const newRows: Row[] = rest.map((name, i) => ({
        id: `row-${Date.now()}-${i}`,
        name,
      }));
      return [...prev.slice(0, idx), { ...prev[idx], name: first }, ...newRows, ...prev.slice(idx + 1)];
    });
  }, []);

  return (
    <section className="w-full" aria-labelledby="taginput-heading">
      <div className="flex items-center justify-between mb-3">
        <Label id="taginput-heading" className="text-base font-semibold">
          {label}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" />
          {t("admin.menu.addDish.ingredients.btn")}
        </Button>
      </div>
      <ScrollArea className="max-h-[400px] rounded-md border border-gray-200">
        <div
          className={cn(
            rows.length === 1 ? "grid-cols-1" : rows.length === 2 ? "grid-cols-2" : "grid-cols-3",
            "grid gap-2 p-2 min-w-full",
          )}
        >
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50/50 p-1">
              <InputComponent
                id={`taginput-row-${row.id}`}
                value={row.name}
                onChange={(e) => updateRow(row.id, e.target.value)}
                placeholder={t("admin.menu.addDish.ingredients.placeholder")}
                className="border-0 bg-transparent shadow-none flex-1 min-w-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={t("admin.menu.addDish.ingredients.removeBtn")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
```

- [ ] **Step 2: Manually verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `TagInput.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/menus/items/add/components/TagInput.tsx
git commit -m "Extract generic TagInput component from inline ingredients builder"
```

---

### Task 8: `MetaPickerField` component

**Files:**
- Create: `restaurant-admin/src/pages/admin/menus/items/add/components/MetaPickerField.tsx`

**Interfaces:**
- Consumes: `FieldConfig` type and `useLookupOptions` hook (Task 5), `CheckboxGrid` (Task 6), `TagInput` (Task 7).
- Produces: `MetaPickerField` component, props `{ config: FieldConfig; value: string[]; onChange: (v: string[]) => void; createAction?: React.ReactNode }` — Task 9 renders one per visible field in the fetched config.

- [ ] **Step 1: Create the component**

```tsx
import { FieldConfig, useLookupOptions } from "@/hooks/useFetchData";
import { CheckboxGrid } from "./CheckboxGrid";
import { TagInput } from "./TagInput";

interface MetaPickerFieldProps {
  config: FieldConfig;
  value: string[];
  onChange: (value: string[]) => void;
  createAction?: React.ReactNode;
}

export function MetaPickerField({ config, value, onChange, createAction }: MetaPickerFieldProps) {
  if (!config.visible) return null;

  if (config.optionsSource.type === "freetext") {
    return <TagInput label={config.label} value={value} onChange={onChange} />;
  }

  const { data: options = [] } = useLookupOptions(config.optionsSource.endpoint);
  return (
    <CheckboxGrid
      label={config.label}
      options={options}
      value={value}
      onChange={onChange}
      headerAction={createAction}
    />
  );
}
```

`config.required` isn't enforced inside this component — both call sites (Task 9) manage form-level validation (the dish-item Zod schema) separately, the same way `allergens`/`addOns` are already `.optional()` in that schema today; wiring `required` into submit-time validation is a natural follow-up once super-admin actually starts toggling it, not needed for this component to render correctly.

- [ ] **Step 2: Manually verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `MetaPickerField.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/menus/items/add/components/MetaPickerField.tsx
git commit -m "Add MetaPickerField component"
```

---

### Task 9: Wire `MetaPickerField` into `add/index.tsx`

**Files:**
- Modify: `restaurant-admin/src/pages/admin/menus/items/add/index.tsx`

**Interfaces:**
- Consumes: `useFormFieldConfig` (Task 5), `MetaPickerField` (Task 8), existing `useDiets`/`useAddons` mutation hooks (for the per-key "add new" buttons that stay outside `MetaPickerField`, per Task 6's note).

- [ ] **Step 1: Remove the per-field imports and state that are being replaced**

In `src/pages/admin/menus/items/add/index.tsx`:

Remove these imports (lines 15-16, 36):
```tsx
import Diet from "./components/diets";
import Allergens from "./components/allergens";
```
```tsx
import Addons from "./components/addons";
```

Remove the `Ingredient` interface and the `ingredients`/`setIngredients` state (lines 40-43, 76-78), and the `addIngredient`/`removeIngredient`/`updateIngredient` callbacks (lines 241-290) — this logic now lives in `TagInput`.

Add these imports instead:
```tsx
import { useFormFieldConfig } from "@/hooks/useFetchData";
import { MetaPickerField } from "./components/MetaPickerField";
```

- [ ] **Step 2: Replace the ingredients state with a single object keyed by field key**

Replace the three `useState` lines for `allergenIds`/`dietIds`/`addonIds` (lines 162-164) with:

```tsx
  const [pickerValues, setPickerValues] = useState<Record<string, string[]>>({
    allergens: [],
    diets: [],
    addons: [],
    ingredients: [],
  });
  const { data: fieldConfigData } = useFormFieldConfig("dish_item");
  const sortedFields = useMemo(
    () =>
      [...(fieldConfigData?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldConfigData?.fields],
  );
```

- [ ] **Step 3: Update the submit handler**

In the `onSubmit` callback (around line 190), replace:

```tsx
        ingredients: isEmpty(ingredients[0].name)
          ? []
          : ingredients.map((ingredient) => ingredient.name),
        tags: [...dietIds],
        allergens: allergenIds,
        addOns: addonIds,
```

with:

```tsx
        ingredients: pickerValues.ingredients,
        tags: [...pickerValues.diets],
        allergens: pickerValues.allergens,
        addOns: pickerValues.addons,
```

The `isEmpty` import (from `lodash`) and the `Ingredient` usage are no longer needed for this — check whether `isEmpty` is used elsewhere in the file before removing the import (run `grep -n "isEmpty" src/pages/admin/menus/items/add/index.tsx`); if this was its only use, remove the import.

- [ ] **Step 4: Replace the ingredients JSX section and the three picker components**

Remove the entire `<section ... aria-labelledby="ingredients-heading">...</section>` block (lines ~526-584) and the three lines:

```tsx
          <div className="mt-8">
            <Diet setData={setDietIds} data={dietIds} />
          </div>
          <div className="mt-8">
            <Allergens setData={setAllergenIds} data={allergenIds} />
          </div>
          <div className="mt-8">
            <Addons setData={setAddonIds} data={addonIds} />
          </div>
```

Replace all four with one loop, placed in the same position (right before the `<VariantsManager .../>` block):

```tsx
          {sortedFields.map((fieldConfig) => (
            <div className="mt-8" key={fieldConfig.key}>
              <MetaPickerField
                config={fieldConfig}
                value={pickerValues[fieldConfig.key] ?? []}
                onChange={(v) =>
                  setPickerValues((prev) => ({ ...prev, [fieldConfig.key]: v }))
                }
              />
            </div>
          ))}
```

This drops the "add new diet"/"add new addon" inline-creation buttons that `diets.tsx`/`addons.tsx` had — per Task 6's scoping note, those are a separate concern from field-ordering/visibility metadata. If you want to keep that capability immediately rather than as a fast follow-up, flag it now rather than silently losing it; this plan treats it as out of scope per the approved spec ("core fields stay hardcoded... only the picker fields are metadata-driven" referred to the four picker fields' *selection* UI, not their creation UI, which the spec didn't address).

- [ ] **Step 5: Manually verify in the browser**

```bash
npm run dev
```

Navigate to the dish-add form. Confirm:
- Allergens, diets, addons, ingredients all render in their default order (allergens, diets, addons, ingredients).
- Checking/unchecking allergens/diets/addons options and adding/removing ingredient rows works as before.
- Submitting the form with at least one allergen, one diet, one addon, and one ingredient succeeds (check the network tab — the POST body should contain `allergens`, `tags`, `addOns`, `ingredients` arrays matching your selections).

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/menus/items/add/index.tsx
git commit -m "Wire MetaPickerField into dish add form"
```

---

### Task 10: Wire `MetaPickerField` into `edit-dish/index.tsx`

**Files:**
- Modify: `restaurant-admin/src/pages/admin/menus/items/edit-dish/index.tsx`

**Interfaces:**
- Consumes: same as Task 9.

- [ ] **Step 1: Apply the same replacement as Task 9**

`edit-dish/index.tsx` has the identical structure (imports `Diet`/`Allergens`/`Addons` from `../add/components/...`, plus its own duplicate `ingredients`/`addIngredient`/`removeIngredient`/`updateIngredient` block at lines ~79, ~308-353). Apply the same five edits from Task 9 Steps 1-4 to this file:

1. Remove the `Diet`/`Allergens`/`Addons` imports (lines 25-26, 34); add `useFormFieldConfig` and `MetaPickerField` imports.
2. Remove the `ingredients` state/`Ingredient` interface and the `addIngredient`/`removeIngredient`/`updateIngredient` callbacks.
3. Replace `allergenIds`/`addonIds`/`tagIds` state (line 182-183, plus wherever `tagIds` is declared) with the same `pickerValues` object and `useFormFieldConfig`/`sortedFields` as Task 9 Step 2. Note this file uses `tagIds` (not `dietIds`) for the diet selection — map it to `pickerValues.diets` for consistency with the `MetaPickerField`'s `diets` key, then use `pickerValues.diets` wherever `tagIds` was previously read for the submit payload.
4. Update the submit/pre-fill logic: this file's initial-data effect (around line 369-373, `setAllergenIds(...)`/`setAddonIds(...)`) should be updated to set `pickerValues` instead — e.g. `setPickerValues((prev) => ({ ...prev, allergens: existingAllergenIds, addons: existingAddonIds, diets: existingTagIds, ingredients: existingIngredientNames }))`.
5. Replace the JSX block (`<Diet .../>`, `<Allergens .../>`, `<Addons .../>`, and the ingredients section around lines 625-663, 745-751) with the same `sortedFields.map(...)` loop from Task 9 Step 4.

- [ ] **Step 2: Manually verify in the browser**

```bash
npm run dev
```

Open an existing dish for editing. Confirm:
- All four picker fields pre-fill with the dish's existing allergens/diets/addons/ingredients.
- Editing and saving updates the dish correctly (check the network tab on the PUT request).

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/menus/items/edit-dish/index.tsx
git commit -m "Wire MetaPickerField into dish edit form"
```

---

### Task 11: super-admin — form-fields management page

**Files:**
- Modify: `super-admin/src/apiRoutes.ts`
- Create: `super-admin/src/pages/admin/FormFields/index.tsx`
- Modify: `super-admin/src/routes.tsx`
- Modify: `super-admin/src/components/AdminNavbar.tsx`

**Interfaces:**
- Consumes: backend routes `GET`/`PUT /super/form-config/dish_item` (Task 4).
- Produces: a `/admin/form-fields` page reachable from the nav bar.

- [ ] **Step 1: Add the route constants**

In `super-admin/src/apiRoutes.ts`, add:

```ts
  formConfig: (formKey: string) => `super/form-config/${formKey}`,
```

- [ ] **Step 2: Create the page**

Create `super-admin/src/pages/admin/FormFields/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp } from "lucide-react";

interface OptionsSource {
  type: "lookup" | "freetext";
  endpoint?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  visible: boolean;
  required: boolean;
  sortOrder: number;
  optionsSource: OptionsSource;
}

const FORM_KEY = "dish_item";

function FormFields() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["super_form_field_config", FORM_KEY],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.formConfig(FORM_KEY));
      return res.data as { fields: FieldConfig[] };
    },
  });

  const [fields, setFields] = useState<FieldConfig[]>([]);

  useEffect(() => {
    if (data?.fields) {
      setFields([...data.fields].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [data?.fields]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async (reorderedFields: FieldConfig[]) => {
      const payload = {
        fields: reorderedFields.map((f, i) => ({ ...f, sortOrder: i })),
      };
      const res = await axiosInstance.put(apiRoutes.formConfig(FORM_KEY), payload);
      return res.data;
    },
    onSuccess: (resData) => {
      if (resData.success) {
        toast.success(resData.message ?? "Saved");
        queryClient.invalidateQueries({ queryKey: ["super_form_field_config", FORM_KEY] });
      } else {
        toast.error(resData.message ?? "Failed to save");
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data?.message ?? "Failed to save");
    },
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setFields((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const updateField = (index: number, patch: Partial<FieldConfig>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-4">Dish Form Fields</h1>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.key}
            className="flex items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="disabled:opacity-30"
                aria-label={`Move ${field.key} up`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === fields.length - 1}
                className="disabled:opacity-30"
                aria-label={`Move ${field.key} down`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <Input
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                className="mb-1"
              />
              <span className="text-xs text-gray-400">{field.key}</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              Visible
              <Switch
                checked={field.visible}
                onCheckedChange={(checked) => updateField(index, { visible: checked })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Required
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => updateField(index, { required: checked })}
              />
            </label>
          </div>
        ))}
      </div>
      <Button className="mt-6" loading={isPending} onClick={() => save(fields)}>
        Save
      </Button>
    </div>
  );
}

export default FormFields;
```

- [ ] **Step 3: Add the route**

In `super-admin/src/routes.tsx`, add the import:

```tsx
import FormFields from "./pages/admin/FormFields";
```

And add this entry inside the `admin` route's `children` array (alongside `dashboard`/`restaurants`/`subscriptions`):

```tsx
      {
        path: "form-fields",
        element: <FormFields />,
      },
```

- [ ] **Step 4: Add the nav link**

In `super-admin/src/components/AdminNavbar.tsx`, add to `NAV_LINKS`:

```ts
  { to: '/admin/form-fields', label: 'Form Fields' },
```

- [ ] **Step 5: Manually verify in the browser**

```bash
npm run dev
```

Log in as super-admin, navigate to "Form Fields". Confirm:
- All four fields render with current labels/visible/required state.
- Moving "Diets" up swaps it with "Allergens" in the list.
- Toggling "Visible" off for "Ingredients" and clicking Save succeeds (check network tab — PUT body's `ingredients` entry should have `"visible": false` and `sortOrder` matching its final list position).
- Reloading the page reflects the saved order/visibility.
- Switch back to restaurant-admin's dish-add form and confirm Ingredients no longer renders, and Diets now appears before Allergens.

- [ ] **Step 6: Commit**

```bash
git add src/apiRoutes.ts src/pages/admin/FormFields/ src/routes.tsx src/components/AdminNavbar.tsx
git commit -m "Add super-admin form-fields management page"
```

---

## Spec Coverage Check

- Storage & data model (JSONB doc, seeded 4 fields) — Task 1.
- Backend API, key/sortOrder validation — Tasks 2, 3, 4.
- restaurant-admin generic renderer, default-on-fetch-failure — Tasks 5-10. (Fetch-failure fallback: `useFormFieldConfig` returning `undefined` on error means `fieldConfigData?.fields ?? []` yields an empty array, not the four-field default named in the spec — see Task 9 Step 2's `sortedFields` derivation. **Known deviation from spec**: implement the documented hardcoded fallback by changing `sortedFields` in Task 9 to fall back to a local `DEFAULT_FIELDS` constant when `fieldConfigData` is undefined and the query has errored, rather than an empty array. Add this fallback during Task 9 implementation, not as a separate task.)
- super-admin management UI (reorder/visible/required/relabel, sortOrder recomputed at save) — Task 11.
- Testing — backend: Tasks 2, 3, 4 (real-DB tests, matching existing `setup_test.go` convention). Frontend: manual verification only, since neither frontend app has a test runner configured (see Global Constraints).

## Future Work (not in this plan, per spec)

- Migrate the old `menu/` (singular) drink forms onto this system.
- Per-restaurant field overrides.
- Support for adding genuinely new field keys/types without an engineer change.
- Re-adding inline "create new diet/addon" capability alongside the metadata-driven picker (dropped in Task 9 — see that task's note).
