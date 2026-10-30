import { Editor, EditorPosition } from "obsidian";

/**
 * Inline formatting model shared by bold / italic / font color / background color.
 *
 * The toolbar used to wrap selections in `<font>` / `<mark>` tags while bold and
 * italic relied on markdown delimiters (`**`, `*`). Markdown is not parsed inside
 * an inline HTML tag, so `**text**` wrapped in `<font>` silently lost its weight
 * (see issue #346). Every command now parses the selection into this model and
 * rebuilds a single canonical representation, so combinations never destroy each
 * other.
 */
export interface InlineFormat {
  /** Raw value of the `background` declaration, e.g. `#FA541C`. */
  markStyle: string | null;
  /** Font color value, e.g. `#2DC26B` or `rgba(0, 0, 0, 0.5)`. */
  fontColor: string | null;
  isBold: boolean;
  isItalic: boolean;
  /** Remaining text without any wrapper. */
  content: string;
}

const BOLD_WEIGHT_RE = /font-weight:\s*(?:bold|bolder|[6-9]00)/i;
const ITALIC_STYLE_RE = /font-style:\s*italic/i;
const BACKGROUND_RE = /background(?:-color)?:\s*([^;]+)/i;
const COLOR_RE = /(?:^|;)\s*color:\s*([^;]+)/i;

const MARK_RE = /^<mark\s+style=["']?([^"'>]+)["']?>([\s\S]*?)<\/mark>$/i;
const FONT_RE = /^<font\s+([^>]*)>([\s\S]*?)<\/font>$/i;
const SPAN_RE = /^<span\s+style=["']?([^"'>]+)["']?>([\s\S]*?)<\/span>$/i;
const BOLD_TAG_RE = /^<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>$/i;
const ITALIC_TAG_RE = /^<(?:i|em)>([\s\S]*?)<\/(?:i|em)>$/i;
// Longest delimiters first so `***x***` is not mistaken for `**x**`.
const BOLD_ITALIC_MD_RE = /^\*\*\*([^*]+)\*\*\*$/;
const BOLD_MD_RE = /^\*\*([^*]+)\*\*$/;
const ITALIC_MD_RE = /^\*([^*]+)\*$/;
const ITALIC_UNDERSCORE_RE = /^_([^_]+)_$/;

/** Parse a single line of inline markdown/HTML into {@link InlineFormat}. */
export function parseInlineFormat(raw: string): InlineFormat {
  let markStyle: string | null = null;
  let fontColor: string | null = null;
  let isBold = false;
  let isItalic = false;
  let text = raw.trim();

  let changed = true;
  while (changed) {
    changed = false;

    const mark = text.match(MARK_RE);
    if (mark) {
      const style = mark[1];
      const background = style.match(BACKGROUND_RE);
      markStyle = background ? background[1].trim() : style.trim();
      if (BOLD_WEIGHT_RE.test(style)) isBold = true;
      if (ITALIC_STYLE_RE.test(style)) isItalic = true;
      const color = style.match(COLOR_RE);
      if (color) fontColor = color[1].trim();
      text = mark[2].trim();
      changed = true;
      continue;
    }

    const font = text.match(FONT_RE);
    if (font) {
      const attrs = font[1];
      const color = attrs.match(/color=["']?([^"'\s>]+)/i);
      if (color) fontColor = color[1].trim();
      const style = attrs.match(/style=["']?([^"'>]+)/i);
      if (style) {
        if (BOLD_WEIGHT_RE.test(style[1])) isBold = true;
        if (ITALIC_STYLE_RE.test(style[1])) isItalic = true;
      }
      text = font[2].trim();
      changed = true;
      continue;
    }

    const span = text.match(SPAN_RE);
    if (span) {
      const style = span[1];
      const background = style.match(BACKGROUND_RE);
      if (background) markStyle = background[1].trim();
      const color = style.match(COLOR_RE);
      if (color) fontColor = color[1].trim();
      if (BOLD_WEIGHT_RE.test(style)) isBold = true;
      if (ITALIC_STYLE_RE.test(style)) isItalic = true;
      text = span[2].trim();
      changed = true;
      continue;
    }

    const boldTag = text.match(BOLD_TAG_RE);
    if (boldTag) {
      isBold = true;
      text = boldTag[1].trim();
      changed = true;
      continue;
    }

    const italicTag = text.match(ITALIC_TAG_RE);
    if (italicTag) {
      isItalic = true;
      text = italicTag[1].trim();
      changed = true;
      continue;
    }

    const boldItalicMd = text.match(BOLD_ITALIC_MD_RE);
    if (boldItalicMd) {
      isBold = true;
      isItalic = true;
      text = boldItalicMd[1].trim();
      changed = true;
      continue;
    }

    const boldMd = text.match(BOLD_MD_RE);
    if (boldMd) {
      isBold = true;
      text = boldMd[1].trim();
      changed = true;
      continue;
    }

    const italicMd = text.match(ITALIC_MD_RE) ?? text.match(ITALIC_UNDERSCORE_RE);
    if (italicMd) {
      isItalic = true;
      text = italicMd[1].trim();
      changed = true;
    }
  }

  return { markStyle, fontColor, isBold, isItalic, content: text };
}

function buildStyleSuffix(isBold: boolean, isItalic: boolean): string {
  let suffix = "";
  if (isBold) suffix += " font-weight:bold;";
  if (isItalic) suffix += " font-style:italic;";
  return suffix;
}

function normalizeBackground(markStyle: string): string {
  return markStyle.startsWith("background:") ? markStyle : `background:${markStyle}`;
}

/**
 * Rebuild a line from {@link InlineFormat}.
 *
 * Markdown delimiters are kept when they still work on their own, so the plain
 * bold case stays `**text**`. As soon as an HTML wrapper is involved the weight
 * and slant are expressed as CSS on that wrapper, because markdown delimiters
 * are not parsed inside inline HTML.
 */
export function buildInlineFormat(format: InlineFormat): string {
  const { markStyle, fontColor, isBold, isItalic, content } = format;

  if (!fontColor && !markStyle) {
    if (isBold && isItalic) return `***${content}***`;
    if (isBold) return `**${content}**`;
    if (isItalic) return `*${content}*`;
    return content;
  }

  const styleSuffix = buildStyleSuffix(isBold, isItalic);

  if (!markStyle) {
    if (!isBold && !isItalic) return `<font color="${fontColor}">${content}</font>`;
    return `<span style="color:${fontColor};${styleSuffix}">${content}</span>`;
  }

  const background = normalizeBackground(markStyle);
  if (!fontColor) {
    if (!isBold && !isItalic) return `<mark style="${background}">${content}</mark>`;
    return `<mark style="${background};${styleSuffix}">${content}</mark>`;
  }
  // 背景色内一律用 span 承载颜色：<mark> 会把 color 强制设为黑/正文色，
  // 而 <font color> 依赖 HTML 表现属性，优先级最低，会被主题样式覆盖掉。
  if (!isBold && !isItalic) {
    return `<mark style="${background}"><span style="color:${fontColor};">${content}</span></mark>`;
  }
  return `<mark style="${background}"><span style="color:${fontColor};${styleSuffix}">${content}</span></mark>`;
}

/**
 * True when a line still carries formatting that the parser could not fold into
 * a single wrapper — for example `*a* and *b*` or `**a** with <font>`.
 * Rewriting such a line as a whole would corrupt the untouched fragments, so the
 * line is left alone instead.
 */
function hasUnparsedFormatting(content: string): boolean {
  return (
    /\*\*[^*]+\*\*/.test(content) ||
    /\*[^*\s][^*]*\*/.test(content) ||
    /<\/?(?:font|mark|span|b|strong|i|em)\b/i.test(content) ||
    /(?:^|\s)_[^_\s][^_]*_(?=\s|$)/.test(content)
  );
}

/**
 * Apply `mutate` to every non-empty line and rebuild the whole block.
 * Leading / trailing whitespace of each line is preserved.
 */
export function mapInlineFormat(
  text: string,
  mutate: (format: InlineFormat) => void
): string {
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const leading = line.match(/^\s*/)?.[0] ?? "";
      const trailing = line.match(/\s*$/)?.[0] ?? "";
      const format = parseInlineFormat(line.trim());
      if (hasUnparsedFormatting(format.content)) return line;
      mutate(format);
      return leading + buildInlineFormat(format) + trailing;
    })
    .join("\n");
}

/** Expand `from`/`to` by one surrounding wrapper pair, if present. */
function expandOnce(
  line: string,
  fromCh: number,
  toCh: number
): { from: number; to: number } | null {
  const before = line.slice(0, fromCh);
  const after = line.slice(toCh);

  for (const marker of ["***", "**", "*"]) {
    if (before.endsWith(marker) && after.startsWith(marker)) {
      return { from: fromCh - marker.length, to: toCh + marker.length };
    }
  }
  if (/(?:^|[^\w])_$/.test(before) && /^_(?!\w)/.test(after)) {
    return { from: fromCh - 1, to: toCh + 1 };
  }

  const open = before.match(/<(span|font|mark|b|strong|i|em)\b[^>]*>$/i);
  if (open) {
    const close = after.match(new RegExp(`^</${open[1]}>`, "i"));
    if (close) {
      return { from: fromCh - open[0].length, to: toCh + close[0].length };
    }
  }
  return null;
}

/**
 * Grow the selection so it covers the formatting wrappers around it, otherwise
 * toggling a format would leave stray `**` / `</font>` fragments behind.
 */
export function expandFormattingSelection(editor: Editor): {
  from: EditorPosition;
  to: EditorPosition;
  text: string;
} {
  const fromCursor = editor.getCursor("from");
  const toCursor = editor.getCursor("to");
  let from: EditorPosition = { line: fromCursor.line, ch: fromCursor.ch };
  let to: EditorPosition = { line: toCursor.line, ch: toCursor.ch };
  let text = editor.getRange(from, to);

  if (from.line !== to.line) return { from, to, text };

  const line = editor.getLine(from.line);
  for (let guard = 0; guard < 8; guard++) {
    const expanded = expandOnce(line, from.ch, to.ch);
    if (!expanded) break;
    from = { line: from.line, ch: expanded.from };
    to = { line: to.line, ch: expanded.to };
    text = editor.getRange(from, to);
  }
  return { from, to, text };
}

const CURSOR_PATTERNS: RegExp[] = [
  /<(?:mark|span|font|b|strong|i|em)\b[^>]*>[\s\S]*?<\/(?:mark|span|font|b|strong|i|em)>/gi,
  /\*\*\*[^*]+\*\*\*/g,
  /\*\*[^*]+\*\*/g,
  /\*[^*\s][^*]*\*/g,
  /(?<!\w)_[^_\s][^_]*_(?!\w)/g,
];

/** Innermost formatted span of a line that contains the cursor. */
function findFormattingRangeAtCursor(
  line: string,
  ch: number
): { from: number; to: number } | null {
  let best: { from: number; to: number } | null = null;
  for (const pattern of CURSOR_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (ch >= start && ch <= end) {
        if (!best || end - start < best.to - best.from) best = { from: start, to: end };
      }
      if (match[0].length === 0) break;
    }
  }
  return best;
}

function placeSelectionAfterReplace(editor: Editor, from: EditorPosition, text: string): void {
  const lines = text.split("\n");
  const lastLine = lines[lines.length - 1];
  editor.setSelection(from, {
    line: from.line + lines.length - 1,
    ch: lines.length === 1 ? from.ch + lastLine.length : lastLine.length,
  });
}

/**
 * Toggle bold / italic while preserving font color and background color.
 * `**` / `*` are only used when no HTML wrapper is involved.
 */
function toggleInlineFlag(editor: Editor | undefined, key: "isBold" | "isItalic"): void {
  if (!editor) return;

  const placeholder = key === "isBold" ? "****" : "**";
  const caretOffset = key === "isBold" ? 2 : 1;

  if (!editor.somethingSelected()) {
    const cursor = editor.getCursor();
    const range = findFormattingRangeAtCursor(editor.getLine(cursor.line), cursor.ch);
    if (!range) {
      editor.replaceSelection(placeholder);
      editor.setCursor({ line: cursor.line, ch: cursor.ch + caretOffset });
      return;
    }
    editor.setSelection(
      { line: cursor.line, ch: range.from },
      { line: cursor.line, ch: range.to }
    );
  }

  const { from, to, text } = expandFormattingSelection(editor);
  if (!text || text.trim() === "") {
    editor.replaceSelection(placeholder);
    editor.setCursor({ line: from.line, ch: from.ch + caretOffset });
    return;
  }

  let enable = false;
  text.split("\n").forEach((line) => {
    if (line.trim() && !parseInlineFormat(line.trim())[key]) enable = true;
  });

  const newText = mapInlineFormat(text, (format) => {
    format[key] = enable;
  });
  editor.replaceRange(newText, from, to);
  placeSelectionAfterReplace(editor, from, newText);
}

export function toggleBold(editor?: Editor): void {
  toggleInlineFlag(editor, "isBold");
}

export function toggleItalic(editor?: Editor): void {
  toggleInlineFlag(editor, "isItalic");
}

/** 颜色值比较前的归一化：忽略大小写、空格与 `background:` 前缀差异。 */
function normalizeColor(value: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

/** `markStyle` 可能存成 `#fff88f` 也可能存成 `background:#fff88f`，比较前统一去掉前缀。 */
function backgroundValue(markStyle: string | null): string {
  return (markStyle ?? "").replace(/^background(-color)?:/i, "");
}

/**
 * 判断整个选区是否**已经**是这个颜色。
 * 用于「再点一次同色即取消」：只要有一行不是该颜色（或存在无法解析的片段），
 * 就按“上色”处理，避免把混排的选区误清空。
 */
function selectionHasColor(
  text: string,
  read: (format: InlineFormat) => string | null,
  target: string
): boolean {
  const expected = normalizeColor(target);
  let matched = false;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const format = parseInlineFormat(line.trim());
    if (hasUnparsedFormatting(format.content)) return false;
    if (normalizeColor(read(format)) !== expected) return false;
    matched = true;
  }
  return matched;
}

export interface ColorCommandOptions {
  /**
   * 同色再次应用时是否取消该颜色，默认开启（工具栏按钮 / 取色器）。
   * 格式刷必须关掉，否则刷过已有同色文字会变成“擦除”。
   */
  toggle?: boolean;
}

export function setFontcolor(
  color: string,
  editor?: Editor,
  plugin?: { setLastExecutedCommand(commandId: string): void },
  options: ColorCommandOptions = {}
): void {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection || selection.trim() === "") {
    plugin?.setLastExecutedCommand("editing-toolbar:change-font-color");
    return;
  }

  const { from, to, text } = expandFormattingSelection(editor);
  const remove =
    options.toggle !== false &&
    selectionHasColor(text, (format) => format.fontColor, color);
  const newText = mapInlineFormat(text, (format) => {
    format.fontColor = remove ? null : color;
  });
  editor.replaceRange(newText, from, to);
  placeSelectionAfterReplace(editor, from, newText);
}

export function setBackgroundcolor(
  color: string,
  editor?: Editor,
  options: ColorCommandOptions = {}
): void {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection || selection.trim() === "") return;

  const { from, to, text } = expandFormattingSelection(editor);
  const remove =
    options.toggle !== false &&
    selectionHasColor(text, (format) => backgroundValue(format.markStyle), color);
  const newText = mapInlineFormat(text, (format) => {
    format.markStyle = remove ? null : `background:${color}`;
  });
  editor.replaceRange(newText, from, to);
  placeSelectionAfterReplace(editor, from, newText);
}
