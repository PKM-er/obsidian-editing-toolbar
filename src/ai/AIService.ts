import { requestUrl, type RequestUrlResponse } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { AIUserNoticeError, getAIErrorMessage, getRequestErrorStatus } from "./errorHandling";
import { resolvePKMerModelForScene } from "./types";
import type { CompletionParams, IAIService, PKMerModelScene, RewriteArtifactKind, RewriteInstruction, RewriteParams } from "./types";
import type { CustomModelApiFormat } from "./types";
import { PKMerAuthService } from "./PKMerAuthService";

interface ResolvedProvider {
  kind: "pkmer" | "custom";
  apiFormat: CustomModelApiFormat;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

interface CustomProviderValidationResult {
  provider: ResolvedProvider | null;
  missing: string[];
}

interface ChatCompletionOptions {
  maxTokens?: number;
  pkmerScene?: PKMerModelScene;
}

interface ChatCompletionResult {
  text: string;
  finishReason?: string;
}

export class ToolbarAIService implements IAIService {
  private plugin: EditingToolbarPlugin;
  private authService: PKMerAuthService;
  private customChatCompletionsUrlCache = new Map<string, string>();

  constructor(plugin: EditingToolbarPlugin, authService: PKMerAuthService) {
    this.plugin = plugin;
    this.authService = authService;
  }

  async *complete(params: CompletionParams, signal?: AbortSignal): AsyncIterable<string> {
    const text = await this.requestCompletion(params, signal);
    yield* this.streamText(text, signal);
  }

  async *rewrite(params: RewriteParams, signal?: AbortSignal): AsyncIterable<string> {
    const text = await this.requestRewrite(params, signal);
    yield* this.streamText(text, signal);
  }

  hasCustomProviderConfigured(): boolean {
    return !!this.getCustomProviderValidation().provider;
  }

  async testCustomProviderConnection(): Promise<void> {
    const validation = this.getCustomProviderValidation();
    if (!validation.provider) {
      throw new Error(`Missing custom model settings: ${validation.missing.join(", ")}`);
    }

    await this.requestChatCompletionResult(
      [
        {
          role: "system",
          content: "Reply with OK only.",
        },
        {
          role: "user",
          content: "ping",
        },
      ],
      undefined,
      {
        maxTokens: 1,
      },
      validation.provider,
    );
  }

  async listCustomOllamaModels(): Promise<string[]> {
    const validation = this.getCustomProviderValidation();
    const provider = validation.provider;
    if (!provider || provider.kind !== "custom" || provider.apiFormat !== "ollama") {
      throw new Error("Ollama custom model settings are not enabled.");
    }

    const candidateUrls = this.buildOllamaTagsCandidateUrls(provider.baseUrl);
    let lastError: unknown = null;

    for (let index = 0; index < candidateUrls.length; index += 1) {
      const requestUrlValue = candidateUrls[index];
      try {
        const response = await requestUrl({
          url: requestUrlValue,
          method: "GET",
          headers: this.buildRequestHeaders(provider.apiKey),
        });

        if (response.status >= 200 && response.status < 300) {
          return this.extractOllamaModelNames(response.json);
        }

        throw this.createRequestResponseError(response, requestUrlValue);
      } catch (error) {
        lastError = error;
        const canRetryWithNextUrl = index < candidateUrls.length - 1 && this.isRetryableEndpointError(error);
        if (canRetryWithNextUrl) {
          continue;
        }

        await this.rethrowUserFacingRequestError(error, requestUrlValue);
      }
    }

    await this.rethrowUserFacingRequestError(lastError, candidateUrls[0] ?? provider.baseUrl);
  }

  private async requestCompletion(params: CompletionParams, signal?: AbortSignal): Promise<string> {
    const localPrefix = params.prefix.slice(-2000);
    const localSuffix = params.suffix.slice(0, 800);
    const contextBlock = params.context ? `\n\nLocal cursor metadata:\n${params.context}` : "";
    const provider = await this.resolveProvider("completion");
    let accumulated = "";

    for (let round = 0; round < 3; round++) {
      const response = await this.requestChatCompletionResult(
        this.buildCompletionMessages(localPrefix, localSuffix, contextBlock, accumulated),
        signal,
        {
          maxTokens: this.getCompletionTokenBudget(localPrefix, localSuffix, accumulated, round),
          pkmerScene: "completion",
        },
        provider,
      );

      const nextSegment = this.removeRepeatedPrefix(accumulated, response.text);
      if (!nextSegment) {
        break;
      }

      accumulated += nextSegment;

      if (response.finishReason !== "length") {
        return accumulated.trimEnd();
      }

      if (this.looksSemanticallyComplete(accumulated)) {
        return this.trimCompletionToBoundary(accumulated);
      }
    }

    return this.trimCompletionToBoundary(accumulated) || accumulated.trimEnd();
  }

  private async requestRewrite(params: RewriteParams, signal?: AbortSignal): Promise<string> {
    return this.requestChatCompletion(
      this.buildRewriteMessages(params),
      signal,
      {
        pkmerScene: this.resolveRewriteScene(params),
      },
    );
  }

  private async requestChatCompletion(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal,
    options: ChatCompletionOptions = {},
  ): Promise<string> {
    const response = await this.requestChatCompletionResult(messages, signal, options);
    return response.text;
  }

  private async requestChatCompletionResult(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal,
    options: ChatCompletionOptions = {},
    provider?: ResolvedProvider,
  ): Promise<ChatCompletionResult> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const resolvedProvider = provider ?? (await this.resolveProvider(options.pkmerScene));
    const { response } = await this.requestChatCompletionsWithFallback(resolvedProvider, messages, signal, options);

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const payload = response.json;
    const text = this.extractText(payload);
    return {
      text,
      finishReason: payload?.choices?.[0]?.finish_reason ?? payload?.done_reason ?? (payload?.done ? "stop" : undefined),
    };
  }

  private async requestChatCompletionsWithFallback(
    provider: ResolvedProvider,
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal,
    options: ChatCompletionOptions = {},
  ): Promise<{ response: RequestUrlResponse; requestUrlValue: string }> {
    const candidateUrls = this.getChatCompletionsCandidateUrls(provider);
    let lastError: unknown = null;

    for (let index = 0; index < candidateUrls.length; index += 1) {
      const requestUrlValue = candidateUrls[index];
      try {
        const response = await this.executeChatCompletionsRequest(requestUrlValue, provider, messages, signal, options);
        if (provider.kind === "custom") {
          this.rememberCustomChatCompletionsUrl(provider.baseUrl, provider.apiFormat, requestUrlValue);
        }
        return { response, requestUrlValue };
      } catch (error) {
        lastError = error;
        const canRetryWithNextUrl = provider.kind === "custom"
          && index < candidateUrls.length - 1
          && this.isRetryableEndpointError(error);
        if (canRetryWithNextUrl) {
          continue;
        }

        await this.rethrowUserFacingRequestError(error, requestUrlValue);
      }
    }

    await this.rethrowUserFacingRequestError(lastError, candidateUrls[0] ?? provider.baseUrl);
  }

  private async executeChatCompletionsRequest(
    requestUrlValue: string,
    provider: ResolvedProvider,
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal,
    options: ChatCompletionOptions = {},
  ): Promise<RequestUrlResponse> {
    const response = await requestUrl({
      url: requestUrlValue,
      method: "POST",
      headers: this.buildRequestHeaders(provider.apiKey),
      body: JSON.stringify(this.buildRequestBody(requestUrlValue, provider, messages, options)),
    });

    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    throw this.createRequestResponseError(response, requestUrlValue);
  }

  private buildRequestBody(
    requestUrlValue: string,
    provider: ResolvedProvider,
    messages: Array<{ role: string; content: string }>,
    options: ChatCompletionOptions = {},
  ): Record<string, unknown> {
    if (provider.kind === "custom" && provider.apiFormat === "ollama") {
      return this.buildOllamaRequestBody(requestUrlValue, provider, messages, options);
    }

    return {
      model: provider.model,
      temperature: provider.temperature,
      max_tokens: options.maxTokens,
      stream: false,
      messages,
    };
  }

  private buildOllamaRequestBody(
    requestUrlValue: string,
    provider: ResolvedProvider,
    messages: Array<{ role: string; content: string }>,
    options: ChatCompletionOptions = {},
  ): Record<string, unknown> {
    const ollamaOptions: Record<string, unknown> = {};

    if (Number.isFinite(provider.temperature)) {
      ollamaOptions.temperature = provider.temperature;
    }

    if (typeof options.maxTokens === "number") {
      ollamaOptions.num_predict = options.maxTokens;
    }

    if (/\/api\/generate$/i.test(requestUrlValue)) {
      return {
        model: provider.model,
        prompt: this.buildOllamaGeneratePrompt(messages),
        stream: false,
        options: Object.keys(ollamaOptions).length > 0 ? ollamaOptions : undefined,
      };
    }

    return {
      model: provider.model,
      stream: false,
      messages,
      options: Object.keys(ollamaOptions).length > 0 ? ollamaOptions : undefined,
    };
  }

  private buildOllamaGeneratePrompt(messages: Array<{ role: string; content: string }>): string {
    const prompt = messages
      .filter((message) => typeof message.content === "string" && message.content.trim().length > 0)
      .map((message) => `${message.role.toUpperCase()}:\n${message.content.trim()}`)
      .join("\n\n");

    return prompt ? `${prompt}\n\nASSISTANT:\n` : "ASSISTANT:\n";
  }

  private async resolveProvider(scene: PKMerModelScene = "rewrite"): Promise<ResolvedProvider> {
    const pkmerProvider = await this.getPKMerProvider(scene);
    if (pkmerProvider) {
      return pkmerProvider;
    }

    const customProvider = this.getCustomProviderValidation().provider;
    if (customProvider) {
      return customProvider;
    }

    throw new Error("No AI provider is configured. Please log in to PKMer or fill in custom model settings.");
  }

  private async getPKMerProvider(scene: PKMerModelScene): Promise<ResolvedProvider | null> {
    const settings = this.plugin.settings.ai;
    const verified = await this.authService.verify();
    if (!verified || !this.authService.aiToken) {
      return null;
    }

    return {
      kind: "pkmer",
      apiFormat: "openai-compatible",
      baseUrl: settings.pkmerApiBaseUrl,
      apiKey: this.authService.aiToken,
      model: resolvePKMerModelForScene(settings, scene),
      temperature: settings.customModel.temperature,
    };
  }

  private getCustomProviderValidation(): CustomProviderValidationResult {
    if (!this.plugin.settings.ai.enableCustomModel) {
      return { provider: null, missing: ["disabled"] };
    }

    const custom = this.plugin.settings.ai.customModel;
    const customApiKey = this.authService.customModelApiKey.trim();
    const customApiFormat = custom.apiFormat ?? "openai-compatible";
    const missing: string[] = [];

    if (!custom.baseUrl.trim()) {
      missing.push("baseUrl");
    }
    if (!custom.model.trim()) {
      missing.push("model");
    }
    if (customApiFormat !== "ollama" && !customApiKey) {
      missing.push("apiKey");
    }

    if (missing.length > 0) {
      return { provider: null, missing };
    }

    return {
      provider: {
        kind: "custom",
        apiFormat: customApiFormat,
        baseUrl: custom.baseUrl.trim(),
        apiKey: customApiKey,
        model: custom.model.trim(),
        temperature: custom.temperature,
      },
      missing: [],
    };
  }

  private buildChatCompletionsUrl(baseUrl: string): string {
    return this.buildChatCompletionsCandidateUrls(baseUrl)[0] ?? baseUrl.trim().replace(/\/+$/, "");
  }

  private getChatCompletionsCandidateUrls(provider: ResolvedProvider): string[] {
    if (provider.kind !== "custom") {
      return [this.buildChatCompletionsUrl(provider.baseUrl)];
    }

    const cacheKey = this.getCustomProviderCacheKey(provider.baseUrl, provider.apiFormat);
    const cachedUrl = this.customChatCompletionsUrlCache.get(cacheKey);
    const urls = provider.apiFormat === "ollama"
      ? this.buildOllamaCandidateUrls(provider.baseUrl)
      : this.buildChatCompletionsCandidateUrls(provider.baseUrl);
    if (!cachedUrl) {
      return urls;
    }

    return [cachedUrl, ...urls.filter((url) => url !== cachedUrl)];
  }

  private buildChatCompletionsCandidateUrls(baseUrl: string): string[] {
    const normalized = this.normalizeProviderBaseUrl(baseUrl);
    if (!normalized) {
      return [];
    }

    if (/\/chat\/completions$/i.test(normalized)) {
      return [normalized];
    }

    if (/\/v\d+$/i.test(normalized)) {
      return [`${normalized}/chat/completions`];
    }

    const directUrl = `${normalized}/chat/completions`;
    const v1Url = `${normalized}/v1/chat/completions`;
    const v3Url = `${normalized}/v3/chat/completions`;

    if (this.hasPathSegment(normalized)) {
      return [directUrl, v1Url, v3Url];
    }

    return [v1Url, directUrl, v3Url];
  }

  private buildOllamaCandidateUrls(baseUrl: string): string[] {
    const normalized = this.normalizeProviderBaseUrl(baseUrl);
    if (!normalized) {
      return [];
    }

    if (/\/api\/(chat|generate)$/i.test(normalized)) {
      return [normalized];
    }

    if (/\/api$/i.test(normalized)) {
      return [`${normalized}/chat`, `${normalized}/generate`];
    }

    return [`${normalized}/api/chat`, `${normalized}/api/generate`];
  }

  private buildOllamaTagsCandidateUrls(baseUrl: string): string[] {
    const normalized = this.normalizeProviderBaseUrl(baseUrl);
    if (!normalized) {
      return [];
    }

    if (/\/api\/tags$/i.test(normalized)) {
      return [normalized];
    }

    if (/\/api\/(chat|generate)$/i.test(normalized)) {
      return [normalized.replace(/\/(chat|generate)$/i, "/tags")];
    }

    if (/\/api$/i.test(normalized)) {
      return [`${normalized}/tags`];
    }

    return [`${normalized}/api/tags`];
  }

  private buildRequestHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }

  private normalizeProviderBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, "");
  }

  private hasPathSegment(baseUrl: string): boolean {
    try {
      const { pathname } = new URL(baseUrl);
      const normalizedPath = pathname.replace(/\/+$/, "");
      return normalizedPath.length > 0 && normalizedPath !== "/";
    } catch {
      return false;
    }
  }

  private getCustomProviderCacheKey(baseUrl: string, apiFormat: CustomModelApiFormat): string {
    return `${apiFormat}:${this.normalizeProviderBaseUrl(baseUrl)}`;
  }

  private rememberCustomChatCompletionsUrl(baseUrl: string, apiFormat: CustomModelApiFormat, requestUrlValue: string): void {
    this.customChatCompletionsUrlCache.set(this.getCustomProviderCacheKey(baseUrl, apiFormat), requestUrlValue);
  }

  private isRetryableEndpointError(error: unknown): boolean {
    const status = getRequestErrorStatus(error);
    if (status === 404 || status === 405 || status === 410) {
      return true;
    }

    if (status === 400 || status === 422) {
      const message = getAIErrorMessage(error).toLowerCase();
      return /not found|no route|unknown path|unknown endpoint|invalid url|invalid path|unsupported path|unsupported endpoint/.test(message);
    }

    return false;
  }

  private createRequestResponseError(response: RequestUrlResponse, requestUrlValue: string): Error & {
    status: number;
    response: RequestUrlResponse;
  } {
    const errorMessage = response.json?.error?.message
      || response.json?.message
      || response.text
      || `Request failed with status ${response.status} (${requestUrlValue})`;
    const error = new Error(typeof errorMessage === "string" ? errorMessage.trim() : String(errorMessage)) as Error & {
      status: number;
      response: RequestUrlResponse;
    };
    error.status = response.status;
    error.response = response;
    return error;
  }

  private extractOllamaModelNames(payload: any): string[] {
    const models = Array.isArray(payload?.models) ? payload.models : [];
    const names: string[] = models
      .map((item: any): string => {
        if (typeof item?.name === "string" && item.name.trim()) {
          return item.name.trim();
        }
        if (typeof item?.model === "string" && item.model.trim()) {
          return item.model.trim();
        }
        return "";
      })
      .filter((name: string): boolean => !!name);

    return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
  }

  private async rethrowUserFacingRequestError(error: unknown, requestUrlValue: string): Promise<never> {
    if (await this.isPKMerQuotaError(error, requestUrlValue)) {
      throw new AIUserNoticeError(
        t("PKMer AI request failed because your quota is insufficient. Please get more quota in PKMer and try again."),
      );
    }

    throw error;
  }

  private async isPKMerQuotaError(error: unknown, requestUrlValue: string): Promise<boolean> {
    if (!/pkmer\.cn/i.test(requestUrlValue)) {
      return false;
    }

    if (getRequestErrorStatus(error) !== 403) {
      return false;
    }

    const quota = await this.authService.refreshQuota().catch(() => null);
    const rawQuota = quota?.quota ?? quota?.remainingQuota;
    if (typeof rawQuota === "number") {
      const normalizedQuota = Number((rawQuota / 500000).toFixed(2));
      if (normalizedQuota <= 1) {
        return true;
      }
    }

    const message = getAIErrorMessage(error).toLowerCase();
    return /quota|credit|balance|insufficient|额度|点数|余量不足|余额不足/.test(message);
  }

  private buildCompletionMessages(
    localPrefix: string,
    localSuffix: string,
    contextBlock: string,
    accumulated: string,
  ): Array<{ role: string; content: string }> {
    const effectivePrefix = `${localPrefix}${accumulated}`;
    const continuationNote = accumulated
      ? "\n\nA draft continuation has already been generated. Continue exactly from where that draft ends. Do not repeat or paraphrase any previously generated text."
      : "";

    return [
      {
        role: "system",
        content:
          "You are an inline writing assistant inside Obsidian. Continue the text exactly at the cursor using only the local context around the cursor. Return only the continuation text, with no explanations, no markdown fences, and no quotes. Produce one complete semantic unit that fits the local structure, such as one full sentence, one complete bullet item, one heading continuation, or one short paragraph. Never stop mid-word, mid-sentence, or mid-list-item.",
      },
      {
        role: "user",
        content: `Continue the text at <CURSOR>. Use the local cursor context below, not the whole document.${continuationNote}\n\nText before cursor:\n${effectivePrefix}\n\n<CURSOR>\n\nText after cursor:\n${localSuffix}${contextBlock}`,
      },
    ];
  }

  private resolveRewriteScene(params: RewriteParams): PKMerModelScene {
    if (params.artifactKind) {
      return "artifact";
    }

    if (
      params.instruction === "explain" ||
      params.instruction === "summarize" ||
      params.instruction === "custom"
    ) {
      return "reasoning";
    }

    return "rewrite";
  }

  private buildRewriteMessages(params: RewriteParams): Array<{ role: string; content: string }> {
    const instruction = this.buildRewriteInstruction(params.instruction, params.customPrompt);
    const hasTargetText = params.selectedText.trim().length > 0;
    const contextBlock = params.context ? `\n\nLocal document context:\n${params.context}` : "";
    const systemPrompt = this.buildRewriteSystemPrompt(params.artifactKind);
    const outputRequirement = this.buildRewriteOutputRequirement(params.artifactKind);

    return [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: hasTargetText
          ? `Instruction:\n${instruction}\n\nTarget text:\n${params.selectedText}${contextBlock}\n\nRequirements:\n- Use the local context only to keep terminology, links, and structure consistent.\n- ${outputRequirement}`
          : `Instruction:\n${instruction}\n\nTarget text:\n(none - use the local cursor context)${contextBlock}\n\nRequirements:\n- There is no explicit selection, so generate text that fits naturally at the cursor location.\n- ${outputRequirement}`,
      },
    ];
  }

  private buildRewriteSystemPrompt(artifactKind?: RewriteArtifactKind): string {
    if (artifactKind === "canvas") {
      return "You are an expert Obsidian Canvas generator. Generate production-ready JSON Canvas files that obey the JSON Canvas structure exactly. Return only valid JSON, never explanations, never markdown fences, and never partial structures. The output must be directly saveable as a .canvas file and open cleanly in Obsidian. Ensure nodes and edges are coherent, spatially organized, and semantically useful rather than generic placeholders.";
    }

    if (artifactKind === "base") {
      return "You are an expert Obsidian Bases generator. Generate production-ready .base YAML files that obey Obsidian Bases conventions. Return only valid YAML, never explanations, never markdown fences, and never partial structures. The output must be directly saveable as a .base file and open cleanly in Obsidian. Prefer practical fields, formulas, and views over placeholder content.";
    }

    if (artifactKind === "frontmatter") {
      return "You are an expert Obsidian note metadata assistant. Generate concise, practical YAML frontmatter for the current note. Return only one complete YAML frontmatter block wrapped by --- lines, never explanations, never markdown fences, and never partial YAML. Prefer real-world note properties that help filtering, browsing, and vault consistency. Follow existing folder conventions when they are provided in context.";
    }

    return "You are an editor assistant inside Obsidian. Rewrite, transform, or generate text according to the instruction. Preserve valid Obsidian Flavored Markdown whenever possible, including wikilinks, embeds, callouts, task lists, tables, properties, and inline formatting unless the instruction explicitly changes the format. Return only the final text, with no explanations, no markdown fences, and no surrounding quotes. Never stop mid-list-item, mid-table-row, mid-YAML block, or mid-JSON structure.";
  }

  private buildRewriteOutputRequirement(artifactKind?: RewriteArtifactKind): string {
    if (artifactKind === "canvas") {
      return "Return one complete JSON Canvas document with top-level nodes and edges arrays only. Make it visually useful, not minimal.";
    }

    if (artifactKind === "base") {
      return "Return one complete .base YAML document only. Make it practical and directly usable in Obsidian.";
    }

    if (artifactKind === "frontmatter") {
      return "Return one complete YAML frontmatter block only, wrapped in --- delimiters, ready to insert at the top of the note.";
    }

    return "Return only the final text ready to paste into the note.";
  }

  private getCompletionTokenBudget(prefix: string, suffix: string, accumulated: string, round: number): number {
    if (round > 0) {
      return 96;
    }

    const trimmedPrefix = prefix.trimEnd();
    const trimmedSuffix = suffix.trimStart();
    const currentLine = trimmedPrefix.split("\n").pop() ?? "";

    if (/^\s*#{1,6}\s*$/.test(currentLine)) {
      return 48;
    }

    if (/^\s*(?:[-*+] |\d+\. |> )?$/.test(currentLine)) {
      return 96;
    }

    if (!trimmedSuffix || accumulated.includes("\n")) {
      return 192;
    }

    return 160;
  }

  private removeRepeatedPrefix(existing: string, next: string): string {
    const normalizedNext = next;
    if (!existing) {
      return next;
    }

    if (!normalizedNext.trim()) {
      return "";
    }

    const maxOverlap = Math.min(existing.length, normalizedNext.length, 120);
    for (let size = maxOverlap; size > 0; size--) {
      if (existing.slice(-size) === normalizedNext.slice(0, size)) {
        return normalizedNext.slice(size);
      }
    }

    return normalizedNext;
  }

  private looksSemanticallyComplete(text: string): boolean {
    const normalized = text.trimEnd();
    if (!normalized) {
      return false;
    }

    if (/[。！？.!?…'"）】》]$/.test(normalized)) {
      return true;
    }

    const lastLine = normalized.split("\n").pop() ?? "";
    if (/^\s*(?:[-*+] |\d+\. |> )/.test(lastLine) && lastLine.trim().length >= 8) {
      return true;
    }

    return false;
  }

  private extractText(payload: any): string {
    const content = payload?.choices?.[0]?.message?.content
      ?? payload?.choices?.[0]?.text
      ?? payload?.message?.content
      ?? payload?.response
      ?? "";
    if (typeof content === "string") {
      return content.trim();
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.text || item?.content || "";
        })
        .join("")
        .trim();
    }
    return "";
  }

  private trimCompletionToBoundary(text: string): string {
    const normalized = text.trim();
    if (!normalized) {
      return normalized;
    }

    const boundaryMatches = Array.from(normalized.matchAll(/[。！？.!?；;:\n]/g));
    if (boundaryMatches.length > 0) {
      const lastBoundary = boundaryMatches[boundaryMatches.length - 1];
      const index = (lastBoundary.index ?? -1) + lastBoundary[0].length;
      if (index >= Math.max(12, Math.floor(normalized.length * 0.45))) {
        return normalized.slice(0, index).trimEnd();
      }
    }

    const lastWhitespace = normalized.lastIndexOf(" ");
    if (lastWhitespace >= Math.max(12, Math.floor(normalized.length * 0.6))) {
      return normalized.slice(0, lastWhitespace).trimEnd();
    }

    return normalized;
  }

  private async *streamText(text: string, signal?: AbortSignal): AsyncIterable<string> {
    const chunks = text.split(/(\s+)/).filter((item) => item.length > 0);
    for (const chunk of chunks) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      yield chunk;
      await this.delay(18, signal);
    }
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const timer = window.setTimeout(resolve, ms);
      const onAbort = () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  private buildRewriteInstruction(instruction: RewriteInstruction, customPrompt?: string): string {
    switch (instruction) {
      case "improve":
        return "Improve clarity, fluency, and structure while keeping the original meaning.";
      case "fix-grammar":
        return "Fix spelling, grammar, and punctuation issues.";
      case "make-shorter":
        return "Make the text shorter and more concise.";
      case "make-longer":
        return "Expand the text with useful supporting detail.";
      case "simplify":
        return "Rewrite the text in simpler language.";
      case "professional":
        return "Rewrite the text in a professional tone.";
      case "casual":
        return "Rewrite the text in a casual tone.";
      case "translate-en":
        return "Translate the text into English.";
      case "translate-zh":
        return "Translate the text into Simplified Chinese.";
      case "translate-ja":
        return "Translate the text into Japanese.";
      case "translate-de":
        return "Translate the text into German.";
      case "translate-fr":
        return "Translate the text into French.";
      case "translate-es":
        return "Translate the text into Spanish.";
      case "explain":
        return "Explain the text in a clear, structured way.";
      case "summarize":
        return "Summarize the text while preserving the key points.";
      case "continue":
        return "Continue writing in a consistent tone and style.";
      case "custom":
        return customPrompt?.trim() || "Rewrite the selected text.";
      default:
        return "Rewrite the selected text.";
    }
  }
}
