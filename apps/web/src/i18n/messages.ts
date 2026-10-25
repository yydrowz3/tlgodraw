import { i18n } from "./index";
import type en from "./locales/en";

export type ErrorKey = `errors.${keyof typeof en.errors}` | "assistant.selectRequired";

/** Keep semantic errors in state so existing notices follow language changes. */
export class AppError extends Error {
  readonly key: ErrorKey;
  readonly detail?: string;
  readonly status?: number;
  readonly code?: string;

  constructor(key: ErrorKey, options: { detail?: string; status?: number; code?: string } = {}) {
    super(options.detail || i18n.t(key, { status: options.status }));
    this.name = "AppError";
    this.key = key;
    this.detail = options.detail;
    this.status = options.status;
    this.code = options.code;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof AppError) {
    const summary = i18n.t(error.key, { status: error.status });
    return error.detail ? `${summary} ${error.detail}` : summary;
  }
  const summary = i18n.t("errors.unknown");
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return detail ? `${summary} ${detail}` : summary;
}

export const apiErrorKeys: Record<string, ErrorKey> = {
  "0001": "errors.apiUnknown",
  "0002": "errors.apiParameter",
  "0003": "errors.apiAgent",
};
