import type editingToolbarPlugin from "src/plugin/main";
import { appIcons } from "src/icons/appIcons";
import { Notice, Command, setIcon, FuzzyMatch, FuzzySuggestModal, Modal, SliderComponent, TextAreaComponent, TextComponent, debounce, App } from "obsidian";
import { findmenuID } from "src/util/util";
import { setBottomValue, setHorizontalValue } from "src/util/statusBarConstants";
import { t } from "src/translations/helper";

export class ChooseFromIconList extends FuzzySuggestModal<string> {
  plugin: editingToolbarPlugin;
  command: Command;
  issub: boolean;

  constructor(plugin: editingToolbarPlugin, command: Command, issub: boolean = false) {
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
    const span = createSpan({ cls: "editingToolbarIconPick" });
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
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100);
      console.log(
        `%cCommand '${this.command.name}' was added to editingToolbar`,
        "color: Violet"
      );
    }
  }
}

export class CommandPicker extends FuzzySuggestModal<Command> {
  command: Command;

  constructor(private plugin: editingToolbarPlugin) {
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
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 100);
        console.log(
          `%cCommand '${item.name}' was added to editingToolbar`,
          "color: Violet"
        );
      } else {
        new ChooseFromIconList(this.plugin, item, false).open();
      }
    }
  }
}

export class CustomIcon extends Modal {
  plugin: editingToolbarPlugin;
  item: Command;
  issub: boolean;
  submitEnterCallback: (this: HTMLTextAreaElement, ev: KeyboardEvent) => any;

  constructor(app: App, plugin: editingToolbarPlugin, item: Command, issub: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.containerEl.addClass("editingToolbar-Modal");
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
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }
};


export class ChangeCmdname extends Modal {
  plugin: editingToolbarPlugin;
  item: Command;
  issub: boolean;
  submitEnterCallback: (this: HTMLInputElement, ev: KeyboardEvent) => any;
  constructor(app: App, plugin: editingToolbarPlugin, item: Command, issub: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.containerEl.addClass("editingToolbar-Modal");
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
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }
};

export class openSlider extends Modal {
  plugin: editingToolbarPlugin;
  private needSave: boolean = false;

  constructor(app: App, plugin: editingToolbarPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.containerEl.addClass("editingToolbar-Modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("p", { text: t("Drag the slider to move the position") });

    // 创建一个容器来放置滑动条和按钮
    const containerEl = contentEl.createDiv({ cls: "slider-container" });

    // 创建垂直位置控制区域
    const verticalContainer = containerEl.createDiv({ cls: "vertical-slider-container" });
    verticalContainer.createEl("p", { text: t("Vertical Position") });

    // 创建水平位置控制区域
    const horizontalContainer = containerEl.createDiv({ cls: "horizontal-slider-container" });
    horizontalContainer.createEl("p", { text: t("Horizontal Position") });
      // 添加列数控制区域
      const columnsContainer = containerEl.createDiv({ cls: "columns-slider-container" });
      columnsContainer.createEl("p", { text: t("Editing Toolbar columns") });
    // 获取body容器的高度和宽度
    const bodyHeight = document.body.clientHeight;
    const bodyWidth = document.body.clientWidth;

    // 根据容器尺寸计算滑块范围
    const verticalMax = Math.floor(bodyHeight / 3);
    const verticalMin = -Math.floor(bodyHeight);
    const horizontalMax = Math.floor(bodyWidth / 2);
    const horizontalMin = -Math.floor(bodyWidth / 2);
    // let topem = (this.plugin.settings.cMenuBottomValue - 4.25)*5;
    const verticalSlider = new SliderComponent(verticalContainer)
      .setLimits(verticalMin, verticalMax, 5)
      .setValue(this.plugin.settings.verticalPosition || 0)
      .onChange(debounce((value) => {
        this.needSave = true;
        this.plugin.settings.verticalPosition = value;
        setBottomValue(this.plugin.settings);
      }, 100, true))
      .setDynamicTooltip();

    // 添加水平滑动条
    const horizontalSlider = new SliderComponent(horizontalContainer)
      .setLimits(horizontalMin, horizontalMax, 10)
      .setValue(this.plugin.settings.horizontalPosition || 0)
      .onChange(debounce((value) => {
        this.needSave = true;
        this.plugin.settings.horizontalPosition = value;
        setHorizontalValue(this.plugin.settings);
      }, 100, true))
      .setDynamicTooltip();
    // 添加列数滑动条
    const columnsSlider = new SliderComponent(columnsContainer)
      .setLimits(1, 32, 1)
      .setValue(this.plugin.settings.cMenuNumRows || 12)
      .onChange(debounce(async (value) => {
        this.needSave = true;
        this.plugin.settings.cMenuNumRows = value;
        await this.plugin.saveSettings();
        setTimeout(() => {
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 100);
      }, 100, true))
      .setDynamicTooltip();


    // 添加复位按钮容器
    const resetContainer = containerEl.createDiv({ cls: "reset-container" });

    // 复位按钮
    resetContainer.createEl("button", {
      text: t("Reset"),
      cls: "reset-button"
    }).addEventListener("click", () => {
      this.needSave = true;
      verticalSlider.setValue(0);
      horizontalSlider.setValue(0);
      columnsSlider.setValue(12);
      this.plugin.settings.verticalPosition = 0;
      this.plugin.settings.horizontalPosition = 0;
      this.plugin.settings.cMenuNumRows = 12;
      setBottomValue(this.plugin.settings);
      setHorizontalValue(this.plugin.settings);

    });
  }

  async onClose() {
    const { contentEl } = this;
    contentEl.empty();

    // 只有在有修改时才保存设置
    if (this.needSave) {
      await this.plugin.saveSettings();
    }
  }
};
