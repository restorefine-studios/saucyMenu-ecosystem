package super

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

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
		Column2:   configJSON,
		UpdatedBy: updatedBy,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to save form config")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Form config updated successfully"})
}
