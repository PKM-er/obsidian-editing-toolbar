import { App, Modal, Setting, Notice, request, MarkdownRenderer, MarkdownView, Component } from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
import { DEFAULT_SETTINGS } from "src/settings/settingsData";
import { t } from 'src/translations/helper';

interface Command {
    id: string;
    name: string;
    icon?: string;
    SubmenuCommands?: Command[];
}

export class UpdateNoticeModal extends Modal {
    plugin: editingToolbarPlugin;
    changelogContent: string = "";
    changelogLoaded: boolean = false;
    changelogContainer: HTMLElement;
    changelogContentEl: HTMLElement;

    constructor(app: App, plugin: editingToolbarPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async loadChangelog() {
        try {
            // 尝试从 GitHub 获取最新版本的 CHANGELOG.md 文件
            const response = await request({
                url: `https://raw.githubusercontent.com/PKM-er/obsidian-editing-toolbar/master/CHANGELOG.md`,
                method: "GET",
            });
            
            if (response) {
                // 解析 Markdown 内容，提取最新版本的更新说明
                const lines = response.split('\n');
                let latestVersion = "";
                let content = [];
                let isLatestVersion = false;
                
                for (const line of lines) {
                    if (line.startsWith('## ') && !latestVersion) {
                        latestVersion = line.substring(3).trim();
                        isLatestVersion = true;
                        content.push(line);
                    } else if (line.startsWith('## ') && isLatestVersion) {
                        // 遇到下一个版本标题，结束收集
                        break;
                    } else if (isLatestVersion) {
                        content.push(line);
                    }
                }
                
                this.changelogContent = content.join('\n');
            } else {
                throw new Error("无法获取 Changelog 内容");
            }
        } catch (error) {
            console.error("加载 Changelog 时出错:", error);
            this.changelogContent = `### 无法加载更新说明\n\n请[点击此处查看最新更新说明](https://github.com/PKM-er/obsidian-editing-toolbar/blob/master/CHANGELOG.md)`;
        }
        
        this.changelogLoaded = true;
        this.updateChangelogDisplay();
    }
    
    updateChangelogDisplay() {
        if (!this.changelogContainer || !this.changelogContentEl) return;
        
        if (this.changelogLoaded) {
            // 清空加载提示
            this.changelogContentEl.empty();
            
            // 渲染 Markdown 内容
            MarkdownRenderer.renderMarkdown(
                this.changelogContent,
                this.changelogContentEl,
                "",
                this.plugin as any
            );
        }
    }

    async fixCommandIds() {
        try {
            const commandMappings: { [key: string]: string } = {
                'editor:toggle-numbered-list': 'editing-toolbar:toggle-numbered-list',
                'editor:toggle-bullet-list': 'editing-toolbar:toggle-bullet-list',
                'editor:toggle-highlight': 'editing-toolbar:toggle-highlight',
                'toggle-highlight': 'editing-toolbar:toggle-highlight',
                'editing-toolbar:editor:toggle-bold': 'editing-toolbar:toggle-bold',
                'editing-toolbar:editor:toggle-italics': 'editing-toolbar:toggle-italics',
                'editing-toolbar:editor:toggle-strikethrough': 'editing-toolbar:toggle-strikethrough',
                'editing-toolbar:editor:toggle-inline-math': 'editing-toolbar:toggle-inline-math',
                'editing-toolbar:editor:insert-callout': 'editing-toolbar:insert-callout',
                'editing-toolbar:editor:insert-link': 'editing-toolbar:insert-link'
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
                        // 查找格式刷命令并更新图标
                        if (cmd.id === 'editing-toolbar:format-eraser') {
                            cmd.icon = 'eraser';
                            hasChanges = true;
                        }

                        // 递归检查子菜单
                        if (cmd.SubmenuCommands) {
                            updateCommands(cmd.SubmenuCommands);
                        }
                    });
                };

                updateCommands(settings.menuCommands);

                // 检查是否存在格式刷命令
                let hasFormatBrush = false;
                const checkFormatBrush = (commands: Command[]) => {
                    for (const cmd of commands) {
                        if (cmd.id === 'editing-toolbar:toggle-format-brush') {
                            hasFormatBrush = true;
                            return;
                        }
                        if (cmd.SubmenuCommands) {
                            checkFormatBrush(cmd.SubmenuCommands);
                            if (hasFormatBrush) return;
                        }
                    }
                };

                checkFormatBrush(settings.menuCommands);

                // 如果不存在格式刷命令，在第三项位置添加
                if (!hasFormatBrush && settings.menuCommands.length >= 2) {
                    const formatBrushCommand: Command = {
                        id: "editing-toolbar:toggle-format-brush",
                        name: "Format Brush",
                        icon: "paintbrush"
                    };

                    // 在第三项位置插入格式刷命令
                    settings.menuCommands.splice(2, 0, formatBrushCommand);
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await this.plugin.saveSettings();
                new Notice(t("Command IDs have been successfully repaired!"));
            } else {
                new Notice(t("No command IDs need to be repaired"));
            }
        } catch (error) {
            console.error("修复命令ID时出错:", error);
            new Notice(t("Error repairing command IDs, please check the console for details"));
        }
    }
    
    async reloadPlugin(pluginName: string): Promise<void> {
        // @ts-ignore
        const { plugins } = this.app;
        try {
            await plugins.disablePlugin(pluginName);
            await plugins.enablePlugin(pluginName);
        } catch (e) {
            console.error(e)
        }
    }
    
    async restoreDefaultSettings() {
        try {
            // 保留当前版本号
            const currentVersion = this.plugin.settings.lastVersion;

            // 使用默认设置替换当前设置，但保留版本号
            this.plugin.settings = {
                ...DEFAULT_SETTINGS,
                lastVersion: currentVersion
            };

            // 保存设置
            await this.plugin.saveSettings();

            new Notice(t("Successfully restored default settings!"));
        } catch (error) {
            console.error("恢复默认设置时出错:", error);
            new Notice(t("Error restoring default settings, please check the console for details"));
        }
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "" + this.plugin.manifest.version + "⚡Tips" });

        // 版本更新说明
        contentEl.createEl("p", {
            text: t("Notice:")
        });

        const ul = contentEl.createEl("ul");
        ul.createEl("li", {
            text: t("This update rebuilds the entire code, reducing resource consumption")
        });
        ul.createEl("li", {
            text: t("Optimized mobile usage, added canvas support, and added custom commands")
        });
        ul.createEl("li", {
            text: t("⚠️This update is not compatible with some old version command ids, please click [Repair command] to be compatible")
        });
        ul.createEl("li", {
            text: t("⚠️If you want to restore the default settings, please click [Restore default settings]")
        });

        // 创建更新日志容器，但先不加载内容
        this.changelogContainer = contentEl.createDiv({ cls: "changelog-container" });
        this.changelogContainer.createEl("h3", { text: t("Latest Changes") });
        
        this.changelogContentEl = this.changelogContainer.createDiv({ cls: "changelog-content" });
        // 显示加载中提示
        this.changelogContentEl.setText(t("Loading changelog..."));
        
        // 异步加载更新日志，不阻塞界面显示
        setTimeout(() => {
            this.loadChangelog();
        }, 100);

        // 数据修复按钮
        new Setting(contentEl)
            .setName(t("🔧Data repair"))
            .setDesc(t("This update changed the ID of some commands, please click this button to repair the commands to ensure the toolbar works properly"))
            .addButton(button => button
                .setButtonText(t("Repair command ID"))
                .onClick(async () => {
                    await this.fixCommandIds();
                }));

        // 恢复默认设置按钮
        new Setting(contentEl)
            .setName(t("🔄Restore default settings"))
            .setDesc(t("This will reset all your custom configurations"))
            .addButton(button => button
                .setButtonText(t("Restore default"))
                .onClick(async () => {
                    // 添加确认对话框
                    if (confirm(t("Are you sure you want to restore all settings to default? This will lose all your custom configurations."))) {
                        await this.restoreDefaultSettings();
                    }
                }));

        // 查看完整更新日志按钮
        new Setting(contentEl)
            .setName(t("📋View full changelog"))
            .setDesc(t("Open the complete changelog in your browser"))
            .addButton(button => button
                .setButtonText(t("Open changelog"))
                .onClick(() => {
                    window.open("https://github.com/PKM-er/obsidian-editing-toolbar/blob/master/CHANGELOG.md", "_blank");
                }));

        // 关闭按钮
        new Setting(contentEl)
            .addButton(button => button
                .setButtonText(t("Close"))
                .onClick(() => {
                    this.close();
                }));
                
        // 添加样式
        contentEl.createEl("style", {
            text: `
            .changelog-container {
                margin-top: 20px;
                margin-bottom: 20px;
                padding: 10px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 5px;
                max-height: 200px;
                overflow-y: auto;
            }
            .changelog-content {
                padding: 0 10px;
            }
            .changelog-content a {
                text-decoration: underline;
            }
            `
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 