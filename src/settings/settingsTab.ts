import type editingToolbarPlugin from "src/plugin/main";
import { CommandPicker, ChooseFromIconList, ChangeCmdname } from "src/modals/suggesterModals";
import { App, Setting, PluginSettingTab, Command } from "obsidian";
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
    icon: 'custom-command'
  },
  {
    id: 'commands',
    name: t('Toolbar Commands'),
    icon: 'command'
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
  constructor(app: App, plugin: editingToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
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
      
      tabButton.createEl('span', { cls: `setting-editor-icon ${tab.icon}` });
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
    switch(this.activeTab) {
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
    }
  }

  // 拆分设置项到不同方法
  private displayGeneralSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
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

    // Mobile setting
    new Setting(containerEl)
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
    // Aesthetic style setting
    new Setting(containerEl)
      .setName(t('Editing Toolbar aesthetic'))
      .setDesc(t('Choose between a glass morphism, tiny and default style'))
      .addDropdown((dropdown) => {
        let aesthetics: Record<string, string> = {};
        AESTHETIC_STYLES.map((aesthetic) => (aesthetics[aesthetic] = aesthetic));
        dropdown
          .addOptions(aesthetics)
          .setValue(this.plugin.settings.aestheticStyle)
          .onChange((value) => {
            this.plugin.settings.aestheticStyle = value;
            this.plugin.saveSettings();
            this.triggerRefresh();
          });
      });

    // Position style setting
    new Setting(containerEl)
      .setName(t('Editing Toolbar position'))
      .setDesc(t('Choose between fixed position or cursor following mode'))
      .addDropdown((dropdown) => {
        let positions: Record<string, string> = {};
        POSITION_STYLES.map((position) => (positions[position] = position));
        dropdown
          .addOptions(positions)
          .setValue(this.plugin.settings.positionStyle)
          .onChange((value) => {
            this.plugin.settings.positionStyle = value;
            if(value == "top") this.plugin.settings.aestheticStyle = "glass";
            if(value == "fixed") this.plugin.settings.aestheticStyle = "default";
            if(value == "following") this.plugin.settings.aestheticStyle = "tiny";
            this.plugin.saveSettings();
            this.triggerRefresh();
          });
      });
      if (this.plugin.settings.positionStyle == "top") {
        
        new Setting(containerEl)
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
            t('Choose the number of columns per row to display on Editing Toolbar. To see the change, hit the refresh button below, or in the status bar menu.')
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
    new Setting(containerEl)
      .setName(t('Editing Toolbar commands'))
      .setDesc(t("Add a command onto Editing Toolbar from Obsidian's commands library. To reorder the commands, drag and drop the command items. To delete them, use the delete buttom to the right of the command item. Editing Toolbar will not automaticaly refresh after reordering commands. Use the refresh button above."))
      .addButton((addButton) => {
        addButton
          .setIcon("plus")
          .setTooltip(t("Add"))
          .onClick(() => {
            new CommandPicker(this.plugin).open();
            this.triggerRefresh();
          });
      });

 


  
       // 现有的命令列表代码
       this.createCommandList(containerEl);
  }
  private displayCustomCommandSettings(containerEl: HTMLElement): void {
    
    // 添加自定义命令设置部分
    new Setting(containerEl)
      .setName(t('Custom Format Commands'))
      .setDesc(t('Add, edit or delete custom format commands'))
      .addButton(button => button
        .setIcon("plus")
        .setTooltip(t("Add"))
        .onClick(() => {
          // 打开添加命令的模态框
          new CustomCommandModal(this.app, this.plugin, null).open();
        })
      );
     // 显示现有的自定义命令
     const customCommandsContainer = containerEl.createDiv('custom-commands-container');
     this.plugin.settings.customCommands.forEach((command, index) => {
       const commandSetting = new Setting(customCommandsContainer)
         .setName(command.name)
         .setDesc(`${t('ID')}: ${command.id}, ${t('Prefix')}: ${command.prefix}, ${t('Suffix')}: ${command.suffix}`)
         .addButton((addicon) => {
           addicon
             .setClass("editingToolbarSettingsIcon")
           checkHtml(command.icon) ? addicon.buttonEl.innerHTML = command.icon : addicon.setIcon(command.icon)
         })
         .addButton(button => button
           .setIcon('pencil')
           .setTooltip(t('Edit'))
           .onClick(() => {
             // 打开编辑命令的模态框
             new CustomCommandModal(this.app, this.plugin, index).open();
           })
         )
         .addButton(button => button
           .setIcon('editingToolbarDelete')
           .setTooltip(t('Delete'))
           .onClick(async () => {
             this.plugin.settings.customCommands.splice(index, 1);
             await this.plugin.saveSettings();
             // 使用公共方法
             this.plugin.reloadCustomCommands();
             // 刷新设置界面
             this.display();
           })
         );
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
      text: "Obsidian Editing Toolbar:"+this.plugin.manifest.version,
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
    new Setting(containerEl)
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

          this.setupPickrEvents(pickr, `custom_bg${i + 1}`);
          this.pickrs.push(pickr);
        }
      });



    new Setting(containerEl)
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

          this.setupPickrEvents(pickr, `custom_fc${i + 1}`);
          this.pickrs.push(pickr);
        }
      });
  }

  private createCommandList(containerEl: HTMLElement): void {
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
          const arrayResult = this.plugin.settings.menuCommands;
          const [removed] = arrayResult.splice(command.oldIndex, 1)
          arrayResult.splice(command.newIndex, 0, removed);
          this.plugin.saveSettings();
        }
        this.triggerRefresh();
      },
      onStart: function (evt) {
        dragele = evt.item.className;
      },
    });


    this.plugin.settings.menuCommands.forEach((newCommand: Command, index: number) => {
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
                new ChooseFromIconList(this.plugin, newCommand, false).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })
          .addButton((deleteButton) => {
            deleteButton
              .setIcon("editingToolbarDelete")
              .setTooltip(t("Delete"))
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonDelete")
              .onClick(async () => {
                this.plugin.settings.menuCommands.remove(newCommand);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
                console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
              });
          });


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
          fallbackClass: "sortable-fallback",
          easing: "cubic-bezier(1, 0, 0, 1)",
          onStart: function () { },
          onSort: (command) => {


            if (command.from.className === command.to.className) {

              const arrayResult = this.plugin.settings.menuCommands;
              const subresult = arrayResult[index]?.SubmenuCommands;


              if (subresult) {

                const [removed] = subresult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
                this.plugin.saveSettings();
              }
            } else if (command.to.className === "editingToolbarSettingsTabsContainer") {
              // 从子菜单拖动到父菜单的逻辑
              const arrayResult = this.plugin.settings.menuCommands;

              let cmdindex = getComandindex(command.target.parentElement.dataset["id"], arrayResult);

              const subresult = arrayResult[cmdindex]?.SubmenuCommands;

              if (subresult) {

                const [removed] = subresult.splice(command.oldIndex, 1);
                arrayResult.splice(command.newIndex, 0, removed);
                this.plugin.saveSettings();

              } else {
                console.error('Subresult is undefined.');
              }
            } else if (command.from.className === "editingToolbarSettingsTabsContainer") {
              // 从父菜单拖动到子菜单的逻辑
              const arrayResult = this.plugin.settings.menuCommands;
              const fromDatasetId = command.target.parentElement.dataset["id"];



              const cmdindex = getComandindex(fromDatasetId, arrayResult);




              const subresult = arrayResult[cmdindex]?.SubmenuCommands;


              if (subresult) {

                const [removed] = arrayResult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
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
                  new ChooseFromIconList(this.plugin, subCommand, true).open();
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
                  new ChangeCmdname(this.app, this.plugin, subCommand, true).open();
                });
            })
            .addButton((deleteButton) => {
              deleteButton
                .setIcon("editingToolbarDelete")
                .setTooltip(t("Delete"))
                .setClass("editingToolbarSettingsButton")
                .setClass("editingToolbarSettingsButtonDelete")
                .onClick(async () => {
                  newCommand.SubmenuCommands.remove(subCommand);
                  await this.plugin.saveSettings();
                  this.display();
                  this.triggerRefresh();
                  console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
                });
            });
          subsetting.nameEl;

        });
      } else {
        setting
          .addButton((addicon) => {
            addicon
              //    .setIcon(newCommand.icon)
              .setClass("editingToolbarSettingsIcon")
              .onClick(async () => {
                new ChooseFromIconList(this.plugin, newCommand, false).open();
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
                new ChangeCmdname(this.app, this.plugin, newCommand, false).open();
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
                this.plugin.settings.menuCommands.splice(index + 1, 0, submenuCommand);
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
                this.plugin.settings.menuCommands.splice(index + 1, 0, dividermenu);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();

              });
          })
          .addButton((deleteButton) => {
            deleteButton
              .setIcon("editingToolbarDelete")
              .setTooltip(t("Delete"))
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonDelete")
              .onClick(async () => {
                this.plugin.settings.menuCommands.remove(newCommand);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
                console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
              });
          });


      }
      //    setting.nameEl;
    });
  }

  private setupPickrEvents(pickr: Pickr, settingKey: string) {
    pickr
      .on('save', async (color: Pickr.HSVaColor, instance: Pickr) => {
        if (!color) return;
        (this.plugin.settings as any)[settingKey] = color.toHEXA().toString();
        await this.plugin.saveSettings();
        instance.hide();
        instance.addSwatch(color.toHEXA().toString());
      })
      .on('show', () => {
        const { result } = (pickr.getRoot() as any).interaction;
        requestAnimationFrame(() => result.select());
      })
      .on('cancel', (instance: Pickr) => {
        instance.hide();
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
}




