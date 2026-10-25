import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AiAgentConfigResponseDTO } from "@/types/api";
import { useAiAgentsQuery, useChatMutation, useCreateSessionMutation } from "./useAgentApi";
import { clearUserInfo, getUserInfo } from "@/utils/cookie";
import { isDrawIoXmlContent } from "@/utils/draw";
import { DEFAULT_TITLE, GREETING, makeMessage, useSessions } from "./useSessions";
import { useTheme } from "./useTheme";
import { useDiagramBridge } from "./useDiagramBridge";

export type AgentStatus = "loading" | "ready" | "empty" | "error";
const EMPTY_AGENTS: AiAgentConfigResponseDTO[] = [];
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

export function useWorkbench() {
  const navigate = useNavigate();
  const sessions = useSessions();
  const { resolvedTheme } = useTheme();
  const [currentUser] = useState(() => getUserInfo()?.user || "");
  const agentsQuery = useAiAgentsQuery();
  const { mutateAsync: createSession } = useCreateSessionMutation();
  const { mutateAsync: chat } = useChatMutation();
  const agents = agentsQuery.data ?? EMPTY_AGENTS;
  const agentStatus: AgentStatus = agents.length
    ? "ready"
    : agentsQuery.isPending || agentsQuery.isFetching
      ? "loading"
      : agentsQuery.isError
        ? "error"
        : "empty";
  const [preferredAgentId, setSelectedAgentId] = useState(() => {
    try {
      return localStorage.getItem("ai_agent_last_agent") || "";
    } catch {
      return "";
    }
  });
  const selectedAgentId =
    agents.find((agent) => agent.agentID === preferredAgentId)?.agentID || agents[0]?.agentID || "";
  // Keep the local choice valid as server data changes, without an extra effect-driven render.
  if (agentsQuery.data !== undefined && preferredAgentId !== selectedAgentId) {
    setSelectedAgentId(selectedAgentId);
  }
  const previousAgentId = useRef(selectedAgentId);
  const [dismissedAgentError, setDismissedAgentError] = useState<Error | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [useHistoryContext, setUseHistoryContext] = useState(false);
  const [sendingSessionId, setSendingSessionId] = useState<string | null>(null);
  const [operationBusy, setOperationBusy] = useState(false);
  const sending = useRef(false);
  const operating = useRef(false);
  const [notice, setNotice] = useState("");
  const [imgData, setImgData] = useState<string | null>(null);
  const alive = useRef(true);
  const { updateSession } = sessions;
  const saveXml = useCallback(
    (id: string, xml: string) => {
      updateSession(id, (session) => ({ ...session, drawIoXml: xml }));
    },
    [updateSession],
  );
  const bridge = useDiagramBridge({
    theme: resolvedTheme,
    initialSession: sessions.currentSession,
    saveXml,
    persist: sessions.persistSessions,
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const previous = previousAgentId.current;
    previousAgentId.current = selectedAgentId;
    if (previous && previous !== selectedAgentId) {
      updateSession(sessions.currentSessionId, (session) => ({ ...session, backendSessionId: "" }));
    }
  }, [selectedAgentId, sessions.currentSessionId, updateSession]);

  async function saveBeforeNavigation() {
    if (!bridge.ready) throw new Error("The diagram editor is not ready.");
    await bridge.capture("autosave");
  }
  async function runOperation(operation: () => Promise<void>) {
    if (operating.current || bridge.syncing || bridge.busy) return;
    operating.current = true;
    setOperationBusy(true);
    setNotice("");
    try {
      await operation();
    } catch (error) {
      if (alive.current) setNotice(errorMessage(error));
    } finally {
      operating.current = false;
      if (alive.current) setOperationBusy(false);
    }
  }
  async function switchSession(id: string) {
    if (id === sessions.currentSessionId) return;
    await runOperation(async () => {
      await saveBeforeNavigation();
      const session = sessions.loadSession(id);
      if (session) bridge.loadSession(session);
    });
  }
  async function newChat() {
    await runOperation(async () => {
      if (!selectedAgentId) throw new Error("请先选择一个智能体。");
      await saveBeforeNavigation();
      if (!alive.current) return;
      const result = await createSession({ agentID: selectedAgentId, userID: currentUser });
      if (!alive.current) return;
      const session = sessions.createNewSession(
        previousAgentId.current === selectedAgentId ? result.sessionID : "",
      );
      bridge.loadSession(session);
      setInputValue("");
    });
  }
  async function deleteSession(id: string) {
    await runOperation(async () => {
      const isCurrent = id === sessions.currentSessionId;
      if (isCurrent) await saveBeforeNavigation();
      const next = sessions.deleteSession(id);
      if (isCurrent) bridge.loadSession(next);
    });
  }
  async function restartSession() {
    await runOperation(async () => {
      if (!selectedAgentId || sending.current) return;
      const id = sessions.currentSessionId;
      const result = await createSession({ agentID: selectedAgentId, userID: currentUser });
      if (!alive.current) return;
      sessions.updateSession(id, (session) => ({
        ...session,
        backendSessionId: previousAgentId.current === selectedAgentId ? result.sessionID : "",
        messages: [makeMessage("agent", GREETING)],
        lastModified: Date.now(),
      }));
      setInputValue("");
    });
  }
  function selectAgent(id: string) {
    setSelectedAgentId(id);
    try {
      localStorage.setItem("ai_agent_last_agent", id);
    } catch {
      /* Keep the current selection. */
    }
  }
  async function sendMessage() {
    if (!inputValue.trim() || sending.current || operating.current || bridge.syncing || bridge.busy)
      return;
    if (!selectedAgentId) {
      setNotice("请先选择一个智能体。");
      return;
    }
    const id = sessions.currentSessionId;
    const agentId = selectedAgentId;
    const content = inputValue;
    let backendId = sessions.getSession(id)?.backendSessionId || "";
    sending.current = true;
    setSendingSessionId(id);
    setInputValue("");
    setNotice("");
    sessions.updateSession(id, (session) => ({
      ...session,
      title: session.title === DEFAULT_TITLE ? content.slice(0, 20) : session.title,
      messages: [...session.messages, makeMessage("user", content)],
      lastModified: Date.now(),
    }));
    try {
      let apiContent = content;
      if (useHistoryContext) {
        try {
          const snapshot = await bridge.capture("context");
          apiContent =
            "[Context: Current Draw.io XML]\n\x60\x60\x60xml\n" +
            snapshot.xml +
            "\n\x60\x60\x60\n\n" +
            content;
        } catch {
          if (alive.current)
            setNotice("Canvas context was unavailable. Your message was sent without it.");
        }
      }
      if (!alive.current) return;
      if (!backendId) {
        const response = await createSession({ agentID: agentId, userID: currentUser });
        backendId = response.sessionID;
        if (!alive.current) return;
        if (previousAgentId.current === agentId) {
          sessions.updateSession(id, (session) => ({ ...session, backendSessionId: backendId }));
        }
      }
      const response = await chat({
        agentID: agentId,
        userID: currentUser,
        sessionID: backendId,
        message: apiContent,
      });
      if (!alive.current) return;
      const result = response.content;
      if (isDrawIoXmlContent(result)) {
        const updated = sessions.updateSession(id, (session) => ({
          ...session,
          drawIoXml: result,
          lastModified: Date.now(),
        }));
        if (updated) bridge.receiveDiagram(id, result);
      } else {
        sessions.updateSession(id, (session) => ({
          ...session,
          messages: [...session.messages, makeMessage("agent", result)],
        }));
      }
    } catch (error) {
      if (!alive.current) return;
      sessions.updateSession(id, (session) => ({
        ...session,
        messages: [...session.messages, makeMessage("agent", "Error: " + errorMessage(error))],
      }));
    } finally {
      sending.current = false;
      if (alive.current) setSendingSessionId(null);
    }
  }
  async function exportDiagram() {
    await runOperation(async () => {
      const result = await bridge.capture("download");
      if (alive.current) setImgData(result.data);
    });
  }
  async function logout() {
    await runOperation(async () => {
      if (bridge.ready) await saveBeforeNavigation();
      else sessions.persistSessions();
      clearUserInfo();
      await navigate({ to: "/login" });
    });
  }
  return {
    ...sessions,
    bridge,
    currentUser,
    agents,
    agentStatus,
    selectedAgentId,
    selectAgent,
    retryAgents: () => {
      setNotice("");
      setDismissedAgentError(agentsQuery.error);
      void agentsQuery.refetch();
    },
    inputValue,
    setInputValue,
    useHistoryContext,
    setUseHistoryContext,
    isSending: sendingSessionId !== null,
    sendingSessionId,
    operationBusy,
    notice:
      notice ||
      (agentsQuery.isError && agentsQuery.error !== dismissedAgentError
        ? "加载智能体列表失败，请检查后端服务是否启动。"
        : ""),
    dismissNotice: () => {
      setNotice("");
      setDismissedAgentError(agentsQuery.error);
    },
    imgData,
    setImgData,
    switchSession,
    newChat,
    deleteSession,
    restartSession,
    sendMessage,
    exportDiagram,
    logout,
  };
}
