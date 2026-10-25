import { describe, expect, it, vi } from "vitest";
import { createThemeStore } from "@/utils/themeStore";
import { THEME_STORAGE_KEY } from "@/utils/theme";

function system(dark: boolean) {
  let matches = dark;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, handler: EventListenerOrEventListenerObject) =>
          listeners.add(handler as () => void),
        removeEventListener: (_type: string, handler: EventListenerOrEventListenerObject) =>
          listeners.delete(handler as () => void),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
  return (value: boolean) => {
    matches = value;
    listeners.forEach((listener) => listener());
  };
}
describe("application appearance", () => {
  it("follows system changes until an explicit preference is chosen", () => {
    const changeSystem = system(true);
    const store = createThemeStore();
    expect(store.getSnapshot()).toEqual({ preference: null, resolvedTheme: "dark" });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    changeSystem(false);
    expect(store.getSnapshot().resolvedTheme).toBe("light");
    store.setTheme("light");
    changeSystem(true);
    expect(store.getSnapshot()).toEqual({ preference: "light", resolvedTheme: "light" });
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    store.dispose();
  });
  it("remembers an explicit choice across mounts and refreshes", () => {
    system(true);
    const first = createThemeStore();
    first.setTheme("light");
    first.dispose();
    const next = createThemeStore();
    expect(next.getSnapshot()).toEqual({ preference: "light", resolvedTheme: "light" });
    next.dispose();
  });
  it("treats invalid storage as no preference and never writes an implicit choice", () => {
    system(true);
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    const store = createThemeStore();
    expect(store.getSnapshot()).toEqual({ preference: null, resolvedTheme: "dark" });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    store.dispose();
  });
  it("keeps a choice in memory when storage is unavailable", () => {
    const changeSystem = system(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    const store = createThemeStore();
    store.setTheme("dark");
    changeSystem(false);
    expect(store.getSnapshot()).toEqual({ preference: "dark", resolvedTheme: "dark" });
    store.dispose();
  });
  it("synchronizes explicit choices from another tab", () => {
    system(false);
    const store = createThemeStore();
    const notify = vi.fn();
    const unsubscribe = store.subscribe(notify);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }));
    expect(store.getSnapshot().resolvedTheme).toBe("dark");
    expect(notify).toHaveBeenCalledOnce();
    unsubscribe();
    store.dispose();
  });
});
