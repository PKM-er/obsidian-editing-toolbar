import { Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type Tooltip, type TooltipView, type ViewUpdate, keymap, showTooltip } from "@codemirror/view";
import { t } from "src/translations/helper";
import { DEFAULT_REWRITE_ACTIONS, type IAIService, type RewriteActionMeta, type RewriteConfig, type RewriteInstruction } from "../types";

interface RewriteStartParams {
  from: number;
  to: number;
  originalText: string;
  instruction: RewriteInstruction;
  customPrompt?: string;
}

interface RewriteOperation {
  phase: "streaming" | "done";
  params: RewriteStartParams;
  result: string;
}

interface RewriteFieldValue {
  operation: RewriteOperation | null;
  toolbarTooltip: Tooltip | null;
  resultTooltip: Tooltip | null;
}

const startRewriteEffect = StateEffect.define<RewriteStartParams>();
const updateRewriteResultEffect = StateEffect.define<string>();
const finishRewriteEffect = StateEffect.define<void>();
const cancelRewriteEffect = StateEffect.define<void>();

function createToolbarTooltipView(view: EditorView, actions: RewriteActionMeta[]): TooltipView {
  const dom = document.createElement("div");
  dom.className = "cm-ai-toolbar";

  const inputRow = document.createElement("div");
  inputRow.className = "cm-ai-toolbar-input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "cm-ai-toolbar-input";
  input.placeholder = t("Ask AI to edit or generate...");

  const submitBtn = document.createElement("button");
  submitBtn.className = "cm-ai-toolbar-submit";
  submitBtn.textContent = "↵";
  submitBtn.title = t("Submit custom instruction");

  inputRow.appendChild(input);
  inputRow.appendChild(submitBtn);
  dom.appendChild(inputRow);

  dom.addEventListener("mousedown", (event) => event.preventDefault());

  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter" && input.value.trim()) {
      event.preventDefault();
      dispatchRewrite(view, "custom", input.value.trim());
    }
    if (event.key === "Escape") {
      event.preventDefault();
      input.blur();
      view.focus();
    }
  });

  submitBtn.addEventListener("click", () => {
    if (input.value.trim()) {
      dispatchRewrite(view, "custom", input.value.trim());
    }
  });

  const actionsContainer = document.createElement("div");
  actionsContainer.className = "cm-ai-toolbar-actions";
  const groups = new Map<string, RewriteActionMeta[]>();
  for (const action of actions) {
    const group = groups.get(action.group) || [];
    group.push(action);
    groups.set(action.group, group);
  }

  for (const [groupName, groupActions] of groups) {
    const group = document.createElement("div");
    group.className = "cm-ai-toolbar-group";

    const label = document.createElement("div");
    label.className = "cm-ai-toolbar-group-label";
    label.textContent = groupName;
    group.appendChild(label);

    for (const action of groupActions) {
      const btn = document.createElement("button");
      btn.className = "cm-ai-toolbar-action";
      btn.textContent = action.label;
      btn.addEventListener("click", () => {
        dispatchRewrite(view, action.instruction);
      });
      group.appendChild(btn);
    }

    actionsContainer.appendChild(group);
  }

  dom.appendChild(actionsContainer);
  return { dom };
}

function dispatchRewrite(view: EditorView, instruction: RewriteInstruction, customPrompt?: string): void {
  const { from, to } = view.state.selection.main;
  if (from === to) return;
  const originalText = view.state.sliceDoc(from, to);
  view.dispatch({
    effects: startRewriteEffect.of({ from, to, originalText, instruction, customPrompt }),
  });
}

function createResultPanelTooltipView(view: EditorView, rewriteField: StateField<RewriteFieldValue>): TooltipView {
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

  const replaceBtn = createActionButton(t("Replace"), "cm-ai-btn-primary", () => {
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

      if (state.operation.phase === "done") {
        header.textContent = t("AI suggestion");
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
  const resolveConfig = (): Required<RewriteConfig> => {
    const config = getConfig?.() ?? {};
    return {
      actions: config.actions ?? DEFAULT_REWRITE_ACTIONS,
      minSelectionLength: config.minSelectionLength ?? 1,
      showToolbarOnSelection: config.showToolbarOnSelection ?? true,
    };
  };

  const rewriteField = StateField.define<RewriteFieldValue>({
    create: () => ({
      operation: null,
      toolbarTooltip: null,
      resultTooltip: null,
    }),
    update(prev, tr) {
      const config = resolveConfig();
      let operation = prev.operation;

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

      const selection = tr.state.selection.main;
      const selectionLength = selection.to - selection.from;
      let toolbarTooltip: Tooltip | null = null;
      let resultTooltip: Tooltip | null = null;

      if (operation === null && config.showToolbarOnSelection && selectionLength >= config.minSelectionLength) {
        if (prev.toolbarTooltip && prev.toolbarTooltip.pos === selection.from) {
          toolbarTooltip = prev.toolbarTooltip;
        } else {
          toolbarTooltip = {
            pos: selection.from,
            above: true,
            create: (view) => createToolbarTooltipView(view, config.actions),
          };
        }
      }

      if (operation !== null) {
        if (prev.resultTooltip && prev.resultTooltip.pos === operation.params.from) {
          resultTooltip = prev.resultTooltip;
        } else {
          resultTooltip = {
            pos: operation.params.from,
            above: false,
            create: (view) => createResultPanelTooltipView(view, rewriteField),
          };
        }
      }

      return {
        operation,
        toolbarTooltip,
        resultTooltip,
      };
    },
    provide: (field) => showTooltip.from(field, (value) => value.resultTooltip ?? value.toolbarTooltip ?? null),
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
