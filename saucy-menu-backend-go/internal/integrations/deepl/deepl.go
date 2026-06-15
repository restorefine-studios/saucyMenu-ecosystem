package deepl

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// SupportedLanguages mirrors config/languages.ts — the 12 target languages.
var SupportedLanguages = []string{
	"en-GB", "fr", "es", "de", "it", "pt-PT", "nl", "pl", "ro", "ar", "zh", "ja",
}

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey, httpClient: &http.Client{}}
}

type translateRequest struct {
	Text       []string `json:"text"`
	SourceLang string   `json:"source_lang,omitempty"`
	TargetLang string   `json:"target_lang"`
}

type translateResponse struct {
	Translations []struct {
		Text string `json:"text"`
	} `json:"translations"`
}

// Translate translates a single string to the target language.
func (c *Client) Translate(text, sourceLang, targetLang string) (string, error) {
	reqBody, _ := json.Marshal(translateRequest{
		Text:       []string{text},
		SourceLang: strings.ToUpper(sourceLang),
		TargetLang: strings.ToUpper(targetLang),
	})

	req, err := http.NewRequest("POST", apiURL(c.apiKey), bytes.NewReader(reqBody))
	if err != nil {
		return text, err
	}
	req.Header.Set("Authorization", "DeepL-Auth-Key "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return text, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return text, fmt.Errorf("deepl: status %d", resp.StatusCode)
	}

	var result translateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return text, err
	}
	if len(result.Translations) == 0 {
		return text, nil
	}
	return result.Translations[0].Text, nil
}

// BuildTranslations translates a map of fields into all SupportedLanguages.
// Returns {"en-GB": {"name": "...", "description": "..."}, "fr": {...}, ...}
func (c *Client) BuildTranslations(fields map[string]string, sourceLang string) (map[string]map[string]string, error) {
	result := make(map[string]map[string]string, len(SupportedLanguages))
	for _, lang := range SupportedLanguages {
		result[lang] = make(map[string]string, len(fields))
		for key, value := range fields {
			if value == "" {
				result[lang][key] = ""
				continue
			}
			translated, err := c.Translate(value, sourceLang, lang)
			if err != nil {
				result[lang][key] = value // fall back to original on error
			} else {
				result[lang][key] = translated
			}
		}
	}
	return result, nil
}

// apiURL returns the correct DeepL endpoint based on whether the key is free tier.
func apiURL(apiKey string) string {
	if strings.HasSuffix(apiKey, ":fx") {
		return "https://api-free.deepl.com/v2/translate"
	}
	return "https://api.deepl.com/v2/translate"
}
