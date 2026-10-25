import { useMutation, useQuery } from "@tanstack/react-query";
import { chat, createSession, queryAiAgentConfigList } from "@/services/apiAgent";
import type { ChatRequestDTO, CreateSessionRequestDTO } from "@/types/api";

export const aiAgentsQueryKey = ["agents", "list"] as const;

export function useAiAgentsQuery() {
  return useQuery({
    queryKey: aiAgentsQueryKey,
    queryFn: async ({ signal }) => (await queryAiAgentConfigList(signal)).data ?? [],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useCreateSessionMutation() {
  return useMutation({
    mutationFn: async ({ agentID, userID }: CreateSessionRequestDTO) =>
      (await createSession(agentID, userID)).data,
    retry: false,
  });
}

export function useChatMutation() {
  return useMutation({
    mutationFn: async (request: ChatRequestDTO) => (await chat(request)).data,
    retry: false,
  });
}
