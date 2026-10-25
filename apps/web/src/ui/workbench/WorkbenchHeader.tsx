import {
  ChatCircleIcon,
  DownloadSimpleIcon,
  ListIcon,
  PolygonIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { ThemeSelector } from "@/ui/ThemeSelector";

type Props = {
  currentUser: string;
  canExport: boolean;
  historyOpen: boolean;
  assistantOpen: boolean;
  onHistory: () => void;
  onAssistant: () => void;
  onExport: () => void;
  onLogout: () => void;
};
export function WorkbenchHeader(props: Props) {
  return (
    <header className="navbar min-h-18 shrink-0 gap-1 border-b border-base-300 bg-base-100 px-2 sm:gap-3 sm:px-5">
      <button
        className="icon-button xl:hidden"
        type="button"
        aria-label="绘图记录"
        aria-expanded={props.historyOpen}
        aria-controls="session-panel"
        onClick={props.onHistory}
      >
        <ListIcon size={21} aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content sm:flex">
          <PolygonIcon size={23} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight sm:text-lg">
            too long; go draw!
          </h1>
          <p className="hidden text-xs text-base-content/50 lg:block">@yydrowz3</p>
        </div>
      </div>
      <span className="badge badge-outline hidden gap-2 border-base-300 px-3 py-3 text-xs lg:inline-flex">
        <span className="size-1.5 rounded-full bg-primary" />
        {props.currentUser || "Guest"}
      </span>
      <ThemeSelector />
      <button
        className="btn btn-ghost min-h-11 gap-2 px-2 sm:px-3"
        type="button"
        disabled={!props.canExport}
        onClick={props.onExport}
        aria-label="Export"
      >
        <DownloadSimpleIcon size={20} aria-hidden="true" />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button
        className={`icon-button ${props.assistantOpen ? "text-primary" : ""}`}
        type="button"
        aria-label="Open Assistant"
        aria-expanded={props.assistantOpen}
        aria-controls="assistant-panel"
        onClick={props.onAssistant}
      >
        <ChatCircleIcon size={21} aria-hidden="true" />
      </button>
      <button
        className="icon-button hidden hover:text-error sm:inline-flex"
        type="button"
        aria-label="Logout"
        onClick={props.onLogout}
      >
        <SignOutIcon size={20} aria-hidden="true" />
      </button>
    </header>
  );
}
