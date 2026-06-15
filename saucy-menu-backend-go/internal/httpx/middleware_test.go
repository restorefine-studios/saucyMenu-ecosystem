package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRecoverMiddlewareReturns500(t *testing.T) {
	h := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("kaboom")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	require.Equal(t, 500, rec.Code)
}

func TestLangContextDefaultsToEn(t *testing.T) {
	var got string
	h := LangContext(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = LangFromContext(r.Context())
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	require.Equal(t, "en", got)
}

func TestLangContextReadsHeader(t *testing.T) {
	var got string
	h := LangContext(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = LangFromContext(r.Context())
	}))
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("lang", "fr")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	require.Equal(t, "fr", got)
}
