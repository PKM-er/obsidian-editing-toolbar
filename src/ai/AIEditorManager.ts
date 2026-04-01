import { MarkdownView, Notice, type Editor } from "obsidian";
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
      const message = getAIErrorMessage(error);
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

  async startRewrite(
    editor?: Editor | null,
    instruction: RewriteInstruction = "improve",
    customPrompt?: string,
    options?: { artifactKind?: RewriteArtifactKind },
  ): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    const resolvedEditor = this.resolveEditor(editor);
    if (!resolvedEditor) {
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
    if (instruction !== "custom" && from === to) {
      new Notice("Please select text first");
      return false;
    }

    const rewriteContext = resolveRewriteContext(view, from, to, {
      preferBlockWhenCollapsed: instruction === "custom",
    });

    view.dispatch({
      effects: startRewriteEffect.of({
        from: rewriteContext.from,
        to: rewriteContext.to,
        originalText: rewriteContext.selectedText,
        instruction,
        customPrompt,
        context: rewriteContext.context,
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

  openCustomRewrite(editor?: Editor | null): void {
    const resolvedEditor = this.resolveEditor(editor);
    const view = this.getEditorView(resolvedEditor);
    if (!resolvedEditor || !view) {
      new Notice(t("Current editor does not support AI rewrite."));
      return;
    }

    this.inlineCustomPromptEditor = resolvedEditor;
    this.renderInlineCustomPrompt(resolvedEditor, view);
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

  private renderInlineCustomPrompt(editor: Editor, view: EditorView): void {
    const doc = view.dom.ownerDocument;
    if (!this.inlineCustomPromptEl) {
      const promptEl = doc.createElement("div");
      promptEl.className = "editing-toolbar-ai-inline-prompt";

      const header = doc.createElement("div");
      header.className = "editing-toolbar-ai-inline-prompt-header";

      const title = doc.createElement("div");
      title.className = "editing-toolbar-ai-inline-prompt-title";
      title.textContent = t("AI Custom Rewrite");

      const closeBtn = doc.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "editing-toolbar-ai-inline-prompt-close";
      closeBtn.textContent = "×";
      closeBtn.title = t("Close" as any);
      closeBtn.textContent = "×";

      header.append(title, closeBtn);

      const textarea = doc.createElement("textarea");
      textarea.className = "editing-toolbar-ai-inline-prompt-input";
      textarea.placeholder = t("Please enter your custom AI instruction");
      textarea.rows = 3;
      textarea.wrap = "soft";

      const hint = doc.createElement("div");
      hint.className = "editing-toolbar-ai-inline-prompt-hint";
      hint.textContent = `${t("Press Enter to send, Shift+Enter for newline, Esc to close." as any)} ${t("If nothing is selected, AI will use the current block or cursor context." as any)}`;

      promptEl.append(header, textarea, hint);
      doc.body.appendChild(promptEl);

      const resizeTextarea = () => {
        textarea.style.height = "0px";
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 180)}px`;
      };

      const closePrompt = () => {
        this.closeInlineCustomPrompt();
        editor.focus();
      };

      const submitPrompt = async () => {
        const prompt = textarea.value.trim();
        if (!prompt) {
          return;
        }

        if ((await this.getToolbarRouteState()) === "unavailable") {
          new Notice(await this.getProviderRouteStatusText());
          return;
        }

        const result = await this.startRewrite(this.inlineCustomPromptEditor ?? editor, "custom", prompt);
        if (result) {
          this.closeInlineCustomPrompt();
        }
      };

      closeBtn.addEventListener("click", closePrompt);
      textarea.addEventListener("input", resizeTextarea);
      textarea.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closePrompt();
          return;
        }

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void submitPrompt();
        }
      });

      const reposition = () => this.positionInlineCustomPrompt(editor, view);
      const win = doc.defaultView ?? window;
      win.addEventListener("resize", reposition);
      doc.addEventListener("scroll", reposition, true);

      this.inlineCustomPromptCleanup = [
        () => win.removeEventListener("resize", reposition),
        () => doc.removeEventListener("scroll", reposition, true),
      ];

      this.inlineCustomPromptEl = promptEl;
      this.inlineCustomPromptTextarea = textarea;
      resizeTextarea();
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
}
