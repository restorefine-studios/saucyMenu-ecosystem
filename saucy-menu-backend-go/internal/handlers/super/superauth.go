package super

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/passwordhash"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type AuthHandler struct {
	q                  *sqlc.Queries
	internalAdminToken string
}

func NewAuthHandler(q *sqlc.Queries, internalAdminToken string) *AuthHandler {
	return &AuthHandler{q: q, internalAdminToken: internalAdminToken}
}

// POST /super/auth/signup — protected by x-internal-admin-token header (not a session cookie)
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("x-internal-admin-token") != h.internalAdminToken || h.internalAdminToken == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Email == "" || body.Password == "" || body.Name == "" {
		httpx.WriteError(w, http.StatusBadRequest, "email, password and name are required")
		return
	}

	ctx := r.Context()
	userID, err := h.q.CreateSuperAdminUser(ctx, sqlc.CreateSuperAdminUserParams{
		Email: strings.ToLower(body.Email),
		Name:  body.Name,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create admin")
		return
	}

	hashed, err := passwordhash.Hash(body.Password)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	if err := h.q.CreateCredentialAccount(ctx, sqlc.CreateCredentialAccountParams{
		AccountID: pgUUIDToString(userID),
		UserID:    userID,
		Password:  &hashed,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"message": "Admin Created Successfully"})
}
