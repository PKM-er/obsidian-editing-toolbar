import { settings } from "cluster";
import { App, Modal, Setting, Notice, TextAreaComponent, ButtonComponent } from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
import { ConfirmModal } from "src/modals/ConfirmModal";
export class ImportExportModal extends Modal {
  plugin: editingToolbarPlugin;
  mode: 'import' | 'export';
  exportType: 'all' | 'All commands' | 'custom' | 'following' | 'top' | 'fixed' | 'mobile';
  importMode: 'overwrite' | 'update';
  textArea: TextAreaComponent;
  importButton: ButtonComponent;
  warningContent: HTMLElement;

  constructor(app: App, plugin: editingToolbarPlugin, mode: 'import' | 'export') {
    super(app);
    this.plugin = plugin;
    this.mode = mode;
    this.exportType = 'all';
    this.importMode = 'update'; // 默认为更新导入模式
  }

  onOpen() {
    const { contentEl } = this;

    // 添加样式
    contentEl.addClass('editing-toolbar-import-export-modal');

    contentEl.createEl('h2', {
      text: this.mode === 'import' ? t('Import Configuration') : t('Export Configuration'),
      cls: 'import-export-title'
    });

    if (this.mode === 'export') {
      // 导出模式 - 选择导出内容
      new Setting(contentEl)
        .setName(t('Export Type'))
        .setDesc(t('Choose what to export'))
        .addDropdown(dropdown => {
          dropdown
            .addOption('all', t('All Settings'))
            .addOption('All commands', t('All Toolbar Commands'))
            .addOption('custom', t('Custom Commands Only'))
          if (this.plugin.settings.enableMultipleConfig) {
            dropdown
              .addOption('following', t('Following Style Only'))
              .addOption('top', t('Top Style Only'))
              .addOption('fixed', t('Fixed Style Only'))
              .addOption('mobile', t('Mobile Style Only'))
          }

          dropdown.setValue(this.exportType)
            .onChange(value => {
              this.exportType = value as 'all' | 'All commands' | 'custom' | 'following' | 'top' | 'fixed' | 'mobile';
              this.updateExportContent();
            });
        });

      // 添加导出内容文本区域
      const exportContainer = contentEl.createDiv('export-container');

      exportContainer.style.border = '1px solid var(--background-modifier-border)';
      exportContainer.style.padding = '10px';
      exportContainer.style.borderRadius = '5px';

      this.textArea = new TextAreaComponent(exportContainer);
      this.textArea
        .setValue('')
        .setPlaceholder(t('Loading...'))
        .then(textArea => {
          textArea.inputEl.style.width = '100%';
          textArea.inputEl.style.height = '200px';
          textArea.inputEl.style.fontFamily = 'monospace';
          textArea.inputEl.style.fontSize = '12px';
          textArea.inputEl.style.padding = '8px';
          textArea.inputEl.style.border = '1px solid var(--background-modifier-border)';
          textArea.inputEl.style.borderRadius = '4px';
        });

      this.updateExportContent();
      ;

      // 添加复制按钮
      const buttonContainer = contentEl.createDiv('import-export-button-container');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '16px';

      const copyButton = buttonContainer.createEl('button', {
        text: t('Copy to Clipboard'),
        cls: 'mod-cta'
      });

      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(this.textArea.getValue())
          .then(() => {
            new Notice(t('Configuration copied to clipboard'));
          })
          .catch(err => {
            console.error('Failed to copy: ', err);
            new Notice(t('Failed to copy configuration'));
          });
      });
    } else {
      // 导入模式

      // 添加导入模式选择
      const importModeSetting = new Setting(contentEl)
        .setName(t('Import Mode'))
        .setDesc(t('Choose how to import the configuration'))
        .addDropdown(dropdown => {
          dropdown
            .addOption('update', t('Update Mode (Add new items and update existing ones)'))
            .addOption('overwrite', t('Overwrite Mode (Replace settings with imported ones)'))
            .setValue(this.importMode)
            .onChange(value => {
              this.importMode = value as 'overwrite' | 'update';
              this.importButton.setButtonText(this.importMode === 'overwrite' ? t('Overwrite Import') : t('Update Import'));
              this.warningContent.setText(this.importMode === 'overwrite' ? t('Warning: Overwrite mode will replace existing settings with imported ones.') : t('Warning: Update mode will add new items and update existing ones.'));
            });
        });
      const importContainer = contentEl.createDiv('import-container');

      importContainer.style.border = '1px solid var(--background-modifier-border)';
      importContainer.style.padding = '10px';
      importContainer.style.borderRadius = '5px';

      this.textArea = new TextAreaComponent(importContainer);
      this.textArea
        .setValue('')
        .setPlaceholder(t('Paste configuration here...'))
        .then(textArea => {
          textArea.inputEl.style.width = '100%';
          textArea.inputEl.style.height = '200px';
          textArea.inputEl.style.fontFamily = 'monospace';
          textArea.inputEl.style.fontSize = '12px';
          textArea.inputEl.style.padding = '8px';
          textArea.inputEl.style.border = '1px solid var(--background-modifier-border)';
          textArea.inputEl.style.borderRadius = '4px';
        });




      // 添加导入按钮
      const buttonContainer = contentEl.createDiv('import-export-button-container');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '16px';

      new Setting(buttonContainer)
        .addButton(button => {
          this.importButton = button
            .setIcon('import')
            .setButtonText(t('Import Configuration'))
            .onClick(() => {
              this.importConfiguration();
            });
        });


      // 添加警告信息
      const warningDiv = contentEl.createDiv('import-export-warning');
      warningDiv.style.marginTop = '16px';
      warningDiv.style.padding = '8px 12px';
      warningDiv.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)';
      warningDiv.style.borderRadius = '4px';
      warningDiv.style.border = '1px solid rgba(var(--color-red-rgb), 0.3)';

      const warningParagraph = warningDiv.createEl('p', {
        text: t('Warning: Update mode will add new items and update existing ones.'),
        cls: 'warning-text'
      });
      warningParagraph.style.margin = '0';
      this.warningContent = warningParagraph;
    }
  }

  updateExportContent() {
    let exportContent: any = {
      // 添加元数据
      _exportInfo: {
        version: this.plugin.manifest.version,
        exportType: this.exportType,
        exportTime: new Date().toISOString(),
        pluginId: this.plugin.manifest.id
      }
    };

    // 根据导出类型添加不同的内容
    switch (this.exportType) {
      case 'all':
        // 导出所有设置
        exportContent = {
          ...exportContent,
          menuCommands: this.plugin.settings.menuCommands || [],
          followingCommands: this.plugin.settings.followingCommands || [],
          topCommands: this.plugin.settings.topCommands || [],
          fixedCommands: this.plugin.settings.fixedCommands || [],
          mobileCommands: this.plugin.settings.mobileCommands || [],
          customCommands: this.plugin.settings.customCommands || [],
          enableMultipleConfig: this.plugin.settings.enableMultipleConfig,
          positionStyle: this.plugin.settings.positionStyle,
          aestheticStyle: this.plugin.settings.aestheticStyle,
          appendMethod: this.plugin.settings.appendMethod,
          autohide: this.plugin.settings.autohide,
          isLoadOnMobile: this.plugin.settings.isLoadOnMobile,
          cMenuNumRows: this.plugin.settings.cMenuNumRows,
          custom_bg1: this.plugin.settings.custom_bg1,
          custom_bg2: this.plugin.settings.custom_bg2,
          custom_bg3: this.plugin.settings.custom_bg3,
          custom_bg4: this.plugin.settings.custom_bg4,
          custom_bg5: this.plugin.settings.custom_bg5,
          custom_fc1: this.plugin.settings.custom_fc1,
          custom_fc2: this.plugin.settings.custom_fc2,
          custom_fc3: this.plugin.settings.custom_fc3,
          custom_fc4: this.plugin.settings.custom_fc4,
          custom_fc5: this.plugin.settings.custom_fc5,
          toolbarBackgroundColor: this.plugin.settings.toolbarBackgroundColor,
          toolbarIconColor: this.plugin.settings.toolbarIconColor,
          toolbarIconSize: this.plugin.settings.toolbarIconSize,
        };
        break;
      case 'All commands':
        // 只导出工具栏命令
        exportContent = {
          ...exportContent,
          menuCommands: this.plugin.settings.menuCommands || [],
          followingCommands: this.plugin.settings.followingCommands || [],
          topCommands: this.plugin.settings.topCommands || [],
          fixedCommands: this.plugin.settings.fixedCommands || [],
          mobileCommands: this.plugin.settings.mobileCommands || [],
          enableMultipleConfig: this.plugin.settings.enableMultipleConfig
        };
        break;
      case 'custom':
        // 只导出自定义命令
        exportContent = {
          ...exportContent,
          customCommands: this.plugin.settings.customCommands || []
        };
        break;
      case 'following':
        exportContent = {
          ...exportContent,
          followingCommands: this.plugin.settings.followingCommands || []
        };
        break;
      case 'top':
        exportContent = {
          ...exportContent,
          topCommands: this.plugin.settings.topCommands || []
        };
        break;
      case 'fixed':
        exportContent = {
          ...exportContent,
          fixedCommands: this.plugin.settings.fixedCommands || []
        };
        break;
      case 'mobile':
        exportContent = {
          ...exportContent,
          mobileCommands: this.plugin.settings.mobileCommands || []
        };
        break;
    }

    // 验证导出内容
    this.validateExportContent(exportContent);

    this.textArea.setValue(JSON.stringify(exportContent, null, 2));
  }

  // 验证导出内容
  private validateExportContent(exportContent: any) {
    // 确保数组类型的字段不为null
    ['menuCommands', 'followingCommands', 'topCommands', 'fixedCommands', 'mobileCommands', 'customCommands'].forEach(key => {
      if (key in exportContent && !exportContent[key]) {
        exportContent[key] = [];
      }
    });

    // 确保布尔类型的字段有默认值
    if ('enableMultipleConfig' in exportContent && exportContent.enableMultipleConfig === undefined) {
      exportContent.enableMultipleConfig = false;
    }
    if ('autohide' in exportContent && exportContent.autohide === undefined) {
      exportContent.autohide = false;
    }
    if ('Iscentered' in exportContent && exportContent.Iscentered === undefined) {
      exportContent.Iscentered = false;
    }
    if ('isLoadOnMobile' in exportContent && exportContent.isLoadOnMobile === undefined) {
      exportContent.isLoadOnMobile = true;
    }

    // 确保字符串类型的字段有默认值
    if ('positionStyle' in exportContent && !exportContent.positionStyle) {
      exportContent.positionStyle = 'top';
    }
    if ('aestheticStyle' in exportContent && !exportContent.aestheticStyle) {
      exportContent.aestheticStyle = 'default';
    }
    if ('appendMethod' in exportContent && !exportContent.appendMethod) {
      exportContent.appendMethod = 'workspace';
    }

    // 确保数字类型的字段有默认值
    if ('cMenuNumRows' in exportContent && exportContent.cMenuNumRows === undefined) {
      exportContent.cMenuNumRows = 1;
    }
  }

  async importConfiguration() {
    try {
      const importText = this.textArea.getValue();
      if (!importText.trim()) {
        new Notice(t('Please paste configuration data first'));
        return;
      }

      const importData = JSON.parse(importText);

      // 基本验证
      if (!importData || typeof importData !== 'object') {
        new Notice(t('Invalid import data format'));
        return;
      }

      // 检查导入内容包含哪些配置
      const containsMenuCommands = 'menuCommands' in importData;
      const containsCustomCommands = 'customCommands' in importData;
      const containsFollowingCommands = 'followingCommands' in importData;
      const containsTopCommands = 'topCommands' in importData;
      const containsFixedCommands = 'fixedCommands' in importData;
      const containsMobileCommands = 'mobileCommands' in importData;
      const containsGeneralSettings = 'positionStyle' in importData || 'aestheticStyle' in importData;
      const containsEnableMultipleConfig = 'enableMultipleConfig' in importData;
      const positionStyle = importData.positionStyle;

      // 检查数组是否为空
      const hasMenuCommands = containsMenuCommands && Array.isArray(importData.menuCommands) && importData.menuCommands.length > 0;
      const hasCustomCommands = containsCustomCommands && Array.isArray(importData.customCommands) && importData.customCommands.length > 0;
      const hasFollowingCommands = containsFollowingCommands && Array.isArray(importData.followingCommands) && importData.followingCommands.length > 0;
      const hasTopCommands = containsTopCommands && Array.isArray(importData.topCommands) && importData.topCommands.length > 0;
      const hasFixedCommands = containsFixedCommands && Array.isArray(importData.fixedCommands) && importData.fixedCommands.length > 0;
      const hasMobileCommands = containsMobileCommands && Array.isArray(importData.mobileCommands) && importData.mobileCommands.length > 0;

      // 检查数组是否为空（但字段存在）
      const emptyMenuCommands = containsMenuCommands && (!Array.isArray(importData.menuCommands) || importData.menuCommands.length === 0);
      const emptyCustomCommands = containsCustomCommands && (!Array.isArray(importData.customCommands) || importData.customCommands.length === 0);
      const emptyFollowingCommands = containsFollowingCommands && (!Array.isArray(importData.followingCommands) || importData.followingCommands.length === 0);
      const emptyTopCommands = containsTopCommands && (!Array.isArray(importData.topCommands) || importData.topCommands.length === 0);
      const emptyFixedCommands = containsFixedCommands && (!Array.isArray(importData.fixedCommands) || importData.fixedCommands.length === 0);
      const emptyMobileCommands = containsMobileCommands && (!Array.isArray(importData.mobileCommands) || importData.mobileCommands.length === 0);

      // 构建导入内容摘要
      let importSummary = t('This import will:') + '\n';

      // 添加更新内容
      if (containsGeneralSettings) importSummary += '• ' + t('Update general settings') + '\n';
      if (hasMenuCommands) importSummary += '• ' + t('Update Main Menu Commands') + ' (' + importData.menuCommands.length + ' ' + ')\n';
      if (hasCustomCommands) importSummary += '• ' + t('Update Custom Commands') + ' (' + importData.customCommands.length + ' ' + ')\n';
      if (hasFollowingCommands) importSummary += '• ' + t('Update Following Style Commands') + ' (' + importData.followingCommands.length + ' ' + ')\n';
      if (hasTopCommands) importSummary += '• ' + t('Update Top Style Commands') + ' (' + importData.topCommands.length + ' ' + ')\n';
      if (hasFixedCommands) importSummary += '• ' + t('Update Fixed Style Commands') + ' (' + importData.fixedCommands.length + ' ' + ')\n';
      if (hasMobileCommands) importSummary += '• ' + t('Update Mobile Style Commands') + ' (' + importData.mobileCommands.length + ' ' + ')\n';
      if (this.importMode === 'overwrite') {
        // 添加清空内容
        if (emptyMenuCommands) importSummary += '• ' + t('Clear all Main Menu Commands') + ' ⚠️\n';
        if (emptyCustomCommands) importSummary += '• ' + t('Clear all Custom Commands') + ' ⚠️\n';
        if (emptyFollowingCommands) importSummary += '• ' + t('Clear all Following Style Commands') + ' ⚠️\n';
        if (emptyTopCommands) importSummary += '• ' + t('Clear all Top Style Commands') + ' ⚠️\n';
        if (emptyFixedCommands) importSummary += '• ' + t('Clear all Fixed Style Commands') + ' ⚠️\n';
        if (emptyMobileCommands) importSummary += '• ' + t('Clear all Mobile Style Commands') + ' ⚠️\n';
      }
      // 添加其他设置信息
      if (containsEnableMultipleConfig) {
        const multiConfigStatus = importData.enableMultipleConfig ? t('Enable') : t('Disable');
        importSummary += '• ' + t('Set Multiple Config to:') + ' ' + multiConfigStatus + '\n';
      }

      if (positionStyle) {
        importSummary += '• ' + t('Set Position Style to:') + ' ' + this.getPositionStyleName(positionStyle) + '\n';
      }

      // 如果没有找到任何有效配置
      if (!hasMenuCommands && !hasCustomCommands && !hasFollowingCommands &&
        !hasTopCommands && !hasFixedCommands && !hasMobileCommands &&
        !emptyMenuCommands && !emptyCustomCommands && !emptyFollowingCommands &&
        !emptyTopCommands && !emptyFixedCommands && !emptyMobileCommands &&
        !containsGeneralSettings && !containsEnableMultipleConfig) {
        new Notice(t('No valid configuration found in import data'));
        return;
      }

      // 添加导入模式提示
      if (this.importMode === 'overwrite') {
        importSummary += '\n' + t('⚠️ Overwrite mode will replace existing settings with imported ones.');
      } else {
        importSummary += '\n' + t('ℹ️ Update mode will merge imported settings with existing ones.');
      }

      // 显示确认对话框
      ConfirmModal.show(this.app, {
        message: importSummary + '\n' + t('Do you want to continue?'),
        onConfirm: async () => {


          // 创建备份
          const backup = {
            positionStyle: this.plugin.settings.positionStyle,
            menuCommands: [...this.plugin.settings.menuCommands],
            customCommands: [...this.plugin.settings.customCommands],
            followingCommands: [...this.plugin.settings.followingCommands],
            topCommands: [...this.plugin.settings.topCommands],
            fixedCommands: [...this.plugin.settings.fixedCommands],
            mobileCommands: [...this.plugin.settings.mobileCommands]
          };

          try {
            // 根据导入模式处理导入
            if (this.importMode === 'overwrite') {
              // 覆盖模式 - 直接替换相应设置
              this.performOverwriteImport(importData);
            } else {
              // 更新模式 - 合并设置
              this.performUpdateImport(importData);
            }

            // 修复命令ID
            this.fixImportedCommandIds();

            // 保存设置
            await this.plugin.saveSettings();

            // 重新加载自定义命令
            this.plugin.reloadCustomCommands();

            // 触发工具栏更新
            dispatchEvent(new Event("editingToolbar-NewCommand"));

            new Notice(t('Configuration imported successfully'));
            this.close();
          } catch (error) {
            // 导入失败，恢复备份
            this.restoreBackup(backup);
            throw error;
          }


        }
      });

    } catch (error) {
      console.error('Import error:', error);
      new Notice(t('Error:') + ' ' + error.message);
    }



  }

  // 执行覆盖导入
  performOverwriteImport(importData: any) {
    // 导入一般设置
    this.importGeneralSettings(importData);

    // 导入命令配置
    if (importData.menuCommands) {
      this.plugin.settings.menuCommands = importData.menuCommands;
    }

    if (importData.customCommands) {
      this.plugin.settings.customCommands = importData.customCommands;
    }

    if (importData.followingCommands) {
      this.plugin.settings.followingCommands = importData.followingCommands;
    }

    if (importData.topCommands) {
      this.plugin.settings.topCommands = importData.topCommands;
    }

    if (importData.fixedCommands) {
      this.plugin.settings.fixedCommands = importData.fixedCommands;
    }

    if (importData.mobileCommands) {
      this.plugin.settings.mobileCommands = importData.mobileCommands;
    }
  }

  // 执行更新导入
  performUpdateImport(importData: any) {
    // 导入一般设置
    this.importGeneralSettings(importData);

    // 导入命令配置
    if (importData.menuCommands) {
      this.updateCommandArray(this.plugin.settings.menuCommands, importData.menuCommands);
    }

    if (importData.customCommands) {
      this.updateCommandArray(this.plugin.settings.customCommands, importData.customCommands);
    }

    if (importData.followingCommands) {
      this.updateCommandArray(this.plugin.settings.followingCommands, importData.followingCommands);
    }

    if (importData.topCommands) {
      this.updateCommandArray(this.plugin.settings.topCommands, importData.topCommands);
    }

    if (importData.fixedCommands) {
      this.updateCommandArray(this.plugin.settings.fixedCommands, importData.fixedCommands);
    }

    if (importData.mobileCommands) {
      this.updateCommandArray(this.plugin.settings.mobileCommands, importData.mobileCommands);
    }
  }
  private updateCommandArray(targetArray: any[], sourceArray: any[]) {
    if (!targetArray) {
      return sourceArray.slice();
    }

    // 遍历导入的命令
    sourceArray.forEach((importedCommand: any) => {
      // 检查命令是否已存在
      const existingCommandIndex = targetArray.findIndex(
        cmd => cmd.id === importedCommand.id
      );

      if (existingCommandIndex >= 0) {
        // 更新现有命令
        targetArray[existingCommandIndex] = importedCommand;
      } else {
        // 添加新命令
        targetArray.push(importedCommand);
      }

      // 如果有子菜单命令，递归更新
      if (importedCommand.SubmenuCommands && targetArray[existingCommandIndex]?.SubmenuCommands) {
        this.updateCommandArray(
          targetArray[existingCommandIndex].SubmenuCommands,
          importedCommand.SubmenuCommands
        );
      }
    });

    return targetArray;
  }
  // 导入一般设置
  importGeneralSettings(importData: any) {
    const generalSettings = [
      'positionStyle', 'aestheticStyle', 'appendMethod', 'autohide','Iscentered',
      'isLoadOnMobile', 'cMenuNumRows', 'enableMultipleConfig',
      'custom_bg1', 'custom_bg2', 'custom_bg3', 'custom_bg4', 'custom_bg5',
      'custom_fc1', 'custom_fc2', 'custom_fc3', 'custom_fc4', 'custom_fc5',
      'toolbarBackgroundColor', 'toolbarIconColor', 'toolbarIconSize'
    ];

    generalSettings.forEach(key => {
      if (importData[key] !== undefined) {
        (this.plugin.settings as any)[key] = importData[key];
      }
    });
  }

  // 修复导入的命令ID
  fixImportedCommandIds() {
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
      'editing-toolbar:editor:insert-link': 'editing-toolbar:insert-link',
      'cMenuToolbar-Divider-Line': 'editingToolbar-Divider-Line',
    };

    const fixCommandsInArray = (commands: any[]) => {
      if (!commands || !Array.isArray(commands)) return;

      commands.forEach(cmd => {
        if (cmd.id && commandMappings[cmd.id]) {
          cmd.id = commandMappings[cmd.id];
        }

        // 递归处理子菜单
        if (cmd.SubmenuCommands && Array.isArray(cmd.SubmenuCommands)) {
          fixCommandsInArray(cmd.SubmenuCommands);
        }
      });
    };

    // 修复所有命令数组中的命令ID
    fixCommandsInArray(this.plugin.settings.menuCommands);
    fixCommandsInArray(this.plugin.settings.customCommands);
    fixCommandsInArray(this.plugin.settings.followingCommands);
    fixCommandsInArray(this.plugin.settings.topCommands);
    fixCommandsInArray(this.plugin.settings.fixedCommands);
    fixCommandsInArray(this.plugin.settings.mobileCommands);
  }

  // 恢复备份
  restoreBackup(backup: any) {
    this.plugin.settings.positionStyle = backup.positionStyle;
    this.plugin.settings.menuCommands = backup.menuCommands;
    this.plugin.settings.customCommands = backup.customCommands;
    this.plugin.settings.followingCommands = backup.followingCommands;
    this.plugin.settings.topCommands = backup.topCommands;
    this.plugin.settings.fixedCommands = backup.fixedCommands;
    this.plugin.settings.mobileCommands = backup.mobileCommands;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  // 获取位置样式的显示名称
  getPositionStyleName(style: string): string {
    switch (style) {
      case 'following':
        return t('Following Style');
      case 'top':
        return t('Top Style');
      case 'fixed':
        return t('Fixed Style');
      default:
        return style;
    }
  }

} 
