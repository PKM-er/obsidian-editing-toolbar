import { Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type Command, type ViewUpdate, WidgetType, keymap } from "@codemirror/view";
import { t } from "src/translations/helper";
import { buildLocalCompletionContext } from "../editorContext";
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

  constructor(text: string) {
    super();
    this.text = text;
  }

  eq(other: GhostTextWidget): boolean {
    return this.text === other.text;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-ai-ghost-text";
    wrapper.setAttribute("aria-label", "AI suggestion");

    const lines = this.text.split("\n");
    const firstLine = document.createElement("span");
    firstLine.className = "cm-ai-ghost-first-line";
    firstLine.textContent = lines[0];
    wrapper.appendChild(firstLine);

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
    const rest = dom.querySelector(".cm-ai-ghost-rest") as HTMLElement | null;

    if (firstLine) {
      firstLine.textContent = lines[0];
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
    wrapper.className = "cm-ai-loading";
    wrapper.setAttribute("aria-label", "AI is generating");

    const spinner = document.createElement("span");
    spinner.className = "cm-ai-loading-spinner";

    const label = document.createElement("span");
    label.className = "cm-ai-loading-label";
    label.textContent = t("AI thinking");

    wrapper.appendChild(spinner);
    wrapper.appendChild(label);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const completionDecorations = EditorView.decorations.compute([completionField], (state) => {
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
      widget: new GhostTextWidget(completion.text),
      side: 1,
    }).range(completion.pos),
  ]);
});

const acceptCompletion: Command = (view) => {
  const completion = view.state.field(completionField);
  if (!completion?.text) {
    return false;
  }

  view.dispatch({
    changes: { from: completion.pos, insert: completion.text },
    selection: { anchor: completion.pos + completion.text.length },
    effects: setCompletionEffect.of(null),
  });
  return true;
};

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

const tabKeymap = Prec.highest(
  keymap.of([
    { key: "Tab", run: acceptCompletion },
  ]),
);

const completionKeymap = keymap.of([
  { key: "Escape", run: dismissCompletion },
]);

export function inlineCompletion(
  getService: () => IAIService | null,
  getConfig?: () => CompletionConfig,
): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      private abortController: AbortController | null = null;
      private autoTriggerTimer: ReturnType<typeof setTimeout> | null = null;
      private view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
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
          console.error("[AI Completion] Error:", error);
          this.view.dispatch({ effects: setCompletionEffect.of(null) });
        }
      }

      destroy(): void {
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
