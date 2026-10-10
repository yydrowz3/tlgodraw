package main

import (
	"flag"
	"log"
	"tlgodraw/internal/app/config"
	"tlgodraw/pkg/logging"
	"tlgodraw/pkg/utils"
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

}
