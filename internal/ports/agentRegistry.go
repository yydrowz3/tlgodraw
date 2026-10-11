package ports

import (
	"sync"
	"tlgodraw/internal/model"
)

type AgentRegistry interface {
	Register(agent model.RegisteredAgent) error
	Get(agentID string) (model.RegisteredAgent, bool)
	List() []model.RegisteredAgent
}

type InMemoryAgentRegistry struct {
	mu     sync.RWMutex
	agents map[string]model.RegisteredAgent
}

func NewInMemoryAgentRegistry() *InMemoryAgentRegistry {
	return &InMemoryAgentRegistry{agents: make(map[string]model.RegisteredAgent)}
}

func (r *InMemoryAgentRegistry) Register(agent model.RegisteredAgent) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.agents[agent.AgentID] = agent
	return nil
}

func (r *InMemoryAgentRegistry) Get(agentID string) (model.RegisteredAgent, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	agent, ok := r.agents[agentID]
	return agent, ok
}

func (r *InMemoryAgentRegistry) List() []model.RegisteredAgent {
	r.mu.RLock()
	defer r.mu.RUnlock()
	agents := make([]model.RegisteredAgent, 0, len(r.agents))
	for _, agent := range r.agents {
		agents = append(agents, agent)
	}
	return agents
}
