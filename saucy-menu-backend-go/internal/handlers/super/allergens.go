package super

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type AllergensHandler struct{ q *sqlc.Queries }

func NewAllergensHandler(q *sqlc.Queries) *AllergensHandler { return &AllergensHandler{q: q} }

// GET /super/menu/allergens/
func (h *AllergensHandler) List(w http.ResponseWriter, r *http.Request) {
	allergens, err := h.q.ListAllergens(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "failed to fetch allergens")
		return
	}
	result := make([]map[string]any, 0, len(allergens))
	for _, a := range allergens {
		result = append(result, map[string]any{
			"id":   pgUUIDToString(a.ID),
			"name": a.Name,
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, result)
}

// POST /super/menu/allergens/
func (h *AllergensHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct{ Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if _, err := h.q.CreateAllergen(r.Context(), body.Name); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create allergen")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Allergen created successfully"})
}

// PUT /super/menu/allergens/:id
func (h *AllergensHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct{ Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.q.UpdateAllergen(r.Context(), sqlc.UpdateAllergenParams{Name: body.Name, ID: id}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update allergen")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Allergen updated successfully"})
}

// DELETE /super/menu/allergens/:id
func (h *AllergensHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.q.DeleteAllergen(r.Context(), id); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete allergen")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Allergen deleted successfully"})
}
