import {
  Menu,
  Plugin,
  Notice,
  Command,
  setIcon,
  Platform,
  Editor,
  MarkdownView,
  ItemView,
  ToggleComponent,
  requireApiVersion,
  App,
  WorkspaceLeaf,
  View
} from "obsidian";
import { wait } from "src/util/util";
import { CommandPicker, openSlider } from "src/modals/suggesterModals";
import { editingToolbarSettingTab } from '../settings/settingsTab';
import { selfDestruct, editingToolbarPopover, quiteFormatbrushes, createFollowingbar, setFormateraser, isExistoolbar, resetToolbar } from "src/modals/editingToolbarModal";
import { editingToolbarSettings, DEFAULT_SETTINGS } from "src/settings/settingsData";
import addIcons, {
  // addFeatherIcons,
  // addRemixIcons
  // addBoxIcons
} from "src/icons/customIcons";


import { setFontcolor, setBackgroundcolor } from "src/util/util";


import { ViewUtils } from 'src/util/viewUtils';
import { UpdateNoticeModal } from "src/modals/updateModal";
import { StatusBar } from "src/components/StatusBar";
import { CommandsManager } from "src/commands/commands";


let activeDocument: Document;


export default class editingToolbarPlugin extends Plugin {
  app: App;
  settings: editingToolbarSettings;
  statusBarIcon: HTMLElement;
  statusBar: StatusBar;
  
  // 添加缺失的属性定义
  IS_MORE_Button: boolean;
  Temp_Notice: Notice;
  Leaf_Width: number;
  private commandsManager: CommandsManager;

  // 添加新的格式刷管理属性
  private activeFormatBrush: string | null = null;

  async onload(): Promise<void> {
    const currentVersion = this.manifest.version; // 设置当前版本号
    console.log("editingToolbar v" + currentVersion + " loaded");


    requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
    await this.loadSettings();
    this.addSettingTab(new editingToolbarSettingTab(this.app, this));

    addIcons();
    // addRemixIcconsole.log();ons(appIcons);
    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();
    const editor = this.commandsManager.getActiveEditor();
    this.app.workspace.onLayoutReady(() => {
      this.statusBar = new StatusBar(this);
      this.statusBar.init();
    });
      this.init_evt(activeDocument,editor);
      if (requireApiVersion("0.15.0")) {
        this.app.workspace.on('window-open', (leaf) => {
          this.init_evt(leaf.doc,editor);
        });
      }
      const lastVersion = this.settings?.lastVersion || '0.0.0';
      if (lastVersion !== currentVersion) {
          // 显示更新提示
          new UpdateNoticeModal(this.app, this).open();
          
          // 更新版本号
          this.settings.lastVersion = currentVersion;
          await this.saveSettings();
      }
      
      const isThinoEnabled = app.plugins.enabledPlugins.has("obsidian-memos");
      if(isThinoEnabled) {
        // @ts-ignore - 自定义事件
        this.registerEvent(this.app.workspace.on("thino-editor-created", this.handleeditingToolbar));
      }
      this.registerEvent(this.app.workspace.on("active-leaf-change", this.handleeditingToolbar));
      this.registerEvent(this.app.workspace.on("layout-change", this.handleeditingToolbar_layout));
      this.registerEvent(this.app.workspace.on("resize", this.handleeditingToolbar_resize));
      // this.app.workspace.onLayoutReady(this.handleeditingToolbar_editor.bind(this));
      if (this.settings.cMenuVisibility == true) {
        setTimeout(() => {
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 100)
      }

   
  }

  isLoadMobile() {
    let screenWidth = window.innerWidth > 0 ? window.innerWidth : screen.width;
    let isLoadOnMobile = this.settings?.isLoadOnMobile ? this.settings.isLoadOnMobile : false;
    if (Platform.isMobileApp && !isLoadOnMobile) {
      if (screenWidth <= 768) {
        // 移动设备且屏幕宽度小于等于 768px，默认不开启toolbar
        console.log("editing toolbar disable loading on mobile");
        return false;
      }
    }
    return true;
  }
  init_evt(container: Document, editor: Editor) {
    // 重置格式刷状态
    this.resetFormatBrushStates();

    // 注册鼠标事件
    this.registerDomEvent(container, "mouseup", async (e: { button: any; }) => {
      // 右键点击时处理格式刷状态
      if (e.button && this.isAnyFormatBrushActive()) {
        this.deactivateAllFormatBrushes();
      }

      if (!this.isView()) return;

      let cmEditor = editor;
      if (cmEditor) {
        this.handleEditorSelection(cmEditor);
      } else if (this.isAnyFormatBrushActive()) {
        this.deactivateAllFormatBrushes();
      }
    });

    // 注册键盘事件
    this.registerDomEvent(activeDocument, "keydown", (e) => {
      this.handleKeyDown(e);
    });

    // 注册滚轮事件
    this.registerDomEvent(activeDocument, "wheel", () => {
      this.handleWheel();
    });
  }

  // 修改重置格式刷状态方法
  private resetFormatBrushStates(): void {
    this.activeFormatBrush = null;
    this.settings.formatBrushes = {};
    this.saveSettings();
  }

  // 修改检查格式刷激活状态方法
  private isAnyFormatBrushActive(): boolean {
    return this.activeFormatBrush !== null;
  }

  // 添加新的格式刷控制方法
  public setFormatBrush(commandId: string, active: boolean): void {
    if (active) {
      this.activeFormatBrush = commandId;
      this.settings.formatBrushes[commandId] = true;
    } else {
      if (this.activeFormatBrush === commandId) {
        this.activeFormatBrush = null;
      }
      this.settings.formatBrushes[commandId] = false;
    }
    this.saveSettings();
  }

  public isFormatBrushActive(commandId: string): boolean {
    return this.settings.formatBrushes[commandId] ?? false;
  }

  // 修改处理编辑器选择的方法
  private handleEditorSelection(cmEditor: Editor): void {
    let editingToolbarModalBar = isExistoolbar(this.app, this.settings);
    
    // 没有选中文本
    if (!cmEditor.getSelection()) {
      if (editingToolbarModalBar && this.settings.positionStyle === "following") {
        editingToolbarModalBar.style.visibility = "hidden";
      }
      return;
    }
    
    // 处理激活的格式刷
    if (this.activeFormatBrush) {
      this.applyFormatBrush(this.activeFormatBrush, cmEditor);
    } else if (this.settings.positionStyle === "following") {
      createFollowingbar(this.app, this.settings, cmEditor);
    }
  }

  // 添加新的格式刷应用方法
  private applyFormatBrush(commandId: string, editor: Editor): void {
    switch (commandId) {
      case 'background-color':
        setBackgroundcolor(this.settings.cMenuBackgroundColor, editor);
        break;
      case 'font-color':
        setFontcolor(this.settings.cMenuFontColor, editor);
        break;
      case 'eraser':
        setFormateraser(this, editor);
        break;
      // 可以在这里添加更多命令的处理
      default:
        // 对于其他命令，直接执行命令
        this.app.commands.executeCommandById(commandId);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.settings.positionStyle !== "following") return;
    
    const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
    if (!e.shiftKey && editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "hidden";
    }
  }

  private handleWheel(): void {
    if (this.settings.positionStyle !== "following") return;
    
    const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "hidden";
    }
  }

  onunload(): void {
    selfDestruct();
    console.log("editingToolbar unloaded");

    this.app.workspace.off("active-leaf-change", this.handleeditingToolbar);
    this.app.workspace.off("layout-change", this.handleeditingToolbar_layout);
    this.app.workspace.off("resize", this.handleeditingToolbar_resize);



  }

  isView() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return ViewUtils.isAllowedViewType(view);
  }

  handleeditingToolbar = () => {
    if (this.settings.cMenuVisibility == true) {
      const view = this.app.workspace.getActiveViewOfType(ItemView);
 
      let toolbar = isExistoolbar(this.app, this.settings);

      if (toolbar) {
        if (!ViewUtils.isAllowedViewType(view)) {
          toolbar.style.visibility = "hidden";
          return;
        }
        
        if (this.settings.positionStyle != "following") {
          toolbar.style.visibility = "visible";
        } else {
          toolbar.style.visibility = "hidden";
        }
      } else {
        setTimeout(() => {
          editingToolbarPopover(this.app, this);
        }, 100);
      }
    }
  };

  handleeditingToolbar_layout = () => {
    if (!this.settings.cMenuVisibility) return false;

    const view = this.app.workspace.getActiveViewOfType(ItemView);
    let editingToolbarModalBar = isExistoolbar(this.app, this.settings);

    if (!ViewUtils.isSourceMode(view) || !ViewUtils.isAllowedViewType(view)) {
      if (editingToolbarModalBar) {
        editingToolbarModalBar.style.visibility = "hidden";
      }
      return;
    }

    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = 
        this.settings.positionStyle == "following" ? "hidden" : "visible";
    } else {
      setTimeout(() => {
        editingToolbarPopover(this.app, this);
      }, 100);
    }
  };

  handleeditingToolbar_resize = () => {
    // const type= this.app.workspace.activeLeaf.getViewState().type
    // console.log(type,"handleeditingToolbar_layout" )
    //requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
    if (this.settings.cMenuVisibility == true && this.settings.positionStyle == "top") {
      const view = app.workspace.getActiveViewOfType(ItemView);
      if (ViewUtils.isSourceMode(view)) {
          let leafwidth = this.app.workspace.activeLeaf.view.leaf.width ?? 0
          //let leafwidth = view.containerEl?.querySelector<HTMLElement>(".markdown-source-view").offsetWidth ?? 0
          if (this.Leaf_Width == leafwidth) return false;
          if (leafwidth > 0) {
            this.Leaf_Width = leafwidth
            if (this.settings.cMenuWidth && leafwidth) {
              if ((leafwidth - this.settings.cMenuWidth) < 78 && (leafwidth > this.settings.cMenuWidth))
                return;
              else {
                setTimeout(() => {
                  resetToolbar(), editingToolbarPopover(app, this);
                }, 200)
              }
            }
          }

      }
    } else {
      return false;
    }
  }

  setIS_MORE_Button(status: boolean): void {
    this.IS_MORE_Button = status
  }
  setTemp_Notice(content: Notice): void {
    this.Temp_Notice = content;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
