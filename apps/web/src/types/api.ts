export interface Response<T> {
  code: string;
  info: string;
  data: T;
}

export interface AiAgentConfigResponseDTO {
  agentID: string;
  agentName: string;
  agentDesc: string;
}

export interface CreateSessionRequestDTO {
  agentID: string;
  userID: string;
}

export interface CreateSessionResponseDTO {
  sessionID: string;
}

export interface ChatRequestDTO {
  agentID: string;
  userID: string;
  sessionID: string;
  message: string;
}

export interface ChatResponseDTO {
  content: string;
}
