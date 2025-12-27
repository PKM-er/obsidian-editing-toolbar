import { App, Modal, Setting, Notice, setIcon, TextComponent, ToggleComponent } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { ChooseFromIconList } from "src/modals/suggesterModals";
import { t } from 'src/translations/helper';
import { CustomCommand } from "src/settings/settingsData";

export class RegexCommandModal extends Modal {
  private plugin: editingToolbarPlugin;
  private commandIndex: number | null;
  private commandId: string;
  private commandName: string;
  private icon: string;
  private iconDisplay: HTMLElement;

  // 正则表达式相关属性
  private regexPattern: string;
  private regexReplacement: string;
  private regexCaseInsensitive: boolean;
  private regexGlobal: boolean;
  private regexMultiline: boolean;

  // 条件匹配相关属性
  private useCondition: boolean;
  private conditionPattern: string;

  // 预览相关属性
  private previewInput: HTMLTextAreaElement;
  private previewOutput: HTMLElement;
  private regexPatternInput: TextComponent;
  private regexReplacementInput: TextComponent;
  private useConditionToggle: ToggleComponent;
  private conditionPatternInput: TextComponent;
  private regexMultilineToggle: ToggleComponent;

  constructor(app: App, plugin: editingToolbarPlugin, commandIndex: number | null) {
    super(app);
    this.plugin = plugin;
    this.commandIndex = commandIndex;

    // 如果是编辑现有命令，则加载命令数据
    if (commandIndex !== null) {
      const command = plugin.settings.customCommands[commandIndex];
      this.commandId = command.id;
      this.commandName = command.name;
      this.icon = command.icon || '';

      // 加载正则表达式相关属性
      this.regexPattern = command.regexPattern || '';
      this.regexReplacement = command.regexReplacement || '';
      this.regexCaseInsensitive = command.regexCaseInsensitive || false;
      this.regexGlobal = command.regexGlobal !== false; // 默认为true
      this.regexMultiline = command.regexMultiline || false;

      // 加载条件匹配相关属性
      this.useCondition = command.useCondition || false;
      this.conditionPattern = command.conditionPattern || '';
    } else {
      // 默认值
      this.commandId = '';
      this.commandName = '';
      this.icon = '';

      // 正则表达式默认值
      this.regexPattern = '';
      this.regexReplacement = '';
      this.regexCaseInsensitive = false;
      this.regexGlobal = true;
      this.regexMultiline = false;

      // 条件匹配默认值
      this.useCondition = false;
      this.conditionPattern = '';
    }
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('custom-commands-modal');
    contentEl.empty();
    contentEl.createEl('h2', { text: this.commandIndex !== null ? t('Edit regular expression command') : t('Add regular expression command') });

    // 基本设置部分
    const basicSettingsContainer = contentEl.createDiv('basic-settings-container');

    const commandIdSetting = new Setting(basicSettingsContainer)
      .setName(t('Command ID'))
      .setDesc(t('Unique identifier, no spaces, e.g.: "my-custom-format"'))
      .addText(text => {
        text.setValue(this.commandId);
        // 如果是编辑模式，设置为只读
        if (this.commandIndex !== null) {
          text.setDisabled(true);
          text.inputEl.addClass('id-is-disabled');
        } else {
          text.onChange(value => {
            this.commandId = value;
            // 更新命令ID输入框的值
            const commandNameInput = contentEl.querySelector('.setting-item:nth-child(2) input');
            if (commandNameInput instanceof HTMLInputElement) {
              commandNameInput.value = value;
              this.commandName = value;
            }
          });
        }
        return text;
      });

    const commandNameSetting = new Setting(basicSettingsContainer)
      .setName(t('Command Name'))
      .setDesc(t('Displayed name in toolbar and menu'))
      .addText(text => text
        .setValue(this.commandName)
        .onChange(value => this.commandName = value)
      );

    // 正则表达式设置容器
    const regexContainer = contentEl.createDiv('regex-settings');
    regexContainer.style.border = '1px solid var(--background-modifier-border)';
    regexContainer.style.padding = '10px';
    regexContainer.style.borderRadius = '5px';
    regexContainer.style.marginBottom = '10px';

    // 使用原生 details/summary 创建可折叠的AI提示指南
    const aiHelpContainer = regexContainer.createEl('details', { cls: 'ai-help-container' });
    aiHelpContainer.style.marginBottom = '10px';
    aiHelpContainer.style.borderRadius = '5px';
    aiHelpContainer.style.overflow = 'hidden';

    const aiHelpSummary = aiHelpContainer.createEl('summary', { text: t('How to use AI to get regular expressions?') });
    aiHelpSummary.style.padding = '8px 12px';
    aiHelpSummary.style.backgroundColor = 'var(--background-secondary)';
    aiHelpSummary.style.cursor = 'pointer';
    aiHelpSummary.style.fontWeight = 'bold';
    aiHelpSummary.style.borderRadius = '4px';
    aiHelpSummary.style.userSelect = 'none';

    const aiHelpContent = aiHelpContainer.createDiv('ai-help-content');
    aiHelpContent.style.padding = '6px';
    aiHelpContent.style.backgroundColor = 'var(--background-secondary-alt)';
    aiHelpContent.style.borderBottomLeftRadius = '5px';
    aiHelpContent.style.borderBottomRightRadius = '5px';
    aiHelpContent.style.marginTop = '1px';

    // 使内容可复制
    aiHelpContent.setAttribute('contenteditable', 'false');
    aiHelpContent.style.userSelect = 'text';

    aiHelpContent.innerHTML = `
      <p><strong>${t('AI question template:')}</strong><br>
    ${t('[Description]')}:
      ${t('I need to convert the url to a markdown format link')}
    <br>
    ${t('[Example]')}: 
      ${t('For example, convert https://example.com to [https://example.com](https://example.com)')}
    <br>
    ${t('[Requirements]')}:  
      ${t('Use js regular expression to implement, and output the parameters in the following format (the result does not need to be escaped with json)')}
    <br>
    ${t('[Output]')}:
    <br>
      "name": "[Descriptive Name]", <br>
      "pattern": "[Regex Pattern]", <br>
      "replacement": "[Replacement Pattern, if applicable]", <br>
      "flags": "[Regex Flags]" <br>
    </p>
    `;

    // 添加正则表达式模式设置
    new Setting(regexContainer)
      .setName(t('Matching pattern'))
      .setDesc(t('Regex pattern to match'))
      .addText(text =>
        this.regexPatternInput = text
          .setValue(this.regexPattern)
          .onChange(value => {
            this.regexPattern = value;
            this.updatePreview();
          })
      );

    // 添加替换模式设置
    new Setting(regexContainer)
      .setName(t('Replacement pattern'))
      .setDesc(t('Replacement pattern (use $1, $2, etc. to reference capture groups)')+t('Use \\n to represent line breaks'))
      .addText(text =>
        this.regexReplacementInput = text
// 显示时，把真实换行符变成 \n
      .setValue(this.regexReplacement.replace(/\n/g, '\\n'))
      .onChange(value => {
        // 保存时，把 \n 变成真实换行符
        this.regexReplacement = value.replace(/\\n/g, '\n');
        this.updatePreview();
      })
      );

    // 添加正则表达式选项
    const regexOptionsContainer = regexContainer.createDiv('regex-options');
    regexOptionsContainer.style.display = 'flex';
    regexOptionsContainer.style.gap = '8px';

    new Setting(regexOptionsContainer)
      .setName(t('Ignore case'))
      .setDesc(t('Match case-insensitive'))
      .addToggle(toggle => toggle
        .setValue(this.regexCaseInsensitive)
        .onChange(value => {
          this.regexCaseInsensitive = value;
          this.updatePreview();
        })
      );

    new Setting(regexOptionsContainer)
      .setName(t('Global replace'))
      .setDesc(t('Replace all matches'))
      .addToggle(toggle => toggle
        .setValue(this.regexGlobal)
        .onChange(value => {
          this.regexGlobal = value;
          this.updatePreview();
        })
      );

    new Setting(regexOptionsContainer)
      .setName(t('Multiline mode'))
      .setDesc(t('^ and $ match the start and end of each line'))
      .addToggle(toggle =>
        this.regexMultilineToggle = toggle
          .setValue(this.regexMultiline)
          .onChange(value => {
            this.regexMultiline = value;
            this.updatePreview();
          })
      );
   

    // 条件匹配设置
    const conditionContainer = regexContainer.createDiv('condition-container');

    new Setting(conditionContainer)
      .setName(t('Use condition'))
      .setDesc(t('Only apply custom command when text matches the condition'))
      .addToggle(toggle =>
        this.useConditionToggle = toggle
          .setValue(this.useCondition)
          .onChange(value => {
            this.useCondition = value;
            conditionSettingsContainer.style.display = value ? 'block' : 'none';
          })
      );

    const conditionSettingsContainer = conditionContainer.createDiv('condition-settings');
    conditionSettingsContainer.style.display = this.useCondition ? 'block' : 'none';
    conditionSettingsContainer.style.border = '1px solid var(--background-modifier-border)';
    conditionSettingsContainer.style.padding = '10px';
    conditionSettingsContainer.style.borderRadius = '5px';
    conditionSettingsContainer.style.marginBottom = '15px';

    new Setting(conditionSettingsContainer)
      .setName(t('Condition pattern'))
      .setDesc(t('Must exist regular expression or text'))
      .addText(text =>
        this.conditionPatternInput = text
          .setValue(this.conditionPattern)
          .onChange(value => {
            this.conditionPattern = value;
          })
      );

    // 图标设置
    const iconSetting = new Setting(regexContainer)
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
      .setButtonText(t('Choose icon'))
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
      // 正则演示
    const regexHelpContainer = regexContainer.createSpan('regex-help');
    // 使用原生 details/summary 创建可折叠的正则表达式示例
    const regexExamplesContainer = regexContainer.createEl('details', { cls: 'regex-examples-container' });
    regexExamplesContainer.style.marginTop = '15px';
    regexExamplesContainer.style.borderRadius = '5px';
    regexExamplesContainer.style.overflow = 'hidden';

    const examplesSummary = regexExamplesContainer.createEl('summary', { text: t('Regular expression examples') });
    examplesSummary.style.padding = '8px 12px';
    examplesSummary.style.backgroundColor = 'var(--background-secondary)';
    examplesSummary.style.cursor = 'pointer';
    examplesSummary.style.fontWeight = 'bold';
    examplesSummary.style.borderRadius = '4px';
    examplesSummary.style.userSelect = 'none';

    const examplesContent = regexExamplesContainer.createDiv('examples-content');
    examplesContent.style.padding = '10px';
    examplesContent.style.backgroundColor = 'var(--background-secondary-alt)';
    examplesContent.style.borderBottomLeftRadius = '5px';
    examplesContent.style.borderBottomRightRadius = '5px';
    examplesContent.style.marginTop = '1px';

    const examplesList = examplesContent.createEl('ul');
    examplesList.style.paddingLeft = '20px';
    examplesList.style.margin = '0';

    const examples = [
      {
        name: t('URL to Markdown link'),
        pattern: '(https?://\\S+)',
        replacement: '[$1]($1)'
      },
      {
        name: t('Convert MM/DD/YYYY to YYYY-MM-DD'),
        pattern: '(\\d{1,2})/(\\d{1,2})/(\\d{4})',
        replacement: '$3-$1-$2'
      },
      {
        name: t('Add bold to keywords'),
        pattern: '\\b(important|critical|urgent)\\b',
        replacement: '**$1**'
      },
      {
        name: t('Format phone number'),
        pattern: '(\\d{3})(\\d{3})(\\d{4})',
        replacement: '($1) $2-$3'
      },
      {
        name: t('Remove extra spaces'),
        pattern: '\\s{2,}',
        replacement: ' '
      },
      {
        name: t('Convert HTML bold tags to Markdown format'),
        pattern: '<strong>(.*?)</strong>',
        replacement: '**$1**'
      },
  
      {
        name: t('Convert quoted text to quote block'),
        pattern: '"([^"]+)"',
        replacement: '> $1'
      },
      {
        name: t('Add uniform alias to Markdown links'),
        pattern: '\\[([^\\]]+)\\]\\(([^\\)]+)\\)',
        replacement: '[$1|alias]($2)'
      },
      {
        name: t('Delete empty lines (multiline mode)'),
        pattern: '^\\s*$\\n',
        replacement: '',
        toggleMultiline: true
      },
      {
        name: t('Add list symbol to each line (multiline mode)'),
        pattern: '^(.+)$',
        replacement: '- $1',
        toggleMultiline: true
      },
      // 添加使用条件格式的示例
      {
        name: t('If the text contains important, set the text highlight (conditional format)'),
        pattern: '(.+)',
        replacement: '==$1==',
        useCondition: true,
        conditionPattern: 'important'
      }
    ];

    examples.forEach(example => {
      const item = examplesList.createEl('li');
      item.style.marginBottom = '8px';

      const link = item.createEl('a', {
        text: example.name,
        href: '#'
      });
      link.style.color = 'var(--text-accent)';
      link.style.textDecoration = 'none';
      link.addEventListener('mouseenter', () => {
        link.style.textDecoration = 'underline';
      });
      link.addEventListener('mouseleave', () => {
        link.style.textDecoration = 'none';
      });

      link.addEventListener('click', (e) => {
        e.preventDefault();
        // 设置示例值
        this.regexPattern = example.pattern;
        this.regexReplacement = example.replacement;

        // 更新输入框

        this.regexPatternInput.setValue(example.pattern);
        this.regexReplacementInput.setValue(example.replacement);

        // 如果示例包含条件格式，则设置条件相关属性
        if (example.useCondition) {
          this.useCondition = true;
          this.conditionPattern = example.conditionPattern || '';
          this.useConditionToggle.setValue(true);
          this.conditionPatternInput.setValue(this.conditionPattern);
          conditionSettingsContainer.style.display = 'block';
        }else{
          this.useCondition = false;
          this.useConditionToggle.setValue(false);
          this.conditionPatternInput.setValue('');
          conditionSettingsContainer.style.display = 'none';
        }
        if (example.toggleMultiline) {
          this.regexMultilineToggle.setValue(true);
        }else{
          this.regexMultilineToggle.setValue(false);
        }

        this.updatePreview();

        // 点击示例后自动关闭示例列表 
        regexExamplesContainer.removeAttribute('open');
      });
    });
    // 预览部分
    const previewContainer = contentEl.createDiv('preview-container');
    previewContainer.style.marginTop = '20px';
    previewContainer.style.marginBottom = '20px';
    previewContainer.style.border = '1px solid var(--background-modifier-border)';
    previewContainer.style.padding = '10px';
    previewContainer.style.borderRadius = '5px';

    const previewLabel = previewContainer.createEl('label', { text: t('Preview') });


    const previewInputContainer = previewContainer.createDiv('preview-input-container');
    previewInputContainer.style.marginBottom = '10px';

    const previewInputLabel = previewInputContainer.createEl('label', { text: t('Example text:') });
    previewInputLabel.style.display = 'block';
    previewInputLabel.style.marginBottom = '5px';

    this.previewInput = previewInputContainer.createEl('textarea', {
      attr: {
        placeholder: t('Input example text to view the formatting effect of the command...')
      }
    });
    this.previewInput.style.height = 'auto';
    this.previewInput.style.width = '100%';
    this.previewInput.style.padding = '8px';
    this.previewInput.style.borderRadius = '4px';
    this.previewInput.style.border = '1px solid var(--background-modifier-border)';
    this.previewInput.value = "Sample text https://example.com important text    1234567890";

    this.previewInput.addEventListener('input', () => {
      this.updatePreview();
    });

    const previewOutputContainer = previewContainer.createDiv('preview-output-container');

    const previewOutputLabel = previewOutputContainer.createEl('label', { text: t('Result:') });
    previewOutputLabel.style.display = 'block';
    previewOutputLabel.style.marginBottom = '5px';

    this.previewOutput = previewOutputContainer.createDiv('preview-output');
    this.previewOutput.style.padding = '8px';
    this.previewOutput.style.borderRadius = '4px';
    this.previewOutput.style.border = '1px solid var(--background-modifier-border)';
    this.previewOutput.style.backgroundColor = 'var(--background-secondary)';
    this.previewOutput.style.minHeight = '3em';

    // 初始化预览
    this.updatePreview();

    // 添加保存和取消按钮
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('保存')
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

          // 验证正则表达式
          if (!this.regexPattern) {
            new Notice(t('Regex pattern cannot be empty'));
            return;
          }
          const commandId = this.commandIndex === null ? `custom-${this.commandId}` : this.commandId;
          // 检查ID是否已存在（编辑时除外）
          if (this.commandIndex === null) {
            const existingIndex = this.plugin.settings.customCommands.findIndex(
              cmd => cmd.id === commandId
            );
            if (existingIndex >= 0) {
              new Notice(t('Command')+' ' + this.commandId +' '+ t('already exists'), 8000);
              return;
            }
          }

          // 创建命令对象
          const command: CustomCommand = {
            id: commandId,
            name: this.commandName,
            icon: this.icon,
            // 设置为正则表达式命令
            useRegex: true,
            // 正则表达式相关属性
            regexPattern: this.regexPattern,
            regexReplacement: this.regexReplacement.replace(/\\n/g, '\n'),
            regexCaseInsensitive: this.regexCaseInsensitive,
            regexGlobal: this.regexGlobal,
            regexMultiline: this.regexMultiline,
            // 条件匹配相关属性
            useCondition: this.useCondition,
            conditionPattern: this.conditionPattern,
            // 保留必要的前缀/后缀属性，但设为空值
            prefix: '',
            suffix: '',
            char: 0,
            line: 0,
            islinehead: false
          };

          // 如果是编辑现有命令
          if (this.commandIndex !== null) {
            // 更新命令
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
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  // 添加预览更新方法
  private updatePreview() {
    const sampleText = this.previewInput.value;
    let result = sampleText;

    try {
      if (this.regexPattern) {
        // 构建正则表达式标志
        let flags = '';
        if (this.regexGlobal) flags += 'g';
        if (this.regexCaseInsensitive) flags += 'i';
        if (this.regexMultiline) flags += 'm';

        const regex = new RegExp(this.regexPattern, flags);
        const replacement = this.regexReplacement.replace(/\\n/g, '\n');
        result = sampleText.replace(regex, replacement);

        // 添加完整正则表达式代码显示
        this.showCompleteRegexCode(flags);
      }

      // 将文本中的换行符转换为HTML的<br>标签
      this.previewOutput.empty();
      result.split('\n').forEach((line, index, array) => {
        this.previewOutput.createSpan({ text: line });
        if (index < array.length - 1) {
          this.previewOutput.createEl('br');
        }
      });
      this.previewOutput.style.color = 'var(--text-normal)';
    } catch (error) {
      this.previewOutput.setText(t('Error: ') + error.message);
      this.previewOutput.style.color = 'var(--text-error)';

      // 错误时清除正则代码显示
      const codeContainer = this.previewOutput.parentElement?.querySelector('.regex-code-container');
      if (codeContainer) {
        codeContainer.remove();
      }
    }
  }

  // 添加显示完整正则表达式代码的方法
  private showCompleteRegexCode(flags: string) {
    const previewContainer = this.previewOutput.parentElement;
    if (!previewContainer) return;

    // 检查是否已存在代码容器，如果存在则更新，否则创建新的
    let codeContainer = previewContainer.querySelector('.regex-code-container');
    if (!codeContainer) {
      codeContainer = previewContainer.createDiv('regex-code-container') as HTMLDivElement;
      (codeContainer as HTMLDivElement).style.marginTop = '15px';
      (codeContainer as HTMLDivElement).style.borderTop = '1px solid var(--background-modifier-border)';
      (codeContainer as HTMLDivElement).style.paddingTop = '10px';

      const codeTitle = codeContainer.createEl('div', { text: t('Complete regular expression code (copy to AI for explanation)') });
      codeTitle.style.marginBottom = '5px';
      codeTitle.style.fontWeight = 'bold';
    } else {
      codeContainer.empty();
      const codeTitle = codeContainer.createEl('div', { text: t('Complete regular expression code (copy to AI for explanation)') });
      codeTitle.style.marginBottom = '5px';
      codeTitle.style.fontWeight = 'bold';
    }

    // 创建代码块
    const codeBlock = codeContainer.createEl('pre');
    codeBlock.style.backgroundColor = 'var(--background-code)';
    codeBlock.style.padding = '8px';
    codeBlock.style.borderRadius = '4px';
    codeBlock.style.overflowX = 'auto';
    codeBlock.style.fontFamily = 'monospace';
    codeBlock.style.fontSize = 'var(--font-smaller)';

    // 构建完整的正则表达式代码
    let codeText = `//${t('Explain the syntax of JavaScript regular expressions')}\n`;
    codeText += `const regex = /${this.escapeRegexForDisplay(this.regexPattern)}/${flags};\n`;
    codeText += `const result = text.replace(regex, "${this.escapeStringForDisplay(this.regexReplacement)}");\n`;

    if (this.useCondition && this.conditionPattern) {
      codeText += `\n//${t('Conditional matching')}\n`;
      codeText += `const condition = /${this.escapeRegexForDisplay(this.conditionPattern)}/;\n`;
      codeText += `if (condition.test(text)) {\n`;
      codeText += `  //${t('Apply regular expression replacement')}\n`;
      codeText += `  const result = text.replace(regex, "${this.escapeStringForDisplay(this.regexReplacement)}");\n`;
      codeText += `}`;
    }

    codeBlock.textContent = codeText;

    // 添加复制按钮
    const copyButton = codeContainer.createEl('button', { text: t('Copy code') });
    copyButton.style.marginTop = '5px';
    copyButton.style.padding = '4px 8px';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';

    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(codeText).then(() => {
        copyButton.textContent = t('Copied!');
        setTimeout(() => {
          copyButton.textContent = t('Copy code');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy code: ', err);
      });
    });
  }

  // 辅助方法：转义正则表达式用于显示
  private escapeRegexForDisplay(pattern: string): string {
    return pattern.replace(/\\/g, '\\\\');
  }

  // 辅助方法：转义字符串用于显示
  private escapeStringForDisplay(str: string): string {
    return str.replace(/"/g, '\\"');
  }
} 