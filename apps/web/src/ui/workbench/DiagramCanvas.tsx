import { DrawIoEmbed } from "react-drawio";
import type { useDiagramBridge } from "@/hooks/useDiagramBridge";
type Props = ReturnType<typeof useDiagramBridge>;
export function DiagramCanvas({
  drawioRef,
  generation,
  mountXml,
  onLoad,
  onAutoSave,
  onExport,
  editorTheme,
  ready,
  busy,
  syncing,
  loadError,
  retryLoad,
}: Props) {
  return (
    <main
      className="diagram-canvas relative flex min-h-0 min-w-0 flex-1 flex-col bg-base-200 p-1.5 sm:p-3"
      aria-label="Diagram canvas"
    >
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
        <DrawIoEmbed
          key={generation}
          ref={drawioRef}
          baseUrl={import.meta.env.VITE_DRAWIO_BASE_URL || "https://embed.diagrams.net"}
          xml={mountXml}
          autosave
          onLoad={onLoad}
          onAutoSave={onAutoSave}
          onExport={onExport}
          urlParameters={{
            ui: "min",
            dark: editorTheme === "dark",
            spin: true,
            libraries: true,
            saveAndExit: false,
            noSaveBtn: true,
            noExitBtn: true,
          }}
        />
        {(!ready || busy || syncing) && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-base-100/85 p-5 text-center"
            role="status"
          >
            <span className="loading loading-spinner loading-md text-primary" />
            <p className="text-sm text-base-content/70">
              {syncing
                ? "Saving diagram and updating appearance…"
                : busy
                  ? "Saving diagram…"
                  : "Loading diagram editor…"}
            </p>
            {loadError && (
              <>
                <p className="max-w-sm text-error">{loadError}</p>
                <button className="btn btn-outline min-h-11" onClick={retryLoad}>
                  Retry
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
