import { MarkdownView, Notice, Platform, type Editor } from "obsidian";
import type { EditorView } from "@codemirror/view";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { AIConsentModal } from "src/modals/AIConsentModal";
import { ToolbarAIService } from "./AIService";
import { normalizeGeneratedArtifactContent } from "./artifactNormalizer";
import { resolveRewriteContext } from "./editorContext";
import { getAIErrorMessage } from "./errorHandling";
import { PKMerAuthService } from "./PKMerAuthService";
import { getAIToolboxArtifactKind, getAIToolboxPrompt } from "./toolboxActions";
import { DEFAULT_REWRITE_ACTIONS, type RewriteArtifactKind, type RewriteArtifactRequest, type RewriteArtifactResult, type RewriteInstruction } from "./types";
import { createAIEditorExtensions, startRewriteEffect, triggerCompletionEffect } from "./extensions";
import { shouldShowAIFeatures } from "src/util/locale";
import { compactContent } from "./contextCompactor";

interface FrontmatterStats {
  keyCounts: Map<string, number>;
  examples: string[];
  fileCount: number;
}

interface FrontmatterStatsCacheEntry {
  expiresAt: number;
  sourceFileCount: number;
  stats: FrontmatterStats;
}

const VAULT_FRONTMATTER_STATS_CACHE_TTL = 10 * 60 * 1000;

export class AIEditorManager {
  private plugin: EditingToolbarPlugin;
  private authService: PKMerAuthService;
  private aiService: ToolbarAIService;
  private inlineCustomPromptEl: HTMLElement | null = null;
  private inlineCustomPromptTextarea: HTMLTextAreaElement | null = null;
  private inlineCustomPromptEditor: Editor | null = null;
  private inlineCustomPromptCleanup: Array<() => void> = [];
  private vaultFrontmatterStatsCache: FrontmatterStatsCacheEntry | null = null;

  constructor(plugin: EditingToolbarPlugin) {
    this.plugin = plugin;
    this.authService = new PKMerAuthService(plugin);
    this.aiService = new ToolbarAIService(plugin, this.authService);
  }

  onload(): void {
    this.authService.loadSecrets();
    void this.authService.syncLoginState();
    void this.authService.migrateCustomModelApiKeyFromSettings();
    const registerHandler = (this.plugin as any).registerObsidianProtocolHandler;
    if (typeof registerHandler === "function") {
      registerHandler.call(this.plugin, "editing-toolbar-pkmer-auth", async (params: Record<string, string>) => {
        if (params.code && params.state) {
          await this.authService.handleOAuthCallback(params.code, params.state);
        }
      });
    }

    this.plugin.registerEvent?.(
      (this.plugin.app.metadataCache as any).on?.("changed", () => {
        this.invalidateFrontmatterStatsCache();
      }),
    );
    this.plugin.registerEvent?.(
      (this.plugin.app.vault as any).on?.("create", () => {
        this.invalidateFrontmatterStatsCache();
      }),
    );
    this.plugin.registerEvent?.(
      (this.plugin.app.vault as any).on?.("delete", () => {
        this.invalidateFrontmatterStatsCache();
      }),
    );
    this.plugin.registerEvent?.(
      (this.plugin.app.vault as any).on?.("rename", () => {
        this.invalidateFrontmatterStatsCache();
      }),
    );
  }

  onunload(): void {
    this.closeInlineCustomPrompt();
    this.authService.onunload();
  }
  async maybeShowAIOnboarding(): Promise<void> {
    if (!shouldShowAIFeatures()) {
      return;
    }

    if (this.plugin.settings.ai.enabled || this.plugin.settings.ai.onboardingShown) {
      return;
    }

    this.plugin.settings.ai.onboardingShown = true;
    await this.plugin.saveSettings();

    const accepted = await this.openAIConsentModal("startup");
    if (!accepted) {
      return;
    }

    this.plugin.settings.ai.consentAccepted = true;
    this.plugin.settings.ai.enabled = true;
    await this.persistAIAvailabilityChange();
    new Notice(t("AI editing is now enabled. The plugin does not intentionally store your note content, and requests follow your chosen provider policies."), 6000);
  }

  async requestEnableAIWithConsent(source: "startup" | "settings"): Promise<boolean> {
    if (!shouldShowAIFeatures()) {
      new Notice(t('AI settings are currently available only in Simplified and Traditional Chinese.'));
      return false;
    }

    if (this.plugin.settings.ai.enabled) {
      return true;
    }

    if (!this.plugin.settings.ai.consentAccepted) {
      const accepted = await this.openAIConsentModal(source);
      if (!accepted) {
        return false;
      }
      this.plugin.settings.ai.consentAccepted = true;
    }

    this.plugin.settings.ai.onboardingShown = true;
    this.plugin.settings.ai.enabled = true;
    await this.persistAIAvailabilityChange();
    new Notice(t("AI editing is now enabled. The plugin does not intentionally store your note content, and requests follow your chosen provider policies."), 6000);
    return true;
  }

  async disableAI(): Promise<void> {
    if (!this.plugin.settings.ai.enabled) {
      return;
    }

    this.plugin.settings.ai.enabled = false;
    await this.persistAIAvailabilityChange();
  }

  private async persistAIAvailabilityChange(): Promise<void> {
    await this.plugin.saveSettings();
    this.plugin.refreshAIAvailability();
  }

  private async openAIConsentModal(source: "startup" | "settings"): Promise<boolean> {
    const modal = new AIConsentModal(this.plugin.app, { source });
    return modal.openAndWait();
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
        showToolbarOnSelection: false,
        createGeneratedArtifact: (request) => this.createGeneratedArtifact(request),
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

  async getToolbarRouteState(): Promise<"pkmer" | "custom" | "unavailable"> {
    const pkmerAvailable = await this.isPKMerAvailable();
    if (pkmerAvailable) {
      return "pkmer";
    }

    if (this.aiService.hasCustomProviderConfigured()) {
      return "custom";
    }

    return "unavailable";
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
      new Notice(t("Please fill in the required custom model settings first."));
      return false;
    }

    new Notice(t("Testing custom model connection..."));

    try {
      await this.aiService.testCustomProviderConnection();
      const model = this.plugin.settings.ai.customModel.model.trim();
      new Notice(`${t("Custom model connection succeeded.")} ${model}`.trim());
      return true;
    } catch (error) {
      const message = getAIErrorMessage(error);
      new Notice(`${t("Custom model connection failed:")} ${message}`);
      return false;
    }
  }

  async listCustomOllamaModels(): Promise<string[]> {
    return this.aiService.listCustomOllamaModels();
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

  async startRewrite(
    editor?: Editor | null,
    instruction: RewriteInstruction = "improve",
    customPrompt?: string,
    options?: { artifactKind?: RewriteArtifactKind; additionalContext?: string; preferBlockWhenCollapsed?: boolean },
  ): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    const resolvedEditor = this.resolveEditor(editor);
    if (!resolvedEditor) {
      new Notice(t("Please select text first"));
      return false;
    }

    const view = this.getEditorView(resolvedEditor);
    if (!view) {
      new Notice(t("Current editor does not support AI rewrite."));
      return false;
    }

    const from = resolvedEditor.posToOffset(resolvedEditor.getCursor("from"));
    const to = resolvedEditor.posToOffset(resolvedEditor.getCursor("to"));
    if (instruction !== "custom" && from === to) {
      new Notice("Please select text first");
      return false;
    }
     const rewriteContext = resolveRewriteContext(view, from, to, {
      preferBlockWhenCollapsed: options?.preferBlockWhenCollapsed ?? instruction === "custom",
    });

    const finalContext = options?.additionalContext
      ? `${rewriteContext.context}\n\n${options.additionalContext}`
      : rewriteContext.context;

    view.dispatch({
      effects: startRewriteEffect.of({
        from: rewriteContext.from,
        to: rewriteContext.to,
        originalText: rewriteContext.selectedText,
        instruction,
        customPrompt,
        context: finalContext,
        artifactKind: options?.artifactKind,
      }),
    });
    return true;
  }

  async runToolboxAction(editor: Editor | null | undefined, actionId: string): Promise<boolean> {
    const prompt = getAIToolboxPrompt(actionId);
    if (!prompt) {
      return false;
    }

    if (actionId === "frontmatter") {
      return this.startFrontmatterGeneration(editor, prompt);
    }

    const artifactKind = getAIToolboxArtifactKind(actionId);

    return this.startRewrite(editor, "custom", prompt, { artifactKind });
  }

  private async startFrontmatterGeneration(editor: Editor | null | undefined, prompt: string): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    const resolvedEditor = this.resolveEditor(editor);
    const view = this.getEditorView(resolvedEditor);
    if (!resolvedEditor || !view) {
      new Notice(t("Current editor does not support AI rewrite."));
      return false;
    }

    const fullText = (resolvedEditor as any).getValue?.() ?? "";
    const frontmatterRange = this.findFrontmatterRange(fullText);
    const noteBody = frontmatterRange
      ? `${fullText.slice(0, frontmatterRange.from)}${fullText.slice(frontmatterRange.to)}`.trim()
      : fullText.trim();

    const contextParts = [
      "current_note_scope: whole_note",
      frontmatterRange ? "current_note_has_frontmatter: true" : "current_note_has_frontmatter: false",
    ];

    const currentFrontmatter = frontmatterRange ? fullText.slice(frontmatterRange.from, frontmatterRange.to).trim() : "";
    if (currentFrontmatter) {
      contextParts.push("current_note_frontmatter:", currentFrontmatter);
    }

    const frontmatterStyleSummary = this.buildFrontmatterStyleSummary();
    if (frontmatterStyleSummary.context) {
      contextParts.push(frontmatterStyleSummary.context);
    }

    view.dispatch({
      effects: startRewriteEffect.of({
        from: frontmatterRange?.from ?? 0,
        to: frontmatterRange?.to ?? 0,
        originalText: noteBody,
        instruction: "custom",
        customPrompt: prompt,
        context: contextParts.join("\n\n"),
        artifactKind: "frontmatter",
        preferredFrontmatterKeys: frontmatterStyleSummary.preferredAliases,
      }),
    });
    return true;
  }

  private findFrontmatterRange(text: string): { from: number; to: number } | null {
    const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (!match || match.index !== 0) {
      return null;
    }

    return {
      from: 0,
      to: match[0].length,
    };
  }

  private buildFrontmatterStyleSummary(): { context: string; preferredAliases: Record<string, string> } {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    const allMarkdownFiles = ((this.plugin.app.vault as any).getMarkdownFiles?.() ?? []) as Array<any>;
    if (!activeFile || allMarkdownFiles.length === 0) {
      return { context: "", preferredAliases: {} };
    }

    const siblingFiles = allMarkdownFiles
      .filter((file) => file?.path !== activeFile.path && file?.parent?.path === activeFile.parent?.path)
      .slice(0, 48);

    const siblingStats = this.collectFrontmatterStats(siblingFiles, 6);
    const shouldFallbackToVault = this.shouldFallbackToVaultFrontmatterStats(siblingStats);
    const vaultStats = shouldFallbackToVault
      ? this.getVaultFrontmatterStats(allMarkdownFiles)
      : this.createEmptyFrontmatterStats();
    const preferredAliases = this.buildPreferredFrontmatterAliases(siblingStats.keyCounts, vaultStats.keyCounts);

    const contextParts: string[] = [];

    if (siblingStats.examples.length > 0) {
      const commonKeys = [...siblingStats.keyCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 10)
        .map(([key, count]) => `- ${key} (${count})`)
        .join("\n");

      contextParts.push(
        [
          `same_folder_path: ${activeFile.parent?.path || ""}`,
          "same_folder_frontmatter_common_keys:",
          commonKeys,
          "same_folder_frontmatter_examples:",
          ...siblingStats.examples,
        ].join("\n"),
      );
    }

    const vaultCommonKeys = shouldFallbackToVault
      ? [...vaultStats.keyCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 14)
        .map(([key, count]) => `- ${key} (${count})`)
        .join("\n")
      : "";

    if (shouldFallbackToVault && vaultCommonKeys) {
      contextParts.push([
        "vault_frontmatter_high_frequency_keys:",
        vaultCommonKeys,
      ].join("\n"));
    }

    const aliasPreferenceLines = Object.entries(preferredAliases)
      .map(([fromKey, toKey]) => `- prefer ${toKey} over ${fromKey}`);

    if (aliasPreferenceLines.length > 0) {
      contextParts.push([
        "preferred_frontmatter_key_aliases:",
        ...aliasPreferenceLines,
      ].join("\n"));
    }

    return {
      context: contextParts.join("\n\n"),
      preferredAliases,
    };
  }

  private collectFrontmatterStats(files: Array<any>, exampleLimit: number): FrontmatterStats {
    const keyCounts = new Map<string, number>();
    const examples: string[] = [];
    let fileCount = 0;

    for (const file of files) {
      const cache = (this.plugin.app.metadataCache as any)?.getFileCache?.(file);
      const frontmatter = cache?.frontmatter;
      if (!frontmatter || typeof frontmatter !== "object") {
        continue;
      }

      const entries = Object.entries(frontmatter)
        .filter(([key]) => key !== "position")
        .slice(0, 8);

      if (entries.length === 0) {
        continue;
      }

      fileCount += 1;

      entries.forEach(([key]) => {
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      });

      if (exampleLimit > 0 && examples.length < exampleLimit) {
        const formatted = entries
          .map(([key, value]) => `  ${key}: ${this.serializeFrontmatterValue(value)}`)
          .join("\n");
        examples.push(`${file.basename}:\n${formatted}`);
      }

      if (exampleLimit > 0 && examples.length >= exampleLimit) {
        continue;
      }
    }

    return {
      keyCounts,
      examples,
      fileCount,
    };
  }

  private createEmptyFrontmatterStats(): {
    keyCounts: Map<string, number>;
    examples: string[];
    fileCount: number;
  } {
    return {
      keyCounts: new Map<string, number>(),
      examples: [],
      fileCount: 0,
    };
  }

  private getVaultFrontmatterStats(allMarkdownFiles: Array<any>): FrontmatterStats {
    const now = Date.now();
    const cached = this.vaultFrontmatterStatsCache;
    if (
      cached &&
      cached.expiresAt > now &&
      cached.sourceFileCount === allMarkdownFiles.length
    ) {
      return cached.stats;
    }

    const stats = this.collectFrontmatterStats(allMarkdownFiles, 0);
    this.vaultFrontmatterStatsCache = {
      expiresAt: now + VAULT_FRONTMATTER_STATS_CACHE_TTL,
      sourceFileCount: allMarkdownFiles.length,
      stats,
    };
    return stats;
  }

  private invalidateFrontmatterStatsCache(): void {
    this.vaultFrontmatterStatsCache = null;
  }

  private shouldFallbackToVaultFrontmatterStats(stats: {
    keyCounts: Map<string, number>;
    examples: string[];
    fileCount: number;
  }): boolean {
    const distinctKeyCount = stats.keyCounts.size;
    const strongSiblingSample = stats.fileCount >= 6;
    const mediumSiblingSample = stats.fileCount >= 3 && distinctKeyCount >= 6;
    const aliasSignal = this.hasStrongSiblingAliasSignal(stats.keyCounts);

    return !(strongSiblingSample || mediumSiblingSample || aliasSignal);
  }

  private hasStrongSiblingAliasSignal(keyCounts: Map<string, number>): boolean {
    const aliasGroups = [
      ["tags", "tag"],
      ["aliases", "alias"],
      ["status", "state"],
      ["cssclasses", "cssclass"],
    ];

    return aliasGroups.some((group) => group.some((key) => (keyCounts.get(key) ?? 0) >= 2));
  }

  private buildPreferredFrontmatterAliases(
    siblingCounts: Map<string, number>,
    vaultCounts: Map<string, number>,
  ): Record<string, string> {
    const aliasGroups = [
      ["tags", "tag"],
      ["aliases", "alias"],
      ["status", "state"],
      ["cssclasses", "cssclass"],
    ];
    const preferredAliases: Record<string, string> = {};

    for (const group of aliasGroups) {
      const ranked = group
        .map((key) => ({
          key,
          siblingCount: siblingCounts.get(key) ?? 0,
          vaultCount: vaultCounts.get(key) ?? 0,
        }))
        .sort((left, right) => {
          if (right.siblingCount !== left.siblingCount) {
            return right.siblingCount - left.siblingCount;
          }
          return right.vaultCount - left.vaultCount;
        });

      const preferred = ranked[0];
      if (!preferred || (preferred.siblingCount === 0 && preferred.vaultCount === 0)) {
        continue;
      }

      ranked.slice(1).forEach((entry) => {
        if (entry.siblingCount > 0 || entry.vaultCount > 0) {
          preferredAliases[entry.key] = preferred.key;
        }
      });
    }

    return preferredAliases;
  }

  private serializeFrontmatterValue(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.serializeFrontmatterValue(item)).join(", ")}]`;
    }

    if (value && typeof value === "object") {
      return JSON.stringify(value);
    }

    if (typeof value === "string") {
      return value;
    }

    return String(value);
  }

  private async createGeneratedArtifact(request: RewriteArtifactRequest): Promise<RewriteArtifactResult> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    const parentPath = activeFile?.parent?.path && activeFile.parent.path !== "/" ? activeFile.parent.path : "";
    const sourceBaseName = (activeFile?.basename || t("Untitled")).trim();
    const sanitizedBaseName = sourceBaseName.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() || t("Untitled");
    const extension = request.kind === "canvas" ? "canvas" : "base";
    const suffix = request.kind === "canvas" ? t("AI Canvas File") : t("AI Base File");
    const filePath = await this.getAvailableArtifactPath(parentPath, `${sanitizedBaseName} ${suffix}`, extension);
    const content = normalizeGeneratedArtifactContent(request);

    await this.plugin.app.vault.create(filePath, content);
    new Notice(`${t("Created AI file:")} ${filePath}`);

    return {
      path: filePath,
      embedSyntax: `![[${filePath}]]`,
    };
  }

  private async getAvailableArtifactPath(parentPath: string, baseName: string, extension: string): Promise<string> {
    let counter = 0;
    while (counter < 200) {
      const suffix = counter === 0 ? "" : ` ${counter + 1}`;
      const filename = `${baseName}${suffix}.${extension}`;
      const path = parentPath ? `${parentPath}/${filename}` : filename;
      if (!this.plugin.app.vault.getAbstractFileByPath(path)) {
        return path;
      }
      counter += 1;
    }

    throw new Error(t("Unable to allocate a file name for the generated artifact."));
  }

  openCustomRewrite(editor?: Editor | null): boolean {
    const resolvedEditor = this.resolveEditor(editor);
    const view = this.getEditorView(resolvedEditor);
    if (!resolvedEditor || !view) {
      new Notice(t("Current editor does not support AI rewrite."));
      return false;
    }

    const selectedText = resolvedEditor.getSelection();
    this.inlineCustomPromptEditor = resolvedEditor;
    this.renderInlineCustomPrompt(resolvedEditor, view, selectedText);
    return true;
  }

  closeInlineCustomPrompt(): void {
    this.inlineCustomPromptCleanup.forEach((cleanup) => cleanup());
    this.inlineCustomPromptCleanup = [];
    this.inlineCustomPromptTextarea = null;
    this.inlineCustomPromptEditor = null;

    if (this.inlineCustomPromptEl) {
      this.inlineCustomPromptEl.remove();
      this.inlineCustomPromptEl = null;
    }
  }

  private renderInlineCustomPrompt(editor: Editor, view: EditorView, initialSelection?: string): void {
    const doc = view.dom.ownerDocument;
    if (!this.inlineCustomPromptEl) {
      const promptEl = doc.createElement("div");
      promptEl.className = "editing-toolbar-ai-inline-prompt";
      const header = doc.createElement("div");
      header.className = "editing-toolbar-ai-inline-prompt-header";
      const dragHandle = doc.createElement("div");
      dragHandle.className = "editing-toolbar-ai-inline-prompt-drag-handle";
      dragHandle.style.cursor = "grab";
      const titleEl = doc.createElement("div");
      titleEl.className = "editing-toolbar-ai-inline-prompt-title";
      titleEl.textContent = t("AI Custom Rewrite");
      const closeBtn = doc.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "editing-toolbar-ai-inline-prompt-close";
      closeBtn.title = t("Close" as any);
      closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
      header.append(dragHandle, titleEl, closeBtn);
      const settingsBtn = doc.createElement("button");
      settingsBtn.type = "button";
      settingsBtn.className = "editing-toolbar-ai-inline-prompt-settings";
      settingsBtn.title = t("Manage Templates" as any);
      settingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"/></svg>`;

      const inputWrapper = doc.createElement("div");
      inputWrapper.className = "editing-toolbar-ai-inline-prompt-input-wrapper";

      const textarea = doc.createElement("textarea");
      textarea.className = "editing-toolbar-ai-inline-prompt-input";
      textarea.placeholder = t("Describe what you want AI to do...");
      textarea.rows = 3;
      textarea.wrap = "soft";

      const historyBtn = doc.createElement("button");
      historyBtn.type = "button";
      historyBtn.className = "editing-toolbar-ai-inline-prompt-history-btn";
      historyBtn.title = t("History" as any);
      historyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;

      const historyDropdown = doc.createElement("div");
      historyDropdown.className = "editing-toolbar-ai-inline-prompt-history-dropdown";
      historyDropdown.style.display = "none";

      const mentionDropdown = doc.createElement("div");
      mentionDropdown.className = "editing-toolbar-ai-inline-prompt-mention-dropdown";
      mentionDropdown.style.display = "none";
   const sendBtn = doc.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "editing-toolbar-ai-inline-prompt-send-btn";
      sendBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
      sendBtn.title = t("Send" as any);

      inputWrapper.append(textarea, historyBtn, historyDropdown, mentionDropdown,sendBtn);

      const templatesContainer = doc.createElement("div");
      templatesContainer.className = "editing-toolbar-ai-inline-prompt-templates";

      const templates = this.plugin.settings.ai.customPromptTemplates || [];

      const replaceTemplateVariables = (template: string): string => {
        const currentFile = this.plugin.app.workspace.getActiveFile();
        const currentEditor = this.resolveEditor();
        const now = new Date();

        const currentSelection = currentEditor?.getSelection() || "";
        const currentContent = currentEditor?.getValue() || "";

        if (template.includes("{{selection}}") && currentSelection) {
          if (!contextList.some(c => c.type === "selection")) {
            contextList.push({
              type: "selection",
              content: currentSelection,
              label: "📝 Selected text"
            });
          } else {
            const selectionCtx = contextList.find(c => c.type === "selection");
            if (selectionCtx) {
              selectionCtx.content = currentSelection;
            }
          }
        }

        if (template.includes("{{file:content}}")) {
          const compactedContent = compactContent(currentContent);
          if (!contextList.some(c => c.type === "doc")) {
            contextList.push({
              type: "doc",
              content: compactedContent,
              label: `📋 ${currentFile?.basename || "Current document"}`
            });
          } else {
            const docCtx = contextList.find(c => c.type === "doc");
            if (docCtx) {
              docCtx.content = compactedContent;
              docCtx.label = `📋 ${currentFile?.basename || "Current document"}`;
            }
          }
        }

        return template
          .replace(/\{\{selection\}\}/g, currentSelection ? "[📝 Selected text]" : "")
          .replace(/\{\{file:path\}\}/g, currentFile?.path || "")
          .replace(/\{\{file:content\}\}/g, currentFile?.basename ? `[[${currentFile.basename}]]` : "")
          .replace(/\{\{date\}\}/g, now.toLocaleDateString())
          .replace(/\{\{time\}\}/g, now.toLocaleTimeString())
          .replace(/\{\{datetime\}\}/g, now.toLocaleString())
          .replace(/\{\{vault:name\}\}/g, this.plugin.app.vault.getName());
      };

      templates.slice(0, 9).forEach((template) => {
        const templateBtn = doc.createElement("button");
        templateBtn.type = "button";
        templateBtn.className = "editing-toolbar-ai-inline-prompt-template-btn";
        templateBtn.textContent = template.name;
        templateBtn.title = template.prompt;
        templateBtn.addEventListener("click", async () => {
          textarea.value = replaceTemplateVariables(template.prompt);
          renderContextItems();
          resizeTextarea();
          updateSendButtonState();
          textarea.focus();
          // 等待双链内容加载完成
          await syncLinkedNotesContext();
        });
        templatesContainer.appendChild(templateBtn);
      });

      const contextContainer = doc.createElement("div");
      contextContainer.className = "editing-toolbar-ai-inline-prompt-context";
      contextContainer.style.display = "none";

      const contextList: Array<{type: string, content: string, label: string}> = [];

      if (initialSelection) {
        contextList.push({
          type: "selection",
          content: initialSelection,
          label: "📝 Selected text"
        });
      }

      const renderContextItems = () => {
        contextContainer.empty();
        if (contextList.length === 0) {
          contextContainer.style.display = "none";
          return;
        }
        contextContainer.style.display = "block";
        contextList.forEach((ctx, index) => {
          const item = doc.createElement("div");
          item.className = "editing-toolbar-ai-inline-prompt-context-item";

          const label = doc.createElement("span");
          label.className = "editing-toolbar-ai-inline-prompt-context-label";
          label.textContent = ctx.label;

          const preview = doc.createElement("span");
          preview.className = "editing-toolbar-ai-inline-prompt-context-preview";
          const previewText = ctx.content.substring(0, 50).replace(/\n/g, " ");
          const suffix = ctx.content.length > 50 ? "..." : "";
          const charCount = `(${ctx.content.length.toLocaleString()} chars)`;
          preview.textContent = `${previewText}${suffix} ${charCount}`;
          preview.title = ctx.content.length > 100 ? ctx.content.substring(0, 100) + "..." : ctx.content;

          const removeBtn = doc.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "editing-toolbar-ai-inline-prompt-context-remove";
          removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
          removeBtn.addEventListener("click", () => {
            // 从上下文列表移除
            contextList.splice(index, 1);

            // 同步删除输入框中的占位符
            if (ctx.type === "selection") {
              textarea.value = textarea.value.replace("[📝 Selected text]", "");
            } else if (ctx.type === "note" || ctx.type === "doc") {
              // 提取文件名并删除对应的双链
              const fileName = ctx.label.replace(/^📄 |^📋 /, "");
              textarea.value = textarea.value.replace(`[[${fileName}]]`, "");
            }

            renderContextItems();
          });

          item.append(label, preview, removeBtn);
          contextContainer.appendChild(item);
        });
      };

      renderContextItems();

      const footer = doc.createElement("div");
      footer.className = "editing-toolbar-ai-inline-prompt-footer";
      const hint = doc.createElement("div");
      hint.className = "editing-toolbar-ai-inline-prompt-hint";
      const promptHint = Platform.isMobileApp
        ? t("Enter inserts a newline. Tap Send to submit." as any)
        : t("Press Enter to send, Shift+Enter for newline, Esc to close." as any);
      hint.textContent = promptHint  ;

   
      footer.appendChild(hint);
     
      promptEl.append(header, inputWrapper, templatesContainer, contextContainer, footer);
      doc.body.appendChild(promptEl);

      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      const onDragStart = (e: MouseEvent | TouchEvent) => {
        if (e.target !== dragHandle && e.target !== titleEl) return;

        isDragging = true;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const rect = promptEl.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;

        promptEl.style.cursor = 'grabbing';
        dragHandle.style.cursor = 'grabbing';

        if ('touches' in e) {
          e.preventDefault();
        }
      };

      const onDrag = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;

        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const newLeft = clientX - offsetX;
        const newTop = clientY - offsetY;

        promptEl.style.left = `${newLeft}px`;
        promptEl.style.top = `${newTop}px`;
      };

      const onDragEnd = () => {
        isDragging = false;
        promptEl.style.cursor = '';
        dragHandle.style.cursor = 'grab';
      };

      dragHandle.addEventListener('mousedown', onDragStart as EventListener);
      titleEl.addEventListener('mousedown', onDragStart as EventListener);
      dragHandle.addEventListener('touchstart', onDragStart as EventListener, { passive: false });
      titleEl.addEventListener('touchstart', onDragStart as EventListener, { passive: false });

      doc.addEventListener('mousemove', onDrag as EventListener);
      doc.addEventListener('touchmove', onDrag as EventListener, { passive: false });

      doc.addEventListener('mouseup', onDragEnd);
      doc.addEventListener('touchend', onDragEnd);

      const resizeTextarea = () => {
        textarea.style.height = "auto";
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 240);
        textarea.style.height = `${newHeight}px`;

        // 如果内容超过最大高度，显示滚动条
        if (textarea.scrollHeight > 240) {
          textarea.style.overflowY = "auto";
        } else {
          textarea.style.overflowY = "hidden";
        }
      };

      const closePrompt = () => {
        this.closeInlineCustomPrompt();
        editor.focus();
      };

      const submitPrompt = async () => {
        let prompt = textarea.value.trim();
        if (!prompt) {
          return;
        }

        if ((await this.getToolbarRouteState()) === "unavailable") {
          new Notice(await this.getProviderRouteStatusText());
          return;
        }

        const activePromptEditor = this.inlineCustomPromptEditor ?? editor;
        const hasSelectedText = activePromptEditor.getSelection().trim().length > 0;
        const hasReferencedNotes = /\[\[[^\]]+\]\]/.test(prompt);
        const shouldPreferBlockFallback = !hasSelectedText && !hasReferencedNotes;

        // 移除占位符，保留用户指令语义
        const cleanPrompt = prompt
          .replace(/\[\[([^\]]+)\]\]/g, "$1")
          .replace(/\[📝 Selected text\]/g, "选中文本")
          .trim();

        // 历史记录保留用户输入原貌，避免丢失双链等语义标记
        if (prompt) {
          this.addToHistory(prompt);
        }

        const effectiveContextList = contextList.filter((ctx) => {
          if (!ctx.content.trim()) {
            return false;
          }

          if (hasSelectedText && ctx.type === "selection") {
            return false;
          }

          return true;
        });

        // contextList 已经包含所有上下文（通过 syncLinkedNotesContext 和模板变量添加）
        const contextText = effectiveContextList.length > 0
          ? effectiveContextList.map(ctx => `<context source="${ctx.label}">\n${ctx.content}\n</context>`).join("\n\n")
          : "";

        const result = await this.startRewrite(
          activePromptEditor,
          "custom",
          cleanPrompt,
          {
            additionalContext: contextText,
            preferBlockWhenCollapsed: shouldPreferBlockFallback,
          }
        );
        if (result) {
          this.closeInlineCustomPrompt();
        }
      };

      const updateHistoryDropdown = () => {
        const history = this.plugin.settings.ai.customPromptHistory || [];
        historyDropdown.empty();

        if (history.length === 0) {
          const emptyItem = doc.createElement("div");
          emptyItem.className = "editing-toolbar-ai-inline-prompt-history-empty";
          emptyItem.textContent = t("No history" as any);
          historyDropdown.appendChild(emptyItem);
        } else {
          history.forEach((item, index) => {
            const historyItem = doc.createElement("div");
            historyItem.className = "editing-toolbar-ai-inline-prompt-history-item";
            historyItem.textContent = item.length > 50 ? item.substring(0, 50) + "..." : item;
            historyItem.title = item;
            historyItem.addEventListener("click", async () => {
              textarea.value = item;
              historyDropdown.style.display = "none";
              resizeTextarea();
              updateSendButtonState();
              textarea.focus();
              // 重新加载双链内容
              await syncLinkedNotesContext();
            });
            historyDropdown.appendChild(historyItem);
          });
        }
      };

      historyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = historyDropdown.style.display !== "none";
        historyDropdown.style.display = isVisible ? "none" : "block";
        if (!isVisible) {
          updateHistoryDropdown();
        }
      });

      doc.addEventListener("click", (e) => {
        if (!historyDropdown.contains(e.target as Node) && e.target !== historyBtn) {
          historyDropdown.style.display = "none";
        }
      });

      const reposition = () => this.positionInlineCustomPrompt(editor, view);
      const updateSendButtonState = () => {
        sendBtn.disabled = textarea.value.trim().length === 0;
      };

      closeBtn.addEventListener("click", closePrompt);
      settingsBtn.addEventListener("click", () => {
        this.plugin.app.setting.open();
        this.plugin.app.setting.openTabById("editing-toolbar");
        setTimeout(() => {
          const tabsContainer = this.plugin.app.setting.activeTab?.containerEl?.querySelector(".editing-toolbar-tabs");
          if (tabsContainer) {
            const aiTab = Array.from(tabsContainer.children).find((el: HTMLElement) =>
              el.textContent?.includes("AI") || el.getAttribute("data-tab") === "ai"
            ) as HTMLElement;
            aiTab?.click();
          }
        }, 100);
        closePrompt();
      });
      sendBtn.addEventListener("click", () => {
        void submitPrompt();
      });
      let linkStartPos = -1;
      let selectedSuggestionIndex = 0;
      let suggestionFiles: any[] = [];

      const syncLinkedNotesContext = async () => {
        const text = textarea.value;
        const linkMatches = Array.from(text.matchAll(/\[\[([^\]]+)\]\]/g));
        const linkedFileNames = new Set(linkMatches.map(m => m[1]));

        // 移除不再存在的双链对应的上下文
        const existingLinkedNotes = contextList.filter(c => c.type === "note");
        for (const ctx of existingLinkedNotes) {
          const fileName = ctx.label.replace("📄 ", "");
          if (!linkedFileNames.has(fileName)) {
            const index = contextList.indexOf(ctx);
            if (index > -1) {
              contextList.splice(index, 1);
            }
          }
        }

        // 添加新的双链对应的上下文
        for (const linkText of linkedFileNames) {
          // 检查是否已存在(包括 type="note" 和 type="doc")
          const alreadyExists = contextList.some(c =>
            (c.type === "note" || c.type === "doc") &&
            (c.label.includes(linkText) || c.label.replace(/^📄 |^📋 /, "") === linkText)
          );

          if (alreadyExists) {
            continue;
          }

          const file = this.plugin.app.metadataCache.getFirstLinkpathDest(linkText, "");
          if (file) {
            try {
              const rawContent = await this.plugin.app.vault.cachedRead(file);
              const content = compactContent(rawContent);
              contextList.push({
                type: "note",
                content: content,
                label: `📄 ${file.basename}`
              });
            } catch (e) {
              console.error(`Failed to read linked file: ${linkText}`, e);
            }
          }
        }

        renderContextItems();
      };

      const selectSuggestion = async (file: any) => {
        const cursorPos = textarea.selectionStart;
        const beforeLink = textarea.value.substring(0, linkStartPos);
        const afterCursor = textarea.value.substring(cursorPos);
        textarea.value = beforeLink + `[[${file.basename}]] ` + afterCursor;
        mentionDropdown.style.display = "none";

        textarea.focus();
        const newCursorPos = linkStartPos + file.basename.length + 5;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        resizeTextarea();
        updateSendButtonState();

        await syncLinkedNotesContext();
      };

      const updateLinkSuggestions = () => {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const linkMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);

        if (linkMatch) {
          linkStartPos = textBeforeCursor.lastIndexOf("[[");
          const query = linkMatch[1].toLowerCase();

          const currentFile = this.plugin.app.workspace.getActiveFile();
          const files = this.plugin.app.vault.getMarkdownFiles();

          const filtered = files.filter(f =>
            f.basename.toLowerCase().includes(query) ||
            f.path.toLowerCase().includes(query)
          );

          filtered.sort((a, b) => {
            if (currentFile && a.path === currentFile.path) return -1;
            if (currentFile && b.path === currentFile.path) return 1;
            return 0;
          });

          suggestionFiles = filtered.slice(0, 10);
          selectedSuggestionIndex = 0;

          if (filtered.length > 0) {
            mentionDropdown.empty();
            filtered.forEach((file, index) => {
              const item = doc.createElement("div");
              item.className = "editing-toolbar-ai-inline-prompt-mention-item";
              if (index === 0) item.classList.add("selected");
              item.innerHTML = `<span class="editing-toolbar-ai-inline-prompt-mention-icon">📄</span>${file.basename} <span style="color: var(--text-faint); font-size: 10px;">${file.path}</span>`;
              item.addEventListener("click", () => {
                void selectSuggestion(file);
              });
              mentionDropdown.appendChild(item);
            });
            mentionDropdown.style.display = "block";
          } else {
            mentionDropdown.style.display = "none";
          }
        } else {
          mentionDropdown.style.display = "none";
          linkStartPos = -1;
          suggestionFiles = [];
        }
      };

      const syncPlaceholdersWithContext = () => {
        const text = textarea.value;

        // 检查 [📝 Selected text] 占位符
        const hasSelectionPlaceholder = text.includes("[📝 Selected text]");
        const hasSelectionContext = contextList.some(c => c.type === "selection");

        if (!hasSelectionPlaceholder && hasSelectionContext) {
          // 占位符被删除,移除上下文
          const index = contextList.findIndex(c => c.type === "selection");
          if (index > -1) {
            contextList.splice(index, 1);
            renderContextItems();
          }
        }
      };

      const normalizeLinkTriggerInput = (value: string, cursorPos: number): { value: string; cursorPos: number } => {
        let normalizedValue = value;
        let normalizedCursorPos = cursorPos;

        if (normalizedValue.includes("【【")) {
          const beforeCursor = normalizedValue.substring(0, normalizedCursorPos);
          const afterCursor = normalizedValue.substring(normalizedCursorPos);
          const newBeforeCursor = beforeCursor.replace(/【【/g, "[[");
          const newAfterCursor = afterCursor.replace(/【【/g, "[[");
          const lengthDiff = beforeCursor.length - newBeforeCursor.length;

          normalizedValue = newBeforeCursor + newAfterCursor;
          normalizedCursorPos -= lengthDiff;
        }

        const openingBracketRun = normalizedValue.substring(0, normalizedCursorPos).match(/(?:\[|【){2,}$/);
        if (openingBracketRun && openingBracketRun[0].includes("【")) {
          const runStart = normalizedCursorPos - openingBracketRun[0].length;
          normalizedValue = `${normalizedValue.substring(0, runStart)}[[${normalizedValue.substring(normalizedCursorPos)}`;
          normalizedCursorPos = runStart + 2;
        }

        return { value: normalizedValue, cursorPos: normalizedCursorPos };
      };

      textarea.addEventListener("input", (e) => {
        const normalized = normalizeLinkTriggerInput(textarea.value, textarea.selectionStart);

        if (normalized.value !== textarea.value || normalized.cursorPos !== textarea.selectionStart) {
          textarea.value = normalized.value;
          textarea.setSelectionRange(normalized.cursorPos, normalized.cursorPos);
        }

        resizeTextarea();
        updateSendButtonState();
        updateLinkSuggestions();
        void syncLinkedNotesContext();
        syncPlaceholdersWithContext();
      });
      textarea.addEventListener("keydown", (event) => {
        const isSuggestionVisible = mentionDropdown.style.display !== "none" && suggestionFiles.length > 0;

        if (isSuggestionVisible) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestionFiles.length;
            const items = mentionDropdown.querySelectorAll(".editing-toolbar-ai-inline-prompt-mention-item");
            items.forEach((item, index) => {
              item.classList.toggle("selected", index === selectedSuggestionIndex);
            });
            items[selectedSuggestionIndex]?.scrollIntoView({ block: "nearest" });
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + suggestionFiles.length) % suggestionFiles.length;
            const items = mentionDropdown.querySelectorAll(".editing-toolbar-ai-inline-prompt-mention-item");
            items.forEach((item, index) => {
              item.classList.toggle("selected", index === selectedSuggestionIndex);
            });
            items[selectedSuggestionIndex]?.scrollIntoView({ block: "nearest" });
            return;
          }

          if (event.key === "Tab") {
            event.preventDefault();
            if (suggestionFiles[selectedSuggestionIndex]) {
              void selectSuggestion(suggestionFiles[selectedSuggestionIndex]);
            }
            return;
          }

          if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            if (suggestionFiles[selectedSuggestionIndex]) {
              void selectSuggestion(suggestionFiles[selectedSuggestionIndex]);
            }
            return;
          }
        }

        if (event.key === "Escape") {
          event.preventDefault();
          if (isSuggestionVisible) {
            mentionDropdown.style.display = "none";
          } else {
            closePrompt();
          }
          return;
        }

        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void submitPrompt();
          return;
        }

        if (!Platform.isMobileApp && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void submitPrompt();
        }
      });

      const win = doc.defaultView ?? window;
      win.addEventListener("resize", reposition);
      doc.addEventListener("scroll", reposition, true);

      this.inlineCustomPromptCleanup = [
        () => win.removeEventListener("resize", reposition),
        () => doc.removeEventListener("scroll", reposition, true),
        () => dragHandle.removeEventListener('mousedown', onDragStart as EventListener),
        () => titleEl.removeEventListener('mousedown', onDragStart as EventListener),
        () => dragHandle.removeEventListener('touchstart', onDragStart as EventListener),
        () => titleEl.removeEventListener('touchstart', onDragStart as EventListener),
        () => doc.removeEventListener('mousemove', onDrag as EventListener),
        () => doc.removeEventListener('touchmove', onDrag as EventListener),
        () => doc.removeEventListener('mouseup', onDragEnd),
        () => doc.removeEventListener('touchend', onDragEnd),
      ];

      this.inlineCustomPromptEl = promptEl;
      this.inlineCustomPromptTextarea = textarea;
      resizeTextarea();
      updateSendButtonState();
    }

    this.positionInlineCustomPrompt(editor, view);
    this.inlineCustomPromptTextarea?.focus();
  }

  private positionInlineCustomPrompt(editor: Editor, view: EditorView): void {
    if (!this.inlineCustomPromptEl) {
      return;
    }

    const doc = view.dom.ownerDocument;
    const win = doc.defaultView ?? window;
    const cursor = editor.getCursor("to");
    const offset = editor.posToOffset(cursor);
    const coords = view.coordsAtPos(offset);
    if (!coords) {
      return;
    }

    const promptWidth = this.inlineCustomPromptEl.offsetWidth || 320;
    const promptHeight = this.inlineCustomPromptEl.offsetHeight || 150;
    const margin = 12;
    const left = Math.max(
      margin,
      Math.min(coords.left, win.innerWidth - promptWidth - margin),
    );
    const top = Math.max(
      margin,
      Math.min(coords.bottom + 10, win.innerHeight - promptHeight - margin),
    );

    this.inlineCustomPromptEl.style.left = `${left}px`;
    this.inlineCustomPromptEl.style.top = `${top}px`;
  }

  private resolveEditor(editor?: Editor | null): Editor | null {
    if (editor) {
      return editor;
    }
    try {
      return this.plugin.commandsManager?.getActiveEditor() ?? ((this.plugin.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView | null)?.editor ?? null);
    } catch {
      return null;
    }
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

  private addToHistory(prompt: string): void {
    const history = this.plugin.settings.ai.customPromptHistory || [];
    const existingIndex = history.indexOf(prompt);

    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }

    history.unshift(prompt);

    if (history.length > 10) {
      history.splice(10);
    }

    this.plugin.settings.ai.customPromptHistory = history;
    this.plugin.saveSettings();
  }
}
