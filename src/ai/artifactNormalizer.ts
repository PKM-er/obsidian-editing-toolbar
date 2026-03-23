import { t } from "src/translations/helper";
import type { RewriteArtifactKind } from "./types";

interface NormalizeArtifactRequest {
  kind: RewriteArtifactKind;
  content: string;
  sourceText: string;
}

type CanvasNodeType = "text" | "file" | "link" | "group";

interface CanvasNodeRecord {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
  color?: string;
  background?: string;
  backgroundStyle?: string;
}

interface CanvasEdgeRecord {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  fromEnd?: string;
  toEnd?: string;
  color?: string;
  label?: string;
}

interface CanvasDocumentRecord {
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}

const CANVAS_NODE_TYPES = new Set<CanvasNodeType>(["text", "file", "link", "group"]);
const CANVAS_SIDES = new Set(["top", "right", "bottom", "left"]);
const CANVAS_ENDS = new Set(["none", "arrow"]);

export function normalizeGeneratedArtifactContent(request: NormalizeArtifactRequest): string {
  const stripped = stripCodeFence(request.content);
  if (!stripped) {
    throw new Error(t("AI generated content is empty."));
  }

  if (request.kind === "canvas") {
    return normalizeCanvasContent(stripped, request.sourceText);
  }

  return normalizeBaseContent(stripped, request.sourceText);
}

export function normalizeGeneratedFrontmatter(content: string, preferredKeyMap: Record<string, string> = {}): string {
  const stripped = stripCodeFence(content);
  if (!stripped) {
    throw new Error(t("AI generated content is empty."));
  }

  const inner = stripped
    .replace(/^---\s*\n?/i, "")
    .replace(/\n?---\s*$/i, "")
    .trim();

  if (!inner) {
    throw new Error(t("AI generated content is empty."));
  }

  const normalizedInner = applyPreferredFrontmatterKeys(inner, preferredKeyMap);
  return `---\n${normalizedInner}\n---\n\n`;
}

function applyPreferredFrontmatterKeys(content: string, preferredKeyMap: Record<string, string>): string {
  if (!preferredKeyMap || Object.keys(preferredKeyMap).length === 0) {
    return content;
  }

  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const existingTopLevelKeys = new Set(
    lines
      .map((line) => line.match(/^([A-Za-z0-9_-]+):(?:\s|$)/)?.[1])
      .filter((key): key is string => !!key),
  );

  return lines
    .map((line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
      if (!match) {
        return line;
      }

      const [, key, rest] = match;
      const preferredKey = preferredKeyMap[key];
      if (!preferredKey || preferredKey === key) {
        return line;
      }

      if (existingTopLevelKeys.has(preferredKey)) {
        return line;
      }

      return `${preferredKey}:${rest}`;
    })
    .join("\n")
    .trim();
}

function stripCodeFence(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json|yaml|yml)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function normalizeBaseContent(content: string, sourceText: string): string {
  const normalized = content.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").trim();
  const hasKnownTopLevelKey = /^(filters|formulas|properties|summaries|views):/m.test(normalized);

  if (!hasKnownTopLevelKey) {
    return `${buildFallbackBaseContent(sourceText)}\n`;
  }

  let output = normalized;

  if (!/^views:/m.test(output)) {
    output = `${output}\n\n${buildDefaultBaseViewBlock()}`;
  } else if (!/^\s*-\s+type:/m.test(output)) {
    output = output.replace(/^views:\s*$/m, `views:\n${indentBlock(buildDefaultBaseViewItem(), 2)}`);
  }

  if (!/^\s+order:\s*$/m.test(output)) {
    output = output.replace(
      /(^\s*-\s+type:\s+[\w-]+\s*\n\s+name:\s+.+$)/m,
      `$1\n  order:\n    - file.name`,
    );
  }

  return `${output.trim()}\n`;
}

function buildFallbackBaseContent(sourceText: string): string {
  const sourceHint = buildSourceLabel(sourceText);
  return [
    "filters:",
    "  and: []",
    "properties:",
    '  file.name:',
    '    displayName: "Name"',
    '  file.folder:',
    '    displayName: "Folder"',
    "views:",
    '  - type: table',
    `    name: "${escapeYamlDoubleQuoted(sourceHint)}"`,
    "    order:",
    "      - file.name",
    "      - file.folder",
  ].join("\n");
}

function buildDefaultBaseViewBlock(): string {
  return [
    "views:",
    ...buildDefaultBaseViewItem().split("\n"),
  ].join("\n");
}

function buildDefaultBaseViewItem(): string {
  return [
    "- type: table",
    '  name: "Overview"',
    "  order:",
    "    - file.name",
  ].join("\n");
}

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeCanvasContent(content: string, sourceText: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(t("AI returned invalid Canvas JSON."));
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(t("AI returned invalid Canvas JSON."));
  }

  const rawDoc = parsed as Record<string, unknown>;
  const idRegistry = new Set<string>();
  const inputNodes = Array.isArray(rawDoc.nodes) ? rawDoc.nodes : [];
  const inputEdges = Array.isArray(rawDoc.edges) ? rawDoc.edges : [];

  let nodes = inputNodes
    .map((item, index) => normalizeCanvasNode(item, idRegistry, sourceText, index))
    .filter((item): item is CanvasNodeRecord => item !== null);

  if (nodes.length === 0) {
    nodes = [buildFallbackCanvasNode(idRegistry, sourceText)];
  }

  let edges = inputEdges
    .map((item) => normalizeCanvasEdge(item, idRegistry, new Set(nodes.map((node) => node.id))))
    .filter((item): item is CanvasEdgeRecord => item !== null);

  if (edges.length === 0 && nodes.filter((node) => node.type !== "group").length > 2) {
    edges = buildFallbackCanvasEdges(nodes, idRegistry);
  }

  const normalizedDoc = autoLayoutCanvas({ nodes, edges }, sourceText, idRegistry);
  return `${JSON.stringify(normalizedDoc, null, 2)}\n`;
}

function normalizeCanvasNode(
  input: unknown,
  idRegistry: Set<string>,
  sourceText: string,
  index: number,
): CanvasNodeRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const type = CANVAS_NODE_TYPES.has(raw.type as CanvasNodeType) ? (raw.type as CanvasNodeType) : "text";
  const id = normalizeHexId(raw.id, idRegistry);
  const color = typeof raw.color === "string" && raw.color.trim() ? raw.color.trim() : undefined;

  if (type === "group") {
    return {
      id,
      type,
      x: toNumber(raw.x, index * 60 - 40),
      y: toNumber(raw.y, -60),
      width: clampNumber(raw.width, 680, 240, 2800),
      height: clampNumber(raw.height, 420, 160, 2200),
      label: typeof raw.label === "string" ? raw.label.trim() : buildSourceLabel(sourceText),
      color,
      background: typeof raw.background === "string" ? raw.background : undefined,
      backgroundStyle: typeof raw.backgroundStyle === "string" ? raw.backgroundStyle : undefined,
    };
  }

  if (type === "file" && typeof raw.file === "string" && raw.file.trim()) {
    return {
      id,
      type,
      x: toNumber(raw.x, 0),
      y: toNumber(raw.y, 0),
      width: clampNumber(raw.width, 360, 260, 560),
      height: clampNumber(raw.height, 240, 160, 420),
      file: raw.file.trim(),
      color,
    };
  }

  if (type === "link" && typeof raw.url === "string" && raw.url.trim()) {
    return {
      id,
      type,
      x: toNumber(raw.x, 0),
      y: toNumber(raw.y, 0),
      width: clampNumber(raw.width, 320, 240, 520),
      height: clampNumber(raw.height, 180, 120, 320),
      url: raw.url.trim(),
      color,
    };
  }

  const text = buildCanvasNodeText(raw, sourceText, index);
  const size = estimateTextNodeSize(text);

  return {
    id,
    type: "text",
    x: toNumber(raw.x, 0),
    y: toNumber(raw.y, 0),
    width: clampNumber(raw.width, size.width, 220, 620),
    height: clampNumber(raw.height, size.height, 90, 420),
    text,
    color,
  };
}

function normalizeCanvasEdge(
  input: unknown,
  idRegistry: Set<string>,
  nodeIds: Set<string>,
): CanvasEdgeRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const fromNode = typeof raw.fromNode === "string" ? raw.fromNode.trim() : "";
  const toNode = typeof raw.toNode === "string" ? raw.toNode.trim() : "";

  if (!nodeIds.has(fromNode) || !nodeIds.has(toNode) || fromNode === toNode) {
    return null;
  }

  return {
    id: normalizeHexId(raw.id, idRegistry),
    fromNode,
    toNode,
    fromSide: normalizeAllowedValue(raw.fromSide, CANVAS_SIDES),
    toSide: normalizeAllowedValue(raw.toSide, CANVAS_SIDES),
    fromEnd: normalizeAllowedValue(raw.fromEnd, CANVAS_ENDS),
    toEnd: normalizeAllowedValue(raw.toEnd, CANVAS_ENDS) ?? "arrow",
    color: typeof raw.color === "string" && raw.color.trim() ? raw.color.trim() : undefined,
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : undefined,
  };
}

function autoLayoutCanvas(
  doc: CanvasDocumentRecord,
  sourceText: string,
  idRegistry: Set<string>,
): CanvasDocumentRecord {
  const regularNodes = doc.nodes.filter((node) => node.type !== "group");
  const groupNodes = doc.nodes.filter((node) => node.type === "group");

  const adjacency = new Map<string, Set<string>>();
  const degree = new Map<string, number>();
  for (const node of regularNodes) {
    adjacency.set(node.id, new Set());
    degree.set(node.id, 0);
  }

  for (const edge of doc.edges) {
    if (!adjacency.has(edge.fromNode) || !adjacency.has(edge.toNode)) {
      continue;
    }
    adjacency.get(edge.fromNode)?.add(edge.toNode);
    adjacency.get(edge.toNode)?.add(edge.fromNode);
    degree.set(edge.fromNode, (degree.get(edge.fromNode) ?? 0) + 1);
    degree.set(edge.toNode, (degree.get(edge.toNode) ?? 0) + 1);
  }

  const root = chooseCanvasRoot(regularNodes, degree, sourceText);
  const layers = buildCanvasLayers(regularNodes, adjacency, root?.id);
  const xGap = 420;
  const yGap = 220;

  layers.forEach((layer, layerIndex) => {
    const totalHeight = layer.reduce((sum, node) => sum + node.height, 0) + Math.max(0, layer.length - 1) * 42;
    let cursorY = -Math.round(totalHeight / 2);
    layer.forEach((node) => {
      node.x = layerIndex * xGap;
      node.y = cursorY;
      cursorY += node.height + 42;
    });
  });

  if (regularNodes.length === 1) {
    regularNodes[0].x = 0;
    regularNodes[0].y = 0;
  }

  const normalizedGroups = normalizeCanvasGroups(groupNodes, regularNodes, idRegistry, sourceText);
  return {
    nodes: [...normalizedGroups, ...regularNodes],
    edges: doc.edges,
  };
}

function chooseCanvasRoot(
  nodes: CanvasNodeRecord[],
  degree: Map<string, number>,
  sourceText: string,
): CanvasNodeRecord | null {
  if (nodes.length === 0) {
    return null;
  }

  const headingLikeNode = nodes.find((node) => (node.text || "").trim().startsWith("# "));
  if (headingLikeNode) {
    return headingLikeNode;
  }

  const titleHint = buildSourceLabel(sourceText).toLowerCase();
  const matchingNode = nodes.find((node) => (node.text || "").toLowerCase().includes(titleHint));
  if (matchingNode) {
    return matchingNode;
  }

  return [...nodes].sort((left, right) => {
    const degreeDiff = (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0);
    if (degreeDiff !== 0) {
      return degreeDiff;
    }
    return (right.text || "").length - (left.text || "").length;
  })[0];
}

function buildCanvasLayers(
  nodes: CanvasNodeRecord[],
  adjacency: Map<string, Set<string>>,
  rootId?: string,
): CanvasNodeRecord[][] {
  if (nodes.length === 0) {
    return [];
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const orderedRoots = rootId ? [rootId, ...nodes.map((node) => node.id).filter((id) => id !== rootId)] : nodes.map((node) => node.id);
  const layers: CanvasNodeRecord[][] = [];

  for (const candidateId of orderedRoots) {
    if (visited.has(candidateId) || !nodeById.has(candidateId)) {
      continue;
    }

    const queue: Array<{ id: string; depth: number }> = [{ id: candidateId, depth: layers.length === 0 ? 0 : layers.length }];
    visited.add(candidateId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!layers[current.depth]) {
        layers[current.depth] = [];
      }
      layers[current.depth].push(nodeById.get(current.id)!);

      const neighbors = [...(adjacency.get(current.id) ?? [])]
        .filter((neighborId) => !visited.has(neighborId))
        .sort((left, right) => (nodeById.get(right)?.text || "").length - (nodeById.get(left)?.text || "").length);

      neighbors.forEach((neighborId) => {
        visited.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      });
    }
  }

  return layers.filter((layer) => layer && layer.length > 0);
}

function normalizeCanvasGroups(
  groups: CanvasNodeRecord[],
  regularNodes: CanvasNodeRecord[],
  idRegistry: Set<string>,
  sourceText: string,
): CanvasNodeRecord[] {
  if (regularNodes.length === 0) {
    return groups;
  }

  const bounds = getCanvasBounds(regularNodes);
  if (groups.length === 0) {
    return [
      {
        id: normalizeHexId(undefined, idRegistry),
        type: "group",
        x: bounds.x - 70,
        y: bounds.y - 70,
        width: bounds.width + 140,
        height: bounds.height + 140,
        label: buildSourceLabel(sourceText),
        color: "4",
      },
    ];
  }

  const [firstGroup, ...restGroups] = groups;
  firstGroup.x = bounds.x - 70;
  firstGroup.y = bounds.y - 70;
  firstGroup.width = bounds.width + 140;
  firstGroup.height = bounds.height + 140;
  firstGroup.label = firstGroup.label || buildSourceLabel(sourceText);

  restGroups.forEach((group, index) => {
    group.x = bounds.x - 70 + (index + 1) * 24;
    group.y = bounds.y - 70 + (index + 1) * 24;
    group.width = Math.max(240, bounds.width + 90 - (index + 1) * 18);
    group.height = Math.max(180, bounds.height + 90 - (index + 1) * 18);
  });

  return groups;
}

function getCanvasBounds(nodes: CanvasNodeRecord[]): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function buildFallbackCanvasEdges(nodes: CanvasNodeRecord[], idRegistry: Set<string>): CanvasEdgeRecord[] {
  const regularNodes = nodes.filter((node) => node.type !== "group");
  if (regularNodes.length < 2) {
    return [];
  }

  const [root, ...others] = regularNodes;
  return others.map((node) => ({
    id: normalizeHexId(undefined, idRegistry),
    fromNode: root.id,
    toNode: node.id,
    toEnd: "arrow",
  }));
}

function buildFallbackCanvasNode(idRegistry: Set<string>, sourceText: string): CanvasNodeRecord {
  const text = buildFallbackCanvasNodeText(sourceText);
  const size = estimateTextNodeSize(text);
  return {
    id: normalizeHexId(undefined, idRegistry),
    type: "text",
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    text,
  };
}

function buildCanvasNodeText(raw: Record<string, unknown>, sourceText: string, index: number): string {
  const candidates = [
    raw.text,
    raw.label,
    raw.title,
    raw.name,
    raw.file,
    raw.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().replace(/\\n/g, "\n");
    }
  }

  const lines = sourceText.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines[index]) {
    return lines[index];
  }

  return buildFallbackCanvasNodeText(sourceText);
}

function buildFallbackCanvasNodeText(sourceText: string): string {
  const lines = sourceText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (lines.length === 0) {
    return "# Canvas\n\n- Key point";
  }

  const [first, ...rest] = lines;
  const bullets = rest.slice(0, 4).map((line) => `- ${line.replace(/^[-*+]\s+/, "")}`);
  return [`# ${truncateText(first, 48)}`, bullets.length ? "" : null, ...bullets].filter((item): item is string => item !== null).join("\n");
}

function buildSourceLabel(sourceText: string): string {
  const firstLine = sourceText.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).find(Boolean);
  return truncateText(firstLine || t("Untitled"), 42);
}

function estimateTextNodeSize(text: string): { width: number; height: number } {
  const lines = text.split("\n");
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const width = Math.min(520, Math.max(260, 180 + maxLineLength * 6));
  const height = Math.min(320, Math.max(110, 70 + lines.length * 28));
  return { width, height };
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function indentBlock(value: string, spaces: number): string {
  const indent = " ".repeat(spaces);
  return value.split("\n").map((line) => `${indent}${line}`).join("\n");
}

function normalizeAllowedValue(value: unknown, allowed: Set<string>): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return allowed.has(normalized) ? normalized : undefined;
}

function normalizeHexId(value: unknown, registry: Set<string>): string {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (/^[0-9a-f]{16}$/.test(normalized) && !registry.has(normalized)) {
      registry.add(normalized);
      return normalized;
    }
  }

  let nextId = "";
  do {
    nextId = generateHexId();
  } while (registry.has(nextId));

  registry.add(nextId);
  return nextId;
}

function generateHexId(): string {
  const values = new Uint8Array(8);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = toNumber(value, fallback);
  return Math.max(min, Math.min(max, Math.round(numeric)));
}
