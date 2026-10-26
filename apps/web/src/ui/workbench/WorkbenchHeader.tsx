import { useTranslation } from "react-i18next";
import { ChatCircleIcon, DownloadSimpleIcon, ListIcon, SignOutIcon } from "@phosphor-icons/react";
import { LanguageSelector } from "@/ui/LanguageSelector";
import { ThemeSelector } from "@/ui/ThemeSelector";
import { BrandMark } from "@/ui/BrandMark";

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
  const { t } = useTranslation();
  return (
    <header className="navbar grid min-h-18 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-1 border-b border-base-300 bg-base-100 px-2 pt-2 sm:flex sm:gap-3 sm:px-5 sm:pt-0">
      <button
        className="icon-button xl:hidden"
        type="button"
        aria-label={t("sessions.history")}
        aria-expanded={props.historyOpen}
        aria-controls="session-panel"
        onClick={props.onHistory}
      >
        <ListIcon size={21} aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <BrandMark size={48} className="hidden sm:block" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight sm:text-lg">
            Too Long; Go Draw!
          </h1>
          {/* <p className="hidden text-xs text-base-content/50 lg:block">@yydrowz3</p> */}
        </div>
      </div>
      <span className="badge badge-outline hidden gap-2 border-base-300 px-3 py-3 text-xs lg:inline-flex">
        <span className="size-1.5 rounded-full bg-primary" />
        {props.currentUser || t("common.guest")}
      </span>
      <div className="col-span-4 row-start-2 flex justify-end gap-2 pb-2 sm:contents">
        <LanguageSelector />
        <ThemeSelector />
      </div>
      <button
        className="btn btn-ghost col-start-3 row-start-1 min-h-11 gap-2 px-2 sm:px-3"
        type="button"
        disabled={!props.canExport}
        onClick={props.onExport}
        aria-label={t("export.action")}
      >
        <DownloadSimpleIcon size={20} aria-hidden="true" />
        <span className="hidden sm:inline">{t("export.action")}</span>
      </button>
      <button
        className={`icon-button col-start-4 row-start-1 ${props.assistantOpen ? "text-primary" : ""}`}
        type="button"
        aria-label={t("assistant.open")}
        aria-expanded={props.assistantOpen}
        aria-controls="assistant-panel"
        onClick={props.onAssistant}
      >
        <ChatCircleIcon size={21} aria-hidden="true" />
      </button>
      <button
        className="icon-button hidden hover:text-error sm:inline-flex"
        type="button"
        aria-label={t("common.logout")}
        onClick={props.onLogout}
      >
        <SignOutIcon size={20} aria-hidden="true" />
      </button>
    </header>
  );
}
