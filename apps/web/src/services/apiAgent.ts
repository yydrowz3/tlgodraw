import type {
  AiAgentConfigResponseDTO,
  ChatRequestDTO,
  ChatResponseDTO,
  CreateSessionResponseDTO,
  Response,
} from "@/types/api";

const BASE_URL = (
  (import.meta.env.VITE_BASE_URL as string | undefined) ?? "http://localhost:8091/api/v1"
).replace(/\/+$/, "");

const handleResponse = async <T>(response: globalThis.Response): Promise<Response<T>> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }
  const data = await response.json();
  if (data.code !== "0000") {
    throw new Error(data.info || "Unknown API error");
  }
  return data;
};

export async function queryAiAgentConfigList(): Promise<Response<AiAgentConfigResponseDTO[]>> {
  const response = await fetch(`${BASE_URL}/query-ai-agent-config-list`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleResponse<AiAgentConfigResponseDTO[]>(response);
}

export async function createSession(
  agentID: string,
  userID: string,
): Promise<Response<CreateSessionResponseDTO>> {
  const response = await fetch(`${BASE_URL}/create_session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agentID, userID }),
  });
  return handleResponse<CreateSessionResponseDTO>(response);
}

export async function chat(data: ChatRequestDTO): Promise<Response<ChatResponseDTO>> {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<ChatResponseDTO>(response);
}
