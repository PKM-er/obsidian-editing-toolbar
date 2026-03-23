import { Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Notice } from "obsidian";
import { Decoration, EditorView, ViewPlugin, WidgetType, type Tooltip, type TooltipView, type ViewUpdate, keymap, showTooltip } from "@codemirror/view";
import { t } from "src/translations/helper";
import { normalizeGeneratedFrontmatter } from "../artifactNormalizer";
import { resolveRewriteContext } from "../editorContext";
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

class RewriteLoadingWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-ai-loading cm-ai-loading-pill cm-ai-rewrite-loading";
    wrapper.setAttribute("aria-label", t("AI is writing..."));

    const spinner = document.createElement("span");
    spinner.className = "cm-ai-loading-spinner";

    const label = document.createElement("span");
    label.className = "cm-ai-loading-label";
    label.textContent = t("AI generating");

    wrapper.append(spinner, label);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
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
  dom.addEventListener("mousedown", (event) => event.preventDefault());

  const header = document.createElement("div");
  header.className = "cm-ai-result-header";
  header.textContent = t("AI is writing...");
  dom.appendChild(header);

  const content = document.createElement("div");
  content.className = "cm-ai-result-content";
  dom.appendChild(content);

  const actionsBar = document.createElement("div");
  actionsBar.className = "cm-ai-result-actions";
  actionsBar.style.display = "none";

  function hidePanel(): void {
    dom.style.display = "none";
  }

  async function handleArtifact(mode: "create" | "embed"): Promise<void> {
    const state = view.state.field(rewriteField);
    if (!state.operation?.params.artifactKind) {
      return;
    }

    const artifactCreator = getConfig().createGeneratedArtifact;
    if (!artifactCreator) {
      new Notice(t("AI file creation is unavailable."));
      return;
    }

    try {
      const artifact = await artifactCreator({
        kind: state.operation.params.artifactKind,
        content: state.operation.result,
        sourceText: state.operation.params.originalText,
      });

      hidePanel();
      view.dispatch({ effects: cancelRewriteEffect.of(undefined) });

      if (mode === "embed") {
        const insertText = state.operation.params.from === state.operation.params.to
          ? artifact.embedSyntax
          : `\n\n${artifact.embedSyntax}`;
        const insertFrom = state.operation.params.to;

        view.dispatch({
          changes: { from: insertFrom, insert: insertText },
          selection: { anchor: insertFrom + insertText.length },
        });
      }

      view.focus();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t("Failed to create AI file.");
      new Notice(message);
      console.error("[AI Artifact] Failed to create file:", error);
    }
  }

  function isFileArtifactOperation(): boolean {
    const operation = view.state.field(rewriteField).operation;
    return operation?.params.artifactKind === "base" || operation?.params.artifactKind === "canvas";
  }

  function isFrontmatterOperation(): boolean {
    return view.state.field(rewriteField).operation?.params.artifactKind === "frontmatter";
  }

  function applyFrontmatter(): void {
    const state = view.state.field(rewriteField);
    if (!state.operation) {
      return;
    }

    try {
      const normalized = normalizeGeneratedFrontmatter(
        state.operation.result,
        state.operation.params.preferredFrontmatterKeys,
      );
      hidePanel();
      view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
      view.dispatch({
        changes: { from: state.operation.params.from, to: state.operation.params.to, insert: normalized },
        selection: { anchor: normalized.length },
      });
      view.focus();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t("Failed to apply frontmatter.");
      new Notice(message);
    }
  }

  const replaceBtn = createActionButton(t("Replace"), "cm-ai-btn-primary", () => {
    if (isFileArtifactOperation()) {
      void handleArtifact("create");
      return;
    }

    if (isFrontmatterOperation()) {
      applyFrontmatter();
      return;
    }

    const state = view.state.field(rewriteField);
    if (!state.operation) return;
    const { from, to } = state.operation.params;
    const result = state.operation.result;
    hidePanel();
    view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
    view.dispatch({
      changes: { from, to, insert: result },
      selection: { anchor: from + result.length },
    });
    view.focus();
  });

  const insertBtn = createActionButton(t("Insert below"), "cm-ai-btn-secondary", () => {
    if (isFileArtifactOperation()) {
      void handleArtifact("embed");
      return;
    }

    if (isFrontmatterOperation()) {
      applyFrontmatter();
      return;
    }

    const state = view.state.field(rewriteField);
    if (!state.operation) return;
    const { to } = state.operation.params;
    const result = state.operation.result;
    hidePanel();
    view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
    view.dispatch({
      changes: { from: to, insert: `\n\n${result}` },
      selection: { anchor: to + result.length + 2 },
    });
    view.focus();
  });

  const retryBtn = createActionButton(t("Try again"), "cm-ai-btn-secondary", () => {
    const state = view.state.field(rewriteField);
    if (!state.operation) return;
    view.dispatch({ effects: startRewriteEffect.of(state.operation.params) });
  });

  const discardBtn = createActionButton(t("Discard"), "cm-ai-btn-danger", () => {
    hidePanel();
    view.dispatch({ effects: cancelRewriteEffect.of(undefined) });
    view.focus();
  });

  actionsBar.append(replaceBtn, insertBtn, retryBtn, discardBtn);
  dom.appendChild(actionsBar);

  return {
    dom,
    update(update: ViewUpdate) {
      const state = update.state.field(rewriteField);
      if (!state.operation) {
        dom.style.display = "none";
        return;
      }

      dom.style.display = "";
      content.textContent = state.operation.result || "";
      if (state.operation.params.artifactKind === "base" || state.operation.params.artifactKind === "canvas") {
        header.textContent = t("AI file suggestion");
        replaceBtn.textContent = t("Create");
        insertBtn.textContent = t("Create & Embed");
        insertBtn.style.display = "";
      } else if (state.operation.params.artifactKind === "frontmatter") {
        header.textContent = t("AI frontmatter suggestion");
        replaceBtn.textContent = state.operation.params.from === state.operation.params.to
          ? t("Insert frontmatter")
          : t("Replace frontmatter");
        insertBtn.style.display = "none";
      } else {
        replaceBtn.textContent = state.operation.params.from === state.operation.params.to
          ? t("Insert at cursor")
          : t("Replace");
        insertBtn.textContent = t("Insert below");
        insertBtn.style.display = "";
      }

      if (state.operation.phase === "done") {
        if (state.operation.params.artifactKind !== "base" && state.operation.params.artifactKind !== "canvas") {
          if (state.operation.params.artifactKind !== "frontmatter") {
            header.textContent = t("AI suggestion");
          }
        }
        actionsBar.style.display = "flex";
      } else {
        header.textContent = t("AI is writing...");
        actionsBar.style.display = "none";
      }
    },
  };
}

function createActionButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `cm-ai-btn ${className}`;
  btn.textContent = label;
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

      if (operation?.phase === "done") {
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
    provide: (field) => [
      showTooltip.from(field, (value) => value.resultTooltip ?? null),
      EditorView.decorations.from(field, (value) => {
        if (value.operation?.phase !== "streaming") {
          return Decoration.none;
        }

        return Decoration.set([
          Decoration.widget({
            widget: new RewriteLoadingWidget(),
            side: 1,
          }).range(value.operation.params.to),
        ]);
      }),
    ],
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
          console.error("[AI Rewrite] Error:", error);
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
