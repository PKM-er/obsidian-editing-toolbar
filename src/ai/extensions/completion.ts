import { Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type Command, type ViewUpdate, WidgetType, keymap } from "@codemirror/view";
import { t } from "src/translations/helper";
import { buildLocalCompletionContext } from "../editorContext";
import { showAIErrorNotice } from "../errorHandling";
import type { CompletionConfig, IAIService } from "../types";

interface CompletionState {
  pos: number;
  text: string;
  status: "loading" | "ready";
}

const setCompletionEffect = StateEffect.define<CompletionState | null>();
const triggerCompletionEffect = StateEffect.define<void>();

const completionField = StateField.define<CompletionState | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCompletionEffect)) return effect.value;
    }
    if (tr.docChanged) return null;
    if (value && tr.state.selection.main.head !== value.pos) return null;
    return value;
  },
});

class GhostTextWidget extends WidgetType {
  text: string;
  showHint: boolean;

  constructor(text: string, showHint: boolean) {
    super();
    this.text = text;
    this.showHint = showHint;
  }

  eq(other: GhostTextWidget): boolean {
    return this.text === other.text && this.showHint === other.showHint;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-ai-ghost-text";
    wrapper.setAttribute("aria-label", t("AI suggestion"));

    const lines = this.text.split("\n");
    const firstLine = document.createElement("span");
    firstLine.className = "cm-ai-ghost-first-line";
    firstLine.textContent = lines[0];
    wrapper.appendChild(firstLine);

    if (this.showHint) {
      const hint = document.createElement("span");
      hint.className = "cm-ai-ghost-hint";
      hint.textContent = t("Press Tab to accept");
      wrapper.appendChild(hint);
    }

    if (lines.length > 1) {
      const rest = document.createElement("div");
      rest.className = "cm-ai-ghost-rest";
      rest.textContent = lines.slice(1).join("\n");
      wrapper.appendChild(rest);
    }

    return wrapper;
  }

  updateDOM(dom: HTMLElement): boolean {
    const lines = this.text.split("\n");
    const firstLine = dom.querySelector(".cm-ai-ghost-first-line");
    const hint = dom.querySelector(".cm-ai-ghost-hint") as HTMLElement | null;
    const rest = dom.querySelector(".cm-ai-ghost-rest") as HTMLElement | null;

    if (firstLine) {
      firstLine.textContent = lines[0];
    }

    if (this.showHint) {
      if (hint) {
        hint.textContent = t("Press Tab to accept");
        hint.style.display = "inline-flex";
      } else {
        const newHint = document.createElement("span");
        newHint.className = "cm-ai-ghost-hint";
        newHint.textContent = t("Press Tab to accept");
        if (firstLine?.nextSibling) {
          dom.insertBefore(newHint, firstLine.nextSibling);
        } else {
          dom.appendChild(newHint);
        }
      }
    } else if (hint) {
      hint.style.display = "none";
    }

    if (lines.length > 1) {
      if (rest) {
        rest.textContent = lines.slice(1).join("\n");
        rest.style.display = "block";
      } else {
        const newRest = document.createElement("div");
        newRest.className = "cm-ai-ghost-rest";
        newRest.textContent = lines.slice(1).join("\n");
        dom.appendChild(newRest);
      }
    } else if (rest) {
      rest.style.display = "none";
    }

    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class LoadingWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-ai-loading cm-ai-loading-pill";
    wrapper.setAttribute("aria-label", t("AI is generating"));

    const visual = document.createElement("span");
    visual.className = "cm-ai-loading-visual";

    const glow = document.createElement("span");
    glow.className = "cm-ai-loading-glow";

    const spinner = document.createElement("span");
    spinner.className = "cm-ai-loading-spinner";

    const label = document.createElement("span");
    label.className = "cm-ai-loading-label";
    label.textContent = t("AI thinking");

    const sheen = document.createElement("span");
    sheen.className = "cm-ai-loading-sheen";
    sheen.setAttribute("aria-hidden", "true");

    visual.appendChild(glow);
    visual.appendChild(spinner);
    wrapper.appendChild(visual);
    wrapper.appendChild(label);
    wrapper.appendChild(sheen);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function createCompletionDecorations(shouldShowHint?: () => boolean) {
  return EditorView.decorations.compute([completionField], (state) => {
    const completion = state.field(completionField);
    if (!completion) {
      return Decoration.none;
    }

    if (completion.status === "loading") {
      return Decoration.set([
        Decoration.widget({
          widget: new LoadingWidget(),
          side: 1,
        }).range(completion.pos),
      ]);
    }

    if (!completion.text) {
      return Decoration.none;
    }

    return Decoration.set([
      Decoration.widget({
        widget: new GhostTextWidget(completion.text, shouldShowHint?.() ?? false),
        side: 1,
      }).range(completion.pos),
    ]);
  });
}

function acceptCompletionInternal(view: EditorView, onAccepted?: () => void): boolean {
  const completion = view.state.field(completionField);
  if (!completion?.text) {
    return false;
  }

  view.dispatch({
    changes: { from: completion.pos, insert: completion.text },
    selection: { anchor: completion.pos + completion.text.length },
    effects: setCompletionEffect.of(null),
  });
  onAccepted?.();
  return true;
}

const dismissCompletion: Command = (view) => {
  if (!view.state.field(completionField)) {
    return false;
  }
  view.dispatch({ effects: setCompletionEffect.of(null) });
  return true;
};

const requestCompletion: Command = (view) => {
  view.dispatch({ effects: triggerCompletionEffect.of(undefined) });
  return true;
};

const completionKeymap = keymap.of([
  { key: "Escape", run: dismissCompletion },
]);

export function inlineCompletion(
  getService: () => IAIService | null,
  getConfig?: () => CompletionConfig,
  shouldShowHint?: () => boolean,
  markHintLearned?: () => void,
): Extension {
  const completionDecorations = createCompletionDecorations(shouldShowHint);
  const tabKeymap = Prec.highest(
    keymap.of([
      { key: "Tab", run: (view) => acceptCompletionInternal(view, markHintLearned) },
    ]),
  );
  const plugin = ViewPlugin.fromClass(
    class {
      private abortController: AbortController | null = null;
      private autoTriggerTimer: ReturnType<typeof setTimeout> | null = null;
      private view: EditorView;
      private ownerDocument: Document;

      constructor(view: EditorView) {
        this.view = view;
        this.ownerDocument = view.dom.ownerDocument;
        this.ownerDocument.addEventListener("keydown", this.handleDocumentKeydown, true);
      }

      private handleDocumentKeydown = (event: KeyboardEvent): void => {
        if (
          event.defaultPrevented ||
          event.key !== "Tab" ||
          event.shiftKey ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          this.view.hasFocus ||
          !this.view.dom.isConnected
        ) {
          return;
        }

        const completion = this.view.state.field(completionField);
        if (!completion?.text || completion.status !== "ready") {
          return;
        }

        const activeElement = this.ownerDocument.activeElement;
        if (activeElement && !this.view.dom.contains(activeElement) && this.isTextInputElement(activeElement)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        acceptCompletionInternal(this.view, markHintLearned);
        this.view.focus();
      };

      private isTextInputElement(element: Element): boolean {
        return !!element.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']");
      }

      update(update: ViewUpdate): void {
        for (const tr of update.transactions) {
          for (const effect of tr.effects) {
            if (effect.is(triggerCompletionEffect)) {
              this.scheduleCompletionStart();
            }
            if (effect.is(setCompletionEffect) && effect.value === null) {
              this.abortController?.abort();
            }
          }
        }

        const config = getConfig?.() ?? { trigger: "manual", delay: 500 };
        if (config.trigger === "auto" && update.docChanged) {
          const inserted = update.state.doc.length >= update.startState.doc.length;
          if (inserted) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const linePrefix = update.state.sliceDoc(line.from, pos);
            if (linePrefix.trim().length >= 2) {
              this.scheduleAutoTrigger(config.delay ?? 500);
            }
          }
        }
      }

      private scheduleAutoTrigger(delay: number): void {
        if (this.autoTriggerTimer) {
          clearTimeout(this.autoTriggerTimer);
        }
        this.autoTriggerTimer = setTimeout(() => {
          void this.startCompletion();
        }, delay);
      }

      private scheduleCompletionStart(): void {
        Promise.resolve().then(() => {
          void this.startCompletion();
        });
      }

      private async startCompletion(): Promise<void> {
        this.abortController?.abort();
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        const service = getService();
        if (!service) {
          return;
        }

        const pos = this.view.state.selection.main.head;
        const { prefix, suffix, context } = buildLocalCompletionContext(this.view, pos);
        let text = "";

        this.view.dispatch({
          effects: setCompletionEffect.of({ pos, text: "", status: "loading" }),
        });

        try {
          for await (const chunk of service.complete({ prefix, suffix, context }, signal)) {
            if (signal.aborted) return;
            text += chunk;
            if (this.view.state.selection.main.head !== pos) {
              this.abortController.abort();
              return;
            }
            this.view.dispatch({ effects: setCompletionEffect.of({ pos, text, status: "ready" }) });
          }

          if (!text) {
            this.view.dispatch({ effects: setCompletionEffect.of(null) });
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          if (!showAIErrorNotice(error)) {
            console.error("[AI Completion] Error:", error);
          }
          this.view.dispatch({ effects: setCompletionEffect.of(null) });
        }
      }

      destroy(): void {
        this.ownerDocument.removeEventListener("keydown", this.handleDocumentKeydown, true);
        this.abortController?.abort();
        if (this.autoTriggerTimer) {
          clearTimeout(this.autoTriggerTimer);
        }
      }
    },
  );

  return [completionField, completionDecorations, tabKeymap, completionKeymap, plugin];
}

export { completionField, setCompletionEffect, triggerCompletionEffect };
