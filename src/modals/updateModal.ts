import { App, Modal, Setting, Notice } from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
interface Command {
    id: string;
    SubmenuCommands?: Command[];
}

export class UpdateNoticeModal extends Modal {
    plugin: editingToolbarPlugin;

    constructor(app: App, plugin: editingToolbarPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async fixCommandIds() {
        try {
            const commandMappings: { [key: string]: string } = {
                'editor:toggle-numbered-list': 'editing-toolbar:toggle-numbered-list',
                'editor:toggle-bullet-list': 'editing-toolbar:toggle-bullet-list',
                'editor:toggle-highlight': 'editing-toolbar:toggle-highlight',
                'editing-toolbar:editor:toggle-bold': 'editing-toolbar:toggle-bold',
                'editing-toolbar:editor:toggle-italics': 'editing-toolbar:toggle-italics',
                'editing-toolbar:editor:toggle-strikethrough': 'editing-toolbar:toggle-strikethrough',
                'editing-toolbar:editor:toggle-inline-math': 'editing-toolbar:toggle-inline-math'
            };
    
            let hasChanges = false;
            const settings = this.plugin.settings;
    
            // 遍历菜单命令
            if (settings.menuCommands) {
                const updateCommands = (commands: Command[]) => {
                    commands.forEach(cmd => {
                        if (cmd.id && commandMappings[cmd.id]) {
                            cmd.id = commandMappings[cmd.id];
                            hasChanges = true;
                        }
                        // 递归检查子菜单
                        if (cmd.SubmenuCommands) {
                            updateCommands(cmd.SubmenuCommands);
                        }
                    });
                };
    
                updateCommands(settings.menuCommands);
            }
    
            if (hasChanges) {
                await this.plugin.saveSettings();
                new Notice("命令ID已成功修复！");
            } else {
                new Notice("没有需要修复的命令ID");
            }
        } catch (error) {
            console.error("修复命令ID时出错:", error);
            new Notice("更新命令ID时出错，请查看控制台了解详情");
        }
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: ""+this.plugin.manifest.version+"⚡更新提示" });

        // 版本更新说明
        contentEl.createEl("p", { 
            text: "主要更新内容：" 
        });
        
        const ul = contentEl.createEl("ul");
        ul.createEl("li", { 
            text: "修复了部分命令ID不兼容的问题" 
        });
        ul.createEl("li", { 
            text: "优化了移动端的使用体验" 
        });
        ul.createEl("li", { 
            text: "提升了整体性能表现" 
        });

        // 数据修复按钮
        new Setting(contentEl)
            .setName("🔧数据修复")
            .setDesc("此次更新更改了部分命令的ID，为了保证工具栏正常工作，请点击此按钮修复命令")
            .addButton(button => button
                .setButtonText("修复命令ID")
                .onClick(async () => {
                    await this.fixCommandIds();
                }));

        // 关闭按钮
        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("关闭")
                .onClick(() => {
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 