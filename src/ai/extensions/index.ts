import type { Extension } from "@codemirror/state";
import type { CompletionConfig, IAIService, RewriteConfig } from "../types";
import { inlineCompletion, triggerCompletionEffect } from "./completion";
import { selectionRewrite, startRewriteEffect } from "./rewrite";
import { aiTheme } from "./theme";

export interface DynamicAIEditorConfig {
  getService: () => IAIService | null;
  getCompletionConfig?: () => CompletionConfig;
  getRewriteConfig?: () => RewriteConfig;
}

export function createAIEditorExtensions(config: DynamicAIEditorConfig): Extension {
  return [
    inlineCompletion(config.getService, config.getCompletionConfig),
    selectionRewrite(config.getService, config.getRewriteConfig),
    aiTheme,
  ];
}

export { startRewriteEffect, triggerCompletionEffect };
