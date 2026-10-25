import {
  applyTheme,
  readThemePreference,
  systemTheme,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemeState,
} from "./theme";

export function createThemeStore() {
  const preference = readThemePreference();
  let state: ThemeState = { preference, resolvedTheme: preference ?? systemTheme() };
  const listeners = new Set<() => void>();
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(state.resolvedTheme);
  function publish(next: Theme | null) {
    state = { preference: next, resolvedTheme: next ?? systemTheme() };
    applyTheme(state.resolvedTheme);
    listeners.forEach((listener) => listener());
  }
  const systemChange = () => {
    if (state.preference === null) publish(null);
  };
  const storageChange = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) publish(readThemePreference());
  };
  media.addEventListener("change", systemChange);
  window.addEventListener("storage", storageChange);
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setTheme(theme: Theme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        /* Keep the in-memory choice. */
      }
      publish(theme);
    },
    dispose() {
      media.removeEventListener("change", systemChange);
      window.removeEventListener("storage", storageChange);
      listeners.clear();
    },
  };
}
