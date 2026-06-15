package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/betterauth"
	userjwt "github.com/restorefine-studios/saucy-menu-backend-go/internal/auth/jwt"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
)

type ctxKey int

const (
	SessionKey ctxKey = iota
	UserKey
	EndUserKey
)

// AdminAuth validates a better-auth cookie and requires role == "user" (restaurant admin).
// Note: the original authPlugin checks role != "user" — the name is misleading but we port as-is.
func AdminAuth(q *sqlc.Queries, secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, user, err := sessionFromCookie(r, q, secret)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			if user.Role == nil || *user.Role != "user" {
				httpx.WriteError(w, http.StatusForbidden, "Forbidden: insufficient role")
				return
			}
			ctx := context.WithValue(r.Context(), SessionKey, session)
			ctx = context.WithValue(ctx, UserKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// SuperAdminAuth validates a better-auth cookie and requires role == "admin".
func SuperAdminAuth(q *sqlc.Queries, secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, user, err := sessionFromCookie(r, q, secret)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			if user.Role == nil || *user.Role != "admin" {
				httpx.WriteError(w, http.StatusForbidden, "Forbidden: insufficient role")
				return
			}
			ctx := context.WithValue(r.Context(), SessionKey, session)
			ctx = context.WithValue(ctx, UserKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserAuth validates a Bearer END_USER JWT for the diner app.
func UserAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized: no token provided")
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized: invalid authorization header")
				return
			}
			claims, err := userjwt.VerifyEndUser(jwtSecret, parts[1])
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error())
				return
			}
			ctx := context.WithValue(r.Context(), EndUserKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetAdminSession returns the authenticated admin session from context (set by AdminAuth).
func GetAdminSession(ctx context.Context) *sqlc.Session {
	s, _ := ctx.Value(SessionKey).(*sqlc.Session)
	return s
}

// GetAdminUser returns the authenticated admin user from context (set by AdminAuth/SuperAdminAuth).
func GetAdminUser(ctx context.Context) *sqlc.FindUserByIDRow {
	u, _ := ctx.Value(UserKey).(*sqlc.FindUserByIDRow)
	return u
}

// GetEndUser returns the diner JWT claims from context (set by UserAuth).
func GetEndUser(ctx context.Context) *userjwt.EndUserClaims {
	c, _ := ctx.Value(EndUserKey).(*userjwt.EndUserClaims)
	return c
}

// sessionFromCookie extracts and validates the better-auth session cookie,
// then loads the session and user from the DB.
func sessionFromCookie(r *http.Request, q *sqlc.Queries, secret string) (*sqlc.Session, *sqlc.FindUserByIDRow, error) {
	token := cookieToken(r, secret)
	if token == "" {
		return nil, nil, httpx.NewAppError(http.StatusUnauthorized, "no session cookie")
	}

	session, err := q.GetSessionByToken(r.Context(), token)
	if err != nil {
		return nil, nil, httpx.NewAppError(http.StatusUnauthorized, "session not found or expired")
	}

	user, err := q.FindUserByID(r.Context(), session.UserID)
	if err != nil {
		return nil, nil, httpx.NewAppError(http.StatusUnauthorized, "user not found")
	}

	if user.Banned != nil && *user.Banned {
		return nil, nil, httpx.NewAppError(http.StatusForbidden, "account is banned")
	}

	return &session, &user, nil
}

// cookieToken reads the better-auth session cookie and returns the raw token.
// Checks both the plain name and the __Secure- prefixed name.
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
