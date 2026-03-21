export interface CompletionParams {
  prefix: string;
  suffix: string;
  context?: string;
  language?: string;
}

export type RewriteInstruction =
  | "improve"
  | "fix-grammar"
  | "make-shorter"
  | "make-longer"
  | "simplify"
  | "professional"
  | "casual"
  | "translate-en"
  | "translate-zh"
  | "translate-ja"
  | "explain"
  | "summarize"
  | "continue"
  | "custom";

export interface RewriteParams {
  selectedText: string;
  instruction: RewriteInstruction;
  customPrompt?: string;
  context?: string;
}

export interface RewriteActionMeta {
  instruction: RewriteInstruction;
  label: string;
  group: string;
}

export interface IAIService {
  complete(params: CompletionParams, signal?: AbortSignal): AsyncIterable<string>;
  rewrite(params: RewriteParams, signal?: AbortSignal): AsyncIterable<string>;
}

export interface CompletionConfig {
  trigger?: "manual" | "auto";
  delay?: number;
}

export interface RewriteConfig {
  actions?: RewriteActionMeta[];
  minSelectionLength?: number;
  showToolbarOnSelection?: boolean;
}

export interface PKMerUserInfo {
  sub: string;
  name?: string;
  email?: string;
  avatar?: string;
  ai_quota?: { quota: number; remainingQuota?: number; [key: string]: any };
  device_count?: number;
  thino?: boolean | string | number;
  thinoWebExpir?: string | number;
  supporter?: boolean | string | number;
}

export interface PKMerAuthSettings {
  tokenExpiresAt: number;
  userInfo: PKMerUserInfo | null;
}

export interface CustomModelSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface AIPluginSettings {
  enabled: boolean;
  providerMode: "pkmer-first" | "custom-only";
  enableInlineCompletion: boolean;
  completionTrigger: "manual" | "auto";
  completionDelay: number;
  enableRewrite: boolean;
  showRewriteToolbarOnSelection: boolean;
  rewriteMinSelectionLength: number;
  pkmerApiBaseUrl: string;
  pkmerModel: string;
  pkmer: PKMerAuthSettings;
  enableCustomModel: boolean;
  customModel: CustomModelSettings;
}

export const DEFAULT_PKMER_AUTH_SETTINGS: PKMerAuthSettings = {
  tokenExpiresAt: 0,
  userInfo: null,
};

export const DEFAULT_AI_SETTINGS: AIPluginSettings = {
  enabled: true,
  providerMode: "pkmer-first",
  enableInlineCompletion: true,
  completionTrigger: "manual",
  completionDelay: 500,
  enableRewrite: true,
  showRewriteToolbarOnSelection: false,
  rewriteMinSelectionLength: 1,
  pkmerApiBaseUrl: "https://newapi.pkmer.cn",
  pkmerModel: "04-fast",
  pkmer: DEFAULT_PKMER_AUTH_SETTINGS,
  enableCustomModel: false,
  customModel: {
    baseUrl: "",
    apiKey: "",
    model: "",
    temperature: 0.2,
  },
};

export const DEFAULT_REWRITE_ACTIONS: RewriteActionMeta[] = [
  { instruction: "improve", label: "Improve writing", group: "Edit" },
  { instruction: "fix-grammar", label: "Fix spelling & grammar", group: "Edit" },
  { instruction: "make-shorter", label: "Make shorter", group: "Edit" },
  { instruction: "make-longer", label: "Make longer", group: "Edit" },
  { instruction: "simplify", label: "Simplify language", group: "Edit" },
  { instruction: "professional", label: "Professional tone", group: "Tone" },
  { instruction: "casual", label: "Casual tone", group: "Tone" },
  { instruction: "translate-en", label: "English", group: "Translate" },
  { instruction: "translate-zh", label: "Chinese", group: "Translate" },
  { instruction: "translate-ja", label: "Japanese", group: "Translate" },
  { instruction: "explain", label: "Explain this", group: "Generate" },
  { instruction: "summarize", label: "Summarize", group: "Generate" },
  { instruction: "continue", label: "Continue writing", group: "Generate" },
];

export const PKMER_SECRET_KEYS = {
  accessToken: "editing-toolbar-pkmer-access-token",
  refreshToken: "editing-toolbar-pkmer-refresh-token",
  aiToken: "editing-toolbar-pkmer-ai-token",
  customModelApiKey: "editing-toolbar-custom-model-api-key",
} as const;

export const PKMER_OAUTH_CONFIG = {
  authorizationUrl: "https://api.pkmer.cn/api/v1/oauth/authorize",
  tokenUrl: "https://api.pkmer.cn/api/v1/oauth/token",
  userinfoUrl: "https://api.pkmer.cn/api/v1/oauth/userinfo",
  clientId: "pkmer_dd2a562c8653ca0112a050150d974ccd",
  scopes: "openid profile email ai:token",
  desktopRedirectUri: "http://localhost:10891/editing-toolbar/callback",
  mobileRedirectUri: "obsidian://editing-toolbar-pkmer-auth",
  callbackPort: 10891,
} as const;
