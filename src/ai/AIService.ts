import { requestUrl } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import type { CompletionParams, IAIService, RewriteInstruction, RewriteParams } from "./types";
import { PKMerAuthService } from "./PKMerAuthService";

interface ResolvedProvider {
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
}

interface ChatCompletionResult {
  text: string;
  finishReason?: string;
}

export class ToolbarAIService implements IAIService {
  private plugin: EditingToolbarPlugin;
  private authService: PKMerAuthService;

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

    await requestUrl({
      url: this.buildChatCompletionsUrl(validation.provider.baseUrl),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validation.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: validation.provider.model,
        temperature: 0,
        max_tokens: 1,
        stream: false,
        messages: [
          {
            role: "system",
            content: "Reply with OK only.",
          },
          {
            role: "user",
            content: "ping",
          },
        ],
      }),
    });
  }

  private async requestCompletion(params: CompletionParams, signal?: AbortSignal): Promise<string> {
    const localPrefix = params.prefix.slice(-2000);
    const localSuffix = params.suffix.slice(0, 800);
    const contextBlock = params.context ? `\n\nLocal cursor metadata:\n${params.context}` : "";
    const provider = await this.resolveProvider();
    let accumulated = "";

    for (let round = 0; round < 3; round++) {
      const response = await this.requestChatCompletionResult(
        this.buildCompletionMessages(localPrefix, localSuffix, contextBlock, accumulated),
        signal,
        {
          maxTokens: this.getCompletionTokenBudget(localPrefix, localSuffix, accumulated, round),
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
      [
        {
          role: "system",
          content:
            "You are an editor assistant inside Obsidian. Rewrite the selected text according to the instruction. Return only the rewritten text, with no explanations and no markdown fences.",
        },
        {
          role: "user",
          content: `Instruction: ${this.buildRewriteInstruction(params.instruction, params.customPrompt)}\n\nSelected text:\n${params.selectedText}`,
        },
      ],
      signal,
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

    const resolvedProvider = provider ?? (await this.resolveProvider());
    const response = await requestUrl({
      url: this.buildChatCompletionsUrl(resolvedProvider.baseUrl),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolvedProvider.apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedProvider.model,
        temperature: resolvedProvider.temperature,
        max_tokens: options.maxTokens,
        stream: false,
        messages,
      }),
    });

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const payload = response.json;
    const text = this.extractText(payload);
    return {
      text,
      finishReason: payload?.choices?.[0]?.finish_reason,
    };
  }

  private async resolveProvider(): Promise<ResolvedProvider> {
    const pkmerProvider = await this.getPKMerProvider();
    if (pkmerProvider) {
      return pkmerProvider;
    }

    const customProvider = this.getCustomProviderValidation().provider;
    if (customProvider) {
      return customProvider;
    }

    throw new Error("No AI provider is configured. Please log in to PKMer or fill in custom model settings.");
  }

  private async getPKMerProvider(): Promise<ResolvedProvider | null> {
    const settings = this.plugin.settings.ai;
    const verified = await this.authService.verify();
    if (!verified || !this.authService.aiToken) {
      return null;
    }

    return {
      baseUrl: settings.pkmerApiBaseUrl,
      apiKey: this.authService.aiToken,
      model: settings.pkmerModel || "04-fast",
      temperature: settings.customModel.temperature,
    };
  }

  private getCustomProviderValidation(): CustomProviderValidationResult {
    if (!this.plugin.settings.ai.enableCustomModel) {
      return { provider: null, missing: ["disabled"] };
    }

    const custom = this.plugin.settings.ai.customModel;
    const customApiKey = this.authService.customModelApiKey.trim();
    const missing: string[] = [];

    if (!custom.baseUrl.trim()) {
      missing.push("baseUrl");
    }
    if (!custom.model.trim()) {
      missing.push("model");
    }
    if (!customApiKey) {
      missing.push("apiKey");
    }

    if (missing.length > 0) {
      return { provider: null, missing };
    }

    return {
      provider: {
        baseUrl: custom.baseUrl.trim(),
        apiKey: customApiKey,
        model: custom.model.trim(),
        temperature: custom.temperature,
      },
      missing: [],
    };
  }

  private buildChatCompletionsUrl(baseUrl: string): string {
    const normalized = baseUrl.trim().replace(/\/+$/, "");
    if (/\/v1\/chat\/completions$/i.test(normalized)) {
      return normalized;
    }
    if (/\/v1$/i.test(normalized)) {
      return `${normalized}/chat/completions`;
    }
    return `${normalized}/v1/chat/completions`;
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
    const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? "";
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
