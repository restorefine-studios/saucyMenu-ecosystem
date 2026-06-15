package httpx

import (
	"encoding/json"
	"strings"
)

// ResolveTranslatedField mirrors the TypeScript resolveTranslatedField utility.
// translationsJSON is the raw JSONB bytes stored in the DB.
// Format: {"en-GB": {"name": "...", "description": "..."}, "fr": {...}}
func ResolveTranslatedField(baseValue string, translationsJSON []byte, key, lang string) string {
	if len(translationsJSON) == 0 {
		return baseValue
	}
	var translations map[string]map[string]string
	if err := json.Unmarshal(translationsJSON, &translations); err != nil {
		return baseValue
	}

	l := strings.ToLower(strings.TrimSpace(lang))
	if l == "" || l == "en" || l == "en-gb" || l == "en-us" {
		if t, ok := translations["en-GB"]; ok {
			if v, ok := t[key]; ok && v != "" {
				return v
			}
		}
		return baseValue
	}

	if t, ok := translations[lang]; ok {
		if v, ok := t[key]; ok && v != "" {
			return v
		}
	}
	return baseValue
}
