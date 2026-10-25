import { useSyncExternalStore } from "react";
import { createThemeStore } from "@/utils/themeStore";
const store = createThemeStore();
if (import.meta.hot) import.meta.hot.dispose(() => store.dispose());
export function useTheme() {
  return { ...useSyncExternalStore(store.subscribe, store.getSnapshot), setTheme: store.setTheme };
}
