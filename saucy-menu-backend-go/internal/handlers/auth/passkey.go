package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

// passkeyCtxKey scopes the authenticated user stored by requireAdmin middleware.
type passkeyCtxKey struct{}

// ─── WebAuthn instance ────────────────────────────────────────────────────────

func (h *Handler) newWebAuthn() (*webauthn.WebAuthn, error) {
	return webauthn.New(&webauthn.Config{
		RPDisplayName: "Saucy Menu",
		RPID:          h.cfg.WebAuthnRPID,
		RPOrigins:     []string{h.cfg.WebAuthnOrigin},
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			AuthenticatorAttachment: protocol.Platform,
			ResidentKey:             protocol.ResidentKeyRequirementRequired,
			UserVerification:        protocol.VerificationRequired,
		},
	})
}

// ─── WebAuthn User adapter ────────────────────────────────────────────────────

type passkeyUser struct {
	id          []byte
	name        string
	displayName string
	credentials []webauthn.Credential
}

func (u *passkeyUser) WebAuthnID() []byte                         { return u.id }
func (u *passkeyUser) WebAuthnName() string                       { return u.name }
func (u *passkeyUser) WebAuthnDisplayName() string                { return u.displayName }
func (u *passkeyUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }
func (u *passkeyUser) WebAuthnIcon() string                       { return "" }

// buildPasskeyUser converts a sqlc user row + their stored passkey rows into a passkeyUser.
func buildPasskeyUser(user sqlc.FindUserByIDRow, rows []sqlc.PasskeyCredential) *passkeyUser {
	creds := make([]webauthn.Credential, 0, len(rows))
	for _, row := range rows {
		rawID, err := base64.RawURLEncoding.DecodeString(row.CredentialID)
		if err != nil {
			continue
		}
		creds = append(creds, webauthn.Credential{
			ID:        rawID,
			PublicKey: row.PublicKey,
			Authenticator: webauthn.Authenticator{
				SignCount: uint32(row.SignCount),
			},
		})
	}
	return &passkeyUser{
		id:          []byte(pgUUIDToString(user.ID)),
		name:        user.Email,
		displayName: user.Name,
		credentials: creds,
	}
}

// ─── requireAdmin middleware ───────────────────────────────────────────────────

// requireAdmin validates the caller's admin session (role == "user" in DB) and
// stores the user row in context under passkeyCtxKey{}.
func (h *Handler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := cookieToken(r, h.cfg.BetterAuthSecret)
		if token == "" {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		session, err := h.q.GetSessionByToken(r.Context(), token)
		if err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		user, err := h.q.FindUserByID(r.Context(), session.UserID)
		if err != nil {
			httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		if user.Role == nil || *user.Role != "user" {
			httpx.WriteError(w, http.StatusForbidden, "Forbidden")
			return
		}
		ctx := context.WithValue(r.Context(), passkeyCtxKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ─── Challenge storage (reuse verification table, TTL 5 min) ─────────────────

func (h *Handler) storeChallenge(ctx context.Context, identifier string, sessionData *webauthn.SessionData) error {
	b, err := json.Marshal(sessionData)
	if err != nil {
		return err
	}
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
	return h.q.CreateVerification(ctx, sqlc.CreateVerificationParams{
		Identifier: identifier,
		Value:      string(b),
		ExpiresAt:  pgtype.Timestamp{Time: time.Now().Add(5 * time.Minute), Valid: true},
	})
}

func (h *Handler) loadChallenge(ctx context.Context, identifier string) (*webauthn.SessionData, error) {
	row, err := h.q.GetVerificationByIdentifier(ctx, identifier)
	if err != nil {
		return nil, err
	}
	var sd webauthn.SessionData
	if err := json.Unmarshal([]byte(row.Value), &sd); err != nil {
		return nil, err
	}
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
	return &sd, nil
}

// ─── Registration endpoints ───────────────────────────────────────────────────

// POST /auth/passkey/register/begin  (requires admin session)
func (h *Handler) passkeyRegisterBegin(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)

	wa, err := h.newWebAuthn()
	if err != nil {
		log.Error().Err(err).Msg("webauthn init")
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	rows, _ := h.q.ListPasskeyCredentials(r.Context(), user.ID)
	pu := buildPasskeyUser(user, rows)

	options, sessionData, err := wa.BeginRegistration(pu)
	if err != nil {
		log.Error().Err(err).Msg("begin registration")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to begin registration")
		return
	}

	identifier := "passkey:register:" + pgUUIDToString(user.ID)
	if err := h.storeChallenge(r.Context(), identifier, sessionData); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to store challenge")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, options)
}

// POST /auth/passkey/register/finish  (requires admin session)
// Body: raw RegistrationResponseJSON from @simplewebauthn/browser
func (h *Handler) passkeyRegisterFinish(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)

	wa, err := h.newWebAuthn()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	identifier := "passkey:register:" + pgUUIDToString(user.ID)
	sessionData, err := h.loadChallenge(r.Context(), identifier)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "No pending registration or challenge expired")
		return
	}

	rows, _ := h.q.ListPasskeyCredentials(r.Context(), user.ID)
	pu := buildPasskeyUser(user, rows)

	credential, err := wa.FinishRegistration(pu, *sessionData, r)
	if err != nil {
		log.Error().Err(err).Msg("finish registration")
		httpx.WriteError(w, http.StatusBadRequest, "Registration verification failed")
		return
	}

	credID := base64.RawURLEncoding.EncodeToString(credential.ID)
	aaguid := base64.RawURLEncoding.EncodeToString(credential.Authenticator.AAGUID)
	deviceName := deviceNameFromUA(r.UserAgent())

	_, err = h.q.InsertPasskeyCredential(r.Context(), sqlc.InsertPasskeyCredentialParams{
		UserID:       user.ID,
		CredentialID: credID,
		PublicKey:    credential.PublicKey,
		SignCount:    int64(credential.Authenticator.SignCount),
		Aaguid:       aaguid,
		DeviceName:   deviceName,
	})
	if err != nil {
		log.Error().Err(err).Msg("insert passkey credential")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to save credential")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"registered": true, "deviceName": deviceName})
}

// ─── Login endpoints ──────────────────────────────────────────────────────────

// POST /auth/passkey/login/begin  (public)
func (h *Handler) passkeyLoginBegin(w http.ResponseWriter, r *http.Request) {
	wa, err := h.newWebAuthn()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	options, sessionData, err := wa.BeginDiscoverableLogin()
	if err != nil {
		log.Error().Err(err).Msg("begin discoverable login")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to begin login")
		return
	}

	rawID := make([]byte, 16)
	if _, err := rand.Read(rawID); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to generate challenge ID")
		return
	}
	challengeID := base64.RawURLEncoding.EncodeToString(rawID)
	identifier := "passkey:login:" + challengeID

	if err := h.storeChallenge(r.Context(), identifier, sessionData); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to store challenge")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"challengeId": challengeID,
		"options":     options,
	})
}

// POST /auth/passkey/login/finish  (public)
// Body: { "challengeId": "...", "credential": {...AuthenticationResponseJSON...} }
func (h *Handler) passkeyLoginFinish(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChallengeID string          `json:"challengeId"`
		Credential  json.RawMessage `json:"credential"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identifier := "passkey:login:" + req.ChallengeID
	sessionData, err := h.loadChallenge(r.Context(), identifier)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Challenge not found or expired")
		return
	}

	wa, err := h.newWebAuthn()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "WebAuthn init failed")
		return
	}

	parsedResponse, err := protocol.ParseCredentialRequestResponseBody(bytes.NewReader(req.Credential))
	if err != nil {
		log.Error().Err(err).Msg("parse credential request")
		httpx.WriteError(w, http.StatusBadRequest, "Failed to parse credential")
		return
	}

	credential, err := wa.ValidateDiscoverableLogin(
		func(rawID, _ []byte) (webauthn.User, error) {
			credIDStr := base64.RawURLEncoding.EncodeToString(rawID)
			row, err := h.q.GetPasskeyCredentialByCredID(r.Context(), credIDStr)
			if err != nil {
				return nil, err
			}
			dbUser, err := h.q.FindUserByID(r.Context(), row.UserID)
			if err != nil {
				return nil, err
			}
			allRows, _ := h.q.ListPasskeyCredentials(r.Context(), dbUser.ID)
			return buildPasskeyUser(dbUser, allRows), nil
		},
		*sessionData,
		parsedResponse,
	)
	if err != nil {
		log.Error().Err(err).Msg("validate discoverable login")
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication failed")
		return
	}

	credIDStr := base64.RawURLEncoding.EncodeToString(credential.ID)
	_ = h.q.UpdatePasskeySignCount(r.Context(), sqlc.UpdatePasskeySignCountParams{
		SignCount:    int64(credential.Authenticator.SignCount),
		CredentialID: credIDStr,
	})

	row, err := h.q.GetPasskeyCredentialByCredID(r.Context(), credIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to resolve user")
		return
	}
	dbUser, err := h.q.FindUserByID(r.Context(), row.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "User not found")
		return
	}

	session, err := h.createSession(w, r, dbUser.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"session": sessionResp{
			ID:        session.ID.String(),
			UserID:    session.UserID.String(),
			Token:     session.Token,
			ExpiresAt: pgTimestampToString(session.ExpiresAt),
			CreatedAt: pgTimestampToString(session.CreatedAt),
			UpdatedAt: pgTimestampToString(session.UpdatedAt),
		},
		"user": userResp{
			ID:            pgUUIDToString(dbUser.ID),
			Email:         dbUser.Email,
			Name:          dbUser.Name,
			EmailVerified: dbUser.EmailVerified,
			CreatedAt:     dbUser.CreatedAt.Time.UTC().Format(time.RFC3339),
			UpdatedAt:     dbUser.UpdatedAt.Time.UTC().Format(time.RFC3339),
			Role:          dbUser.Role,
			Banned:        dbUser.Banned,
		},
	})
}

// ─── Status + delete endpoints ────────────────────────────────────────────────

// GET /auth/passkey/status  (requires admin session)
func (h *Handler) passkeyStatus(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)
	rows, err := h.q.ListPasskeyCredentials(r.Context(), user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to list credentials")
		return
	}
	type credInfo struct {
		ID         string `json:"id"`
		DeviceName string `json:"deviceName"`
		CreatedAt  string `json:"createdAt"`
	}
	infos := make([]credInfo, 0, len(rows))
	for _, row := range rows {
		infos = append(infos, credInfo{
			ID:         row.CredentialID,
			DeviceName: row.DeviceName,
			CreatedAt:  row.CreatedAt.Time.UTC().Format(time.RFC3339),
		})
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{
		"registered":  len(rows) > 0,
		"credentials": infos,
	})
}

// DELETE /auth/passkey/{credentialId}  (requires admin session)
func (h *Handler) passkeyDelete(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(passkeyCtxKey{}).(sqlc.FindUserByIDRow)
	credID := chi.URLParam(r, "credentialId")
	if credID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Missing credentialId")
		return
	}
	if err := h.q.DeletePasskeyCredential(r.Context(), sqlc.DeletePasskeyCredentialParams{
		CredentialID: credID,
		UserID:       user.ID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to delete credential")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func deviceNameFromUA(ua string) string {
	switch {
	case strings.Contains(ua, "iPhone") || strings.Contains(ua, "iPad"):
		return "iPhone / iPad"
	case strings.Contains(ua, "Android"):
		return "Android device"
	case strings.Contains(ua, "Macintosh") || strings.Contains(ua, "Mac OS"):
		return "Mac"
	case strings.Contains(ua, "Windows"):
		return "Windows device"
	default:
		return "Unknown device"
	}
}
