package chat

import (
	"cmp"
	"slices"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"
	"tlgodraw/pkg/types"
)

type Service struct {
	registry ports.AgentRegistry // agentID
	sessions ports.SessionStore  // SessionID
}

func NewService(registry ports.AgentRegistry, sessions ports.SessionStore) *Service {
	return &Service{registry: registry, sessions: sessions}
}

func (s *Service) QueryAgentConfigList() []model.AgentSummary {
	registered := s.registry.List()
	slices.SortFunc(registered, func(a, b model.RegisteredAgent) int {
		return cmp.Compare(a.AgentID, b.AgentID)
	})
	agents := make([]model.AgentSummary, 0, len(registered))
	for _, agent := range registered {
		agents = append(agents, model.AgentSummary{
			AgentID:   agent.AgentID,
			AgentName: agent.AgentName,
			AgentDesc: agent.AgentDesc,
		})
	}

	return agents
}

func (s *Service) CreateSession(agentID, userID string) (string, error) {
	if sessionID, ok := s.sessions.Get(userID, agentID); ok {
		return sessionID, nil
	}
	registered, ok := s.registry.Get(agentID)
	if !ok || registered.Runner == nil {
		return "", types.NewAppError(types.CodeAgentNotFound, types.InfoAgentNotFound)
	}
	sessionID, err := registered.Runner.CreateSession(userID)
	if err != nil {
		return "", err
	}
	if err := s.sessions.Set(userID, agentID, sessionID); err != nil {
		return "", err
	}
	return sessionID, nil
}

func (s *Service) HandleMessage(agentID, userID, sessionID, message string) ([]string, error) {
	content := model.ChatContent{
		Texts: []model.TextPart{ // Array
			{Message: message},
		},
	}
	return s.HandleCommand(model.ChatCommand{
		AgentID:   agentID,
		UserID:    userID,
		SessionID: sessionID,
		Message:   message,
		Content:   content,
	})
}

func (s *Service) HandleCommand(command model.ChatCommand) ([]string, error) {
	registered, sessionID, err := s.resolveRunnerSession(command)
	if err != nil {
		return nil, err
	}
	return registered.Runner.Run(command.UserID, sessionID, command.Content)
}

func (s *Service) HandleMessageStream(agentID, userID, sessionID, message string) (<-chan string, <-chan error) {
	return s.HandleCommandStream(model.ChatCommand{
		AgentID:   agentID,
		UserID:    userID,
		SessionID: sessionID,
		Message:   message,
		Content:   model.ChatContent{Texts: []model.TextPart{{Message: message}}},
	})
}

func (s *Service) HandleCommandStream(command model.ChatCommand) (<-chan string, <-chan error) {
	registered, sessionID, err := s.resolveRunnerSession(command)
	if err != nil {
		outputs := make(chan string)
		errs := make(chan error, 1)
		errs <- err
		close(outputs)
		close(errs)
		return outputs, errs
	}
	return registered.Runner.Stream(command.UserID, sessionID, command.Content)
}
