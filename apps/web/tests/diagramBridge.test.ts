import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDiagramBridge } from "@/hooks/useDiagramBridge";
import type { Session } from "@/types/draw";
import type { Theme } from "@/utils/theme";
import type { DrawIoEmbedRef } from "react-drawio";

const initialSession: Session = {
  id: "a",
  title: "Drawing",
  messages: [],
  drawIoXml: "<old/>",
  lastModified: 1,
};
function mount() {
  const saveXml = vi.fn();
  const persist = vi.fn();
  const load = vi.fn();
  const exportDiagram = vi.fn();
  const hook = renderHook(
    ({ theme }: { theme: Theme }) => useDiagramBridge({ theme, initialSession, saveXml, persist }),
    { initialProps: { theme: "light" as Theme } },
  );
  act(() => {
    hook.result.current.drawioRef.current = { load, exportDiagram } as unknown as DrawIoEmbedRef;
    hook.result.current.onLoad();
  });
  return { ...hook, saveXml, persist, load, exportDiagram };
}
afterEach(() => vi.useRealTimers());
describe("diagram theme synchronization", () => {
  it("saves the newest XML before remounting and uses the final theme choice", async () => {
    const hook = mount();
    hook.rerender({ theme: "dark" });
    expect(hook.result.current.generation).toBe(0);
    expect(hook.result.current.syncing).toBe(true);
    hook.rerender({ theme: "light" });
    hook.rerender({ theme: "dark" });
    await act(async () => {
      hook.result.current.onExport({
        data: "svg",
        xml: "<edited/>",
        message: hook.exportDiagram.mock.calls[0][0],
      });
    });
    expect(hook.saveXml).toHaveBeenCalledWith("a", "<edited/>");
    expect(hook.persist).toHaveBeenCalledOnce();
    expect(hook.result.current.generation).toBe(1);
    expect(hook.result.current.mountXml).toBe("<edited/>");
    expect(hook.result.current.editorTheme).toBe("dark");
  });
  it("keeps the editor mounted on timeout and only retries explicitly", async () => {
    vi.useFakeTimers();
    const hook = mount();
    hook.rerender({ theme: "dark" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(hook.result.current.generation).toBe(0);
    expect(hook.result.current.themeError).toContain("timed out");
    expect(hook.exportDiagram).toHaveBeenCalledOnce();
    act(() => hook.result.current.retryTheme());
    expect(hook.exportDiagram).toHaveBeenCalledTimes(2);
    await act(async () => {
      hook.result.current.onExport({
        data: "svg",
        xml: "<edited/>",
        message: hook.exportDiagram.mock.calls[1][0],
      });
    });
    expect(hook.result.current.generation).toBe(1);
  });
  it("does not remount when durable saving fails", async () => {
    const hook = mount();
    hook.persist.mockImplementation(() => {
      throw new Error("Storage full");
    });
    hook.rerender({ theme: "dark" });
    await act(async () => {
      hook.result.current.onExport({
        data: "svg",
        xml: "<edited/>",
        message: hook.exportDiagram.mock.calls[0][0],
      });
    });
    expect(hook.result.current.generation).toBe(0);
    expect(hook.result.current.themeError).toBe("Storage full");
  });
  it("keeps newer AI results received during a theme snapshot", async () => {
    const hook = mount();
    hook.rerender({ theme: "dark" });
    act(() => hook.result.current.receiveDiagram("a", "<new-ai-result/>"));
    await act(async () => {
      hook.result.current.onExport({
        data: "old-svg",
        xml: "<old/>",
        message: hook.exportDiagram.mock.calls[0][0],
      });
    });
    expect(hook.result.current.mountXml).toBe("<new-ai-result/>");
    expect(hook.saveXml).not.toHaveBeenCalledWith("a", "<old/>");
  });
  it("ignores a diagram response for a different active session", () => {
    const hook = mount();
    act(() => hook.result.current.loadSession({ ...initialSession, id: "b", drawIoXml: "<b/>" }));
    act(() => hook.result.current.receiveDiagram("a", "<late-a/>"));
    expect(hook.load).toHaveBeenLastCalledWith({ xml: "<b/>", autosave: true });
  });
  it("ignores old autosaves while a newer AI diagram is waiting for an export", async () => {
    const hook = mount();
    let capture!: ReturnType<typeof hook.result.current.capture>;
    act(() => {
      capture = hook.result.current.capture("download");
    });
    act(() => {
      hook.result.current.receiveDiagram("a", "<new-ai-result/>");
      hook.result.current.onAutoSave({ xml: "<old-editor-content/>" });
    });
    await act(async () => {
      hook.result.current.onExport({
        data: "old-svg",
        xml: "<old/>",
        message: hook.exportDiagram.mock.calls[0][0],
      });
      await expect(capture).resolves.toMatchObject({ xml: "<new-ai-result/>" });
    });
    expect(hook.saveXml).not.toHaveBeenCalledWith("a", "<old-editor-content/>");
    expect(hook.load).toHaveBeenLastCalledWith({ xml: "<new-ai-result/>", autosave: true });
  });
});
