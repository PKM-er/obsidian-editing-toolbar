import { settings } from "cluster";
import { App, Modal, Setting, Notice, TextAreaComponent, ButtonComponent } from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
import { t } from 'src/translations/helper';

export class ImportExportModal extends Modal {
  plugin: editingToolbarPlugin;
  mode: 'import' | 'export';
  exportType: 'all' | 'commands' | 'custom' | 'following' | 'top' | 'fixed' | 'mobile';
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
            .addOption('commands', t('All Toolbar Commands'))
            .addOption('custom', t('Custom Commands Only'))
          if(this.plugin.settings.enableMultipleConfig){
            dropdown
              .addOption('following', t('Following Style Only'))
              .addOption('top', t('Top Style Only'))
              .addOption('fixed', t('Fixed Style Only'))
              .addOption('mobile', t('Mobile Style Only'))
            }
            
            dropdown.setValue(this.exportType)
            .onChange(value => {
              this.exportType = value as 'all' | 'commands' | 'custom' | 'following' | 'top' | 'fixed' | 'mobile';
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
            .addOption('overwrite', t('Overwrite Mode (Replace all settings with imported ones)'))
            .setValue(this.importMode)
            .onChange(value => {
              this.importMode = value as 'overwrite' | 'update';
              this.importButton.setButtonText(this.importMode === 'overwrite' ? t('Overwrite Import') : t('Update Import'));
              this.warningContent.setText(this.importMode === 'overwrite' ? t('Warning: Overwrite mode will completely replace your current settings with the imported ones. Consider exporting your current configuration first as a backup.') : t('Warning: Update mode will add new items and update existing ones based on the imported configuration.'));
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
            .setButtonText(t('Update Import'))
            .setTooltip(t('Import Configuration'))
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
        text: t('Warning: Update mode will add new items and update existing ones based on the imported configuration.'),
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
        };
        break;
      case 'commands':
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
      const importData = JSON.parse(this.textArea.getValue());

      // 验证导入的数据
      if (!importData) {
        new Notice(t('Invalid import data'));
        return;
      }

      // 检查是否包含元数据
      if (importData._exportInfo) {
        // 显示导入信息
        const exportInfo = importData._exportInfo;
        const exportTime = new Date(exportInfo.exportTime).toLocaleString();
        const exportType = exportInfo.exportType;
        const exportVersion = exportInfo.version;
        
        // 根据导出类型显示不同的提示信息
        let importTypeMessage = '';
        switch (exportType) {
          case 'all':
            importTypeMessage = t('All Settings');
            break;
          case 'commands':
            importTypeMessage = t('Toolbar Commands Only');
            break;
          case 'custom':
            importTypeMessage = t('Custom Commands Only');
            break;
          case 'following':
            importTypeMessage = t('Following Style');
            break;
          case 'top':
            importTypeMessage = t('Top Style');
            break;
          case 'fixed':
            importTypeMessage = t('Fixed Style');
            break;
          case 'mobile':
            importTypeMessage = t('Mobile Style');
            break;
          default:
            importTypeMessage = exportType;
        }
        
        new Notice(t('Import Configuration') + ': ' + importTypeMessage + ' (' + exportVersion + ')');
        
        // 移除元数据，避免干扰导入
        delete importData._exportInfo;
      }

      // 根据导入模式处理导入
      if (this.importMode === 'overwrite') {
        // 覆盖模式 - 直接替换所有设置
        await this.overwriteImport(importData);
      } else {
        // 更新模式 - 只更新存在的设置，添加新的设置
        await this.updateImport(importData);
      }

    } catch (error) {
      console.error('Import error:', error);
      new Notice(t('Failed to import configuration. Invalid format.'));
    }
  }

  // 辅助方法：转换老版本的命令ID为新版本的命令ID
  private convertLegacyCommandIds(commandArray: any[]): any[] {
    if (!commandArray || !Array.isArray(commandArray)) {
      return commandArray;
    }
    
    // 命令ID映射表，将老版本的命令ID映射到新版本的命令ID
    const commandIdMap: Record<string, string> = {
      'cMenuToolbar-Divider-Line': 'editingToolbar-Divider-Line',
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
      // 可以在这里添加更多的命令ID映射
    };
    
    // 递归处理命令数组
    return commandArray.map(command => {
      // 创建命令的副本，避免修改原始对象
      const newCommand = { ...command };
      
      // 检查并转换命令ID
      if (newCommand.id && commandIdMap[newCommand.id]) {
        newCommand.id = commandIdMap[newCommand.id];
   
      }
      
      // 如果有子菜单命令，递归处理
      if (newCommand.SubmenuCommands && Array.isArray(newCommand.SubmenuCommands)) {
        newCommand.SubmenuCommands = this.convertLegacyCommandIds(newCommand.SubmenuCommands);
      }
      
      return newCommand;
    });
  }

  // 添加修复命令ID的方法，从updateModal.ts中复制过来
  private async fixCommandIds() {
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
        'editing-toolbar:editor:insert-link': 'editing-toolbar:insert-link',
        'cMenuToolbar-Divider-Line': 'editingToolbar-Divider-Line',
      };

      let hasChanges = false;
      const settings = this.plugin.settings;

      // 遍历菜单命令
      const updateCommands = (commands: any[]) => {
        if (!commands || !Array.isArray(commands)) return;
        
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

      // 修复所有配置中的命令ID
      if (settings.menuCommands) updateCommands(settings.menuCommands);
      if (settings.followingCommands) updateCommands(settings.followingCommands);
      if (settings.topCommands) updateCommands(settings.topCommands);
      if (settings.fixedCommands) updateCommands(settings.fixedCommands);
      if (settings.mobileCommands) updateCommands(settings.mobileCommands);


      return hasChanges;
    } catch (error) {

      return false;
    }
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

  // 覆盖导入
  overwriteImport(importData: any) {
    try {
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

      // 检测导入的是什么类型的配置
      const isFullConfig = 'positionStyle' in importData; // 全部配置包含positionStyle
      const hasCommands = 'menuCommands' in importData;
      const hasCustomCommands = 'customCommands' in importData;
      const hasFollowingCommands = 'followingCommands' in importData;
      const hasTopCommands = 'topCommands' in importData;
      const hasFixedCommands = 'fixedCommands' in importData;
      const hasMobileCommands = 'mobileCommands' in importData;
      
      // 确定导入的具体类型
      let importType = 'unknown';
      if (isFullConfig) {
        importType = 'all';
      } else if (hasCustomCommands && !hasCommands && !hasFollowingCommands && !hasTopCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'custom';
      } else if (hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasTopCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'commands';
      } else if (hasFollowingCommands && !hasCommands && !hasCustomCommands && !hasTopCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'following';
      } else if (hasTopCommands && !hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'top';
      } else if (hasFixedCommands && !hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasTopCommands && !hasMobileCommands) {
        importType = 'fixed';
      } else if (hasMobileCommands && !hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasTopCommands && !hasFixedCommands) {
        importType = 'mobile';
      } else if (hasCommands || hasFollowingCommands || hasTopCommands || hasFixedCommands || hasMobileCommands) {
        importType = 'commands';
      }
      
      console.log(`覆盖导入配置类型: ${importType}`);

      // 根据导入类型执行不同的导入操作
      if (importType === 'all') {
        // 导入全部配置
        if (importData.positionStyle) {
          this.plugin.settings.positionStyle = importData.positionStyle;
        }
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
        new Notice(t('Configuration imported successfully (Overwrite mode)'));
      } else if (importType === 'custom') {
        // 仅导入自定义命令
        if (importData.customCommands) {
          this.plugin.settings.customCommands = importData.customCommands;
        }
        new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Custom Commands Only'));
      } else if (importType === 'commands') {
        // 仅导入菜单命令
        if (importData.menuCommands) {
          this.plugin.settings.menuCommands = importData.menuCommands;
        }
        new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Toolbar Commands Only'));
      } else if (importType === 'following') {
        // 仅导入跟随样式命令
        if (importData.followingCommands) {
          this.plugin.settings.followingCommands = importData.followingCommands;
        }
        new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Following Style Only'));
      } else if (importType === 'top') {
        // 仅导入顶部样式命令
        if (importData.topCommands) {
          this.plugin.settings.topCommands = importData.topCommands;
        }
        new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Top Style Only'));
      } else if (importType === 'fixed') {
        // 仅导入固定样式命令
        if (importData.fixedCommands) {
          this.plugin.settings.fixedCommands = importData.fixedCommands;
        }
        new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Fixed Style Only'));
      } else if (importType === 'mobile') {
        // 仅导入移动样式命令
        if (importData.mobileCommands) {
          this.plugin.settings.mobileCommands = importData.mobileCommands;
        }
        new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Mobile Style Only'));
      } else {
        // 未知类型，恢复备份
        this.restoreBackup(backup);
        new Notice(t('Error:') + ' ' + 'Unknown import type');
        return;
      }

      // 保存设置
      this.plugin.saveSettings();
      this.close();
    } catch (error) {
      console.error('导入失败:', error);
      new Notice(t('Error:') + ' ' + error.message);
    }
  }

  // 更新导入 - 保留现有设置，仅更新导入的设置
  updateImport(importData: any) {
    try {
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

      // 检测导入的是什么类型的配置
      const isFullConfig = 'positionStyle' in importData; // 全部配置包含positionStyle
      const hasCommands = 'menuCommands' in importData;
      const hasCustomCommands = 'customCommands' in importData;
      const hasFollowingCommands = 'followingCommands' in importData;
      const hasTopCommands = 'topCommands' in importData;
      const hasFixedCommands = 'fixedCommands' in importData;
      const hasMobileCommands = 'mobileCommands' in importData;
      
      // 确定导入的具体类型
      let importType = 'unknown';
      if (isFullConfig) {
        importType = 'all';
      } else if (hasCustomCommands && !hasCommands && !hasFollowingCommands && !hasTopCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'custom';
      } else if (hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasTopCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'commands';
      } else if (hasFollowingCommands && !hasCommands && !hasCustomCommands && !hasTopCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'following';
      } else if (hasTopCommands && !hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasFixedCommands && !hasMobileCommands) {
        importType = 'top';
      } else if (hasFixedCommands && !hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasTopCommands && !hasMobileCommands) {
        importType = 'fixed';
      } else if (hasMobileCommands && !hasCommands && !hasCustomCommands && !hasFollowingCommands && !hasTopCommands && !hasFixedCommands) {
        importType = 'mobile';
      } else if (hasCommands || hasFollowingCommands || hasTopCommands || hasFixedCommands || hasMobileCommands) {
        importType = 'commands';
      }
      
      console.log(`更新导入配置类型: ${importType}`);

      let hasUpdates = false;

      // 根据导入类型执行不同的导入操作
      if (importType === 'all') {
        // 更新全部配置
        if (importData.customCommands) {
          this.updateCommandArray(this.plugin.settings.customCommands, importData.customCommands);
          hasUpdates = true;
        }
        if (importData.menuCommands) {
          this.updateCommandArray(this.plugin.settings.menuCommands, importData.menuCommands);
          hasUpdates = true;
        }
        if (importData.followingCommands) {
          this.updateCommandArray(this.plugin.settings.followingCommands, importData.followingCommands);
          hasUpdates = true;
        }
        if (importData.topCommands) {
          this.updateCommandArray(this.plugin.settings.topCommands, importData.topCommands);
          hasUpdates = true;
        }
        if (importData.fixedCommands) {
          this.updateCommandArray(this.plugin.settings.fixedCommands, importData.fixedCommands);
          hasUpdates = true;
        }
        if (importData.mobileCommands) {
          this.updateCommandArray(this.plugin.settings.mobileCommands, importData.mobileCommands);
          hasUpdates = true;
        }
      } else if (importType === 'custom') {
        // 仅更新自定义命令
        if (importData.customCommands) {
          this.updateCommandArray(this.plugin.settings.customCommands, importData.customCommands);
          hasUpdates = true;
        }
      } else if (importType === 'commands') {
        // 仅更新菜单命令
        if (importData.menuCommands) {
          this.updateCommandArray(this.plugin.settings.menuCommands, importData.menuCommands);
          hasUpdates = true;
        }
      } else if (importType === 'following') {
        // 仅更新跟随样式命令
        if (importData.followingCommands) {
          this.updateCommandArray(this.plugin.settings.followingCommands, importData.followingCommands);
          hasUpdates = true;
        }
      } else if (importType === 'top') {
        // 仅更新顶部样式命令
        if (importData.topCommands) {
          this.updateCommandArray(this.plugin.settings.topCommands, importData.topCommands);
          hasUpdates = true;
        }
      } else if (importType === 'fixed') {
        // 仅更新固定样式命令
        if (importData.fixedCommands) {
          this.updateCommandArray(this.plugin.settings.fixedCommands, importData.fixedCommands);
          hasUpdates = true;
        }
      } else if (importType === 'mobile') {
        // 仅更新移动样式命令
        if (importData.mobileCommands) {
          this.updateCommandArray(this.plugin.settings.mobileCommands, importData.mobileCommands);
          hasUpdates = true;
        }
      } else {
        // 未知类型，恢复备份
        this.restoreBackup(backup);
        new Notice(t('Error:') + ' ' + 'Unknown import type');
        return;
      }

      if (hasUpdates) {
        // 保存设置
        this.plugin.saveSettings();
        
        // 根据导入的配置类型显示不同的成功消息
        if (importType === 'all') {
          new Notice(t('Configuration imported successfully (Update mode)'));
        } else if (importType === 'custom') {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Custom Commands Only'));
        } else if (importType === 'commands') {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Toolbar Commands Only'));
        } else if (importType === 'following') {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Following Style Only'));
        } else if (importType === 'top') {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Top Style Only'));
        } else if (importType === 'fixed') {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Fixed Style Only'));
        } else if (importType === 'mobile') {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Mobile Style Only'));
        }
        
        this.close();
      } else {
        new Notice(t('No valid configuration found in import data'));
      }
    } catch (error) {
      console.error('导入失败:', error);
      new Notice(t('Error:') + ' ' + error.message);
    }
  }

  // 辅助方法：更新命令数组
  private updateCommandArray(targetArray: any[], sourceArray: any[]) {
    if (!targetArray) {
      return sourceArray ? sourceArray.slice() : [];
    }

    if (!sourceArray || !Array.isArray(sourceArray)) {
      return targetArray;
    }

    // 遍历导入的命令
    sourceArray.forEach((importedCommand: any) => {
      if (!importedCommand || !importedCommand.id) return;
      
      // 检查命令是否已存在
      const existingCommandIndex = targetArray.findIndex(
        cmd => cmd && cmd.id === importedCommand.id
      );

      if (existingCommandIndex >= 0) {
        // 更新现有命令
        const updatedCommand = { ...targetArray[existingCommandIndex], ...importedCommand };
        
        // 特殊处理子菜单命令
        if (importedCommand.SubmenuCommands) {
          if (!updatedCommand.SubmenuCommands) {
            updatedCommand.SubmenuCommands = [];
          }
          updatedCommand.SubmenuCommands = this.updateCommandArray(
            updatedCommand.SubmenuCommands,
            importedCommand.SubmenuCommands
          );
        }
        
        targetArray[existingCommandIndex] = updatedCommand;
      } else {
        // 添加新命令
        targetArray.push(importedCommand);
      }
    });

    return targetArray;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 