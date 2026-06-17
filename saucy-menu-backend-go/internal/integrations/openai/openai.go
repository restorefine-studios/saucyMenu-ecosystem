package openai

import (
	"context"
	"net/http"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

type Client struct {
	inner openai.Client
}

func New(apiKey string) *Client {
	return &Client{inner: openai.NewClient(option.WithAPIKey(apiKey))}
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// SupportedLanguages mirrors the 12 target languages used across the app.
var SupportedLanguages = []string{
	"en-GB", "fr", "es", "de", "it", "pt-PT", "nl", "pl", "ro", "ar", "zh", "ja",
}

// BuildTranslations returns translations for all supported languages.
// TODO: replace stub with real GPT-4o translation calls when ready.
func (c *Client) BuildTranslations(fields map[string]string, _ string) (map[string]map[string]string, error) {
	result := make(map[string]map[string]string, len(SupportedLanguages))
	for _, lang := range SupportedLanguages {
		result[lang] = make(map[string]string, len(fields))
		for k, v := range fields {
			result[lang][k] = v // stub: return source text for all languages
		}
	}
	return result, nil
}

// StreamChat streams a chat completion to w, flushing each chunk as it arrives.
// systemPrompt is prepended as the system message.
func (c *Client) StreamChat(ctx context.Context, w http.ResponseWriter, systemPrompt string, messages []Message) error {
	msgs := make([]openai.ChatCompletionMessageParamUnion, 0, len(messages)+1)
	msgs = append(msgs, openai.SystemMessage(systemPrompt))
	for _, m := range messages {
		switch m.Role {
		case "user":
			msgs = append(msgs, openai.UserMessage(m.Content))
		case "assistant":
			msgs = append(msgs, openai.AssistantMessage(m.Content))
		}
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)

	flusher, canFlush := w.(http.Flusher)

	stream := c.inner.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Model:    openai.ChatModelGPT4oMini,
		Messages: msgs,
	})
	for stream.Next() {
		chunk := stream.Current()
		for _, choice := range chunk.Choices {
			content := choice.Delta.Content
			if content != "" {
				_, _ = w.Write([]byte(content))
				if canFlush {
					flusher.Flush()
				}
			}
		}
	}
	return stream.Err()
}
