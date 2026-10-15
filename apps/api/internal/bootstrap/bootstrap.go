package bootstrap

import (
	"context"
	"fmt"
	"tlgodraw/internal/adk"
	"tlgodraw/internal/ai"
	"tlgodraw/internal/armory"
	"tlgodraw/internal/chat"
	"tlgodraw/internal/config"
	"tlgodraw/internal/factory"
	"tlgodraw/internal/handler"
	"tlgodraw/internal/ports"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Engine struct {
	Application config.Application
	Router      *gin.Engine
	ChatService *chat.Service
	Registry    ports.AgentRegistry
	Sessions    ports.SessionStore
	Logger      *zap.Logger
}

func Build(ctx context.Context, appCfg config.Application, logger *zap.Logger) (*Engine, error) {
	tables, err := loadAgentTables(appCfg.Agent.ConfigPaths)
	if err != nil {
		return nil, err
	}
	if len(tables) == 0 {
		return nil, fmt.Errorf("no agent tables loaded; configure agent.config-paths")
	}
	llmTimeout, err := appCfg.LLM.RequestTimeoutDuration()
	if err != nil {
		return nil, err
	}
	registry := ports.NewInMemoryAgentRegistry()
	sessions := ports.NewInMemorySessionStore()

	modelProvider := ai.NewEinoProvider().WithRequestTimeout(llmTimeout)
	toolRouter := ai.NewMCPToolRouter()
	mcpFactory := ai.NewToolFactory(toolRouter)
	skillFactory := ai.NewSkillFactory()
	agentFactory := adk.NewFactory()
	agentFactory.UseToolRouter(toolRouter)
	runnerFactory := agentFactory

	armoryFactory := factory.NewDefaultFactory(modelProvider, mcpFactory, skillFactory, agentFactory, runnerFactory, registry)
	armoryService := armory.NewService(armoryFactory.ArmoryStrategyHandler())

	// ??
	if err := armoryService.AcceptArmoryAgents(ctx, tables); err != nil {
		return nil, fmt.Errorf("armory assembly: %w", err)
	}

	chatService := chat.NewService(registry, sessions)

	router := newRouter(appCfg.App.Env)
	handler.RegisterAgentRoutes(router, chatService) // query agent list

	if logger != nil {
		logger.Info("agents registered", zap.Int("count", len(registry.List())), zap.Duration("llm_request_timeout", llmTimeout))
	}

	return &Engine{
		Application: appCfg,
		Router:      router,
		ChatService: chatService,
		Registry:    registry,
		Sessions:    sessions,
		Logger:      logger,
	}, nil
}

func (e *Engine) Run() error {
	addr := e.Application.Server.Addr
	if addr == "" {
		addr = ":8091"
	}
	if e.Logger != nil {
		e.Logger.Info("http server listening", zap.String("addr", addr))
	}
	return e.Router.Run(addr)
}
