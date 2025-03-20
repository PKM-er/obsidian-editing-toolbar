import type editingToolbarPlugin from "src/plugin/main";
import { CommandPicker, ChooseFromIconList, ChangeCmdname } from "src/modals/suggesterModals";
import { App, Setting, PluginSettingTab, Command, Notice, setIcon } from "obsidian";
import { APPEND_METHODS, AESTHETIC_STYLES, POSITION_STYLES } from "src/settings/settingsData";
import { selfDestruct, editingToolbarPopover, checkHtml } from "src/modals/editingToolbarModal";
import Sortable from "sortablejs";
import { debounce } from "obsidian";
import { GenNonDuplicateID } from "src/util/util";
import { t } from 'src/translations/helper';
import { ToolbarCommand } from './ToolbarSettings';
import { UpdateNoticeModal } from "src/modals/updateModal";
import Pickr from "@simonwep/pickr";
import '@simonwep/pickr/dist/themes/nano.min.css';
import { CustomCommandModal } from "src/modals/CustomCommandModal";
import { DeployCommandModal } from "src/modals/DeployCommand";
import { ImportExportModal } from "src/modals/ImportExportModal";
import { RegexCommandModal } from "src/modals/RegexCommandModal";
import { ButtonComponent } from "obsidian";

// 添加类型定义
interface SubmenuCommand {
  id: string;
  name: string;
  icon: string;
  SubmenuCommands: ToolbarCommand[];
}

interface SettingTab {
  id: string;
  name: string;
  icon: string;
}

// 定义设置标签页
const SETTING_TABS: SettingTab[] = [
  {
    id: 'general',
    name: t('General'),
    icon: 'gear'
  },
  {
    id: 'appearance',
    name: t('Appearance'),
    icon: 'brush'
  },
  {
    id: 'customcommands',
    name: t('Custom Commands'),
    icon: 'lucide-rectangle-ellipsis'
  },
  {
    id: 'commands',
    name: t('Toolbar Commands'),
    icon: 'lucide-command'
  },
  {
    id: 'importexport',
    name: t('Import/Export'),
    icon: 'lucide-import'
  },
];

export function getPickrSettings(opts: {
  isView: boolean;
  el: HTMLElement;
  containerEl: HTMLElement;
  swatches: string[];
  opacity: boolean | undefined;
  defaultColor: string;
}): Pickr.Options {
  const { el, containerEl, swatches, opacity, defaultColor } = opts;

  return {
    el,
    container: containerEl,
    theme: 'nano',
    swatches,
    lockOpacity: !opacity,
    default: defaultColor,
    position: 'left-middle',
    components: {
      preview: true,
      hue: true,
      opacity: !!opacity,
      interaction: {
        hex: true,
        rgba: false,
        hsla: false,
        input: true,
        cancel: true,
        save: true,
      },
    },
  };
}



export function getComandindex(item: any, arr: any[]): number {
  let idx;
  arr.forEach((el, index) => {
    if (el.id === item) {
      idx = index;
    }
  });
  return idx;
}

export class editingToolbarSettingTab extends PluginSettingTab {
  plugin: editingToolbarPlugin;
  appendMethod: string;
  pickrs: Pickr[] = [];
  activeTab: string = 'general';
  // 添加一个属性来跟踪当前正在编辑的配置
  private currentEditingConfig: string;
  constructor(app: App, plugin: editingToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    // 初始化 currentEditingConfig
    this.currentEditingConfig = this.plugin.settings.positionStyle;

    addEventListener("editingToolbar-NewCommand", () => {
      selfDestruct();
      editingToolbarPopover(app, this.plugin);
      this.display();
    });
  }

  display(): void {
    this.destroyPickrs();
    const { containerEl } = this;
    containerEl.empty();
    // 保持现有的头部代码
    this.createHeader(containerEl);

    // 创建标签页容器
    const tabContainer = containerEl.createEl('div', {
      cls: 'editing-toolbar-tabs'
    });

    // 创建标签页按钮
    SETTING_TABS.forEach(tab => {
      const tabButton = tabContainer.createEl('div', {
        cls: `editing-toolbar-tab ${this.activeTab === tab.id ? 'active' : ''}`
      });

      setIcon(tabButton, tab.icon);
      tabButton.createEl('span', { text: tab.name });

      tabButton.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.display();
      });
    });

    // 创建设置内容容器
    const contentContainer = containerEl.createEl('div', {
      cls: 'editing-toolbar-content'
    });

    // 根据当前激活的标签页显示对应设置
    switch (this.activeTab) {
      case 'general':
        this.displayGeneralSettings(contentContainer);
        break;
      case 'appearance':
        this.displayAppearanceSettings(contentContainer);
        break;
      case 'customcommands':
        this.displayCustomCommandSettings(contentContainer);
        break;
      case 'commands':
        this.displayCommandSettings(contentContainer);
        break;
      case 'importexport':
        this.displayImportExportSettings(contentContainer);
        break;
    }
  }

  // 创建删除按钮
  private createDeleteButton(
    button: any,
    deleteAction: () => Promise<void>,
    tooltip: string = t('Delete')
  ) {
    let isConfirming = false;
    let confirmTimeout: NodeJS.Timeout;

    button
      .setIcon('editingToolbarDelete')
      .setTooltip(tooltip)
      .onClick(async () => {
        if (isConfirming) {
          // 清除确认状态和超时
          clearTimeout(confirmTimeout);
          button
            .setIcon('editingToolbarDelete')
            .setTooltip(tooltip);
          button.buttonEl.removeClass('mod-warning');
          isConfirming = false;

          // 执行删除操作
          await deleteAction();
        } else {
          // 进入确认状态
          isConfirming = true;
          button
            .setTooltip(t('Confirm delete?'))
            .setButtonText(t('Confirm delete?'));
          button.buttonEl.addClass('mod-warning');

          // 5秒后重置按钮状态
          confirmTimeout = setTimeout(() => {
            button
              .setIcon('editingToolbarDelete')
              .setTooltip(tooltip);
            button.buttonEl.removeClass('mod-warning');
            isConfirming = false;
          }, 3500);
        }
      });
  }

  // 拆分设置项到不同方法
  private displayGeneralSettings(containerEl: HTMLElement): void {
    const generalSettingContainer = containerEl.createDiv('generalSetting-container');
    generalSettingContainer.style.padding = '16px';
    generalSettingContainer.style.borderRadius = '8px';
    generalSettingContainer.style.backgroundColor = 'var(--background-secondary)';
    generalSettingContainer.style.marginBottom = '20px';
    new Setting(generalSettingContainer)
      .setName(t('Editing Toolbar append method'))
      .setDesc(t('Choose where Editing Toolbar will append upon regeneration.'))
      .addDropdown((dropdown) => {
        let methods: Record<string, string> = {};
        APPEND_METHODS.map((method) => (methods[method] = method));
        dropdown.addOptions(methods);
        dropdown
          .setValue(this.plugin.settings.appendMethod)
          .onChange((appendMethod) => {
            this.plugin.settings.appendMethod = appendMethod;
            this.plugin.saveSettings();
          });
      });

    // 添加多配置切换选项
    new Setting(generalSettingContainer)
      .setName(t('Enable multiple configurations'))
      .setDesc(t('Enable different command configurations for each position style (following, top, fixed)'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableMultipleConfig || false)
        .onChange(async (value) => {
          this.plugin.settings.enableMultipleConfig = value;
          //只初始化当前配置
          this.plugin.onPositionStyleChange(this.plugin.settings.positionStyle);

          await this.plugin.saveSettings();
          this.display();
        })
      );

    // Mobile setting
    new Setting(generalSettingContainer)
      .setName(t('Mobile enabled or not'))
      .setDesc(t("Whether to enable on mobile devices with device width less than 768px"))
      .addToggle(toggle => toggle.setValue(this.plugin.settings?.isLoadOnMobile ?? false)
        .onChange((value) => {
          this.plugin.settings.isLoadOnMobile = value;
          this.plugin.saveSettings();
          this.triggerRefresh();
        }));
  }

  private displayAppearanceSettings(containerEl: HTMLElement): void {

    const appearanceSettingContainer = containerEl.createDiv('appearanceSetting-container');
    appearanceSettingContainer.style.padding = '16px';
    appearanceSettingContainer.style.borderRadius = '8px';
    appearanceSettingContainer.style.backgroundColor = 'var(--background-secondary)';
    appearanceSettingContainer.style.marginBottom = '20px';
    // Aesthetic style setting


    // Position style setting
    new Setting(appearanceSettingContainer)
      .setName(t('Editing Toolbar position'))
      .setDesc(t('Choose between fixed position or cursor following mode'))
      .addDropdown((dropdown) => {
        let positions: Record<string, string> = {};
        POSITION_STYLES.map((position) => (positions[position] = position));
        dropdown
          .addOptions(positions)
          .setValue(this.plugin.settings.positionStyle)
          .onChange(async (value) => {
            this.plugin.settings.positionStyle = value;
            await this.plugin.saveSettings();
            // 调用插件的公共方法
            this.plugin.onPositionStyleChange(value);
            this.display();
          });
      });
    if (this.plugin.settings.positionStyle == "top") {

      new Setting(appearanceSettingContainer)
        .setName(t('Editing Toolbar Auto-hide')
        )
        .setDesc(
          t('The toolbar is displayed when the mouse moves over it, otherwise it is automatically hidden')
        )
        .addToggle(toggle => toggle.setValue(this.plugin.settings?.autohide)
          .onChange((value) => {
            this.plugin.settings.autohide = value;
            this.plugin.saveSettings();
            this.triggerRefresh();
          }));
    }
    if (this.plugin.settings.positionStyle == "fixed") {
      new Setting(containerEl)
        .setName(t('Editing Toolbar columns')
        )
        .setDesc(
          t('Choose the number of columns per row to display on Editing Toolbar.')
        )
        .addSlider((slider) => {
          slider
            .setLimits(1, 32, 1)
            .setValue(this.plugin.settings.cMenuNumRows)
            .onChange(
              debounce(
                async (value: number) => {
                  this.plugin.settings.cMenuNumRows = value;
                  await this.plugin.saveSettings();
                },
                100,
                true
              )
            )
            .setDynamicTooltip();
        });

    }
    // Color settings
    this.createColorSettings(containerEl);
  }

  private displayCommandSettings(containerEl: HTMLElement): void {
    const commandSettingContainer = containerEl.createDiv('commandSetting-container');
    commandSettingContainer.style.padding = '16px';
    commandSettingContainer.style.borderRadius = '8px';
    commandSettingContainer.style.backgroundColor = 'var(--background-secondary)';
    commandSettingContainer.style.marginBottom = '20px';
    if (this.plugin.settings.enableMultipleConfig) {
      const configSwitcher = new Setting(commandSettingContainer)
        .setName(t('Current Configuration'))
        .setDesc(t('Switch between different command configurations'))
        .addDropdown(dropdown => {
          // 添加基本配置选项
          dropdown.addOption('top', t('Top Style'));
          dropdown.addOption('fixed', t('Fixed Style'));
          dropdown.addOption('following', t('Following Style'));

          // 如果移动端模式开启，添加移动端配置选项
          if (this.plugin.settings.isLoadOnMobile) {
            dropdown.addOption('mobile', t('Mobile Style'));
          }

          // 使用类属性来跟踪当前配置
          dropdown.setValue(this.currentEditingConfig);

          // 监听变更
          dropdown.onChange(async (value) => {
            this.currentEditingConfig = value;
            this.display();
          });
        });
    }
    // 在显示命令配置的地方添加初始化按钮
    if (this.plugin.settings.enableMultipleConfig) {
      // 获取当前编辑的配置类型
      const currentConfigType = this.currentEditingConfig;


      const commandsArray = this.getCommandsArrayByType(currentConfigType);
      const buttonContainer = containerEl.createDiv('command-buttons-container');


      buttonContainer.style.display = 'flex';
      buttonContainer.style.flexDirection = 'column';
      buttonContainer.style.gap = '10px';

      buttonContainer.style.padding = '16px';
      buttonContainer.style.borderRadius = '8px';
      buttonContainer.style.backgroundColor = 'var(--background-secondary)';


      // 添加命令导入设置
      const importSetting = new Setting(buttonContainer)
        .setName(t('Import From'))
        .setDesc(t('Copy commands from another style configuration'));

      // 添加源样式选择下拉菜单
      let selectedSourceStyle = 'Main menu'; // 默认从主菜单导入
      const configSwitcher = new Setting(buttonContainer)

      configSwitcher.addDropdown(dropdown => {
        // 添加所有可用的样式选项，排除当前样式
        dropdown.addOption('Main menu', 'Main Menu Commands');

        if (currentConfigType !== 'following' && this.plugin.settings.followingCommands) {
          dropdown.addOption('following', t('Following Style'));
        }

        if (currentConfigType !== 'top' && this.plugin.settings.topCommands) {
          dropdown.addOption('top', t('Top Style'));
        }

        if (currentConfigType !== 'fixed' && this.plugin.settings.fixedCommands) {
          dropdown.addOption('fixed', t('Fixed Style'));
        }

        if (currentConfigType !== 'mobile' && this.plugin.settings.mobileCommands) {
          dropdown.addOption('mobile', t('Mobile Style'));
        }

        dropdown.setValue(selectedSourceStyle)
          .onChange(value => {
            selectedSourceStyle = value;
          });
      });
      configSwitcher.addExtraButton(button => button
        .setIcon('arrow-right')
      );
      // 添加导入按钮
      configSwitcher.addButton(button => button
        .setButtonText(this.currentEditingConfig.replace(this.currentEditingConfig[0], this.currentEditingConfig[0].toUpperCase()) + ' ' + t('Import'))
        .setTooltip('Copy commands from selected style')
        .onClick(async () => {
          // 获取源样式的命令数组
          const sourceCommands = this.getCommandsArrayByType(selectedSourceStyle);

          if (!sourceCommands || sourceCommands.length === 0) {
            new Notice('The selected style has no commands to import');
            return;
          }

          // 确认对话框
          const confirmMessage =
            'Import commands from' + ' ' + `"${selectedSourceStyle}"` + ' to ' + `"${this.currentEditingConfig}" ` + t(`configuration`) + '?'
            ;

          if (confirm(confirmMessage)) {
            // 根据当前配置类型导入命令
            switch (currentConfigType) {
              case 'Main menu':
                this.plugin.settings.menuCommands = [...sourceCommands];
                break;
              case 'following':
                this.plugin.settings.followingCommands = [...sourceCommands];
                break;
              case 'top':
                this.plugin.settings.topCommands = [...sourceCommands];
                break;
              case 'fixed':
                this.plugin.settings.fixedCommands = [...sourceCommands];
                break;
              case 'mobile':
                this.plugin.settings.mobileCommands = [...sourceCommands];
                break;
            }

            await this.plugin.saveSettings();
            new Notice('Commands imported successfully from' + ' ' + `"${selectedSourceStyle}"` + ' to ' + `"${this.currentEditingConfig}" ` + t(`configuration`));
            this.display();
          }
        })
      );

      // 添加清除按钮（如果当前配置有命令）
      importSetting.addButton(button => button
        .setButtonText(t('Clear') + ' ' + `${this.currentEditingConfig}`)
        .setTooltip(t('Remove all commands from this configuration'))
        .setWarning()
        .onClick(async () => {
          // 添加确认对话框
          if (confirm(t('Are you sure you want to clear all commands under the current style?'))) {
            // 根据当前配置类型清空命令
            switch (currentConfigType) {
              case 'following':
                this.plugin.settings.followingCommands = [];
                break;
              case 'top':
                this.plugin.settings.topCommands = [];
                break;
              case 'fixed':
                this.plugin.settings.fixedCommands = [];
                break;
              case 'mobile':
                this.plugin.settings.mobileCommands = [];
                break;
            }
            await this.plugin.saveSettings();
            new Notice('All commands have been removed');
            this.display();
          }
        })
      );



    } else {
      const buttonContainer = commandSettingContainer.createDiv('command-buttons-container');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.flexDirection = 'column';
      buttonContainer.style.gap = '10px';
      buttonContainer.style.marginBottom = '1rem';
      const clearButton = new Setting(buttonContainer)
      clearButton.addButton(button => button
        .setButtonText(t('One-click clear'))
        .setTooltip(t('Remove all commands from this configuration'))
        .setWarning()
        .onClick(async () => {
          // 添加确认对话框
          if (confirm(t('Are you sure you want to clear all commands under the current style?'))) {
            this.plugin.settings.menuCommands = [];
            await this.plugin.saveSettings();
            new Notice(t('All commands have been removed'));
            this.display();
          }
        })
      );
    }
    const commandListContainer = containerEl.createDiv('command-lists-container');
    commandListContainer.style.padding = '16px';
    commandListContainer.style.borderRadius = '8px';
    commandListContainer.addClass(`${this.currentEditingConfig}`);
    // 添加当前正在编辑的配置提示
    if (this.plugin.settings.enableMultipleConfig) {
      const positionStyleInfo = commandListContainer.createEl('div', {
        cls: `position-style-info ${this.currentEditingConfig}`,
        text: t(`Currently editing commands for`) + ` "${this.currentEditingConfig} Style" ` + t(`configuration`)
      });
    }

    new Setting(commandListContainer)
      .setName(t('Editing Toolbar commands'))
      .setDesc(t("Add a command onto Editing Toolbar from Obsidian's commands library. To reorder the commands, drag and drop the command items. To delete them, use the delete buttom to the right of the command item. Editing Toolbar will not automaticaly refresh after reordering commands. Use the refresh button above."))
      .addButton((addButton) => {
        addButton
          .setIcon("plus")
          .setTooltip(t("Add"))
          .onClick(() => {
            new CommandPicker(this.plugin, this.currentEditingConfig).open();
            this.triggerRefresh();
          });
      });

    // 现有的命令列表代码



    this.createCommandList(commandListContainer);
  }

  private displayCustomCommandSettings(containerEl: HTMLElement): void {
    containerEl.empty();

    const customCommandsContainer = containerEl.createDiv('custom-commands-container');

    // 添加说明
    const descriptionEl = customCommandsContainer.createEl('p', {
      text: t('Add, edit or delete custom format commands')
    });

    // 添加命令列表
    const commandListContainer = customCommandsContainer.createDiv('command-list-container');
    commandListContainer.style.padding = '16px';
    commandListContainer.style.borderRadius = '8px';
    commandListContainer.style.backgroundColor = 'var(--background-secondary)';
    commandListContainer.style.marginBottom = '20px';
    commandListContainer.style.marginTop = '20px';

    // 添加新命令按钮容器
    const addButtonContainer = customCommandsContainer.createDiv('add-command-button-container');
    addButtonContainer.style.padding = '16px';
    addButtonContainer.style.borderRadius = '8px';
    addButtonContainer.style.backgroundColor = 'var(--background-secondary)';
    addButtonContainer.style.marginBottom = '20px';
    addButtonContainer.style.marginTop = '20px';
    addButtonContainer.style.display = 'flex';
    addButtonContainer.style.gap = '10px';

    // 添加普通格式命令按钮
    const addFormatButton = addButtonContainer.createEl('button', {
      text: t('Add Format Command')
    });
    addFormatButton.addClass('mod-cta');
    addFormatButton.addEventListener('click', () => {
      // 打开新命令模态框
      new CustomCommandModal(this.app, this.plugin, null).open();
    });

    // 添加正则表达式命令按钮
    const addRegexButton = addButtonContainer.createEl('button', {
      text: t('Add Regex Command')
    });
    addRegexButton.addClass('mod-cta');
    addRegexButton.addEventListener('click', () => {
      // 打开正则表达式命令模态框

      new RegexCommandModal(this.app, this.plugin, null).open();
    });

    // 显示现有命令
    this.plugin.settings.customCommands.forEach((command, index) => {
      const commandSetting = new Setting(commandListContainer)
        .setName(command.name);

      // 创建描述元素
      const descEl = createFragment();

      // 基本描述
      let desc = `${t('ID')}: ${command.id}`;

      // 根据命令类型添加不同的描述
      if (command.useRegex) {
        desc += `, ${t('Pattern')}: ${command.regexPattern}`;
      } else {
        desc += `, ${t('Prefix')}: ${command.prefix}, ${t('Suffix')}: ${command.suffix}`;
      }

      descEl.createSpan({ text: desc });

      // 添加命令类型标签
      const typeBadge = descEl.createSpan({ cls: 'command-type-badge' });
      if (command.useRegex) {
        typeBadge.addClass('regex');
        typeBadge.setText(t('Regex'));
      } else {
        typeBadge.setText(t('Prefix/Suffix'));
      }

      commandSetting.descEl.appendChild(descEl);
      commandSetting.addButton(button => button
        .setButtonText(t('Add to Toolbar'))
        .setTooltip(t('Add this command to the toolbar'))
        .setButtonText(t('Add to Toolbar'))
        .setTooltip(t('Add this command to the toolbar'))
        .onClick(() => {
          if (this.plugin.settings.enableMultipleConfig) {
            // 如果启用了多配置，打开部署模态框
            new DeployCommandModal(this.app, this.plugin, command).open();
          } else {
            // 原有的单配置逻辑
            const isInToolbar = this.plugin.settings.menuCommands.some(
              cmd => cmd.id === `editing-toolbar:${command.id}`
            );

            if (isInToolbar) {
              new Notice(t('This command is already in the toolbar'));
              return;
            }

            const toolbarCommand = {
              id: `editing-toolbar:${command.id}`,
              name: command.name,
              icon: command.icon || 'obsidian-new'
            };

            this.plugin.settings.menuCommands.push(toolbarCommand);
            this.plugin.saveSettings().then(() => {
              new Notice(t('Command added to toolbar'));
              dispatchEvent(new Event("editingToolbar-NewCommand"));
              this.plugin.reloadCustomCommands();
            });
          }
        })
      )
        .addExtraButton(button => {
          button
            .setIcon("pencil")
            .setTooltip(t("Edit"))
            .onClick(() => {
              // 根据命令类型打开不同的编辑模态框
              if (command.useRegex) {

                new RegexCommandModal(this.app, this.plugin, index).open();
              } else {
                new CustomCommandModal(this.app, this.plugin, index).open();
              }
            });
        })
        .addButton(button => this.createDeleteButton(button, async () => {
          const customCommandId = `editing-toolbar:${this.plugin.settings.customCommands[index].id}`;

          // 从所有配置中删除该命令
          this.removeCommandFromConfig(this.plugin.settings.menuCommands, customCommandId);

          if (this.plugin.settings.enableMultipleConfig) {
            this.removeCommandFromConfig(this.plugin.settings.followingCommands, customCommandId);
            this.removeCommandFromConfig(this.plugin.settings.topCommands, customCommandId);
            this.removeCommandFromConfig(this.plugin.settings.fixedCommands, customCommandId);

            if (this.plugin.settings.isLoadOnMobile) {
              this.removeCommandFromConfig(this.plugin.settings.mobileCommands, customCommandId);
            }
          }
          this.plugin.settings.customCommands.splice(index, 1);
          await this.plugin.saveSettings();
          this.plugin.reloadCustomCommands();
          this.display();
          new Notice(t('Command deleted'));
        }))




      // 如果有图标，显示图标
      if (command.icon) {
        try {
          const iconContainer = commandSetting.nameEl.createSpan({
            cls: "editingToolbarSettingsIcon"
          });
          iconContainer.style.marginRight = "8px";
          checkHtml(command.icon) ? iconContainer.innerHTML = command.icon : setIcon(iconContainer, command.icon)
        } catch (e) {
          console.error("Failed to set icon:", e);
        }
      }
    });


  }
  // 工具方法
  private triggerRefresh(): void {
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }

  private createHeader(containerEl: HTMLElement): void {
    const headerContainer = containerEl.createEl("div", {
      cls: "editing-toolbar-header"
    });

    // 创建左侧标题容器
    const titleContainer = headerContainer.createEl("div", {
      cls: "editing-toolbar-title-container"
    });

    titleContainer.createEl("h1", {
      text: "Obsidian Editing Toolbar:" + this.plugin.manifest.version,
      cls: "editing-toolbar-title"
    });

    // 创建右侧信息容器
    const infoContainer = headerContainer.createEl("div", {
      cls: "editing-toolbar-info"
    });

    infoContainer.createEl("span", { text: "作者：" }).createEl("a", {
      text: "Cuman ✨",
      href: "https://github.com/cumany",
    });
    infoContainer.createEl("span", { text: "  教程：" }).createEl("a", {
      text: "pkmer.cn",
      href: "https://pkmer.cn/show/20230329145815",
    });

    // 添加修复按钮
    new Setting(infoContainer)
      .setClass("editing-toolbar-fix-button")
      .addButton((fixButton) => {
        fixButton
          .setIcon("wrench")
          .setTooltip(t("Fix"))
          .onClick(() => {
            new UpdateNoticeModal(this.app, this.plugin).open();
          });
      });
  }

  private createColorSettings(containerEl: HTMLElement): void {
    const paintbrushContainer = containerEl.createDiv('custom-paintbrush-container');
    paintbrushContainer.style.padding = '16px';
    paintbrushContainer.style.borderRadius = '8px';
    paintbrushContainer.style.backgroundColor = 'var(--background-secondary)';
    paintbrushContainer.style.marginBottom = '20px';
    new Setting(paintbrushContainer)
      .setName(t('🎨 Set custom background'))
      .setDesc(t('Click on the picker to adjust the colour'))
      .setClass('custom_bg')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });

        for (let i = 0; i < 5; i++) {
          const pickerEl = pickerContainer.createDiv({ cls: "picker" });

          const pickr = Pickr.create(
            getPickrSettings({
              isView: false,
              el: pickerEl,
              containerEl: pickerContainer,
              swatches: [
                '#FFB78B8C',
                '#CDF4698C',
                '#A0CCF68C',
                '#F0A7D88C',
                '#ADEFEF8C',
              ],
              opacity: true,
              defaultColor: (this.plugin.settings as any)[`custom_bg${i + 1}`] || '#000000'
            })
          );

          this.setupPickrEvents(pickr, `custom_bg${i + 1}`, 'background-color');
          this.pickrs.push(pickr);
        }
      });



    new Setting(paintbrushContainer)
      .setName(t('🖌️ Set custom font color'))
      .setDesc(t('Click on the picker to adjust the colour'))
      .setClass('custom_font')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });

        for (let i = 0; i < 5; i++) {
          const pickerEl = pickerContainer.createDiv({ cls: "picker" });

          const pickr = Pickr.create(
            getPickrSettings({
              isView: false,
              el: pickerEl,
              containerEl: pickerContainer,
              swatches: [
                '#D83931',
                '#DE7802',
                '#245BDB',
                '#6425D0',
                '#646A73',
              ],
              opacity: true,
              defaultColor: (this.plugin.settings as any)[`custom_fc${i + 1}`] || '#000000'
            })
          );

          this.setupPickrEvents(pickr, `custom_fc${i + 1}`, 'color');
          this.pickrs.push(pickr);
        }
      });
    const toolbarContainer = containerEl.createDiv('custom-toolbar-container');
    toolbarContainer.style.padding = '16px';
    toolbarContainer.style.borderRadius = '8px';
    toolbarContainer.style.backgroundColor = 'var(--background-secondary)';
    // 添加主题选择下拉框
    new Setting(toolbarContainer)
      .setName(t("Toolbar theme"))
      .setDesc(t("Select a preset toolbar theme, automatically setting the background color, icon color, and size"))
      .addDropdown(dropdown => {
        let aesthetics: Record<string, string> = {};
        AESTHETIC_STYLES.map((aesthetic) => (aesthetic == 'custom' ? aesthetics[aesthetic] = t('Custom theme') : aesthetics[aesthetic] = aesthetic));
        dropdown.addOptions(aesthetics);
        dropdown.selectEl.options[3].disabled = true; // 禁用第一个选项
        dropdown.addOption('light', '┌ Light');
        dropdown.addOption('dark', '├ Dark');
        dropdown.addOption('vibrant', '├ Vibrant');
        dropdown.addOption('minimal', '├ Minimal');
        dropdown.addOption('elegant', '└ Elegant');

        dropdown.setValue(this.plugin.settings.aestheticStyle)
        dropdown.onChange(async (value) => {
          if (value in aesthetics) {
            this.plugin.settings.aestheticStyle = value;
            this.plugin.settings.toolbarIconSize = 18;
          } else {
            this.plugin.settings.aestheticStyle = 'custom';
          }

          // 根据选择的主题设置颜色和大小
          switch (value) {
             
            case 'light':
              this.plugin.settings.toolbarBackgroundColor = '#F5F8FA';
              this.plugin.settings.toolbarIconColor = '#4A5568';
              this.plugin.settings.toolbarIconSize = 18;
              break;
            case 'dark':
              this.plugin.settings.toolbarBackgroundColor = '#2D3033';
              this.plugin.settings.toolbarIconColor = '#E2E8F0';
              this.plugin.settings.toolbarIconSize = 18;
              break;
            case 'vibrant':
              this.plugin.settings.toolbarBackgroundColor = '#7E57C2';
              this.plugin.settings.toolbarIconColor = '#FFFFFF';
              this.plugin.settings.toolbarIconSize = 20;
              break;
            case 'minimal':
              this.plugin.settings.toolbarBackgroundColor = '#F8F9FA';
              this.plugin.settings.toolbarIconColor = '#6B7280';
              this.plugin.settings.toolbarIconSize = 16;
              break;
            case 'elegant':
              this.plugin.settings.toolbarBackgroundColor = '#1A2F28';
              this.plugin.settings.toolbarIconColor = '#D4AF37';
              this.plugin.settings.toolbarIconSize = 19;
              break;
          }

          // 更新CSS变量
          this.plugin.toolbarIconSize = this.plugin.settings.toolbarIconSize;
          document.documentElement.style.setProperty('--editing-toolbar-background-color', this.plugin.settings.toolbarBackgroundColor);
          document.documentElement.style.setProperty('--editing-toolbar-icon-color', this.plugin.settings.toolbarIconColor);
          document.documentElement.style.setProperty('--toolbar-icon-size', `${this.plugin.settings.toolbarIconSize}px`);

          // 更新颜色选择器显示
          this.destroyPickrs();
          this.display();

          await this.plugin.saveSettings();
          this.triggerRefresh();
        });
      });
    new Setting(toolbarContainer)
      .setName(t("Toolbar background color"))
      .setDesc(t("Set the background color of the toolbar"))
      .setClass('toolbar_background')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });
        const pickerEl = pickerContainer.createDiv({ cls: "picker" });

        const pickr = Pickr.create(
          getPickrSettings({
            isView: false,
            el: pickerEl,
            containerEl: pickerContainer,
            swatches: ['#F5F8FA', '#F4F1E8', '#2D3033', '#1A2F28', '#2A1D3B'],
            opacity: true,
            defaultColor: this.plugin.settings.toolbarBackgroundColor
          })
        );

        this.setupPickrEvents(pickr, 'toolbarBackgroundColor', 'background-color');
        this.pickrs.push(pickr);
      });

    // new Setting(toolbarContainer)
    // .setName(t('Editing Toolbar aesthetic'))
    // .setDesc(t('Choose between a glass morphism, tiny and default style'))
    // .addDropdown((dropdown) => {
    //   let aesthetics: Record<string, string> = {};
    //   AESTHETIC_STYLES.map((aesthetic) => (aesthetics[aesthetic] = aesthetic));
    //   dropdown
    //     .addOptions(aesthetics)
    //     .setValue(this.plugin.settings.aestheticStyle)
    //     .onChange((value) => {
    //       this.plugin.settings.aestheticStyle = value;
    //       this.plugin.saveSettings();
    //       this.triggerRefresh();
    //     });
    // });


    new Setting(toolbarContainer)
      .setName(t("Toolbar icon color"))
      .setDesc(t("Set the color of the toolbar icon"))
      .setClass('toolbar_icon')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });
        const pickerEl = pickerContainer.createDiv({ cls: "picker" });

        const pickr = Pickr.create(
          getPickrSettings({
            isView: false,
            el: pickerEl,
            containerEl: pickerContainer,
            swatches: [
              '#4A5568',
              '#D4AF37',
              '#2D3033',
              '#6D5846',
              '#4C2A55',
            ],
            opacity: false,
            defaultColor: this.plugin.settings.toolbarIconColor
          })
        );

        this.pickrs.push(pickr);
        this.setupPickrEvents(pickr, 'toolbarIconColor', 'icon-color');
      });

    new Setting(toolbarContainer)
      .setName(t("Toolbar icon size"))
      .setDesc(t("Set the size of the toolbar icon (px) default 18px"))
      .addSlider((slider) => {
        slider
          .setValue(this.plugin.settings.toolbarIconSize)
          .setLimits(12, 32, 1)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.toolbarIconSize = value;
            this.plugin.toolbarIconSize = value;
            document.documentElement.style.setProperty('--toolbar-icon-size', `${value}px`);
            // 更新预览区域   
            this.plugin.settings.aestheticStyle = 'custom';

            await this.plugin.saveSettings();
        
          });
      });

    // 添加工具栏预览区域
    const previewContainer = toolbarContainer.createDiv('toolbar-preview-container');
    previewContainer.addClass('toolbar-preview-section');
    previewContainer.style.marginTop = '20px';

    const previewLabel = previewContainer.createEl('h3', {
      text: t('Toolbar preview')
    });
    previewLabel.style.marginBottom = '10px';

    // 创建预览工具栏 - 使用类似 generateMenu 的方式
    const editingToolbar = previewContainer.createDiv();
    editingToolbar.setAttribute("id", "editingToolbarModalBar");
    this.applyAestheticStyle(editingToolbar, this.plugin.settings.aestheticStyle, this.plugin.settings.positionStyle);
    // 根据当前美观风格设置类




    // 定义预览工具栏的命令
    const previewCommands = [
      { id: "bold", name: "Bold", icon: "bold" },
      { id: "italics", name: "Italics", icon: "italic" },
      { id: "trikethrough", name: "Strikethrough", icon: "strikethrough" },
      { id: "code", name: "Code", icon: "code" },
      { id: "blockquote", name: "Blockquote", icon: "quote-glyph" },
      { id: "insert-link", name: "Link", icon: "link" },
      { id: "left-sidebar", name: "Left sidebar", icon: "lucide-panel-left" },
      {
        id: "editor:insert-embed",
        name: "Add embed",
        icon: "note-glyph",
      },
      {
        id: "editor:insert-link",
        name: "Insert markdown link",
        icon: "link-glyph",
      },
      {
        id: "editor:insert-tag",
        name: "Add tag",
        icon: "price-tag-glyph",
      },
      {
        id: "editor:insert-wikilink",
        name: "Add internal link",
        icon: "bracket-glyph",
      },
      {
        id: "editor:toggle-code",
        name: "Code",
        icon: "code-glyph",
      },
      {
        id: "editor:toggle-blockquote",
        name: "Blockquote",
        icon: "lucide-text-quote",
      },
      {
        id: "editor:toggle-checklist-status",
        name: "Checklist status",
        icon: "checkbox-glyph",
      },
      {
        id: "editor:toggle-comments",
        name: "Comment",
        icon: "percent-sign-glyph",
      },

      {
        id: "editor:insert-callout",
        name: "Insert Callout",
        icon: "lucide-quote",
      },
      {
        id: "editor:insert-mathblock",
        name: "MathBlock",
        icon: "lucide-sigma-square",
      },
      {
        id: "editor:insert-table",
        name: "Insert Table",
        icon: "lucide-table",
      },

    ];

    // 为每个命令创建按钮
    previewCommands.forEach(item => {
      const button = new ButtonComponent(editingToolbar);
      button.setClass("editingToolbarCommandItem");
      button.setTooltip(item.name);

      // 设置图标
      if (item.icon) {
        setIcon(button.buttonEl, item.icon);



      }

    });


  }



  private createCommandList(containerEl: HTMLElement): void {
    // 根据编辑的配置获取对应的命令列表
    let commandsToEdit: Command[] = [];
    if (this.plugin.settings.enableMultipleConfig) {
      switch (this.currentEditingConfig) {
        case 'mobile':
          commandsToEdit = this.plugin.settings.mobileCommands;
          break;
        case 'following':
          commandsToEdit = this.plugin.settings.followingCommands;
          break;
        case 'top':
          commandsToEdit = this.plugin.settings.topCommands;
          break;
        case 'fixed':
          commandsToEdit = this.plugin.settings.fixedCommands;
          break;
        default:
          commandsToEdit = this.plugin.settings.menuCommands;
      }
    } else {
      commandsToEdit = this.plugin.settings.menuCommands;
    }

    const editingToolbarCommandsContainer = containerEl.createEl("div", {
      cls: "editingToolbarSettingsTabsContainer",
    });
    let dragele = "";
    Sortable.create(editingToolbarCommandsContainer, {
      group: "item",
      animation: 500,
      draggable: ".setting-item",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      dragoverBubble: false,
      forceFallback: true,
      fallbackOnBody: true,
      swapThreshold: 0.7,
      fallbackClass: "sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      delay: 800,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onChoose: function (evt) {
        const item = evt.item;
        item.classList.add('sortable-chosen-feedback');
      },
      onUnchoose: function (evt) {
        const item = evt.item;
        item.classList.remove('sortable-chosen-feedback');
      },
      onSort: (command) => {
        if (command.from.className === command.to.className) {
          const arrayResult = commandsToEdit;
          const [removed] = arrayResult.splice(command.oldIndex, 1)
          arrayResult.splice(command.newIndex, 0, removed);

          // 根据当前编辑的配置更新对应的命令列表
          if (this.plugin.settings.enableMultipleConfig) {
            switch (this.currentEditingConfig) {
              case 'mobile':
                this.plugin.settings.mobileCommands = arrayResult;
                break;
              case 'following':
                this.plugin.settings.followingCommands = arrayResult;
                break;
              case 'top':
                this.plugin.settings.topCommands = arrayResult;
                break;
              case 'fixed':
                this.plugin.settings.fixedCommands = arrayResult;
                break;
            }
          } else {
            this.plugin.settings.menuCommands = arrayResult;
          }
          this.plugin.saveSettings();
        }
        this.triggerRefresh();
      },
      onStart: function (evt) {
        dragele = evt.item.className;
      },
    });

    // 使用getCurrentCommands获取当前命令配置
    const currentCommands = commandsToEdit;
    currentCommands.forEach((newCommand: Command, index: number) => {
      const setting = new Setting(editingToolbarCommandsContainer)

      if ("SubmenuCommands" in newCommand) {

        setting.settingEl.setAttribute("data-id", newCommand.id)
        setting
          .setClass("editingToolbarCommandItem")
          .setClass("editingToolbarCommandsubItem")
          .setName(newCommand.name)
          .addButton((addicon) => {
            addicon
              .setClass("editingToolbarSettingsIcon")
              .onClick(async () => {
                new ChooseFromIconList(this.plugin, newCommand, false, null, this.currentEditingConfig).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })
          .addButton((deleteButton) => this.createDeleteButton(deleteButton, async () => {
            currentCommands.remove(newCommand);
            this.plugin.updateCurrentCommands(currentCommands);
            await this.plugin.saveSettings();
            this.display();
            this.triggerRefresh();
            console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
          }))



        if (newCommand.id == "editingToolbar-plugin:change-font-color") return;  //修改字体颜色指令单独处理
        if (newCommand.id == "editingToolbar-plugin:change-background-color") return;  //修改字体颜色指令单独处理

        const editingToolbarCommandsContainer_sub = setting.settingEl.createEl("div", {
          cls: "editingToolbarSettingsTabsContainer_sub",
        });
        Sortable.create(editingToolbarCommandsContainer_sub, {
          group: {
            name: "item",
            pull: true,
            put: function () {
              if (dragele.includes("editingToolbarCommandsubItem"))
                return false;
              else return true;
            }

          },
          draggable: ".setting-item",
          animation: 150,
          ghostClass: "sortable-ghost",
          chosenClass: "sortable-chosen",
          dragClass: "sortable-drag",
          dragoverBubble: false,
          fallbackOnBody: true,
          swapThreshold: 0.7,
          forceFallback: true,
          delay: 800,
          delayOnTouchOnly: true,
          touchStartThreshold: 5,
          fallbackClass: "sortable-fallback",
          easing: "cubic-bezier(1, 0, 0, 1)",
          onStart: function () { },
          onSort: (command) => {


            if (command.from.className === command.to.className) {
              // 使用getCurrentCommands获取当前命令配置
              const arrayResult = commandsToEdit;
              const subresult = arrayResult[index]?.SubmenuCommands;


              if (subresult) {

                const [removed] = subresult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
                // 使用updateCurrentCommands更新当前命令配置
                this.plugin.updateCurrentCommands(arrayResult);
                this.plugin.saveSettings();
              }
            } else if (command.to.className === "editingToolbarSettingsTabsContainer") {
              // 从子菜单拖动到父菜单的逻辑
              // 使用getCurrentCommands获取当前命令配置
              const arrayResult = commandsToEdit;

              let cmdindex = getComandindex(command.target.parentElement.dataset["id"], arrayResult);

              const subresult = arrayResult[cmdindex]?.SubmenuCommands;

              if (subresult) {

                const [removed] = subresult.splice(command.oldIndex, 1);
                arrayResult.splice(command.newIndex, 0, removed);
                // 使用updateCurrentCommands更新当前命令配置
                this.plugin.updateCurrentCommands(arrayResult);
                this.plugin.saveSettings();

              } else {
                console.error('Subresult is undefined.');
              }
            } else if (command.from.className === "editingToolbarSettingsTabsContainer") {
              // 从父菜单拖动到子菜单的逻辑
              // 使用getCurrentCommands获取当前命令配置
              const arrayResult = commandsToEdit;
              const fromDatasetId = command.target.parentElement.dataset["id"];



              const cmdindex = getComandindex(fromDatasetId, arrayResult);




              const subresult = arrayResult[cmdindex]?.SubmenuCommands;


              if (subresult) {

                const [removed] = arrayResult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
                // 使用updateCurrentCommands更新当前命令配置
                this.plugin.updateCurrentCommands(arrayResult);
                this.plugin.saveSettings();

              } else {
                console.error('Subresult is undefined.');
              }
            }
            this.triggerRefresh();
          },

        });



        newCommand.SubmenuCommands.forEach((subCommand: Command) => {
          const subsetting = new Setting(editingToolbarCommandsContainer_sub)

          subsetting
            .setClass("editingToolbarCommandItem")
            .addButton((addicon) => {
              addicon
                .setClass("editingToolbarSettingsIcon")
                .onClick(async () => {
                  new ChooseFromIconList(this.plugin, subCommand, true, null, this.currentEditingConfig).open();
                });

              checkHtml(subCommand?.icon) ? addicon.buttonEl.innerHTML = subCommand.icon : addicon.setIcon(subCommand.icon)
            })
            .setName(subCommand.name)
            .addButton((changename) => {
              changename
                .setIcon("pencil")
                .setTooltip(t("Change Command name"))
                .setClass("editingToolbarSettingsButton")
                .onClick(async () => {
                  new ChangeCmdname(this.app, this.plugin, subCommand, true, this.currentEditingConfig).open();
                });
            })
            .addButton((deleteButton) => this.createDeleteButton(deleteButton, async () => {
              newCommand.SubmenuCommands.remove(subCommand);
              await this.plugin.saveSettings();
              this.display();
              this.triggerRefresh();
              console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
            }))
          subsetting.nameEl;

        });
      } else {
        setting
          .addButton((addicon) => {
            addicon
              //    .setIcon(newCommand.icon)
              .setClass("editingToolbarSettingsIcon")
              .onClick(async () => {
                new ChooseFromIconList(this.plugin, newCommand, false, null, this.currentEditingConfig).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })

        if (newCommand.id == "editingToolbar-Divider-Line") setting.setClass("editingToolbar-Divider-Line")
        setting
          .setClass("editingToolbarCommandItem")
          .setName(newCommand.name)
          .addButton((changename) => {
            changename
              .setIcon("pencil")
              .setTooltip(t("Change Command name"))
              .setClass("editingToolbarSettingsButton")
              .onClick(async () => {
                new ChangeCmdname(this.app, this.plugin, newCommand, false, this.currentEditingConfig).open();
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("editingToolbarSub")
              .setTooltip(t("Add submenu"))
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonaddsub")
              .onClick(async () => {
                const submenuCommand: SubmenuCommand = {
                  id: "SubmenuCommands-" + GenNonDuplicateID(1),
                  name: "submenu",
                  icon: "remix-Filter3Line",
                  SubmenuCommands: []
                };
                // 使用getCurrentCommands获取当前命令配置
                const currentCommands = commandsToEdit;
                currentCommands.splice(index + 1, 0, submenuCommand);
                // 使用updateCurrentCommands更新当前命令配置
                this.plugin.updateCurrentCommands(currentCommands);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
                console.log(`%cCommand '${submenuCommand.id}' add `, "color: #989cab");
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("vertical-split")
              .setTooltip(t("add hr"))
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonaddsub")
              .onClick(async () => {
                const dividermenu =
                  { id: "editingToolbar-Divider-Line", name: "HR", icon: "vertical-split" };
                // 使用getCurrentCommands获取当前命令配置
                const currentCommands = commandsToEdit;
                currentCommands.splice(index + 1, 0, dividermenu);
                // 使用updateCurrentCommands更新当前命令配置
                this.plugin.updateCurrentCommands(currentCommands);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();

              });
          })
          .addButton((deleteButton) => this.createDeleteButton(deleteButton, async () => {
            currentCommands.remove(newCommand);
            this.plugin.updateCurrentCommands(currentCommands);
            await this.plugin.saveSettings();
            this.display();
            this.triggerRefresh();
            console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
          }))


      }
      //    setting.nameEl;
    });
  }

  private setupPickrEvents(pickr: any, settingKey: string, cssProperty: string) {
    pickr.on('save', (color: any) => {
      const hexColor = color.toHEXA().toString();
      (this.plugin.settings as any)[settingKey] = hexColor;
      document.documentElement.style.setProperty(`--editing-toolbar-${cssProperty}`, hexColor);
      this.plugin.saveSettings();


      // 当修改颜色时，切换到 custom 样式
      if (this.plugin.settings.aestheticStyle !== 'custom') {
        this.plugin.settings.aestheticStyle = 'custom';
        this.plugin.saveSettings();
        // 更新预览工具栏的样式

      }
    });
  }

  private destroyPickrs() {
    this.pickrs.forEach(pickr => {
      if (pickr) {
        pickr.destroyAndRemove();
      }
    });
    this.pickrs = [];
  }

  hide(): void {
    this.destroyPickrs();
    this.triggerRefresh();
  }

  // 添加一个辅助方法用于从配置中删除命令
  private removeCommandFromConfig(commands: any[], commandId: string) {
    if (!commands) return;

    // 删除主菜单中的命令
    for (let i = commands.length - 1; i >= 0; i--) {
      if (commands[i].id === commandId) {
        commands.splice(i, 1);
        continue;
      }

      // 检查并删除子菜单中的命令
      if (commands[i].SubmenuCommands) {
        this.removeCommandFromConfig(commands[i].SubmenuCommands, commandId);

        // 如果子菜单为空，可以选择是否删除子菜单本身
        // if (commands[i].SubmenuCommands.length === 0) {
        //   commands.splice(i, 1);
        // }
      }
    }
  }

  // 添加导入导出设置显示方法
  private displayImportExportSettings(containerEl: HTMLElement): void {
    // 添加样式
    const importExportContainer = containerEl.createDiv('import-export-container');
    importExportContainer.style.padding = '16px';
    importExportContainer.style.borderRadius = '8px';
    importExportContainer.style.backgroundColor = 'var(--background-secondary)';
    importExportContainer.style.marginBottom = '20px';

    // 导出设置
    new Setting(importExportContainer)
      .setName(t('Export Configuration'))
      .setDesc(t('Export your toolbar configuration to share with others'))
      .addButton(button => button
        .setButtonText(t('Export'))
        .setCta()
        .onClick(() => {
          new ImportExportModal(this.app, this.plugin, 'export').open();
        })
      );

    // 导入设置
    new Setting(importExportContainer)
      .setName(t('Import Configuration'))
      .setDesc(t('Import toolbar configuration from JSON'))
      .addButton(button => button
        .setButtonText(t('Import'))
        .setCta()
        .onClick(() => {
          new ImportExportModal(this.app, this.plugin, 'import').open();
        })
      );

    // 添加说明
    const infoDiv = containerEl.createDiv('import-export-info');
    infoDiv.style.marginTop = '20px';
    infoDiv.style.padding = '16px';
    infoDiv.style.borderRadius = '8px';
    infoDiv.style.backgroundColor = 'var(--background-secondary)';

    infoDiv.createEl('h3', {
      text: t('Usage Instructions'),
      cls: 'import-export-heading'
    }).style.marginTop = '0';

    const ul = infoDiv.createEl('ul');
    ul.style.paddingLeft = '20px';

    ul.createEl('li', { text: t('Export: Generate a JSON configuration that you can save or share') });
    ul.createEl('li', { text: t('Import: Paste a previously exported JSON configuration') });
    // 添加社区分享链接
    const communityDiv = containerEl.createDiv('community-share-container');
    communityDiv.style.marginTop = '20px';
    communityDiv.style.padding = '16px';
    communityDiv.style.borderRadius = '8px';
    communityDiv.style.backgroundColor = 'rgba(var(--color-green-rgb), 0.1)';
    communityDiv.style.border = '1px solid rgba(var(--color-green-rgb), 0.3)';
    communityDiv.createEl('h3', {
      text: t('Join the Community'),
      cls: 'community-heading'
    }).style.marginTop = '0';

    const shareLink = communityDiv.createEl('p');
    shareLink.innerHTML = t('Share your toolbar settings and styles in our') + ' <a href="https://github.com/PKM-er/obsidian-editing-toolbar/discussions/categories/show-and-tell" target="_blank" rel="noopener noreferrer">Show and Tell</a> ';

    const shareNote = communityDiv.createEl('p', {
      text: t('Get inspired by what others have created or showcase your own customizations.')
    });
    // 添加警告
    const warningDiv = containerEl.createDiv('import-export-warning');
    warningDiv.style.marginTop = '20px';
    warningDiv.style.padding = '16px';
    warningDiv.style.borderRadius = '8px';
    warningDiv.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)';
    warningDiv.style.border = '1px solid rgba(var(--color-red-rgb), 0.3)';

    warningDiv.createEl('p', {
      text: t('Warning: Importing configuration will overwrite your current settings. Consider exporting your current configuration first as a backup.'),
      cls: 'warning-text'
    }).style.margin = '0';
  }

  private aestheticStyleMap: { [key: string]: string } = {
    default: "editingToolbarDefaultAesthetic",
    tiny: "editingToolbarTinyAesthetic",
    glass: "editingToolbarGlassAesthetic",
    custom: "editingToolbarCustomAesthetic",
    top: "top",
    following: "editingToolbarFlex",
    fixed: "fixed",
  };
  private applyAestheticStyle(element: HTMLElement, aestheticStyle: string, positionStyle: string) {
    // 移除所有美观风格类
    Object.values(this.aestheticStyleMap).forEach(className => {
      element.removeClass(className);
    });

    // 添加当前选择的美观风格类
    const selectedAestheticClass = this.aestheticStyleMap[aestheticStyle] || this.aestheticStyleMap.default;
    element.addClass(selectedAestheticClass);

    // 添加位置样式类
    const positionClass = this.aestheticStyleMap[positionStyle] || this.aestheticStyleMap.top; // 默认使用 top 样式
    element.addClass(positionClass);
  }

  // 辅助函数：根据类型获取命令数组
  private getCommandsArrayByType(type: string) {
    switch (type) {
      case 'following':
        return this.plugin.settings.followingCommands;
      case 'top':
        return this.plugin.settings.topCommands;
      case 'fixed':
        return this.plugin.settings.fixedCommands;
      case 'mobile':
        return this.plugin.settings.mobileCommands;
      default:
        return this.plugin.settings.menuCommands;
    }
  }
}



