package ports

import "sync"

type SessionStore interface {
	Get(userID, agentID string) (string, bool)
	Set(userID, agentID, sessionID string) error
}

type InMemorySessionStore struct {
	mu       sync.RWMutex
	sessions map[string]string
}

func NewInMemorySessionStore() *InMemorySessionStore {
	return &InMemorySessionStore{sessions: make(map[string]string)}
}

func (s *InMemorySessionStore) Get(userID, agentID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sessionID, ok := s.sessions[sessionKey(userID, agentID)]
	return sessionID, ok
}

func (s *InMemorySessionStore) Set(userID, agentID, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[sessionKey(userID, agentID)] = sessionID
	return nil
}

func sessionKey(userID, agentID string) string {
	return userID + ":" + agentID
}
