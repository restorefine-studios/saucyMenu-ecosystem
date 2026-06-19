package httpx

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteSuccess emits {success:true, data:<payload>}.
func WriteSuccess(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, map[string]any{"success": true, "data": data})
}

// WriteRawJSON writes {"success": true, "data": <rawJSON>} where rawJSON is
// embedded as-is (not re-marshaled) — for handlers that already hold a JSON
// document (e.g. a JSONB column read straight from the DB).
func WriteRawJSON(w http.ResponseWriter, status int, rawJSON []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"success":true,"data":`))
	w.Write(rawJSON)
	w.Write([]byte(`}`))
}

// WriteError emits {message:"..."} matching the Elysia onError shape.
func WriteError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"message": message})
}
