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
  const [title, setTitle] = useState(session.title);
  return (
    <Modal title="Rename Session" onClose={onClose}>
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
            Session Name
          </label>
          <input
            id="session-title"
            data-autofocus
            className="input min-h-11 w-full"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter new name"
          />
        </fieldset>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary min-h-11" disabled={!title.trim()}>
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
