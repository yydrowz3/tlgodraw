export type Theme = "light" | "dark";
export type ThemeState = { preference: Theme | null; resolvedTheme: Theme };
export const THEME_STORAGE_KEY = "tlgodraw_theme";

export function readThemePreference(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}
export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
