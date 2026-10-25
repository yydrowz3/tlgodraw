import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GREETING, useSessions } from "@/hooks/useSessions";
import { setLanguage } from "@/i18n";
describe("local drawing sessions", () => {
  it("marks built-in content and preserves custom titles even when they equal the default", async () => {
    const { result } = renderHook(useSessions);
    expect(result.current.currentSession).toMatchObject({ isDefaultTitle: true });
    expect(result.current.messages[0].kind).toBe("greeting");
    act(() => result.current.renameSession(result.current.currentSessionId, "New Chat"));
    expect(result.current.currentSession.isDefaultTitle).toBe(false);
    await act(() => setLanguage("ja"));
    expect(result.current.currentSession.title).toBe("New Chat");
    act(() => result.current.deleteSession(result.current.currentSessionId));
    expect(result.current.currentSession.isDefaultTitle).toBe(true);
    expect(result.current.messages[0]).toMatchObject({ kind: "greeting", role: "agent" });
    expect(result.current.messages[0].content).toContain("こんにちは");
  });

  it("migrates only identifiable legacy defaults and respects explicit title markers", () => {
    const greeting = { id: "g", role: "agent", content: GREETING, timestamp: 1 };
    const user = { id: "u", role: "user", content: GREETING, timestamp: 2 };
    const base = { messages: [greeting], drawIoXml: "<xml/>", lastModified: 1 };
    localStorage.setItem(
      "drawio_sessions",
      JSON.stringify([
        { ...base, id: "default", title: "New Chat" },
        { ...base, id: "custom", title: "New Chat", isDefaultTitle: false },
        { ...base, id: "used", title: "New Chat", messages: [greeting, user, greeting] },
        {
          ...base,
          id: "other",
          title: "My diagram",
          messages: [{ ...greeting, content: "Custom welcome" }],
        },
      ]),
    );
    const { result } = renderHook(useSessions);
    expect(result.current.getSession("default")?.isDefaultTitle).toBe(true);
    expect(result.current.getSession("custom")?.isDefaultTitle).toBe(false);
    expect(result.current.getSession("used")?.isDefaultTitle).toBe(false);
    expect(result.current.getSession("used")?.messages.map((message) => message.kind)).toEqual([
      "greeting",
      undefined,
      undefined,
    ]);
    expect(result.current.getSession("other")?.messages[0].kind).toBeUndefined();
    expect(result.current.getSession("other")?.drawIoXml).toBe("<xml/>");
  });

  it("translates an existing storage error without retrying persistence on a language change", async () => {
    const { result } = renderHook(useSessions);
    const save = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Full");
    });
    act(() => result.current.renameSession(result.current.currentSessionId, "Keep in memory"));
    expect(result.current.storageError).toContain("Unable to save");
    // Use the i18n event directly: saving a language preference is unrelated to session storage.
    const { i18n } = await import("@/i18n");
    const calls = save.mock.calls.length;
    await act(() => i18n.changeLanguage("zh-CN"));
    expect(result.current.storageError).toContain("无法在此浏览器中保存会话");
    expect(save).toHaveBeenCalledTimes(calls);
    expect(result.current.currentSession.title).toBe("Keep in memory");
  });
  it("restores legacy data and updates the originating session after navigation", () => {
    const old = {
      id: "old",
      title: "Old drawing",
      messages: [],
      backendSessionId: "backend-old",
      drawIoXml: "<mxfile/>",
      lastModified: 1,
    };
    localStorage.setItem("drawio_sessions", JSON.stringify([old]));
    const { result } = renderHook(useSessions);
    expect(result.current.sessionId).toBe("backend-old");
    let newId = "";
    act(() => {
      newId = result.current.createNewSession().id;
    });
    act(() => {
      result.current.updateSession("old", (session) => ({ ...session, drawIoXml: "<updated/>" }));
    });
    expect(result.current.currentSessionId).toBe(newId);
    expect(result.current.currentSession.drawIoXml).toBeNull();
    expect(result.current.getSession("old")?.drawIoXml).toBe("<updated/>");
    act(() => {
      result.current.loadSession("old");
      result.current.renameSession("old", " Renamed ");
    });
    expect(result.current.currentSession.title).toBe("Renamed");
    expect(JSON.parse(localStorage.getItem("drawio_sessions")!)[1].title).toBe("Renamed");
  });
  it("never resurrects a deleted session when a delayed response arrives", () => {
    const { result } = renderHook(useSessions);
    const id = result.current.currentSessionId;
    act(() => {
      result.current.deleteSession(id);
    });
    act(() => {
      result.current.updateSession(id, (session) => ({ ...session, title: "Late result" }));
    });
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.currentSessionId).not.toBe(id);
  });
  it("recovers corrupt storage and exposes persistence failures", () => {
    localStorage.setItem("drawio_sessions", "invalid json");
    const { result } = renderHook(useSessions);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    act(() => {
      result.current.renameSession(result.current.currentSessionId, "Still in memory");
    });
    expect(result.current.currentSession.title).toBe("Still in memory");
    expect(result.current.storageError).toContain("Unable to save");
    act(() => {
      expect(() => result.current.persistSessions()).toThrow("Unable to save");
    });
  });
});
