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

import Pickr from "@simonwep/pickr";
import '@simonwep/pickr/dist/themes/nano.min.css';

// 添加类型定义
interface SubmenuCommand {
  id: string;
  name: string;
  icon: string;
  SubmenuCommands: ToolbarCommand[];
}

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
    containerEl.createEl("h1", { text: "Obsidian Editing Toolbar" });

    containerEl.createEl("span", { text: "     作者： " }).createEl("a", {
      text: "Cuman ✨",
      href: "https://github.com/cumany",
    });
    containerEl.createEl("span", { text: "     教程： " }).createEl("a", {
      text: "pkmer.cn",
      href: "https://pkmer.cn/show/20230329145815",
    });
    containerEl.createEl("h2", { text: t("Plugin Settings") });
    new Setting(containerEl)
      .setName(t('Editing Toolbar append method'))
      .setDesc(
        t('Choose where Editing Toolbar will append upon regeneration. To see the change, hit the refresh button below, or in the status bar menu.')
      )
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
    new Setting(containerEl)
      .setName(t('Editing Toolbar aesthetic')
      )
      .setDesc(
        t('Choose between a glass morphism ,tiny and default style for Editing Toolbar. To see the change, hit the refresh button below, or in the status bar menu.')
      )
      .addDropdown((dropdown) => {
        let aesthetics: Record<string, string> = {};
        AESTHETIC_STYLES.map(
          (aesthetic) => (aesthetics[aesthetic] = aesthetic)
        );
        dropdown.addOptions(aesthetics);
        dropdown
          .setValue(this.plugin.settings.aestheticStyle)
          .onChange((aestheticStyle: string) => {
            this.plugin.settings.aestheticStyle = aestheticStyle;
            this.plugin.saveSettings();
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
          });
      });
    new Setting(containerEl)
      .setName(t('Editing Toolbar position')
      )
      .setDesc(t('Choose between fixed position or cursor following mode.')
      )
      .addDropdown((dropdown) => {
        let posotions: Record<string, string> = {};
        POSITION_STYLES.map((posotion: string) => (posotions[posotion] = posotion));
        dropdown.addOptions(posotions);
        dropdown
          .setValue(this.plugin.settings.positionStyle)
          .onChange((positionStyle: string) => {
            this.plugin.settings.positionStyle = positionStyle;
            this.plugin.saveSettings();
            dispatchEvent(new Event("editingToolbar-NewCommand"));
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
            setTimeout(() => {
              this.display();
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
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


    new Setting(containerEl)
      .setName(t('Mobile enabled or not')
      )
      .setDesc(
        t("Whether to enable on mobile devices with device width less than 768px, the default is disable.")
      )
      .addToggle(toggle => toggle.setValue(this.plugin.settings?.isLoadOnMobile ?? false)
        .onChange((value) => {
          this.plugin.settings.isLoadOnMobile = value;
          this.plugin.saveSettings();
          setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100);
        }));
    new Setting(containerEl)
      .setName(t('Editing Toolbar refresh')
      )
      .setDesc(
        t("Editing Toolbar will only refresh automatically after you have either added or deleted a command from it. To see UI changes to editingToolbar (above settings changes) use the refresh button. If you forget to refresh in settings, no worries. There is also a refresh button in the editingToolbar status bar menu.")
      )
      .addButton((reloadButton) => {
        reloadButton
          .setIcon("editingToolbarReload")
          .setClass("editingToolbarSettingsButton")
          .setClass("editingToolbarSettingsButtonRefresh")
          .setTooltip(t("Refresh"))
          .onClick(() => {
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
            console.log(`%ceditingToolbar refreshed`, "color: Violet");
          });
      });

    let isView: true;


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

    new Setting(containerEl)
      .setName(t('Editing Toolbar commands')
      )
      .setDesc(
        t("Add a command onto Editing Toolbar from Obsidian's commands library. To reorder the commands, drag and drop the command items. To delete them, use the delete buttom to the right of the command item. Editing Toolbar will not automaticaly refresh after reordering commands. Use the refresh button above.")
      )
      .addButton((addButton) => {
        addButton
          .setIcon("editingToolbarAdd")
          .setTooltip(t("Add"))
          .setClass("editingToolbarSettingsButton")
          .setClass("editingToolbarSettingsButtonAdd")
          .onClick(() => {
            new CommandPicker(this.plugin).open();
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
          });
      });
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
      onSort: (command) => {
        if (command.from.className === command.to.className) {
          const arrayResult = this.plugin.settings.menuCommands;
          const [removed] = arrayResult.splice(command.oldIndex, 1)
          arrayResult.splice(command.newIndex, 0, removed);
          this.plugin.saveSettings();
        }
        setTimeout(() => {
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 300);
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
                setTimeout(() => {
                  dispatchEvent(new Event("editingToolbar-NewCommand"));
                }, 100);
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
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 300);

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
                  setTimeout(() => {
                    dispatchEvent(new Event("editingToolbar-NewCommand"));
                  }, 100);
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
                setTimeout(() => {
                  dispatchEvent(new Event("editingToolbar-NewCommand"));
                }, 100);
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
                setTimeout(() => {
                  dispatchEvent(new Event("editingToolbar-NewCommand"));
                }, 100);

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
                setTimeout(() => {
                  dispatchEvent(new Event("editingToolbar-NewCommand"));
                }, 100);
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
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }
}




