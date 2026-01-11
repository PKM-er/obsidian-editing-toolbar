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

export class TextInputModal extends Modal {
    private result: ITextInputResult = {};
    private onSubmit: (result: ITextInputResult) => void;
    private fields: Array<{
        key: string;
        label: string;
        placeholder?: string;
        defaultValue?: string;
    }>;
    private title: string;

    constructor(
        app: App,
        title: string,
        fields: Array<{
            key: string;
            label: string;
            placeholder?: string;
            defaultValue?: string;
        }>,
        onSubmit: (result: ITextInputResult) => void
    ) {
        super(app);
        this.title = title;
        this.fields = fields;
        this.onSubmit = onSubmit;

        // 初始化默认值
        fields.forEach(field => {
            this.result[field.key] = field.defaultValue || "";
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: this.title });

        // 为每个字段创建输入框
        this.fields.forEach(field => {
            new Setting(contentEl)
                .setName(field.label)
                .addText(text => {
                    text
                        .setPlaceholder(field.placeholder || "")
                        .setValue(field.defaultValue || "")
                        .onChange(value => {
                            this.result[field.key] = value;
                        });

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

    private submit() {
        this.onSubmit(this.result);
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
