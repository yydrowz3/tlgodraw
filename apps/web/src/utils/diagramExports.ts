import { AppError } from "@/i18n/messages";
import type { DrawIoEmbedRef } from "react-drawio";
export type ExportPurpose = "download" | "context" | "autosave" | "theme";
export type DiagramExport = { data: string; xml: string; sessionId: string };
export type ExportAction = Parameters<DrawIoEmbedRef["exportDiagram"]>[0] & { requestId: string };
export type ExportEvent = {
  data?: string;
  xml?: string;
  error?: string;
  message?: { format?: string; requestId?: string };
};
type Job = {
  id: string;
  purpose: ExportPurpose;
  sessionId: string;
  resolve: (result: DiagramExport) => void;
  reject: (error: Error) => void;
};

/** Serializes exports and ignores delayed events belonging to timed-out jobs. */
export class DiagramExportQueue {
  private jobs: Job[] = [];
  private active: Job | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private send: (action: ExportAction) => void;
  private onBusy: (busy: boolean) => void;
  constructor(send: (action: ExportAction) => void, onBusy: (busy: boolean) => void) {
    this.send = send;
    this.onBusy = onBusy;
  }
  request(purpose: ExportPurpose, sessionId: string): Promise<DiagramExport> {
    return new Promise((resolve, reject) => {
      this.jobs.push({ id: crypto.randomUUID(), purpose, sessionId, resolve, reject });
      this.pump();
    });
  }
  private pump() {
    if (this.active) return;
    const job = this.jobs.shift();
    this.onBusy(Boolean(job));
    if (!job) return;
    this.active = job;
    this.timer = setTimeout(
      () => this.finish(new AppError("errors.exportTimeout")),
      10_000,
    );
    try {
      this.send({ format: "xmlsvg", requestId: job.id });
    } catch (error) {
      this.finish(error instanceof Error ? error : new AppError("errors.exportFailed"));
    }
  }
  receive(event: ExportEvent) {
    if (!this.active || event.message?.requestId !== this.active.id) return;
    if (event.error || !event.xml || !event.data) {
      this.finish(new AppError(event.error ? "errors.exportFailed" : "errors.incompleteDiagram", { detail: event.error }));
    } else {
      this.finish(undefined, {
        xml: event.xml,
        data: event.data,
        sessionId: this.active.sessionId,
      });
    }
  }
  private finish(error?: Error, result?: DiagramExport) {
    clearTimeout(this.timer);
    const job = this.active;
    this.active = null;
    if (job) {
      if (error) job.reject(error);
      else if (result) job.resolve(result);
    }
    this.pump();
  }
  dispose() {
    clearTimeout(this.timer);
    const jobs = [...(this.active ? [this.active] : []), ...this.jobs];
    this.active = null;
    this.jobs = [];
    jobs.forEach((job) => job.reject(new AppError("errors.editorClosed")));
    this.onBusy(false);
  }
}
