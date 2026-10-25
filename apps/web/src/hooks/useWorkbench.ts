import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n";
import { AppError, formatError } from "@/i18n/messages";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AiAgentConfigResponseDTO } from "@/types/api";
import { useAiAgentsQuery, useChatMutation, useCreateSessionMutation } from "./useAgentApi";
import { clearUserInfo, getUserInfo } from "@/utils/cookie";
import { isDrawIoXmlContent } from "@/utils/draw";
import { makeGreeting, makeMessage, useSessions } from "./useSessions";
import { useTheme } from "./useTheme";
import { useDiagramBridge } from "./useDiagramBridge";

export type AgentStatus = "loading" | "ready" | "empty" | "error";
const EMPTY_AGENTS: AiAgentConfigResponseDTO[] = [];

export function useWorkbench() {
  const { t } = useTranslation();
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
  const [notice, setNotice] = useState<Error | null>(null);
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
    if (!bridge.ready) throw new AppError("errors.editorNotReady");
    await bridge.capture("autosave");
  }
  async function runOperation(operation: () => Promise<void>) {
    if (operating.current || bridge.syncing || bridge.busy) return;
    operating.current = true;
    setOperationBusy(true);
    setNotice(null);
    try {
      await operation();
    } catch (error) {
      if (alive.current) setNotice(error instanceof Error ? error : new AppError("errors.unknown"));
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
      if (!selectedAgentId) throw new AppError("assistant.selectRequired");
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
        messages: [makeGreeting()],
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
      setNotice(new AppError("assistant.selectRequired"));
      return;
    }
    const id = sessions.currentSessionId;
    const agentId = selectedAgentId;
    const content = inputValue;
    let backendId = sessions.getSession(id)?.backendSessionId || "";
    sending.current = true;
    setSendingSessionId(id);
    setInputValue("");
    setNotice(null);
    sessions.updateSession(id, (session) => ({
      ...session,
      title: session.isDefaultTitle ? content.slice(0, 20) : session.title,
      isDefaultTitle: false,
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
          if (alive.current) setNotice(new AppError("errors.contextUnavailable"));
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
        messages: [
          ...session.messages,
          makeMessage("agent", i18n.t("common.error", { message: formatError(error) })),
        ],
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
      setNotice(null);
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
      (notice ? formatError(notice) : "") ||
      (agentsQuery.isError && agentsQuery.error !== dismissedAgentError
        ? `${t("assistant.loadFailedNotice")} ${formatError(agentsQuery.error)}`
        : ""),
    dismissNotice: () => {
      setNotice(null);
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
