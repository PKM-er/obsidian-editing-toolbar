import { Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Notice, Platform } from "obsidian";
import { EditorView, ViewPlugin, type Tooltip, type TooltipView, type ViewUpdate, keymap, showTooltip } from "@codemirror/view";
import { t } from "src/translations/helper";
import { normalizeGeneratedFrontmatter } from "../artifactNormalizer";
import { resolveRewriteContext } from "../editorContext";
import { showAIErrorNotice } from "../errorHandling";
import { type IAIService, type RewriteArtifactKind, type RewriteConfig, type RewriteInstruction } from "../types";

interface RewriteStartParams {
  from: number;
  to: number;
  originalText: string;
  instruction: RewriteInstruction;
  customPrompt?: string;
  context?: string;
  artifactKind?: RewriteArtifactKind;
  preferredFrontmatterKeys?: Record<string, string>;
}

interface RewriteOperation {
  phase: "streaming" | "done";
  params: RewriteStartParams;
  result: string;
}

interface RewriteFieldValue {
  operation: RewriteOperation | null;
  resultTooltip: Tooltip | null;
}

const startRewriteEffect = StateEffect.define<RewriteStartParams>();
const updateRewriteResultEffect = StateEffect.define<string>();
const finishRewriteEffect = StateEffect.define<void>();
const cancelRewriteEffect = StateEffect.define<void>();

interface RewritePanelShortcut {
  display: string;
  primaryKey: string;
  fallbackKeys?: readonly string[];
}

function createPlatformMnemonicShortcut(letter: string): RewritePanelShortcut {
  const upper = letter.toUpperCase();
  return Platform.isMacOS
    ? {
      display: formatShortcutLabel(["Ctrl", upper]),
      primaryKey: `Ctrl-${letter.toLowerCase()}`,
    }
    : {
      display: formatShortcutLabel(["Alt", upper]),
      primaryKey: `Alt-${letter.toLowerCase()}`,
    };
}

const REWRITE_PANEL_SHORTCUTS = {
  close: {
    ...createPlatformMnemonicShortcut("d"),
    fallbackKeys: ["Escape"],
  },
  replace: {
    ...createPlatformMnemonicShortcut("r"),
    fallbackKeys: ["Mod-Enter"],
  },
  insertBelow: {
    ...createPlatformMnemonicShortcut("i"),
    fallbackKeys: ["Mod-Shift-Enter"],
  },
  copy: createPlatformMnemonicShortcut("c"),
  retry: createPlatformMnemonicShortcut("t"),
} as const satisfies Record<string, RewritePanelShortcut>;

function dispatchRewrite(view: EditorView, instruction: RewriteInstruction, customPrompt?: string): void {
  const { from, to } = view.state.selection.main;
  if (from === to) return;
  const rewriteContext = resolveRewriteContext(view, from, to);
  view.dispatch({
    effects: startRewriteEffect.of({
      from: rewriteContext.from,
      to: rewriteContext.to,
      originalText: rewriteContext.selectedText,
      instruction,
      customPrompt,
      context: rewriteContext.context,
    }),
  });
}

function formatShortcutLabel(parts: Array<"Mod" | "Shift" | "Alt" | "Ctrl" | string>): string {
  const displayParts = parts.map((part) => {
    if (part === "Mod") {
      return Platform.isMacOS ? "⌘" : "Ctrl";
    }
    if (part === "Shift") {
      return Platform.isMacOS ? "⇧" : "Shift";
    }
    if (part === "Alt") {
      return Platform.isMacOS ? "⌥" : "Alt";
    }
    if (part === "Ctrl") {
      return Platform.isMacOS ? "⌃" : "Ctrl";
    }
    return part;
  });

  return displayParts.join("+");
}

function getRewriteOperation(
  view: EditorView,
  rewriteField: StateField<RewriteFieldValue>,
  requireDone = false,
): RewriteOperation | null {
  const state = view.state.field(rewriteField, false);
  const operation = state?.operation ?? null;
  if (!operation) {
    return null;
  }

  if (requireDone && operation.phase !== "done") {
    return null;
  }

  return operation;
}

function isFileArtifactOperation(operation: RewriteOperation | null): boolean {
  return operation?.params.artifactKind === "base" || operation?.params.artifactKind === "canvas";
}

function isFrontmatterOperation(operation: RewriteOperation | null): boolean {
  return operation?.params.artifactKind === "frontmatter";
}

function dismissRewritePanel(view: EditorView, rewriteField: StateField<RewriteFieldValue>): boolean {
  if (!getRewriteOperation(view, rewriteField)) {
    return false;
  }

  view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
  view.focus();
  return true;
}

async function copyRewriteResultToClipboard(
  view: EditorView,
  rewriteField: StateField<RewriteFieldValue>,
): Promise<boolean> {
  const operation = getRewriteOperation(view, rewriteField, true);
  const result = operation?.result;
  if (!result) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(result);
    return true;
  } catch (error) {
    console.error("[AI Rewrite] Failed to copy result:", error);
    new Notice(error instanceof Error && error.message ? error.message : t("Copy to Clipboard"));
    return false;
  }
}

async function handleGeneratedArtifact(
  view: EditorView,
  rewriteField: StateField<RewriteFieldValue>,
  getConfig: () => {
    createGeneratedArtifact?: RewriteConfig["createGeneratedArtifact"];
  },
  mode: "create" | "embed",
): Promise<boolean> {
  const operation = getRewriteOperation(view, rewriteField, true);
  if (!operation?.params.artifactKind) {
    return false;
  }

  const artifactCreator = getConfig().createGeneratedArtifact;
  if (!artifactCreator) {
    new Notice(t("AI file creation is unavailable."));
    return true;
  }

  try {
    const artifact = await artifactCreator({
      kind: operation.params.artifactKind,
      content: operation.result,
      sourceText: operation.params.originalText,
    });

    view.dispatch({ effects: cancelRewriteEffect.of(undefined) });

    if (mode === "embed") {
      const insertText = operation.params.from === operation.params.to
        ? artifact.embedSyntax
        : `\n\n${artifact.embedSyntax}`;
      const insertFrom = operation.params.to;

      view.dispatch({
        changes: { from: insertFrom, insert: insertText },
        selection: { anchor: insertFrom + insertText.length },
      });
    }

    view.focus();
    return true;
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : t("Failed to create AI file.");
    new Notice(message);
    console.error("[AI Artifact] Failed to create file:", error);
    return true;
  }
}

function applyFrontmatterResult(
  view: EditorView,
  rewriteField: StateField<RewriteFieldValue>,
): boolean {
  const operation = getRewriteOperation(view, rewriteField, true);
  if (!operation) {
    return false;
  }

  try {
    const normalized = normalizeGeneratedFrontmatter(
      operation.result,
      operation.params.preferredFrontmatterKeys,
    );
    view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
    view.dispatch({
      changes: { from: operation.params.from, to: operation.params.to, insert: normalized },
      selection: { anchor: normalized.length },
    });
    view.focus();
    return true;
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : t("Failed to apply frontmatter.");
    new Notice(message);
    return true;
  }
}

async function applyRewriteResult(
  view: EditorView,
  rewriteField: StateField<RewriteFieldValue>,
  getConfig: () => {
    createGeneratedArtifact?: RewriteConfig["createGeneratedArtifact"];
  },
  mode: "replace" | "insert-below",
): Promise<boolean> {
  const operation = getRewriteOperation(view, rewriteField, true);
  if (!operation) {
    return false;
  }

  if (isFileArtifactOperation(operation)) {
    return handleGeneratedArtifact(view, rewriteField, getConfig, mode === "replace" ? "create" : "embed");
  }

  if (isFrontmatterOperation(operation)) {
    return applyFrontmatterResult(view, rewriteField);
  }

  if (mode === "replace") {
    const { from, to } = operation.params;
    const result = operation.result;
    view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
    view.dispatch({
      changes: { from, to, insert: result },
      selection: { anchor: from + result.length },
    });
    view.focus();
    return true;
  }

  const { to } = operation.params;
  const result = operation.result;
  view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
  view.dispatch({
    changes: { from: to, insert: `\n\n${result}` },
    selection: { anchor: to + result.length + 2 },
  });
  view.focus();
  return true;
}

function retryRewrite(view: EditorView, rewriteField: StateField<RewriteFieldValue>): boolean {
  const operation = getRewriteOperation(view, rewriteField, true);
  if (!operation) {
    return false;
  }

  view.dispatch({ effects: startRewriteEffect.of(operation.params) });
  return true;
}

function setActionButtonLabel(btn: HTMLButtonElement, label: string, shortcut?: string): void {
  btn.replaceChildren();

  const labelEl = document.createElement("span");
  labelEl.className = "cm-ai-btn-label";
  labelEl.textContent = label;
  btn.appendChild(labelEl);

  if (shortcut) {
    const shortcutEl = document.createElement("span");
    shortcutEl.className = "cm-ai-btn-shortcut";
    shortcutEl.textContent = shortcut;
    btn.appendChild(shortcutEl);
    btn.title = `${label} (${shortcut})`;
  } else {
    btn.removeAttribute("title");
  }
}

function createResultPanelTooltipView(
  view: EditorView,
  rewriteField: StateField<RewriteFieldValue>,
  getConfig: () => {
    createGeneratedArtifact?: RewriteConfig["createGeneratedArtifact"];
  },
): TooltipView {
  const dom = document.createElement("div");
  dom.className = "cm-ai-result-panel";
  dom.dataset.phase = "streaming";
  let copyResetTimer: number | null = null;

  dom.addEventListener("mousedown", (event) => {
    if (!(event.target as HTMLElement).closest(".cm-ai-result-content")) {
      event.preventDefault();
    }
  });

  const headerRow = document.createElement("div");
  headerRow.className = "cm-ai-result-header-row";

  const header = document.createElement("div");
  header.className = "cm-ai-result-header";
  header.textContent = t("AI is writing...");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "cm-ai-result-close";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", t("Close"));
  closeBtn.title = `${t("Close")} (${REWRITE_PANEL_SHORTCUTS.close.display} / Esc)`;
  closeBtn.addEventListener("click", () => {
    resetCopyButtonLabel();
    dismissRewritePanel(view, rewriteField);
  });

  headerRow.append(header, closeBtn);
  dom.appendChild(headerRow);

  const content = document.createElement("div");
  content.className = "cm-ai-result-content";
  dom.appendChild(content);

  const actionsBar = document.createElement("div");
  actionsBar.className = "cm-ai-result-actions";
  actionsBar.style.display = "none";

  function resetCopyButtonLabel(): void {
    if (copyResetTimer !== null) {
      window.clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    setActionButtonLabel(copyBtn, t("Copy to Clipboard"), REWRITE_PANEL_SHORTCUTS.copy.display);
  }

  const replaceBtn = createActionButton(
    t("Replace"),
    "cm-ai-btn-primary",
    () => {
      void applyRewriteResult(view, rewriteField, getConfig, "replace");
    },
    REWRITE_PANEL_SHORTCUTS.replace.display,
  );

  const insertBtn = createActionButton(
    t("Insert below"),
    "cm-ai-btn-secondary",
    () => {
      void applyRewriteResult(view, rewriteField, getConfig, "insert-below");
    },
    REWRITE_PANEL_SHORTCUTS.insertBelow.display,
  );

  const copyBtn = createActionButton(
    t("Copy to Clipboard"),
    "cm-ai-btn-secondary",
    () => {
      void copyRewriteResultToClipboard(view, rewriteField).then((copied) => {
        if (!copied) {
          return;
        }
        if (copyResetTimer !== null) {
          window.clearTimeout(copyResetTimer);
        }
        setActionButtonLabel(copyBtn, t("Copied!"), REWRITE_PANEL_SHORTCUTS.copy.display);
        copyResetTimer = window.setTimeout(() => {
          copyResetTimer = null;
          setActionButtonLabel(copyBtn, t("Copy to Clipboard"), REWRITE_PANEL_SHORTCUTS.copy.display);
        }, 1500);
      });
    },
    REWRITE_PANEL_SHORTCUTS.copy.display,
  );

  const retryBtn = createActionButton(t("Try again"), "cm-ai-btn-secondary", () => {
    resetCopyButtonLabel();
    retryRewrite(view, rewriteField);
  }, REWRITE_PANEL_SHORTCUTS.retry.display);

  actionsBar.append(replaceBtn, insertBtn, copyBtn, retryBtn);
  dom.appendChild(actionsBar);

  return {
    dom,
    update(update: ViewUpdate) {
      const state = update.state.field(rewriteField);
      if (!state.operation) {
        dom.style.display = "none";
        dom.dataset.phase = "idle";
        return;
      }

      dom.style.display = "";
      dom.dataset.phase = state.operation.phase;
      content.textContent = state.operation.result || "";
      if (isFileArtifactOperation(state.operation)) {
        header.textContent = t("AI file suggestion");
        setActionButtonLabel(replaceBtn, t("Create"), REWRITE_PANEL_SHORTCUTS.replace.display);
        setActionButtonLabel(insertBtn, t("Create & Embed"), REWRITE_PANEL_SHORTCUTS.insertBelow.display);
        insertBtn.style.display = "";
      } else if (isFrontmatterOperation(state.operation)) {
        header.textContent = t("AI frontmatter suggestion");
        setActionButtonLabel(
          replaceBtn,
          state.operation.params.from === state.operation.params.to
            ? t("Insert frontmatter")
            : t("Replace frontmatter"),
          REWRITE_PANEL_SHORTCUTS.replace.display,
        );
        insertBtn.style.display = "none";
      } else {
        setActionButtonLabel(
          replaceBtn,
          state.operation.params.from === state.operation.params.to
            ? t("Insert at cursor")
            : t("Replace"),
          REWRITE_PANEL_SHORTCUTS.replace.display,
        );
        setActionButtonLabel(insertBtn, t("Insert below"), REWRITE_PANEL_SHORTCUTS.insertBelow.display);
        insertBtn.style.display = "";
      }

      if (state.operation.phase === "done") {
        if (state.operation.params.artifactKind !== "base" && state.operation.params.artifactKind !== "canvas") {
          if (state.operation.params.artifactKind !== "frontmatter") {
            header.textContent = t("AI suggestion");
          }
        }
        copyBtn.style.display = "";
        actionsBar.style.display = "flex";
      } else {
        resetCopyButtonLabel();
        header.textContent = t("AI is writing...");
        actionsBar.style.display = "none";
      }
    },
    destroy() {
      if (copyResetTimer !== null) {
        window.clearTimeout(copyResetTimer);
      }
    },
  };
}

function createActionButton(
  label: string,
  className: string,
  onClick: () => void,
  shortcut?: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `cm-ai-btn ${className}`;
  setActionButtonLabel(btn, label, shortcut);
  btn.addEventListener("click", onClick);
  return btn;
}

export function selectionRewrite(
  getService: () => IAIService | null,
  getConfig?: () => RewriteConfig,
): Extension {
    const resolveConfig = () => {
    const config = getConfig?.() ?? {};
    return {
      createGeneratedArtifact: config.createGeneratedArtifact,
    };
  };

  const rewriteField = StateField.define<RewriteFieldValue>({
    create: () => ({
      operation: null,
      resultTooltip: null,
    }),
    update(prev, tr) {      let operation = prev.operation;

      for (const effect of tr.effects) {
        if (effect.is(startRewriteEffect)) {
          operation = { phase: "streaming", params: effect.value, result: "" };
        }
        if (effect.is(updateRewriteResultEffect) && operation) {
          operation = { ...operation, result: effect.value };
        }
        if (effect.is(finishRewriteEffect) && operation) {
          operation = { ...operation, phase: "done" };
        }
        if (effect.is(cancelRewriteEffect)) {
          operation = null;
        }
      }

      if (tr.docChanged && operation) {
        operation = {
          ...operation,
          params: {
            ...operation.params,
            from: tr.changes.mapPos(operation.params.from),
            to: tr.changes.mapPos(operation.params.to),
          },
        };
      }

      let resultTooltip: Tooltip | null = null;

      if (operation) {
        if (prev.resultTooltip && prev.resultTooltip.pos === operation.params.from) {
          resultTooltip = prev.resultTooltip;
        } else {
          resultTooltip = {
            pos: operation.params.from,
            above: false,
            create: (view) => createResultPanelTooltipView(view, rewriteField, resolveConfig),
          };
        }
      }

      return {
        operation,
        resultTooltip,
      };
    },
    provide: (field) => showTooltip.from(field, (value) => value.resultTooltip ?? null),
  });

  const rewritePlugin = ViewPlugin.fromClass(
    class {
      private abortController: AbortController | null = null;
      private view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
      }

      update(update: ViewUpdate): void {
        for (const tr of update.transactions) {
          for (const effect of tr.effects) {
            if (effect.is(startRewriteEffect)) {
              void this.startStreaming(effect.value);
            }
            if (effect.is(cancelRewriteEffect)) {
              this.abortController?.abort();
            }
          }
        }
      }

      private async startStreaming(params: RewriteStartParams): Promise<void> {
        this.abortController?.abort();
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        const service = getService();
        if (!service) {
          return;
        }

        let result = "";
        try {
          for await (const chunk of service.rewrite({
            selectedText: params.originalText,
            instruction: params.instruction,
            customPrompt: params.customPrompt,
            context: params.context,
            artifactKind: params.artifactKind,
          }, signal)) {
            if (signal.aborted) return;
            result += chunk;
            this.view.dispatch({ effects: updateRewriteResultEffect.of(result) });
          }
          this.view.dispatch({ effects: finishRewriteEffect.of(undefined) });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          if (!showAIErrorNotice(error)) {
            console.error("[AI Rewrite] Error:", error);
          }
          this.view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
        }
      }

      destroy(): void {
        this.abortController?.abort();
      }
    },
  );

  const rewriteKeymap = Prec.highest(
    keymap.of([
      {
        key: REWRITE_PANEL_SHORTCUTS.close.primaryKey,
        run: (view) => dismissRewritePanel(view, rewriteField),
      },
      {
        key: "Escape",
        run: (view) => dismissRewritePanel(view, rewriteField),
      },
      {
        key: REWRITE_PANEL_SHORTCUTS.replace.primaryKey,
        run: (view) => {
          if (!getRewriteOperation(view, rewriteField, true)) {
            return false;
          }
          void applyRewriteResult(view, rewriteField, resolveConfig, "replace");
          return true;
        },
      },
      {
        key: "Mod-Enter",
        run: (view) => {
          if (!getRewriteOperation(view, rewriteField, true)) {
            return false;
          }
          void applyRewriteResult(view, rewriteField, resolveConfig, "replace");
          return true;
        },
      },
      {
        key: REWRITE_PANEL_SHORTCUTS.insertBelow.primaryKey,
        run: (view) => {
          if (!getRewriteOperation(view, rewriteField, true)) {
            return false;
          }
          void applyRewriteResult(view, rewriteField, resolveConfig, "insert-below");
          return true;
        },
      },
      {
        key: "Mod-Shift-Enter",
        run: (view) => {
          if (!getRewriteOperation(view, rewriteField, true)) {
            return false;
          }
          void applyRewriteResult(view, rewriteField, resolveConfig, "insert-below");
          return true;
        },
      },
      {
        key: REWRITE_PANEL_SHORTCUTS.copy.primaryKey,
        run: (view) => {
          if (!getRewriteOperation(view, rewriteField, true)) {
            return false;
          }
          void copyRewriteResultToClipboard(view, rewriteField).then((copied) => {
            if (copied) {
              new Notice(t("Copied!"));
            }
          });
          return true;
        },
      },
      {
        key: "Mod-Shift-C",
        run: (view) => {
          if (!getRewriteOperation(view, rewriteField, true)) {
            return false;
          }
          void copyRewriteResultToClipboard(view, rewriteField).then((copied) => {
            if (copied) {
              new Notice(t("Copied!"));
            }
          });
          return true;
        },
      },
      {
        key: REWRITE_PANEL_SHORTCUTS.retry.primaryKey,
        run: (view) => retryRewrite(view, rewriteField),
      },
      {
        key: "Mod-Shift-R",
        run: (view) => retryRewrite(view, rewriteField),
      },
      {
        key: "Ctrl-Shift-Space",
        run: (view) => {
          const { from, to } = view.state.selection.main;
          if (from === to) return false;
          dispatchRewrite(view, "improve");
          return true;
        },
      },
    ]),
  );

  return [rewriteField, rewritePlugin, rewriteKeymap];
}

export { cancelRewriteEffect, finishRewriteEffect, startRewriteEffect, updateRewriteResultEffect };
