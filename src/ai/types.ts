import { getCurrentLocale, isChineseLocale } from "src/util/locale";

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
  | "translate-de"
  | "translate-fr"
  | "translate-es"
  | "explain"
  | "summarize"
  | "continue"
  | "custom";

export interface RewriteParams {
  selectedText: string;
  instruction: RewriteInstruction;
  customPrompt?: string;
  context?: string;
  artifactKind?: RewriteArtifactKind;
}

export interface RewriteActionMeta {
  instruction: RewriteInstruction;
  label: string;
  group: string;
}

export type RewriteArtifactKind = "base" | "canvas" | "frontmatter";

export interface RewriteArtifactRequest {
  kind: RewriteArtifactKind;
  content: string;
  sourceText: string;
}

export interface RewriteArtifactResult {
  path: string;
  embedSyntax: string;
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
  createGeneratedArtifact?: (request: RewriteArtifactRequest) => Promise<RewriteArtifactResult>;
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
  apiFormat: CustomModelApiFormat;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export type CustomModelApiFormat = "openai-compatible" | "ollama";

export type PKMerModelRoutingMode = "smart" | "manual";
export type PKMerModelScene = "completion" | "rewrite" | "reasoning" | "artifact";

export interface PKMerModelRoutingSettings {
  mode: PKMerModelRoutingMode;
  completion: string;
  rewrite: string;
  reasoning: string;
  artifact: string;
}

export interface CustomPromptTemplate {
  id: string;
  name: string;
  prompt: string;
  icon?: string;
}

export type FrontmatterPromptMode = "auto" | "custom";

export interface FrontmatterPromptSettings {
  mode: FrontmatterPromptMode;
  properties: string;
  language: string;
  prompt: string;
}

export interface AIPluginSettings {
  enabled: boolean;
  consentAccepted: boolean;
  onboardingShown: boolean;
  providerMode: "pkmer-first" | "custom-only";
  enableInlineCompletion: boolean;
  inlineCompletionHintLearned: boolean;
  completionTrigger: "manual" | "auto";
  completionDelay: number;
  enableRewrite: boolean;
  showRewriteToolbarOnSelection: boolean;
  rewriteMinSelectionLength: number;
  pkmerApiBaseUrl: string;
  pkmerModel: string;
  pkmerModelRouting: PKMerModelRoutingSettings;
  pkmer: PKMerAuthSettings;
  enableCustomModel: boolean;
  customModel: CustomModelSettings;
  frontmatterPrompt: FrontmatterPromptSettings;
  customPromptHistory: string[];
  customPromptTemplates: CustomPromptTemplate[];
}

export const PKMER_MODEL_OPTIONS = [
  { value: "04-fast", label: "04-fast" },
  { value: "03-agent", label: "03-agent" },
] as const;

export const DEFAULT_PKMER_MODEL_ROUTING: PKMerModelRoutingSettings = {
  mode: "smart",
  completion: "04-fast",
  rewrite: "04-fast",
  reasoning: "03-agent",
  artifact: "03-agent",
};

export function resolvePKMerModelForScene(settings: AIPluginSettings, scene: PKMerModelScene): string {
  const routing = settings.pkmerModelRouting ?? DEFAULT_PKMER_MODEL_ROUTING;
  if (routing.mode === "smart") {
    return DEFAULT_PKMER_MODEL_ROUTING[scene];
  }

  const configuredModel = routing[scene]?.trim();
  return configuredModel || DEFAULT_PKMER_MODEL_ROUTING[scene];
}

export const DEFAULT_PKMER_AUTH_SETTINGS: PKMerAuthSettings = {
  tokenExpiresAt: 0,
  userInfo: null,
};

export const DEFAULT_FRONTMATTER_PROPERTIES = [
  "title: concise, one-line note title",
  "summary: 1-3 sentence note summary",
  "tags: YAML list of relevant keywords",
  "created: YYYY-MM-DD date when appropriate",
  "category: broad content category",
].join("\n");

export const DEFAULT_FRONTMATTER_PROMPT = [
  "Generate YAML frontmatter for the current Obsidian note using the requested properties below.",
  "",
  "Requested properties:",
  "{properties}",
  "",
  "Output language for generated values: {language}",
  "",
  "Rules:",
  "- Return only one complete YAML frontmatter block wrapped in --- delimiters.",
  "- Use the target text as the note content.",
  "- Follow current and sibling-note frontmatter conventions from context when provided.",
  "- Keep values concise, practical, and useful for filtering or browsing.",
  "- Do not add explanations or markdown fences outside the YAML block.",
].join("\n");

export function createDefaultFrontmatterPromptSettings(): FrontmatterPromptSettings {
  return {
    mode: "auto",
    properties: DEFAULT_FRONTMATTER_PROPERTIES,
    language: "auto",
    prompt: DEFAULT_FRONTMATTER_PROMPT,
  };
}

const DEFAULT_CUSTOM_PROMPT_TEMPLATES_ZH: CustomPromptTemplate[] = [
  {
    id: "template-demo-variables",
    name: "📝 总结要点",
    prompt: "分析 {{file:content}} 的内容结构,重点关注:\n{{selection}}\n\n请提供:\n1. 内容概要\n2. 关键要点\n3. 改进建议",
    icon: "lucide-sparkles"
  },
{
    id: "template-task-variables",
    name: "提炼任务",
    prompt: "当前日期{{date}}，从 {{file:content}} 中提取所有待办事项，重点关注:\n{{selection}}\n\n请严格按 Obsidian Tasks 插件格式输出，每条任务单独一行：\n\n- [ ] 任务描述 ⏫/🔼/🔽/⏬ 优先级\n- [ ] 任务描述 📅 YYYY-MM-DD 截止日期\n- [ ] 任务描述 ⏰ YYYY-MM-DD HH:mm 提醒时间\n- [ ] 任务描述 🛫 YYYY-MM-DD 开始日期\n- [ ] 任务描述 🔁 every day/week/month 重复周期\n- [ ] 任务描述 #标签 #项目名\n\n提取规则：\n1. 如果原文提到\"紧急/马上/立即/今天\"，添加 ⏫（最高优先级）\n2. 如果提到\"明天/本周/尽快\"，添加 🔼（高优先级）\n3. 如果提到具体日期，转换为 📅 YYYY-MM-DD 格式\n4. 如果提到时间，转换为 ⏰ YYYY-MM-DD HH:mm 格式\n5. 如果提到周期性工作，添加 🔁 every week/month\n6. 为每个任务添加合适的标签（如 #工作 #会议 #跟进）\n\n示例输出：\n- [ ] 完成项目报告 ⏫ 📅 2026-04-25 #工作\n- [ ] 每周团队例会 🔁 every week on Monday ⏰ 09:00 #会议\n- [ ] 跟进客户需求 🔼 📅 2026-04-23 #跟进",
    icon: "lucide-sparkles"
  },
  {
    id: "template-dataview",
    name: "生成 Dataview",
    prompt: "根据我的需求,帮我生成一个 Obsidian Dataview 查询代码块。要求:\n1. 使用 DataviewJS 或 DQL 语法\n2. 包含必要的字段筛选和排序\n3. 添加注释说明每个部分的作用\n4. 如果需要复杂逻辑,使用 DataviewJS\n\n我的需求:",
    icon: "lucide-database"
  },
  {
    id: "template-templater",
    name: "设计 Templater 模板",
    prompt: "帮我设计一个 Obsidian Templater 模板。要求:\n1. 使用 Templater 语法 (<%  %>)\n2. 包含动态日期、时间等变量\n3. 支持用户输入提示\n4. 添加必要的条件判断和循环\n5. 注释说明每个部分的用途\n\n模板用途:",
    icon: "lucide-file-code"
  },
  {
    id: "template-mermaid",
    name: "绘制 Mermaid 图表",
    prompt: "根据我选中的文本内容 {{selection}},生成 Mermaid 图表代码。要求:\n1. 选择合适的图表类型(流程图/时序图/类图/甘特图等)\n2. 使用清晰的节点命名\n3. 添加必要的样式和注释\n4. 确保语法正确可渲染\n",
    icon: "lucide-workflow"
  },
  {
    id: "template-metadata",
    name: "设计 YAML",
    prompt: "根据当前笔记内容 {{file:content}},帮我设计一个适合当前笔记的 YAML Frontmatter 元数据结构。要求:\n1. 根据笔记内容推荐合适的字段\n2. 包含常用字段(tags, aliases, date等)\n3. 添加自定义字段建议\n4. 注释说明每个字段的用途\n\n笔记类型:",
    icon: "lucide-file-json"
  },
  {
    id: "template-callout",
    name: "使用Callout包装",
    prompt: "根据我选中的文本内容 {{selection}},帮我使用 Obsidian Callout 块进行包装。要求:\n1. 选择合适的 callout 类型(note/tip/warning/danger等)\n2. 支持嵌套和折叠\n3. 包含标题和内容\n4. 可以包含代码块或列表\n\n内容需求:",
    icon: "lucide-message-square"
  }
];

const DEFAULT_CUSTOM_PROMPT_TEMPLATES_EN: CustomPromptTemplate[] = [
  {
    id: "template-demo-variables",
    name: "📝 Summarize Key Points",
    prompt: "Analyze the structure of {{file:content}} and focus on:\n{{selection}}\n\nPlease provide:\n1. A concise overview\n2. The key points\n3. Suggestions for improvement",
    icon: "lucide-sparkles"
  },
  {
    id: "template-task-variables",
    name: "Extract Tasks",
    prompt: "Today's date is {{date}}. Extract all actionable tasks from {{file:content}}, with special attention to:\n{{selection}}\n\nPlease output strictly in Obsidian Tasks plugin format, one task per line:\n\n- [ ] Task description ⏫/🔼/🔽/⏬ priority\n- [ ] Task description 📅 YYYY-MM-DD due date\n- [ ] Task description ⏰ YYYY-MM-DD HH:mm reminder\n- [ ] Task description 🛫 YYYY-MM-DD start date\n- [ ] Task description 🔁 every day/week/month recurrence\n- [ ] Task description #tag #project\n\nExtraction rules:\n1. If the text implies urgency such as urgent, ASAP, immediately, or today, add ⏫.\n2. If it implies near-term timing such as tomorrow, this week, or soon, add 🔼.\n3. Convert explicit dates to 📅 YYYY-MM-DD.\n4. Convert explicit times to ⏰ YYYY-MM-DD HH:mm when possible.\n5. Add recurrence for repeated work such as 🔁 every week/month.\n6. Add practical tags for each task.\n\nExample output:\n- [ ] Finish project report ⏫ 📅 2026-04-25 #work\n- [ ] Weekly team sync 🔁 every week on Monday ⏰ 09:00 #meeting\n- [ ] Follow up on client request 🔼 📅 2026-04-23 #follow-up",
    icon: "lucide-sparkles"
  },
  {
    id: "template-dataview",
    name: "Generate Dataview",
    prompt: "Help me generate an Obsidian Dataview query block based on my requirement. Requirements:\n1. Use DataviewJS or DQL syntax.\n2. Include the necessary filters and sorting.\n3. Add short comments explaining each part.\n4. Use DataviewJS if the logic is complex.\n\nMy requirement:",
    icon: "lucide-database"
  },
  {
    id: "template-templater",
    name: "Design Templater Template",
    prompt: "Help me design an Obsidian Templater template. Requirements:\n1. Use Templater syntax (<%  %>).\n2. Include dynamic date, time, and similar variables.\n3. Support user input prompts.\n4. Add necessary conditionals and loops.\n5. Comment the purpose of each section.\n\nTemplate purpose:",
    icon: "lucide-file-code"
  },
  {
    id: "template-mermaid",
    name: "Create Mermaid Diagram",
    prompt: "Based on my selected text {{selection}}, generate Mermaid diagram code. Requirements:\n1. Choose an appropriate diagram type such as flowchart, sequence, class, or gantt.\n2. Use clear node names.\n3. Add useful styling and comments when needed.\n4. Ensure the syntax is valid and renderable.\n",
    icon: "lucide-workflow"
  },
  {
    id: "template-metadata",
    name: "Design YAML",
    prompt: "Based on the current note content {{file:content}}, help me design a suitable YAML Frontmatter structure for this note. Requirements:\n1. Recommend fields that fit the note content.\n2. Include common fields such as tags, aliases, and date.\n3. Suggest useful custom fields.\n4. Briefly explain the purpose of each field.\n\nNote type:",
    icon: "lucide-file-json"
  },
  {
    id: "template-callout",
    name: "Wrap with Callout",
    prompt: "Based on my selected text {{selection}}, wrap it using an Obsidian Callout block. Requirements:\n1. Choose an appropriate callout type such as note, tip, warning, or danger.\n2. Support nesting and folding when helpful.\n3. Include a title and content.\n4. Allow code blocks or lists when needed.\n\nContent requirement:",
    icon: "lucide-message-square"
  }
];

const DEFAULT_CUSTOM_PROMPT_TEMPLATES_JA: CustomPromptTemplate[] = [
  {
    id: "template-demo-variables",
    name: "📝 要点を要約",
    prompt: "{{file:content}} の構成を分析し、次に重点を置いてください:\n{{selection}}\n\n次を提示してください:\n1. 簡潔な概要\n2. 重要な要点\n3. 改善の提案",
    icon: "lucide-sparkles"
  },
  {
    id: "template-task-variables",
    name: "タスクを抽出",
    prompt: "今日は {{date}} です。{{file:content}} から実行可能なタスクをすべて抽出し、特に次に注意してください:\n{{selection}}\n\nObsidian Tasks プラグインの形式で、各タスクを 1 行ずつ厳密に出力してください:\n\n- [ ] タスク内容 ⏫/🔼/🔽/⏬ 優先度\n- [ ] タスク内容 📅 YYYY-MM-DD 期限\n- [ ] タスク内容 ⏰ YYYY-MM-DD HH:mm リマインダー\n- [ ] タスク内容 🛫 YYYY-MM-DD 開始日\n- [ ] タスク内容 🔁 every day/week/month 繰り返し\n- [ ] タスク内容 #タグ #プロジェクト\n\n抽出ルール:\n1. 本文に「至急」「できるだけ早く」「直ちに」「今日」のような緊急性があれば、⏫ を追加します。\n2. 「明日」「今週」「近日中」のような近い期限を示す表現があれば、🔼 を追加します。\n3. 明示された日付は 📅 YYYY-MM-DD 形式に変換します。\n4. 明示された時刻は可能な限り ⏰ YYYY-MM-DD HH:mm 形式に変換します。\n5. 繰り返し作業には 🔁 every week/month を追加します。\n6. 各タスクに実用的なタグを追加します。\n\n出力例:\n- [ ] プロジェクト報告書を完成する ⏫ 📅 2026-04-25 #仕事\n- [ ] 毎週のチームミーティング 🔁 every week on Monday ⏰ 09:00 #会議\n- [ ] 顧客要望をフォローアップする 🔼 📅 2026-04-23 #フォローアップ",
    icon: "lucide-sparkles"
  },
  {
    id: "template-dataview",
    name: "Dataview を生成",
    prompt: "要件に基づいて Obsidian Dataview のクエリコードブロックを生成してください。要件:\n1. DataviewJS または DQL 構文を使用します。\n2. 必要なフィルターと並べ替えを含めます。\n3. 各部分を説明する短いコメントを追加します。\n4. ロジックが複雑な場合は DataviewJS を使用します。\n\n要件:",
    icon: "lucide-database"
  },
  {
    id: "template-templater",
    name: "Templater テンプレートを設計",
    prompt: "Obsidian Templater のテンプレートを設計してください。要件:\n1. Templater 構文（<%  %>）を使用します。\n2. 日付や時刻などの動的変数を含めます。\n3. ユーザー入力プロンプトに対応します。\n4. 必要な条件分岐とループを追加します。\n5. 各セクションの目的をコメントで説明します。\n\nテンプレートの用途:",
    icon: "lucide-file-code"
  },
  {
    id: "template-mermaid",
    name: "Mermaid 図を作成",
    prompt: "選択したテキスト {{selection}} に基づいて Mermaid 図のコードを生成してください。要件:\n1. フローチャート、シーケンス図、クラス図、ガントチャートなど、適切な図の種類を選びます。\n2. 分かりやすいノード名を使用します。\n3. 必要に応じて有用なスタイルとコメントを追加します。\n4. 構文が有効でレンダリング可能であることを確認します。\n",
    icon: "lucide-workflow"
  },
  {
    id: "template-metadata",
    name: "YAML を設計",
    prompt: "現在のノート内容 {{file:content}} に基づいて、このノートに適した YAML Frontmatter 構造を設計してください。要件:\n1. ノート内容に合うフィールドを提案します。\n2. tags、aliases、date などの一般的なフィールドを含めます。\n3. 役立つカスタムフィールドを提案します。\n4. 各フィールドの目的を簡潔に説明します。\n\nノートの種類:",
    icon: "lucide-file-json"
  },
  {
    id: "template-callout",
    name: "Callout で囲む",
    prompt: "選択したテキスト {{selection}} に基づいて、Obsidian Callout ブロックで囲んでください。要件:\n1. note、tip、warning、danger など、適切な callout タイプを選びます。\n2. 必要に応じて入れ子と折りたたみに対応します。\n3. タイトルと内容を含めます。\n4. 必要に応じてコードブロックまたはリストを使用します。\n\n内容の要件:",
    icon: "lucide-message-square"
  }
];

const DEFAULT_CUSTOM_PROMPT_TEMPLATES_RU: CustomPromptTemplate[] = [
  {
    id: "template-demo-variables",
    name: "📝 Краткое содержание",
    prompt: "Проанализируй структуру {{file:content}}, уделив особое внимание:\n{{selection}}\n\nПредоставь:\n1. Краткое содержание\n2. Ключевые моменты\n3. Рекомендации по улучшению",
    icon: "lucide-sparkles"
  },
  {
    id: "template-task-variables",
    name: "Извлечь задачи",
    prompt: "Текущая дата {{date}}. Извлеки из {{file:content}} все задачи, уделив особое внимание:\n{{selection}}\n\nВыведи результат строго в формате плагина Obsidian Tasks, каждая задача — с новой строки:\n\n- [ ] Описание задачи ⏫/🔼/🔽/⏬ Приоритет\n- [ ] Описание задачи 📅 YYYY-MM-DD Срок выполнения\n- [ ] Описание задачи ⏰ YYYY-MM-DD HH:mm Время напоминания\n- [ ] Описание задачи 🛫 YYYY-MM-DD Дата начала\n- [ ] Описание задачи 🔁 every day/week/month Периодичность\n- [ ] Описание задачи #тег #проект\n\nПравила извлечения:\n1. Если в тексте встречаются слова \"срочно/немедленно/сейчас/сегодня\", добавь ⏫ (наивысший приоритет).\n2. Если встречаются слова \"завтра/на этой неделе/как можно скорее\", добавь 🔼 (высокий приоритет).\n3. Если указана конкретная дата, преобразуй её в формат 📅 YYYY-MM-DD.\n4. Если указано время, преобразуй его в формат ⏰ YYYY-MM-DD HH:mm.\n5. Если задача повторяется, добавь 🔁 every week/month.\n6. Для каждой задачи подбери подходящие теги (например: #работа #встреча #контроль).\n\nПример вывода:\n- [ ] Завершить отчёт по проекту ⏫ 📅 2026-04-25 #работа\n- [ ] Еженедельное собрание команды 🔁 every week on Monday ⏰ 09:00 #встреча\n- [ ] Уточнить требования клиента 🔼 📅 2026-04-23 #контроль",
    icon: "lucide-sparkles"
  },
  {
    id: "template-dataview",
    name: "Создать Dataview",
    prompt: "На основе моего запроса создай блок кода Obsidian Dataview. Требования:\n1. Используй синтаксис DataviewJS или DQL.\n2. Добавь необходимые фильтры и сортировку.\n3. Снабди код комментариями с пояснением каждой части.\n4. Если требуется сложная логика, используй DataviewJS.\n\nМой запрос:",
    icon: "lucide-database"
  },
  {
    id: "template-templater",
    name: "Создать шаблон Templater",
    prompt: "Помоги создать шаблон Obsidian Templater. Требования:\n1. Используй синтаксис Templater (<% %>).\n2. Добавь динамические переменные даты и времени.\n3. Поддержи пользовательский ввод.\n4. При необходимости используй условия и циклы.\n5. Добавь комментарии с пояснением каждой части шаблона.\n\nНазначение шаблона:",
    icon: "lucide-file-code"
  },
  {
    id: "template-mermaid",
    name: "Создать диаграмму Mermaid",
    prompt: "На основе выбранного текста {{selection}} создай код диаграммы Mermaid. Требования:\n1. Выбери наиболее подходящий тип диаграммы (блок-схема, диаграмма последовательности, диаграмма классов, диаграмма Ганта и т.д.).\n2. Используй понятные названия узлов.\n3. Добавь необходимые стили и комментарии.\n4. Убедись, что диаграмма корректна и может быть отрисована.\n",
    icon: "lucide-workflow"
  },
  {
    id: "template-metadata",
    name: "Создать YAML",
    prompt: "На основе содержимого текущей заметки {{file:content}} создай подходящую структуру YAML Frontmatter. Требования:\n1. Предложи поля на основе содержимого заметки.\n2. Включи распространённые поля (tags, aliases, date и т.д.).\n3. Предложи дополнительные пользовательские поля.\n4. Добавь комментарии с пояснением назначения каждого поля.\n\nТип заметки:",
    icon: "lucide-file-json"
  },
  {
    id: "template-callout",
    name: "Оформить в Callout",
    prompt: "На основе выбранного текста {{selection}} оформи его в виде блока Obsidian Callout. Требования:\n1. Выбери подходящий тип callout (note/tip/warning/danger и т.д.).\n2. Поддерживай вложенные и сворачиваемые блоки.\n3. Добавь заголовок и содержимое.\n4. При необходимости используй блоки кода или списки.\n\nТребования к содержимому:",
    icon: "lucide-message-square"
  },
];

export function getDefaultCustomPromptTemplates(locale: string = getCurrentLocale()): CustomPromptTemplate[] {
  const normalizedLocale = locale.toLowerCase();
  const source = isChineseLocale(locale)
    ? DEFAULT_CUSTOM_PROMPT_TEMPLATES_ZH
    : normalizedLocale === "ja" || normalizedLocale.startsWith("ja-")
      ? DEFAULT_CUSTOM_PROMPT_TEMPLATES_JA
    : normalizedLocale === "ru" || normalizedLocale.startsWith("ru-")
      ? DEFAULT_CUSTOM_PROMPT_TEMPLATES_RU
      : DEFAULT_CUSTOM_PROMPT_TEMPLATES_EN;

  return source.map((template) => ({ ...template }));
}

export const DEFAULT_AI_SETTINGS: AIPluginSettings = {
  enabled: false,
  consentAccepted: false,
  onboardingShown: false,
  providerMode: "pkmer-first",
  enableInlineCompletion: true,
  inlineCompletionHintLearned: false,
  completionTrigger: "manual",
  completionDelay: 500,
  enableRewrite: true,
  showRewriteToolbarOnSelection: false,
  rewriteMinSelectionLength: 1,
  pkmerApiBaseUrl: "https://newapi.pkmer.cn",
  pkmerModel: "04-fast",
  pkmerModelRouting: DEFAULT_PKMER_MODEL_ROUTING,
  pkmer: DEFAULT_PKMER_AUTH_SETTINGS,
  enableCustomModel: false,
  customModel: {
    apiFormat: "openai-compatible",
    baseUrl: "",
    apiKey: "",
    model: "",
    temperature: 0.2,
  },
  frontmatterPrompt: createDefaultFrontmatterPromptSettings(),
  customPromptHistory: [],
  customPromptTemplates: getDefaultCustomPromptTemplates("zh-cn"),
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
  { instruction: "translate-de", label: "German", group: "Translate" },
  { instruction: "translate-fr", label: "French", group: "Translate" },
  { instruction: "translate-es", label: "Spanish", group: "Translate" },
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
