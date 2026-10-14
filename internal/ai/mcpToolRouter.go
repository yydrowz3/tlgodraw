package ai

import (
	"context"
	"time"
	"tlgodraw/internal/ports"
)

type MCPToolRouter struct {
	clients      map[string]*MCPSSEClient
	tools        []ports.Tool
	registered   map[string]struct{}
	listTimeout  time.Duration
	listFailures map[string]error
}

func NewMCPToolRouter() *MCPToolRouter {
	return &MCPToolRouter{
		clients:      make(map[string]*MCPSSEClient),
		registered:   make(map[string]struct{}),
		listTimeout:  10 * time.Second,
		listFailures: make(map[string]error),
	}
}

func (r *MCPToolRouter) Register(tool ports.Tool) {
	r.RegisterAndExpand(tool)
}

func (r *MCPToolRouter) RegisterAndExpand(tool ports.Tool) []ports.Tool {
	mcp, ok := tool.(MCPTool)
	if !ok {
		r.tools = append(r.tools, tool)
		return []ports.Tool{tool}
	}
	if mcp.TransportType != "sse" {
		r.tools = append(r.tools, mcp)
		return []ports.Tool{mcp}
	}
	if _, exists := r.clients[mcp.ToolName]; exists {
		return nil
	}
	client := NewMCPSSEClient(mcp.BaseURI, mcp.SSEEndpoint, mcp.RequestTimeout)
	r.clients[mcp.ToolName] = client

	ctx, cancel := context.WithTimeout(context.Background(), r.listTimeout)
	defer cancel()
	names, err := client.ListTools(ctx)
	if err != nil {
		r.listFailures[mcp.ToolName] = err
		r.tools = append(r.tools, mcp)
		return []ports.Tool{mcp}
	}
	expanded := make([]ports.Tool, 0, len(names))
	for _, n := range names {
		r.clients[n] = client
		r.registered[n] = struct{}{}
		t := EinoTool{ToolName: n}
		r.tools = append(r.tools, t)
		expanded = append(expanded, t)
	}

	return expanded
}
