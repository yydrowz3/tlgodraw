import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVisualViewport } from "@/hooks/useVisualViewport";

const height = () => document.documentElement.style.getPropertyValue("--workbench-height");

describe("mobile visual viewport", () => {
  it("tracks keyboard resizing and uses the layout viewport while zoomed", () => {
    const viewport = Object.assign(new EventTarget(), { height: 700, scale: 1 });
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 900);
    const { unmount } = renderHook(useVisualViewport);
    expect(height()).toBe("700px");
    act(() => {
      viewport.height = 400;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(height()).toBe("400px");
    act(() => {
      viewport.scale = 2;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(height()).toBe("900px");
    act(() => {
      viewport.scale = 1;
      viewport.height = 650;
      window.dispatchEvent(new Event("resize"));
    });
    expect(height()).toBe("650px");
    unmount();
    expect(height()).toBe("");
    viewport.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    expect(height()).toBe("");
  });

  it("falls back to window height when visualViewport is unavailable and cleans up", () => {
    vi.stubGlobal("visualViewport", undefined);
    vi.stubGlobal("innerHeight", 800);
    const { unmount } = renderHook(useVisualViewport);
    expect(height()).toBe("800px");
    act(() => {
      vi.stubGlobal("innerHeight", 500);
      window.dispatchEvent(new Event("resize"));
    });
    expect(height()).toBe("500px");
    unmount();
    window.dispatchEvent(new Event("resize"));
    expect(height()).toBe("");
  });
});
