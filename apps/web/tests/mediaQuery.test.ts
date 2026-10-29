import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function mediaQuery(initial: boolean) {
  const target = new EventTarget();
  const media = Object.assign(target, {
    matches: initial,
    addEventListener: vi.fn(target.addEventListener.bind(target)),
    removeEventListener: vi.fn(target.removeEventListener.bind(target)),
  });
  return {
    media: media as unknown as MediaQueryList,
    change(matches: boolean) {
      media.matches = matches;
      media.dispatchEvent(new Event("change"));
    },
  };
}

describe("responsive media queries", () => {
  it.each([true, false])("reads the initial match (%s) and reacts to changes", (initial) => {
    const query = mediaQuery(initial);
    vi.spyOn(window, "matchMedia").mockReturnValue(query.media);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(initial);
    act(() => query.change(!initial));
    expect(result.current).toBe(!initial);
  });

  it("switches subscriptions when the query changes and releases them on unmount", () => {
    const narrow = mediaQuery(false);
    const wide = mediaQuery(true);
    vi.spyOn(window, "matchMedia").mockImplementation((query) =>
      query === "(min-width: 768px)" ? narrow.media : wide.media,
    );
    const { result, rerender, unmount } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: "(min-width: 768px)" },
    });
    const narrowListener = vi.mocked(narrow.media.addEventListener).mock.calls[0][1];
    rerender({ query: "(min-width: 1024px)" });
    expect(result.current).toBe(true);
    expect(narrow.media.removeEventListener).toHaveBeenCalledWith("change", narrowListener);
    act(() => narrow.change(true));
    expect(result.current).toBe(true);
    act(() => wide.change(false));
    expect(result.current).toBe(false);
    const wideListener = vi.mocked(wide.media.addEventListener).mock.calls[0][1];
    unmount();
    expect(wide.media.removeEventListener).toHaveBeenCalledWith("change", wideListener);
  });
});
