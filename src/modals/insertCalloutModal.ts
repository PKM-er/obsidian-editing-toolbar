import { App, Modal, Setting, setIcon, DropdownComponent, Platform } from "obsidian";
import editingToolbarPlugin, { AdmonitionDefinition } from "src/plugin/main";
import { t } from "src/translations/helper";
interface BuiltInCalloutType {
    type: string;
    aliases: string[];
    icon: string; 
    label: string;
    color: string; // CSS variable or color string
}
interface AdmonitionIconDefinition {
    name: string;
    type:  string; // 'default' means Admonition handles it
    svg?: string; // If it's custom SVG
}
interface CombinedCalloutTypeInfo {
    type: string;       // The actual callout type string (e.g., 'note', 'ad-warning')
    label: string;      // Display label in the dropdown
    icon: string | AdmonitionIconDefinition;
    color: string;      // CSS variable or actual color string
    isAdmonition: boolean; // Flag to distinguish
    sourcePlugin?: string; // Optional: to indicate it's from 'Admonition Plugin'
}
export class InsertCalloutModal extends Modal {
    public type: string = "note";
    public title: string = "";
    public content: string = "";
    public collapse: "none" | "open" | "closed" = "none";
    private insertButton: HTMLElement;
    private contentTextArea: HTMLTextAreaElement;
    private allCalloutOptions: CombinedCalloutTypeInfo[] = [];
    private iconContainerEl: HTMLElement; 
    // 定义 callout 类型及其对应的图标
    private readonly builtInCalloutTypes: Array<BuiltInCalloutType> = [
        { type: "note", aliases: [], icon: "lucide-pencil", label: "Note", color: "var(--callout-default)" },
        { type: "abstract", aliases: ["summary", "tldr"], icon: "lucide-clipboard-list", label: "Abstract", color: "var(--callout-summary)" },
        { type: "info", aliases: [], icon: "lucide-info", label: "Info", color: "var(--callout-info)" },
        { type: "todo", aliases: [], icon: "lucide-check-circle-2", label: "Todo", color: "var(--callout-todo)" },
        { type: "important", aliases: [], icon: "lucide-flame", label: "Important", color: "var(--callout-important)" },
        { type: "tip", aliases: ["hint"], icon: "lucide-flame", label: "Tip", color: "var(--callout-tip)" },
        { type: "success", aliases: ["check", "done"], icon: "lucide-check", label: "Success", color: "var(--callout-success)" },
        { type: "question", aliases: ["help", "faq"], icon: "lucide-help-circle", label: "Question", color: "var(--callout-question)" },
        { type: "warning", aliases: ["caution", "attention"], icon: "lucide-alert-triangle", label: "Warning", color: "var(--callout-warning)" },
        { type: "failure", aliases: ["fail", "missing"], icon: "lucide-x", label: "Failure", color: "var(--callout-fail)" },
        { type: "danger", aliases: ["error"], icon: "lucide-zap", label: "Danger", color: "var(--callout-error)" },
        { type: "bug", aliases: [], icon: "lucide-bug", label: "Bug", color: "var(--callout-bug)" },
        { type: "example", aliases: [], icon: "lucide-list", label: "Example", color: "var(--callout-example)" },
        { type: "quote", aliases: ["cite"], icon: "lucide-quote", label: "Quote", color: "var(--callout-quote)" }
    ];
    constructor(private plugin: editingToolbarPlugin) {
        super(plugin.app);
        this.containerEl.addClass("insert-callout-modal");
        this.prepareCalloutOptions();
        // 如果有选中的文本,则作为初始内容
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (editor) {
            const selectedText = editor.getSelection();
            if (selectedText) {
                this.content = selectedText;
            }
        }
        if (!this.allCalloutOptions.find(opt => opt.type === this.type)) {
            this.type = this.allCalloutOptions.length > 0 ? this.allCalloutOptions[0].type : "note";
        }
    }
    private prepareCalloutOptions() {
        // 1. Add built-in types
        this.builtInCalloutTypes.forEach(bt => {
            this.allCalloutOptions.push({
                type: bt.type,
                label: bt.label,
                icon: bt.icon, // IconName
                color: bt.color,
                isAdmonition: false
            });
            // Add aliases for built-in types
            bt.aliases.forEach(alias => {
                this.allCalloutOptions.push({
                    type: alias,
                    label: `${bt.label} (${alias})`,
                    icon: bt.icon,
                    color: bt.color,
                    isAdmonition: false
                });
            });
        });
        // 2. Add types from Admonition plugin
        if (this.plugin.admonitionDefinitions) {
            const admonitionTypes = Object.values(this.plugin.admonitionDefinitions);
            if (admonitionTypes.length > 0) {
                admonitionTypes.forEach(ad => {
                    // Avoid duplicates if a built-in type has the same name
                    if (!this.allCalloutOptions.some(opt => opt.type === ad.type)) {
                        this.allCalloutOptions.push({
                            type: ad.type,
                            label: ad.title || ad.type.charAt(0).toUpperCase() + ad.type.slice(1), // Use admonition title or formatted type
                            icon: ad.icon, // AdmonitionIconDefinition
                            color: `rgb(${ad.color})`, // Admonition color is usually "R,G,B"
                            isAdmonition: true,
                            sourcePlugin: "Admonition"
                        });
                    }
                });
            }
        }
        
    }

    onOpen() {
        this.display();
    }

    private async display() {
        const { contentEl } = this;
        contentEl.empty();

        // 添加键盘事件监听器到整个模态框
        contentEl.addEventListener('keydown', (event) => {
            // 检测 Ctrl+Enter 或 Command+Enter
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (this.insertButton) {
                    this.insertButton.click();
                }
            }
        });

        const typeContainer = contentEl.createDiv("callout-type-container");
        // Ensure iconContainerEl is created fresh each time display is called
        this.iconContainerEl = typeContainer.createDiv("callout-icon-container");
        new Setting(typeContainer)
            .setName(t("Callout Type"))
            .addDropdown((dropdown: DropdownComponent) => {
                // Populate built-in types first
                const builtIns = this.allCalloutOptions.filter(opt => !opt.isAdmonition);
           
                // Add admonition types, with a separator if there are both kinds
                const admonitions = this.allCalloutOptions.filter(opt => opt.isAdmonition);
                if (builtIns.length > 0 && admonitions.length > 0) {
                    // Add a visual separator. DropdownComponent doesn't directly support <optgroup> or disabled options as separators.
                    // A common workaround is an option with a distinct value and visual cue.
                    dropdown.addOption("---separator---", "---- Admonitions ----");
                    const separatorOption = dropdown.selectEl.options[dropdown.selectEl.options.length - 1];
                    if (separatorOption) {
                        separatorOption.disabled = true;
                    }
                }
                admonitions.forEach(opt => {
                    dropdown.addOption(opt.type, `${opt.label} (Admonition)`);
                });
                dropdown.addOption("---separator---", "---- Default ----");
                builtIns.forEach(opt => {
                    dropdown.addOption(opt.type, opt.label);
                });
                // Ensure the current `this.type` is valid and selected
                if (!this.allCalloutOptions.some(opt => opt.type === this.type)) {
                    this.type = this.allCalloutOptions.length > 0 ? this.allCalloutOptions[0].type : "note";
                }
                dropdown.setValue(this.type);
                dropdown.onChange((value) => {
                    if (value === "---separator---") {
                        // If the separator is somehow selected, revert to the previous valid type
                        dropdown.setValue(this.type);
                        return;
                    }
                    this.type = value;
                    this.updateIconAndColor(this.iconContainerEl, value); // Pass the iconContainerEl
                });
            });
        this.updateIconAndColor(this.iconContainerEl, this.type); // Initial icon update

        // 标题输入
        const titleSetting = new Setting(contentEl)
            .setName(t("Title"))
            .setDesc(t("Optional, leave blank for default title"))
            .addText((text) => {
                text.setPlaceholder(t("Input title"))
                    .setValue(this.title)
                    .onChange((value) => {
                        this.title = value;
                    });
            });

        // 折叠选项
        new Setting(contentEl)
            .setName(t("Collapse State"))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", t("Default"))
                    .addOption("open", t("Open"))
                    .addOption("closed", t("Closed"))
                    .setValue(this.collapse)
                    .onChange((value: "none" | "open" | "closed") => {
                        this.collapse = value;
                    });
            });

        // 内容输入
        const contentSetting = new Setting(contentEl)
            .setName(t("Content"))
            .addTextArea((text) => {
                text.setPlaceholder(t("Input content"))
                    .setValue(this.content)
                    .onChange((value) => {
                        this.content = value;
                    });
                text.inputEl.rows = 5;
                text.inputEl.cols = 40;
                this.contentTextArea = text.inputEl;
            });

        // 添加快捷键提示
        const shortcutHint = contentEl.createDiv("shortcut-hint");
        shortcutHint.setText(`${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${t("to insert")}`);
        shortcutHint.style.textAlign = "right";
        shortcutHint.style.fontSize = "0.8em";
        shortcutHint.style.opacity = "0.7";
        shortcutHint.style.marginTop = "5px";

        // 按钮
        new Setting(contentEl)
            .addButton((btn) => {
                btn
                    .setButtonText(t("Insert"))
                    .setCta()
                    .onClick(() => {
                        this.insertCallout();
                        this.close();
                    });
                this.insertButton = btn.buttonEl;
                return btn;
            })
            .addButton((btn) => {
                btn.setButtonText(t("Cancel"))
                    .setTooltip(t("Cancel"))
                    .onClick(() => this.close());
                return btn;
            });

        // 自动聚焦到内容文本框
        setTimeout(() => {
            if (this.contentTextArea) {
                this.contentTextArea.focus();
            }
        }, 10);
    }
    private updateIconAndColor(iconContainer: HTMLElement, typeKey: string) {
        if (!iconContainer) return; // Guard against null iconContainer
        const typeInfo = this.allCalloutOptions.find(t => t.type === typeKey);
        iconContainer.empty(); // Clear previous icon
        if (typeInfo) {
            if (typeInfo.isAdmonition) {
                const adIcon = typeInfo.icon as AdmonitionIconDefinition;
                if (adIcon.type === 'custom' && adIcon.svg) {
                    // Admonition custom SVG icon
                    iconContainer.innerHTML = adIcon.svg; // Directly set SVG content
                    const svgEl = iconContainer.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.fill = typeInfo.color; // Set fill color for custom SVG
                        svgEl.style.width = "var(--icon-size)"; // Use Obsidian's icon size variable
                        svgEl.style.height = "var(--icon-size)";
                    }
                } else if ( adIcon.name.startsWith('lucide-')) {
                    // Admonition using a Lucide icon
                    setIcon(iconContainer, adIcon.name);
                    iconContainer.style.setProperty("--callout-color", typeInfo.color);
                } else if (adIcon.type === 'default') { // Admonition's own default icon handling
                    setIcon(iconContainer, adIcon.name); // May not always be a valid IconName
                    iconContainer.style.setProperty("--callout-color", typeInfo.color);
                } else {
                    // Other Admonition icon types not explicitly handled, use a placeholder
                    setIcon(iconContainer, "lucide-box");
                    iconContainer.style.setProperty("--callout-color", typeInfo.color);
                }
            } else {
                // Built-in callout type
                setIcon(iconContainer, typeInfo.icon as string);
                iconContainer.style.setProperty("--callout-color", typeInfo.color);
            }
        } else {
            // Fallback if typeInfo is not found (should not happen if dropdown is correct)
            setIcon(iconContainer, "lucide-alert-circle"); // Default error icon
            iconContainer.style.removeProperty("--callout-color");
        }
    }

    // private updateIconAndColor(iconContainer: HTMLElement, type: string) {
    //     // 查找类型定义，包括检查别名
    //     const typeInfo = this.calloutTypes.find(t =>
    //         t.type === type || t.aliases.includes(type)
    //     );

    //     if (typeInfo) {
    //         iconContainer.empty();
    //         setIcon(iconContainer, typeInfo.icon);
    //         // 设置图标颜色
    //         iconContainer.style.setProperty("--callout-color", typeInfo.color);
    //     }
    // }

    private insertCallout() {
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (!editor) return;

        // 构建 callout 文本
        let calloutText = `> [!${this.type}]`;
        // 添加折叠状态
        if (this.collapse !== "none") {
            calloutText += `${this.collapse === "open" ? "+" : "-"}`;
        }
        // 添加标题
        if (this.title) {
            calloutText += ` ${this.title}`;
        }

        // 添加内容
        calloutText += `\n> ${this.content.replace(/\n/g, '\n> ')}`;

        // 获取当前光标位置
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const isLineStart = cursor.ch === 0;

        let newCursorPos: { line: number, ch: number };

        if (editor.getSelection()) {
            // 如果有选中文本，直接替换
            if (!isLineStart && line.trim().length > 0) {
                calloutText = '\n' + calloutText;
            }
            const selectionStart = editor.getCursor('from');
            editor.replaceSelection(calloutText);
            
            // 计算新的光标位置（callout 下方）
            const calloutLines = calloutText.split('\n').length;
            newCursorPos = {
                line: selectionStart.line + calloutLines,
                ch: 0
            };
        } else {
            // 如果光标不在行首且当前行不为空，需要在下一行插入
            if (!isLineStart && line.trim().length > 0) {
                calloutText = '\n' + calloutText;
            }

            // 在光标位置插入
            editor.replaceRange(calloutText, cursor);
            
            // 计算新的光标位置（callout 下方）
            const calloutLines = calloutText.split('\n').length;
            newCursorPos = {
                line: cursor.line + calloutLines,
                ch: 0
            };
        }

        // 在下一个事件循环中设置光标位置，确保编辑器已更新
        setTimeout(() => {
            // 在 callout 下方插入一个空行
            editor.replaceRange('\n', newCursorPos);
            // 将光标移动到空行
            editor.setCursor({
                line: newCursorPos.line + 1,
                ch: 0
            });
            // 确保编辑器获得焦点
            editor.focus();
        }, 0);
    }
}