package workflow

import (
	"context"
	"fmt"
	"tlgodraw/internal/armory"
	"tlgodraw/internal/model"
	"tlgodraw/internal/pipeline"
	"tlgodraw/internal/ports"
)

type workflowBuilder interface {
	Build(context.Context, model.AgentWorkflowConfig, []ports.Agent) (ports.Agent, error)
}

type AgentWorkflowNode struct {
	next       armory.Handler
	builders   map[model.WorkflowType]workflowBuilder
	buildOrder []model.WorkflowType
}

func NewAgentWorkflowNode(agentFactory ports.AgentFactory, next armory.Handler) *AgentWorkflowNode {
	buildOrder := []model.WorkflowType{
		model.WorkflowTypeLoop,
		model.WorkflowTypeParallel,
		model.WorkflowTypeSequential,
	}
	return &AgentWorkflowNode{
		next: next,
		builders: map[model.WorkflowType]workflowBuilder{
			model.WorkflowTypeLoop:       NewLoopNode(agentFactory),
			model.WorkflowTypeParallel:   NewParallelNode(agentFactory),
			model.WorkflowTypeSequential: NewSequentialNode(agentFactory),
		},
		buildOrder: buildOrder,
	}
}

func (n *AgentWorkflowNode) Apply(ctx context.Context, command model.ArmoryCommand, dynamic *armory.DynamicContext) (model.RegisteredAgent, error) {
	workflows := command.Table.Module.AgentWorkflows
	if dynamic.CurrentStepIndex() >= len(workflows) {
		dynamic.SetCurrentWorkflow(nil)
		return pipeline.Route(ctx, n.next, command, dynamic)
	}
	workflow := workflows[dynamic.CurrentStepIndex()]
	dynamic.SetCurrentWorkflow(&workflow)
	dynamic.AddCurrentStepIndex()

	agent, err := n.build(ctx, workflow, dynamic.QueryAgentList(workflow.SubAgents))
	if err != nil {
		return model.RegisteredAgent{}, err
	}
	dynamic.AddAgent(agent)
	return n.Apply(ctx, command, dynamic)
}

func (n *AgentWorkflowNode) build(ctx context.Context, workflow model.AgentWorkflowConfig, subAgents []ports.Agent) (ports.Agent, error) {
	for _, workflowType := range n.buildOrder {
		if workflow.Type != workflowType {
			continue
		}
		return n.builders[workflowType].Build(ctx, workflow, subAgents)
	}

	return nil, fmt.Errorf("agentWorkflow type is error: %s", workflow.Type)
}
