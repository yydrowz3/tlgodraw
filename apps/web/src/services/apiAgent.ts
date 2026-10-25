import { AppError, apiErrorKeys } from "@/i18n/messages";
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

// Wrap transport errors without converting query cancellation into a user-facing failure.
async function request(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (
      init.signal?.aborted ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError")
    )
      throw error;
    throw new AppError("errors.network", {
      detail: error instanceof Error ? error.message : undefined,
    });
  }
}

const handleResponse = async <T>(response: globalThis.Response): Promise<Response<T>> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError("errors.http", { status: response.status, detail: errorText });
  }
  const data = await response.json();
  if (data.code !== "0000") {
    throw new AppError(apiErrorKeys[data.code] ?? "errors.apiUnknown", {
      code: data.code,
      detail: data.info,
    });
  }
  return data;
};

export async function queryAiAgentConfigList(
  signal?: AbortSignal,
): Promise<Response<AiAgentConfigResponseDTO[]>> {
  const response = await request(`${BASE_URL}/query-ai-agent-config-list`, {
    method: "GET",
    signal,
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
  const response = await request(`${BASE_URL}/create_session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agentID, userID }),
  });
  return handleResponse<CreateSessionResponseDTO>(response);
}

export async function chat(data: ChatRequestDTO): Promise<Response<ChatResponseDTO>> {
  const response = await request(`${BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<ChatResponseDTO>(response);
}
