import { App, Modal, Setting, TFile, parseLinktext } from "obsidian";
import { compactContent } from "src/ai/contextCompactor";
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

export interface ITextInputLinkedContextItem {
    fieldKey: string;
    reference: string;
    label: string;
    preview: string;
    title?: string;
    content: string;
    filePath: string;
}

export interface ITextInputSubmitMeta {
    cleanedResult: ITextInputResult;
    linkedContextItems: ITextInputLinkedContextItem[];
    linkedContextByField: Record<string, ITextInputLinkedContextItem[]>;
}

export interface ITextInputLinkedNotesOptions {
    enabled?: boolean;
    fieldKeys?: string[];
    hint?: string;
    contextLabel?: string;
}

export interface ITextInputModalOptions {
    modalClassName?: string;
    suggestions?: ITextInputSuggestion[];
    contextLabel?: string;
    contextItems?: ITextInputContextItem[];
    footerHint?: string;
    linkedNotes?: ITextInputLinkedNotesOptions;
}

interface ILinkedNoteFieldState {
    fieldKey: string;
    inputEl: HTMLInputElement | HTMLTextAreaElement;
    hostEl: HTMLElement;
    dropdownEl: HTMLElement;
    linkStartPos: number;
    selectedSuggestionIndex: number;
    suggestionFiles: TFile[];
}

export class TextInputModal extends Modal {
    private result: ITextInputResult = {};
    private onSubmit: (result: ITextInputResult, meta: ITextInputSubmitMeta) => void | Promise<void>;
    private fields: ITextInputField[];
    private title: string;
    private options: ITextInputModalOptions;
    private inputElements: Map<string, HTMLInputElement | HTMLTextAreaElement> = new Map();
    private linkedNoteFieldStates: Map<string, ILinkedNoteFieldState> = new Map();
    private linkedContextByField: Map<string, ITextInputLinkedContextItem[]> = new Map();
    private linkedContextSyncTokens: Map<string, number> = new Map();
    private linkedContextWrapEl: HTMLElement | null = null;
    private linkedContextItemsEl: HTMLElement | null = null;

    constructor(
        app: App,
        title: string,
        fields: ITextInputField[],
        onSubmit: (result: ITextInputResult, meta: ITextInputSubmitMeta) => void | Promise<void>,
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
        this.linkedNoteFieldStates.clear();
        this.linkedContextByField.clear();
        this.linkedContextSyncTokens.clear();
        this.linkedContextWrapEl = null;
        this.linkedContextItemsEl = null;

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
                    this.attachLinkedNoteSupport(field, textarea.inputEl, textarea.inputEl.parentElement instanceof HTMLElement
                        ? textarea.inputEl.parentElement
                        : setting.controlEl);

                    if (field === this.fields[0]) {
                        setTimeout(() => textarea.inputEl.focus(), 10);
                    }

                    textarea.inputEl.addEventListener("keydown", (e) => {
                        if (this.handleLinkedNoteKeydown(field.key, e)) {
                            return;
                        }

                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            void this.submit();
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
                this.attachLinkedNoteSupport(field, text.inputEl, text.inputEl.parentElement instanceof HTMLElement
                    ? text.inputEl.parentElement
                    : setting.controlEl);

                // 第一个输入框自动聚焦
                if (field === this.fields[0]) {
                    setTimeout(() => text.inputEl.focus(), 10);
                }

                // 支持回车提交
                text.inputEl.addEventListener("keydown", (e) => {
                    if (this.handleLinkedNoteKeydown(field.key, e)) {
                        return;
                    }

                    if (e.key === "Enter") {
                        e.preventDefault();
                        void this.submit();
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

        if (this.hasLinkedNoteSupport()) {
            this.linkedContextWrapEl = contentEl.createDiv({ cls: "editing-toolbar-text-input-context" });
            this.linkedContextWrapEl.style.display = "none";
            this.linkedContextWrapEl.createDiv({
                cls: "editing-toolbar-text-input-context-label",
                text: this.options.linkedNotes?.contextLabel || t("Referenced notes"),
            });
            this.linkedContextItemsEl = this.linkedContextWrapEl.createDiv();
            void this.syncLinkedNoteContextsForEnabledFields();
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

        const footerHints = [
            this.options.linkedNotes?.enabled
                ? (this.options.linkedNotes.hint || t("Type [[]] to reference document content."))
                : "",
            this.options.footerHint || "",
        ].filter((hint) => hint.trim().length > 0);

        if (footerHints.length > 0) {
            const footerHintEl = contentEl.createDiv({ cls: "editing-toolbar-text-input-footer-hint" });
            footerHintEl.textContent = footerHints.join(" ");
        }

        // 添加按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t("Confirm"))
                .setCta()
                .onClick(() => {
                    void this.submit();
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
            this.attachLinkedNoteSupport(field, textareaEl, wrapper);

            if (field === this.fields[0]) {
                setTimeout(() => textareaEl.focus(), 10);
            }

            textareaEl.addEventListener("input", () => {
                this.result[field.key] = textareaEl.value;
            });

            textareaEl.addEventListener("keydown", (e) => {
                if (this.handleLinkedNoteKeydown(field.key, e)) {
                    return;
                }

                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void this.submit();
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
        this.attachLinkedNoteSupport(field, inputEl, wrapper);

        if (field === this.fields[0]) {
            setTimeout(() => inputEl.focus(), 10);
        }

        inputEl.addEventListener("input", () => {
            this.result[field.key] = inputEl.value;
        });

        inputEl.addEventListener("keydown", (e) => {
            if (this.handleLinkedNoteKeydown(field.key, e)) {
                return;
            }

            if (e.key === "Enter") {
                e.preventDefault();
                void this.submit();
            }
        });
    }

    private async submit() {
        await this.syncLinkedNoteContextsForEnabledFields();
        const meta = this.buildSubmitMeta();
        await this.onSubmit(this.result, meta);
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

        if (this.isLinkedNoteField(targetField)) {
            void this.syncLinkedNoteContextForField(targetField, nextValue);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.inputElements.clear();
        this.linkedNoteFieldStates.clear();
        this.linkedContextByField.clear();
        this.linkedContextSyncTokens.clear();
        this.linkedContextWrapEl = null;
        this.linkedContextItemsEl = null;

        if (this.options.modalClassName) {
            this.modalEl.removeClass(this.options.modalClassName);
        }
    }

    private hasLinkedNoteSupport(): boolean {
        return this.options.linkedNotes?.enabled === true;
    }

    private isLinkedNoteField(fieldKey: string): boolean {
        if (!this.hasLinkedNoteSupport()) {
            return false;
        }

        const configuredFieldKeys = this.options.linkedNotes?.fieldKeys;
        if (!configuredFieldKeys || configuredFieldKeys.length === 0) {
            return fieldKey === this.fields[0]?.key;
        }

        return configuredFieldKeys.includes(fieldKey);
    }

    private attachLinkedNoteSupport(
        field: ITextInputField,
        inputEl: HTMLInputElement | HTMLTextAreaElement,
        hostEl: HTMLElement | null | undefined,
    ): void {
        if (!this.isLinkedNoteField(field.key) || !hostEl) {
            return;
        }

        hostEl.addClass("editing-toolbar-text-input-linked-note-host");
        const dropdownEl = hostEl.createDiv({ cls: "editing-toolbar-text-input-mention-dropdown" });
        dropdownEl.style.display = "none";

        this.linkedNoteFieldStates.set(field.key, {
            fieldKey: field.key,
            inputEl,
            hostEl,
            dropdownEl,
            linkStartPos: -1,
            selectedSuggestionIndex: 0,
            suggestionFiles: [],
        });

        inputEl.addEventListener("input", () => {
            const selectionStart = typeof inputEl.selectionStart === "number"
                ? inputEl.selectionStart
                : inputEl.value.length;
            const normalized = this.normalizeLinkTriggerInput(inputEl.value, selectionStart);

            if (normalized.value !== inputEl.value || normalized.cursorPos !== selectionStart) {
                inputEl.value = normalized.value;
                inputEl.setSelectionRange(normalized.cursorPos, normalized.cursorPos);
                this.result[field.key] = normalized.value;
            }

            this.updateLinkedNoteSuggestions(field.key);
            void this.syncLinkedNoteContextForField(field.key, inputEl.value);
        });

        if (inputEl.value.trim().length > 0) {
            void this.syncLinkedNoteContextForField(field.key, inputEl.value);
        }
    }

    private handleLinkedNoteKeydown(fieldKey: string, event: KeyboardEvent): boolean {
        const state = this.linkedNoteFieldStates.get(fieldKey);
        if (!state) {
            return false;
        }

        const isSuggestionVisible = state.dropdownEl.style.display !== "none" && state.suggestionFiles.length > 0;
        if (!isSuggestionVisible) {
            if (event.key === "Escape") {
                state.dropdownEl.style.display = "none";
                state.linkStartPos = -1;
                state.suggestionFiles = [];
            }
            return false;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            state.selectedSuggestionIndex = (state.selectedSuggestionIndex + 1) % state.suggestionFiles.length;
            this.renderLinkedNoteDropdown(state);
            return true;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            state.selectedSuggestionIndex = (state.selectedSuggestionIndex - 1 + state.suggestionFiles.length) % state.suggestionFiles.length;
            this.renderLinkedNoteDropdown(state);
            return true;
        }

        if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey)) {
            event.preventDefault();
            const selectedFile = state.suggestionFiles[state.selectedSuggestionIndex];
            if (selectedFile) {
                void this.selectLinkedNoteSuggestion(state, selectedFile);
            }
            return true;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            state.dropdownEl.style.display = "none";
            state.linkStartPos = -1;
            state.suggestionFiles = [];
            return true;
        }

        return false;
    }

    private updateLinkedNoteSuggestions(fieldKey: string): void {
        const state = this.linkedNoteFieldStates.get(fieldKey);
        if (!state) {
            return;
        }

        const cursorPos = typeof state.inputEl.selectionStart === "number"
            ? state.inputEl.selectionStart
            : state.inputEl.value.length;
        const textBeforeCursor = state.inputEl.value.substring(0, cursorPos);
        const linkMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);

        if (!linkMatch) {
            state.dropdownEl.style.display = "none";
            state.linkStartPos = -1;
            state.suggestionFiles = [];
            return;
        }

        state.linkStartPos = textBeforeCursor.lastIndexOf("[[");
        const query = linkMatch[1].toLowerCase();
        const currentFile = this.app.workspace.getActiveFile();
        const filteredFiles = this.app.vault.getMarkdownFiles()
            .filter((file) => file.basename.toLowerCase().includes(query) || file.path.toLowerCase().includes(query))
            .sort((left, right) => {
                if (currentFile && left.path === currentFile.path) {
                    return -1;
                }
                if (currentFile && right.path === currentFile.path) {
                    return 1;
                }
                return left.path.localeCompare(right.path);
            })
            .slice(0, 10);

        state.suggestionFiles = filteredFiles;
        state.selectedSuggestionIndex = 0;

        if (filteredFiles.length === 0) {
            state.dropdownEl.style.display = "none";
            return;
        }

        this.renderLinkedNoteDropdown(state);
    }

    private renderLinkedNoteDropdown(state: ILinkedNoteFieldState): void {
        state.dropdownEl.empty();

        state.suggestionFiles.forEach((file, index) => {
            const itemEl = state.dropdownEl.createDiv({ cls: "editing-toolbar-text-input-mention-item" });
            itemEl.toggleClass("selected", index === state.selectedSuggestionIndex);

            itemEl.createSpan({
                cls: "editing-toolbar-text-input-mention-icon",
                text: "📄",
            });
            itemEl.createSpan({
                cls: "editing-toolbar-text-input-mention-name",
                text: file.basename,
            });
            itemEl.createSpan({
                cls: "editing-toolbar-text-input-mention-path",
                text: file.path,
            });

            itemEl.addEventListener("mousedown", (event) => {
                event.preventDefault();
                void this.selectLinkedNoteSuggestion(state, file);
            });
        });

        state.dropdownEl.style.display = "block";
        const selectedItem = state.dropdownEl.querySelectorAll<HTMLElement>(".editing-toolbar-text-input-mention-item")[state.selectedSuggestionIndex];
        selectedItem?.scrollIntoView({ block: "nearest" });
    }

    private async selectLinkedNoteSuggestion(state: ILinkedNoteFieldState, file: TFile): Promise<void> {
        const cursorPos = typeof state.inputEl.selectionStart === "number"
            ? state.inputEl.selectionStart
            : state.inputEl.value.length;
        const sourcePath = this.app.workspace.getActiveFile()?.path ?? "";
        const linkText = this.app.metadataCache.fileToLinktext(file, sourcePath, true);
        const beforeLink = state.inputEl.value.substring(0, state.linkStartPos);
        const afterCursor = state.inputEl.value.substring(cursorPos);
        const nextValue = `${beforeLink}[[${linkText}]] ${afterCursor}`;

        state.inputEl.value = nextValue;
        this.result[state.fieldKey] = nextValue;
        state.dropdownEl.style.display = "none";
        state.suggestionFiles = [];
        state.linkStartPos = -1;

        state.inputEl.focus();
        const nextCursorPos = beforeLink.length + linkText.length + 5;
        state.inputEl.setSelectionRange(nextCursorPos, nextCursorPos);

        await this.syncLinkedNoteContextForField(state.fieldKey, nextValue);
    }

    private normalizeLinkTriggerInput(value: string, cursorPos: number): { value: string; cursorPos: number } {
        let normalizedValue = value;
        let normalizedCursorPos = cursorPos;

        if (normalizedValue.includes("【【")) {
            const beforeCursor = normalizedValue.substring(0, normalizedCursorPos);
            const afterCursor = normalizedValue.substring(normalizedCursorPos);
            const normalizedBeforeCursor = beforeCursor.replace(/【【/g, "[[");
            const normalizedAfterCursor = afterCursor.replace(/【【/g, "[[");
            normalizedValue = normalizedBeforeCursor + normalizedAfterCursor;
            normalizedCursorPos -= beforeCursor.length - normalizedBeforeCursor.length;
        }

        const openingBracketRun = normalizedValue.substring(0, normalizedCursorPos).match(/(?:\[|【){2,}$/);
        if (openingBracketRun && openingBracketRun[0].includes("【")) {
            const runStart = normalizedCursorPos - openingBracketRun[0].length;
            normalizedValue = `${normalizedValue.substring(0, runStart)}[[${normalizedValue.substring(normalizedCursorPos)}`;
            normalizedCursorPos = runStart + 2;
        }

        return {
            value: normalizedValue,
            cursorPos: normalizedCursorPos,
        };
    }

    private async syncLinkedNoteContextsForEnabledFields(): Promise<void> {
        const syncTasks: Promise<void>[] = [];
        this.fields.forEach((field) => {
            if (!this.isLinkedNoteField(field.key)) {
                return;
            }

            const inputEl = this.inputElements.get(field.key);
            const value = inputEl?.value ?? this.result[field.key] ?? "";
            syncTasks.push(this.syncLinkedNoteContextForField(field.key, value));
        });

        await Promise.all(syncTasks);
    }

    private async syncLinkedNoteContextForField(fieldKey: string, value: string): Promise<void> {
        const nextToken = (this.linkedContextSyncTokens.get(fieldKey) ?? 0) + 1;
        this.linkedContextSyncTokens.set(fieldKey, nextToken);
        const linkedItems = await this.resolveLinkedContextItems(fieldKey, value);

        if (this.linkedContextSyncTokens.get(fieldKey) !== nextToken) {
            return;
        }

        this.linkedContextByField.set(fieldKey, linkedItems);
        this.renderLinkedContextItems();
    }

    private async resolveLinkedContextItems(fieldKey: string, value: string): Promise<ITextInputLinkedContextItem[]> {
        const sourcePath = this.app.workspace.getActiveFile()?.path ?? "";
        const linkMatches = Array.from(value.matchAll(/\[\[([^\]]+)\]\]/g));
        const resolvedItems: ITextInputLinkedContextItem[] = [];
        const seenFilePaths = new Set<string>();

        for (const match of linkMatches) {
            const rawReference = match[1]?.trim();
            if (!rawReference) {
                continue;
            }

            const [linkTextWithoutAlias, aliasText] = rawReference.split("|");
            const parsedLink = parseLinktext((linkTextWithoutAlias || "").trim());
            if (!parsedLink.path) {
                continue;
            }

            const file = this.app.metadataCache.getFirstLinkpathDest(parsedLink.path, sourcePath);
            if (!file || seenFilePaths.has(file.path)) {
                continue;
            }

            seenFilePaths.add(file.path);

            try {
                const rawContent = await this.app.vault.cachedRead(file);
                const content = compactContent(rawContent);
                const previewText = content.replace(/\s+/g, " ").trim();
                const shortPreview = previewText.length > 80 ? `${previewText.slice(0, 80)}...` : previewText;
                const displayName = aliasText?.trim() || file.basename;
                const title = content.length > 140 ? `${content.slice(0, 140)}...` : content;

                resolvedItems.push({
                    fieldKey,
                    reference: `[[${rawReference}]]`,
                    label: `📄 ${displayName}`,
                    preview: `${shortPreview} (${content.length.toLocaleString()} chars)`,
                    title: title || file.path,
                    content,
                    filePath: file.path,
                });
            } catch (error) {
                console.error(`[TextInputModal] Failed to read linked file: ${rawReference}`, error);
            }
        }

        return resolvedItems;
    }

    private renderLinkedContextItems(): void {
        if (!this.linkedContextWrapEl || !this.linkedContextItemsEl) {
            return;
        }

        this.linkedContextItemsEl.empty();
        const linkedItems = Array.from(this.linkedContextByField.values()).flat();

        if (linkedItems.length === 0) {
            this.linkedContextWrapEl.style.display = "none";
            return;
        }

        this.linkedContextWrapEl.style.display = "block";
        linkedItems.forEach((item) => {
            const contextItemEl = this.linkedContextItemsEl?.createDiv({ cls: "editing-toolbar-text-input-context-item" });
            contextItemEl?.createSpan({
                cls: "editing-toolbar-text-input-context-item-label",
                text: item.label,
            });

            const previewEl = contextItemEl?.createSpan({
                cls: "editing-toolbar-text-input-context-item-preview",
                text: item.preview,
            });

            if (previewEl && item.title) {
                previewEl.title = item.title;
            }
        });
    }

    private buildSubmitMeta(): ITextInputSubmitMeta {
        const cleanedResult: ITextInputResult = {};
        const linkedContextByField: Record<string, ITextInputLinkedContextItem[]> = {};
        const linkedContextItems: ITextInputLinkedContextItem[] = [];

        this.fields.forEach((field) => {
            const value = this.result[field.key] ?? "";
            cleanedResult[field.key] = this.isLinkedNoteField(field.key)
                ? this.stripWikiLinkSyntax(value)
                : value;

            const linkedItems = [...(this.linkedContextByField.get(field.key) ?? [])];
            linkedContextByField[field.key] = linkedItems;
            linkedContextItems.push(...linkedItems);
        });

        return {
            cleanedResult,
            linkedContextItems,
            linkedContextByField,
        };
    }

    private stripWikiLinkSyntax(value: string): string {
        return value
            .replace(/\[\[([^\]]+)\]\]/g, (_match: string, linkText: string) => {
                const [target, alias] = String(linkText).split("|");
                return (alias || target || "").trim();
            })
            .trim();
    }
}
