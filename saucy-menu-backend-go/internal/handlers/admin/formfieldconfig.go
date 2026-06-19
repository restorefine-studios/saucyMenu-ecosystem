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
