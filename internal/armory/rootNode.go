package armory

import (
	"context"
	"tlgodraw/internal/model"
	"tlgodraw/internal/pipeline"
)

type RootNode struct {
	next Handler
}

func NewRootNode(next Handler) RootNode {
	return RootNode{next: next}
}

func (n RootNode) Apply(ctx context.Context, command model.ArmoryCommand, dynamic *DynamicContext) (model.RegisteredAgent, error) {
	return pipeline.Route(ctx, n.next, command, dynamic)
}
