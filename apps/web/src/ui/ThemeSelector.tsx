import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeSelector() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div
      className="join rounded-lg border border-base-300 bg-base-100 p-0.5"
      role="group"
      aria-label="Appearance"
    >
      {(["light", "dark"] as const).map((theme) => {
        const Icon = theme === "light" ? SunIcon : MoonIcon;
        return (
          <button
            key={theme}
            type="button"
            className={`btn btn-square join-item min-h-11 min-w-11 border-0 ${resolvedTheme === theme ? "btn-primary" : "btn-ghost"}`}
            aria-label={theme === "light" ? "Light theme" : "Dark theme"}
            aria-pressed={resolvedTheme === theme}
            title={theme === "light" ? "Light theme" : "Dark theme"}
            onClick={() => setTheme(theme)}
          >
            <Icon size={18} weight="regular" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
