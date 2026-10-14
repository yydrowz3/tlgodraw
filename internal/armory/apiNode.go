package armory

import (
	"context"
	"tlgodraw/internal/model"
	"tlgodraw/internal/pipeline"
	"tlgodraw/internal/ports"
)

type AiAPINode struct {
	modelProvider ports.ModelProvider
	next          Handler
}

func NewAiAPINode(modelProvider ports.ModelProvider, next Handler) AiAPINode {
	return AiAPINode{modelProvider: modelProvider, next: next}
}

func (n AiAPINode) Apply(ctx context.Context, command model.ArmoryCommand, dynamic *DynamicContext) (model.RegisteredAgent, error) {
	api, err := n.modelProvider.NewAPI(ctx, command.Table.Module.AiAPI)
	if err != nil {
		return model.RegisteredAgent{}, err
	}
	dynamic.ModelAPI = api

	return pipeline.Route(ctx, n.next, command, dynamic)
}

type Service struct {
	handler Handler
}

func NewService(handler Handler) *Service {
	return &Service{handler: handler}
}

func (s *Service) AcceptArmoryAgents(ctx context.Context, tables map[string]model.AiAgentConfigTable) error {
	for _, table := range tables {
		_, err := s.handler.Apply(ctx, model.ArmoryCommand{Table: table}, NewDynamicContext())
		if err != nil {
			return err
		}
	}

	return nil
}
