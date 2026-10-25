import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { Session } from "@/types/draw";
import { Modal } from "@/ui/Modal";
export function RenameSessionDialog({
  session,
  onClose,
  onSave,
}: {
  session: Session;
  onClose: () => void;
  onSave: (id: string, title: string) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(
    session.isDefaultTitle ? t("sessions.newChat") : session.title,
  );
  return (
    <Modal title={t("sessions.rename")} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) {
            onSave(session.id, title);
            onClose();
          }
        }}
      >
        <fieldset className="fieldset">
          <label htmlFor="session-title" className="fieldset-label text-base-content">
            {t("sessions.name")}
          </label>
          <input
            id="session-title"
            data-autofocus
            className="input min-h-11 w-full"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("sessions.namePlaceholder")}
          />
        </fieldset>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary min-h-11" disabled={!title.trim()}>
            {t("sessions.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
