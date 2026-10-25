import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { Modal } from "@/ui/Modal";
export function ExportDialog({ data, onClose }: { data: string; onClose: () => void }) {
  return (
    <Modal title="Export Ready" onClose={onClose} wide>
      <p className="text-sm text-base-content/60">Your diagram has been successfully converted</p>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-base-300 bg-base-200 p-3 sm:p-6">
        <img
          src={data}
          alt="Exported diagram"
          className="mx-auto h-auto max-w-full rounded bg-white"
        />
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <button className="btn btn-ghost min-h-11" onClick={onClose}>
          Close Preview
        </button>
        <a href={data} download="diagram.svg" className="btn btn-primary min-h-11">
          <DownloadSimpleIcon size={18} aria-hidden="true" />
          Download File
        </a>
      </div>
    </Modal>
  );
}
