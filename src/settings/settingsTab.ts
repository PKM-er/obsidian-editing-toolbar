import type cMenuToolbarPlugin from "src/plugin/main";
import { CommandPicker,ChooseFromIconList, ChangeCmdname } from "src/modals/suggesterModals";
import { App, Setting, PluginSettingTab, Command } from "obsidian";
import { APPEND_METHODS, AESTHETIC_STYLES, POSITION_STYLES } from "src/settings/settingsData";
import { selfDestruct, cMenuToolbarPopover, checkHtml } from "src/modals/cMenuToolbarModal";
import Sortable from "sortablejs";
import { debounce } from "obsidian";
import { GenNonDuplicateID } from "src/util/util";
import { t } from 'src/translations/helper';

export function getComandindex(item: any,arr: any[]):number
{
  let idx;
  arr.forEach((el,index) => {
    if (el.id === item) {
     idx =index;
    }
  });
  return idx;
}

export class cMenuToolbarSettingTab extends PluginSettingTab {
  plugin: cMenuToolbarPlugin;
  appendMethod: string;

  constructor(app: App, plugin: cMenuToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    addEventListener("cMenuToolbar-NewCommand", () => {
      selfDestruct();
      cMenuToolbarPopover(app, this.plugin);
      this.display();
    });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: "Obsidian Editing Toolbar" });
    containerEl.createEl("span", { text: " 原创： " }).createEl("a", {
      text: "Chetachi 👩🏽‍💻",
      href: "https://github.com/chetachiezikeuzor",
    });
    containerEl.createEl("span", { text: "     修改者： " }).createEl("a", {
      text: "Cuman ✨",
      href: "https://github.com/cumany",
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
              dispatchEvent(new Event("cMenuToolbar-NewCommand"));
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
            dispatchEvent(new Event("cMenuToolbar-NewCommand"));
          });
      });
    if(this.plugin.settings.positionStyle == "fixed")
    {
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
      .setName(t('Editing Toolbar refresh')
      )
      .setDesc(
        t("Editing Toolbar will only refresh automatically after you have either added or deleted a command from it. To see UI changes to cMenuToolbar (above settings changes) use the refresh button. If you forget to refresh in settings, no worries. There is also a refresh button in the cMenuToolbar status bar menu.")
      )
      .addButton((reloadButton) => {
        reloadButton
          .setIcon("cMenuToolbarReload")
          .setClass("cMenuToolbarSettingsButton")
          .setClass("cMenuToolbarSettingsButtonRefresh")
          .setTooltip(t("Refresh"))
          .onClick(() => {
            setTimeout(() => {
              dispatchEvent(new Event("cMenuToolbar-NewCommand"));
            }, 100);
            console.log(`%ccMenuToolbar refreshed`, "color: Violet");
          });
      });
    new Setting(containerEl)
      .setName(t('Editing Toolbar commands')
      )
      .setDesc(
        t("Add a command onto Editing Toolbar from Obsidian's commands library. To reorder the commands, drag and drop the command items. To delete them, use the delete buttom to the right of the command item. Editing Toolbar will not automaticaly refresh after reordering commands. Use the refresh button above.")
        )
      .addButton((addButton) => {
        addButton
          .setIcon("cMenuToolbarAdd")
          .setTooltip(t("Add"))
          .setClass("cMenuToolbarSettingsButton")
          .setClass("cMenuToolbarSettingsButtonAdd")
          .onClick(() => {
            new CommandPicker(this.plugin).open();
            setTimeout(() => {
              dispatchEvent(new Event("cMenuToolbar-NewCommand"));
            }, 100);
          });
      });
    const cMenuToolbarCommandsContainer = containerEl.createEl("div", {
      cls: "cMenuToolbarSettingsTabsContainer",
    });
    let dragele = "";
    Sortable.create(cMenuToolbarCommandsContainer, {
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
          dispatchEvent(new Event("cMenuToolbar-NewCommand"));
        }, 300);
      },
      onStart: function (evt) {
        dragele = evt.item.className;
      },

    });


    this.plugin.settings.menuCommands.forEach((newCommand, index) => {
      const setting = new Setting(cMenuToolbarCommandsContainer)

      if ("SubmenuCommands" in newCommand) {

        setting.settingEl.setAttribute("data-id", newCommand.id)
        setting
          .setClass("cMenuToolbarCommandItem")
          .setClass("cMenuToolbarCommandsubItem")
          .setName(newCommand.name)
          .addButton((addicon) => {
            addicon
              .setClass("cMenuToolbarSettingsIcon")
              .onClick(async() => {
                new ChooseFromIconList(this.plugin, newCommand, false).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })
          .addButton((deleteButton) => {
            deleteButton
              .setIcon("cMenuToolbarDelete")
              .setTooltip(t("Delete"))
              .setClass("cMenuToolbarSettingsButton")
              .setClass("cMenuToolbarSettingsButtonDelete")
              .onClick(async() => {
                this.plugin.settings.menuCommands.remove(newCommand);
                await this.plugin.saveSettings();
                this.display();
                setTimeout(() => {
                  dispatchEvent(new Event("cMenuToolbar-NewCommand"));
                }, 100);
                console.log(`%cCommand '${newCommand.name}' was removed from cMenuToolbar`, "color: #989cab");
              });
          });


        if (newCommand.id == "cMenuToolbar-plugin:change-font-color") return;  //修改字体颜色指令单独处理
        if (newCommand.id == "cMenuToolbar-plugin:change-background-color") return;  //修改字体颜色指令单独处理

        const cMenuToolbarCommandsContainer_sub = setting.settingEl.createEl("div", {
          cls: "cMenuToolbarSettingsTabsContainer_sub",
        });
        Sortable.create(cMenuToolbarCommandsContainer_sub, {
          group: {
            name: "item",
            pull: true,
            put: function () {
              if (dragele.includes("cMenuToolbarCommandsubItem"))
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
          onStart: function (evt) {
            //   console.log(evt);
          },
          onSort: (command) => {


            if (command.from.className === command.to.className) {
     
              const arrayResult = this.plugin.settings.menuCommands;
              const subresult = arrayResult[index]?.SubmenuCommands;
     

              if (subresult) {
                
                const [removed] = subresult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
                this.plugin.saveSettings();
              }
            } else
            if (command.to.className === "cMenuToolbarSettingsTabsContainer") {
      
              const arrayResult = this.plugin.settings.menuCommands;
              let cmdindex = getComandindex(command.path[1].dataset["id"], arrayResult);
   
              const subresult = arrayResult[cmdindex]?.SubmenuCommands;


              const [removed] = subresult.splice(command.oldIndex, 1);
              arrayResult.splice(command.newIndex, 0, removed);
              this.plugin.saveSettings();
            } else
            if (command.from.className === "cMenuToolbarSettingsTabsContainer") {
       

              const arrayResult = this.plugin.settings.menuCommands;
      
              let cmdindex = getComandindex(command.path[1].dataset["id"], arrayResult);
   
              const subresult = arrayResult[cmdindex]?.SubmenuCommands;
              const [removed] = arrayResult.splice(command.oldIndex, 1);
              subresult.splice(command.newIndex, 0, removed);
              this.plugin.saveSettings();
            }
            setTimeout(() => {
              dispatchEvent(new Event("cMenuToolbar-NewCommand"));
            }, 300);
    
          },

        });



        newCommand.SubmenuCommands.forEach((subCommand: Command) => {
          const subsetting = new Setting(cMenuToolbarCommandsContainer_sub)

          subsetting
            .setClass("cMenuToolbarCommandItem")
            .addButton((addicon) => {
              addicon
                .setClass("cMenuToolbarSettingsIcon")
                .onClick(async()=> {
                  new ChooseFromIconList(this.plugin, subCommand, true).open();
                });

              checkHtml(subCommand?.icon) ? addicon.buttonEl.innerHTML = subCommand.icon : addicon.setIcon(subCommand.icon)
            })
            .setName(subCommand.name)
            .addButton((changename) => {
              changename
                .setIcon("pencil")
                .setTooltip(t("Change Command name"))
                .setClass("cMenuToolbarSettingsButton")
                .onClick(async()=> {
                  new ChangeCmdname(this.app, this.plugin, subCommand, true).open();
                });
            })
            .addButton((deleteButton) => {
              deleteButton
                .setIcon("cMenuToolbarDelete")
                .setTooltip(t("Delete"))
                .setClass("cMenuToolbarSettingsButton")
                .setClass("cMenuToolbarSettingsButtonDelete")
                .onClick(async()=>  {
                  newCommand.SubmenuCommands.remove(subCommand);
                  await this.plugin.saveSettings();
                  this.display();
                  setTimeout(() => {
                    dispatchEvent(new Event("cMenuToolbar-NewCommand"));
                  }, 100);
                  console.log(`%cCommand '${newCommand.name}' was removed from cMenuToolbar`, "color: #989cab");
                });
            });
          subsetting.nameEl;
        });
      } else {
        setting
          .addButton((addicon) => {
            addicon
              //    .setIcon(newCommand.icon)
              .setClass("cMenuToolbarSettingsIcon")
              .onClick(async()=>  {
                new ChooseFromIconList(this.plugin, newCommand, false).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })

        if (newCommand.id == "cMenuToolbar-Divider-Line") setting.setClass("cMenuToolbar-Divider-Line")
        setting
          .setClass("cMenuToolbarCommandItem")
          .setName(newCommand.name)
          .addButton((changename) => {
            changename
              .setIcon("pencil")
              .setTooltip(t("Change Command name"))
              .setClass("cMenuToolbarSettingsButton")
              .onClick(async()=>  {
                new ChangeCmdname(this.app, this.plugin, newCommand, false).open();
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("cMenuToolbarSub")
              .setTooltip(t("Add submenu"))
              .setClass("cMenuToolbarSettingsButton")
              .setClass("cMenuToolbarSettingsButtonaddsub")
              .onClick(async()=>  {
                const submenu =
                  { id: "SubmenuCommands-" + GenNonDuplicateID(1), name: "submenu", icon: "remix-Filter3Line", SubmenuCommands: [] };
                this.plugin.settings.menuCommands.splice(index + 1, 0, submenu);
                await this.plugin.saveSettings();
                this.display();
                setTimeout(() => {
                  dispatchEvent(new Event("cMenuToolbar-NewCommand"));
                }, 100);
                console.log(`%cCommand '${submenu.id}' add `, "color: #989cab");
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("vertical-split")
              .setTooltip(t("add hr"))
              .setClass("cMenuToolbarSettingsButton")
              .setClass("cMenuToolbarSettingsButtonaddsub")
              .onClick(async()=> {
                const dividermenu =
                  { id: "cMenuToolbar-Divider-Line", name: "HR", icon: "vertical-split" };
                this.plugin.settings.menuCommands.splice(index + 1, 0, dividermenu);
                await this.plugin.saveSettings();
                this.display();
                setTimeout(() => {
                  dispatchEvent(new Event("cMenuToolbar-NewCommand"));
                }, 100);

              });
          })
          .addButton((deleteButton) => {
            deleteButton
              .setIcon("cMenuToolbarDelete")
              .setTooltip(t("Delete"))
              .setClass("cMenuToolbarSettingsButton")
              .setClass("cMenuToolbarSettingsButtonDelete")
              .onClick(async()=> { 
                this.plugin.settings.menuCommands.remove(newCommand);
                await this.plugin.saveSettings();
                this.display();
                setTimeout(() => {
                  dispatchEvent(new Event("cMenuToolbar-NewCommand"));
                }, 100);
                console.log(`%cCommand '${newCommand.name}' was removed from cMenuToolbar`, "color: #989cab");
              });
          });


      }
      //    setting.nameEl;
    });

    const cDonationDiv = containerEl.createEl("div", {
      cls: "cDonationSection",
    });

    const credit = createEl("p");
    const donateText = createEl("p");
    donateText.appendText(
      "If you like this Plugin and are considering donating to support continued development, use the button below!"
    );
    credit.setAttribute("style", "color: var(--text-muted)");
    cDonationDiv.appendChild(donateText);
    cDonationDiv.appendChild(credit);

    cDonationDiv.appendChild(
      createDonateButton("https://www.buymeacoffee.com/cuman")
    );
  }
}

const createDonateButton = (link: string): HTMLElement => {
  const a = createEl("a");
  a.setAttribute("href", link);
  a.addClass("buymeacoffee-img");
  a.innerHTML = `<img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee &emoji=&slug=Cuman&button_colour=BD5FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" />`;
  return a;
};
 


