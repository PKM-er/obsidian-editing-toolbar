import type editingToolbarPlugin from "src/plugin/main";
import { appIcons } from "src/icons/appIcons";
import { Notice, Command, setIcon, FuzzyMatch, FuzzySuggestModal, Modal, SliderComponent, TextAreaComponent, TextComponent, debounce, App } from "obsidian";
import { findmenuID } from "src/util/util";
import { setBottomValue, setHorizontalValue } from "src/util/statusBarConstants";
import { t } from "src/translations/helper";

// 通用的图标选择回调类型
export type IconSelectCallback = (iconId: string) => void;

export class ChooseFromIconList extends FuzzySuggestModal<string> {
  plugin: editingToolbarPlugin;
  command: any;
  issub: boolean;
  currentEditingConfig:string;
  customCallback: IconSelectCallback | null = null;
  constructor(
    plugin: editingToolbarPlugin, 
    command: any, 
    issub: boolean = false,
    callback?: IconSelectCallback,
    currentEditingConfig?:string
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.command = command;
    this.issub = issub;
    this.customCallback = callback || null;
    this.setPlaceholder(t("Choose an icon"));
    this.currentEditingConfig = currentEditingConfig || "";
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
    // 处理自定义图标选项
    if (item === "Custom") {
      // 如果有自定义回调，打开自定义图标输入框并将结果传递给回调
      if (this.customCallback) {
        new CustomIcon(
          this.app, 
          this.plugin, 
          { id: this.command.id, name: this.command.name, icon: "" }, 
          this.issub, 
          (customIconValue) => {
            // 当自定义图标输入完成后，将值传递给原始回调
            this.customCallback(customIconValue);
          }
        ).open();
        return;
      } else {
        // 没有自定义回调，使用默认逻辑打开自定义图标输入框
        new CustomIcon(this.app, this.plugin, this.command, this.issub,null,this.currentEditingConfig).open();
        return;
      }
    }
    
    // 处理普通图标选项
    if (this.customCallback) {
      // 如果有自定义回调，直接调用回调并传递选中的图标
      this.customCallback(item);
      return;
    }
    
    // 获取当前命令配置
    const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);
    console.log(this.issub,"issub");
    console.log(currentCommands,"currentCommands")
    // 没有自定义回调，使用默认的命令图标设置逻辑
    if (this.command.icon) { // 存在就修改不存在新增
      let menuID = findmenuID(this.plugin, this.command, this.issub,currentCommands);
      if (this.issub) {
        currentCommands[menuID['index']].SubmenuCommands[menuID['subindex']].icon = item;
      } else {
        currentCommands[menuID['index']].icon = item;
      }
      // 更新当前配置
      this.plugin.updateCurrentCommands(currentCommands);
    } else {
      this.command.icon = item;
      currentCommands.push(this.command);
      // 更新当前配置
      this.plugin.updateCurrentCommands(currentCommands);
    }

    await this.plugin.saveSettings();
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
    console.log(
      `%c命令 '${this.command.name}' 已添加到编辑工具栏`,
      "color: Violet"
    );
  }
}

// 自定义图标输入模态框
export class CustomIcon extends Modal {
  plugin: editingToolbarPlugin;
  item: Command;
  issub: boolean;
  currentEditingConfig:string;
  submitEnterCallback: (this: HTMLTextAreaElement, ev: KeyboardEvent) => any;
  customCallback: IconSelectCallback | null = null;

  constructor(
    app: App, 
    plugin: editingToolbarPlugin, 
    item: Command, 
    issub: boolean,
    callback?: IconSelectCallback,
    currentEditingConfig?:string
  ) {
    super(app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.customCallback = callback || null;
    this.currentEditingConfig = currentEditingConfig || "";
    this.containerEl.addClass("editingToolbar-Modal");
    this.containerEl.addClass("customicon");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("b", { text: t("Enter the icon code, format as <svg>.... </svg>") });
    
    const textComponent = document.createElement("textarea");
    textComponent.className = "wideInputPromptInputEl";
    textComponent.placeholder = "";
    textComponent.value = this.item.icon || '';
    textComponent.style.width = "100%";
    textComponent.style.height = "200px";
    contentEl.appendChild(textComponent);
    
    textComponent.addEventListener("input", async () => {
      const value = textComponent.value;
      
      // 如果有自定义回调，则使用自定义回调
      if (this.customCallback) {
        this.item.icon = value;
        return;
      }

      // 否则使用默认的命令图标设置逻辑
      this.item.icon = value;
      const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);
      const menuID = findmenuID(this.plugin, this.item, this.issub,currentCommands);
      
      if (!this.issub) { // 不是子项
        let index = menuID['index'];
        index === -1 
          ? this.plugin.settings.menuCommands.push(this.item) 
          : (this.plugin.settings.menuCommands[index].icon = this.item.icon);
      } else {
        let subindex = menuID['subindex'];
        subindex === -1 
          ? this.plugin.settings.menuCommands[menuID["index"]].SubmenuCommands.push(this.item) 
          : this.plugin.settings.menuCommands[menuID['index']].SubmenuCommands[subindex].icon = value;
      }
      
      await this.plugin.saveSettings();
    });
    
    if (this.submitEnterCallback) {
      textComponent.addEventListener('keydown', this.submitEnterCallback);
    }
  }
  
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    
    // 如果有自定义回调，则在关闭时调用
    if (this.customCallback) {
      this.customCallback(this.item.icon || '');
    } else {
      setTimeout(() => {
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100);
    }
  }
}


export class CommandPicker extends FuzzySuggestModal<Command> {
  command: Command;
  currentEditingConfig:string;
  constructor(private plugin: editingToolbarPlugin,currentEditingConfig?:string) {
    super(plugin.app);
    this.app;
    this.setPlaceholder(t("Choose a command"));
    this.currentEditingConfig = currentEditingConfig || "";
  }

  getItems(): Command[] {
    //@ts-ignore
    return app.commands.listCommands();
  }

  getItemText(item: Command): string {
    return item.name;
  }

  async onChooseItem(item: Command): Promise<void> {
    // 获取当前命令配置
    
    const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);

    let index = currentCommands.findIndex((v) => v.id == item.id);

    if (index > -1) // 命令已存在
    {
      new Notice(t("The command") + item.name + t("already exists"), 3000);
      return;
    } else {
      if (item.icon) {
        // 添加命令到当前配置
        currentCommands.push(item);
        // 更新当前配置
        this.plugin.updateCurrentCommands(currentCommands);
        await this.plugin.saveSettings();
        setTimeout(() => {
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 100);
        console.log(
          `%c命令 '${item.name}' 已添加到编辑工具栏`,
          "color: Violet"
        );
      } else {
        // 使用统一的图标选择器
        new ChooseFromIconList(this.plugin, item, false).open();
      }
    }
  }
}

 


export class ChangeCmdname extends Modal {
  plugin: editingToolbarPlugin;
  item: Command;
  issub: boolean;
  currentEditingConfig:string;
  submitEnterCallback: (this: HTMLInputElement, ev: KeyboardEvent) => any;
  constructor(app: App, plugin: editingToolbarPlugin, item: Command, issub: boolean,currentEditingConfig?:string) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.currentEditingConfig = currentEditingConfig || "";
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
        // 获取当前命令配置
        const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);
        
        let menuID = findmenuID(this.plugin, this.item, this.issub,currentCommands)
        this.item.name = value;
        if (!this.issub) //不是子项
        {
          let index = menuID['index']
          //  console.log(index,"index")
          if (index === -1) {
            currentCommands.push(this.item);
          } else {
            currentCommands[index].name = this.item.name;
          }
        } else {
          let subindex = menuID['subindex']
          if (subindex === -1) {
            currentCommands[menuID["index"]].SubmenuCommands.push(this.item);
          } else {
            currentCommands[menuID['index']].SubmenuCommands[subindex].name = value;
          }
        }
        
        // 更新当前配置
        this.plugin.updateCurrentCommands(currentCommands);
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
