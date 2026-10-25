import type { Message, Session } from "@/types/draw";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n";
import { AppError, formatError } from "@/i18n/messages";

const STORAGE_KEY = "drawio_sessions";
export const DEFAULT_TITLE = "New Chat";
export const GREETING =
  "你好！我是你的绘图助手，可以帮你创建和完善架构图、流程图、时序图等图表。请告诉我你的绘图需求，例如：绘制一个用户登录流程图，或修改现有图表。";
export const makeMessage = (role: Message["role"], content: string): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
});
export const makeGreeting = (): Message => ({
  ...makeMessage("agent", i18n.t("assistant.greeting")),
  kind: "greeting",
});
const makeSession = (backendSessionId = ""): Session => ({
  id: crypto.randomUUID(),
  backendSessionId,
  title: DEFAULT_TITLE,
  isDefaultTitle: true,
  messages: [makeGreeting()],
  drawIoXml: null,
  lastModified: Date.now(),
});
type SessionsState = { sessions: Session[]; currentSessionId: string };

function readInitialState(): SessionsState {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved)) {
      const sessions = saved
        .filter(
          (s): s is Session =>
            s &&
            typeof s.id === "string" &&
            typeof s.title === "string" &&
            Array.isArray(s.messages) &&
            typeof s.lastModified === "number" &&
            (s.drawIoXml === null || typeof s.drawIoXml === "string"),
        )
        .map((session) => ({
          ...session,
          isDefaultTitle:
            typeof session.isDefaultTitle === "boolean"
              ? session.isDefaultTitle
              : session.title === DEFAULT_TITLE &&
                !session.messages.some((message) => message?.role === "user"),
          messages: session.messages.map((message, index) =>
            index === 0 && message?.role === "agent" && message.content === GREETING
              ? { ...message, kind: "greeting" as const }
              : message,
          ),
        }));
      if (sessions.length)
        return {
          sessions,
          currentSessionId: [...sessions].sort((a, b) => b.lastModified - a.lastModified)[0].id,
        };
    }
  } catch {
    /* Recover an empty or unavailable local store. */
  }
  const session = makeSession();
  return { sessions: [session], currentSessionId: session.id };
}
export function useSessions() {
  useTranslation();
  const [state, setState] = useState(readInitialState);
  const latest = useRef(state);
  const [storageError, setStorageError] = useState<AppError | null>(null);
  const persistSessions = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current.sessions));
      setStorageError(null);
    } catch {
      const error = new AppError("errors.storage");
      setStorageError(error);
      throw error;
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        persistSessions();
      } catch {
        /* Preserve the initial session in memory. */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [persistSessions]);
  const commit = useCallback(
    (next: SessionsState) => {
      latest.current = next;
      setState(next);
      try {
        persistSessions();
      } catch {
        /* Error is presented by the workbench. */
      }
    },
    [persistSessions],
  );
  const updateSession = useCallback(
    (id: string, update: (session: Session) => Session) => {
      const previous = latest.current;
      let updated: Session | undefined;
      const sessions = previous.sessions.map((session) => {
        if (session.id !== id) return session;
        updated = update(session);
        return updated;
      });
      if (updated) commit({ ...previous, sessions });
      return updated;
    },
    [commit],
  );
  const createNewSession = useCallback(
    (backendSessionId = "") => {
      const session = makeSession(backendSessionId);
      commit({ sessions: [session, ...latest.current.sessions], currentSessionId: session.id });
      return session;
    },
    [commit],
  );
  const loadSession = useCallback(
    (id: string) => {
      const session = latest.current.sessions.find((s) => s.id === id);
      if (session) commit({ ...latest.current, currentSessionId: id });
      return session;
    },
    [commit],
  );
  const deleteSession = useCallback(
    (id: string) => {
      let sessions = latest.current.sessions.filter((s) => s.id !== id);
      if (!sessions.length) sessions = [makeSession()];
      const currentSessionId =
        latest.current.currentSessionId === id ? sessions[0].id : latest.current.currentSessionId;
      commit({ sessions, currentSessionId });
      return sessions.find((s) => s.id === currentSessionId)!;
    },
    [commit],
  );
  const renameSession = useCallback(
    (id: string, title: string) => {
      if (title.trim())
        updateSession(id, (s) => ({ ...s, title: title.trim(), isDefaultTitle: false }));
    },
    [updateSession],
  );
  const getSession = useCallback(
    (id: string) => latest.current.sessions.find((s) => s.id === id),
    [],
  );
  const currentSession = state.sessions.find((s) => s.id === state.currentSessionId)!;
  return {
    ...state,
    currentSession,
    messages: currentSession.messages,
    sessionId: currentSession.backendSessionId || "",
    getSession,
    updateSession,
    persistSessions,
    storageError: storageError ? formatError(storageError) : "",
    createNewSession,
    loadSession,
    deleteSession,
    renameSession,
  };
}
