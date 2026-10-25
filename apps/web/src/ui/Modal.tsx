import { useTranslation } from "react-i18next";
import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        className={`modal-box flex max-h-[90dvh] flex-col gap-5 border border-base-300 p-5 sm:p-6 ${wide ? "max-w-4xl" : "max-w-md"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={t("common.closeDialog")}
            onClick={onClose}
          >
            <XIcon size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button
          aria-label={t("common.closeBackdrop")}
          onClick={(event) => {
            event.preventDefault();
            onClose();
          }}
        >
          {t("common.closeDialog")}
        </button>
      </form>
    </dialog>
  );
}
