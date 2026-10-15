package adk

import (
	"context"
	"fmt"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"

	"google.golang.org/adk/v2/plugin"
)

type adkRunnerPlugin struct {
	name   string
	plugin *plugin.Plugin
}

func (p adkRunnerPlugin) Name() string {
	return p.name
}

func (p adkRunnerPlugin) OnUserMessage(_ context.Context, _, _, _ string, _ ports.Agent, content model.ChatContent) error {
	if p.plugin.OnUserMessageCallback() != nil {
		fmt.Printf("[%s] USER MESSAGE RECEIVED: %s \n", p.name, firstText(content))
	}

	return nil
}

func (p adkRunnerPlugin) BeforeAgent(_ context.Context, _, _, _ string, agent ports.Agent) error {
	if p.plugin.BeforeAgentCallback() != nil {
		fmt.Printf("[%s] AGENT STARTING %s \n", p.name, agent.Name())
	}

	return nil
}

type myTestPlugin struct{}

func newMyTestPlugin() (ports.RunnerPlugin, error) {
	return myTestPlugin{}, nil
}

func (myTestPlugin) Name() string {
	return "myTestPlugin"
}

func (myTestPlugin) OnUserMessage(_ context.Context, _, _, _ string, _ ports.Agent, content model.ChatContent) error {
	fmt.Printf("[myTestPlugin] 用户输入信息:%s\n", firstText(content))
	return nil
}

func (myTestPlugin) BeforeAgent(_ context.Context, _, _, _ string, agent ports.Agent) error {
	fmt.Printf("[myTestPlugin] 智能体名称:%s\n", agent.Name())
	return nil
}
