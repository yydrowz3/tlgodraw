import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSessions } from "@/hooks/useSessions";
describe("local drawing sessions", () => {
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
