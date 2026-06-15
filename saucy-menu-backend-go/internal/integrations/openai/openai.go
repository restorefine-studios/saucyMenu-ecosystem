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
