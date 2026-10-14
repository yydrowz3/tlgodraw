package ai

import (
	"encoding/json"
	"fmt"
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
