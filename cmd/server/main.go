package main

import (
	"context"
	"flag"
	"log"
	"tlgodraw/internal/bootstrap"
	"tlgodraw/internal/config"
	"tlgodraw/pkg/logging"
	"tlgodraw/pkg/utils"

	"go.uber.org/zap"
)

func main() {
	envPath := flag.String("env", utils.DefaultEnv("APP_ENV_FILE", ".env"),
		"path to dotenv file (use empty string to skip)")
	configPath := flag.String("config", utils.DefaultEnv("APP_CONFIG", "configs/application.yaml"), "path to application yaml")
	flag.Parse()

	envLoaded := utils.LoadDotEnv(*envPath)
	appCfg, err := config.LoadApplication(*configPath)
	if err != nil {
		log.Fatalf("load application config: %v", err)
	}
	logger, err := logging.New(appCfg.App.Env)
	if err != nil {
		log.Fatalf("init logger: %v", err)
	}
	defer func() {
		_ = logger.Sync()
	}()
	logger.Info("tlgodraw bootstrap", zap.String("config", *configPath), zap.String("env", appCfg.App.Env), zap.String("addr", appCfg.Server.Addr), zap.String("env_file", envLoaded))

	engine, err := bootstrap.Build(context.Background(), appCfg, logger)
	if err != nil {
		logger.Fatal("bootstrap failed", zap.Error(err))
	}
	if err := engine.Run(); err != nil {
		logger.Fatal("http server stopped", zap.Error(err))
	}
}
