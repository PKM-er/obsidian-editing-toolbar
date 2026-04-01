import { Notice } from "obsidian";
import { t } from "src/translations/helper";

const NOTICE_THROTTLE_MS = 6000;
const noticeHistory = new Map<string, number>();

export class AIUserNoticeError extends Error {
  noticeDuration: number;

  constructor(message: string, noticeDuration = 8000) {
    super(message);
    this.name = "AIUserNoticeError";
    this.noticeDuration = noticeDuration;
  }
}

export function getRequestErrorStatus(error: unknown): number | null {
  const directStatus = (error as { status?: unknown } | null)?.status;
  if (typeof directStatus === "number") {
    return directStatus;
  }

  const responseStatus = (error as { response?: { status?: unknown } } | null)?.response?.status;
  if (typeof responseStatus === "number") {
    return responseStatus;
  }

  return null;
}

export function getAIErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  const response = (error as { response?: { json?: any; text?: unknown } } | null)?.response;
  const responseMessage = response?.json?.error?.message || response?.json?.message || response?.text;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage.trim();
  }

  return t("Unknown connection error.");
}

export function showAIErrorNotice(error: unknown): boolean {
  if (!(error instanceof AIUserNoticeError)) {
    return false;
  }

  const now = Date.now();
  const lastShownAt = noticeHistory.get(error.message) ?? 0;
  if (now - lastShownAt < NOTICE_THROTTLE_MS) {
    return true;
  }

  noticeHistory.set(error.message, now);
  new Notice(error.message, error.noticeDuration);
  return true;
}
