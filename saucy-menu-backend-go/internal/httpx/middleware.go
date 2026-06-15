package httpx

import (
	"context"
	"net/http"

	"github.com/rs/zerolog/log"
)

type ctxKey string

const langKey ctxKey = "lang"

// Recover converts panics into a 500 {message} response.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error().Interface("panic", rec).Str("url", r.URL.String()).Msg("recovered panic")
				WriteError(w, http.StatusInternalServerError, "Internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// LangContext stores the `lang` request header (default "en") in the context.
func LangContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lang := r.Header.Get("lang")
		if lang == "" {
			lang = "en"
		}
		ctx := context.WithValue(r.Context(), langKey, lang)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// LangFromContext returns the lang value stored by LangContext, or "en".
func LangFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(langKey).(string); ok {
		return v
	}
	return "en"
}
