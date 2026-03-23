import type { RewriteArtifactKind } from "./types";

export interface AIToolboxActionMeta {
  id: "list" | "table" | "frontmatter" | "canvas" | "base";
  label: string;
  icon: string;
}

export const AI_TOOLBOX_ACTIONS: AIToolboxActionMeta[] = [
  { id: "list", label: "Convert to list", icon: "lucide-list-tree" },
  { id: "table", label: "Convert to table", icon: "lucide-table-properties" },
  { id: "frontmatter", label: "Generate frontmatter", icon: "lucide-file-badge-2" },
  { id: "canvas", label: "Convert to canvas", icon: "lucide-waypoints" },
];

const OBSIDIAN_MARKDOWN_GUIDE = [
  "Obsidian Markdown rules:",
  "- Preserve valid Obsidian flavored Markdown whenever relevant.",
  "- Preserve wikilinks like [[Note]], embeds like ![[Note]], tags, task lists, callouts, tables, and inline formatting if they appear in the source.",
  "- For internal links use [[wikilinks]] rather than Markdown links whenever the target looks like a vault note.",
  "- Use standard Markdown headings, lists, blockquotes, tables, and code fences only when they fit the content naturally.",
].join("\n");

const BASE_SKILL_GUIDE = [
  "Obsidian Bases skill requirements:",
  "- Output a valid .base file body in YAML only. No explanations. No code fences.",
  "- A base file may contain top-level filters, formulas, properties, summaries, and views.",
  "- filters can be a single filter string or nested and/or/not filter objects.",
  "- formulas is a mapping from formula name to expression string.",
  "- properties config can include displayName for note, file, and formula properties.",
  "- views must be an array. Each view should have a useful type such as table, cards, list, or map, plus a name and order.",
  "- Use practical property names inferred from the source content, and use formula.* when referencing formula properties in views.",
  "- Common file properties include file.name, file.basename, file.path, file.folder, file.ext, file.ctime, file.mtime, file.tags, file.links, file.backlinks, file.embeds, file.properties.",
  "- Keep YAML valid: quote strings when needed, keep indentation consistent, and do not reference undefined formulas.",
  "- Prefer concise but actually usable output over placeholders.",
  "- If the source describes tabular entities, create at least one table view.",
  "- If the source suggests browsing or grouping, consider cards or list views too.",
  "- If filtering logic is unclear, you may omit filters rather than inventing weak ones.",
  "- If there are date-like fields, formulas may use date(), now(), today(), and duration .days accessors.",
  "- Return one complete semantic .base file ready to save and open in Obsidian.",
  "Suggested schema pattern:",
  "filters:",
  "  and: []",
  "formulas:",
  "  formula_name: 'expression'",
  "properties:",
  "  property_name:",
  "    displayName: \"Display Name\"",
  "views:",
  "  - type: table",
  "    name: \"Overview\"",
  "    order:",
  "      - file.name",
  "      - property_name",
].join("\n");

const CANVAS_SKILL_GUIDE = [
  "Obsidian JSON Canvas skill requirements:",
  "- Output valid JSON only. No explanations. No code fences.",
  "- The top-level object must contain arrays named nodes and edges.",
  "- Every node needs id, type, x, y, width, and height.",
  "- Every edge must reference existing node ids using fromNode and toNode.",
  "- Use unique 16-character lowercase hexadecimal ids for all nodes and edges.",
  "- Valid node types are text, file, link, and group.",
  "- Prefer text nodes unless a file node or link node is clearly required by the source.",
  "- Text nodes should contain concise, structured Markdown-friendly text.",
  "- Use \\n inside JSON strings for line breaks. Never emit literal \\\\n.",
  "- If useful, use one group node to organize the canvas, but do not overuse groups.",
  "- Layout should be readable: align to a loose grid, leave about 50-100px spacing between nodes, and avoid overlaps.",
  "- Coordinates can be negative, but prefer a clean left-to-right or center-out layout.",
  "- A good canvas usually has a clear central node and connected supporting nodes rather than isolated fragments.",
  "- Unless the source is tiny, create a meaningful structure with several nodes instead of only one or two.",
  "- Use edge labels only when they add real meaning.",
  "- Return a canvas that is ready to save as a .canvas file and open directly in Obsidian.",
  "Reference shape:",
  "{",
  "  \"nodes\": [",
  "    { \"id\": \"6f0ad84f44ce9c17\", \"type\": \"text\", \"x\": 0, \"y\": 0, \"width\": 360, \"height\": 180, \"text\": \"# Topic\\n\\n- point\" }",
  "  ],",
  "  \"edges\": [",
  "    { \"id\": \"0123456789abcdef\", \"fromNode\": \"6f0ad84f44ce9c17\", \"toNode\": \"a1b2c3d4e5f67890\", \"toEnd\": \"arrow\" }",
  "  ]",
  "}",
].join("\n");

export function getAIToolboxArtifactKind(actionId: string): RewriteArtifactKind | undefined {
  if (actionId === "base" || actionId === "canvas" || actionId === "frontmatter") {
    return actionId;
  }

  return undefined;
}

export function getAIToolboxPrompt(actionId: string): string | null {
  switch (actionId) {
    case "list":
      return [
        OBSIDIAN_MARKDOWN_GUIDE,
        "Task:",
        "Convert the source content into a clear Obsidian-friendly Markdown list.",
        "Use ordered or unordered lists based on the content structure.",
        "Preserve meaning, important emphasis, wikilinks, tags, task checkboxes, and inline Markdown when relevant.",
        "Return only the final Markdown list.",
      ].join("\n\n");
    case "table":
      return [
        OBSIDIAN_MARKDOWN_GUIDE,
        "Task:",
        "Convert the source content into a valid Markdown table for Obsidian.",
        "Choose concise and meaningful column headers.",
        "Preserve important entities, wikilinks, tags, and inline formatting when possible.",
        "Return only the final Markdown table.",
      ].join("\n\n");
    case "base":
      return [
        OBSIDIAN_MARKDOWN_GUIDE,
        BASE_SKILL_GUIDE,
        "Task:",
        "Convert the source content into one practical Obsidian .base file body.",
        "Infer meaningful properties and views from the source content rather than emitting a placeholder schema.",
        "If the content clearly describes entities or records, produce a table-first base with sensible order fields.",
        "If multiple browsing modes make sense, include more than one view.",
        "Return only YAML.",
      ].join("\n\n");
    case "frontmatter":
      return [
        OBSIDIAN_MARKDOWN_GUIDE,
        "Obsidian frontmatter generation rules:",
        "- Output YAML frontmatter only for the current note.",
        "- Return a complete frontmatter block wrapped in leading and trailing --- lines.",
        "- Prefer practical fields that users really filter or browse by, such as tags, aliases, status, category, type, project, area, source, created, updated, date, author, owner, rating, priority, due, and cssclasses when appropriate.",
        "- If sibling notes in the same folder show recurring frontmatter conventions, follow those conventions closely in naming style and field shape.",
        "- If context provides preferred_frontmatter_key_aliases, prefer those key names over lower-frequency aliases.",
        "- Reuse existing frontmatter keys from the current note when they are still appropriate instead of inventing conflicting names.",
        "- Keep the output concise and useful. Do not flood the note with speculative properties.",
        "- Use YAML lists for tags/aliases when appropriate.",
        "- Do not include explanations or markdown fences outside the YAML frontmatter block.",
        "Task:",
        "Generate frontmatter for the current note based on the note content, current frontmatter if any, and sibling-note frontmatter patterns from the same folder.",
      ].join("\n\n");
    case "canvas":
      return [
        OBSIDIAN_MARKDOWN_GUIDE,
        CANVAS_SKILL_GUIDE,
        "Task:",
        "Convert the source content into one useful Obsidian canvas.",
        "Extract the main topic, key subtopics, supporting details, and relationships from the source.",
        "Create a readable spatial structure rather than a shallow dump of text.",
        "Prefer a center-out or left-to-right layout with 5-12 meaningful nodes when the source has enough content.",
        "Use text nodes containing concise Markdown headings, bullets, and summaries.",
        "Ensure the canvas feels visually organized when opened directly in Obsidian.",
        "Return only JSON.",
      ].join("\n\n");
    default:
      return null;
  }
}
