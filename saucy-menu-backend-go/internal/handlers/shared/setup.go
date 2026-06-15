package shared

import (
	"net/http"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type SetupHandler struct {
	q *sqlc.Queries
}

func NewSetupHandler(q *sqlc.Queries) *SetupHandler {
	return &SetupHandler{q: q}
}

func (h *SetupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	langs, err := h.q.ListActiveLanguages(ctx)
	if err != nil {
		status, msg := httpx.StatusAndMessage(err)
		httpx.WriteError(w, status, msg)
		return
	}

	currencies, err := h.q.ListCurrencies(ctx)
	if err != nil {
		status, msg := httpx.StatusAndMessage(err)
		httpx.WriteError(w, status, msg)
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"languages":  langs,
		"currencies": currencies,
	})
}
