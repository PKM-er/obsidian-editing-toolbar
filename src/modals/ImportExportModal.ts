import { settings } from "cluster";
import { App, Modal, Setting, Notice, TextAreaComponent, ButtonComponent } from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
import { t } from 'src/translations/helper';

export class ImportExportModal extends Modal {
  plugin: editingToolbarPlugin;
  mode: 'import' | 'export';
  exportType: 'all' | 'commands' | 'custom';
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
            .addOption('commands', t('Toolbar Commands Only'))
            .addOption('custom', t('Custom Commands Only'))
            .setValue('all')
            .onChange(value => {
              this.exportType = value as 'all' | 'commands' | 'custom';
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
        
        new Notice(t('Importing configuration...'));
        
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

  // 覆盖导入 - 完全替换现有设置
  async overwriteImport(importData: any) {
    let hasUpdates = false;

    // 处理兼容性：检查本地和导入配置的多配置模式状态
    const localMultiConfigEnabled = this.plugin.settings.enableMultipleConfig === true;
    const importMultiConfigEnabled = importData.enableMultipleConfig === true;
    const importMultiConfigUndefined = importData.enableMultipleConfig === undefined;
    
    // 清空当前所有设置前先备份
    const backupSettings = JSON.parse(JSON.stringify(this.plugin.settings));

    // 检测导入的是什么类型的配置
    const isFullConfig = 'positionStyle' in importData; // 全部配置包含positionStyle
    const hasCommands = 'menuCommands' in importData || 'followingCommands' in importData || 'topCommands' in importData || 'fixedCommands' in importData;
    const hasCustomCommands = 'customCommands' in importData;
    

    // 导入自定义命令
    if (importData.customCommands) {
      // 转换老版本的命令ID
      this.plugin.settings.customCommands = this.convertLegacyCommandIds(importData.customCommands);
      hasUpdates = true;
    }

    // 处理工具栏命令配置 - 考虑多配置兼容性
    if (localMultiConfigEnabled && (importMultiConfigUndefined || !importMultiConfigEnabled)) {
      // 本地启用了多配置，但导入文件是老版本或未启用多配置
      // 根据positionStyle决定将menuCommands导入到哪个配置中
      if (importData.menuCommands) {
        // 转换老版本的命令ID
        const convertedMenuCommands = this.convertLegacyCommandIds(importData.menuCommands);
        
        const positionStyle = importData.positionStyle || 'top';
        this.plugin.settings.menuCommands = convertedMenuCommands;
        
        // 根据positionStyle将命令导入到相应的配置中
        switch (positionStyle) {
          case 'following':
            this.plugin.settings.followingCommands = convertedMenuCommands;
            break;
          case 'top':
            this.plugin.settings.topCommands = convertedMenuCommands;
            break;
          case 'fixed':
            this.plugin.settings.fixedCommands = convertedMenuCommands;
            break;
          default:
            
            this.plugin.settings.topCommands = convertedMenuCommands;
        }
        
        // 如果导入配置启用了移动设备支持，也导入到移动设备配置
        if (importData.isLoadOnMobile === true) {
          this.plugin.settings.mobileCommands = convertedMenuCommands;
        }
        
        hasUpdates = true;
      }
    } else if (!localMultiConfigEnabled && importMultiConfigEnabled) {
      // 本地未启用多配置，但导入文件启用了多配置
      // 启用多配置并导入所有配置
      this.plugin.settings.enableMultipleConfig = true;
      
      if (importData.followingCommands) {
        this.plugin.settings.followingCommands = this.convertLegacyCommandIds(importData.followingCommands);
        hasUpdates = true;
      }
      
      if (importData.topCommands) {
        this.plugin.settings.topCommands = this.convertLegacyCommandIds(importData.topCommands);
        hasUpdates = true;
      }
      
      if (importData.fixedCommands) {
        this.plugin.settings.fixedCommands = this.convertLegacyCommandIds(importData.fixedCommands);
        hasUpdates = true;
      }
      
      if (importData.mobileCommands) {
        this.plugin.settings.mobileCommands = this.convertLegacyCommandIds(importData.mobileCommands);
        hasUpdates = true;
      }
    } else {
      // 两者配置模式一致，直接导入
      
      // 导入工具栏命令配置
      if (importData.menuCommands) {
        this.plugin.settings.menuCommands = this.convertLegacyCommandIds(importData.menuCommands);
        hasUpdates = true;
      }
      
      // 导入多配置相关设置
      if (importData.enableMultipleConfig !== undefined) {
        this.plugin.settings.enableMultipleConfig = importData.enableMultipleConfig;
        
        if (importData.enableMultipleConfig) {
          if (importData.followingCommands) {
            this.plugin.settings.followingCommands = this.convertLegacyCommandIds(importData.followingCommands);
            hasUpdates = true;
          }
          
          if (importData.topCommands) {
            this.plugin.settings.topCommands = this.convertLegacyCommandIds(importData.topCommands);
            hasUpdates = true;
          }
          
          if (importData.fixedCommands) {
            this.plugin.settings.fixedCommands = this.convertLegacyCommandIds(importData.fixedCommands);
            hasUpdates = true;
          }
          
          if (importData.mobileCommands) {
            this.plugin.settings.mobileCommands = this.convertLegacyCommandIds(importData.mobileCommands);
            hasUpdates = true;
          }
        }
      }
    }

    // 只有在导入完整配置时才导入其他设置
    if (isFullConfig) {
      const otherSettings = [
        'positionStyle', 'aestheticStyle', 'appendMethod', 'autohide',
        'isLoadOnMobile', 'cMenuNumRows',
        'custom_bg1', 'custom_bg2', 'custom_bg3', 'custom_bg4', 'custom_bg5',
        'custom_fc1', 'custom_fc2', 'custom_fc3', 'custom_fc4', 'custom_fc5'
      ];

      otherSettings.forEach(key => {
        if (importData[key] !== undefined) {
          (this.plugin.settings as any)[key] = importData[key];
          hasUpdates = true;
        }
      });

      // 特殊处理enableMultipleConfig
      if (importData.enableMultipleConfig === undefined || importData.enableMultipleConfig === false) {
        // 如果导入文件中未定义或为false，则根据前面的处理逻辑决定是否设置为false
        if (!localMultiConfigEnabled || !importMultiConfigEnabled) {
          (this.plugin.settings as any).enableMultipleConfig = false;
          hasUpdates = true;
        }
      }
    }

    if (hasUpdates) {
      try {
        // 在保存设置前修复命令ID
        const commandsFixed = await this.fixCommandIds();
   
        await this.plugin.saveSettings();
        this.plugin.reloadCustomCommands();
        dispatchEvent(new Event("editingToolbar-NewCommand"));
        
        // 根据导入的配置类型显示不同的成功消息
        if (isFullConfig) {
          new Notice(t('Configuration imported successfully (Overwrite mode)'));
        } else if (hasCommands) {
          new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Toolbar Commands Only'));
        } else if (hasCustomCommands) {
          new Notice(t('Configuration imported successfully (Overwrite mode)') + ' - ' + t('Custom Commands Only'));
        } else {
          new Notice(t('Configuration imported successfully (Overwrite mode)'));
        }
        
        this.close();
      } catch (error) {
        // 导入失败，恢复备份
        this.plugin.settings = backupSettings;
        await this.plugin.saveSettings();

        new Notice(t('Error:') + ' ' + error.message);
      }
    } else {
      new Notice(t('No valid configuration found in import data'));
    }
  }

  // 更新导入 
  async updateImport(importData: any) {
    let hasUpdates = false;
    
    // 处理兼容性：检查本地和导入配置的多配置模式状态
    const localMultiConfigEnabled = this.plugin.settings.enableMultipleConfig === true;
    const importMultiConfigEnabled = importData.enableMultipleConfig === true;
    const importMultiConfigUndefined = importData.enableMultipleConfig === undefined;
    
    // 备份当前设置，以便导入失败时恢复
    const backupSettings = JSON.parse(JSON.stringify(this.plugin.settings));

    // 检测导入的是什么类型的配置
    const isFullConfig = 'positionStyle' in importData; // 全部配置包含positionStyle
    const hasCommands = 'menuCommands' in importData || 'followingCommands' in importData || 'topCommands' in importData || 'fixedCommands' in importData;
    const hasCustomCommands = 'customCommands' in importData;
    

    // 更新自定义命令
    if (importData.customCommands) {
      // 转换老版本的命令ID
      const convertedCustomCommands = this.convertLegacyCommandIds(importData.customCommands);
      
      // 遍历导入的自定义命令
      convertedCustomCommands.forEach((importedCommand: any) => {
        // 检查命令是否已存在
        const existingCommandIndex = this.plugin.settings.customCommands.findIndex(
          cmd => cmd.id === importedCommand.id
        );

        if (existingCommandIndex >= 0) {
          // 更新现有命令
          this.plugin.settings.customCommands[existingCommandIndex] = importedCommand;
        } else {
          // 添加新命令
          this.plugin.settings.customCommands.push(importedCommand);
        }
      });
      hasUpdates = true;
    }

    // 处理多配置模式兼容性
    if (localMultiConfigEnabled && (importMultiConfigUndefined || !importMultiConfigEnabled)) {
      // 本地启用了多配置，但导入文件是老版本或未启用多配置
      if (importData.menuCommands) {
        // 转换老版本的命令ID
        const convertedMenuCommands = this.convertLegacyCommandIds(importData.menuCommands);
        
        // 根据positionStyle决定将命令导入到哪个配置中
        const positionStyle = importData.positionStyle || 'top';
        
        switch (positionStyle) {
          case 'following':
            if (this.plugin.settings.followingCommands) {
              this.updateCommandArray(this.plugin.settings.followingCommands, convertedMenuCommands);
            } else {
              this.plugin.settings.followingCommands = convertedMenuCommands.slice();
            }
            break;
          case 'top':
            if (this.plugin.settings.topCommands) {
              this.updateCommandArray(this.plugin.settings.topCommands, convertedMenuCommands);
            } else {
              this.plugin.settings.topCommands = convertedMenuCommands.slice();
            }
            break;
          case 'fixed':
            if (this.plugin.settings.fixedCommands) {
              this.updateCommandArray(this.plugin.settings.fixedCommands, convertedMenuCommands);
            } else {
              this.plugin.settings.fixedCommands = convertedMenuCommands.slice();
            }
            break;
          default:
            if (this.plugin.settings.topCommands) {
              this.updateCommandArray(this.plugin.settings.topCommands, convertedMenuCommands);
            } else {
              this.plugin.settings.topCommands = convertedMenuCommands.slice();
            }
        }
        
        // 如果导入配置启用了移动设备支持，也更新移动设备配置
        if (importData.isLoadOnMobile === true) {
          if (this.plugin.settings.mobileCommands) {
            this.updateCommandArray(this.plugin.settings.mobileCommands, convertedMenuCommands);
          } else {
            this.plugin.settings.mobileCommands = convertedMenuCommands.slice();
          }
        }
        
        hasUpdates = true;
      }
    } else if (!localMultiConfigEnabled && importMultiConfigEnabled) {
      // 本地未启用多配置，但导入文件启用了多配置
      // 启用多配置并导入所有配置
      this.plugin.settings.enableMultipleConfig = true;
      
      if (importData.followingCommands) {
        const convertedFollowingCommands = this.convertLegacyCommandIds(importData.followingCommands);
        this.plugin.settings.followingCommands = convertedFollowingCommands;
        hasUpdates = true;
      }
      
      if (importData.topCommands) {
        const convertedTopCommands = this.convertLegacyCommandIds(importData.topCommands);
        this.plugin.settings.topCommands = convertedTopCommands;
        hasUpdates = true;
      }
      
      if (importData.fixedCommands) {
        const convertedFixedCommands = this.convertLegacyCommandIds(importData.fixedCommands);
        this.plugin.settings.fixedCommands = convertedFixedCommands;
        hasUpdates = true;
      }
      
      if (importData.mobileCommands) {
        const convertedMobileCommands = this.convertLegacyCommandIds(importData.mobileCommands);
        this.plugin.settings.mobileCommands = convertedMobileCommands;
        hasUpdates = true;
      }
    } else {
      // 两者配置模式一致
      
      // 更新工具栏命令
      if (importData.menuCommands && this.plugin.settings.menuCommands) {
        // 转换老版本的命令ID
        const convertedMenuCommands = this.convertLegacyCommandIds(importData.menuCommands);
        this.updateCommandArray(this.plugin.settings.menuCommands, convertedMenuCommands);
        hasUpdates = true;
      }
      
      // 更新多配置相关设置
      if (importData.enableMultipleConfig !== undefined) {
        this.plugin.settings.enableMultipleConfig = importData.enableMultipleConfig;
        
        if (importData.enableMultipleConfig) {
          if (importData.followingCommands && this.plugin.settings.followingCommands) {
            // 转换老版本的命令ID
            const convertedFollowingCommands = this.convertLegacyCommandIds(importData.followingCommands);
            this.updateCommandArray(this.plugin.settings.followingCommands, convertedFollowingCommands);
            hasUpdates = true;
          } else if (importData.followingCommands) {
            this.plugin.settings.followingCommands = this.convertLegacyCommandIds(importData.followingCommands);
            hasUpdates = true;
          }
          
          if (importData.topCommands && this.plugin.settings.topCommands) {
            // 转换老版本的命令ID
            const convertedTopCommands = this.convertLegacyCommandIds(importData.topCommands);
            this.updateCommandArray(this.plugin.settings.topCommands, convertedTopCommands);
            hasUpdates = true;
          } else if (importData.topCommands) {
            this.plugin.settings.topCommands = this.convertLegacyCommandIds(importData.topCommands);
            hasUpdates = true;
          }
          
          if (importData.fixedCommands && this.plugin.settings.fixedCommands) {
            // 转换老版本的命令ID
            const convertedFixedCommands = this.convertLegacyCommandIds(importData.fixedCommands);
            this.updateCommandArray(this.plugin.settings.fixedCommands, convertedFixedCommands);
            hasUpdates = true;
          } else if (importData.fixedCommands) {
            this.plugin.settings.fixedCommands = this.convertLegacyCommandIds(importData.fixedCommands);
            hasUpdates = true;
          }
          
          if (importData.mobileCommands && this.plugin.settings.mobileCommands) {
            // 转换老版本的命令ID
            const convertedMobileCommands = this.convertLegacyCommandIds(importData.mobileCommands);
            this.updateCommandArray(this.plugin.settings.mobileCommands, convertedMobileCommands);
            hasUpdates = true;
          } else if (importData.mobileCommands) {
            this.plugin.settings.mobileCommands = this.convertLegacyCommandIds(importData.mobileCommands);
            hasUpdates = true;
          }
        }
      }
    }

    // 只有在导入完整配置时才更新其他设置
    if (isFullConfig) {
      const otherSettings = [
        'positionStyle', 'aestheticStyle', 'appendMethod', 'autohide',
        'isLoadOnMobile', 'cMenuNumRows',
        'custom_bg1', 'custom_bg2', 'custom_bg3', 'custom_bg4', 'custom_bg5',
        'custom_fc1', 'custom_fc2', 'custom_fc3', 'custom_fc4', 'custom_fc5'
      ];

      otherSettings.forEach(key => {
        if (importData[key] !== undefined) {
          (this.plugin.settings as any)[key] = importData[key];
          hasUpdates = true;
        }
      });
    }

    if (hasUpdates) {
      try {
        // 在保存设置前修复命令ID
        const commandsFixed = await this.fixCommandIds();
  
        await this.plugin.saveSettings();
        this.plugin.reloadCustomCommands();
        dispatchEvent(new Event("editingToolbar-NewCommand"));
        
        // 根据导入的配置类型显示不同的成功消息
        if (isFullConfig) {
          new Notice(t('Configuration imported successfully (Update mode)'));
        } else if (hasCommands) {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Toolbar Commands Only'));
        } else if (hasCustomCommands) {
          new Notice(t('Configuration imported successfully (Update mode)') + ' - ' + t('Custom Commands Only'));
        } else {
          new Notice(t('Configuration imported successfully (Update mode)'));
        }
        
        this.close();
      } catch (error) {
        // 导入失败，恢复备份
        this.plugin.settings = backupSettings;
        await this.plugin.saveSettings();
        new Notice(t('Error:') + ' ' + error.message);
      }
    } else {
      new Notice(t('No valid configuration found in import data'));
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