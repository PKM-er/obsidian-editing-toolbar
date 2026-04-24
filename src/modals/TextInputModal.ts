import { App, Modal, Setting } from "obsidian";
import { t } from "src/translations/helper";

// 定义输入结果的接口
export interface ITextInputResult {
    [key: string]: string;
}

export interface IWrapInputResult {
    prefix: string;
    suffix: string;
}

export interface IExtractColumnResult {
    delimiter: string;
    column: string;
}

export interface IExtractBetweenResult {
    start: string;
    end: string;
}

export interface ITextInputField {
    key: string;
    label: string;
    placeholder?: string;
    defaultValue?: string;
    multiline?: boolean;
    hideLabel?: boolean;
}

export interface ITextInputSuggestion {
    label: string;
    value: string;
    fieldKey?: string;
    replace?: boolean;
}

export interface ITextInputContextItem {
    label: string;
    preview: string;
    title?: string;
}

export interface ITextInputModalOptions {
    modalClassName?: string;
    suggestions?: ITextInputSuggestion[];
    contextLabel?: string;
    contextItems?: ITextInputContextItem[];
}

export class TextInputModal extends Modal {
    private result: ITextInputResult = {};
    private onSubmit: (result: ITextInputResult) => void;
    private fields: ITextInputField[];
    private title: string;
    private options: ITextInputModalOptions;
    private inputElements: Map<string, HTMLInputElement | HTMLTextAreaElement> = new Map();

    constructor(
        app: App,
        title: string,
        fields: ITextInputField[],
        onSubmit: (result: ITextInputResult) => void,
        options: ITextInputModalOptions = {}
    ) {
        super(app);
        this.title = title;
        this.fields = fields;
        this.onSubmit = onSubmit;
        this.options = options;

        // 初始化默认值
        fields.forEach(field => {
            this.result[field.key] = field.defaultValue || "";
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.inputElements.clear();

        if (this.options.modalClassName) {
            this.modalEl.addClass(this.options.modalClassName);
        }

        contentEl.createEl("h2", { text: this.title });

        // 为每个字段创建输入框
        this.fields.forEach(field => {
            if (field.hideLabel) {
                this.renderFullWidthField(contentEl, field);
                return;
            }

            const setting = new Setting(contentEl).setName(field.label);

            if (field.multiline) {
                setting.addTextArea(textarea => {
                    textarea
                        .setPlaceholder(field.placeholder || "")
                        .setValue(field.defaultValue || "")
                        .onChange(value => {
                            this.result[field.key] = value;
                        });

                    this.inputElements.set(field.key, textarea.inputEl);
                    textarea.inputEl.rows = 5;
                    textarea.inputEl.addClass("editing-toolbar-textarea-input");

                    if (field === this.fields[0]) {
                        setTimeout(() => textarea.inputEl.focus(), 10);
                    }

                    textarea.inputEl.addEventListener("keydown", (e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            this.submit();
                        }
                    });
                });
                return;
            }

            setting.addText(text => {
                text
                    .setPlaceholder(field.placeholder || "")
                    .setValue(field.defaultValue || "")
                    .onChange(value => {
                        this.result[field.key] = value;
                    });

                this.inputElements.set(field.key, text.inputEl);

                // 第一个输入框自动聚焦
                if (field === this.fields[0]) {
                    setTimeout(() => text.inputEl.focus(), 10);
                }

                // 支持回车提交
                text.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        this.submit();
                    }
                });
            });
        });

        if (this.options.contextItems && this.options.contextItems.length > 0) {
            const contextWrap = contentEl.createDiv({ cls: "editing-toolbar-text-input-context" });

            if (this.options.contextLabel) {
                contextWrap.createDiv({
                    cls: "editing-toolbar-text-input-context-label",
                    text: this.options.contextLabel,
                });
            }

            this.options.contextItems.forEach((item) => {
                const contextItemEl = contextWrap.createDiv({ cls: "editing-toolbar-text-input-context-item" });
                contextItemEl.createSpan({
                    cls: "editing-toolbar-text-input-context-item-label",
                    text: item.label,
                });

                const previewEl = contextItemEl.createSpan({
                    cls: "editing-toolbar-text-input-context-item-preview",
                    text: item.preview,
                });

                if (item.title) {
                    previewEl.title = item.title;
                }
            });
        }

        if (this.options.suggestions && this.options.suggestions.length > 0) {
            const suggestionsWrap = contentEl.createDiv({ cls: "editing-toolbar-text-input-suggestions" });
            suggestionsWrap.createDiv({
                cls: "editing-toolbar-text-input-suggestions-label",
                text: t("Suggestions"),
            });

            const chipsWrap = suggestionsWrap.createDiv({ cls: "editing-toolbar-text-input-suggestions-chips" });
            this.options.suggestions.forEach((suggestion) => {
                const button = chipsWrap.createEl("button", {
                    cls: "mod-muted editing-toolbar-text-input-suggestion-chip",
                    text: suggestion.label,
                });

                button.type = "button";
                button.addEventListener("click", () => {
                    this.applySuggestion(suggestion);
                });
            });
        }

        // 添加按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t("Confirm"))
                .setCta()
                .onClick(() => {
                    this.submit();
                }))
            .addButton(btn => btn
                .setButtonText(t("Cancel"))
                .onClick(() => {
                    this.close();
                }));
    }

    private renderFullWidthField(containerEl: HTMLElement, field: ITextInputField) {
        const wrapper = containerEl.createDiv({ cls: "editing-toolbar-text-input-field-full" });

        if (field.multiline) {
            const textareaEl = wrapper.createEl("textarea", {
                cls: "editing-toolbar-textarea-input",
            });
            textareaEl.placeholder = field.placeholder || "";
            textareaEl.value = field.defaultValue || "";
            textareaEl.rows = 5;

            if (field.label) {
                textareaEl.setAttribute("aria-label", field.label);
            }

            this.inputElements.set(field.key, textareaEl);

            if (field === this.fields[0]) {
                setTimeout(() => textareaEl.focus(), 10);
            }

            textareaEl.addEventListener("input", () => {
                this.result[field.key] = textareaEl.value;
            });

            textareaEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.submit();
                }
            });
            return;
        }

        const inputEl = wrapper.createEl("input");
        inputEl.type = "text";
        inputEl.placeholder = field.placeholder || "";
        inputEl.value = field.defaultValue || "";

        if (field.label) {
            inputEl.setAttribute("aria-label", field.label);
        }

        this.inputElements.set(field.key, inputEl);

        if (field === this.fields[0]) {
            setTimeout(() => inputEl.focus(), 10);
        }

        inputEl.addEventListener("input", () => {
            this.result[field.key] = inputEl.value;
        });

        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.submit();
            }
        });
    }

    private submit() {
        this.onSubmit(this.result);
        this.close();
    }

    private applySuggestion(suggestion: ITextInputSuggestion) {
        const targetField = suggestion.fieldKey || this.fields[0]?.key;
        if (!targetField) {
            return;
        }

        const inputEl = this.inputElements.get(targetField);
        if (!inputEl) {
            return;
        }

        const currentValue = this.result[targetField] || "";
        const nextValue = suggestion.replace === false && currentValue.trim().length > 0
            ? `${currentValue.trim()}\n${suggestion.value}`
            : suggestion.value;

        this.result[targetField] = nextValue;
        inputEl.value = nextValue;
        inputEl.focus();

        if (typeof inputEl.selectionStart === "number") {
            const endPos = nextValue.length;
            inputEl.setSelectionRange(endPos, endPos);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.inputElements.clear();

        if (this.options.modalClassName) {
            this.modalEl.removeClass(this.options.modalClassName);
        }
    }
}
