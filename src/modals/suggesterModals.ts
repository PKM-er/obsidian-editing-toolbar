import type cMenuToolbarPlugin from "src/plugin/main";
import { appIcons } from "src/icons/appIcons";
import { Notice, Command, setIcon, FuzzyMatch, FuzzySuggestModal, Modal, SliderComponent, TextAreaComponent, TextComponent, debounce, App } from "obsidian";
import { findmenuID } from "src/util/util";
import { setBottomValue } from "src/util/statusBarConstants";
import { t } from "src/translations/helper";

export class ChooseFromIconList extends FuzzySuggestModal<string> {
  plugin: cMenuToolbarPlugin;
  command: Command;
  issub: boolean;

  constructor(plugin: cMenuToolbarPlugin, command: Command, issub: boolean = false) {
    super(plugin.app);
    this.plugin = plugin;
    this.command = command;
    this.issub = issub;
    this.setPlaceholder("Choose an icon");
  }

  private capitalJoin(string: string): string {
    const icon = string.split(" ");

    return icon
      .map((icon) => {
        return icon[0].toUpperCase() + icon.substring(1);
      })
      .join(" ");
  }

  getItems(): string[] {
    return appIcons;
  }

  getItemText(item: string): string {
    return this.capitalJoin(
      item
        .replace("feather-", "")
        .replace("remix-", "")
        .replace("bx-", "")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/-/gi, " ")
    );
  }

  renderSuggestion(icon: FuzzyMatch<string>, iconItem: HTMLElement): void {
    const span = createSpan({ cls: "cMenuToolbarIconPick" });
    iconItem.appendChild(span);
    setIcon(span, icon.item);
    super.renderSuggestion(icon, iconItem);
  }

  async onChooseItem(item: string): Promise<void> {
    if (item === "Custom") {
      new CustomIcon(this.app, this.plugin, this.command, this.issub).open();
    } else {
      if (this.command.icon) //存在就修改不存在新增
      {
        let menuID = findmenuID(this.plugin, this.command, this.issub)
        // console.log(menuID);
        this.issub ? this.plugin.settings.menuCommands[menuID['index']].SubmenuCommands[menuID['subindex']].icon = item : this.plugin.settings.menuCommands[menuID['index']].icon = item;
      } else {
        this.command.icon = item;
        this.plugin.settings.menuCommands.push(this.command);
      }

      await this.plugin.saveSettings();
      setTimeout(() => {
        dispatchEvent(new Event("cMenuToolbar-NewCommand"));
      }, 100);
      console.log(
        `%cCommand '${this.command.name}' was added to cMenuToolbar`,
        "color: Violet"
      );
    }
  }
}

export class CommandPicker extends FuzzySuggestModal<Command> {
  command: Command;

  constructor(private plugin: cMenuToolbarPlugin) {
    super(plugin.app);
    this.app;
    this.setPlaceholder("Choose a command");
  }

  getItems(): Command[] {
    //@ts-ignore
    return app.commands.listCommands();
  }

  getItemText(item: Command): string {
    return item.name;
  }

  async onChooseItem(item: Command): Promise<void> {
    let index = this.plugin.settings.menuCommands.findIndex((v) => v.id == item.id);
    //  console.log(index)

    if (index > -1) //存在
    {
      new Notice("The command" + item.name + "already exists", 3000);
      //  console.log(`%cCommand '${item.name}' already exists `, "color: Violet");
      return;
    } else {
      if (item.icon) {
        this.plugin.settings.menuCommands.push(item);
        await this.plugin.saveSettings();
        setTimeout(() => {
          dispatchEvent(new Event("cMenuToolbar-NewCommand"));
        }, 100);
        console.log(
          `%cCommand '${item.name}' was added to cMenuToolbar`,
          "color: Violet"
        );
      } else {
        new ChooseFromIconList(this.plugin, item, false).open();
      }
    }
  }
}

export class CustomIcon extends Modal {
  plugin: cMenuToolbarPlugin;
  item: Command;
  issub: boolean;
  submitEnterCallback: (this: HTMLTextAreaElement, ev: KeyboardEvent) => any;

  constructor(app: App, plugin: cMenuToolbarPlugin, item: Command, issub: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.containerEl.addClass("cMenuToolbar-Modal");
    this.containerEl.addClass("customicon");
  }
  onOpen() {

    const { contentEl } = this;
    contentEl.createEl("b", { text: t("Enter the icon code, it looks like <svg>.... </svg> format") });
    const textComponent = new TextAreaComponent(contentEl);
    textComponent.inputEl.classList.add('wideInputPromptInputEl');
    textComponent.setPlaceholder("")
      .setValue(this.item.icon ?? '')
      .onChange(debounce(async (value: string) => {

        this.item.icon = value;
        let menuID = findmenuID(this.plugin, this.item, this.issub)
        if (!this.issub) //不是子项
        {
          let index = menuID['index']
          index === -1 ? this.plugin.settings.menuCommands.push(this.item) :
            (this.plugin.settings.menuCommands[index].icon = this.item.icon);

        } else {
          let subindex = menuID['subindex']
          subindex === -1 ? this.plugin.settings.menuCommands[menuID["index"]].SubmenuCommands.push(this.item) : this.plugin.settings.menuCommands[menuID['index']].SubmenuCommands[subindex].icon = value

        }
        await this.plugin.saveSettings();
      }, 100, true)
      )
      .inputEl.addEventListener('keydown', this.submitEnterCallback);
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    setTimeout(() => {
      dispatchEvent(new Event("cMenuToolbar-NewCommand"));
    }, 100);
  }
};


export class ChangeCmdname extends Modal {
  plugin: cMenuToolbarPlugin;
  item: Command;
  issub: boolean;
  submitEnterCallback: (this: HTMLInputElement, ev: KeyboardEvent) => any;
  constructor(app: App, plugin: cMenuToolbarPlugin, item: Command, issub: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.containerEl.addClass("cMenuToolbar-Modal");
    this.containerEl.addClass("changename");
  }
  onOpen() {

    const { contentEl } = this;
    contentEl.createEl("b", { text: t("Please enter a new name：") });

    const textComponent = new TextComponent(contentEl);
    textComponent.inputEl.classList.add('InputPromptInputEl');
    textComponent.setPlaceholder("")
      .setValue(this.item.name ?? '')
      .onChange(debounce(async (value) => {

        let menuID = findmenuID(this.plugin, this.item, this.issub)
        this.item.name = value;
        if (!this.issub) //不是子项
        {
          let index = menuID['index']
          //  console.log(index,"index")
          index === -1 ? this.plugin.settings.menuCommands.push(this.item) :
            (this.plugin.settings.menuCommands[index].name = this.item.name);

        } else {
          let subindex = menuID['subindex']
          subindex === -1 ? this.plugin.settings.menuCommands[menuID["index"]].SubmenuCommands.push(this.item) : this.plugin.settings.menuCommands[menuID['index']].SubmenuCommands[subindex].name = value

        }
        await this.plugin.saveSettings();
      }, 100, true))
      .inputEl.addEventListener('keydown', this.submitEnterCallback);
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    setTimeout(() => {
      dispatchEvent(new Event("cMenuToolbar-NewCommand"));
    }, 100);
  }
};

export class openSlider extends Modal {
  plugin: cMenuToolbarPlugin;
  constructor(app: App, plugin: cMenuToolbarPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.containerEl.addClass("cMenuToolbar-Modal");
  }
  onOpen() {

    const { contentEl } = this;
    contentEl.createEl("p", { text: t("Drag the slider to move the position") });
    if (this.plugin.settings.positionStyle == "top") {
      let topem =  (this.plugin.settings.cMenuBottomValue - 4.25)*5;
      new SliderComponent(contentEl)
        .setLimits(0, 80, 0.5)
        .setValue(topem)
        .onChange(debounce(async (value) => {
          console.log(`%c${value}px`, "color: Violet");
          this.plugin.settings.cMenuBottomValue = value/5 + 4.25;
          setBottomValue(this.plugin.settings);
          await this.plugin.saveSettings();
          setTimeout(() => {
            dispatchEvent(new Event("cMenuToolbar-NewCommand"));
          }, 100);
        }, 100, true))
        .setDynamicTooltip();
    }else{
    new SliderComponent(contentEl)
      .setLimits(2, 18, 0.25)
      .setValue(this.plugin.settings.cMenuBottomValue)
      .onChange(debounce(async (value) => {
        console.log(`%c${value}em`, "color: Violet");
        this.plugin.settings.cMenuBottomValue = value;
        setBottomValue(this.plugin.settings);
        await this.plugin.saveSettings();
        setTimeout(() => {
          dispatchEvent(new Event("cMenuToolbar-NewCommand"));
        }, 100);
      }, 100, true))
      .setDynamicTooltip();
    }
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
