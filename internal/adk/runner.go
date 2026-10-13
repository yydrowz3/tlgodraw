package adk

import (
	"context"
	"fmt"
	"strings"
	"sync/atomic"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

type Runner struct {
	appName string
	agent   ports.Agent
	plugins []ports.RunnerPlugin
	counter *atomic.Uint64
}

func (r *Runner) CreateSession(userID string) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("user id is required")
	}

	next := r.counter.Add(1)

	return fmt.Sprintf("%s:%s:%d", r.appName, userID, next), nil
}

func (r *Runner) Run(userID, sessionID string, content model.ChatContent) ([]string, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(sessionID) == "" {
		return nil, fmt.Errorf("user id and session id are required")
	}
	if err := r.notifyPlugins(userID, sessionID, content); err != nil {
		return nil, err
	}
	impl, ok := r.agent.(*Agent)
	if !ok {
		return nil, fmt.Errorf("runner agent %q is not runnable", r.agent.Name())
	}

	output, err := impl.run(context.Background(), content)
	if err != nil {
		return nil, err
	}

	if output == "" {
		return []string{}, nil
	}

	return []string{output}, nil
}

func (r *Runner) Stream(userID, sessionID string, content model.ChatContent) (<-chan string, <-chan error) {
	outputs := make(chan string, 8)
	errs := make(chan error, 1)

	go func() {
		defer close(outputs)
		defer close(errs)
		if strings.TrimSpace(userID) == "" || strings.TrimSpace(sessionID) == "" {
			errs <- fmt.Errorf("user id and session id are required")
			return
		}
		if err := r.notifyPlugins(userID, sessionID, content); err != nil {
			errs <- err
			return
		}
		impl, ok := r.agent.(*Agent)
		if !ok {
			errs <- fmt.Errorf("runner agent %q is not runnable", r.agent.Name())
			return
		}
		if err := impl.stream(context.Background(), content, outputs); err != nil {
			errs <- err
		}
	}()

	return outputs, errs
}

func (r *Runner) notifyPlugins(userID, sessionID string, content model.ChatContent) error {
	for _, item := range r.plugins {
		if err := item.OnUserMessage(context.Background(), r.appName, userID, sessionID, r.agent, content); err != nil {
			return fmt.Errorf("plugin %q on user message: %w", item.Name(), err)
		}
		if err := item.BeforeAgent(context.Background(), r.appName, userID, sessionID, r.agent); err != nil {
			return fmt.Errorf("plugin %q before agent: %w", item.Name(), err)
		}
	}

	return nil
}
