package ai

import (
	"context"
	"fmt"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

type ToolFactory struct {
	router *MCPToolRouter
}

type MCPTool struct {
	ToolName       string
	TransportType  string
	BaseURI        string
	SSEEndpoint    string
	Command        string
	Args           []string
	Env            map[string]string
	RequestTimeout int
}

func NewToolFactory(router *MCPToolRouter) *ToolFactory {
	return &ToolFactory{router: router}
}

func (t MCPTool) Name() string {
	return t.ToolName
}

func (f *ToolFactory) BuildTools(_ context.Context, config model.ToolMCPConfig) ([]ports.Tool, error) {
	kind, err := validateMCPConfig(config)
	if err != nil {
		return nil, err
	}

	var (
		tools []ports.Tool
	)

	switch {
	case kind == "local":
		tools, err = buildLocalMCPTools(config.Local)
	case kind == "sse":
		tools, err = buildSSEMCPTools(config.SSE)
	case kind == "stdio":
		tools, err = buildStdioMCPTools(config.Stdio)
	case config.SSE != nil:
		tools, err = buildSSEMCPTools(config.SSE)
	case config.Stdio != nil:
		tools, err = buildStdioMCPTools(config.Stdio)
	default:
		return nil, fmt.Errorf("mcp tool config is empty")
	}
	if err != nil {
		return nil, err
	}
	if f.router != nil {
		expanded := make([]ports.Tool, 0, len(tools))
		for _, t := range tools {
			ts := f.router.RegisterAndExpand(t)
			if len(ts) == 0 {
				continue
			}
			expanded = append(expanded, ts...)
		}
		if len(expanded) > 0 {
			return expanded, nil
		}
	}

	return tools, nil
}

func validateMCPConfig(config model.ToolMCPConfig) (string, error) {
	count := 0
	kind := ""

	if config.Local != nil {
		count++
		kind = "local"
	}
	if config.SSE != nil {
		count++
		kind = "sse"
	}
	if config.Stdio != nil {
		count++
		kind = "stdio"
	}

	switch count {
	case 0:
		return "", fmt.Errorf("mcp config must define exactly one of local, sse, or stdio")
	case 1:
		return kind, nil
	default:
		return "", fmt.Errorf("mcp config cannot define multiple transports in one entry")

	}
}
