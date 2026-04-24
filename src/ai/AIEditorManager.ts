import { MarkdownView, Notice, Platform, type Editor } from "obsidian";
import type { EditorView } from "@codemirror/view";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { AIConsentModal } from "src/modals/AIConsentModal";
import { TextInputModal, type ITextInputSuggestion } from "src/modals/TextInputModal";
import { ToolbarAIService } from "./AIService";
import { normalizeGeneratedArtifactContent } from "./artifactNormalizer";
import {
  applyCanvasExpansionDraft,
  buildDeterministicCanvasReorganizationPlan,
  applyCanvasInstructionPlan,
  buildCanvasDocumentSource,
  getActiveCanvasContext,
  getActiveCanvasTextFileView,
  mergeCanvasReorganizationPlans,
  parseCanvasExpansionResponse,
  parseCanvasInstructionResponse,
} from "./canvasScene";
import { resolveRewriteContext } from "./editorContext";
import { getAIErrorMessage } from "./errorHandling";
import { PKMerAuthService } from "./PKMerAuthService";
import { getAIToolboxArtifactKind, getAIToolboxPrompt } from "./toolboxActions";
import { DEFAULT_REWRITE_ACTIONS, type RewriteArtifactKind, type RewriteArtifactRequest, type RewriteArtifactResult, type RewriteInstruction } from "./types";
import { createAIEditorExtensions, startRewriteEffect, triggerCompletionEffect } from "./extensions";
import { shouldShowAIFeatures } from "src/util/locale";
import { compactContent } from "./contextCompactor";
import type { ActiveCanvasContext, CanvasInstructionPlan, CanvasNodeSummary } from "./canvasScene";

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
const TOOLBAR_AI_BUSY_ATTR = "data-editing-toolbar-ai-busy";
const TOOLBAR_AI_BUSY_COUNT_ATTR = "data-editing-toolbar-ai-busy-count";

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

  async openCanvasNodeExpansionModal(): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    if ((await this.getToolbarRouteState()) === "unavailable") {
      new Notice(await this.getProviderRouteStatusText());
      return false;
    }

    if (!getActiveCanvasTextFileView(this.plugin)) {
      new Notice(t("Canvas AI requires an active Canvas file."));
      return false;
    }

    let canvasContext: ActiveCanvasContext;
    try {
      canvasContext = await getActiveCanvasContext(this.plugin);
    } catch (error) {
      new Notice(getAIErrorMessage(error));
      return false;
    }

    new TextInputModal(
      this.plugin.app,
      t("Expand current canvas node"),
      [
        {
          key: "instruction",
          label: t("Instruction"),
          placeholder: t("e.g. split into next steps, risks, dependencies"),
          defaultValue: "",
          multiline: true,
          hideLabel: true,
        },
      ],
      (result) => {
        void this.expandCurrentCanvasNode(result.instruction);
      },
      {
        modalClassName: "editing-toolbar-text-input-modal-wide",
        contextLabel: canvasContext.selectedNodes.length > 0 ? t("Selected nodes") : undefined,
        contextItems: this.buildCanvasSelectionContextItems(canvasContext),
        suggestions: this.getCanvasExpansionPromptSuggestions(),
      },
    ).open();

    return true;
  }

  async openCanvasGlobalPromptModal(): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    if ((await this.getToolbarRouteState()) === "unavailable") {
      new Notice(await this.getProviderRouteStatusText());
      return false;
    }

    if (!getActiveCanvasTextFileView(this.plugin)) {
      new Notice(t("Canvas AI requires an active Canvas file."));
      return false;
    }

    let canvasContext: ActiveCanvasContext;
    try {
      canvasContext = await getActiveCanvasContext(this.plugin, { requireAnchor: false });
    } catch (error) {
      new Notice(getAIErrorMessage(error));
      return false;
    }

    new TextInputModal(
      this.plugin.app,
      t("Canvas global prompt"),
      [
        {
          key: "instruction",
          label: t("Instruction"),
          placeholder: this.getCanvasGlobalPromptPlaceholder(canvasContext),
          defaultValue: "",
          multiline: true,
          hideLabel: true,
        },
      ],
      (result) => {
        void this.runCanvasGlobalInstruction(result.instruction);
      },
      {
        modalClassName: "editing-toolbar-text-input-modal-wide",
        contextLabel: canvasContext.selectedNodes.length > 0 ? t("Selected nodes") : undefined,
        contextItems: this.buildCanvasSelectionContextItems(canvasContext),
        suggestions: this.getCanvasGlobalPromptSuggestions(canvasContext),
      },
    ).open();

    return true;
  }

  async expandCurrentCanvasNode(instruction?: string): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    if ((await this.getToolbarRouteState()) === "unavailable") {
      new Notice(await this.getProviderRouteStatusText());
      return false;
    }

    try {
      const canvasContext = await getActiveCanvasContext(this.plugin);
      return await this.withCanvasToolbarBusyState(canvasContext.view, async () => {
        new Notice(t("Canvas AI is expanding the current node..."));

        let response = "";
        for await (const chunk of this.aiService.rewrite({
          selectedText: canvasContext.anchorNode.text,
          instruction: "custom",
          customPrompt: this.buildCanvasExpansionPrompt(instruction),
          context: canvasContext.contextText,
        })) {
          response += chunk;
        }

        const draftNodes = parseCanvasExpansionResponse(response);
        const result = await applyCanvasExpansionDraft(this.plugin, canvasContext, draftNodes);
        new Notice(`${t("Canvas AI added")} ${result.addedNodeCount} ${t("nodes to the board.")}`);
        return true;
      });
    } catch (error) {
      const message = getAIErrorMessage(error);
      new Notice(message);
      console.error("[Canvas AI] Failed to expand current node:", error);
      return false;
    }
  }

  async runCanvasGlobalInstruction(instruction?: string): Promise<boolean> {
    if (!this.plugin.settings.ai.enabled) {
      new Notice(t("AI features are disabled in settings."));
      return false;
    }

    if ((await this.getToolbarRouteState()) === "unavailable") {
      new Notice(await this.getProviderRouteStatusText());
      return false;
    }

    try {
      const canvasContext = await getActiveCanvasContext(this.plugin, { requireAnchor: false });
      const effectiveInstruction = instruction?.trim();
      if (!effectiveInstruction) {
        new Notice(t("Please enter your canvas instruction."));
        return false;
      }

      return await this.withCanvasToolbarBusyState(canvasContext.view, async () => {
        const mode = this.resolveCanvasGlobalInstructionMode(effectiveInstruction);
        if (mode === "article" || mode === "slides") {
          return this.generateCanvasDerivedMarkdown(canvasContext, effectiveInstruction, mode);
        }
        const isReorganizeMode = mode === "reorganize";
        const documentSource = isReorganizeMode
          ? await buildCanvasDocumentSource(this.plugin, canvasContext)
          : null;
        const deterministicReorganizationPlan = isReorganizeMode
          ? buildDeterministicCanvasReorganizationPlan(canvasContext)
          : null;

        new Notice(t(isReorganizeMode
          ? "Canvas AI is reorganizing the board..."
          : "Canvas AI is processing the board..."));

        let plan: CanvasInstructionPlan;
        if (isReorganizeMode && deterministicReorganizationPlan) {
          try {
            let response = "";
            for await (const chunk of this.aiService.rewrite({
              selectedText: documentSource?.text || canvasContext.anchorNode?.text || "Canvas board",
              instruction: "custom",
              customPrompt: this.buildCanvasReorganizationPrompt(
                effectiveInstruction,
                documentSource?.scope ?? "board",
                deterministicReorganizationPlan,
              ),
              context: canvasContext.contextText,
            })) {
              response += chunk;
            }

            const rawPlan = parseCanvasInstructionResponse(response);
            plan = mergeCanvasReorganizationPlans({
              ...rawPlan,
              addNodes: [],
            }, deterministicReorganizationPlan);
          } catch (error) {
            console.warn("[Canvas AI] Falling back to deterministic reorganization plan:", error);
            plan = deterministicReorganizationPlan;
          }
        } else {
          let response = "";
          for await (const chunk of this.aiService.rewrite({
            selectedText: documentSource?.text || canvasContext.anchorNode?.text || "Canvas board",
            instruction: "custom",
            customPrompt: this.buildCanvasGlobalPrompt(effectiveInstruction, !!canvasContext.anchorNode),
            context: canvasContext.contextText,
          })) {
            response += chunk;
          }

          plan = parseCanvasInstructionResponse(response);
        }

        const result = await applyCanvasInstructionPlan(this.plugin, canvasContext, plan);
        new Notice(isReorganizeMode
          ? `${t("Canvas AI reorganized the board:")} ${result.movedNodeCount} ${t("nodes moved")}, ${result.addedEdgeCount} ${t("links rebuilt")}.`
          : `${t("Canvas AI updated the board:")} ${result.addedNodeCount} ${t("nodes")}, ${result.addedEdgeCount} ${t("links")}.`);
        return true;
      });
    } catch (error) {
      const message = getAIErrorMessage(error);
      new Notice(message);
      console.error("[Canvas AI] Failed to run global instruction:", error);
      return false;
    }
  }

  private buildCanvasExpansionPrompt(instruction?: string): string {
    const userInstruction = instruction?.trim() || t("Expand the current node into the most useful next neighboring nodes.");

    return [
      "You are assisting inside an existing Obsidian Canvas.",
      "Return JSON only. No explanations. No markdown fences.",
      "Task:",
      "- Expand the current focus node into useful neighboring text nodes for the same board.",
      "- Follow the user instruction first.",
      "- Avoid repeating ideas that already exist in the nearby canvas context.",
      "- Prefer 2 to 5 concrete nodes unless the instruction clearly needs fewer.",
      "- Keep every node concise, specific, and ready to place on the board.",
      "- The app will create ids, coordinates, and edges locally, so do not output them.",
      "Output schema:",
      "{",
      '  "nodes": [',
      "    {",
      '      "title": "Short node title",',
      '      "body": "Short Obsidian-friendly Markdown body",',
      '      "relation": "optional short edge label",',
      '      "color": "optional canvas color id"',
      "    }",
      "  ]",
      "}",
      "Rules:",
      "- Return exactly one JSON object with a nodes array.",
      "- Do not return edges, ids, x, y, width, height, or commentary.",
      "- title should be short and scannable.",
      "- body should be brief and useful, usually bullets or one short paragraph.",
      "- relation is optional and should be short if present.",
      "",
      `User instruction:\n${userInstruction}`,
    ].join("\n");
  }

  private getCanvasGlobalPromptPlaceholder(canvasContext: ActiveCanvasContext): string {
    if (canvasContext.selectedNodes.length > 0) {
      return t("e.g. tidy selected layout, connect selected nodes, add missing branches");
    }

    return t("e.g. reorganize the board, turn this canvas into an article, turn this canvas into Obsidian Slides");
  }

  private getCanvasGlobalPromptSuggestions(canvasContext: ActiveCanvasContext): ITextInputSuggestion[] {
    if (canvasContext.selectedNodes.length > 0) {
      return [
        {
          label: t("Tidy selected layout"),
          value: t("Reorganize the selected nodes into a clearer local hierarchy with tidy spacing and fewer edge crossings. Reuse current nodes instead of adding new ones."),
        },
        {
          label: t("Connect selected nodes"),
          value: t("Connect the selected nodes with the most meaningful relationships."),
        },
        {
          label: t("Add missing branches"),
          value: t("Add the missing branches around the selected nodes."),
        },
        {
          label: t("Clarify structure"),
          value: t("Clarify the structure around the selected nodes and remove ambiguity."),
        },
        {
          label: t("Generate next steps"),
          value: t("Generate the next actionable steps from the selected nodes."),
        },
        {
          label: t("Add risks and dependencies"),
          value: t("Add the risks, dependencies, and constraints related to the selected nodes."),
        },
      ];
    }

    return [
      {
        label: t("Organize canvas layout"),
        value: t("Reorganize this canvas into a clean hierarchy with tidy spacing, aligned sibling nodes, and fewer edge crossings. Reuse current nodes instead of adding new ones."),
      },
      {
        label: t("Reduce edge crossings"),
        value: t("Reorganize the canvas to reduce edge crossings, keep related nodes close, and make the reading path clearer. Reuse current nodes instead of adding new ones."),
      },
      {
        label: t("Canvas to article"),
        value: t("Convert this canvas into a polished Markdown article draft."),
      },
      {
        label: t("Canvas to slides"),
        value: t("Convert this canvas into Obsidian Slides Markdown."),
      },
      {
        label: t("Reorganize board"),
        value: t("Reorganize the existing canvas nodes into a clearer hierarchy and grouping. Reuse current nodes instead of adding new ones."),
      },
      {
        label: t("Connect board clusters"),
        value: t("Connect the related clusters across the whole canvas and add missing bridge nodes."),
      },
      {
        label: t("Summarize main narrative"),
        value: t("Identify the main narrative of this canvas and improve the section flow."),
      },
    ];
  }

  getCanvasExpansionPromptSuggestions(): ITextInputSuggestion[] {
    return [
      {
        label: t("Generate next steps"),
        value: t("Generate the next actionable steps from the current canvas node."),
      },
      {
        label: t("Add risks and dependencies"),
        value: t("Add the risks, dependencies, and constraints related to the current canvas node."),
      },
      {
        label: t("Add missing branches"),
        value: t("Add the missing branches around the current canvas node."),
      },
      {
        label: t("Clarify structure"),
        value: t("Clarify the structure around the current canvas node and remove ambiguity."),
      },
    ];
  }

  private resolveCanvasGlobalInstructionMode(instruction: string): "board" | "article" | "slides" | "reorganize" {
    const normalizedInstruction = this.normalizeCanvasInstructionText(instruction);
    const localizedArticleHints = [
      t("Canvas to article"),
      t("Convert this canvas into a polished Markdown article draft."),
    ].map((item) => this.normalizeCanvasInstructionText(item));
    const localizedSlidesHints = [
      t("Canvas to slides"),
      t("Convert this canvas into Obsidian Slides Markdown."),
    ].map((item) => this.normalizeCanvasInstructionText(item));
    const localizedReorganizeHints = [
      t("Organize canvas layout"),
      t("Reorganize this canvas into a clean hierarchy with tidy spacing, aligned sibling nodes, and fewer edge crossings. Reuse current nodes instead of adding new ones."),
      t("Reduce edge crossings"),
      t("Reorganize the canvas to reduce edge crossings, keep related nodes close, and make the reading path clearer. Reuse current nodes instead of adding new ones."),
      t("Tidy selected layout"),
      t("Reorganize the selected nodes into a clearer local hierarchy with tidy spacing and fewer edge crossings. Reuse current nodes instead of adding new ones."),
      t("Reorganize board"),
      t("Reorganize the whole canvas into a clearer hierarchy with better grouping."),
      t("Reorganize the existing canvas nodes into a clearer hierarchy and grouping. Reuse current nodes instead of adding new ones."),
    ].map((item) => this.normalizeCanvasInstructionText(item));

    if (localizedArticleHints.some((hint) => hint && normalizedInstruction.includes(hint))) {
      return "article";
    }

    if (localizedSlidesHints.some((hint) => hint && normalizedInstruction.includes(hint))) {
      return "slides";
    }

    if (/(^|\b)(slides?|slide deck|presentation|deck|reveal)(\b|$)|幻灯片|投影片|演示文稿/i.test(normalizedInstruction)) {
      return "slides";
    }

    if (/(^|\b)(article|document|essay|blog|post|writeup|manuscript)(\b|$)|文章|文稿|稿子|长文|博文|文档/i.test(normalizedInstruction)) {
      return "article";
    }

    if (localizedReorganizeHints.some((hint) => hint && normalizedInstruction.includes(hint))) {
      return "reorganize";
    }

    if (/(^|\b)(organize|reorganize|rearrange|restructure|regroup|relayout|layout|tidy|tidy up|clean up|reduce crossings?|edge crossings?)(\b|$)|重组|重排|重整|重新布局|整理布局|整理画布|整理结构|梳理结构|减少交叉|避免交叉|连线交叉|层级|分组/i.test(normalizedInstruction)) {
      return "reorganize";
    }

    return "board";
  }

  private normalizeCanvasInstructionText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ");
  }

  private buildCanvasGlobalPrompt(instruction: string, hasAnchorNode: boolean): string {
    return [
      "You are assisting inside an existing Obsidian Canvas.",
      "Return JSON only. No explanations. No markdown fences.",
      "You may add new nodes and/or connect existing nodes already on the board.",
      "The local app will validate ids, coordinates, and edges.",
      "Output schema:",
      "{",
      '  "addNodes": [',
      "    {",
      '      "title": "Short node title",',
      '      "body": "Short Obsidian-friendly Markdown body",',
      hasAnchorNode
        ? '      "connectTo": "anchor or existing node id",'
        : '      "connectTo": "existing node id (optional)",',
      '      "relation": "optional short edge label",',
      '      "color": "optional canvas color id"',
      "    }",
      "  ],",
      '  "addEdges": [',
      "    {",
      hasAnchorNode
        ? '      "fromNode": "anchor or existing node id",'
        : '      "fromNode": "existing node id",',
      hasAnchorNode
        ? '      "toNode": "anchor or existing node id",'
        : '      "toNode": "existing node id",',
      '      "label": "optional short edge label"',
      "    }",
      "  ]",
      "}",
      "Rules:",
      "- Use exact existing node ids when creating edges to existing nodes.",
      "- Prefer concise, high-value updates that fit the current board.",
      "- Do not output ids, x, y, width, or height for new nodes.",
      "- If no new nodes are needed, return an empty addNodes array.",
      "- If no new edges are needed, return an empty addEdges array.",
      hasAnchorNode
        ? "- You may use anchor/current to refer to the selected focus node."
        : "- No node is currently selected. Do not use anchor/current placeholders; use exact existing node ids or leave connectTo empty.",
      "",
      `User instruction:\n${instruction}`,
    ].join("\n");
  }

  private buildCanvasReorganizationPrompt(
    instruction: string,
    scope: "selection" | "board",
    deterministicPlan?: CanvasInstructionPlan,
  ): string {
    const deterministicPlanText = deterministicPlan
      ? JSON.stringify({
        layoutNodes: deterministicPlan.layoutNodes,
        replaceExistingEdges: deterministicPlan.replaceExistingEdges,
        addEdges: deterministicPlan.addEdges,
      }, null, 2)
      : "";

    return [
      "You are reorganizing an existing Obsidian Canvas.",
      "Return JSON only. No explanations. No markdown fences.",
      "Reuse existing canvas nodes only. Do not create new nodes.",
      "The selectedText contains an ordered traversal of the relevant canvas nodes with exact node ids and current links.",
      scope === "selection"
        ? "Reorganize only the selected canvas nodes."
        : "Reorganize the whole canvas.",
      "Output schema:",
      "{",
      '  "layoutNodes": [',
      "    {",
      '      "nodeId": "existing node id",',
      '      "column": 0,',
      '      "row": 0',
      "    }",
      "  ],",
      '  "replaceExistingEdges": true,',
      '  "addEdges": [',
      "    {",
      '      "fromNode": "existing node id",',
      '      "toNode": "existing node id",',
      '      "label": "optional short edge label"',
      "    }",
      "  ]",
      "}",
      "Rules:",
      "- Use only existing node ids from the provided canvas data.",
      "- Do not return addNodes, titles, bodies, or new ids.",
      "- Use layoutNodes to place the existing nodes into a clearer hierarchy or grouped structure.",
      "- When you are rebuilding the relationship structure, set replaceExistingEdges to true.",
      "- Prefer a simple left-to-right hierarchy with compact grouping unless the user instruction says otherwise.",
      "- Prefer reducing obvious line crossings, aligning siblings, and keeping related nodes in readable clusters.",
      "- If the current links already fit the new structure, you may keep replaceExistingEdges false and return layoutNodes only.",
      deterministicPlanText
        ? [
          "",
          "A deterministic local draft is provided below.",
          "Use it as the baseline layout when it is already reasonable, and only override parts that clearly improve readability or reduce edge crossings.",
          "If you rebuild edges, return only the improved edge set for the nodes in scope.",
          "deterministic_local_draft:",
          deterministicPlanText,
        ].join("\n")
        : "",
      "",
      `User instruction:\n${instruction}`,
    ].join("\n");
  }

  private buildCanvasArticlePrompt(instruction: string, scope: "selection" | "board"): string {
    return [
      "You are converting an Obsidian Canvas into a coherent Markdown article.",
      "Return Markdown only. No explanations. No markdown fences.",
      "The selectedText contains an ordered traversal of the canvas nodes.",
      "The traversal follows canvas structure, starting from root nodes and walking through connected children when possible.",
      scope === "selection"
        ? "Focus on the selected canvas nodes as the primary source."
        : "Focus on the whole canvas as the primary source.",
      "Requirements:",
      "- Create a clear title and section hierarchy.",
      "- Merge overlapping fragments into readable paragraphs or bullets.",
      "- Preserve concrete facts, steps, and relationships from the canvas.",
      "- Remove duplication, but do not invent unsupported claims.",
      "- Keep the result Obsidian-friendly Markdown.",
      "",
      `User instruction:\n${instruction}`,
    ].join("\n");
  }

  private buildCanvasSlidesPrompt(instruction: string, scope: "selection" | "board"): string {
    return [
      "You are converting an Obsidian Canvas into Markdown for Obsidian Slides.",
      "Return Markdown only. No explanations. No markdown fences.",
      "The selectedText contains an ordered traversal of the canvas nodes.",
      "Use `---` as the slide separator so the result works with the core Slides plugin.",
      scope === "selection"
        ? "Focus on the selected canvas nodes as the slide source."
        : "Focus on the whole canvas as the slide source.",
      "Requirements:",
      "- Start with a title slide.",
      "- Create concise, presentation-ready slides with short headings and bullets.",
      "- Prefer 6 to 12 slides unless the instruction clearly asks for another length.",
      "- Combine related nodes into the same slide when that improves clarity.",
      "- End with a summary or next-steps slide when helpful.",
      "",
      `User instruction:\n${instruction}`,
    ].join("\n");
  }

  private buildCanvasSelectionContextItems(canvasContext: ActiveCanvasContext) {
    return canvasContext.selectedNodes.map((node, index) => {
      const previewSource = node.text.trim() || node.id;
      const previewText = previewSource.replace(/\s+/g, " ").trim();
      const shortPreview = previewText.length > 80 ? `${previewText.slice(0, 80)}...` : previewText;
      const title = node.text.length > 140 ? `${node.text.slice(0, 140)}...` : node.text;

      return {
        label: this.getCanvasContextNodeLabel(node, canvasContext.anchorNode?.id, index),
        preview: `${shortPreview} (${node.text.length.toLocaleString()} chars)`,
        title: title || node.id,
      };
    });
  }

  private getCanvasContextNodeLabel(node: CanvasNodeSummary, anchorNodeId?: string | null, index: number = 0): string {
    const firstMeaningfulLine = node.text
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .find(Boolean);
    const shortTitle = firstMeaningfulLine && firstMeaningfulLine.length > 28
      ? `${firstMeaningfulLine.slice(0, 28)}...`
      : firstMeaningfulLine;
    const role = anchorNodeId && node.id === anchorNodeId ? t("Focused") : `${t("Selected")} ${index + 1}`;

    return shortTitle
      ? `${role} · ${shortTitle}`
      : `${role} · ${node.type}`;
  }

  private async generateCanvasDerivedMarkdown(
    canvasContext: ActiveCanvasContext,
    instruction: string,
    mode: "article" | "slides",
  ): Promise<boolean> {
    try {
      const source = await buildCanvasDocumentSource(this.plugin, canvasContext);
      new Notice(mode === "article"
        ? t("Canvas AI is drafting an article...")
        : t("Canvas AI is drafting slides..."));

      let response = "";
      for await (const chunk of this.aiService.rewrite({
        selectedText: source.text,
        instruction: "custom",
        customPrompt: mode === "article"
          ? this.buildCanvasArticlePrompt(instruction, source.scope)
          : this.buildCanvasSlidesPrompt(instruction, source.scope),
        context: canvasContext.contextText,
      })) {
        response += chunk;
      }

      const normalizedMarkdown = this.normalizeCanvasGeneratedMarkdown(response);
      if (!normalizedMarkdown) {
        throw new Error(t("Canvas AI did not return any usable Markdown."));
      }

      const createdFile = await this.createCanvasMarkdownFile(canvasContext, mode, normalizedMarkdown);
      const targetLeaf = this.plugin.app.workspace.getLeaf(true);
      await targetLeaf.openFile(createdFile);
      new Notice(`${t("Created AI file:")} ${createdFile.path}`);
      return true;
    } catch (error) {
      const message = getAIErrorMessage(error);
      new Notice(message);
      console.error("[Canvas AI] Failed to generate derived markdown:", error);
      return false;
    }
  }

  private async withCanvasToolbarBusyState<T>(view: ActiveCanvasContext["view"], task: () => Promise<T>): Promise<T> {
    const container = (view as ActiveCanvasContext["view"] & { containerEl?: HTMLElement }).containerEl;
    if (!container) {
      return task();
    }

    const ownerDocument = container.ownerDocument;
    const busyScope = ownerDocument?.body ?? ownerDocument?.documentElement ?? null;

    if (busyScope) {
      const currentToolbarBusyCount = Number.parseInt(busyScope.getAttribute(TOOLBAR_AI_BUSY_COUNT_ATTR) ?? "0", 10);
      const nextToolbarBusyCount = Number.isFinite(currentToolbarBusyCount) ? currentToolbarBusyCount + 1 : 1;
      busyScope.setAttribute(TOOLBAR_AI_BUSY_COUNT_ATTR, String(nextToolbarBusyCount));
      busyScope.setAttribute(TOOLBAR_AI_BUSY_ATTR, "true");
    }

    try {
      return await task();
    } finally {
      if (busyScope) {
        const activeToolbarBusyCount = Number.parseInt(busyScope.getAttribute(TOOLBAR_AI_BUSY_COUNT_ATTR) ?? "1", 10);
        const remainingToolbarBusyCount = Number.isFinite(activeToolbarBusyCount) ? Math.max(activeToolbarBusyCount - 1, 0) : 0;

        if (remainingToolbarBusyCount > 0) {
          busyScope.setAttribute(TOOLBAR_AI_BUSY_COUNT_ATTR, String(remainingToolbarBusyCount));
        } else {
          busyScope.removeAttribute(TOOLBAR_AI_BUSY_COUNT_ATTR);
          busyScope.removeAttribute(TOOLBAR_AI_BUSY_ATTR);
        }
      }
    }
  }

  private normalizeCanvasGeneratedMarkdown(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) {
      return "";
    }

    return trimmed
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
      .concat("\n");
  }

  private async createCanvasMarkdownFile(
    canvasContext: ActiveCanvasContext,
    mode: "article" | "slides",
    content: string,
  ) {
    const parentPath = canvasContext.file.parent?.path && canvasContext.file.parent.path !== "/"
      ? canvasContext.file.parent.path
      : "";
    const suffix = mode === "article" ? t("AI Article Draft") : t("AI Slides");
    const filePath = await this.getAvailableArtifactPath(parentPath, `${canvasContext.file.basename} ${suffix}`, "md");
    return this.plugin.app.vault.create(filePath, content);
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
