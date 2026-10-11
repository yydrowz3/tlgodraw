package factory

import (
	"tlgodraw/internal/armory"
	"tlgodraw/internal/ports"
	"tlgodraw/internal/workflow"
)

type DefaultFactory struct {
	root armory.Handler
}

func NewDefaultFactory(modelProvider ports.ModelProvider, mcpFactory ports.MCPToolFactory,
	skillFactory ports.SkillFactory, agentFactory ports.AgentFactory,
	runnerFactory ports.RunnerFactory, registry ports.AgentRegistry) *DefaultFactory {
	runner := armory.NewRunnerNode(runnerFactory, registry)
	workflowNode := workflow.NewAgentWorkflowNode(agentFactory, runner)
	agent := armory.NewAgentNode(agentFactory, workflowNode)
	chatModel := armory.NewChatModelNode(modelProvider, mcpFactory, skillFactory, agent)
	api := armory.NewAiAPINode(modelProvider, chatModel)
	root := armory.NewRootNode(api)
	return &DefaultFactory{root: root}
}

// root -> api -> chat -> agent -> workflow(runner)
