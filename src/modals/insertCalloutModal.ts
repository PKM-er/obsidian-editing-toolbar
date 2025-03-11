import { App, Modal, Setting, setIcon, DropdownComponent } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";

export class InsertCalloutModal extends Modal {
    public type: string = "note";
    public title: string = "";
    public content: string = "";
    public collapse: "none" | "open" | "closed" = "none";

    // 定义 callout 类型及其对应的图标
    private readonly calloutTypes: Array<{
        type: string,
        aliases: string[],
        icon: string,
        label: string,
        color: string
    }> = [
            {
                type: "note",
                aliases: ["cite"],
                icon: "lucide-pencil",
                label: "Note",
                color: "var(--callout-default)"
            },
            {
                type: "abstract",
                aliases: ["summary", "tldr"],
                icon: "lucide-clipboard-list",
                label: "Abstract",
                color: "var(--callout-summary)"
            },
            {
                type: "info",
                aliases: [],
                icon: "lucide-info",
                label: "Info",
                color: "var(--callout-info)"
            },
            {
                type: "todo",
                aliases: [],
                icon: "lucide-check-circle-2",
                label: "Todo",
                color: "var(--callout-todo)"
            },
            {
                type: "important",
                aliases: [],
                icon: "lucide-flame",
                label: "Important",
                color: "var(--callout-important)"
            },
            {
                type: "tip",
                aliases: ["hint"],
                icon: "lucide-flame",
                label: "Tip",
                color: "var(--callout-tip)"
            },
            {
                type: "success",
                aliases: ["check", "done"],
                icon: "lucide-check",
                label: "Success",
                color: "var(--callout-success)"
            },
            {
                type: "question",
                aliases: ["help", "faq"],
                icon: "help-circle",
                label: "Question",
                color: "var(--callout-question)"
            },
            {
                type: "warning",
                aliases: ["caution", "attention"],
                icon: "lucide-alert-triangle",
                label: "Warning",
                color: "var(--callout-warning)"
            },
            {
                type: "failure",
                aliases: ["fail", "missing"],
                icon: "lucide-x",
                label: "Failure",
                color: "var(--callout-fail)"
            },
            {
                type: "danger",
                aliases: ["error"],
                icon: "lucide-zap",
                label: "Danger",
                color: "var(--callout-error)"
            },
            {
                type: "bug",
                aliases: [],
                icon: "lucide-bug",
                label: "Bug",
                color: "var(--callout-bug)"
            },
            {
                type: "example",
                aliases: [],
                icon: "lucide-list",
                label: "Example",
                color: "var(--callout-example)"
            },
            {
                type: "quote",
                aliases: ["cite"],
                icon: "quote-glyph",
                label: "Quote",
                color: "var(--callout-quote)"
            }
        ];
    constructor(private plugin: editingToolbarPlugin) {
        super(plugin.app);
        this.containerEl.addClass("insert-callout-modal");

        // 如果有选中的文本,则作为初始内容
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (editor) {
            const selectedText = editor.getSelection();
            if (selectedText) {
                this.content = selectedText;
            }
        }
    }

    onOpen() {
        this.display();
    }

    private async display() {
        const { contentEl } = this;
        contentEl.empty();

        // Callout 类型选择
        const typeContainer = contentEl.createDiv("callout-type-container");


        const typeSetting = new Setting(typeContainer)
            .setName(t("Callout Type"))
            .addDropdown((dropdown) => {
                // 添加所有类型选项，包括别名
                this.calloutTypes.forEach(({ type, aliases, label }) => {
                    dropdown.addOption(type, label);
                    // 为每个别名添加选项
                    aliases.forEach(alias => {
                        dropdown.addOption(alias, `${label} (${alias})`);
                    });
                });

                dropdown.setValue(this.type);
                dropdown.onChange((value) => {
                    this.type = value;
                    this.updateIconAndColor(iconContainer, value);
                });
            });

        const iconContainer = typeContainer.createDiv("callout-icon-container");

        this.updateIconAndColor(iconContainer, this.type);
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
            });

        // 按钮
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText(t("Insert"))
                    .setCta()
                    .onClick(() => {
                        this.insertCallout();
                        this.close();
                    })
            )
            .addButton((btn) => {
                btn.setButtonText(t("Cancel"))
                    .setTooltip(t("Cancel"))
                    .onClick(() => this.close());
            });
    }






    private updateIconAndColor(iconContainer: HTMLElement, type: string) {
        // 查找类型定义，包括检查别名
        const typeInfo = this.calloutTypes.find(t =>
            t.type === type || t.aliases.includes(type)
        );

        if (typeInfo) {
            iconContainer.empty();
            setIcon(iconContainer, typeInfo.icon);
            // 设置图标颜色
            iconContainer.style.setProperty("--callout-color", typeInfo.color);
        }
    }


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

        if (editor.getSelection()) {
            // 如果有选中文本，直接替换
            if (!isLineStart && line.trim().length > 0) {
                calloutText = '\n' + calloutText;
            }
            editor.replaceSelection(calloutText);
        } else {
            // 如果光标不在行首且当前行不为空，需要在下一行插入
            if (!isLineStart && line.trim().length > 0) {
                calloutText = '\n' + calloutText;
            }

            // 在光标位置插入
            editor.replaceRange(calloutText, cursor);
        }
    }
}