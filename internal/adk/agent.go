package adk

import (
	"context"
	"fmt"
	"strings"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
)

type Agent struct {
	name        string
	kind        string
	description string
	instruction string
	outputKey   string
	chatModel   ports.ChatModel
	router      ports.ToolRouter
	subAgents   []ports.Agent
}

func (a *Agent) Name() string {
	return a.name
}

func (a *Agent) Description() string {
	return a.description
}

func (a *Agent) run(ctx context.Context, content model.ChatContent) (string, error) {
	return a.runWithVars(ctx, content, map[string]string{})
}

func (a *Agent) runWithVars(ctx context.Context, content model.ChatContent, vars map[string]string) (string, error) {
	switch a.kind {
	case "llm":
		return a.runLLM(ctx, content, vars)
	case "sequential":
		return a.runSequential(ctx, content, vars)
	case "loop", "parallel":
		return a.runFanOut(ctx, content, vars)
	default:
		return "", fmt.Errorf("agent %q has unknown kind %q", a.name, a.kind)
	}
}

func (a *Agent) stream(ctx context.Context, content model.ChatContent, out chan<- string) error {
	switch a.kind {
	case "llm":
		return a.streamLLM(ctx, content, out, map[string]string{})
	default:
		text, err := a.run(ctx, content)
		if err != nil {
			return err
		}
		if text != "" {
			select { // 只执行一次
			case out <- text:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		return nil
	}
}

func (a *Agent) runLLM(ctx context.Context, content model.ChatContent, vars map[string]string) (string, error) {
	messages := initialMessages(applyVars(a.instruction, vars), firstText(content))
	for iter := 0; iter < maxToolCallIterations; iter++ {
		reply, err := a.chatModel.Generate(ctx, messages)
		if err != nil {
			return "", err
		}
		if len(reply.ToolCalls) == 0 {
			return reply.Content, nil
		}
		messages = append(messages, ports.ChatMessage{Role: ports.ChatRoleAssistant, Content: reply.Content, ToolCalls: reply.ToolCalls})
		toolMessages, err := a.executeToolCalls(ctx, reply.ToolCalls)
		if err != nil {
			return "", err
		}
		messages = append(messages, toolMessages...)
	}
	return "", fmt.Errorf("agent %q exceeded tool-call iteration limit %d", a.name, maxToolCallIterations)
}

func (a *Agent) streamLLM(ctx context.Context, content model.ChatContent, out chan<- string, vars map[string]string) error {
	messages := initialMessages(applyVars(a.instruction, vars), firstText(content))
	for iter := 0; iter < maxToolCallIterations; iter++ {
		events, errs := a.chatModel.Stream(ctx, messages)
		var (
			finalText strings.Builder
			toolCalls []ports.ChatToolCall
			done      bool
		)
		streamErr := error(nil)
	streamLoop:
		for {
			select {
			case <-ctx.Done():
				streamErr = ctx.Err()
				break streamLoop
			case ev, ok := <-events:
				if !ok {
					break streamLoop // break for loop
				}
				if ev.Done {
					done = true
				}
				if ev.Delta != "" {
					finalText.WriteString(ev.Delta)
					select {
					case out <- ev.Delta:
					case <-ctx.Done():
						streamErr = ctx.Err()
						break streamLoop
					}
				}
				if len(ev.ToolCalls) > 0 {
					toolCalls = append(toolCalls, ev.ToolCalls...)
				}
			case err, ok := <-errs:
				if ok && err != nil {
					streamErr = err
				}
				break streamLoop
			}
		}
		if streamErr != nil {
			return streamErr
		}
		if len(toolCalls) == 0 {
			if !done {
				return fmt.Errorf("agent %q stream closed without completion", a.name)
			}
			return nil
		}
		messages = append(messages, ports.ChatMessage{Role: ports.ChatRoleAssistant, Content: finalText.String(), ToolCalls: toolCalls})
		toolMessages, err := a.executeToolCalls(ctx, toolCalls)
		if err != nil {
			return err
		}
		messages = append(messages, toolMessages...)
	}
	return fmt.Errorf("agent %q exceeded tool-call iteration limit %d", a.name, maxToolCallIterations)
}

func (a *Agent) executeToolCalls(ctx context.Context, calls []ports.ChatToolCall) ([]ports.ChatMessage, error) {
	if a.router == nil {
		return nil, fmt.Errorf("agent %q has no tool router but model requested tool calls", a.name)
	}
	out := make([]ports.ChatMessage, 0, len(calls))
	for _, call := range calls {
		result, err := a.router.CallTool(ctx, call.Name, call.Arguments)
		if err != nil {
			return nil, fmt.Errorf("tool %q: %w", call.Name, err)
		}
		out = append(out, ports.ChatMessage{
			Role:       ports.ChatRoleTool,
			Content:    result,
			ToolCallID: call.ID,
			Name:       call.Name,
		})
	}

	return out, nil
}

func (a *Agent) runSequential(ctx context.Context, content model.ChatContent, vars map[string]string) (string, error) {
	scope := cloneVars(vars)
	var last string
	for _, sub := range a.subAgents {
		impl, ok := sub.(*Agent)
		if !ok {
			return "", fmt.Errorf("sub-agent %q is not a runnable agent", sub.Name())
		}
		text, err := impl.runWithVars(ctx, content, scope) // 通过 scope 保存结果
		if err != nil {
			return "", err
		}
		last = text
		if key := strings.TrimSpace(impl.outputKey); key != "" {
			scope[key] = text
		}
	}
	return last, nil

}

func (a *Agent) runFanOut(ctx context.Context, content model.ChatContent, vars map[string]string) (string, error) {
	parts := make([]string, 0, len(a.subAgents)) // goroutine 并发优化
	for _, sub := range a.subAgents {
		impl, ok := sub.(*Agent)
		if !ok {
			return "", fmt.Errorf("sub-agent %q is not a runnable agent", sub.Name())
		}
		text, err := impl.runWithVars(ctx, content, vars)
		if err != nil {
			return "", err
		}
		parts = append(parts, fmt.Sprintf("[%s] %s", sub.Name(), text))
	}

	return strings.Join(parts, "\n"), nil
}
