import { TFile, TextFileView, type View } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { compactContent } from "./contextCompactor";

export type CanvasNodeType = "text" | "file" | "link" | "group";
type CanvasEdgeSide = "top" | "right" | "bottom" | "left";
type CanvasLayoutStyle = "tree" | "dag" | "mindmap";

export interface CanvasNodeRecord {
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

export interface CanvasEdgeRecord {
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

export interface CanvasDocumentRecord {
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}

export interface CanvasExpansionDraftNode {
  title: string;
  body?: string;
  relation?: string;
  color?: string;
}

export interface CanvasInstructionDraftNode extends CanvasExpansionDraftNode {
  connectTo?: string;
}

export interface CanvasInstructionEdgeDraft {
  fromNode: string;
  toNode: string;
  label?: string;
}

export interface CanvasInstructionLayoutDraft {
  nodeId: string;
  column: number;
  row: number;
}

export interface CanvasInstructionPlan {
  addNodes: CanvasInstructionDraftNode[];
  addEdges: CanvasInstructionEdgeDraft[];
  layoutNodes: CanvasInstructionLayoutDraft[];
  replaceExistingEdges: boolean;
}

export interface CanvasKnowledgeMapNodeDraft {
  id: string;
  type: "concept" | "detail";
  title: string;
  content: string;
  level: number;
  group?: string;
}

export interface CanvasKnowledgeMapEdgeDraft {
  from: string;
  to: string;
  relation?: string;
}

export interface CanvasKnowledgeMapBoardConnectionDraft {
  nodeId: string;
  existingNodeId: string;
  relation?: string;
}

export interface CanvasKnowledgeMapBlueprint {
  nodes: CanvasKnowledgeMapNodeDraft[];
  edges: CanvasKnowledgeMapEdgeDraft[];
  boardConnections: CanvasKnowledgeMapBoardConnectionDraft[];
}

export interface CanvasNodeSummary {
  id: string;
  type: CanvasNodeType;
  text: string;
  node: CanvasNodeRecord;
}

export interface ActiveCanvasContext {
  view: TextFileView;
  file: TFile;
  document: CanvasDocumentRecord;
  anchorNode: CanvasNodeSummary | null;
  selectedNodeIds: string[];
  selectedNodes: CanvasNodeSummary[];
  neighboringNodes: CanvasNodeSummary[];
  contextText: string;
}

export interface GetActiveCanvasContextOptions {
  requireAnchor?: boolean;
}

export interface ApplyCanvasExpansionResult {
  addedNodeCount: number;
  addedEdgeCount: number;
  movedNodeCount: number;
}

export interface CanvasDocumentSource {
  scope: "selection" | "board";
  nodeCount: number;
  text: string;
}

export interface BuildCanvasDocumentSourceOptions {
  scopeMode?: "auto" | "selection" | "board";
}

interface CanvasLayoutSpacingOptions {
  columnGap?: number;
  rowGap?: number;
  baseX?: number;
  baseY?: number;
}

interface CanvasKnowledgeMapGroupDraft {
  label: string;
  nodeIds: string[];
  color?: string;
}

const DETERMINISTIC_LAYOUT_LEAF_SPAN = 2;
const DETERMINISTIC_LAYOUT_SIBLING_GAP = 1;
const DETERMINISTIC_LAYOUT_ROOT_GAP = 2;
const DETERMINISTIC_LAYOUT_COMPONENT_GAP = 3;
const DETERMINISTIC_LAYOUT_COLUMN_GAP = 320;
const DETERMINISTIC_LAYOUT_ROW_GAP = 96;
const KNOWLEDGE_MAP_LAYOUT_COLUMN_GAP = 96;
const KNOWLEDGE_MAP_LAYOUT_ROW_GAP = 64;
const KNOWLEDGE_MAP_ROOT_OFFSET_X = 260;
const KNOWLEDGE_MAP_BRANCH_GAP_X = 180;
const KNOWLEDGE_MAP_EMPTY_BOARD_START_X = 220;
const KNOWLEDGE_MAP_EMPTY_BOARD_START_Y = 120;
const KNOWLEDGE_MAP_LEAF_SPAN = 1;
const KNOWLEDGE_MAP_SIBLING_GAP = 1;
const KNOWLEDGE_MAP_ROOT_GAP = 1;

export function getActiveCanvasTextFileView(plugin: EditingToolbarPlugin): TextFileView | null {
  const view = plugin.app.workspace.activeLeaf?.view;
  if (!isCanvasTextFileView(view)) {
    return null;
  }

  return view;
}

export async function getActiveCanvasContext(
  plugin: EditingToolbarPlugin,
  options: GetActiveCanvasContextOptions = {},
): Promise<ActiveCanvasContext> {
  const view = getActiveCanvasTextFileView(plugin);
  if (!view) {
    throw new Error(t("Canvas AI requires an active Canvas file."));
  }

  const file = view.file ?? plugin.app.workspace.getActiveFile();
  if (!file || file.extension !== "canvas") {
    throw new Error(t("Canvas AI requires an active Canvas file."));
  }

  const document = parseCanvasDocument(view.getViewData());
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const selectedNodeIds = resolveSelectedNodeIds(view, document);
  const anchorNode = resolveAnchorNode(nodeMap, selectedNodeIds);

  if (!anchorNode && options.requireAnchor !== false) {
    throw new Error(t("Please select a canvas node first."));
  }

  const selectedNodes = await buildSelectedNodeSummaries(plugin, document, selectedNodeIds, anchorNode?.id ?? null);
  const neighboringNodes = anchorNode
    ? await buildNeighboringNodeSummaries(plugin, document, anchorNode.id)
    : [];
  const anchorSummary = anchorNode
    ? await buildNodeSummary(plugin, anchorNode)
    : null;
  const contextText = buildCanvasContextText(file, document, anchorSummary, selectedNodeIds, selectedNodes, neighboringNodes);

  return {
    view,
    file,
    document,
    anchorNode: anchorSummary,
    selectedNodeIds,
    selectedNodes,
    neighboringNodes,
    contextText,
  };
}

export async function buildCanvasDocumentSource(
  plugin: EditingToolbarPlugin,
  context: ActiveCanvasContext,
  options: BuildCanvasDocumentSourceOptions = {},
): Promise<CanvasDocumentSource> {
  const regularNodes = context.document.nodes.filter((node) => node.type !== "group");
  const selectedIds = context.selectedNodeIds.filter((nodeId) =>
    regularNodes.some((node) => node.id === nodeId),
  );
  const scopeMode = options.scopeMode ?? "auto";
  const useSelection = scopeMode === "selection"
    ? selectedIds.length > 0
    : scopeMode === "board"
      ? false
      : selectedIds.length > 0;
  const includedIds = useSelection ? selectedIds : regularNodes.map((node) => node.id);
  const orderedNodeIds = orderCanvasNodeIds(context.document, includedIds);
  const orderedNodes = orderedNodeIds
    .map((nodeId) => context.document.nodes.find((node) => node.id === nodeId))
    .filter((node): node is CanvasNodeRecord => !!node);

  const limitedNodes = orderedNodes.slice(0, 48);
  const includedSet = new Set(limitedNodes.map((node) => node.id));
  const sections: string[] = [];

  for (const [index, node] of limitedNodes.entries()) {
    const summary = await buildNodeSummary(plugin, node);
    const outgoingEdges = context.document.edges
      .filter((edge) => edge.fromNode === node.id && includedSet.has(edge.toNode))
      .map((edge) => `- ${edge.toNode}${edge.label ? ` [${edge.label}]` : ""}`)
      .slice(0, 8);
    const incomingEdges = context.document.edges
      .filter((edge) => edge.toNode === node.id && includedSet.has(edge.fromNode))
      .map((edge) => `- ${edge.fromNode}${edge.label ? ` [${edge.label}]` : ""}`)
      .slice(0, 8);

    sections.push([
      `node_index: ${index + 1}`,
      formatNodeSummary(summary),
      `incoming_links:\n${incomingEdges.join("\n") || "(none)"}`,
      `outgoing_links:\n${outgoingEdges.join("\n") || "(none)"}`,
    ].join("\n"));
  }

  const truncatedCount = orderedNodes.length - limitedNodes.length;
  const textParts = [
    `document_scope: ${useSelection ? "selected-nodes" : "whole-canvas"}`,
    `document_node_count: ${orderedNodes.length}`,
    "ordered_canvas_nodes:",
    sections.join("\n\n"),
  ];

  if (truncatedCount > 0) {
    textParts.push(`truncated_nodes: ${truncatedCount}`);
  }

  return {
    scope: useSelection ? "selection" : "board",
    nodeCount: orderedNodes.length,
    text: textParts.join("\n\n"),
  };
}

export function buildDeterministicCanvasReorganizationPlan(
  context: ActiveCanvasContext,
  instruction?: string,
): CanvasInstructionPlan {
  const regularNodes = context.document.nodes.filter((node) => node.type !== "group");
  const scopeNodeIds = resolveCanvasScopeNodeIds(context, regularNodes);

  if (scopeNodeIds.length === 0) {
    return {
      addNodes: [],
      addEdges: [],
      layoutNodes: [],
      replaceExistingEdges: false,
    };
  }

  const nodeMap = new Map(
    regularNodes
      .filter((node) => scopeNodeIds.includes(node.id))
      .map((node) => [node.id, node]),
  );
  const scopeNodeIdSet = new Set(scopeNodeIds);
  const scopeEdges = context.document.edges.filter((edge) =>
    scopeNodeIdSet.has(edge.fromNode) && scopeNodeIdSet.has(edge.toNode) && edge.fromNode !== edge.toNode,
  );
  const layoutStyle = resolveCanvasLayoutStyle(instruction || context.contextText, scopeNodeIds, scopeEdges);
  const outgoingMap = new Map<string, string[]>();
  const incomingMap = new Map<string, string[]>();

  scopeNodeIds.forEach((nodeId) => {
    outgoingMap.set(nodeId, []);
    incomingMap.set(nodeId, []);
  });

  scopeEdges.forEach((edge) => {
    const outgoing = outgoingMap.get(edge.fromNode);
    if (outgoing && !outgoing.includes(edge.toNode)) {
      outgoing.push(edge.toNode);
    }

    const incoming = incomingMap.get(edge.toNode);
    if (incoming && !incoming.includes(edge.fromNode)) {
      incoming.push(edge.fromNode);
    }
  });

  outgoingMap.forEach((targets, nodeId) => {
    outgoingMap.set(
      nodeId,
      targets.sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId))),
    );
  });

  incomingMap.forEach((sources, nodeId) => {
    incomingMap.set(
      nodeId,
      sources.sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId))),
    );
  });

  const components = buildCanvasScopeComponents(scopeNodeIds, scopeEdges, nodeMap);
  const layoutNodes: CanvasInstructionLayoutDraft[] = [];
  let rowOffset = 0;

  components.forEach((componentNodeIds, componentIndex) => {
    const componentLayoutNodes = buildDeterministicComponentLayout(
      componentNodeIds,
      nodeMap,
      outgoingMap,
      incomingMap,
      layoutStyle,
      context.anchorNode?.id ?? null,
    );
    const componentMaxRow = componentLayoutNodes.reduce((maxRow, layoutNode) => Math.max(maxRow, layoutNode.row), 0);

    componentLayoutNodes.forEach((layoutNode) => {
      layoutNodes.push({
        ...layoutNode,
        row: layoutNode.row + rowOffset,
      });
    });

    if (componentIndex < components.length - 1) {
      rowOffset += componentMaxRow + DETERMINISTIC_LAYOUT_COMPONENT_GAP + 1;
    }
  });

  return {
    addNodes: [],
    addEdges: [],
    layoutNodes: sortCanvasLayoutNodes(layoutNodes),
    replaceExistingEdges: false,
  };
}

export function mergeCanvasReorganizationPlans(
  reviewedPlan: CanvasInstructionPlan,
  fallbackPlan: CanvasInstructionPlan,
): CanvasInstructionPlan {
  const layoutByNodeId = new Map<string, CanvasInstructionLayoutDraft>();
  fallbackPlan.layoutNodes.forEach((layoutNode) => {
    layoutByNodeId.set(layoutNode.nodeId, layoutNode);
  });
  reviewedPlan.layoutNodes.forEach((layoutNode) => {
    layoutByNodeId.set(layoutNode.nodeId, layoutNode);
  });

  return {
    addNodes: [],
    addEdges: reviewedPlan.addEdges,
    layoutNodes: sortCanvasLayoutNodes([...layoutByNodeId.values()]),
    replaceExistingEdges: reviewedPlan.addEdges.length > 0 && reviewedPlan.replaceExistingEdges,
  };
}

export function parseCanvasExpansionResponse(content: string): CanvasExpansionDraftNode[] {
  const stripped = stripCodeFence(content);
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(t("Canvas AI returned invalid JSON."));
  }

  const rawNodes: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.nodes)
      ? ((parsed as Record<string, unknown>).nodes as unknown[])
      : Array.isArray((parsed as Record<string, unknown>)?.items)
        ? ((parsed as Record<string, unknown>).items as unknown[])
        : Array.isArray((parsed as Record<string, unknown>)?.children)
          ? ((parsed as Record<string, unknown>).children as unknown[])
          : [];

  const normalizedNodes = rawNodes
    .map((item) => normalizeDraftNode(item))
    .filter((item): item is CanvasExpansionDraftNode => item !== null)
    .slice(0, 6);

  if (normalizedNodes.length === 0) {
    throw new Error(t("Canvas AI did not return any usable nodes."));
  }

  return normalizedNodes;
}

export function parseCanvasInstructionResponse(content: string): CanvasInstructionPlan {
  const stripped = stripCodeFence(content);
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(t("Canvas AI returned invalid JSON."));
  }

  const directItems = Array.isArray(parsed) ? parsed : null;
  const addNodes = directItems
    ? directItems.map((item) => normalizeInstructionNode(item)).filter((item): item is CanvasInstructionDraftNode => item !== null).slice(0, 8)
    : resolveInstructionNodeList(parsed)
      .map((item) => normalizeInstructionNode(item))
      .filter((item): item is CanvasInstructionDraftNode => item !== null)
      .slice(0, 8);

  const directLayoutNodes = directItems && addNodes.length === 0
    ? directItems
      .map((item) => normalizeInstructionLayout(item))
      .filter((item): item is CanvasInstructionLayoutDraft => item !== null)
      .slice(0, 48)
    : [];
  const layoutNodes = directLayoutNodes.length > 0
    ? directLayoutNodes
    : resolveInstructionLayoutList(parsed)
      .map((item) => normalizeInstructionLayout(item))
      .filter((item): item is CanvasInstructionLayoutDraft => item !== null)
      .slice(0, 48);

  const directEdges = directItems && addNodes.length === 0 && directLayoutNodes.length === 0
    ? directItems
      .map((item) => normalizeInstructionEdge(item))
      .filter((item): item is CanvasInstructionEdgeDraft => item !== null)
      .slice(0, 12)
    : [];
  const addEdges = directEdges.length > 0
    ? directEdges
    : resolveInstructionEdgeList(parsed)
      .map((item) => normalizeInstructionEdge(item))
      .filter((item): item is CanvasInstructionEdgeDraft => item !== null)
      .slice(0, 12);
  const replaceExistingEdges = resolveInstructionReplaceEdges(parsed);

  if (addNodes.length === 0 && addEdges.length === 0 && layoutNodes.length === 0) {
    throw new Error(t("Canvas AI did not return any usable actions."));
  }

  return {
    addNodes,
    addEdges,
    layoutNodes,
    replaceExistingEdges,
  };
}

export function parseCanvasKnowledgeMapResponse(
  content: string,
  options: { existingNodeIds?: string[] } = {},
): CanvasKnowledgeMapBlueprint {
  const stripped = stripCodeFence(content);
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(t("Canvas AI returned invalid JSON."));
  }

  const record = parsed && typeof parsed === "object"
    ? parsed as Record<string, unknown>
    : null;
  const rawNodes = record && Array.isArray(record.nodes) ? record.nodes : [];
  const usedBlueprintIds = new Set<string>();
  const nodes = rawNodes
    .map((item, index) => normalizeKnowledgeMapNode(item, index, usedBlueprintIds))
    .filter((item): item is CanvasKnowledgeMapNodeDraft => item !== null)
    .slice(0, 24);

  if (nodes.length === 0) {
    throw new Error(t("Canvas AI did not return any usable nodes."));
  }

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const existingNodeIdSet = new Set(options.existingNodeIds ?? []);
  const edges = (record && Array.isArray(record.edges) ? record.edges : [])
    .map((item) => normalizeKnowledgeMapEdge(item, nodeIdSet))
    .filter((item): item is CanvasKnowledgeMapEdgeDraft => item !== null)
    .slice(0, 48);
  const boardConnections = (record && Array.isArray(record.boardConnections) ? record.boardConnections : [])
    .map((item) => normalizeKnowledgeMapBoardConnection(item, nodeIdSet, existingNodeIdSet))
    .filter((item): item is CanvasKnowledgeMapBoardConnectionDraft => item !== null)
    .slice(0, 12);

  return {
    nodes,
    edges,
    boardConnections,
  };
}

export async function applyCanvasExpansionDraft(
  plugin: EditingToolbarPlugin,
  context: ActiveCanvasContext,
  draftNodes: CanvasExpansionDraftNode[],
): Promise<ApplyCanvasExpansionResult> {
  if (!context.anchorNode) {
    throw new Error(t("Please select a canvas node first."));
  }

  const document: CanvasDocumentRecord = {
    nodes: context.document.nodes.map((node) => ({ ...node })),
    edges: context.document.edges.map((edge) => ({ ...edge })),
  };
  const usedIds = new Set<string>([
    ...document.nodes.map((node) => node.id),
    ...document.edges.map((edge) => edge.id),
  ]);
  const anchorNode = document.nodes.find((node) => node.id === context.anchorNode.id);

  if (!anchorNode) {
    throw new Error(t("The focused canvas node no longer exists."));
  }

  const positionedNodes = layoutDraftNodes(document, anchorNode, draftNodes, usedIds);
  document.nodes.push(...positionedNodes);

  const newEdges = positionedNodes.map((node, index) => ({
    id: generateHexId(usedIds),
    fromNode: anchorNode.id,
    toNode: node.id,
    fromSide: "right",
    toSide: "left",
    toEnd: "arrow",
    label: draftNodes[index]?.relation?.trim() || undefined,
  }));
  document.edges.push(...newEdges);

  const serialized = `${JSON.stringify(document, null, 2)}\n`;

  try {
    context.view.setViewData(serialized, false);
    await context.view.save(false);
  } catch {
    await plugin.app.vault.modify(context.file, serialized);
  }

  return {
    addedNodeCount: positionedNodes.length,
    addedEdgeCount: newEdges.length,
    movedNodeCount: 0,
  };
}

export async function applyCanvasInstructionPlan(
  plugin: EditingToolbarPlugin,
  context: ActiveCanvasContext,
  plan: CanvasInstructionPlan,
): Promise<ApplyCanvasExpansionResult> {
  const document: CanvasDocumentRecord = {
    nodes: context.document.nodes.map((node) => ({ ...node })),
    edges: context.document.edges.map((edge) => ({ ...edge })),
  };
  const usedIds = new Set<string>([
    ...document.nodes.map((node) => node.id),
    ...document.edges.map((edge) => edge.id),
  ]);
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const anchorNode = context.anchorNode
    ? document.nodes.find((node) => node.id === context.anchorNode?.id) ?? null
    : null;
  const boardPlacementAnchor = createBoardPlacementAnchor(document);
  const selectedScopeNodeIds = context.selectedNodeIds.filter((nodeId) => {
    const node = nodeMap.get(nodeId);
    return !!node && node.type !== "group";
  });
  const scopeNodeIds = new Set(
    (selectedScopeNodeIds.length > 0
      ? selectedScopeNodeIds
      : document.nodes.filter((node) => node.type !== "group").map((node) => node.id)),
  );

  const addedNodes: CanvasNodeRecord[] = [];
  const addedEdges: CanvasEdgeRecord[] = [];
  const groupedDrafts = new Map<string, CanvasInstructionDraftNode[]>();
  const floatingGroupKey = "__canvas_board_scope__";
  const movedNodeCount = applyInstructionLayout(document, plan.layoutNodes);

  if (plan.replaceExistingEdges && scopeNodeIds.size > 1) {
    document.edges = document.edges.filter((edge) =>
      !scopeNodeIds.has(edge.fromNode) || !scopeNodeIds.has(edge.toNode),
    );
  }

  plan.addNodes.forEach((draft) => {
    const targetId = resolveInstructionTargetId(draft.connectTo, anchorNode?.id ?? null, nodeMap);
    const groupKey = targetId || floatingGroupKey;
    const group = groupedDrafts.get(groupKey) ?? [];
    group.push(draft);
    groupedDrafts.set(groupKey, group);
  });

  groupedDrafts.forEach((drafts, targetId) => {
    const isFloatingGroup = targetId === floatingGroupKey;
    const targetNode = isFloatingGroup
      ? boardPlacementAnchor
      : nodeMap.get(targetId) ?? anchorNode ?? boardPlacementAnchor;
    const positionedNodes = layoutDraftNodes(document, targetNode, drafts, usedIds);
    positionedNodes.forEach((node, index) => {
      addedNodes.push(node);
      document.nodes.push(node);
      nodeMap.set(node.id, node);

      if (isFloatingGroup) {
        return;
      }

      const relation = drafts[index]?.relation?.trim();
      const edge: CanvasEdgeRecord = {
        id: generateHexId(usedIds),
        fromNode: targetNode.id,
        toNode: node.id,
        toEnd: "arrow",
        label: relation || undefined,
      };
      applyCanvasEdgeAnchors(edge, nodeMap);
      addedEdges.push(edge);
      document.edges.push(edge);
    });
  });

  plan.addEdges.forEach((draft) => {
    const fromNodeId = resolveInstructionTargetId(draft.fromNode, anchorNode?.id ?? null, nodeMap);
    const toNodeId = resolveInstructionTargetId(draft.toNode, anchorNode?.id ?? null, nodeMap);

    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return;
    }

    if (edgeExists(document.edges, fromNodeId, toNodeId, draft.label)) {
      return;
    }

    const edge: CanvasEdgeRecord = {
      id: generateHexId(usedIds),
      fromNode: fromNodeId,
      toNode: toNodeId,
      toEnd: "arrow",
      label: draft.label?.trim() || undefined,
    };
    applyCanvasEdgeAnchors(edge, nodeMap);
    addedEdges.push(edge);
    document.edges.push(edge);
  });

  normalizeCanvasEdgeAnchors(document, new Set([
    ...scopeNodeIds,
    ...addedNodes.map((node) => node.id),
  ]));

  const serialized = `${JSON.stringify(document, null, 2)}\n`;

  try {
    context.view.setViewData(serialized, false);
    await context.view.save(false);
  } catch {
    await plugin.app.vault.modify(context.file, serialized);
  }

  return {
    addedNodeCount: addedNodes.length,
    addedEdgeCount: addedEdges.length,
    movedNodeCount,
  };
}

export async function applyCanvasKnowledgeMapBlueprint(
  plugin: EditingToolbarPlugin,
  context: ActiveCanvasContext,
  blueprint: CanvasKnowledgeMapBlueprint,
): Promise<ApplyCanvasExpansionResult> {
  const document: CanvasDocumentRecord = {
    nodes: context.document.nodes.map((node) => ({ ...node })),
    edges: context.document.edges.map((edge) => ({ ...edge })),
  };
  const usedIds = new Set<string>([
    ...document.nodes.map((node) => node.id),
    ...document.edges.map((edge) => edge.id),
  ]);
  const boardPlacementAnchor = createBoardPlacementAnchor(document);
  const regularNodes = document.nodes.filter((node) => node.type !== "group");
  const existingNodeMap = new Map(regularNodes.map((node) => [node.id, node]));
  const rootBlueprintId = resolveKnowledgeMapRootId(blueprint.nodes, blueprint.edges);
  const parentByNodeId = buildKnowledgeMapParentLookup(blueprint.nodes, blueprint.edges, rootBlueprintId);
  const childrenByNodeId = buildKnowledgeMapChildrenLookup(blueprint.nodes, parentByNodeId);
  const canvasNodeByBlueprintId = new Map<string, CanvasNodeRecord>();
  const addedNodeIds = new Set<string>();

  blueprint.nodes.forEach((node) => {
    const text = buildDraftNodeMarkdown({
      title: node.title,
      body: node.content,
      color: resolveKnowledgeMapNodeColor(node),
    });
    const size = estimateKnowledgeMapNodeSize(text);
    const canvasNode: CanvasNodeRecord = {
      id: generateHexId(usedIds),
      type: "text",
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      text,
      color: resolveKnowledgeMapNodeColor(node),
    };
    canvasNodeByBlueprintId.set(node.id, canvasNode);
    addedNodeIds.add(canvasNode.id);
  });

  const rootCanvasNode = canvasNodeByBlueprintId.get(rootBlueprintId);
  if (!rootCanvasNode) {
    throw new Error(t("Canvas AI did not return any usable nodes."));
  }

  const internalBlueprintEdges = buildKnowledgeMapPrimaryEdges(
    blueprint.nodes,
    blueprint.edges,
    parentByNodeId,
  );
  const layoutNodes = buildKnowledgeMapTreeLayout(
    rootBlueprintId,
    blueprint.nodes,
    parentByNodeId,
    childrenByNodeId,
  );
  const translatedLayoutNodes = layoutNodes
    .map((layoutNode) => {
      const canvasNode = canvasNodeByBlueprintId.get(layoutNode.nodeId);
      if (!canvasNode) {
        return null;
      }

      return {
        ...layoutNode,
        nodeId: canvasNode.id,
      };
    })
    .filter((layoutNode): layoutNode is CanvasInstructionLayoutDraft => layoutNode !== null);
  const generatedNodesDocument: CanvasDocumentRecord = {
    nodes: [...canvasNodeByBlueprintId.values()],
    edges: [],
  };
  applyInstructionLayout(generatedNodesDocument, translatedLayoutNodes, {
    columnGap: KNOWLEDGE_MAP_LAYOUT_COLUMN_GAP,
    rowGap: KNOWLEDGE_MAP_LAYOUT_ROW_GAP,
    baseX: 0,
    baseY: 0,
  });

  const placementAnchor = resolveKnowledgeMapPlacementAnchor(blueprint.boardConnections, existingNodeMap, boardPlacementAnchor);
  const anchorCenter = getCanvasNodeCenter(placementAnchor);
  const anchorIsExistingNode = placementAnchor.id !== "__canvas_board__";
  const hasExistingNodes = regularNodes.length > 0;
  const rootCenterX = anchorIsExistingNode
    ? Math.round(placementAnchor.x + placementAnchor.width + KNOWLEDGE_MAP_BRANCH_GAP_X + rootCanvasNode.width / 2)
    : hasExistingNodes
      ? Math.round(boardPlacementAnchor.x + KNOWLEDGE_MAP_ROOT_OFFSET_X)
      : Math.round(KNOWLEDGE_MAP_EMPTY_BOARD_START_X + rootCanvasNode.width / 2);
  const rootCenterY = anchorIsExistingNode
    ? Math.round(anchorCenter.y)
    : hasExistingNodes
      ? Math.round(boardPlacementAnchor.y)
      : Math.round(KNOWLEDGE_MAP_EMPTY_BOARD_START_Y + rootCanvasNode.height / 2);
  const generatedRootCenter = getCanvasNodeCenter(rootCanvasNode);
  const shiftX = rootCenterX - generatedRootCenter.x;
  const shiftY = rootCenterY - generatedRootCenter.y;
  canvasNodeByBlueprintId.forEach((node) => {
    node.x = Math.round(node.x + shiftX);
    node.y = Math.round(node.y + shiftY);
  });
  shiftKnowledgeMapClusterAwayFromExisting(canvasNodeByBlueprintId, regularNodes);

  const generatedGroupNodes = buildKnowledgeMapGroupNodes(
    blueprint.nodes,
    rootBlueprintId,
    childrenByNodeId,
    canvasNodeByBlueprintId,
    usedIds,
  );

  generatedGroupNodes.forEach((node) => {
    document.nodes.push(node);
  });
  canvasNodeByBlueprintId.forEach((node) => {
    document.nodes.push(node);
  });

  const addedEdges: CanvasEdgeRecord[] = [];
  internalBlueprintEdges.forEach((edgeDraft) => {
    const fromNode = canvasNodeByBlueprintId.get(edgeDraft.from);
    const toNode = canvasNodeByBlueprintId.get(edgeDraft.to);
    if (!fromNode || !toNode || fromNode.id === toNode.id) {
      return;
    }

    if (edgeExists(document.edges, fromNode.id, toNode.id, edgeDraft.relation)) {
      return;
    }

    const edge: CanvasEdgeRecord = {
      id: generateHexId(usedIds),
      fromNode: fromNode.id,
      toNode: toNode.id,
      toEnd: "arrow",
      label: edgeDraft.relation?.trim() || undefined,
    };
    addedEdges.push(edge);
    document.edges.push(edge);
  });

  blueprint.boardConnections.forEach((connectionDraft) => {
    const fromNode = canvasNodeByBlueprintId.get(connectionDraft.nodeId);
    const toNode = existingNodeMap.get(connectionDraft.existingNodeId);
    if (!fromNode || !toNode || fromNode.id === toNode.id) {
      return;
    }

    const relationLabel = normalizeKnowledgeMapRelationLabel(connectionDraft.relation);

    if (edgeExists(document.edges, fromNode.id, toNode.id, relationLabel)
      || edgeExists(document.edges, toNode.id, fromNode.id, relationLabel)) {
      return;
    }

    const edge: CanvasEdgeRecord = {
      id: generateHexId(usedIds),
      fromNode: toNode.id,
      toNode: fromNode.id,
      toEnd: "arrow",
      label: relationLabel,
    };
    addedEdges.push(edge);
    document.edges.push(edge);
  });

  normalizeCanvasEdgeAnchors(document, addedNodeIds);

  const serialized = `${JSON.stringify(document, null, 2)}\n`;

  try {
    context.view.setViewData(serialized, false);
    await context.view.save(false);
  } catch {
    await plugin.app.vault.modify(context.file, serialized);
  }

  return {
    addedNodeCount: canvasNodeByBlueprintId.size + generatedGroupNodes.length,
    addedEdgeCount: addedEdges.length,
    movedNodeCount: 0,
  };
}

function isCanvasTextFileView(view: View | null | undefined): view is TextFileView {
  return !!view &&
    view.getViewType?.() === "canvas" &&
    typeof (view as TextFileView).getViewData === "function" &&
    typeof (view as TextFileView).setViewData === "function";
}

function parseCanvasDocument(raw: string): CanvasDocumentRecord {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(t("Failed to read the current canvas data."));
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(t("Failed to read the current canvas data."));
  }

  const data = parsed as Record<string, unknown>;
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes.map((node) => normalizeCanvasNode(node)).filter((node): node is CanvasNodeRecord => node !== null) : [],
    edges: Array.isArray(data.edges) ? data.edges.map((edge) => normalizeCanvasEdge(edge)).filter((edge): edge is CanvasEdgeRecord => edge !== null) : [],
  };
}

function normalizeCanvasNode(input: unknown): CanvasNodeRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const type = normalizeNodeType(raw.type);

  if (!id || !type) {
    return null;
  }

  return {
    id,
    type,
    x: toNumber(raw.x, 0),
    y: toNumber(raw.y, 0),
    width: toNumber(raw.width, 320),
    height: toNumber(raw.height, 180),
    text: typeof raw.text === "string" ? raw.text : undefined,
    file: typeof raw.file === "string" ? raw.file : undefined,
    url: typeof raw.url === "string" ? raw.url : undefined,
    label: typeof raw.label === "string" ? raw.label : undefined,
    color: typeof raw.color === "string" ? raw.color : undefined,
    background: typeof raw.background === "string" ? raw.background : undefined,
    backgroundStyle: typeof raw.backgroundStyle === "string" ? raw.backgroundStyle : undefined,
  };
}

function normalizeCanvasEdge(input: unknown): CanvasEdgeRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const fromNode = typeof raw.fromNode === "string" ? raw.fromNode.trim() : "";
  const toNode = typeof raw.toNode === "string" ? raw.toNode.trim() : "";

  if (!id || !fromNode || !toNode) {
    return null;
  }

  return {
    id,
    fromNode,
    toNode,
    fromSide: typeof raw.fromSide === "string" ? raw.fromSide : undefined,
    toSide: typeof raw.toSide === "string" ? raw.toSide : undefined,
    fromEnd: typeof raw.fromEnd === "string" ? raw.fromEnd : undefined,
    toEnd: typeof raw.toEnd === "string" ? raw.toEnd : undefined,
    color: typeof raw.color === "string" ? raw.color : undefined,
    label: typeof raw.label === "string" ? raw.label : undefined,
  };
}

function normalizeNodeType(value: unknown): CanvasNodeType | null {
  if (value === "text" || value === "file" || value === "link" || value === "group") {
    return value;
  }

  return null;
}

function resolveSelectedNodeIds(view: TextFileView, document: CanvasDocumentRecord): string[] {
  const allowedIds = new Set(document.nodes.map((node) => node.id));
  const results = new Set<string>();
  const runtimeView = view as unknown as Record<string, unknown>;
  const canvas = asRecord(runtimeView.canvas);

  collectIdsFromUnknown(canvas?.selection, results, allowedIds);
  collectIdsFromUnknown(asRecord(canvas?.selection)?.nodes, results, allowedIds);
  collectIdsFromUnknown(asRecord(canvas?.selection)?.items, results, allowedIds);
  collectIdsFromUnknown(asRecord(runtimeView.selection)?.nodes, results, allowedIds);
  collectIdsFromUnknown(canvas?.selectedNodes, results, allowedIds);
  collectIdsFromUnknown(runtimeView.selectedNodes, results, allowedIds);

  const runtimeNodeCollections = [
    canvas?.nodes,
    canvas?.nodeMap,
    runtimeView.nodes,
    runtimeView.nodeMap,
  ];

  runtimeNodeCollections.forEach((collection) => {
    iterateCollection(collection, (item) => {
      const record = asRecord(item);
      const nodeId = extractNodeIdFromUnknown(record, allowedIds);
      if (!nodeId) {
        return;
      }

      const flags = [
        record.selected,
        record.isSelected,
        asRecord(record.nodeEl)?.classList,
        asRecord(record.el)?.classList,
      ];

      if (flags.some((flag) => flag === true)) {
        results.add(nodeId);
      }
    });
  });

  resolveSelectedNodeIdsFromDom(view, allowedIds).forEach((id) => results.add(id));
  return [...results];
}

function resolveSelectedNodeIdsFromDom(view: TextFileView, allowedIds: Set<string>): string[] {
  const container = (view as unknown as { containerEl?: HTMLElement }).containerEl;
  if (!container) {
    return [];
  }

  const selectors = [
    ".canvas-node.is-selected",
    ".canvas-node.mod-selected",
    ".canvas-node.is-focused",
    ".canvas-node.mod-focused",
  ];
  const nodes = new Set<string>();

  container.querySelectorAll<HTMLElement>(selectors.join(",")).forEach((element) => {
    let current: HTMLElement | null = element;

    while (current) {
      const candidateId = extractNodeIdFromElement(current, allowedIds);
      if (candidateId) {
        nodes.add(candidateId);
        break;
      }
      current = current.parentElement;
    }
  });

  return [...nodes];
}

function resolveAnchorNode(nodeMap: Map<string, CanvasNodeRecord>, selectedNodeIds: string[]): CanvasNodeRecord | null {
  for (const nodeId of selectedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node && node.type !== "group") {
      return node;
    }
  }

  const regularNodes = [...nodeMap.values()].filter((node) => node.type !== "group");
  if (regularNodes.length === 1) {
    return regularNodes[0];
  }

  return null;
}

async function buildNeighboringNodeSummaries(
  plugin: EditingToolbarPlugin,
  document: CanvasDocumentRecord,
  anchorNodeId: string,
): Promise<CanvasNodeSummary[]> {
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const neighborIds = new Set<string>();

  for (const edge of document.edges) {
    if (edge.fromNode === anchorNodeId) {
      neighborIds.add(edge.toNode);
    } else if (edge.toNode === anchorNodeId) {
      neighborIds.add(edge.fromNode);
    }
  }

  const neighbors = [...neighborIds]
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is CanvasNodeRecord => !!node && node.type !== "group")
    .slice(0, 10);

  const summaries: CanvasNodeSummary[] = [];
  for (const node of neighbors) {
    summaries.push(await buildNodeSummary(plugin, node));
  }

  return summaries;
}

async function buildSelectedNodeSummaries(
  plugin: EditingToolbarPlugin,
  document: CanvasDocumentRecord,
  selectedNodeIds: string[],
  anchorNodeId: string | null,
): Promise<CanvasNodeSummary[]> {
  if (selectedNodeIds.length === 0) {
    return [];
  }

  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const orderedIds = anchorNodeId
    ? [anchorNodeId, ...selectedNodeIds.filter((id) => id !== anchorNodeId)]
    : selectedNodeIds;

  const summaries: CanvasNodeSummary[] = [];
  for (const nodeId of orderedIds) {
    const node = nodeMap.get(nodeId);
    if (!node || node.type === "group") {
      continue;
    }

    summaries.push(await buildNodeSummary(plugin, node));
    if (summaries.length >= 6) {
      break;
    }
  }

  return summaries;
}

async function buildNodeSummary(plugin: EditingToolbarPlugin, node: CanvasNodeRecord): Promise<CanvasNodeSummary> {
  return {
    id: node.id,
    type: node.type,
    text: await readNodeText(plugin, node),
    node,
  };
}

async function readNodeText(plugin: EditingToolbarPlugin, node: CanvasNodeRecord): Promise<string> {
  if (node.type === "text") {
    return compactCanvasText(node.text || "");
  }

  if (node.type === "file") {
    const filePath = node.file?.trim() || "";
    const abstractFile = filePath ? plugin.app.vault.getAbstractFileByPath(filePath) : null;

    if (abstractFile instanceof TFile) {
      try {
        const content = await plugin.app.vault.cachedRead(abstractFile);
        const compacted = compactCanvasText(content);
        return compacted ? `[file] ${abstractFile.path}\n${compacted}` : `[file] ${abstractFile.path}`;
      } catch {
        return `[file] ${filePath}`;
      }
    }

    return `[file] ${filePath || "(missing file path)"}`;
  }

  if (node.type === "link") {
    const parts = [node.label?.trim(), node.url?.trim()].filter(Boolean);
    return parts.join("\n");
  }

  return (node.label || "").trim();
}

function compactCanvasText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  return compactContent(trimmed, {
    previewCharsPerSection: 600,
    maxSections: 6,
    verbatimThreshold: 2400,
  });
}

function buildCanvasContextText(
  file: TFile,
  document: CanvasDocumentRecord,
  anchorNode: CanvasNodeSummary | null,
  selectedNodeIds: string[],
  selectedNodes: CanvasNodeSummary[],
  neighboringNodes: CanvasNodeSummary[],
): string {
  const regularNodes = document.nodes.filter((node) => node.type !== "group");
  const otherNodes = regularNodes
    .filter((node) => !anchorNode || (node.id !== anchorNode.id && !neighboringNodes.some((neighbor) => neighbor.id === node.id)))
    .slice(0, 10)
    .map((node) => formatNodeSummary({
      id: node.id,
      type: node.type,
      text: compactCanvasText(node.text || node.label || node.file || node.url || ""),
      node,
    }));

  const neighborSummary = neighboringNodes.length > 0
    ? neighboringNodes.map((node, index) => `${index + 1}. ${formatNodeSummary(node)}`).join("\n")
    : "(none)";
  const selectedNodesSummary = selectedNodes.length > 0
    ? selectedNodes.map((node, index) => `${index + 1}. ${formatNodeSummary(node)}`).join("\n")
    : "(none)";

  const boardConnections = (anchorNode
    ? document.edges.filter((edge) => edge.fromNode === anchorNode.id || edge.toNode === anchorNode.id).slice(0, 12)
    : document.edges.slice(0, 16))
    .map((edge) => formatEdgeSummary(edge, anchorNode?.id))
    .join("\n") || "(none)";

  return [
    `canvas_file: ${file.path}`,
    `focus_mode: ${anchorNode ? "selected-node" : "board-wide"}`,
    `selected_node_ids: ${selectedNodeIds.join(", ") || "(none)"}`,
    `board_node_count: ${regularNodes.length}`,
    "selected_nodes:",
    selectedNodesSummary,
    "anchor_node:",
    anchorNode ? formatNodeSummary(anchorNode) : "(none selected)",
    anchorNode ? "anchor_connections:" : "sample_board_connections:",
    boardConnections,
    "neighboring_nodes:",
    anchorNode ? neighborSummary : "(none)",
    anchorNode ? "other_board_nodes:" : "board_nodes:",
    otherNodes.length > 0 ? otherNodes.join("\n") : "(none)",
  ].join("\n\n");
}

function orderCanvasNodeIds(
  document: CanvasDocumentRecord,
  nodeIds: string[],
): string[] {
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const includedSet = new Set(nodeIds);
  const outgoingMap = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  nodeIds.forEach((nodeId) => {
    outgoingMap.set(nodeId, []);
    incomingCount.set(nodeId, 0);
  });

  document.edges.forEach((edge) => {
    if (!includedSet.has(edge.fromNode) || !includedSet.has(edge.toNode)) {
      return;
    }

    outgoingMap.get(edge.fromNode)?.push(edge.toNode);
    incomingCount.set(edge.toNode, (incomingCount.get(edge.toNode) ?? 0) + 1);
  });

  outgoingMap.forEach((targets, nodeId) => {
    targets.sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));
    outgoingMap.set(nodeId, Array.from(new Set(targets)));
  });

  const orderedRoots = nodeIds
    .filter((nodeId) => (incomingCount.get(nodeId) ?? 0) === 0)
    .sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));
  const fallbackRoots = nodeIds
    .slice()
    .sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));

  const visited = new Set<string>();
  const ordered: string[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    ordered.push(nodeId);
    (outgoingMap.get(nodeId) ?? []).forEach((targetId) => visit(targetId));
  };

  (orderedRoots.length > 0 ? orderedRoots : fallbackRoots).forEach((nodeId) => visit(nodeId));
  fallbackRoots.forEach((nodeId) => visit(nodeId));

  return ordered;
}

function compareCanvasNodes(left?: CanvasNodeRecord, right?: CanvasNodeRecord): number {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  if (left.x !== right.x) {
    return left.x - right.x;
  }

  if (left.y !== right.y) {
    return left.y - right.y;
  }

  return left.id.localeCompare(right.id);
}

function formatEdgeSummary(edge: CanvasEdgeRecord, anchorNodeId?: string): string {
  if (anchorNodeId && (edge.fromNode === anchorNodeId || edge.toNode === anchorNodeId)) {
    const direction = edge.fromNode === anchorNodeId ? "outgoing" : "incoming";
    const targetNodeId = edge.fromNode === anchorNodeId ? edge.toNode : edge.fromNode;
    return `- ${direction} ${targetNodeId}${edge.label ? ` [${edge.label}]` : ""}`;
  }

  return `- ${edge.fromNode} -> ${edge.toNode}${edge.label ? ` [${edge.label}]` : ""}`;
}

function resolveCanvasScopeNodeIds(
  context: ActiveCanvasContext,
  regularNodes: CanvasNodeRecord[],
): string[] {
  const regularNodeIds = new Set(regularNodes.map((node) => node.id));
  const selectedScopeNodeIds = context.selectedNodeIds.filter((nodeId) => regularNodeIds.has(nodeId));

  return selectedScopeNodeIds.length > 0
    ? selectedScopeNodeIds
    : regularNodes.map((node) => node.id);
}

function buildCanvasScopeComponents(
  scopeNodeIds: string[],
  scopeEdges: CanvasEdgeRecord[],
  nodeMap: Map<string, CanvasNodeRecord>,
): string[][] {
  const adjacency = new Map<string, Set<string>>();
  scopeNodeIds.forEach((nodeId) => {
    adjacency.set(nodeId, new Set<string>());
  });

  scopeEdges.forEach((edge) => {
    adjacency.get(edge.fromNode)?.add(edge.toNode);
    adjacency.get(edge.toNode)?.add(edge.fromNode);
  });

  const sortedNodeIds = scopeNodeIds
    .slice()
    .sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));
  const visited = new Set<string>();
  const components: string[][] = [];

  sortedNodeIds.forEach((nodeId) => {
    if (visited.has(nodeId)) {
      return;
    }

    const queue = [nodeId];
    const componentNodeIds: string[] = [];
    visited.add(nodeId);

    while (queue.length > 0) {
      const currentNodeId = queue.shift();
      if (!currentNodeId) {
        continue;
      }

      componentNodeIds.push(currentNodeId);
      adjacency.get(currentNodeId)?.forEach((neighborId) => {
        if (visited.has(neighborId)) {
          return;
        }

        visited.add(neighborId);
        queue.push(neighborId);
      });
    }

    componentNodeIds.sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));
    components.push(componentNodeIds);
  });

  return components.sort((left, right) =>
    compareCanvasNodes(nodeMap.get(left[0]), nodeMap.get(right[0])),
  );
}

function buildDeterministicComponentLayout(
  componentNodeIds: string[],
  nodeMap: Map<string, CanvasNodeRecord>,
  outgoingMap: Map<string, string[]>,
  incomingMap: Map<string, string[]>,
  layoutStyle: CanvasLayoutStyle,
  anchorNodeId?: string | null,
): CanvasInstructionLayoutDraft[] {
  const componentNodeIdSet = new Set(componentNodeIds);
  const orderedNodeIds = componentNodeIds
    .slice()
    .sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));
  const rootCandidates = orderedNodeIds.filter((nodeId) =>
    (incomingMap.get(nodeId) ?? []).every((sourceNodeId) => !componentNodeIdSet.has(sourceNodeId)),
  );
  const rootNodeIds = (rootCandidates.length > 0 ? rootCandidates : orderedNodeIds.slice(0, 1)).slice();

  if (anchorNodeId && componentNodeIdSet.has(anchorNodeId)) {
    const anchorIndex = rootNodeIds.indexOf(anchorNodeId);
    if (anchorIndex >= 0) {
      rootNodeIds.splice(anchorIndex, 1);
      rootNodeIds.unshift(anchorNodeId);
    } else if (rootCandidates.length === 0) {
      rootNodeIds.unshift(anchorNodeId);
    }
  }

  const childrenMap = new Map<string, string[]>();
  componentNodeIds.forEach((nodeId) => {
    childrenMap.set(nodeId, []);
  });

  const depthMap = new Map<string, number>();
  const visited = new Set<string>();
  const orderedRoots: string[] = [];

  const visitNode = (nodeId: string, depth: number) => {
    visited.add(nodeId);
    depthMap.set(nodeId, depth);

    const nextChildren = (outgoingMap.get(nodeId) ?? [])
      .filter((targetNodeId) => componentNodeIdSet.has(targetNodeId) && !visited.has(targetNodeId))
      .sort((leftId, rightId) => compareCanvasNodes(nodeMap.get(leftId), nodeMap.get(rightId)));

    childrenMap.set(nodeId, nextChildren);
    nextChildren.forEach((targetNodeId) => visitNode(targetNodeId, depth + 1));
  };

  rootNodeIds.forEach((rootNodeId) => {
    if (visited.has(rootNodeId)) {
      return;
    }

    orderedRoots.push(rootNodeId);
    visitNode(rootNodeId, 0);
  });

  orderedNodeIds.forEach((nodeId) => {
    if (visited.has(nodeId)) {
      return;
    }

    orderedRoots.push(nodeId);
    visitNode(nodeId, 0);
  });

  const spanCache = new Map<string, number>();
  const computeSpan = (nodeId: string): number => {
    const cached = spanCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    const children = childrenMap.get(nodeId) ?? [];
    if (children.length === 0) {
      spanCache.set(nodeId, DETERMINISTIC_LAYOUT_LEAF_SPAN);
      return DETERMINISTIC_LAYOUT_LEAF_SPAN;
    }

    const childrenSpan = children.reduce((total, childNodeId) => total + computeSpan(childNodeId), 0);
    const totalSpan = Math.max(
      DETERMINISTIC_LAYOUT_LEAF_SPAN,
      childrenSpan + Math.max(0, children.length - 1) * DETERMINISTIC_LAYOUT_SIBLING_GAP,
    );
    spanCache.set(nodeId, totalSpan);
    return totalSpan;
  };

  const layoutNodes: CanvasInstructionLayoutDraft[] = [];
  const assignRows = (nodeId: string, startRow: number) => {
    const span = computeSpan(nodeId);
    const row = startRow + Math.floor((span - 1) / 2);
    const column = depthMap.get(nodeId) ?? 0;

    layoutNodes.push({
      nodeId,
      column,
      row,
    });

    let childRow = startRow;
    (childrenMap.get(nodeId) ?? []).forEach((childNodeId) => {
      assignRows(childNodeId, childRow);
      childRow += computeSpan(childNodeId) + DETERMINISTIC_LAYOUT_SIBLING_GAP;
    });
  };

  let startRow = 0;
  orderedRoots.forEach((rootNodeId, index) => {
    assignRows(rootNodeId, startRow);
    startRow += computeSpan(rootNodeId);
    if (index < orderedRoots.length - 1) {
      startRow += DETERMINISTIC_LAYOUT_ROOT_GAP;
    }
  });

  const sortedLayoutNodes = sortCanvasLayoutNodes(layoutNodes);
  return layoutStyle === "mindmap"
    ? applyMindmapLayoutBalance(sortedLayoutNodes, rootNodeIds[0])
    : sortedLayoutNodes;
}

function sortCanvasLayoutNodes(layoutNodes: CanvasInstructionLayoutDraft[]): CanvasInstructionLayoutDraft[] {
  return layoutNodes
    .slice()
    .sort((left, right) => {
      if (left.column !== right.column) {
        return left.column - right.column;
      }

      if (left.row !== right.row) {
        return left.row - right.row;
      }

      return left.nodeId.localeCompare(right.nodeId);
    });
}

function resolveCanvasLayoutStyle(
  instructionText: string,
  scopeNodeIds: string[],
  scopeEdges: CanvasEdgeRecord[],
): CanvasLayoutStyle {
  const normalizedText = instructionText.toLowerCase();
  if (/(mind\s*map|radial|中心主题|脑图|思维导图|发散)/i.test(normalizedText)) {
    return "mindmap";
  }

  if (/(^|\b)(tree|hierarchy|org\s*chart)(\b|$)|树形|树状|层级|父子|组织结构/i.test(normalizedText)) {
    return "tree";
  }

  if (/(dag|directed\s+acyclic|flow\s*chart|pipeline|dependency|依赖图|流程图|有向无环|拓扑)/i.test(normalizedText)) {
    return "dag";
  }

  const nodeCount = Math.max(scopeNodeIds.length, 1);
  const averageDegree = scopeEdges.length / nodeCount;
  const hasMultiParentNode = scopeNodeIds.some((nodeId) =>
    scopeEdges.filter((edge) => edge.toNode === nodeId).length > 1,
  );

  if (hasMultiParentNode || averageDegree > 1.15) {
    return "dag";
  }

  return "tree";
}

function applyMindmapLayoutBalance(
  layoutNodes: CanvasInstructionLayoutDraft[],
  rootNodeId?: string,
): CanvasInstructionLayoutDraft[] {
  if (!rootNodeId || layoutNodes.length < 4) {
    return layoutNodes;
  }

  const rootLayout = layoutNodes.find((layoutNode) => layoutNode.nodeId === rootNodeId);
  if (!rootLayout) {
    return layoutNodes;
  }

  const branchRoots = layoutNodes
    .filter((layoutNode) => layoutNode.column === rootLayout.column + 1)
    .sort((left, right) => left.row - right.row || left.nodeId.localeCompare(right.nodeId));
  if (branchRoots.length < 3) {
    return layoutNodes;
  }

  const leftBranchIds = new Set(branchRoots
    .filter((_, index) => index % 2 === 1)
    .map((layoutNode) => layoutNode.nodeId));
  if (leftBranchIds.size === 0) {
    return layoutNodes;
  }

  const branchSideByRow = new Map<number, "left" | "right">();
  branchRoots.forEach((branchRoot) => {
    branchSideByRow.set(branchRoot.row, leftBranchIds.has(branchRoot.nodeId) ? "left" : "right");
  });

  return sortCanvasLayoutNodes(layoutNodes.map((layoutNode) => {
    if (layoutNode.nodeId === rootNodeId || layoutNode.column <= rootLayout.column) {
      return layoutNode;
    }

    const nearestBranchRow = [...branchSideByRow.keys()]
      .sort((leftRow, rightRow) => Math.abs(leftRow - layoutNode.row) - Math.abs(rightRow - layoutNode.row))[0];
    const side = branchSideByRow.get(nearestBranchRow) ?? "right";
    if (side === "right") {
      return layoutNode;
    }

    return {
      ...layoutNode,
      column: rootLayout.column - (layoutNode.column - rootLayout.column),
    };
  }));
}

function formatNodeSummary(node: CanvasNodeSummary): string {
  const position = `(${Math.round(node.node.x)}, ${Math.round(node.node.y)})`;
  const size = `${Math.round(node.node.width)}x${Math.round(node.node.height)}`;
  const content = node.text || "(empty)";

  return [
    `id: ${node.id}`,
    `type: ${node.type}`,
    `position: ${position}`,
    `size: ${size}`,
    "content:",
    content,
  ].join("\n");
}

function normalizeDraftNode(input: unknown): CanvasExpansionDraftNode | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const title = pickString(raw.title, raw.name, raw.heading);
  const text = pickString(raw.body, raw.summary, raw.details, raw.text);
  const relation = pickString(raw.relation, raw.edgeLabel, raw.label);
  const color = pickString(raw.color);

  let normalizedTitle = title;
  let normalizedBody = text;

  if (!normalizedTitle && normalizedBody) {
    const lines = normalizedBody.split("\n").map((line) => line.trim()).filter(Boolean);
    normalizedTitle = lines[0] || "";
    normalizedBody = lines.slice(1).join("\n").trim();
  }

  if (!normalizedTitle) {
    return null;
  }

  return {
    title: normalizedTitle.trim(),
    body: normalizedBody?.trim() || undefined,
    relation: relation?.trim() || undefined,
    color: color?.trim() || undefined,
  };
}

function resolveInstructionNodeList(parsed: unknown): unknown[] {
  const record = asRecord(parsed);
  if (!record) {
    return [];
  }

  const candidates = [record.addNodes, record.nodes, record.items, record.children];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as unknown[];
    }
  }

  return [];
}

function resolveInstructionEdgeList(parsed: unknown): unknown[] {
  const record = asRecord(parsed);
  if (!record) {
    return [];
  }

  const candidates = [record.addEdges, record.edges, record.links];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as unknown[];
    }
  }

  return [];
}

function resolveInstructionLayoutList(parsed: unknown): unknown[] {
  const record = asRecord(parsed);
  if (!record) {
    return [];
  }

  const candidates = [record.layoutNodes, record.layout, record.positions];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as unknown[];
    }
  }

  return [];
}

function resolveInstructionReplaceEdges(parsed: unknown): boolean {
  const record = asRecord(parsed);
  if (!record) {
    return false;
  }

  return pickBoolean(
    record.replaceExistingEdges,
    record.replaceEdges,
    record.resetEdges,
  ) ?? false;
}

function normalizeInstructionNode(input: unknown): CanvasInstructionDraftNode | null {
  const baseNode = normalizeDraftNode(input);
  if (!baseNode) {
    return null;
  }

  const raw = asRecord(input);
  const connectTo = pickString(
    raw?.connectTo,
    raw?.targetNode,
    raw?.targetId,
    raw?.attachTo,
    raw?.parentNode,
  );

  return {
    ...baseNode,
    connectTo: connectTo || undefined,
  };
}

function normalizeInstructionEdge(input: unknown): CanvasInstructionEdgeDraft | null {
  const raw = asRecord(input);
  if (!raw) {
    return null;
  }

  const fromNode = pickString(raw.fromNode, raw.from, raw.sourceNode, raw.sourceId);
  const toNode = pickString(raw.toNode, raw.to, raw.targetNode, raw.targetId);
  const label = pickString(raw.label, raw.relation, raw.edgeLabel);

  if (!fromNode || !toNode) {
    return null;
  }

  return {
    fromNode,
    toNode,
    label: label || undefined,
  };
}

function normalizeInstructionLayout(input: unknown): CanvasInstructionLayoutDraft | null {
  const raw = asRecord(input);
  if (!raw) {
    return null;
  }

  const position = asRecord(raw.position) ?? asRecord(raw.layout);
  const nodeId = pickString(
    raw.nodeId,
    raw.id,
    raw.node,
    raw.targetNode,
    raw.targetId,
    asRecord(raw.node)?.id,
  );
  const column = pickInteger(
    raw.column,
    raw.col,
    raw.lane,
    raw.columnIndex,
    raw.xIndex,
    position?.column,
    position?.col,
    position?.lane,
    position?.columnIndex,
    position?.xIndex,
  );
  const row = pickInteger(
    raw.row,
    raw.index,
    raw.order,
    raw.rowIndex,
    raw.yIndex,
    position?.row,
    position?.index,
    position?.order,
    position?.rowIndex,
    position?.yIndex,
  );

  if (!nodeId || column === null || row === null) {
    return null;
  }

  return {
    nodeId,
    column,
    row,
  };
}

function stripCodeFence(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeKnowledgeMapNode(
  input: unknown,
  index: number,
  usedIds: Set<string>,
): CanvasKnowledgeMapNodeDraft | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const fallbackId = `n_${index + 1}`;
  const requestedId = pickString(record.id, record.nodeId, record.key) || fallbackId;
  const nodeId = usedIds.has(requestedId) ? fallbackId : requestedId;
  if (usedIds.has(nodeId)) {
    return null;
  }
  usedIds.add(nodeId);

  const title = truncateKnowledgeMapText(
    pickString(record.title, record.name, record.label),
    40,
  );
  const content = truncateKnowledgeMapText(
    pickString(record.content, record.summary, record.body, record.text),
    90,
  );
  const level = pickInteger(record.level, record.depth, record.layer) ?? 0;
  const rawType = pickString(record.type, record.kind).toLowerCase();
  const type = rawType === "detail"
    ? "detail"
    : rawType === "concept"
      ? "concept"
      : level <= 1
        ? "concept"
        : "detail";

  if (!title) {
    return null;
  }

  return {
    id: nodeId,
    type,
    title,
    content,
    level,
    group: truncateKnowledgeMapText(
      pickString(record.group, record.category, record.cluster, record.section),
      24,
    ) || undefined,
  };
}

function normalizeKnowledgeMapEdge(
  input: unknown,
  allowedNodeIds: Set<string>,
): CanvasKnowledgeMapEdgeDraft | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const from = pickString(record.from, record.source, record.parent, record.fromNode);
  const to = pickString(record.to, record.target, record.child, record.toNode);
  const relation = truncateKnowledgeMapText(
    pickString(record.relation, record.label, record.type),
    24,
  );

  if (!from || !to || from === to || !allowedNodeIds.has(from) || !allowedNodeIds.has(to)) {
    return null;
  }

  return {
    from,
    to,
    relation: relation || undefined,
  };
}

function normalizeKnowledgeMapBoardConnection(
  input: unknown,
  generatedNodeIds: Set<string>,
  existingNodeIds: Set<string>,
): CanvasKnowledgeMapBoardConnectionDraft | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const nodeId = pickString(record.nodeId, record.from, record.node, record.generatedNodeId);
  const existingNodeId = pickString(record.existingNodeId, record.toExisting, record.targetNodeId, record.existingId);
  const relation = truncateKnowledgeMapText(
    pickString(record.relation, record.label, record.type),
    24,
  );

  if (!nodeId || !existingNodeId || !generatedNodeIds.has(nodeId) || !existingNodeIds.has(existingNodeId)) {
    return null;
  }

  return {
    nodeId,
    existingNodeId,
    relation: relation || undefined,
  };
}

function truncateKnowledgeMapText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(maxLength - 3, 1)).trim()}...`
    : normalized;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function pickInteger(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.round(parsed));
      }
    }
  }

  return null;
}

function pickBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number" && (value === 0 || value === 1)) {
      return value === 1;
    }

    if (typeof value === "string" && value.trim()) {
      const normalizedValue = value.trim().toLowerCase();
      if (["true", "yes", "1"].includes(normalizedValue)) {
        return true;
      }
      if (["false", "no", "0"].includes(normalizedValue)) {
        return false;
      }
    }
  }

  return undefined;
}

function layoutDraftNodes(
  document: CanvasDocumentRecord,
  anchorNode: CanvasNodeRecord,
  draftNodes: CanvasExpansionDraftNode[],
  usedIds: Set<string>,
): CanvasNodeRecord[] {
  const existingRects = document.nodes
    .filter((node) => node.type !== "group")
    .map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height }));

  const preparedNodes = draftNodes.map((draft) => {
    const text = buildDraftNodeMarkdown(draft);
    const size = estimateTextNodeSize(text);

    return {
      id: generateHexId(usedIds),
      type: "text" as const,
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      text,
      color: draft.color,
    };
  });

  let columnX = anchorNode.x + anchorNode.width + 220;
  const totalHeight = preparedNodes.reduce((sum, node) => sum + node.height, 0) + Math.max(0, preparedNodes.length - 1) * 48;
  const startY = Math.round(anchorNode.y + anchorNode.height / 2 - totalHeight / 2);

  preparedNodes.forEach((node, index) => {
    const previousHeight = preparedNodes
      .slice(0, index)
      .reduce((sum, item) => sum + item.height, 0);
    node.x = columnX;
    node.y = Math.round(startY + previousHeight + index * 48);
  });

  while (preparedNodes.some((node) => intersectsExisting(node, existingRects))) {
    columnX += 180;
    preparedNodes.forEach((node) => {
      node.x = columnX;
    });
  }

  return preparedNodes;
}

function applyInstructionLayout(
  document: CanvasDocumentRecord,
  layoutNodes: CanvasInstructionLayoutDraft[],
  options: CanvasLayoutSpacingOptions = {},
): number {
  if (layoutNodes.length === 0) {
    return 0;
  }

  const nodeMap = new Map(
    document.nodes
      .filter((node) => node.type !== "group")
      .map((node) => [node.id, node]),
  );
  const layoutMap = new Map<string, CanvasInstructionLayoutDraft>();
  layoutNodes.forEach((layoutNode) => {
    if (nodeMap.has(layoutNode.nodeId)) {
      layoutMap.set(layoutNode.nodeId, layoutNode);
    }
  });

  const entries = [...layoutMap.values()]
    .map((layoutNode) => ({
      layoutNode,
      node: nodeMap.get(layoutNode.nodeId) ?? null,
    }))
    .filter((entry): entry is { layoutNode: CanvasInstructionLayoutDraft; node: CanvasNodeRecord } => !!entry.node);

  if (entries.length === 0) {
    return 0;
  }

  const columnGap = options.columnGap ?? DETERMINISTIC_LAYOUT_COLUMN_GAP;
  const rowGap = options.rowGap ?? DETERMINISTIC_LAYOUT_ROW_GAP;
  const baseX = options.baseX ?? Math.min(...entries.map((entry) => entry.node.x));
  const baseY = options.baseY ?? Math.min(...entries.map((entry) => entry.node.y));
  const columns = [...new Set(entries.map((entry) => entry.layoutNode.column))].sort((left, right) => left - right);
  const rows = [...new Set(entries.map((entry) => entry.layoutNode.row))].sort((left, right) => left - right);
  const columnOffsets = new Map<number, number>();
  const rowOffsets = new Map<number, number>();
  const columnWidthMap = new Map<number, number>();
  const rowHeightMap = new Map<number, number>();

  columns.forEach((column) => {
    columnWidthMap.set(
      column,
      Math.max(
        ...entries
          .filter((entry) => entry.layoutNode.column === column)
          .map((entry) => entry.node.width),
      ),
    );
  });

  rows.forEach((row) => {
    rowHeightMap.set(
      row,
      Math.max(
        ...entries
          .filter((entry) => entry.layoutNode.row === row)
          .map((entry) => entry.node.height),
      ),
    );
  });

  let currentX = baseX;
  columns.forEach((column, index) => {
    if (index === 0) {
      columnOffsets.set(column, Math.round(currentX));
      return;
    }

    const previousColumn = columns[index - 1];
    currentX += (columnWidthMap.get(previousColumn) ?? 0) + columnGap * Math.max(column - previousColumn, 1);
    columnOffsets.set(column, Math.round(currentX));
  });

  let currentY = baseY;
  rows.forEach((row, index) => {
    if (index === 0) {
      rowOffsets.set(row, Math.round(currentY));
      return;
    }

    const previousRow = rows[index - 1];
    currentY += (rowHeightMap.get(previousRow) ?? 0) + rowGap * Math.max(row - previousRow, 1);
    rowOffsets.set(row, Math.round(currentY));
  });

  let movedNodeCount = 0;
  entries.forEach((entry) => {
    const nextX = columnOffsets.get(entry.layoutNode.column);
    const nextY = rowOffsets.get(entry.layoutNode.row);
    if (nextX === undefined || nextY === undefined) {
      return;
    }

    if (entry.node.x !== nextX || entry.node.y !== nextY) {
      entry.node.x = nextX;
      entry.node.y = nextY;
      movedNodeCount += 1;
    }
  });

  return movedNodeCount;
}

function normalizeCanvasEdgeAnchors(
  document: CanvasDocumentRecord,
  affectedNodeIds: Set<string>,
): void {
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  document.edges.forEach((edge) => {
    if (affectedNodeIds.has(edge.fromNode) || affectedNodeIds.has(edge.toNode)) {
      applyCanvasEdgeAnchors(edge, nodeMap);
    }
  });
}

function applyCanvasEdgeAnchors(
  edge: CanvasEdgeRecord,
  nodeMap: Map<string, CanvasNodeRecord>,
): void {
  const fromNode = nodeMap.get(edge.fromNode);
  const toNode = nodeMap.get(edge.toNode);
  if (!fromNode || !toNode) {
    return;
  }

  const sides = resolveCanvasEdgeSides(fromNode, toNode);
  edge.fromSide = sides.fromSide;
  edge.toSide = sides.toSide;
}

function resolveCanvasEdgeSides(
  fromNode: CanvasNodeRecord,
  toNode: CanvasNodeRecord,
): { fromSide: CanvasEdgeSide; toSide: CanvasEdgeSide } {
  const fromCenter = getCanvasNodeCenter(fromNode);
  const toCenter = getCanvasNodeCenter(toNode);
  const deltaX = toCenter.x - fromCenter.x;
  const deltaY = toCenter.y - fromCenter.y;
  const horizontalClearance = Math.abs(deltaX) - (fromNode.width + toNode.width) / 2;
  const verticalClearance = Math.abs(deltaY) - (fromNode.height + toNode.height) / 2;

  if (horizontalClearance >= verticalClearance) {
    return deltaX >= 0
      ? { fromSide: "right", toSide: "left" }
      : { fromSide: "left", toSide: "right" };
  }

  return deltaY >= 0
    ? { fromSide: "bottom", toSide: "top" }
    : { fromSide: "top", toSide: "bottom" };
}

function getCanvasNodeCenter(node: CanvasNodeRecord): { x: number; y: number } {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function buildDraftNodeMarkdown(draft: CanvasExpansionDraftNode): string {
  const title = draft.title.trim();
  const body = draft.body?.trim();

  if (!body) {
    return `# ${title}`;
  }

  return `# ${title}\n\n${body}`;
}

function estimateTextNodeSize(text: string): { width: number; height: number } {
  const lines = text.split("\n");
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const width = Math.min(520, Math.max(280, 180 + maxLineLength * 6));
  const height = Math.min(340, Math.max(120, 76 + lines.length * 28));
  return { width, height };
}

function estimateKnowledgeMapNodeSize(text: string): { width: number; height: number } {
  const lines = text.split("\n");
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const width = Math.min(460, Math.max(220, 150 + maxLineLength * 5));
  const height = Math.min(280, Math.max(104, 64 + lines.length * 24));
  return { width, height };
}

function intersectsExisting(
  node: Pick<CanvasNodeRecord, "x" | "y" | "width" | "height">,
  existingRects: Array<{ x: number; y: number; width: number; height: number }>,
): boolean {
  return existingRects.some((rect) => rectsIntersect(node, rect));
}

function rectsIntersect(
  left: Pick<CanvasNodeRecord, "x" | "y" | "width" | "height">,
  right: { x: number; y: number; width: number; height: number },
): boolean {
  const padding = 24;

  return !(
    left.x + left.width + padding <= right.x ||
    right.x + right.width + padding <= left.x ||
    left.y + left.height + padding <= right.y ||
    right.y + right.height + padding <= left.y
  );
}

function generateHexId(usedIds: Set<string>): string {
  let nextId = "";

  do {
    const values = new Uint8Array(8);
    crypto.getRandomValues(values);
    nextId = Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
  } while (usedIds.has(nextId));

  usedIds.add(nextId);
  return nextId;
}

function createBoardPlacementAnchor(document: CanvasDocumentRecord): CanvasNodeRecord {
  const regularNodes = document.nodes.filter((node) => node.type !== "group");
  if (regularNodes.length === 0) {
    return {
      id: "__canvas_board__",
      type: "group",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  const maxX = Math.max(...regularNodes.map((node) => node.x + node.width));
  const minY = Math.min(...regularNodes.map((node) => node.y));
  const maxY = Math.max(...regularNodes.map((node) => node.y + node.height));

  return {
    id: "__canvas_board__",
    type: "group",
    x: Math.round(maxX),
    y: Math.round((minY + maxY) / 2),
    width: 0,
    height: 0,
  };
}

function resolveKnowledgeMapPlacementAnchor(
  boardConnections: CanvasKnowledgeMapBoardConnectionDraft[],
  existingNodeMap: Map<string, CanvasNodeRecord>,
  boardPlacementAnchor: CanvasNodeRecord,
): CanvasNodeRecord {
  if (boardConnections.length === 0) {
    return boardPlacementAnchor;
  }

  const scores = new Map<string, number>();
  boardConnections.forEach((connection) => {
    scores.set(connection.existingNodeId, (scores.get(connection.existingNodeId) ?? 0) + 1);
  });

  const primaryExistingNodeId = [...scores.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })[0]?.[0];

  if (!primaryExistingNodeId) {
    return boardPlacementAnchor;
  }

  return existingNodeMap.get(primaryExistingNodeId) ?? boardPlacementAnchor;
}

function resolveKnowledgeMapRootId(
  nodes: CanvasKnowledgeMapNodeDraft[],
  edges: CanvasKnowledgeMapEdgeDraft[],
): string {
  const orderMap = new Map(nodes.map((node, index) => [node.id, index]));
  const minLevel = Math.min(...nodes.map((node) => node.level));
  const rootCandidates = nodes.filter((node) => node.level === minLevel);

  if (rootCandidates.length === 1) {
    return rootCandidates[0].id;
  }

  return rootCandidates
    .slice()
    .sort((left, right) => {
      const leftScore = scoreKnowledgeMapRootCandidate(left.id, edges);
      const rightScore = scoreKnowledgeMapRootCandidate(right.id, edges);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return (orderMap.get(left.id) ?? 0) - (orderMap.get(right.id) ?? 0);
    })[0]?.id ?? nodes[0].id;
}

function scoreKnowledgeMapRootCandidate(
  nodeId: string,
  edges: CanvasKnowledgeMapEdgeDraft[],
): number {
  return edges.reduce((score, edge) => {
    if (edge.from === nodeId) {
      return score + 2;
    }
    if (edge.to === nodeId) {
      return score + 1;
    }
    return score;
  }, 0);
}

function buildKnowledgeMapParentLookup(
  nodes: CanvasKnowledgeMapNodeDraft[],
  edges: CanvasKnowledgeMapEdgeDraft[],
  rootNodeId: string,
): Map<string, string | null> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const orderMap = new Map(nodes.map((node, index) => [node.id, index]));
  const parentByNodeId = new Map<string, string | null>();
  parentByNodeId.set(rootNodeId, null);

  nodes.forEach((node) => {
    if (node.id === rootNodeId) {
      return;
    }

    const nodeOrder = orderMap.get(node.id) ?? 0;
    const candidates = new Set<string>();
    edges.forEach((edge) => {
      if (edge.to === node.id) {
        const parentNode = nodeMap.get(edge.from);
        if (parentNode && parentNode.level < node.level) {
          candidates.add(parentNode.id);
        }
      }

      if (edge.from === node.id) {
        const parentNode = nodeMap.get(edge.to);
        if (parentNode && parentNode.level < node.level) {
          candidates.add(parentNode.id);
        }
      }
    });

    const parentId = [...candidates]
      .sort((leftId, rightId) => {
        const leftNode = nodeMap.get(leftId);
        const rightNode = nodeMap.get(rightId);
        if (!leftNode || !rightNode) {
          return 0;
        }

        if (rightNode.level !== leftNode.level) {
          return rightNode.level - leftNode.level;
        }

        const leftDistance = Math.abs((orderMap.get(leftId) ?? 0) - nodeOrder);
        const rightDistance = Math.abs((orderMap.get(rightId) ?? 0) - nodeOrder);
        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        return (orderMap.get(rightId) ?? 0) - (orderMap.get(leftId) ?? 0);
      })[0];

    if (parentId) {
      parentByNodeId.set(node.id, parentId);
      return;
    }

    const inferredParentId = nodes
      .slice(0, nodeOrder)
      .filter((candidateNode) => candidateNode.level < node.level)
      .sort((leftNode, rightNode) => {
        if (rightNode.level !== leftNode.level) {
          return rightNode.level - leftNode.level;
        }

        return (orderMap.get(rightNode.id) ?? 0) - (orderMap.get(leftNode.id) ?? 0);
      })[0]?.id ?? rootNodeId;

    parentByNodeId.set(node.id, inferredParentId);
  });

  return parentByNodeId;
}

function buildKnowledgeMapChildrenLookup(
  nodes: CanvasKnowledgeMapNodeDraft[],
  parentByNodeId: Map<string, string | null>,
): Map<string, string[]> {
  const childrenByNodeId = new Map<string, string[]>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const orderMap = new Map(nodes.map((node, index) => [node.id, index]));

  nodes.forEach((node) => {
    childrenByNodeId.set(node.id, []);
  });

  parentByNodeId.forEach((parentId, nodeId) => {
    if (!parentId) {
      return;
    }

    const children = childrenByNodeId.get(parentId) ?? [];
    children.push(nodeId);
    childrenByNodeId.set(parentId, children);
  });

  childrenByNodeId.forEach((children, nodeId) => {
    children.sort((leftId, rightId) => {
      const leftNode = nodeMap.get(leftId);
      const rightNode = nodeMap.get(rightId);
      if (!leftNode || !rightNode) {
        return (orderMap.get(leftId) ?? 0) - (orderMap.get(rightId) ?? 0);
      }

      if (leftNode.level !== rightNode.level) {
        return leftNode.level - rightNode.level;
      }

      if (leftNode.type !== rightNode.type) {
        return leftNode.type === "concept" ? -1 : 1;
      }

      return (orderMap.get(leftId) ?? 0) - (orderMap.get(rightId) ?? 0);
    });
    childrenByNodeId.set(nodeId, children);
  });

  return childrenByNodeId;
}

function buildKnowledgeMapTreeLayout(
  rootNodeId: string,
  nodes: CanvasKnowledgeMapNodeDraft[],
  parentByNodeId: Map<string, string | null>,
  childrenByNodeId: Map<string, string[]>,
): CanvasInstructionLayoutDraft[] {
  const columnCache = new Map<string, number>();
  const spanCache = new Map<string, number>();
  const layoutNodes: CanvasInstructionLayoutDraft[] = [];

  const computeColumn = (nodeId: string): number => {
    const cached = columnCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    const parentId = parentByNodeId.get(nodeId);
    if (!parentId) {
      columnCache.set(nodeId, 0);
      return 0;
    }

    const column = computeColumn(parentId) + 1;
    columnCache.set(nodeId, column);
    return column;
  };

  const computeSpan = (nodeId: string): number => {
    const cached = spanCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    const children = childrenByNodeId.get(nodeId) ?? [];
    if (children.length === 0) {
      spanCache.set(nodeId, KNOWLEDGE_MAP_LEAF_SPAN);
      return KNOWLEDGE_MAP_LEAF_SPAN;
    }

    const span = Math.max(
      KNOWLEDGE_MAP_LEAF_SPAN,
      children.reduce((total, childId) => total + computeSpan(childId), 0)
        + Math.max(children.length - 1, 0) * KNOWLEDGE_MAP_SIBLING_GAP,
    );
    spanCache.set(nodeId, span);
    return span;
  };

  const assignRows = (nodeId: string, startRow: number) => {
    const span = computeSpan(nodeId);
    layoutNodes.push({
      nodeId,
      column: computeColumn(nodeId),
      row: startRow + Math.floor((span - 1) / 2),
    });

    let childRow = startRow;
    (childrenByNodeId.get(nodeId) ?? []).forEach((childId) => {
      assignRows(childId, childRow);
      childRow += computeSpan(childId) + KNOWLEDGE_MAP_SIBLING_GAP;
    });
  };

  assignRows(rootNodeId, 0);

  const placedNodeIds = new Set(layoutNodes.map((layoutNode) => layoutNode.nodeId));
  let nextRootRow = computeSpan(rootNodeId) + KNOWLEDGE_MAP_ROOT_GAP;
  nodes.forEach((node) => {
    if (placedNodeIds.has(node.id)) {
      return;
    }

    assignRows(node.id, nextRootRow);
    layoutNodes.forEach((layoutNode) => {
      placedNodeIds.add(layoutNode.nodeId);
    });
    nextRootRow += computeSpan(node.id) + KNOWLEDGE_MAP_ROOT_GAP;
  });

  return sortCanvasLayoutNodes(layoutNodes);
}

function resolveKnowledgeMapNodeColor(
  node: CanvasKnowledgeMapNodeDraft,
): string | undefined {
  if (node.level === 0) {
    return "2";
  }

  if (node.type === "concept") {
    return "4";
  }

  if (node.type === "detail") {
    return "5";
  }

  return undefined;
}

function buildKnowledgeMapPrimaryEdges(
  nodes: CanvasKnowledgeMapNodeDraft[],
  edges: CanvasKnowledgeMapEdgeDraft[],
  parentByNodeId: Map<string, string | null>,
): CanvasKnowledgeMapEdgeDraft[] {
  const explicitRelationByPair = new Map<string, string | undefined>();
  edges.forEach((edge) => {
    explicitRelationByPair.set(`${edge.from}__${edge.to}`, edge.relation);
  });

  const primaryEdges: CanvasKnowledgeMapEdgeDraft[] = [];

  nodes.forEach((node) => {
    const parentId = parentByNodeId.get(node.id);
    if (!parentId) {
      return;
    }

    const relation = explicitRelationByPair.get(`${parentId}__${node.id}`)
      ?? explicitRelationByPair.get(`${node.id}__${parentId}`)
      ?? undefined;

    primaryEdges.push({
      from: parentId,
      to: node.id,
      relation: normalizeKnowledgeMapRelationLabel(relation),
    });
  });

  return primaryEdges;
}

function normalizeKnowledgeMapRelationLabel(
  relation: string | undefined,
): string | undefined {
  const normalized = relation?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();
  if (["contains", "include", "includes", "including", "belongs to", "relates to", "related to"].includes(lower)) {
    return undefined;
  }

  if (["supports", "support"].includes(lower)) {
    return "支撑";
  }

  if (["follows", "follow", "next", "next step"].includes(lower)) {
    return "后续";
  }

  if (["causes", "cause", "leads to"].includes(lower)) {
    return "导致";
  }

  if (["contrasts", "contrast", "compares", "compare"].includes(lower)) {
    return "对比";
  }

  return normalized;
}

function buildKnowledgeMapGroupNodes(
  nodes: CanvasKnowledgeMapNodeDraft[],
  rootNodeId: string,
  childrenByNodeId: Map<string, string[]>,
  canvasNodeByBlueprintId: Map<string, CanvasNodeRecord>,
  usedIds: Set<string>,
): CanvasNodeRecord[] {
  const groupDrafts = buildKnowledgeMapGroupDrafts(
    nodes,
    rootNodeId,
    childrenByNodeId,
    canvasNodeByBlueprintId,
  );

  return groupDrafts.map((groupDraft) => {
    const bounds = getCanvasNodeBounds(
      groupDraft.nodeIds
        .map((nodeId) => canvasNodeByBlueprintId.get(nodeId))
        .filter((node): node is CanvasNodeRecord => !!node),
    );

    return {
      id: generateHexId(usedIds),
      type: "group",
      x: Math.round(bounds.x - 48),
      y: Math.round(bounds.y - 64),
      width: Math.max(260, Math.round(bounds.width + 96)),
      height: Math.max(180, Math.round(bounds.height + 112)),
      label: groupDraft.label,
      color: groupDraft.color,
    };
  });
}

function getCanvasNodeBounds(
  nodes: CanvasNodeRecord[],
): { x: number; y: number; width: number; height: number } {
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

function buildKnowledgeMapGroupDrafts(
  nodes: CanvasKnowledgeMapNodeDraft[],
  rootNodeId: string,
  childrenByNodeId: Map<string, string[]>,
  canvasNodeByBlueprintId: Map<string, CanvasNodeRecord>,
): CanvasKnowledgeMapGroupDraft[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const groupNodeIdsByLabel = new Map<string, string[]>();
  const groupColorByLabel = new Map<string, string | undefined>();
  const rootChildren = childrenByNodeId.get(rootNodeId) ?? [];

  rootChildren.forEach((branchRootId) => {
    const branchRootNode = nodeMap.get(branchRootId);
    if (!branchRootNode) {
      return;
    }

    const descendants = collectKnowledgeMapSubtreeNodeIds(branchRootId, childrenByNodeId)
      .filter((nodeId) => canvasNodeByBlueprintId.has(nodeId));
    if (descendants.length < 2) {
      return;
    }

    const label = branchRootNode.group?.trim() || branchRootNode.title.trim();
    if (!label) {
      return;
    }

    const existingNodeIds = groupNodeIdsByLabel.get(label) ?? [];
    groupNodeIdsByLabel.set(label, Array.from(new Set([...existingNodeIds, ...descendants])));
    groupColorByLabel.set(label, resolveKnowledgeMapGroupColor(branchRootNode));
  });

  const groupDrafts = [...groupNodeIdsByLabel.entries()]
    .map(([label, nodeIds]) => ({
      label,
      nodeIds,
      color: groupColorByLabel.get(label),
    }))
    .filter((groupDraft) => groupDraft.nodeIds.length > 1);

  if (groupDrafts.length > 0) {
    return groupDrafts;
  }

  const explicitGroupMap = new Map<string, string[]>();
  nodes.forEach((node) => {
    if (node.id === rootNodeId || !node.group?.trim()) {
      return;
    }

    const targetNode = canvasNodeByBlueprintId.get(node.id);
    if (!targetNode) {
      return;
    }

    const groupLabel = node.group.trim();
    const existingNodeIds = explicitGroupMap.get(groupLabel) ?? [];
    existingNodeIds.push(node.id);
    explicitGroupMap.set(groupLabel, existingNodeIds);
  });

  return [...explicitGroupMap.entries()]
    .map(([label, nodeIds]) => ({
      label,
      nodeIds,
      color: resolveKnowledgeMapGroupColor(nodeMap.get(nodeIds[0]) ?? null),
    }))
    .filter((groupDraft) => groupDraft.nodeIds.length > 1);
}

function collectKnowledgeMapSubtreeNodeIds(
  rootNodeId: string,
  childrenByNodeId: Map<string, string[]>,
): string[] {
  const result: string[] = [];
  const stack = [rootNodeId];

  while (stack.length > 0) {
    const currentNodeId = stack.pop();
    if (!currentNodeId) {
      continue;
    }

    result.push(currentNodeId);
    const children = childrenByNodeId.get(currentNodeId) ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }

  return result;
}

function resolveKnowledgeMapGroupColor(
  node: CanvasKnowledgeMapNodeDraft | null,
): string | undefined {
  if (!node) {
    return "6";
  }

  if (node.level <= 1) {
    return "6";
  }

  return resolveKnowledgeMapNodeColor(node) ?? "6";
}

function shiftKnowledgeMapClusterAwayFromExisting(
  canvasNodeByBlueprintId: Map<string, CanvasNodeRecord>,
  existingNodes: CanvasNodeRecord[],
): void {
  if (existingNodes.length === 0 || canvasNodeByBlueprintId.size === 0) {
    return;
  }

  const generatedNodes = [...canvasNodeByBlueprintId.values()];
  const existingRects = existingNodes.map((node) => ({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }));

  let guard = 0;
  while (generatedNodes.some((node) => intersectsExisting(node, existingRects)) && guard < 16) {
    generatedNodes.forEach((node) => {
      node.x += 180;
    });
    guard += 1;
  }
}

function resolveInstructionTargetId(
  rawValue: string | undefined,
  anchorNodeId: string | null,
  nodeMap: Map<string, CanvasNodeRecord>,
): string | null {
  const value = (rawValue || "").trim();
  if (!value || value.toLowerCase() === "anchor" || value.toLowerCase() === "current") {
    return anchorNodeId ?? null;
  }

  if (nodeMap.has(value)) {
    return value;
  }

  return null;
}

function edgeExists(
  edges: CanvasEdgeRecord[],
  fromNode: string,
  toNode: string,
  label?: string,
): boolean {
  return edges.some((edge) =>
    edge.fromNode === fromNode &&
    edge.toNode === toNode &&
    (edge.label || "") === (label?.trim() || ""),
  );
}

function collectIdsFromUnknown(value: unknown, results: Set<string>, allowedIds: Set<string>): void {
  iterateCollection(value, (item) => {
    const nodeId = extractNodeIdFromUnknown(item, allowedIds);
    if (nodeId) {
      results.add(nodeId);
    }
  });
}

function iterateCollection(value: unknown, visitor: (item: unknown) => void): void {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(visitor);
    return;
  }

  if (value instanceof Set) {
    value.forEach(visitor);
    return;
  }

  if (value instanceof Map) {
    value.forEach((item) => visitor(item));
    return;
  }

  if (typeof value === "object") {
    visitor(value);
  }
}

function extractNodeIdFromUnknown(value: unknown, allowedIds: Set<string>): string | null {
  if (typeof value === "string" && allowedIds.has(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const candidates = [
    record.id,
    asRecord(record.node)?.id,
    asRecord(record.data)?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && allowedIds.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function extractNodeIdFromElement(element: HTMLElement, allowedIds: Set<string>): string | null {
  const directCandidates = [
    element.dataset.nodeId,
    element.dataset.id,
    element.getAttribute("data-node-id"),
    element.getAttribute("data-id"),
    element.id,
  ];

  for (const candidate of directCandidates) {
    if (candidate && allowedIds.has(candidate)) {
      return candidate;
    }
  }

  for (const attributeName of element.getAttributeNames()) {
    const attributeValue = element.getAttribute(attributeName);
    if (attributeValue && allowedIds.has(attributeValue)) {
      return attributeValue;
    }
  }

  for (const value of Object.values(element.dataset)) {
    if (value && allowedIds.has(value)) {
      return value;
    }
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
