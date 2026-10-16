package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"go.yaml.in/yaml/v3"
)

type AppSection struct {
	Name string `yaml:"name"`
	Env  string `yaml:"env"`
}

type ServerSection struct {
	Addr string `yaml:"addr"`
}

type DatabaseSection struct {
	Required bool   `yaml:"required"`
	DSN      string `yaml:"dsn"`
}

type RedisSection struct {
	Required bool   `yaml:"required"`
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type AgentSection struct {
	ConfigPaths []string `yaml:"config-paths"`
}

type LLMSection struct {
	RequestTimeout string `yaml:"request-timeout"`
}

type Application struct {
	App      AppSection      `yaml:"app"`
	Server   ServerSection   `yaml:"server"`
	Database DatabaseSection `yaml:"database"`
	Redis    RedisSection    `yaml:"redis"`
	Agent    AgentSection    `yaml:"agent"`
	LLM      LLMSection      `yaml:"llm"`
}

const defaultLLMRequestTimeout = 5 * time.Minute

func (s LLMSection) RequestTimeoutDuration() (time.Duration, error) {
	raw := ""
	if s.RequestTimeout != "" {
		raw = s.RequestTimeout
	}
	if raw == "" {
		return defaultLLMRequestTimeout, nil
	}
	d, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("invalid llm.request-timeout %q: %w", raw, err)
	}
	if d <= 0 {
		return 0, fmt.Errorf("llm.request-timeout must be positive, got %q", raw)
	}

	return d, nil
}

func LoadApplication(path string) (Application, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Application{}, fmt.Errorf("read application config %s: %w", path, err)
	}
	var app Application
	if err := yaml.Unmarshal(data, &app); err != nil {
		return Application{}, fmt.Errorf("parse application config: %w", err)
	}
	app.Server.Addr, err = resolveServerAddr(app.Server.Addr, os.Getenv("PORT"))
	if err != nil {
		return Application{}, err
	}
	if app.App.Env == "" {
		app.App.Env = "local"
	}
	if _, err := app.LLM.RequestTimeoutDuration(); err != nil {
		return Application{}, fmt.Errorf("invalid llm.request-timeout: %w", err)
	}

	return app, nil
}

func resolveServerAddr(configuredAddr, port string) (string, error) {
	port = strings.TrimSpace(port)
	if port != "" {
		portNumber, err := strconv.Atoi(port)
		if err != nil || portNumber < 1 || portNumber > 65535 {
			return "", fmt.Errorf("invalid PORT %q: must be a number from 1 to 65535", port)
		}
		return ":" + strconv.Itoa(portNumber), nil
	}

	if strings.TrimSpace(configuredAddr) == "" {
		return ":8091", nil
	}
	return configuredAddr, nil
}
