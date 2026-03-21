import { MarkdownView, Notice, type Editor } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { TextInputModal } from "src/modals/TextInputModal";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { ToolbarAIService } from "./AIService";
import { PKMerAuthService } from "./PKMerAuthService";
import { DEFAULT_REWRITE_ACTIONS, type RewriteInstruction } from "./types";
import { createAIEditorExtensions, startRewriteEffect, triggerCompletionEffect } from "./extensions";

export class AIEditorManager {
  private plugin: EditingToolbarPlugin;
  private authService: PKMerAuthService;
  private aiService: ToolbarAIService;

  constructor(plugin: EditingToolbarPlugin) {
    this.plugin = plugin;
    this.authService = new PKMerAuthService(plugin);
    this.aiService = new ToolbarAIService(plugin, this.authService);
  }

  onload(): void {
    this.authService.loadSecrets();
    void this.authService.migrateCustomModelApiKeyFromSettings();
    const registerHandler = (this.plugin as any).registerObsidianProtocolHandler;
    if (typeof registerHandler === "function") {
      registerHandler.call(this.plugin, "editing-toolbar-pkmer-auth", async (params: Record<string, string>) => {
        if (params.code && params.state) {
          await this.authService.handleOAuthCallback(params.code, params.state);
        }
      });
    }
  }

  onunload(): void {
    this.authService.onunload();
  }

  createExtension() {
    return createAIEditorExtensions({
      getService: () => (this.plugin.settings.ai.enabled ? this.aiService : null),
      getCompletionConfig: () => ({
        trigger: this.plugin.settings.ai.enableInlineCompletion ? this.plugin.settings.ai.completionTrigger : "manual",
        delay: this.plugin.settings.ai.completionDelay,
      }),
      getRewriteConfig: () => ({
        actions: DEFAULT_REWRITE_ACTIONS,
        minSelectionLength: this.plugin.settings.ai.rewriteMinSelectionLength,
        showToolbarOnSelection:
          this.plugin.settings.ai.enabled &&
          this.plugin.settings.ai.enableRewrite &&
          this.plugin.settings.ai.showRewriteToolbarOnSelection,
      }),
    });
  }

  async loginWithPKMer(): Promise<void> {
    await this.authService.login();
  }

  async logoutFromPKMer(): Promise<void> {
    await this.authService.logout();
  }

  async refreshPKMerQuota(): Promise<void> {
    const quota = await this.authService.refreshQuota();
    if (!quota) {
      new Notice(t("Unable to refresh PKMer quota."));
      return;
    }
    new Notice(`${t("PKMer quota refreshed:")} ${Number((quota.quota / 500000).toFixed(2))}`);
  }

  getPKMerStatusText(): string {
    const userInfo = this.plugin.settings.ai.pkmer.userInfo;
    if (!userInfo) {
      return t("Not logged in");
    }

    const parts: string[] = [];
    if (userInfo.name) parts.push(userInfo.name);
    if (userInfo.email) parts.push(userInfo.email);
    if (userInfo.ai_quota?.quota !== undefined) {
      parts.push(`${t("Quota")}: ${Number((userInfo.ai_quota.quota / 500000).toFixed(2))}`);
    }
    return parts.join(" / ") || t("Logged in");
  }

  hasSecureStorage(): boolean {
    return this.authService.hasSecureStorage;
  }

  async getProviderRouteStatusText(): Promise<string> {
    try {
      const pkmerAvailable = await this.isPKMerAvailable();
      const customAvailable = this.aiService.hasCustomProviderConfigured();

      if (pkmerAvailable && customAvailable) {
        return t("Current route: PKMer AI. If unavailable, it falls back to your custom model.");
      }

      if (pkmerAvailable) {
        return t("Current route: PKMer AI.");
      }

      if (customAvailable) {
        return t("Current route: Custom model.");
      }

      if (this.plugin.settings.ai.enableCustomModel) {
        return t("No provider available. Log in to PKMer or complete the custom model settings.");
      }

      return t("No provider available. Log in to PKMer to enable AI.");
    } catch (error) {
      console.error("[AI Settings] Failed to determine provider route:", error);
      return t("Unable to determine current AI route.");
    }
  }

  hasCustomModelApiKey(): boolean {
    return !!this.authService.customModelApiKey;
  }

  saveCustomModelApiKey(apiKey: string): void {
    this.authService.setCustomModelApiKey(apiKey);
  }

  clearCustomModelApiKey(): void {
    this.authService.clearCustomModelApiKey();
  }

  hasCustomModelReadyForTest(): boolean {
    return this.aiService.hasCustomProviderConfigured();
  }

  async testCustomModelConnection(): Promise<boolean> {
    if (!this.hasCustomModelReadyForTest()) {
      new Notice(t("Please fill in Custom API Base URL, Custom Model Name, and Custom API Key first."));
      return false;
    }

    new Notice(t("Testing custom model connection..."));

    try {
      await this.aiService.testCustomProviderConnection();
      const model = this.plugin.settings.ai.customModel.model.trim();
      new Notice(`${t("Custom model connection succeeded.")} ${model}`.trim());
      return true;
    } catch (error) {
      const message = this.getErrorMessage(error);
      new Notice(`${t("Custom model connection failed:")} ${message}`);
      return false;
    }
  }

  triggerInlineCompletion(editor?: Editor | null): boolean {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }
    if (!this.plugin.settings.ai.enableInlineCompletion) {
      new Notice(t("Inline completion is disabled in settings."));
      return false;
    }

    const view = this.getEditorView(editor);
    if (!view) {
      new Notice(t("Current editor does not support AI inline completion."));
      return false;
    }

    view.dispatch({ effects: triggerCompletionEffect.of(undefined) });
    return true;
  }

  async startRewrite(editor?: Editor | null, instruction: RewriteInstruction = "improve", customPrompt?: string): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }
    if (!this.plugin.settings.ai.enableRewrite) {
      new Notice(t("AI rewrite is disabled in settings."));
      return false;
    }

    const resolvedEditor = this.resolveEditor(editor);
    if (!resolvedEditor || !resolvedEditor.somethingSelected()) {
      new Notice("Please select text first");
      return false;
    }

    const view = this.getEditorView(resolvedEditor);
    if (!view) {
      new Notice(t("Current editor does not support AI rewrite."));
      return false;
    }

    const from = resolvedEditor.posToOffset(resolvedEditor.getCursor("from"));
    const to = resolvedEditor.posToOffset(resolvedEditor.getCursor("to"));
    view.dispatch({
      effects: startRewriteEffect.of({
        from,
        to,
        originalText: resolvedEditor.getSelection(),
        instruction,
        customPrompt,
      }),
    });
    return true;
  }

  openCustomRewrite(editor?: Editor | null): void {
    new TextInputModal(
      this.plugin.app,
      t("AI Custom Instruction"),
      [
        {
          key: "prompt",
          label: t("Instruction"),
          placeholder: t("Please enter your custom AI instruction"),
          defaultValue: "",
        },
      ],
      (result) => {
        const prompt = result.prompt?.trim();
        if (!prompt) {
          return;
        }
        void this.startRewrite(editor, "custom", prompt);
      },
    ).open();
  }

  private resolveEditor(editor?: Editor | null): Editor | null {
    if (editor) {
      return editor;
    }
    return this.plugin.commandsManager?.getActiveEditor() ?? ((this.plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView | null)?.editor ?? null);
  }

  private getEditorView(editor?: Editor | null): EditorView | null {
    const resolvedEditor = this.resolveEditor(editor);
    const view = (resolvedEditor as any)?.cm;
    if (view && view.state && typeof view.dispatch === "function") {
      return view as EditorView;
    }
    return null;
  }

  private async isPKMerAvailable(): Promise<boolean> {
    const verified = await this.authService.verify();
    return verified && !!this.authService.aiToken;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }

    const response = (error as any)?.response;
    const responseMessage = response?.json?.error?.message || response?.json?.message || response?.text;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage.trim();
    }

    return t("Unknown connection error.");
  }
}
