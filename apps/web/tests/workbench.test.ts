import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chat, createSession, queryAiAgentConfigList } from "@/services/apiAgent";
import { useWorkbench } from "@/hooks/useWorkbench";
import { aiAgentsQueryKey } from "@/hooks/useAgentApi";
import { createQueryTestContext } from "./queryTestUtils";
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/services/apiAgent", () => ({
  chat: vi.fn(),
  createSession: vi.fn(),
  queryAiAgentConfigList: vi.fn(),
}));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/utils/cookie", () => ({ getUserInfo: () => ({ user: "qa" }), clearUserInfo: vi.fn() }));
vi.mock("@/hooks/useDiagramBridge", () => ({
  useDiagramBridge: () => ({
    ready: true,
    syncing: false,
    busy: false,
    capture: vi.fn(async () => ({ xml: "<mxfile/>", data: "svg" })),
    receiveDiagram: vi.fn(),
    loadSession: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(queryAiAgentConfigList).mockResolvedValue({
    code: "0000",
    info: "",
    data: [{ agentID: "agent", agentName: "Agent", agentDesc: "" }],
  });
  vi.mocked(createSession).mockResolvedValue({
    code: "0000",
    info: "",
    data: { sessionID: "backend" },
  });
});
describe("workbench request ownership", () => {
  it("keeps a delayed reply and backend ID in the originating session", async () => {
    let finish!: (value: Awaited<ReturnType<typeof chat>>) => void;
    vi.mocked(chat).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(useWorkbench, createQueryTestContext());
    await waitFor(() => expect(result.current.agentStatus).toBe("ready"));
    const original = result.current.currentSessionId;
    act(() => result.current.setInputValue("A request from the first session"));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.sendMessage();
    });
    await waitFor(() => expect(chat).toHaveBeenCalled());
    act(() => {
      result.current.createNewSession();
    });
    const current = result.current.currentSessionId;
    await act(async () => {
      finish({ code: "0000", info: "", data: { content: "Late reply" } });
      await pending;
    });
    expect(result.current.currentSessionId).toBe(current);
    expect(result.current.currentSession.messages).toHaveLength(1);
    expect(result.current.getSession(original)?.messages.at(-1)?.content).toBe("Late reply");
    expect(result.current.getSession(original)?.backendSessionId).toBe("backend");
  });
  it("persists a delayed diagram without loading it into another session", async () => {
    let finish!: (value: Awaited<ReturnType<typeof chat>>) => void;
    vi.mocked(chat).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(useWorkbench, createQueryTestContext());
    await waitFor(() => expect(result.current.agentStatus).toBe("ready"));
    const original = result.current.currentSessionId;
    act(() => result.current.setInputValue("Draw a diagram"));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.sendMessage();
    });
    await waitFor(() => expect(chat).toHaveBeenCalled());
    act(() => {
      result.current.createNewSession();
    });
    const xml = "<mxfile><diagram>QA</diagram></mxfile>";
    await act(async () => {
      await Promise.resolve();
      finish({ code: "0000", info: "", data: { content: xml } });
      await pending;
    });
    expect(result.current.currentSession.drawIoXml).toBeNull();
    expect(result.current.getSession(original)?.drawIoXml).toBe(xml);
  });
  it("shows empty and failed agent states and supports retry", async () => {
    vi.mocked(queryAiAgentConfigList)
      .mockResolvedValueOnce({ code: "0000", info: "", data: [] })
      .mockRejectedValueOnce(new Error("Offline"))
      .mockRejectedValueOnce(new Error("Offline"));
    const { result } = renderHook(useWorkbench, createQueryTestContext());
    await waitFor(() => expect(result.current.agentStatus).toBe("empty"));
    act(() => result.current.retryAgents());
    await waitFor(() => expect(result.current.agentStatus).toBe("error"));
    expect(result.current.notice).toContain("加载智能体列表失败");
    act(() => result.current.retryAgents());
    await waitFor(() => expect(result.current.agentStatus).toBe("ready"));
  });

  it("restores the saved agent and preserves selection across background refreshes", async () => {
    const agents = [
      { agentID: "agent", agentName: "Agent", agentDesc: "" },
      { agentID: "second", agentName: "Second", agentDesc: "" },
    ];
    localStorage.setItem("ai_agent_last_agent", "second");
    vi.mocked(queryAiAgentConfigList).mockResolvedValue({ code: "0000", info: "", data: agents });
    const context = createQueryTestContext();
    const { result } = renderHook(useWorkbench, context);
    await waitFor(() => expect(result.current.selectedAgentId).toBe("second"));
    act(() => result.current.selectAgent("agent"));
    act(() => {
      result.current.updateSession(result.current.currentSessionId, (session) => ({
        ...session,
        backendSessionId: "existing",
      }));
    });
    vi.mocked(queryAiAgentConfigList).mockResolvedValue({
      code: "0000",
      info: "",
      data: [...agents].reverse(),
    });
    await act(async () => {
      await context.client.invalidateQueries({ queryKey: aiAgentsQueryKey });
    });
    expect(result.current.selectedAgentId).toBe("agent");
    expect(result.current.sessionId).toBe("existing");
  });

  it("clears the backend session when a refreshed list removes the selected agent", async () => {
    const context = createQueryTestContext();
    const { result } = renderHook(useWorkbench, context);
    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent"));
    act(() => {
      result.current.updateSession(result.current.currentSessionId, (session) => ({
        ...session,
        backendSessionId: "old-agent-session",
      }));
    });
    vi.mocked(queryAiAgentConfigList).mockResolvedValue({
      code: "0000",
      info: "",
      data: [{ agentID: "replacement", agentName: "Replacement", agentDesc: "" }],
    });
    await act(async () => {
      await context.client.invalidateQueries({ queryKey: aiAgentsQueryKey });
    });
    await waitFor(() => expect(result.current.selectedAgentId).toBe("replacement"));
    expect(result.current.sessionId).toBe("");
  });

  it("keeps cached agents usable after a background failure and allows dismissing the notice", async () => {
    const context = createQueryTestContext();
    const { result } = renderHook(useWorkbench, context);
    await waitFor(() => expect(result.current.agentStatus).toBe("ready"));
    vi.mocked(queryAiAgentConfigList).mockRejectedValue(new Error("Offline"));
    await act(async () => {
      await context.client.invalidateQueries({ queryKey: aiAgentsQueryKey });
    });
    await waitFor(() => expect(result.current.notice).toContain("加载智能体列表失败"));
    expect(result.current.agentStatus).toBe("ready");
    expect(result.current.agents).toHaveLength(1);
    expect(result.current.selectedAgentId).toBe("agent");
    act(() => result.current.dismissNotice());
    expect(result.current.notice).toBe("");
  });

  it("uses mutations to create and restart sessions", async () => {
    const { result } = renderHook(useWorkbench, createQueryTestContext());
    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent"));
    const original = result.current.currentSessionId;
    await act(async () => {
      await result.current.newChat();
    });
    expect(result.current.currentSessionId).not.toBe(original);
    expect(result.current.sessionId).toBe("backend");
    vi.mocked(createSession).mockResolvedValueOnce({
      code: "0000",
      info: "",
      data: { sessionID: "restarted" },
    });
    const current = result.current.currentSessionId;
    await act(async () => {
      await result.current.restartSession();
    });
    expect(result.current.currentSessionId).toBe(current);
    expect(result.current.sessionId).toBe("restarted");
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(createSession).toHaveBeenLastCalledWith("agent", "qa");
  });

  it.each(["newChat", "restartSession", "sendMessage"] as const)(
    "does not reuse a removed agent's delayed session ID during %s",
    async (operation) => {
      let finish!: () => void;
      vi.mocked(createSession).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () =>
              resolve({ code: "0000", info: "", data: { sessionID: "removed-agent-session" } });
          }),
      );
      vi.mocked(chat).mockResolvedValue({ code: "0000", info: "", data: { content: "Reply" } });
      const context = createQueryTestContext();
      const { result } = renderHook(useWorkbench, context);
      await waitFor(() => expect(result.current.selectedAgentId).toBe("agent"));
      act(() => result.current.setInputValue("Hello"));
      let pending!: Promise<void>;
      act(() => {
        pending = result.current[operation]();
      });
      await waitFor(() => expect(finish).toBeTypeOf("function"));
      vi.mocked(queryAiAgentConfigList).mockResolvedValue({
        code: "0000",
        info: "",
        data: [{ agentID: "replacement", agentName: "Replacement", agentDesc: "" }],
      });
      await act(async () => {
        await context.client.invalidateQueries({ queryKey: aiAgentsQueryKey });
      });
      await waitFor(() => expect(result.current.selectedAgentId).toBe("replacement"));
      await act(async () => {
        finish();
        await pending;
      });
      expect(result.current.sessionId).toBe("");
    },
  );

  it("blocks duplicate sends and reports a chat failure without retrying", async () => {
    vi.mocked(chat).mockRejectedValue(new Error("Chat failed"));
    const { result } = renderHook(useWorkbench, createQueryTestContext());
    await waitFor(() => expect(result.current.selectedAgentId).toBe("agent"));
    act(() => result.current.setInputValue("Hello"));
    await act(async () => {
      await Promise.all([result.current.sendMessage(), result.current.sendMessage()]);
    });
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(chat).toHaveBeenCalledTimes(1);
    expect(result.current.messages.at(-1)?.content).toBe("Error: Chat failed");
    expect(result.current.isSending).toBe(false);
  });

  it.each(["create", "chat"] as const)(
    "ignores a delayed %s result after unmount",
    async (operation) => {
      let finish!: () => void;
      if (operation === "create") {
        vi.mocked(createSession).mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = () => resolve({ code: "0000", info: "", data: { sessionID: "late" } });
            }),
        );
      } else {
        vi.mocked(chat).mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = () => resolve({ code: "0000", info: "", data: { content: "Late reply" } });
            }),
        );
      }
      const { result, unmount } = renderHook(useWorkbench, createQueryTestContext());
      await waitFor(() => expect(result.current.selectedAgentId).toBe("agent"));
      act(() => result.current.setInputValue("Hello"));
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.sendMessage();
      });
      await waitFor(() => expect(finish).toBeTypeOf("function"));
      unmount();
      const saved = localStorage.getItem("drawio_sessions");
      await act(async () => {
        finish();
        await pending;
      });
      expect(localStorage.getItem("drawio_sessions")).toBe(saved);
      if (operation === "create") expect(chat).not.toHaveBeenCalled();
    },
  );
});
