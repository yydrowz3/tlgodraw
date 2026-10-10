package dto

type AiAgentConfigResponse struct {
	AgentID   string `json:"agentID"`
	AgentName string `json:"agentName"`
	AgentDesc string `json:"agentDesc"`
}

type createSessionRequest struct {
	AgentID string `json:"agentID"`
	UserID  string `json:"userID"`
}

type CreateSessionResponse struct {
	SessionID string `json:"sessionID"`
}

type ChatRequest struct {
	AgentID   string `json:"agentID"`
	UserID    string `json:"userID"`
	SessionID string `json:"sessionID"`
	Message   string `json:"message"`
}

type ChatResponse struct {
	Content string `json:"content"`
}
