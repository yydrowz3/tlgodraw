import { useTranslation } from "react-i18next";
import {
  ChatCircleTextIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  SignOutIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { Session } from "@/types/draw";

type Props = {
  sessions: Session[];
  currentId: string;
  disabled: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (session: Session) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onLogout: () => void;
};
export function SessionSidebar(props: Props) {
  const { t, i18n } = useTranslation();
  return (
    <>
      <div className="panel-heading">
        <h2 className="flex items-center gap-2 font-semibold">
          <ChatCircleTextIcon size={19} className="text-primary" aria-hidden="true" />
          {t("sessions.history")}
        </h2>
        <div className="flex">
          <button
            className="icon-button"
            disabled={props.disabled}
            onClick={props.onNew}
            aria-label={t("sessions.newChat")}
          >
            <PlusIcon size={20} aria-hidden="true" />
          </button>
          <button
            className="icon-button xl:hidden"
            onClick={props.onClose}
            aria-label={t("sessions.closeHistory")}
          >
            <XIcon size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label={t("sessions.history")}>
        <ul className="space-y-1">
          {[...props.sessions]
            .sort((a, b) => b.lastModified - a.lastModified)
            .map((session) => (
              <li
                key={session.id}
                className={`group flex min-w-0 items-center rounded-lg border ${session.id === props.currentId ? "border-primary/20 bg-primary/10" : "border-transparent hover:bg-base-200"}`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-lg px-3 py-3 text-left focus-visible:z-10"
                  aria-current={session.id === props.currentId ? "page" : undefined}
                  disabled={props.disabled}
                  onClick={() => props.onSelect(session.id)}
                  onDoubleClick={() => props.onRename(session)}
                >
                  <span
                    className={`block truncate text-sm font-medium ${session.id === props.currentId ? "text-primary" : ""}`}
                  >
                    {session.isDefaultTitle ? t("sessions.newChat") : session.title}
                  </span>
                  <span className="mt-1 block text-xs text-base-content/50">
                    {new Date(session.lastModified).toLocaleDateString(i18n.resolvedLanguage)}{" "}
                    {new Date(session.lastModified).toLocaleTimeString(i18n.resolvedLanguage, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
                <details
                  className="dropdown dropdown-end mr-1 shrink-0"
                  onClick={(event) => event.stopPropagation()}
                >
                  <summary
                    className="icon-button list-none"
                    aria-label={t("sessions.actions", {
                      title: session.isDefaultTitle ? t("sessions.newChat") : session.title,
                    })}
                  >
                    <DotsThreeIcon size={23} aria-hidden="true" />
                  </summary>
                  <ul className="menu dropdown-content z-50 w-48 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
                    <li>
                      <button
                        className="min-h-11"
                        disabled={props.disabled}
                        onClick={(event) => {
                          const menu = event.currentTarget.closest("details");
                          menu?.removeAttribute("open");
                          menu?.querySelector("summary")?.focus();
                          props.onRename(session);
                        }}
                      >
                        <PencilSimpleIcon size={16} aria-hidden="true" />
                        {t("sessions.rename")}
                      </button>
                    </li>
                    <li>
                      <button
                        className="min-h-11 text-error"
                        disabled={props.disabled}
                        onClick={(event) => {
                          const menu = event.currentTarget.closest("details");
                          menu?.removeAttribute("open");
                          menu?.querySelector("summary")?.focus();
                          props.onDelete(session.id);
                        }}
                      >
                        <TrashIcon size={16} aria-hidden="true" />
                        {t("sessions.delete")}
                      </button>
                    </li>
                  </ul>
                </details>
              </li>
            ))}
        </ul>
      </nav>
      <div className="border-t border-base-300 p-3">
        <p className="mb-2 px-2 text-xs text-base-content/50">{t("sessions.savedLocally")}</p>
        <button
          className="btn btn-ghost min-h-11 w-full justify-start sm:hidden"
          onClick={props.onLogout}
        >
          <SignOutIcon size={18} aria-hidden="true" />
          {t("common.logout")}
        </button>
      </div>
    </>
  );
}
