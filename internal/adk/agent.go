package adk

import (
	"context"
	"fmt"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

type Agent struct {
	name        string
	kind        string
	description string
	instruction string
	outputKey   string
	chatModel   ports.ChatModel
	router      ports.ToolRouter
	subAgents   []ports.Agent
}

func (a *Agent) Name() string {
	return a.name
}

func (a *Agent) Description() string {
	return a.description
}

func (a *Agent) run(ctx context.Context, content model.ChatContent) (string, error) {
	return a.runWithVars(ctx, content, map[string]string{})
}

func (a *Agent) runWithVars(ctx context.Context, content model.ChatContent, vars map[string]string) (string, error) {
	switch a.kind {
	case "llm":
		return a.runLLM(ctx, content, vars)
	case "sequential":
		return a.runSequntial(ctx, content, vars)
	case "loop", "parallel":
		return a.runFanOut(ctx, content, vars)
	default:
		return "", fmt.Errorf("agent %q has unknown kind %q", a.name, a.kind)
	}
}
