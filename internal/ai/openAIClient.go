package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
	"tlgodraw/internal/ports"
)

type OpenAIClient struct {
	httpClient     *http.Client
	completionsURL string
	apiKey         string
	model          string
}

type OpenAIToolDef struct {
	Name        string
	Description string
}

type openaiCompletion struct {
	Choices []struct {
		Message struct {
			Content   string             `json:"content"`
			ToolCalls []openaiToolCallV1 `json:"tool_calls"`
		} `json:"message"`
	} `json:"choices"`
}

type openaiStreamChunk struct {
	Choices []struct {
		Delta struct {
			Content   string                 `json:"content"`
			ToolCalls []openaiStreamToolCall `json:"tool_calls"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

type openaiToolCallV1 struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type openaiStreamToolCall struct {
	Index    int    `json:"index"`
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

func NewOpenAIClient(completionsURL, apiKey, model string, requestTimeout time.Duration) *OpenAIClient {
	if requestTimeout <= 0 {
		requestTimeout = 5 * time.Minute
	}
	return &OpenAIClient{
		httpClient:     &http.Client{Timeout: requestTimeout},
		completionsURL: completionsURL,
		apiKey:         apiKey,
		model:          model,
	}
}

func (c *OpenAIClient) Generate(ctx context.Context, messages []ports.ChatMessage, tools []OpenAIToolDef) (ports.ChatReply, error) {
	body, err := buildRequestBody(c.model, messages, tools, false)
	if err != nil {
		return ports.ChatReply{}, err
	}
	resp, err := c.do(ctx, body)
	if err != nil {
		return ports.ChatReply{}, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return ports.ChatReply{}, fmt.Errorf("openai read body: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ports.ChatReply{}, fmt.Errorf("openai upstream: %d: %s", resp.StatusCode, truncate(string(raw), 400))
	}

	var parsed openaiCompletion
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return ports.ChatReply{}, fmt.Errorf("openai decode: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return ports.ChatReply{}, fmt.Errorf("openai response has no choices")
	}
	choice := parsed.Choices[0].Message
	reply := ports.ChatReply{
		Content: choice.Content,
	}
	for _, tc := range choice.ToolCalls {
		reply.ToolCalls = append(reply.ToolCalls, ports.ChatToolCall{
			ID:        tc.ID,
			Name:      tc.Function.Name,
			Arguments: tc.Function.Arguments,
		})
	}

	return reply, nil
}
