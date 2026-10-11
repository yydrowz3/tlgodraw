package ports

import (
	"context"
	"tlgodraw/internal/model"
)

type ModelAPI interface{}

type ChatRole string

type ModelProvider interface {
	NewAPI(ctx context.Context, config model.AiAPIConfig) (ModelAPI, error)
	NewChatModel(ctx context.Context, api ModelAPI, config model.ChatModelConfig, tools []Tool) (ChatModel, error)
}

const (
	ChatRoleSystem    ChatRole = "system"
	ChatRoleUser      ChatRole = "user"
	ChatRoleAssistant ChatRole = "assistant"
	ChatRoleTool      ChatRole = "tool"
)

type ChatMessage struct {
	Role       ChatRole
	Content    string
	ToolCallID string
	Name       string
	ToolCalls  []ChatToolCall
}

type ChatToolCall struct {
	ID        string
	Name      string
	Arguments string
}

type ChatReply struct {
	Content   string
	ToolCalls []ChatToolCall
}

type ChatStreamEvent struct {
	Delta     string
	ToolCalls []ChatToolCall
	Done      bool
}

type ChatModel interface {
	Generate(ctx context.Context, messages []ChatMessage) (ChatReply, error)
	Stream(ctx context.Context, messages []ChatMessage) (<-chan ChatStreamEvent, <-chan error)
	Tools() []Tool
}

type Tool interface {
	Name() string
}

type ToolDescriptor interface {
	Description() string
}

type MCPToolFactory interface {
	BuildTools(ctx context.Context, config model.ToolMCPConfig) ([]Tool, error)
}

type SkillFactory interface {
	BuildTools(ctx context.Context, config model.ToolMCPConfig) ([]Tool, error)
}

type ToolRouter interface {
	CallTool(ctx context.Context, name, arguments string) (string, error)
}

type AgentFactory interface {
	NewLLMAgent(ctx context.Context, config model.AgentConfig, chatModel ChatModel) (Agent, error)
	NewLoopAgent(ctx context.Context, config model.AgentWorkflowConfig, subAgents []Agent) (Agent, error)
	NewParallelAgent(ctx context.Context, config model.AgentWorkflowConfig, subAgents []Agent) (Agent, error)
	NewSequentialAgent(ctx context.Context, config model.AgentWorkflowConfig, subAgents []Agent) (Agent, error)
}

type Agent interface {
	Name() string
}

type RunnerPlugin interface {
	Name() string
	OnUserMessage(ctx context.Context, appName, userID, sessionID string, agent Agent, content model.ChatContent) error
	BeforeAgent(ctx context.Context, appName, userID, sessionID string, agent Agent) error
}

type RunnerFactory interface {
	NewRunner(ctx context.Context, appName string, agent Agent, pluginNames []string) (model.Runner, error)
}
