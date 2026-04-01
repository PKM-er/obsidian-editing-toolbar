import type { EditorView } from "@codemirror/view";

export interface CompletionContextPayload {
  prefix: string;
  suffix: string;
  context: string;
}

export interface RewriteContextPayload {
  from: number;
  to: number;
  selectedText: string;
  hasSelection: boolean;
  source: "selection" | "block" | "cursor";
  context: string;
}

export interface RewriteContextOptions {
  preferBlockWhenCollapsed?: boolean;
  noteTitle?: string;
}

function isBlankLine(text: string): boolean {
  return text.trim().length === 0;
}

function parseHeading(text: string): { level: number; title: string } | null {
  const match = text.trimStart().match(/^(#{1,6})\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    title: match[2].trim(),
  };
}

function findBlockStartLineNumber(view: EditorView, lineNumber: number): number {
  let current = lineNumber;
  while (current > 1) {
    const prevLine = view.state.doc.line(current - 1).text;
    if (isBlankLine(prevLine) || parseHeading(prevLine)) {
      break;
    }
    current--;
  }
  return current;
}

function findBlockEndLineNumber(view: EditorView, lineNumber: number): number {
  let current = lineNumber;
  while (current < view.state.doc.lines) {
    const nextLine = view.state.doc.line(current + 1).text;
    if (isBlankLine(nextLine) || parseHeading(nextLine)) {
      break;
    }
    current++;
  }
  return current;
}

function readLines(view: EditorView, startLineNumber: number, endLineNumber: number): string {
  const parts: string[] = [];
  for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
    parts.push(view.state.doc.line(lineNumber).text);
  }
  return parts.join("\n");
}

function findNeighborBlock(view: EditorView, fromLineNumber: number, direction: -1 | 1): string {
  let lineNumber = fromLineNumber;

  while (lineNumber >= 1 && lineNumber <= view.state.doc.lines) {
    const line = view.state.doc.line(lineNumber).text;
    if (!isBlankLine(line)) {
      const heading = parseHeading(line);
      if (heading) {
        return line;
      }

      const startLineNumber = findBlockStartLineNumber(view, lineNumber);
      const endLineNumber = findBlockEndLineNumber(view, lineNumber);
      return readLines(view, startLineNumber, endLineNumber);
    }
    lineNumber += direction;
  }

  return "";
}

function collectHeadingPath(view: EditorView, lineNumber: number): string[] {
  const headingByLevel = new Map<number, string>();

  for (let current = 1; current <= lineNumber; current++) {
    const heading = parseHeading(view.state.doc.line(current).text);
    if (!heading) {
      continue;
    }

    headingByLevel.set(heading.level, heading.title);
    for (let level = heading.level + 1; level <= 6; level++) {
      headingByLevel.delete(level);
    }
  }

  return Array.from(headingByLevel.entries())
    .sort((left, right) => left[0] - right[0])
    .map((entry) => entry[1]);
}

export function buildLocalCompletionContext(view: EditorView, pos: number): CompletionContextPayload {
  const currentLine = view.state.doc.lineAt(pos);
  const blockStartLineNumber = findBlockStartLineNumber(view, currentLine.number);
  const blockEndLineNumber = findBlockEndLineNumber(view, currentLine.number);
  const localFrom = view.state.doc.line(blockStartLineNumber).from;
  const localTo = view.state.doc.line(blockEndLineNumber).to;
  const prefix = view.state.sliceDoc(localFrom, pos);
  const suffix = view.state.sliceDoc(pos, localTo);
  const linePrefix = view.state.sliceDoc(currentLine.from, pos);
  const lineSuffix = view.state.sliceDoc(pos, currentLine.to);
  const previousBlock = findNeighborBlock(view, blockStartLineNumber - 1, -1);
  const nextBlock = findNeighborBlock(view, blockEndLineNumber + 1, 1);
  const headingPath = collectHeadingPath(view, currentLine.number);
  const listMatch = currentLine.text.match(/^(\s*(?:[-*+] |\d+\. |>)?)/);

  return {
    prefix,
    suffix,
    context: [
      `cursor_line: ${currentLine.number}`,
      `block_lines: ${blockStartLineNumber}-${blockEndLineNumber}`,
      `heading_path: ${headingPath.join(" > ") || "(root)"}`,
      `line_prefix_pattern: ${(listMatch?.[1] || "").replace(/\n/g, "")}`,
      "current_line_before_cursor:",
      linePrefix,
      "current_line_after_cursor:",
      lineSuffix,
      "previous_block:",
      previousBlock,
      "next_block:",
      nextBlock,
    ].join("\n"),
  };
}

export function resolveRewriteContext(
  view: EditorView,
  from: number,
  to: number,
  options?: { preferBlockWhenCollapsed?: boolean },
): RewriteContextPayload {
  const doc = view.state.doc;
  const maxPos = doc.length;
  const safeFrom = Math.max(0, Math.min(from, maxPos));
  const safeTo = Math.max(0, Math.min(to, maxPos));
  const hasSelection = safeFrom !== safeTo;
  const preferBlockWhenCollapsed = options?.preferBlockWhenCollapsed ?? false;

  let effectiveFrom = safeFrom;
  let effectiveTo = safeTo;
  let selectedText = hasSelection ? view.state.sliceDoc(safeFrom, safeTo) : "";
  let source: RewriteContextPayload["source"] = hasSelection ? "selection" : "cursor";

  if (!hasSelection && preferBlockWhenCollapsed) {
    const currentLine = doc.lineAt(safeFrom);
    if (!isBlankLine(currentLine.text)) {
      const blockStartLineNumber = findBlockStartLineNumber(view, currentLine.number);
      const blockEndLineNumber = findBlockEndLineNumber(view, currentLine.number);
      effectiveFrom = doc.line(blockStartLineNumber).from;
      effectiveTo = doc.line(blockEndLineNumber).to;
      selectedText = view.state.sliceDoc(effectiveFrom, effectiveTo);
      if (selectedText.trim()) {
        source = "block";
      } else {
        effectiveFrom = safeFrom;
        effectiveTo = safeTo;
      }
    }
  }

  const anchorPos = source === "cursor" ? safeFrom : effectiveFrom;
  const anchorLine = doc.lineAt(anchorPos);
  const rangeEndPos = effectiveTo > effectiveFrom ? Math.max(effectiveFrom, effectiveTo - 1) : effectiveFrom;
  const startLineNumber = doc.lineAt(effectiveFrom).number;
  const endLineNumber = doc.lineAt(rangeEndPos).number;
  const surroundingBlockStart = findBlockStartLineNumber(view, anchorLine.number);
  const surroundingBlockEnd = findBlockEndLineNumber(view, anchorLine.number);
  const surroundingBlock = readLines(view, surroundingBlockStart, surroundingBlockEnd);
  const headingPath = collectHeadingPath(view, anchorLine.number);
  const previousBlock = findNeighborBlock(view, startLineNumber - 1, -1);
  const nextBlock = findNeighborBlock(view, endLineNumber + 1, 1);
  const contextBeforeFrom = source === "cursor"
    ? doc.line(surroundingBlockStart).from
    : Math.max(0, effectiveFrom - 1200);
  const contextAfterTo = source === "cursor"
    ? doc.line(surroundingBlockEnd).to
    : Math.min(maxPos, effectiveTo + 900);
  const textBeforeTarget = view.state.sliceDoc(contextBeforeFrom, effectiveFrom);
  const textAfterTarget = view.state.sliceDoc(effectiveTo, contextAfterTo);

  return {
    from: effectiveFrom,
    to: effectiveTo,
    selectedText,
    hasSelection,
    source,
    context: [
      `target_source: ${source}`,
      `target_lines: ${startLineNumber}-${endLineNumber}`,
      `heading_path: ${headingPath.join(" > ") || "(root)"}`,
      "surrounding_block:",
      surroundingBlock,
      "text_before_target:",
      textBeforeTarget,
      "text_after_target:",
      textAfterTarget,
      "previous_block:",
      previousBlock,
      "next_block:",
      nextBlock,
    ].join("\n"),
  };
}
