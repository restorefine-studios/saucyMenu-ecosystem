package httpx

import (
	"encoding/json"
	"strings"
)

// langAliases maps short codes the frontend sends to the canonical keys DeepL
// stores in the translations JSONB. Add entries here when a new language is added.
var langAliases = map[string]string{
	"pt":    "pt-PT",
	"en":    "en-GB",
	"en-us": "en-GB",
}

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
	if l == "" {
		return baseValue
	}

	// Normalise to canonical DeepL key (e.g. "pt" → "pt-PT")
	canonical := lang
	if mapped, ok := langAliases[l]; ok {
		canonical = mapped
	}

	// English variants → use base value (source language)
	if canonical == "en-GB" {
		if t, ok := translations["en-GB"]; ok {
			if v, ok := t[key]; ok && v != "" {
				return v
			}
		}
		return baseValue
	}

	// Exact match on canonical key
	if t, ok := translations[canonical]; ok {
		if v, ok := t[key]; ok && v != "" {
			return v
		}
	}
	// Fallback: try the raw lang value the caller passed
	if t, ok := translations[lang]; ok {
		if v, ok := t[key]; ok && v != "" {
			return v
		}
	}
	return baseValue
}
