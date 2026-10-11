package chat

import (
	"fmt"
	"tlgodraw/internal/model"
	"tlgodraw/pkg/types"
)

func (s *Service) resolveRunnerSession(command model.ChatCommand) (model.RegisteredAgent, string, error) {
	registered, ok := s.registry.Get(command.AgentID)
	if !ok || registered.Runner == nil {
		return model.RegisteredAgent{}, "", types.NewAppError(types.CodeAgentNotFound, types.InfoAgentNotFound)
	}
	sessionID := command.SessionID
	if sessionID == "" {
		var err error
		sessionID, err = s.CreateSession(command.AgentID, command.UserID)
		if err != nil {
			return model.RegisteredAgent{}, "", err
		}
	}
	if len(command.Content.Texts) == 0 && command.Message != "" {
		command.Content.Texts = []model.TextPart{{Message: command.Message}}
	}
	if len(command.Content.Texts) == 0 && len(command.Content.Files) == 0 && len(command.Content.InlineDatas) == 0 {
		return model.RegisteredAgent{}, "", fmt.Errorf("chat content is required")
	}
	return registered, sessionID, nil
}
