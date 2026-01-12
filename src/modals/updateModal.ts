import {
  App,
  Modal,
  Setting,
  Notice,
  request,
  MarkdownRenderer,
  MarkdownView,
  Component,
} from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
import { DEFAULT_SETTINGS } from "src/settings/settingsData";
import { t } from "src/translations/helper";
import { ConfirmModal } from "src/modals/ConfirmModal";

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
        const lines = response.split("\n");
        let latestVersion = "";
        let content = [];
        let isLatestVersion = false;

        for (const line of lines) {
          if (line.startsWith("## ") && !latestVersion) {
            latestVersion = line.substring(3).trim();
            isLatestVersion = true;
            content.push(line);
          } else if (line.startsWith("## ") && isLatestVersion) {
            // 遇到下一个版本标题，结束收集
            break;
          } else if (isLatestVersion) {
            content.push(line);
          }
        }

        this.changelogContent = content.join("\n");
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
        "editor:toggle-numbered-list": "editing-toolbar:toggle-numbered-list",
        "editor:toggle-bullet-list": "editing-toolbar:toggle-bullet-list",
        "editor:toggle-highlight": "editing-toolbar:toggle-highlight",
        "toggle-highlight": "editing-toolbar:toggle-highlight",
        "editing-toolbar:editor:toggle-bold": "editing-toolbar:toggle-bold",
        "editing-toolbar:editor:toggle-italics":
          "editing-toolbar:toggle-italics",
        "editing-toolbar:editor:toggle-strikethrough":
          "editing-toolbar:toggle-strikethrough",
        "editing-toolbar:editor:toggle-inline-math":
          "editing-toolbar:toggle-inline-math",
        "editing-toolbar:editor:insert-callout":
          "editing-toolbar:insert-callout",
        "editing-toolbar:editor:insert-link": "editing-toolbar:insert-link",
        "cMenuToolbar-Divider-Line": "editingToolbar-Divider-Line",
      };

      let hasChanges = false;
      const settings = this.plugin.settings;

      // 通用命令更新函数
      const updateCommands = (commands: Command[]) => {
        if (!commands || !Array.isArray(commands)) return;

        commands.forEach((cmd) => {
          if (cmd.id && commandMappings[cmd.id]) {
            cmd.id = commandMappings[cmd.id];
            hasChanges = true;
          }
          // 查找格式刷命令并更新图标
          if (cmd.id === "editing-toolbar:format-eraser") {
            cmd.icon = "eraser";
            hasChanges = true;
          }
          if (cmd.id === "editing-toolbar:change-font-color") {
            cmd.icon =
              '<svg width="24" height="24" viewBox="0 0 24 24" focusable="false" fill="currentColor"><g fill-rule="evenodd"><path id="change-font-color-icon" d="M3 18h18v3H3z" style="fill:#2DC26B"></path><path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z"></path></g></svg>';
            hasChanges = true;
          }
          // 递归检查子菜单
          if (cmd.SubmenuCommands) {
            updateCommands(cmd.SubmenuCommands);
          }
        });
      };

      // 检查格式刷命令是否存在的函数
      const checkFormatBrush = (commands: Command[]) => {
        if (!commands || !Array.isArray(commands)) return false;

        for (const cmd of commands) {
          if (cmd.id === "editing-toolbar:toggle-format-brush") {
            return true;
          }
          if (cmd.SubmenuCommands) {
            const hasInSubmenu = checkFormatBrush(cmd.SubmenuCommands);
            if (hasInSubmenu) return true;
          }
        }
        return false;
      };

      // 添加格式刷命令的函数
      const addFormatBrushIfNeeded = (commands: Command[]) => {
        if (!commands || !Array.isArray(commands)) return false;

        if (!checkFormatBrush(commands) && commands.length >= 2) {
          const formatBrushCommand: Command = {
            id: "editing-toolbar:toggle-format-brush",
            name: "Format Brush",
            icon: "paintbrush",
          };

          // 在第三项位置插入格式刷命令
          commands.splice(2, 0, formatBrushCommand);
          return true;
        }
        return false;
      };

      // 检查文本工具子菜单是否存在的函数
      const checkTextTools = (commands: Command[]) => {
        if (!commands || !Array.isArray(commands)) return false;

        for (const cmd of commands) {
          if (cmd.id === "SubmenuCommands-text-tools") {
            return true;
          }
        }
        return false;
      };

      // 添加文本工具子菜单的函数
      const addTextToolsIfNeeded = (commands: Command[]) => {
        if (!commands || !Array.isArray(commands)) return false;

        if (!checkTextTools(commands)) {
          const textToolsSubmenu: Command = {
            id: "SubmenuCommands-text-tools",
            name: "Text Tools",
            icon: "box",
            SubmenuCommands: [
              {
                id: "editing-toolbar:get-plain-text",
                name: "Get Plain Text",
                icon: "lucide-file-text",
              },
              {
                id: "editing-toolbar:smart-symbols",
                name: "Full Half Converter",
                icon: "lucide-at-sign",
              },
              {
                id: "editingToolbar-Divider-Line",
                name: "Line Operations",
                icon: "vertical-split",
              },
              {
                id: "editing-toolbar:insert-blank-lines",
                name: "Insert Blank Lines",
                icon: "lucide-space",
              },
              {
                id: "editing-toolbar:remove-blank-lines",
                name: "Remove Blank Lines",
                icon: "lucide-minimize-2",
              },
              {
                id: "editing-toolbar:split-lines",
                name: "Split Lines",
                icon: "lucide-split",
              },
              {
                id: "editing-toolbar:merge-lines",
                name: "Merge Lines",
                icon: "lucide-merge",
              },
              {
                id: "editing-toolbar:dedupe-lines",
                name: "Dedupe Lines",
                icon: "lucide-filter",
              },
              {
                id: "editingToolbar-Divider-Line",
                name: "Text Processing",
                icon: "vertical-split",
              },
              {
                id: "editing-toolbar:add-wrap",
                name: "Add Prefix/Suffix",
                icon: "lucide-wrap-text",
              },
              {
                id: "editing-toolbar:number-lines",
                name: "Number Lines (Custom)",
                icon: "lucide-list-ordered",
              },
              {
                id: "editing-toolbar:remove-whitespace-trim",
                name: "Trim Line Ends",
                icon: "lucide-scissors",
              },
              {
                id: "editing-toolbar:remove-whitespace-compress",
                name: "Shrink Extra Spaces",
                icon: "lucide-minimize",
              },
              {
                id: "editing-toolbar:remove-whitespace-all",
                name: "Remove All Whitespace",
                icon: "lucide-eraser",
              },
              {
                id: "editingToolbar-Divider-Line",
                name: "Advanced Tools",
                icon: "vertical-split",
              },
              {
                id: "editing-toolbar:list-to-table",
                name: "List to Table",
                icon: "lucide-table",
              },
              {
                id: "editing-toolbar:table-to-list",
                name: "Table to List",
                icon: "lucide-list",
              },
              {
                id: "editing-toolbar:extract-between",
                name: "Extract Between Strings",
                icon: "lucide-brackets",
              },
            ],
          };

          // 添加到命令列表末尾
          //commands.push(textToolsSubmenu);
          const targetIndex = 11;

          if (commands.length >= targetIndex) {
            // 序号 11 存在或刚好是下一个位置，直接插入到 11
            commands.splice(targetIndex, 0, textToolsSubmenu);
          } else {
            // 序号 11 超出了当前数组长度，直接追加到末尾
            commands.push(textToolsSubmenu);
          }
          return true;
        }
        return false;
      };

      // 处理所有配置中的命令
      // 1. 处理主菜单命令
      if (settings.menuCommands) {
        updateCommands(settings.menuCommands);
        if (addFormatBrushIfNeeded(settings.menuCommands)) {
          hasChanges = true;
        }
      }

      // 2. 处理多配置模式下的各种命令
      if (settings.enableMultipleConfig) {
        // 处理跟随样式命令
        if (settings.followingCommands) {
          updateCommands(settings.followingCommands);
          if (addFormatBrushIfNeeded(settings.followingCommands)) {
            hasChanges = true;
          }
        }

        // 处理顶部样式命令
        if (settings.topCommands) {
          updateCommands(settings.topCommands);
          if (addFormatBrushIfNeeded(settings.topCommands)) {
            hasChanges = true;
          }
          // 添加文本工具子菜单到顶部工具栏
          if (addTextToolsIfNeeded(settings.topCommands)) {
            hasChanges = true;
          }
        }

        // 处理固定样式命令
        if (settings.fixedCommands) {
          updateCommands(settings.fixedCommands);
          if (addFormatBrushIfNeeded(settings.fixedCommands)) {
            hasChanges = true;
          }
        }

        // 处理移动样式命令
        if (settings.mobileCommands) {
          updateCommands(settings.mobileCommands);
          if (addFormatBrushIfNeeded(settings.mobileCommands)) {
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        await this.plugin.saveSettings();
        new Notice(t("Command IDs have been successfully repaired!"));
        // 重新加载插件
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      } else {
        new Notice(t("No command IDs need to be repaired"));
      }
    } catch (error) {
      console.error("修复命令ID时出错:", error);
      new Notice(
        t("Error repairing command IDs, please check the console for details")
      );
    }
  }

  async reloadPlugin(pluginName: string): Promise<void> {
    // @ts-ignore
    const { plugins } = this.app;
    try {
      await plugins.disablePlugin(pluginName);
      await plugins.enablePlugin(pluginName);
    } catch (e) {
      console.error(e);
    }
  }

  async restoreDefaultSettings() {
    try {
      // 保留当前版本号和自定义命令
      const currentVersion = this.plugin.settings.lastVersion;
      const customCommands = this.plugin.settings.customCommands;

      // 使用默认设置替换当前设置，但保留版本号和自定义命令
      this.plugin.settings = {
        ...DEFAULT_SETTINGS,
        lastVersion: currentVersion,
        customCommands: customCommands,
      };

      // 保存设置
      await this.plugin.saveSettings();

      new Notice(
        t("Successfully restored default settings! (Custom commands preserved)")
      );

      // 重新加载插件
      this.reloadPlugin(this.plugin.manifest.id);
      this.close();
    } catch (error) {
      console.error("恢复默认设置时出错:", error);
      new Notice(
        t(
          "Error restoring default settings, please check the console for details"
        )
      );
    }
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: "" + this.plugin.manifest.version + "⚡Tips",
    });

    // 版本更新说明
    contentEl.createEl("p", {
      text: t("Notice:"),
    });

    const ul = contentEl.createEl("ul");

    ul.createEl("li", {
      text: t(
        "⚠️This update is not compatible with 2.x version command ids, please click [Repair command] to be compatible"
      ),
    });
    ul.createEl("li", {
      text: t(
        "⚠️If you want to restore the default settings, please click [Restore default settings]"
      ),
    });

    // 创建更新日志容器，但先不加载内容
    this.changelogContainer = contentEl.createDiv({
      cls: "changelog-container",
    });
    this.changelogContainer.createEl("h3", { text: t("Latest Changes") });

    this.changelogContentEl = this.changelogContainer.createDiv({
      cls: "changelog-content",
    });
    // 显示加载中提示
    this.changelogContentEl.setText(t("Loading changelog..."));

    // 异步加载更新日志，不阻塞界面显示
    setTimeout(() => {
      this.loadChangelog();
    }, 100);

    // 数据修复按钮
    new Setting(contentEl)
      .setName(t("🔧Data repair"))
      .setDesc(
        t(
          "This update changed the ID of some commands, please click this button to repair the commands to ensure the toolbar works properly"
        )
      )
      .addButton((button) =>
        button.setButtonText(t("Repair command ID")).onClick(async () => {
          await this.fixCommandIds();
        })
      );

    // 恢复默认设置按钮
    new Setting(contentEl)
      .setName(t("🔄Restore default settings"))
      .setDesc(
        t(
          "This will reset all your custom configurations, but custom commands will be preserved"
        )
      )
      .addButton((button) =>
        button.setButtonText(t("Restore default")).onClick(async () => {
          // 添加确认对话框
          ConfirmModal.show(this.app, {
            message: t(
              "Are you sure you want to restore all settings to default? But custom commands will be preserved."
            ),
            onConfirm: async () => {
              await this.restoreDefaultSettings();
            },
          });
        })
      );

    // 查看完整更新日志按钮
    new Setting(contentEl)
      .setName(t("📋View full changelog"))
      .setDesc(t("Open the complete changelog in your browser"))
      .addButton((button) =>
        button.setButtonText(t("Open changelog")).onClick(() => {
          window.open(
            "https://github.com/PKM-er/obsidian-editing-toolbar/blob/master/CHANGELOG.md",
            "_blank"
          );
        })
      );

    // 关闭按钮
    new Setting(contentEl).addButton((button) =>
      button.setButtonText(t("Close")).onClick(() => {
        this.close();
      })
    );

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
            `,
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
