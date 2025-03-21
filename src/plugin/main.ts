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
import { t } from 'src/translations/helper';



let activeDocument: Document;


export default class editingToolbarPlugin extends Plugin {
  app: App;
  settings: editingToolbarSettings;
  statusBarIcon: HTMLElement;
  statusBar: StatusBar;
  public toolbarIconSize: number; // 新增全局变量
  // 修改为公共属性
  commandsManager: CommandsManager;

  // 添加缺失的属性定义
  IS_MORE_Button: boolean;
  EN_BG_Format_Brush: boolean;
  EN_FontColor_Format_Brush: boolean;
  EN_Text_Format_Brush: boolean;
  Temp_Notice: Notice;
  Leaf_Width: number;

  // 添加格式刷相关属性
  lastExecutedCommand: string | null = null;
  formatBrushActive: boolean = false;
  formatBrushNotice: Notice | null = null;

  // 添加一个属性来存储上一个命令的可读名称
  lastExecutedCommandName: string | null = null;

  // 添加设置标签页引用
  settingTab: editingToolbarSettingTab;

  async onload(): Promise<void> {
    const currentVersion = this.manifest.version; // 设置当前版本号
    console.log("editingToolbar v" + currentVersion + " loaded");


    requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
    await this.loadSettings();
    this.settingTab = new editingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    //addIcons();
    // addRemixIcconsole.log();ons(appIcons);
    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();
    const editor = this.commandsManager.getActiveEditor();
    this.app.workspace.onLayoutReady(() => {
      this.statusBar = new StatusBar(this);
      this.statusBar.init();
    });
    this.init_evt(activeDocument, editor);
    if (requireApiVersion("0.15.0")) {
      this.app.workspace.on('window-open', (leaf) => {
        this.init_evt(leaf.doc, editor);
      });
    }
    const lastVersion = this.settings?.lastVersion || '0.0.0';
   
    const parseVersion = (version: string) => {
      const parts = version.split('.').map(p => parseInt(p));
      return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
      };
    };
    const lastVer = parseVersion(lastVersion);
    const currentVer = parseVersion(currentVersion);
    const isNewInstall = lastVersion === '0.0.0';
    const needUpdateNotice = 
      !isNewInstall && 
      (lastVer.major < 3 || 
      (lastVer.major === 3 && lastVer.minor < 1));
    if (needUpdateNotice) {
      setTimeout(() => {
        new UpdateNoticeModal(this.app, this).open();
      }, 3000);
    }
    this.settings.lastVersion = currentVersion;
    await this.saveSettings();

    const isThinoEnabled = app.plugins.enabledPlugins.has("obsidian-memos");
    if (isThinoEnabled) {
      // @ts-ignore - 自定义事件
      this.registerEvent(this.app.workspace.on("thino-editor-created", this.handleeditingToolbar));
    }
    this.registerEvent(this.app.workspace.on("active-leaf-change", this.handleeditingToolbar));
    this.registerEvent(this.app.workspace.on("layout-change", this.handleeditingToolbar_layout));
    this.registerEvent(this.app.workspace.on("resize", this.handleeditingToolbar_resize));
    //  this.registerEvent(this.app.workspace.on("editor-change", this.handleeditingToolbar));

    // this.app.workspace.onLayoutReady(this.handleeditingToolbar_editor.bind(this));
    if (this.settings.cMenuVisibility == true) {
      setTimeout(() => {
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100)
    }

    // 初始化图标
    addIcons();
    this.toolbarIconSize = this.settings.toolbarIconSize;
    // 初始化 CSS 变量
    activeDocument.documentElement.style.setProperty(
      '--editing-toolbar-background-color',
      this.settings.toolbarBackgroundColor
    );
    activeDocument.documentElement.style.setProperty(
      '--editing-toolbar-icon-color',
      this.settings.toolbarIconColor
    );
    activeDocument.documentElement.style.setProperty(
      '--toolbar-icon-size',
      `${this.settings.toolbarIconSize}px`
    );
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
    // 重置状态
    this.EN_FontColor_Format_Brush = false;
    this.EN_BG_Format_Brush = false;
    this.EN_Text_Format_Brush = false;
    this.formatBrushActive = false;

    // 添加鼠标中键双击跟踪
    let lastMiddleClickTime = 0;
    
    // 统一处理鼠标事件
    this.registerDomEvent(container, "mousedown", (e: MouseEvent) => {
      // 检查视图类型
      if (!this.isView()) return;
      
      const cmEditor = this.commandsManager.getActiveEditor();
      if (!cmEditor) return;
      
      // const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
      
      // // 判断是否点击在工具栏外部
      // if (this.settings.positionStyle === "following" && editingToolbarModalBar) {
      //   const isClickInsideToolbar = editingToolbarModalBar.contains(e.target as Node);
      //   if (!isClickInsideToolbar) {
      //     editingToolbarModalBar.style.visibility = "hidden";
      //   }
      // }
      
      // 处理鼠标中键双击
      if (e.button === 1) {
        const currentTime = new Date().getTime();
        if (currentTime - lastMiddleClickTime < 300) { // 300ms内的双击
          if (this.settings.positionStyle === "following" && cmEditor.hasFocus()) {
            this.showFollowingToolbar(cmEditor);
          }
        }
        lastMiddleClickTime = currentTime;
      }
      
      // 处理格式刷
      if (e.button && (this.EN_FontColor_Format_Brush || this.EN_BG_Format_Brush || 
          this.EN_Text_Format_Brush || this.formatBrushActive)) {
        quiteFormatbrushes(this);
      }
    });
    
    if(Platform.isMobileApp){
      this.registerDomEvent(container, "selectionchange", (e) => {
        this.handleTextSelection();
      });
     
    } else{
      // 处理鼠标选中文本
      this.registerDomEvent(container, "mouseup", (e) => {
        if(e.button != 1)
        this.handleTextSelection();
      });
    }
    
    
    // 处理键盘选中文本
    this.registerDomEvent(container, "keyup", (e) => {
      // 常用于选择文本的键：方向键、Shift、Home、End、PageUp、PageDown
      const selectionKeys = [
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Home", "End", "PageUp", "PageDown", "ShiftLeft", "ShiftRight"
      ];
      
      if (selectionKeys.includes(e.code) || e.shiftKey) {
        this.handleTextSelection();
      } else if (!e.shiftKey && this.settings.positionStyle === "following") {
        // 非Shift键按下时隐藏工具栏
        const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
        if (editingToolbarModalBar) {
          editingToolbarModalBar.style.visibility = "hidden";
        }
      }
    });
    
    // 处理滚轮事件
    this.registerDomEvent(activeDocument, "wheel", () => {
      if (this.settings.positionStyle !== "following") return;
      const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
      if (editingToolbarModalBar) {
        editingToolbarModalBar.style.visibility = "hidden";
      }
    });
  }

  onunload(): void {
    // 注销工作区事件
    this.app.workspace.off("active-leaf-change", this.handleeditingToolbar);
    this.app.workspace.off("layout-change", this.handleeditingToolbar_layout);
    this.app.workspace.off("resize", this.handleeditingToolbar_resize);
    
    // 移除格式刷通知
    if (this.formatBrushNotice) {
      this.formatBrushNotice.hide();
      this.formatBrushNotice = null;
    }
    
    // 清理格式刷相关状态
    this.quiteAllFormatBrushes();
    
    // 销毁工具栏
    selfDestruct();
    
    console.log("editingToolbar unloaded");
  }

  isView() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return ViewUtils.isAllowedViewType(view);
  }

  handleeditingToolbar = () => {
    if (this.settings.cMenuVisibility == true) {
      const view = this.app.workspace.getActiveViewOfType(ItemView);
      let toolbar = isExistoolbar(this.app, this.settings);

      // 如果视图类型不在允许列表中，隐藏工具栏后返回
      if (!ViewUtils.isAllowedViewType(view)) {
        if (toolbar) {
          toolbar.style.visibility = "hidden";
          return;
        }
      }

      // 获取视图类型
      const viewType = view?.getViewType();
      const isMarkdownView = viewType === 'markdown';
      
      // 如果是Markdown视图
      if (isMarkdownView) {
        // 如果是源码模式
        if (ViewUtils.isSourceMode(view)) {
          // 对于following样式，保持隐藏状态（等待用户选择文本时显示）
          if (this.settings.positionStyle === "following") {
            if (toolbar) {
              toolbar.style.visibility = "hidden";
            }
          } else {
            // 非following样式下，在源码模式中保持工具栏可见
            if (toolbar) {
              toolbar.style.visibility = "visible";
            }
          }
        } else {
          // 在Markdown阅读模式下，隐藏工具栏
          if (toolbar) {
            toolbar.style.visibility = "hidden";
          }
        }
      } else {
        // 对于其他允许的视图类型（canvas等），保持工具栏可见
        if (toolbar) {
          toolbar.style.visibility = "visible";
        }
      }

      // 如果没有找到工具栏，创建一个
      if (!toolbar) {
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

    // 如果视图类型不在允许列表中，隐藏工具栏后返回
    if (!ViewUtils.isAllowedViewType(view)) {
      if (editingToolbarModalBar) {
        editingToolbarModalBar.style.visibility = "hidden";
      }
      return;
    }

    // 获取视图类型
    const viewType = view?.getViewType();
    const isMarkdownView = viewType === 'markdown';
    
    // 如果是Markdown视图
    if (isMarkdownView) {
      // 如果是源码模式
      if (ViewUtils.isSourceMode(view)) {
        // 对于following样式，保持当前逻辑（隐藏工具栏，等待选择文本时显示）
        if (this.settings.positionStyle === "following") {
          if (editingToolbarModalBar) {
            editingToolbarModalBar.style.visibility = "hidden";
          }
        } else {
          // 非following样式下，在源码模式中保持工具栏可见
          if (editingToolbarModalBar) {
            editingToolbarModalBar.style.visibility = "visible";
          }
        }
      } else {
        // 在Markdown阅读模式下，隐藏工具栏
        if (editingToolbarModalBar) {
          editingToolbarModalBar.style.visibility = "hidden";
        }
      }
    } else {
      // 对于其他允许的视图类型（canvas等），保持工具栏可见
      if (editingToolbarModalBar) {
        editingToolbarModalBar.style.visibility = "visible";
      }
    }

    // 如果没有找到工具栏，创建一个
    if (!editingToolbarModalBar) {
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
  setEN_BG_Format_Brush(status: boolean): void {
    this.EN_BG_Format_Brush = status
  }
  setEN_FontColor_Format_Brush(status: boolean): void {
    this.EN_FontColor_Format_Brush = status
  }
  setEN_Text_Format_Brush(status: boolean): void {
    this.EN_Text_Format_Brush = status;
  }
  setTemp_Notice(content: Notice): void {
    this.Temp_Notice = content;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // 初始化多配置
    // 如果是新安装或升级，初始化各个位置样式的命令配置
     
  }

  // 获取当前位置样式对应的命令配置
  getCurrentCommands(style?: string): any[] {

    if (!this.settings.enableMultipleConfig) {
      return this.settings.menuCommands;
    }
    let currentstyle = style || this.settings.positionStyle;
    // 如果移动端模式开启且在移动设备上
    if (this.settings.isLoadOnMobile && Platform.isMobileApp) {
      return this.settings.mobileCommands;
    }

    switch (currentstyle) {
      case 'following':
        return this.settings.followingCommands;
      case 'top':
        return this.settings.topCommands;
      case 'fixed':
        return this.settings.fixedCommands;
      default:
        return this.settings.menuCommands;
    }
  }

  // 更新当前位置样式对应的命令配置
  updateCurrentCommands(commands: any[]): void {
    if (!this.settings.enableMultipleConfig) {
      this.settings.menuCommands = commands;
      return;
    }

    // 如果移动端模式开启且在移动设备上
    if (this.settings.isLoadOnMobile && Platform.isMobileApp) {
      this.settings.mobileCommands = commands;
      return;
    }

    switch (this.settings.positionStyle) {
      case 'following':
        this.settings.followingCommands = commands;
        break;
      case 'top':
        this.settings.topCommands = commands;
        break;
      case 'fixed':
        this.settings.fixedCommands = commands;
        break;
      default:
        this.settings.menuCommands = commands;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // 修改 setLastExecutedCommand 方法，同时保存命令名称
  setLastExecutedCommand(commandId: string): void {
    this.lastExecutedCommand = commandId;

    // 获取命令的可读名称
    const command = this.app.commands.commands[commandId];
    if (command && command.name) {
      this.lastExecutedCommandName = command.name;
    } else {
      // 如果找不到命令名称，使用命令ID的最后部分
      const parts = commandId.split(':');
      this.lastExecutedCommandName = parts[parts.length - 1].replace(/-/g, ' ');
    }
  }

  // 修改 toggleFormatBrush 方法，在通知中显示具体命令
  toggleFormatBrush(): void {
    if (!this.lastExecutedCommand) {
      new Notice(t("Please execute a editingToolbar format command first, then enable the format brush"));
      return;
    }

    this.formatBrushActive = !this.formatBrushActive;

    if (this.formatBrushActive) {
      // 关闭其他格式刷
      this.EN_FontColor_Format_Brush = false;
      this.EN_BG_Format_Brush = false;
      this.EN_Text_Format_Brush = false;

      // 显示通知，包含具体命令名称
      if (this.formatBrushNotice) this.formatBrushNotice.hide();
      this.formatBrushNotice = new Notice(t("Format brush ON! Select text to apply【") + this.lastExecutedCommandName + t("】format"), 0);
    } else {
      // 关闭通知
      if (this.formatBrushNotice) {
        this.formatBrushNotice.hide();
        this.formatBrushNotice = null;
      }
    }
  }

  applyFormatBrush(editor: Editor): void {
    if (!this.lastExecutedCommand || !this.formatBrushActive) return;
    // 执行保存的命令
    const command = this.app.commands.commands[this.lastExecutedCommand];
    if (command && command.callback) {
      command.callback();
    }
    if (command && command.editorCallback) {
      command.editorCallback(editor,this.app.workspace.getActiveViewOfType(MarkdownView));
    }
  }

  // 扩展现有方法以支持格式刷
  quiteAllFormatBrushes(): void {
    this.EN_FontColor_Format_Brush = false;
    this.EN_BG_Format_Brush = false;
    this.EN_Text_Format_Brush = false;

    if (this.formatBrushActive) {
      this.formatBrushActive = false;
      if (this.formatBrushNotice) {
        this.formatBrushNotice.hide();
        this.formatBrushNotice = null;
      }
    }

    if (this.Temp_Notice) {
      this.Temp_Notice.hide();
      this.Temp_Notice = null;
    }
  }

  // 添加公共方法来访问 commandsManager
  public getCommandsManager(): CommandsManager {
    return this.commandsManager;
  }

  public reloadCustomCommands(): void {
    this.commandsManager.reloadCustomCommands();
  }

  // 抽取文本选择的处理逻辑
  private handleTextSelection() {
    if (!this.isView()) return;
    
    const cmEditor = this.commandsManager.getActiveEditor();
    if (!cmEditor?.hasFocus()) return;
    const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
    // 检查是否有选中的文本
    if (cmEditor.getSelection()) {
     
      
      // 处理各种格式刷
      if (this.EN_FontColor_Format_Brush) {
        setFontcolor(this.settings.cMenuFontColor, cmEditor);
      } else if (this.EN_BG_Format_Brush) {
        setBackgroundcolor(this.settings.cMenuBackgroundColor, cmEditor);
      } else if (this.EN_Text_Format_Brush) {
        setFormateraser(this, cmEditor);
      } else if (this.formatBrushActive && this.lastExecutedCommand) {
        this.applyFormatBrush(cmEditor);
      } else if (this.settings.positionStyle === "following") {
        this.showFollowingToolbar(cmEditor);
      }
    } else {
      if (editingToolbarModalBar&&this.settings.positionStyle === "following") {
        editingToolbarModalBar.style.visibility = "hidden";
      }
    }
  }
  
  // 抽取显示工具栏的逻辑
  private showFollowingToolbar(editor: Editor) {
    const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
    
    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "visible";
      editingToolbarModalBar.classList.add("editingToolbarFlex");
      editingToolbarModalBar.classList.remove("editingToolbarGrid");
      
      // 直接使用createFollowingbar的定位逻辑
      createFollowingbar(this.app,this.toolbarIconSize, this.settings, editor, true);
    } else {
      createFollowingbar(this.app, this.toolbarIconSize, this.settings, editor, true);
    }
  }


  public onPositionStyleChange(newStyle: string): void {
    // 如果启用了多配置模式，检查对应样式的配置是否存在
    if (this.settings.enableMultipleConfig) {
      switch (newStyle) {
        case 'following':
          if (!this.settings.followingCommands || this.settings.followingCommands.length === 0) {
            this.settings.followingCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(t('Following style commands successfully initialized'));
          }
          break;
        case 'top':
          if (!this.settings.topCommands || this.settings.topCommands.length === 0) {
            this.settings.topCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(t('Top style commands successfully initialized'));
          }
          break;
        case 'fixed':
          if (!this.settings.fixedCommands || this.settings.fixedCommands.length === 0) {
            this.settings.fixedCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(t('Fixed style commands successfully initialized'));
          }
          break;
        case 'mobile':
          if (!this.settings.mobileCommands || this.settings.mobileCommands.length === 0) {
            this.settings.mobileCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(t('Mobile style commands successfully initialized'));
          }
          break;
      }
    }

    // 重新加载工具栏
    dispatchEvent(new Event("editingToolbar-NewCommand"));
  }
}
