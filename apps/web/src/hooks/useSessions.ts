import type { Message, Session } from "@/types/draw";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

const STORAGE_KEY = "drawio_sessions";
const DEFAULT_TITLE = "New Chat";
const GREETING =
  "你好！我是你的绘图助手，可以帮你创建和完善架构图、流程图、时序图等图表。请告诉我你的绘图需求，例如：绘制一个用户登录流程图，或修改现有图表。";

function createInitialMessage(): Message {
  return {
    id: Date.now().toString(),
    role: "agent",
    content: GREETING,
    timestamp: Date.now(),
  };
}

function createSession(backendSessionId = ""): Session {
  return {
    id: Date.now().toString(),
    backendSessionId,
    title: DEFAULT_TITLE,
    messages: [createInitialMessage()],
    drawIoXml: null,
    lastModified: Date.now(),
  };
}

type SessionsState = {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  sessionId: string;
};

function readInitialState(): SessionsState {
  const savedSessions = localStorage.getItem(STORAGE_KEY);

  if (savedSessions) {
    try {
      const sessions = JSON.parse(savedSessions) as Session[];
      if (sessions.length > 0) {
        const mostRecent = [...sessions].sort((a, b) => b.lastModified - a.lastModified)[0];
        return {
          sessions,
          currentSessionId: mostRecent.id,
          messages: mostRecent.messages,
          sessionId: mostRecent.backendSessionId || "",
        };
      }
    } catch (error) {
      console.error("Failed to parse sessions:", error);
    }
  }

  const initialSession = createSession();
  return {
    sessions: [initialSession],
    currentSessionId: initialSession.id,
    messages: initialSession.messages,
    sessionId: "",
  };
}

export function useSessions() {
  const [state, setState] = useState(readInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
    } catch (error) {
      console.error("Failed to save sessions to localStorage:", error);
    }
  }, [state.sessions]);

  const setMessages: Dispatch<SetStateAction<Message[]>> = useCallback((value) => {
    setState((previous) => {
      const messages = typeof value === "function" ? value(previous.messages) : value;
      const firstUserMessage = messages.find((message) => message.role === "user");
      return {
        ...previous,
        messages,
        sessions: previous.sessions.map((session) =>
          session.id === previous.currentSessionId
            ? {
                ...session,
                messages,
                title:
                  session.title === DEFAULT_TITLE && firstUserMessage
                    ? firstUserMessage.content.slice(0, 20)
                    : session.title,
              }
            : session,
        ),
      };
    });
  }, []);

  const setSessionId: Dispatch<SetStateAction<string>> = useCallback((value) => {
    setState((previous) => {
      const sessionId = typeof value === "function" ? value(previous.sessionId) : value;
      return {
        ...previous,
        sessionId,
        sessions: previous.sessions.map((session) =>
          session.id === previous.currentSessionId
            ? { ...session, backendSessionId: sessionId }
            : session,
        ),
      };
    });
  }, []);

  function createNewSession(backendSessionId = "") {
    const newSession = createSession(backendSessionId);
    setState((previous) => ({
      sessions: [newSession, ...previous.sessions],
      currentSessionId: newSession.id,
      messages: newSession.messages,
      sessionId: backendSessionId,
    }));
    return newSession;
  }

  function loadSession(targetSessionId: string) {
    const session = state.sessions.find((item) => item.id === targetSessionId);
    if (!session) return undefined;

    setState((previous) => ({
      ...previous,
      currentSessionId: session.id,
      messages: session.messages,
      sessionId: session.backendSessionId || "",
    }));
    return session;
  }

  function deleteSession(sessionIdToDelete: string) {
    const remainingSessions = state.sessions.filter((session) => session.id !== sessionIdToDelete);
    setState((previous) => ({ ...previous, sessions: remainingSessions }));

    if (state.currentSessionId !== sessionIdToDelete) return;

    if (remainingSessions.length > 0) {
      loadSession(remainingSessions[0].id);
    } else {
      createNewSession();
    }
  }

  function renameSession(sessionIdToRename: string, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setState((previous) => ({
      ...previous,
      sessions: previous.sessions.map((session) =>
        session.id === sessionIdToRename ? { ...session, title: trimmedTitle } : session,
      ),
    }));
  }

  const updateCurrentSession = useCallback((update: (session: Session) => Session) => {
    setState((previous) => ({
      ...previous,
      sessions: previous.sessions.map((session) =>
        session.id === previous.currentSessionId ? update(session) : session,
      ),
    }));
  }, []);

  return {
    sessions: state.sessions,
    currentSessionId: state.currentSessionId,
    messages: state.messages,
    sessionId: state.sessionId,
    setMessages,
    setSessionId,
    createNewSession,
    loadSession,
    deleteSession,
    renameSession,
    updateCurrentSession,
  };
}
