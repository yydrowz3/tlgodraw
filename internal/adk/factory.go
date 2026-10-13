package adk

import (
	"context"
	"fmt"
	"strings"
	"sync/atomic"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

type Factory struct {
	sessionCounter atomic.Uint64
	plugins        map[string]func() (ports.RunnerPlugin, error)
	router         ports.ToolRouter
}

func NewFactory() *Factory {
	return &Factory{
		plugins: defaultPlugins(),
	}
}

func (f *Factory) UseToolRouter(router ports.ToolRouter) {
	f.router = router
}

func (f *Factory) NewLLMAgent(_ context.Context, config model.AgentConfig, chatModel ports.ChatModel) (ports.Agent, error) {
	if strings.TrimSpace(config.Name) == "" {
		return nil, fmt.Errorf("agent name is required")
	}
	if chatModel == nil {
		return nil, fmt.Errorf("agent %q requires a chat model", config.Name)
	}
	return &Agent{
		name:        config.Name,
		kind:        "llm",
		description: config.Description,
		instruction: config.Instruction,
		outputKey:   config.OutputKey,
		chatModel:   chatModel,
		router:      f.router,
	}, nil
}

func (f *Factory) NewLoopAgent(_ context.Context, config model.AgentWorkflowConfig, subAgents []ports.Agent) (ports.Agent, error) {
	return newWorkflowAgent("loop", config, subAgents, f.router)
}

func (f *Factory) NewParallelAgent(_ context.Context, config model.AgentWorkflowConfig, subAgents []ports.Agent) (ports.Agent, error) {
	return newWorkflowAgent("parallel", config, subAgents, f.router)
}

func (f *Factory) NewSequentialAgent(_ context.Context, config model.AgentWorkflowConfig, subAgents []ports.Agent) (ports.Agent, error) {
	return newWorkflowAgent("sequential", config, subAgents, f.router)
}

func (f *Factory) NewRunner(_ context.Context, appName string, agent ports.Agent, pluginNames []string) (model.Runner, error) {
	if strings.TrimSpace(appName) == "" {
		return nil, fmt.Errorf("app name is required")
	}
	if agent == nil {
		return nil, fmt.Errorf("agent is required")
	}
	plugins, err := f.resolvePlugins(pluginNames)
	if err != nil {
		return nil, err
	}

	return &Runner{
		appName: appName,
		agent:   agent,
		plugins: plugins,
		counter: &f.sessionCounter,
	}, nil
}

func (f *Factory) resolvePlugins(names []string) ([]ports.RunnerPlugin, error) {
	if len(names) == 0 {
		return nil, nil
	}
	plugins := make([]ports.RunnerPlugin, 0, len(names))
	for _, name := range names {
		pluginName := strings.TrimSpace(name)
		if pluginName == "" {
			continue
		}
		builder, ok := f.plugins[pluginName]
		if !ok {
			return nil, fmt.Errorf("runner plugin %q is not registered", pluginName)
		}
		plugin, err := builder()
		if err != nil {
			return nil, fmt.Errorf("craete runner plugin %q: %w", pluginName, err)
		}
		plugins = append(plugins, plugin)
	}

	return plugins, nil
}
