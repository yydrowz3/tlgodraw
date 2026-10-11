package armory

import (
	"tlgodraw/internal/model"
	"tlgodraw/internal/pipeline"
)

type Handler = pipeline.Handler[model.ArmoryCommand, *DynamicContext, model.RegisteredAgent]
