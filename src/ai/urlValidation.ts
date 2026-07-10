import { t } from "src/translations/helper";

export interface BaseUrlWarning {
  message: string;
  severity: "error" | "warning";
}

export class AIUrlHelper {
  /**
   * Validate the custom model base URL for common mistakes.
   * Throws an Error with a user-friendly message if the URL is invalid for the given format.
   */
  static validateBaseUrl(baseUrl: string, apiFormat: string): void {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
      throw new Error(t("Custom API Base URL is empty."));
    }

    // Check URL is parseable
    try {
      new URL(trimmed);
    } catch {
      throw new Error(t("Custom API Base URL is not a valid URL."));
    }

    if (apiFormat === "openai-compatible") {
      // Common mistakes for OpenAI-compatible endpoints
      const lower = trimmed.toLowerCase().replace(/\/+$/, "");

      if (lower.endsWith("/chat/completions")) {
        throw new Error(
          t("The URL should point to the server root (e.g. http://127.0.0.1:1234/v1), not to the full /chat/completions endpoint. The plugin appends the path automatically."),
        );
      }

      if (lower.endsWith("/chat")) {
        throw new Error(
          t("The URL seems to include a /chat segment. For OpenAI-compatible endpoints, use the base API path (e.g. http://127.0.0.1:1234/v1). The plugin adds /chat/completions automatically."),
        );
      }
    }
  }

  /**
   * Validate the base URL and return a list of warnings (non-blocking issues).
   * Returns an empty array if everything looks fine.
   */
  static getBaseUrlWarnings(baseUrl: string, apiFormat: string): BaseUrlWarning[] {
    const warnings: BaseUrlWarning[] = [];
    const trimmed = baseUrl.trim();
    if (!trimmed) return warnings;

    if (apiFormat === "openai-compatible") {
      const lower = trimmed.toLowerCase().replace(/\/+$/, "");

      if (lower.endsWith("/chat/completions")) {
        warnings.push({
          message: t("The URL includes the full /chat/completions path. Use the server root (e.g. http://127.0.0.1:1234/v1) instead — the plugin appends it automatically."),
          severity: "warning",
        });
      }

      if (lower.endsWith("/chat")) {
        warnings.push({
          message: t("The URL ends with /chat. For OpenAI-compatible servers, use e.g. http://127.0.0.1:1234/v1 — the plugin adds /chat/completions for you."),
          severity: "warning",
        });
      }
    }

    return warnings;
  }
}
