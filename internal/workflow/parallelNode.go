package workflow

import (
	"context"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

type ParallelNode struct {
	agentFactory ports.AgentFactory
}

func NewParallelNode(agentFactory ports.AgentFactory) ParallelNode {
	return ParallelNode{
		agentFactory: agentFactory,
	}
}

func (n ParallelNode) Build(ctx context.Context, workflow model.AgentWorkflowConfig, subAgents []ports.Agent) (ports.Agent, error) {
	return n.agentFactory.NewParallelAgent(ctx, workflow, subAgents)
}
