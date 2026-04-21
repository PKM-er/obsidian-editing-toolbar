/**
 * Context compaction utilities for managing large file content
 */

export interface CompactionConfig {
  previewCharsPerSection: number;
  maxSections: number;
  verbatimThreshold: number;
}

export const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
  previewCharsPerSection: 2000,
  maxSections: 50,
  verbatimThreshold: 50000,
};

export function compactContent(content: string, config: Partial<CompactionConfig> = {}): string {
  const finalConfig = { ...DEFAULT_COMPACTION_CONFIG, ...config };

  if (content.length <= finalConfig.verbatimThreshold) {
    return content;
  }

  return compactBySection(content, finalConfig.previewCharsPerSection, finalConfig.maxSections);
}

function compactBySection(content: string, previewCharsPerSection: number, maxSections: number): string {
  const sections = content.split(/(?=^#{1,6}\s+)/m).filter((s) => s.trim());

  if (sections.length <= 1) {
    return truncateWithEllipsis(content, previewCharsPerSection * 4);
  }

  const limitedSections = sections.slice(0, maxSections);
  const hasMoreSections = sections.length > maxSections;

  const compacted = limitedSections
    .map((section) => {
      const lines = section.trim().split("\n");
      const heading = lines[0];
      const body = lines.slice(1).join("\n").trim();

      if (body.length <= previewCharsPerSection) {
        return section.trim();
      }

      return `${heading}\n${truncateWithEllipsis(body, previewCharsPerSection)}`;
    })
    .join("\n\n");

  if (hasMoreSections) {
    return `${compacted}\n\n[... ${sections.length - maxSections} more sections omitted ...]`;
  }

  return compacted;
}

function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);

  const sentenceEndPattern = /[.!?。！？]\s+/g;
  let lastSentenceEnd = -1;
  let match;
  while ((match = sentenceEndPattern.exec(truncated)) !== null) {
    if (match.index > maxLength * 0.5) {
      lastSentenceEnd = match.index + 1;
    }
  }
  if (lastSentenceEnd > 0) {
    return truncated.slice(0, lastSentenceEnd) + " ...";
  }

  const lastParagraph = truncated.lastIndexOf("\n\n");
  if (lastParagraph > maxLength * 0.5) {
    return truncated.slice(0, lastParagraph) + "\n\n...";
  }

  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + " ...";
  }

  return truncated + "...";
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatContextStats(charCount: number, tokenEstimate: number): string {
  if (charCount < 1000) {
    return `${charCount} 字符 (~${tokenEstimate} tokens)`;
  }
  return `${(charCount / 1000).toFixed(1)}k 字符 (~${tokenEstimate} tokens)`;
}
