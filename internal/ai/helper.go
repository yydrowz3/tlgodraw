package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"tlgodraw/internal/ports"
)

func joinURL(base, path string) string {
	base = strings.TrimRight(base, "/")
	path = strings.TrimLeft(path, "/")
	if path == "" {
		return base
	}
	return base + "/" + path
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."

}

func fallbackDescription(t OpenAIToolDef) string {
	if strings.TrimSpace(t.Description) != "" {
		return t.Description
	}

	return "This is a tool named " + t.Name
}

func emitToolCalls(events chan<- ports.ChatStreamEvent, buf map[int]*ports.ChatToolCall) {
	if len(buf) == 0 {
		return
	}
	calls := make([]ports.ChatToolCall, 0, len(buf))
	for i := 0; i < len(buf); i++ {
		if call, ok := buf[i]; ok && call != nil {
			calls = append(calls, *call)
		}
	}
	if len(calls) > 0 {
		events <- ports.ChatStreamEvent{
			ToolCalls: calls,
		}
	}
}

func buildRequestBody(modelName string, messages []ports.ChatMessage, tools []OpenAIToolDef, stream bool) ([]byte, error) {
	payload := map[string]any{
		"model":    modelName,
		"messages": encodeMessages(messages),
		"stream":   stream,
	}
	if len(tools) > 0 {
		payload["tools"] = encodeTools(tools)
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("openai marshal request: %w", err)
	}
	return raw, nil
}

func encodeMessages(messages []ports.ChatMessage) []map[string]any {
	encoded := make([]map[string]any, 0, len(messages))
	for _, m := range messages {
		entry := map[string]any{"role": string(m.Role)}
		if m.Content != "" {
			entry["content"] = m.Content
		} else if m.Role != ports.ChatRoleAssistant || len(m.ToolCalls) == 0 {
			entry["content"] = ""
		}

		if m.Name != "" {
			entry["name"] = m.Name
		}
		if m.ToolCallID != "" {
			entry["tool_call_id"] = m.ToolCallID
		}
		if len(m.ToolCalls) > 0 {
			calls := make([]map[string]any, 0, len(m.ToolCalls))
			for _, c := range m.ToolCalls {
				calls = append(calls, map[string]any{
					"id":   c.ID,
					"type": "function",
					"function": map[string]any{
						"name":      c.Name,
						"arguments": c.Arguments,
					},
				})
			}
			entry["tool_calls"] = calls
		}
		encoded = append(encoded, entry)
	}

	return encoded
}

func encodeTools(tools []OpenAIToolDef) []map[string]any {
	out := make([]map[string]any, 0, len(tools))
	for _, t := range tools {
		out = append(out, map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":        t.Name,
				"description": fallbackDescription(t),
				"parameters": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"query": map[string]any{
							"type":        "string",
							"description": "自由文本输入或检索查询，工具会按其语义解释",
						},
					},
				},
			},
		})
	}

	return out
}

func mustJSON(v any) json.RawMessage {
	raw, _ := json.Marshal(v)

	return raw
}

func extractToolText(raw json.RawMessage) string {
	var parsed toolCallResult
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return string(raw)
	}
	parts := make([]string, 0, len(parsed.Content))
	for _, item := range parsed.Content {
		if item.Type == "text" && item.Text != "" {
			parts = append(parts, item.Text)
		}
	}

	if len(parts) == 0 {
		return string(raw)
	}

	return strings.Join(parts, "\n")
}

func (c *MCPSSEClient) callRPC(ctx context.Context, method string, params any) (json.RawMessage, error) {
	id := c.nextID.Add(1)
	ch := make(chan json.RawMessage, 1)
	c.mu.Lock()
	postURL := c.postURL
	c.pending[id] = ch
	c.mu.Unlock()
	if postURL == "" {
		return nil, fmt.Errorf("mcp post url is not set")
	}
	body, err := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"method":  method,
		"params":  params,
	})
	if err != nil {
		return nil, fmt.Errorf("mcp marshal request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, postURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("mcp build post: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mcp post: %w", err)
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("mcp post status %d", resp.StatusCode)
	}
	waitCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	select {
	case msg, ok := <-ch:
		if !ok {
			return nil, fmt.Errorf("mcp call %s closed unexpectedly", method)
		}
		var probe struct {
			Err string `json:"__error__"`
		}
		if err := json.Unmarshal(msg, &probe); err == nil && probe.Err != "" {
			return nil, fmt.Errorf("%s", probe.Err)
		}
		return msg, nil
	case <-waitCtx.Done():
		return nil, fmt.Errorf("mcp call %s timeout: %w", method, waitCtx.Err())
	}
}

func (c *MCPSSEClient) notify(ctx context.Context, method string, params any) error {
	c.mu.Lock()
	postURL := c.postURL
	c.mu.Unlock()
	if postURL == "" {
		return fmt.Errorf("mcp post url is not set")
	}
	body, err := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"method":  method,
		"params":  params,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, postURL, bytes.NewReader(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}

	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()

	return nil
}
