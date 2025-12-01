import { Modal, App, ButtonComponent } from 'obsidian';

interface ConfirmModalOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void> | void;
}

export class ConfirmModal extends Modal {
    private options: ConfirmModalOptions;

    constructor(app: App, options: ConfirmModalOptions) {
        super(app);
        this.options = {
            title: 'Confirm',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            ...options
        };
    }

    onOpen() {
        const { contentEl } = this;
        // 添加样式
        contentEl.addClass('confirm-modal');
        // 标题
        contentEl.createEl('h2', { text: this.options.title });

        // 消息
        // 消息，使用多个段落元素
        this.options.message.split('\n').forEach(line => {
            contentEl.createEl('p', { text: line });
        });

        // 按钮容器
        const buttonContainer = contentEl.createDiv('confirm-modal-buttons');

        // 取消按钮
        new ButtonComponent(buttonContainer)
            .setButtonText(this.options.cancelText)
            .onClick(() => this.close());

        // 确认按钮
        new ButtonComponent(buttonContainer)
            .setButtonText(this.options.confirmText)
            .setCta()
            .onClick(async () => {
                await this.options.onConfirm();
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    // 静态方法，方便快速调用
    static show(app: App, options: ConfirmModalOptions) {
        new ConfirmModal(app, options).open();
    }

}

