import { useTranslation } from "react-i18next";
import { useState } from "react";
import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import type { Session } from "@/types/draw";
import { useWorkbench } from "@/hooks/useWorkbench";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { WorkbenchHeader } from "./workbench/WorkbenchHeader";
import { SessionSidebar } from "./workbench/SessionSidebar";
import { DiagramCanvas } from "./workbench/DiagramCanvas";
import { AssistantPanel } from "./workbench/AssistantPanel";
import { SidePanel } from "./workbench/SidePanel";
import { ExportDialog } from "./workbench/ExportDialog";
import { RenameSessionDialog } from "./workbench/RenameSessionDialog";

export default function Workbench() {
  const { t } = useTranslation();
  useVisualViewport();
  const model = useWorkbench();
  const wide = useMediaQuery("(min-width: 1280px)");
  const mobile = useMediaQuery("(max-width: 767px)");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );
  const [renaming, setRenaming] = useState<Session | null>(null);
  const historyVisible = wide || historyOpen;
  const assistantVisible = assistantOpen && !(mobile && historyOpen);
  const overlay = (!wide && historyOpen) || (mobile && assistantVisible);
  const disabled =
    model.operationBusy || model.bridge.busy || model.bridge.syncing || !model.bridge.ready;
  const toggleHistory = () => {
    setHistoryOpen(!historyOpen);
    if (mobile) setAssistantOpen(false);
  };
  const toggleAssistant = () => {
    setAssistantOpen(!assistantOpen);
    if (mobile) setHistoryOpen(false);
  };
  return (
    <div className="flex h-[var(--workbench-height,100dvh)] w-full flex-col overflow-hidden bg-base-200 text-base-content">
      <div inert={overlay}>
        <WorkbenchHeader
          currentUser={model.currentUser}
          canExport={!disabled}
          historyOpen={historyVisible}
          assistantOpen={assistantVisible}
          onHistory={toggleHistory}
          onAssistant={toggleAssistant}
          onExport={() => void model.exportDiagram()}
          onLogout={() => void model.logout()}
        />
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <SidePanel
          id="session-panel"
          label={t("sessions.history")}
          side="left"
          visible={historyVisible}
          overlay={!wide}
          onClose={() => setHistoryOpen(false)}
        >
          <SessionSidebar
            sessions={model.sessions}
            currentId={model.currentSessionId}
            disabled={disabled}
            onNew={() => {
              void model.newChat();
              if (!wide) setHistoryOpen(false);
            }}
            onSelect={(id) => {
              void model.switchSession(id);
              if (!wide) setHistoryOpen(false);
            }}
            onRename={setRenaming}
            onDelete={(id) => void model.deleteSession(id)}
            onClose={() => setHistoryOpen(false)}
            onLogout={() => void model.logout()}
          />
        </SidePanel>
        <div inert={overlay} className="flex min-h-0 min-w-0 flex-1 flex-col">
          {(model.notice || model.storageError) && (
            <div
              className="alert rounded-none border-0 border-b border-base-300 bg-base-100 px-4 py-2 text-sm"
              role="alert"
            >
              <WarningCircleIcon size={19} className="shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 break-words">{model.storageError || model.notice}</span>
              {!model.storageError && (
                <button
                  className="icon-button"
                  onClick={model.dismissNotice}
                  aria-label={t("workbench.dismiss")}
                >
                  <XIcon size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {model.bridge.themeError && (
            <div
              className="flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-100 px-4 py-2 text-xs"
              role="alert"
            >
              <WarningCircleIcon size={18} className="text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {t("canvas.themeFailed", { message: model.bridge.themeError })}
              </span>
              <button
                className="btn btn-outline btn-sm min-h-11"
                onClick={model.bridge.retryTheme}
                disabled={model.bridge.syncing}
              >
                {t("common.retry")}
              </button>
            </div>
          )}
          <DiagramCanvas {...model.bridge} />
        </div>
        <SidePanel
          id="assistant-panel"
          label={t("assistant.title")}
          inactive={!wide && historyOpen}
          side="right"
          visible={assistantVisible}
          overlay={mobile}
          onClose={() => setAssistantOpen(false)}
        >
          <AssistantPanel
            agents={model.agents}
            status={model.agentStatus}
            selectedId={model.selectedAgentId}
            disabled={model.isSending || model.operationBusy}
            onAgent={model.selectAgent}
            onRetry={model.retryAgents}
            onClose={() => setAssistantOpen(false)}
            messages={{
              messages: model.messages,
              isSending: model.sendingSessionId === model.currentSessionId,
              visible: assistantVisible,
            }}
            composer={{
              value: model.inputValue,
              onChange: model.setInputValue,
              isSending: model.isSending,
              disabled: disabled || model.agentStatus !== "ready",
              context: model.useHistoryContext,
              onContext: () => model.setUseHistoryContext(!model.useHistoryContext),
              showQuickActions: model.messages.length <= 1,
              onSend: () => void model.sendMessage(),
              onRestart: () => void model.restartSession(),
            }}
          />
        </SidePanel>
      </div>
      {model.imgData && (
        <ExportDialog data={model.imgData} onClose={() => model.setImgData(null)} />
      )}
      {renaming && (
        <RenameSessionDialog
          session={renaming}
          onClose={() => setRenaming(null)}
          onSave={model.renameSession}
        />
      )}
    </div>
  );
}
