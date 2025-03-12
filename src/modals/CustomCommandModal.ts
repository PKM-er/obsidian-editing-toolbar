import { App, Modal, Setting, Notice, setIcon } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import {  ChooseFromIconList } from "src/modals/suggesterModals";
import { t } from 'src/translations/helper';
export class CustomCommandModal extends Modal {
  private plugin: editingToolbarPlugin;
  private commandIndex: number | null;
  private commandId: string;
  private commandName: string;
  private prefix: string;
  private suffix: string;
  private char: number;
  private line: number;
  private islinehead: boolean;
  private icon: string;
  private iconDisplay: HTMLElement;

  constructor(app: App, plugin: editingToolbarPlugin, commandIndex: number | null) {
    super(app);
    this.plugin = plugin;
    this.commandIndex = commandIndex;

    // 如果是编辑现有命令，则加载命令数据
    if (commandIndex !== null) {
      const command = plugin.settings.customCommands[commandIndex];
      this.commandId = command.id;
      this.commandName = command.name;
      this.prefix = command.prefix;
      this.suffix = command.suffix;
      this.char = command.char;
      this.line = command.line;
      this.islinehead = command.islinehead;
      this.icon = command.icon || '';
    } else {
      // 默认值
      this.commandId = '';
      this.commandName = '';
      this.prefix = '';
      this.suffix = '';
      this.char = 0;
      this.line = 0;
      this.islinehead = false;
      this.icon = '';
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: this.commandIndex !== null ? 'Edit Custom Command' : 'Add Custom Command' });

    const commandIdSetting = new Setting(contentEl)
      .setName(t('Command ID'))
      .setDesc(t('Unique identifier, no spaces, e.g.: "my-custom-format"'))
      .addText(text => text
        .setValue(this.commandId)
        .onChange(value => {
          this.commandId = value;
          // 更新命令ID输入框的值
          const commandNameInput = contentEl.querySelector('.setting-item:nth-child(3) input');
          if (commandNameInput instanceof HTMLInputElement) {
            commandNameInput.value = value;
            this.commandName = value;
          }
        })
       
       
      );

    const commandNameSetting = new Setting(contentEl)
      .setName(t('Command Name'))
      .setDesc(t('Displayed name in toolbar and menu'))
      .addText(text => text
      .setValue(this.commandName)
      .onChange(value => this.commandName = value)
      );

    const prefixSetting = new Setting(contentEl)
      .setName(t('Prefix'))
      .setDesc(t('Add content before selected text'))
      .addText(text => text
        .setValue(this.prefix)
        .onChange(value => {
          this.prefix = value;
          
          // 获取前缀的镜像文字作为后缀
          const mirrorText = this.getMirrorText(value);
          
          // 只有在找到有效的镜像文字时才更新后缀
          if (mirrorText) {
            this.suffix = mirrorText;
            
            // 更新后缀输入框的值
            const suffixInput =contentEl.querySelector('.setting-item:nth-child(5) input');
            if (suffixInput instanceof HTMLInputElement) {
              suffixInput.value = mirrorText;
              this.suffix = mirrorText;
            }
          }
          
          // 设置光标位置偏移为前缀的字符长度
          // this.char = value.length;
          
          // // 更新光标位置输入框的值
          // const charInput = contentEl.querySelector('.setting-item:nth-child(6) input');
          // if (charInput instanceof HTMLInputElement) {
          //   charInput.value = value.length.toString();
          //   this.char = value.length;
          // }
        })
      );

    const suffixSetting = new Setting(contentEl)
      .setName(t('Suffix'))
      .setDesc(t('Add content after selected text'))
      .addText(text => text
        .setValue(this.suffix)
        .onChange(value => this.suffix = value)
      );

    const charSetting = new Setting(contentEl)
      .setName(t('Cursor Position Offset'))
      .setDesc(t('Default 0, format will keep the text selected'))
      .addText(text => text
        .setValue(this.char.toString())
        .onChange(value => this.char = parseInt(value) || 0)
      );

    const lineSetting = new Setting(contentEl)
      .setName(t('Line Offset'))
      .setDesc(t('Line offset of cursor after formatting'))
      .addText(text => text
        .setValue(this.line.toString())
        .onChange(value => this.line = parseInt(value) || 0)
      );

    new Setting(contentEl)
      .setName(t('Line Head Format'))
      .setDesc(t('Whether to insert at the beginning of the next line'))
      .addToggle(toggle => toggle
        .setValue(this.islinehead)
        .onChange(value => this.islinehead = value)
      );

    // 创建图标选择设置
    const iconSetting = new Setting(contentEl)
      .setName(t('Icon'))
      .setDesc(t('Command icon (click to select)'));
    
    // 添加图标预览
    this.iconDisplay = iconSetting.controlEl.createDiv('editingToolbarSettingsIcon');
    if (this.icon) {
      try {
        setIcon(this.iconDisplay, this.icon);
      } catch (e) {
        this.iconDisplay.setText(this.icon);
      }
    }  
    
   
    
    // 添加选择图标按钮
    iconSetting.addButton(button => button
      .setButtonText(t('Choose Icon'))
      .onClick(() => {
        const command = {
          id: this.commandId,
          name: this.commandName,
          icon: this.icon
        }
        
        new ChooseFromIconList(
          this.plugin, 
          command, 
          false,
          (selectedIcon) => {
            this.icon = selectedIcon;
            // 更新图标预览
            this.iconDisplay.empty();
            if (this.icon) {
              try {
                setIcon(this.iconDisplay, this.icon);
              } catch (e) {
                this.iconDisplay.setText(this.icon);
              }
            } 
            // 更新输入框
            const iconInput = iconSetting.controlEl.querySelector('input');
            if (iconInput) {
              iconInput.value = this.icon;
            }
          }
        ).open();
       
      })
    );

  

    // 添加保存和取消按钮
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('Save'))
        .setCta()
        .onClick(() => {
          // 验证必填字段
          if (!this.commandId || !this.commandName) {
            new Notice(t('Command ID and command name cannot be empty'));
            return;
          }

          // 验证ID格式
          if (this.commandId.includes(' ')) {
            new Notice(t('Command ID cannot contain spaces'));
            return;
          }

          // 检查ID是否已存在（编辑时除外）
          if (this.commandIndex === null) {
            const existingIndex = this.plugin.settings.customCommands.findIndex(
              cmd => cmd.id === this.commandId
            );
            if (existingIndex >= 0) {
              new Notice(t("The command") + this.commandId + t("already exists"), 8000);
              return;
            }
          }

          // 创建命令对象
          const command = {
            id: this.commandId,
            name: this.commandName,
            prefix: this.prefix,
            suffix: this.suffix,
            char: this.char,
            line: this.line,
            islinehead: this.islinehead,
            icon: this.icon
          };

          // 保存命令
          if (this.commandIndex !== null) {
            // 更新现有命令
            this.plugin.settings.customCommands[this.commandIndex] = command;
          } else {
            // 添加新命令
            this.plugin.settings.customCommands.push(command);
          }

          // 保存设置并关闭模态框
          this.plugin.saveSettings().then(() => {
            this.close();
            // 触发更新事件
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));

              this.plugin.reloadCustomCommands();
            }, 100);
          });
        })
      )
      .addButton(button => button
        .setButtonText(t('Cancel'))
        .onClick(() => this.close())
      );
  }

  

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  // 添加获取镜像文字的辅助方法
  private getMirrorText(text: string): string {
    // 常见的Markdown成对标记
    const commonPairs: {[key: string]: string} = {
      '**': '**',    // 粗体
      '*': '*',      // 斜体
      '__': '__',    // 粗体
      '_': '_',      // 斜体
      '~~': '~~',    // 删除线
      '`': '`',      // 行内代码
      '```': '```',  // 代码块
      '$': '$',      // 行内LaTeX
      '$$': '$$',    // LaTeX块
      '(': ')',      // 括号
      '[': ']',      // 方括号
      '{': '}',      // 花括号
      '<': '>',       // 尖括号
      '==': '==',      
      '*==': '==*',      
      '**==': '==**',      
      '***==': '==***',     
    
    };
    
    // 如果文本为空，返回空字符串
    if (!text) return '';
    
    // 检查是否是常见的Markdown标记
    if (text in commonPairs) {
      return commonPairs[text];
    }
    
    // 处理HTML标签
    const htmlTagMatch = text.match(/^<(\w+)([^>]*)>$/);
    if (htmlTagMatch) {
      return `</${htmlTagMatch[1]}>`;
    }
    
    // 如果没有找到对应的镜像，返回空字符串
    return '';
  }
} 