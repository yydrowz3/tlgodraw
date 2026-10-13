package adk

import "tlgodraw/internal/ports"

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
