import { App, Modal, Setting, Notice, TextAreaComponent } from "obsidian";
import type editingToolbarPlugin from "src/plugin/main";
import { t } from 'src/translations/helper';

export class ImportExportModal extends Modal {
  plugin: editingToolbarPlugin;
  mode: 'import' | 'export';
  exportType: 'all' | 'commands' | 'custom';
  importMode: 'overwrite' | 'update';
  textArea: TextAreaComponent;

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
      new Setting(contentEl)
        .setName(t('Export Content'))
        .setDesc(t('Copy this content to share with others'))
        .then(setting => {
          this.textArea = new TextAreaComponent(setting.controlEl);
          this.textArea
            .setValue('')
            .setPlaceholder(t('Loading...'))
            .then(textArea => {
              textArea.inputEl.style.width = '40vw';
              textArea.inputEl.style.height = '200px';
              textArea.inputEl.style.fontFamily = 'monospace';
              textArea.inputEl.style.fontSize = '12px';
              textArea.inputEl.style.padding = '8px';
              textArea.inputEl.style.border = '1px solid var(--background-modifier-border)';
              textArea.inputEl.style.borderRadius = '4px';
            });
          
          this.updateExportContent();
        });
      
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
      new Setting(contentEl)
        .setName(t('Import Mode'))
        .setDesc(t('Choose how to import the configuration'))
        .addDropdown(dropdown => {
          dropdown
            .addOption('update', t('Update Mode (Add new items and update existing ones)'))
            .addOption('overwrite', t('Overwrite Mode (Replace all settings with imported ones)'))
            .setValue(this.importMode)
            .onChange(value => {
              this.importMode = value as 'overwrite' | 'update';
            });
        });
      
      new Setting(contentEl)
        .setName(t('Import Configuration'))
        .setDesc(t('Paste the configuration JSON here'))
        .then(setting => {
          this.textArea = new TextAreaComponent(setting.controlEl);
          this.textArea
            .setValue('')
            .setPlaceholder(t('Paste configuration here...'))
            .then(textArea => {
              textArea.inputEl.style.width = '40vw';
              textArea.inputEl.style.height = '200px';
              textArea.inputEl.style.fontFamily = 'monospace';
              textArea.inputEl.style.fontSize = '12px';
              textArea.inputEl.style.padding = '8px';
              textArea.inputEl.style.border = '1px solid var(--background-modifier-border)';
              textArea.inputEl.style.borderRadius = '4px';
            });
        });
      
      // 添加导入按钮
      const buttonContainer = contentEl.createDiv('import-export-button-container');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '16px';
      
      const importButton = buttonContainer.createEl('button', {
        text: t('Import'),
        cls: 'mod-cta'
      });
      
      importButton.addEventListener('click', () => {
        this.importConfiguration();
      });
      
      // 添加警告信息
      const warningDiv = contentEl.createDiv('import-export-warning');
      warningDiv.style.marginTop = '16px';
      warningDiv.style.padding = '8px 12px';
      warningDiv.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)';
      warningDiv.style.borderRadius = '4px';
      warningDiv.style.border = '1px solid rgba(var(--color-red-rgb), 0.3)';
      
      const warningText = this.importMode === 'overwrite' 
        ? t('Warning: Overwrite mode will completely replace your current settings with the imported ones. Consider exporting your current configuration first as a backup.')
        : t('Warning: Update mode will add new items and update existing ones based on the imported configuration.');
      
      warningDiv.createEl('p', { 
        text: warningText,
        cls: 'warning-text'
      }).style.margin = '0';
    }
  }

  updateExportContent() {
    let exportContent = {};
    
    switch (this.exportType) {
      case 'all':
        // 导出所有设置
        exportContent = {
          menuCommands: this.plugin.settings.menuCommands,
          followingCommands: this.plugin.settings.followingCommands,
          topCommands: this.plugin.settings.topCommands,
          fixedCommands: this.plugin.settings.fixedCommands,
          mobileCommands: this.plugin.settings.mobileCommands,
          customCommands: this.plugin.settings.customCommands,
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
          menuCommands: this.plugin.settings.menuCommands,
          followingCommands: this.plugin.settings.followingCommands,
          topCommands: this.plugin.settings.topCommands,
          fixedCommands: this.plugin.settings.fixedCommands,
          mobileCommands: this.plugin.settings.mobileCommands,
          enableMultipleConfig: this.plugin.settings.enableMultipleConfig
        };
        break;
      case 'custom':
        // 只导出自定义命令
        exportContent = {
          customCommands: this.plugin.settings.customCommands
        };
        break;
    }
    
    this.textArea.setValue(JSON.stringify(exportContent, null, 2));
  }

  async importConfiguration() {
    try {
      const importData = JSON.parse(this.textArea.getValue());
      
      // 验证导入的数据
      if (!importData) {
        new Notice(t('Invalid import data'));
        return;
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
  
  // 覆盖导入 - 完全替换现有设置
  async overwriteImport(importData: any) {
    let hasUpdates = false;
    
    // 导入自定义命令
    if (importData.customCommands) {
      this.plugin.settings.customCommands = importData.customCommands;
      hasUpdates = true;
    }
    
    // 导入工具栏命令配置
    if (importData.menuCommands) {
      this.plugin.settings.menuCommands = importData.menuCommands;
      hasUpdates = true;
    }
    
    // 导入多配置相关设置
    if (importData.enableMultipleConfig !== undefined) {
      this.plugin.settings.enableMultipleConfig = importData.enableMultipleConfig;
      
      if (importData.enableMultipleConfig) {
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
      hasUpdates = true;
    }
    
    // 导入其他设置
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
    
    if (hasUpdates) {
      await this.plugin.saveSettings();
      this.plugin.reloadCustomCommands();
      dispatchEvent(new Event("editingToolbar-NewCommand"));
      new Notice(t('Configuration imported successfully (Overwrite mode)'));
      this.close();
    } else {
      new Notice(t('No valid configuration found in import data'));
    }
  }
  
  // 更新导入 - 更新现有设置，添加新设置
  async updateImport(importData: any) {
    let hasUpdates = false;
    
    // 更新自定义命令
    if (importData.customCommands) {
      // 遍历导入的自定义命令
      importData.customCommands.forEach((importedCommand: any) => {
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
    
    // 更新工具栏命令
    if (importData.menuCommands) {
      this.updateCommandArray(this.plugin.settings.menuCommands, importData.menuCommands);
      hasUpdates = true;
    }
    
    // 更新多配置相关设置
    if (importData.enableMultipleConfig !== undefined) {
      this.plugin.settings.enableMultipleConfig = importData.enableMultipleConfig;
      
      if (importData.enableMultipleConfig) {
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
      hasUpdates = true;
    }
    
    // 更新其他设置
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
    
    if (hasUpdates) {
      await this.plugin.saveSettings();
      this.plugin.reloadCustomCommands();
      dispatchEvent(new Event("editingToolbar-NewCommand"));
      new Notice(t('Configuration imported successfully (Update mode)'));
      this.close();
    } else {
      new Notice(t('No valid configuration found in import data'));
    }
  }
  
  // 辅助方法：更新命令数组
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

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 