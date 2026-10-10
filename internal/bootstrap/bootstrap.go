package bootstrap

import (
	"context"
	"tlgodraw/internal/config"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Engine struct {
	Application config.Application
	Router      *gin.Engine
	Logger      *zap.Logger
}

func Build(ctx context.Context, appCfg config.Application, logger *zap.Logger) (*Engine, error) {

	router := newRouter(appCfg.App.Env)

	// if logger != nil {
	// 	logger.Info("agents registered", zap.Int("count", len(registry.List())), zap.Duration("llm_request_timeout", llmTimeout))
	// }

	return &Engine{
		Application: appCfg,
		Router:      router,
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
