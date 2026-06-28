package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/betterauth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/passwordhash"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/plunk"
)

type Handler struct {
	q      *sqlc.Queries
	cfg    *config.Config
	plunk  *plunk.Client
}

func New(q *sqlc.Queries, cfg *config.Config) *Handler {
	return &Handler{
		q:     q,
		cfg:   cfg,
		plunk: plunk.New(cfg.PlunkSecretKey),
	}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Post("/sign-in/email", h.signIn)
	r.Post("/sign-up/email", h.signUp)
	r.Post("/sign-out", h.signOut)
	r.Get("/get-session", h.getSession)
	r.Post("/email-otp/send-verification-otp", h.sendVerificationOTP)
	r.Post("/email-otp/request-password-reset", h.requestPasswordReset)
	r.Post("/email-otp/reset-password", h.resetPassword)
	r.Post("/email-otp/verify-email", h.verifyEmail)
	// Admin plugin — requires super-admin session (role == "admin")
	r.Group(func(r chi.Router) {
		r.Use(h.requireSuperAdmin)
		r.Post("/admin/ban-user", h.banUser)
		r.Post("/admin/unban-user", h.unbanUser)
	})
	// Passkey — protected endpoints require a restaurant-admin session
	r.Group(func(r chi.Router) {
		r.Use(h.requireAdmin)
		r.Post("/passkey/register/begin", h.passkeyRegisterBegin)
		r.Post("/passkey/register/finish", h.passkeyRegisterFinish)
		r.Get("/passkey/status", h.passkeyStatus)
		r.Delete("/passkey/{credentialId}", h.passkeyDelete)
	})
	// Passkey login is public (user is not yet authenticated)
	r.Post("/passkey/login/begin", h.passkeyLoginBegin)
	r.Post("/passkey/login/finish", h.passkeyLoginFinish)
	return r
}

// ─── response types (camelCase to match better-auth client expectations) ─────

type sessionResp struct {
	ID             string  `json:"id"`
	UserID         string  `json:"userId"`
	Token          string  `json:"token"`
	ExpiresAt      string  `json:"expiresAt"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
	IPAddress      *string `json:"ipAddress"`
	UserAgent      *string `json:"userAgent"`
	ImpersonatedBy *string `json:"impersonatedBy"`
}

type userResp struct {
	ID            string       `json:"id"`
	Email         string       `json:"email"`
	Name          string       `json:"name"`
	Image         *string      `json:"image"`
	EmailVerified bool         `json:"emailVerified"`
	CreatedAt     string       `json:"createdAt"`
	UpdatedAt     string       `json:"updatedAt"`
	Role          *string      `json:"role"`
	Banned        *bool        `json:"banned"`
	BanReason     *string      `json:"banReason"`
	BanExpires    *string      `json:"banExpires"`
	RestaurantID  *string      `json:"restaurantId"`
	LanguageID    *string      `json:"languageId"`
	SetupComplete *bool        `json:"setupComplete"`
	Currency      *currencyResp `json:"currency,omitempty"`
}

type currencyResp struct {
	ID     string `json:"id"`
	Code   string `json:"code"`
	Name   string `json:"name"`
	Symbol string `json:"symbol"`
}

// ─── sign-in ──────────────────────────────────────────────────────────────────

func (h *Handler) signIn(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	if body.Email == "" || body.Password == "" {
		httpx.WriteError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	ctx := r.Context()

	user, err := h.q.FindUserByEmail(ctx, body.Email)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	acct, err := h.q.FindCredentialAccount(ctx, user.ID)
	if err != nil || acct.Password == nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	ok, err := passwordhash.Verify(body.Password, *acct.Password)
	if err != nil || !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Database hook: reject if restaurant is suspended.
	if user.RestaurantID.Valid {
		suspended, err := h.q.IsRestaurantSuspended(ctx, user.ID)
		if err == nil && suspended {
			httpx.WriteError(w, http.StatusForbidden, "Your restaurant has been suspended.")
			return
		}
	}

	session, err := h.createSession(w, r, user.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"redirect": false,
		"token":    session.Token,
		"url":      nil,
		"user":     toUserRespFromEmailRow(user),
	})
}

// ─── sign-up ──────────────────────────────────────────────────────────────────

func (h *Handler) signUp(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	if body.Email == "" || body.Password == "" || body.Name == "" {
		httpx.WriteError(w, http.StatusBadRequest, "name, email and password are required")
		return
	}

	ctx := r.Context()

	// Check duplicate
	existing, err := h.q.FindUserByEmail(ctx, body.Email)
	if err == nil && existing.ID.Valid {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "User already exists with that email")
		return
	}

	hashed, err := passwordhash.Hash(body.Password)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	newUser, err := h.q.CreateUser(ctx, sqlc.CreateUserParams{
		Email: body.Email,
		Name:  body.Name,
		Role:  func() *string { s := "user"; return &s }(),
	})
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "Failed to create user")
		return
	}

	// account_id = user id string (better-auth credential provider convention)
	accountID := pgUUIDToString(newUser.ID)
	if err := h.q.CreateCredentialAccount(ctx, sqlc.CreateCredentialAccountParams{
		AccountID: accountID,
		UserID:    newUser.ID,
		Password:  &hashed,
	}); err != nil {
		log.Error().Err(err).Msg("failed to create credential account")
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	session, err := h.createSession(w, r, newUser.ID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"token": session.Token,
		"user":  toUserRespFromCreate(newUser),
	})
}

// ─── sign-out ─────────────────────────────────────────────────────────────────

func (h *Handler) signOut(w http.ResponseWriter, r *http.Request) {
	token := cookieToken(r, h.cfg.BetterAuthSecret)
	if token != "" {
		_ = h.q.DeleteSessionByToken(r.Context(), token)
	}
	clearSessionCookie(w, h.cfg.BetterAuthURL)
	w.WriteHeader(http.StatusOK)
}

// ─── get-session ──────────────────────────────────────────────────────────────

func (h *Handler) getSession(w http.ResponseWriter, r *http.Request) {
	token := cookieToken(r, h.cfg.BetterAuthSecret)
	if token == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(nil)
		return
	}

	ctx := r.Context()
	session, err := h.q.GetSessionByToken(ctx, token)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(nil)
		return
	}

	user, err := h.q.FindUserByID(ctx, session.UserID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(nil)
		return
	}

	ur := toUserResp(user)

	// Inject currency from restaurant (customSession plugin equivalent)
	if user.RestaurantID.Valid {
		if cur, err := h.q.GetUserCurrency(ctx, user.ID); err == nil {
			cid := pgUUIDToString(cur.ID)
			ur.Currency = &currencyResp{ID: cid, Code: cur.Code, Name: cur.Name, Symbol: cur.Symbol}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"session": toSessionResp(session),
		"user":    ur,
	})
}

// ─── email-otp: send-verification-otp ────────────────────────────────────────

func (h *Handler) sendVerificationOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Type  string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))

	otp := generateOTP()
	identifier := otpIdentifier(body.Type, body.Email)

	ctx := r.Context()
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
	expiresAt := pgtype.Timestamp{Time: time.Now().Add(5 * time.Minute), Valid: true}
	if err := h.q.CreateVerification(ctx, sqlc.CreateVerificationParams{
		Identifier: identifier,
		Value:      otp + ":0",
		ExpiresAt:  expiresAt,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create OTP")
		return
	}

	title := otpTitle(body.Type)
	go func() {
		if err := h.plunk.Send(plunk.SendParams{
			To:      body.Email,
			Subject: title,
			Body:    plunk.OTPEmailBody(body.Email, otp, title),
		}); err != nil {
			log.Error().Err(err).Str("email", body.Email).Msg("failed to send OTP email")
		}
	}()

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": true})
}

// ─── email-otp: request-password-reset ───────────────────────────────────────

func (h *Handler) requestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))

	ctx := r.Context()
	user, err := h.q.FindUserByEmail(ctx, body.Email)
	if err != nil {
		// Return success even if user not found (prevents email enumeration)
		httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	otp := generateOTP()
	identifier := otpIdentifier("forget-password", body.Email)
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
	expiresAt := pgtype.Timestamp{Time: time.Now().Add(5 * time.Minute), Valid: true}
	if err := h.q.CreateVerification(ctx, sqlc.CreateVerificationParams{
		Identifier: identifier,
		Value:      otp + ":0",
		ExpiresAt:  expiresAt,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to create OTP")
		return
	}

	go func() {
		if err := h.plunk.Send(plunk.SendParams{
			To:      body.Email,
			Subject: "Reset Password",
			Body:    plunk.OTPEmailBody(user.Name, otp, "Reset Password"),
		}); err != nil {
			log.Error().Err(err).Str("email", body.Email).Msg("failed to send password reset email")
		}
	}()

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": true})
}

// ─── email-otp: reset-password ────────────────────────────────────────────────

func (h *Handler) resetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		OTP      string `json:"otp"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))

	ctx := r.Context()
	identifier := otpIdentifier("forget-password", body.Email)
	if ok, appErr := h.checkOTP(r, identifier, body.OTP); !ok {
		ae := appErr.(*httpx.AppError)
		httpx.WriteError(w, ae.Status, ae.Message)
		return
	}

	user, err := h.q.FindUserByEmail(ctx, body.Email)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "User not found")
		return
	}

	hashed, err := passwordhash.Hash(body.Password)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	if err := h.q.UpdateAccountPassword(ctx, sqlc.UpdateAccountPasswordParams{
		Password: &hashed,
		UserID:   user.ID,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": true})
}

// ─── email-otp: verify-email ──────────────────────────────────────────────────

func (h *Handler) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))

	ctx := r.Context()
	identifier := otpIdentifier("email-verification", body.Email)
	if ok, appErr := h.checkOTP(r, identifier, body.OTP); !ok {
		ae := appErr.(*httpx.AppError)
		httpx.WriteError(w, ae.Status, ae.Message)
		return
	}

	user, err := h.q.FindUserByEmail(ctx, body.Email)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "User not found")
		return
	}

	_ = h.q.UpdateUserEmailVerified(ctx, user.ID)
	httpx.WriteSuccess(w, http.StatusOK, map[string]any{"success": true})
}

// ─── admin plugin: ban / unban ────────────────────────────────────────────────

func (h *Handler) banUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID    string  `json:"userId"`
		BanReason *string `json:"banReason"`
		BanExpiry *string `json:"banExpires"` // ISO8601
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	uid, err := parseUUID(body.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid userId")
		return
	}

	banned := true
	var banExpires pgtype.Timestamp
	if body.BanExpiry != nil {
		t, err := time.Parse(time.RFC3339, *body.BanExpiry)
		if err == nil {
			banExpires = pgtype.Timestamp{Time: t, Valid: true}
		}
	}

	if err := h.q.BanUser(r.Context(), sqlc.BanUserParams{
		Banned:     &banned,
		BanReason:  body.BanReason,
		BanExpires: banExpires,
		ID:         uid,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to ban user")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, nil)
}

func (h *Handler) unbanUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	uid, err := parseUUID(body.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid userId")
		return
	}

	banned := false
	if err := h.q.BanUser(r.Context(), sqlc.BanUserParams{
		Banned:    &banned,
		BanReason: nil,
		ID:        uid,
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to unban user")
		return
	}
	httpx.WriteSuccess(w, http.StatusOK, nil)
}

// ─── OTP verification helper ──────────────────────────────────────────────────

const maxOTPAttempts = 5

// checkOTP validates a submitted OTP against the stored verification record.
// Increments the attempt counter on each failure; deletes the record after maxOTPAttempts.
// Returns (true, nil) on success, (false, httpx.AppError) on failure.
func (h *Handler) checkOTP(r *http.Request, identifier, submitted string) (bool, error) {
	ctx := r.Context()
	v, err := h.q.GetVerificationByIdentifier(ctx, identifier)
	if err != nil {
		return false, httpx.NewAppError(http.StatusBadRequest, "Invalid or expired OTP")
	}

	parts := strings.SplitN(v.Value, ":", 2)
	storedOTP := parts[0]
	attempts := 0
	if len(parts) == 2 {
		_, _ = fmt.Sscanf(parts[1], "%d", &attempts)
	}

	if storedOTP != submitted {
		attempts++
		if attempts >= maxOTPAttempts {
			_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
			return false, httpx.NewAppError(http.StatusBadRequest, "Too many incorrect attempts. Please request a new code.")
		}
		_ = h.q.UpdateVerificationValue(ctx, sqlc.UpdateVerificationValueParams{
			Value:      fmt.Sprintf("%s:%d", storedOTP, attempts),
			Identifier: identifier,
		})
		return false, httpx.NewAppError(http.StatusBadRequest, "Invalid OTP")
	}

	// Correct — consume the record immediately to prevent reuse
	_ = h.q.DeleteVerificationByIdentifier(ctx, identifier)
	return true, nil
}

// ─── admin middleware ─────────────────────────────────────────────────────────

// requireSuperAdmin verifies the caller holds a valid better-auth session with
// role == "admin" before allowing access to admin-plugin endpoints.
func (h *Handler) requireSuperAdmin(next http.Handler) http.Handler {
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
		if user.Role == nil || *user.Role != "admin" {
			httpx.WriteError(w, http.StatusForbidden, "Forbidden: super-admin only")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func (h *Handler) createSession(w http.ResponseWriter, r *http.Request, userID pgtype.UUID) (sqlc.Session, error) {
	token, err := generateToken()
	if err != nil {
		return sqlc.Session{}, err
	}

	ipAddr := realIP(r)
	ua := r.UserAgent()
	expiresAt := pgtype.Timestamp{Time: time.Now().Add(7 * 24 * time.Hour), Valid: true}

	session, err := h.q.CreateSession(r.Context(), sqlc.CreateSessionParams{
		ExpiresAt: expiresAt,
		Token:     token,
		IpAddress: &ipAddr,
		UserAgent: &ua,
		UserID:    userID,
	})
	if err != nil {
		return sqlc.Session{}, err
	}

	setSessionCookie(w, token, h.cfg.BetterAuthSecret, h.cfg.BetterAuthURL)
	return session, nil
}

func setSessionCookie(w http.ResponseWriter, token, secret, baseURL string) {
	secure := strings.HasPrefix(baseURL, "https://")
	name := betterauth.CookieName("saucy-menu-auth", secure)
	value := betterauth.SignToken(token, secret)

	// Production (HTTPS): SameSite=None + Secure for cross-subdomain cookies.
	// Development (HTTP): SameSite=Lax — browsers reject SameSite=None without Secure.
	sameSite := "Lax"
	secureFlag := ""
	if secure {
		sameSite = "None"
		secureFlag = "; Secure"
	}
	cookie := fmt.Sprintf("%s=%s; Path=/; Max-Age=604800; HttpOnly; SameSite=%s%s",
		name, value, sameSite, secureFlag)
	w.Header().Add("Set-Cookie", cookie)
}

func clearSessionCookie(w http.ResponseWriter, baseURL string) {
	secure := strings.HasPrefix(baseURL, "https://")
	name := betterauth.CookieName("saucy-menu-auth", secure)
	sameSite := "Lax"
	secureFlag := ""
	if secure {
		sameSite = "None"
		secureFlag = "; Secure"
	}
	cookie := fmt.Sprintf("%s=; Path=/; Max-Age=0; HttpOnly; SameSite=%s%s",
		name, sameSite, secureFlag)
	w.Header().Add("Set-Cookie", cookie)
}

func cookieToken(r *http.Request, secret string) string {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return strings.TrimSpace(authHeader[7:])
	}

	names := []string{
		"saucy-menu-auth.session_token",
		"__Secure-saucy-menu-auth.session_token",
	}
	for _, name := range names {
		c, err := r.Cookie(name)
		if err != nil {
			continue
		}
		token, ok := betterauth.VerifyToken(c.Value, secret)
		if ok {
			return token
		}
	}
	return ""
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func generateOTP() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	n := (int(b[0])<<16 | int(b[1])<<8 | int(b[2])) % 1000000
	return fmt.Sprintf("%06d", n)
}

func otpIdentifier(otpType, email string) string {
	return otpType + "-otp-" + email
}

func otpTitle(otpType string) string {
	switch otpType {
	case "forget-password":
		return "Reset Password"
	case "email-verification":
		return "Email Verification"
	case "change-email":
		return "Change Email"
	default:
		return "Verification Code"
	}
}

func realIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.SplitN(ip, ",", 2)[0]
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

func pgUUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func pgTimestampToString(t pgtype.Timestamp) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(time.RFC3339)
}

func parseUUID(s string) (pgtype.UUID, error) {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID length")
	}
	b, err := hex.DecodeString(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	var uid pgtype.UUID
	copy(uid.Bytes[:], b)
	uid.Valid = true
	return uid, nil
}

func toSessionResp(s sqlc.Session) sessionResp {
	return sessionResp{
		ID:             pgUUIDToString(s.ID),
		UserID:         pgUUIDToString(s.UserID),
		Token:          s.Token,
		ExpiresAt:      pgTimestampToString(s.ExpiresAt),
		CreatedAt:      pgTimestampToString(s.CreatedAt),
		UpdatedAt:      pgTimestampToString(s.UpdatedAt),
		IPAddress:      s.IpAddress,
		UserAgent:      s.UserAgent,
		ImpersonatedBy: s.ImpersonatedBy,
	}
}

func toUserResp(u sqlc.FindUserByIDRow) userResp {
	ur := userResp{
		ID:            pgUUIDToString(u.ID),
		Email:         u.Email,
		Name:          u.Name,
		Image:         u.Image,
		EmailVerified: u.EmailVerified,
		CreatedAt:     pgTimestampToString(u.CreatedAt),
		UpdatedAt:     pgTimestampToString(u.UpdatedAt),
		Role:          u.Role,
		Banned:        u.Banned,
		BanReason:     u.BanReason,
		SetupComplete: u.SetupComplete,
	}
	if u.RestaurantID.Valid {
		s := pgUUIDToString(u.RestaurantID)
		ur.RestaurantID = &s
	}
	if u.LanguageID.Valid {
		s := pgUUIDToString(u.LanguageID)
		ur.LanguageID = &s
	}
	if u.BanExpires.Valid {
		s := pgTimestampToString(u.BanExpires)
		ur.BanExpires = &s
	}
	return ur
}

func toUserRespFromEmailRow(u sqlc.FindUserByEmailRow) userResp {
	ur := userResp{
		ID:            pgUUIDToString(u.ID),
		Email:         u.Email,
		Name:          u.Name,
		Image:         u.Image,
		EmailVerified: u.EmailVerified,
		CreatedAt:     pgTimestampToString(u.CreatedAt),
		UpdatedAt:     pgTimestampToString(u.UpdatedAt),
		Role:          u.Role,
		Banned:        u.Banned,
		BanReason:     u.BanReason,
		SetupComplete: u.SetupComplete,
	}
	if u.RestaurantID.Valid {
		s := pgUUIDToString(u.RestaurantID)
		ur.RestaurantID = &s
	}
	if u.LanguageID.Valid {
		s := pgUUIDToString(u.LanguageID)
		ur.LanguageID = &s
	}
	if u.BanExpires.Valid {
		s := pgTimestampToString(u.BanExpires)
		ur.BanExpires = &s
	}
	return ur
}

func toUserRespFromCreate(u sqlc.CreateUserRow) userResp {
	ur := userResp{
		ID:            pgUUIDToString(u.ID),
		Email:         u.Email,
		Name:          u.Name,
		Image:         u.Image,
		EmailVerified: u.EmailVerified,
		CreatedAt:     pgTimestampToString(u.CreatedAt),
		UpdatedAt:     pgTimestampToString(u.UpdatedAt),
		Role:          u.Role,
		Banned:        u.Banned,
		BanReason:     u.BanReason,
		SetupComplete: u.SetupComplete,
	}
	if u.RestaurantID.Valid {
		s := pgUUIDToString(u.RestaurantID)
		ur.RestaurantID = &s
	}
	if u.LanguageID.Valid {
		s := pgUUIDToString(u.LanguageID)
		ur.LanguageID = &s
	}
	if u.BanExpires.Valid {
		s := pgTimestampToString(u.BanExpires)
		ur.BanExpires = &s
	}
	return ur
}
