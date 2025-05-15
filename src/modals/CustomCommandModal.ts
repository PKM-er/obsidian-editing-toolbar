import { App, Modal, Setting, Notice, setIcon, TextComponent } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { ChooseFromIconList } from "src/modals/suggesterModals";
import { RegexCommandModal } from "src/modals/RegexCommandModal";
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
  private commandNameInput: TextComponent;
  private commandIdInput: TextComponent;
  private suffixInput: TextComponent;

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
    this.modalEl.addClass('custom-commands-modal');
    contentEl.empty();
    contentEl.createEl('h2', { text: this.commandIndex !== null ? t('Edit Custom Command') : t('Add Custom Command') });

    // 添加切换到正则表达式命令的按钮
    const switchButtonContainer = contentEl.createDiv('switch-to-regex-container');
    switchButtonContainer.style.marginBottom = '20px';
    switchButtonContainer.style.textAlign = 'center';

    const switchButton = switchButtonContainer.createEl('button', {
      text: t('Switch Regex Command Window')
    });
    switchButton.addClass('mod-cta');
    switchButton.addEventListener('click', () => {
      this.close();
      new RegexCommandModal(this.app, this.plugin, null).open();
    });

    const commandIdSetting = new Setting(contentEl)
      .setName(t('Command ID'))
      .setDesc(t('Unique identifier, no spaces, e.g.: "my-custom-format"'))
      .addText(text => {
        this.commandIdInput = text;
        text.setValue(this.commandId);
        // 如果是编辑模式，设置为只读
        if (this.commandIndex !== null) {
          text.setDisabled(true);
          text.inputEl.addClass('id-is-disabled');
        } else {
          text.onChange(value => {
            this.commandId = value;
            // 更新命令ID输入框的值

            if (this.commandNameInput) {
              this.commandNameInput.setValue(value);
              this.commandName = value;
            }
          });
        }
        return text;
      });

    const commandNameSetting = new Setting(contentEl)
      .setName(t('Command Name'))
      .setDesc(t('Displayed name in toolbar and menu'))
      .addText(text => this.commandNameInput = text
        .setValue(this.commandName)
        .onChange(value => this.commandName = value)
      );


// 定义特殊字符和占位符的映射
const specialCharMap = {
  '\n': '↵',  // 换行符
  '\t': '⇥',  // 制表符
};
const reverseSpecialCharMap = Object.fromEntries(
  Object.entries(specialCharMap).map(([key, value]) => [value, key])
);

// 将特殊字符转换为占位符（用于显示）
function toDisplayText(text:string) {
  let result = text;
  for (const [char, placeholder] of Object.entries(specialCharMap)) {
    result = result.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
  }
  return result;
}

// 将占位符转换为特殊字符（用于存储）
function toStoredText(text:string) {
  let result = text;
  for (const [placeholder, char] of Object.entries(reverseSpecialCharMap)) {
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
  }
  return result;
}

// 创建按钮标签
const specialCharButtons = Object.entries(specialCharMap).map(([char, placeholder]) => {
  let label = placeholder;
  switch (char) {
    case '\n': label += ' (New Line)'; break;
    case '\t': label += ' (Tab)'; break;
  }
  return { placeholder, label };
});
// 插入特殊字符到文本框的辅助函数
function insertSpecialChar(input:HTMLInputElement, placeholder:string) {
  if (input instanceof HTMLInputElement) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentValue = input.value;
    const newValue = currentValue.slice(0, start) + placeholder + currentValue.slice(end);
    input.value = newValue;
    input.focus();
    input.setSelectionRange(start + placeholder.length, start + placeholder.length);
    // 手动触发 change 事件，确保 onChange 回调被调用
    const changeEvent = new Event('change', { bubbles: true });
    input.dispatchEvent(changeEvent);
    return newValue;
  }
  return '';
}

// 为设置项添加特殊字符按钮
function addSpecialCharButtons(setting:Setting, input:HTMLInputElement) {
  const buttonContainer = setting.controlEl.createDiv({ cls: 'special-char-buttons' });
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexWrap = 'wrap';
  buttonContainer.style.gap = '5px';
  buttonContainer.style.marginTop = '5px';
  specialCharButtons.forEach(({ placeholder, label }) => {
    const button = buttonContainer.createEl('button', { text: label });
    button.style.padding = '2px 6px';
    button.style.fontSize = '12px';
    button.style.minWidth = 'auto';
    button.style.border = '1px solid var(--background-modifier-border)';
 
    button.style.cursor = 'pointer';
    button.addEventListener('click', () => {
      insertSpecialChar(input, placeholder);
    });
  });
}
// 前缀设置
const prefixSetting = new Setting(contentEl)
  .setName(t('Prefix'))
  .setDesc(t('Add content before selected text'))
  .addText(text => text
    .setValue(toDisplayText(this.prefix)) // 显示时转换特殊字符为占位符
    .onChange(value => {
      this.prefix = toStoredText(value); // 存储时转换占位符为特殊字符

      // 获取前缀的镜像文字作为后缀
      const mirrorText = this.getMirrorText(value);

      // 只有在找到有效的镜像文字时才更新后缀
      if (mirrorText) {
        this.suffix = toStoredText(mirrorText);
        // 更新后缀输入框的值
        this.suffixInput.setValue(mirrorText);
      }
    })
  )
// 为前缀添加特殊字符按钮
addSpecialCharButtons(prefixSetting, prefixSetting.controlEl.querySelector('input'));

// 后缀设置
const suffixSetting = new Setting(contentEl)
  .setName(t('Suffix'))
  .setDesc(t('Add content after selected text'))
  .addText(text => {
    this.suffixInput = text;
    text.setValue(toDisplayText(this.suffix)) // 显示时转换特殊字符为占位符
      .onChange(value => {
        this.suffix = toStoredText(value); // 存储时转换占位符为特殊字符
      });
  })
 // 为后缀添加特殊字符按钮
addSpecialCharButtons(suffixSetting, suffixSetting.controlEl.querySelector('input'));


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
          const commandId = this.commandIndex === null ? `custom-${this.commandId}` : this.commandId;
          // 检查ID是否已存在（编辑时除外）
          if (this.commandIndex === null) {
            
            const existingIndex = this.plugin.settings.customCommands.findIndex(
              cmd => cmd.id === commandId
            );
            if (existingIndex >= 0) {
              new Notice(t("The command") + this.commandId + t("already exists"), 8000);
              return;
            }
          }
      
          // 创建命令对象
          const command = {
            id: commandId,
            name: this.commandName,
            prefix: this.prefix,
            suffix: this.suffix,
            char: this.char,
            line: this.line,
            islinehead: this.islinehead,
            icon: this.icon
          };

          // 如果是编辑现有命令且图标发生变化
          if (this.commandIndex !== null) {
            const oldCommand = this.plugin.settings.customCommands[this.commandIndex];
            const oldIcon = oldCommand.icon;

            if (oldIcon !== this.icon) {
              // 更新所有配置中的相关命令图标
              const customCommandId = `editing-toolbar:${commandId}`;

              // 更新 menuCommands
              this.updateCommandIcon(this.plugin.settings.menuCommands, customCommandId);

              // 如果启用了多配置，更新其他配置
              if (this.plugin.settings.enableMultipleConfig) {
                this.updateCommandIcon(this.plugin.settings.followingCommands, customCommandId);
                this.updateCommandIcon(this.plugin.settings.topCommands, customCommandId);
                this.updateCommandIcon(this.plugin.settings.fixedCommands, customCommandId);

                if (this.plugin.settings.isLoadOnMobile) {
                  this.updateCommandIcon(this.plugin.settings.mobileCommands, customCommandId);
                }
              }
            }

            // 更新自定义命令
            this.plugin.settings.customCommands[this.commandIndex] = command;
          } else {
            // 添加新命令
            this.plugin.settings.customCommands.push(command);
          }

          // 保存设置并关闭模态框
          this.plugin.saveSettings().then(() => {
            this.close();
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

    // 设置光标聚焦逻辑
    setTimeout(() => {
      if (this.commandIndex)
        this.commandIdInput.inputEl.focus();
      else
        this.commandNameInput.inputEl.focus();
    }, 10);
  }

  // 添加更新命令图标的辅助方法
  private updateCommandIcon(commands: any[], commandId: string) {
    if (!commands) return;

    commands.forEach(cmd => {
      if (cmd.id === commandId) {
        cmd.icon = this.icon;
      }
      // 检查子菜单
      if (cmd.SubmenuCommands) {
        this.updateCommandIcon(cmd.SubmenuCommands, commandId);
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  // 添加获取镜像文字的辅助方法
  private getMirrorText(text: string): string {
    // 常见的Markdown成对标记
    const commonPairs: { [key: string]: string } = {
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