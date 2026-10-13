package adk

import (
	"fmt"
	"strings"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

func newWorkflowAgent(kind string, config model.AgentWorkflowConfig, subAgents []ports.Agent, router ports.ToolRouter) (ports.Agent, error) {
	if strings.TrimSpace(config.Name) == "" {
		return nil, fmt.Errorf("%s agent name is required", kind)
	}
	return &Agent{
		name:        config.Name,
		kind:        kind,
		description: config.Description,
		subAgents:   subAgents,
		router:      router,
	}, nil
}

func cloneVars(vars map[string]string) map[string]string {
	out := make(map[string]string, len(vars)+4)
	for k, v := range vars {
		out[k] = v
	}
	return out
}

func applyVars(template string, vars map[string]string) string {
	if template == "" || len(vars) == 0 {
		return template
	}
	out := template
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{"+k+"}", v)
	}

	return out
}

func initialMessages(instruction, userText string) []ports.ChatMessage {
	messages := make([]ports.ChatMessage, 0, 2)
	if strings.TrimSpace(instruction) != "" {
		messages = append(messages, ports.ChatMessage{Role: ports.ChatRoleSystem, Content: instruction})
	}
	messages = append(messages, ports.ChatMessage{Role: ports.ChatRoleUser, Content: userText})

	return messages
}

func firstText(content model.ChatContent) string {
	if len(content.Texts) == 0 {
		return ""
	}

	return content.Texts[0].Message
}
