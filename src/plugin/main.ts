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
  debounce,
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


import { setFontcolor, setBackgroundcolor, renumberSelection } from "src/util/util";


import { ViewUtils } from 'src/util/viewUtils';
import { UpdateNoticeModal } from "src/modals/updateModal";
import { StatusBar } from "src/components/StatusBar";
import { CommandsManager } from "src/commands/commands";
import { t } from 'src/translations/helper';
import { InsertLinkModal } from "src/modals/insertLinkModal";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";


let activeDocument: Document;

export interface AdmonitionDefinition  {
  type: string;
    title?: string;
    icon: string;
    color: string;
    command: boolean;
    injectColor?: boolean;
    noTitle: boolean;
    copy?: boolean;
}

interface AdmonitionPluginPublic {
  admonitions: Map<string, AdmonitionDefinition >;
  postprocessors: Map<string, any>;

}
// ... 常量定义 ...
const ADMONITION_PLUGIN_ID = 'obsidian-admonition';

export default class editingToolbarPlugin extends Plugin {
  app: App;
  settings: editingToolbarSettings;
  statusBarIcon: HTMLElement;
  statusBar: StatusBar;
  public toolbarIconSize: number; // 新增全局变量
  public positionStyle: string;
  // 修改为公共属性
  commandsManager: CommandsManager;
  public admonitionDefinitions: Record<string, AdmonitionDefinition> | null = null;

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
  lastCalloutType: string | null = null;
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
    const updateModal = new UpdateNoticeModal(this.app, this);
    const isNewInstall = lastVersion === '0.0.0';
    if (isNewInstall) {
      updateModal.fixCommandIds();
    }
    const needUpdateNotice =
      !isNewInstall &&
      (lastVer.major < 3 ||
        (lastVer.major === 3 && lastVer.minor < 1));
    if (needUpdateNotice) {
      setTimeout(() => {
        updateModal.open();
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
    this.registerDomEvent(
      activeDocument,
      'contextmenu',
      e => {
        if (this.settings.isLoadOnMobile && Platform.isMobile && this.positionStyle == "following") {
          const { target } = e;
          if (target instanceof HTMLElement) {
            const iseditor = target.closest('.cm-editor') !== null;
            if (iseditor) {
              e.preventDefault();
            }
          }
        }

      },
    );

// 最好等待工作区布局准备好，确保所有插件都已加载
this.app.workspace.onLayoutReady(async () => {
  await this.tryGetAdmonitionTypes();
});


    //////


    // // 注册右键菜单
    // this.registerEvent(
    //   this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
    //     const selection = editor.getSelection();

    //     if (selection) {
    //       // 检查是否为链接或图片（包括带大小参数的图片）
    //       if (/(!)?\[.*(?:\|(?:\d+x\d+|\d+))?\]\([a-zA-Z]+:\/\/[^\s)]+(?:\s+["'][^"']*["'])?\)/.test(selection.trim())) {
    //         menu.addItem((item) =>
    //           item
    //             .setTitle('Edit Link')
    //             .setIcon('link')
    //             .onClick(() => new InsertLinkModal(this).open())
    //         );
    //       }
    //       return; // 有选中文本时，不继续检查光标周围
    //     }

    //     // 如果没有选中文本，检查光标周围是否为链接或图片
    //     const cursor = editor.getCursor();
    //     const lineText = editor.getLine(cursor.line);
    //     const cursorPos = cursor.ch;

    //     // 使用合并的正则表达式，同时匹配链接和图片
    //     const combinedRegex = /(!)?\[([^\]]+)(?:\|(\d+x\d+|\d+))?\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/g;
    //     let match;

    //     while ((match = combinedRegex.exec(lineText)) !== null) {
    //       const linkStart = match.index;
    //       const linkEnd = match.index + match[0].length;

    //       // 检查光标是否在链接或图片范围内（包括边缘）
    //       if (cursorPos >= linkStart && cursorPos <= linkEnd) {
    //         menu.addItem((item) =>
    //           item
    //             .setTitle('Edit Link(Modal)')
    //             .setIcon('link')
    //             .onClick(() => new InsertLinkModal(this).open())
    //         );
    //         break; // 找到匹配后退出
    //       }
    //     }


    //   })
    // );
    // 注册右键菜单
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        // 判断光标是否在有序列表行（简单匹配数字开头）
        if (/^\d+\.\s/.test(lineText)) {
          menu.addItem((item) =>
            item
              .setSection("info")
              .setTitle(t('Renumber List'))
              .setIcon('list-restart')
              .onClick(() => renumberSelection(editor))
          );
        }
      })
    );
    this.registerEvent(
      // @ts-ignore
      this.app.workspace.on('url-menu', (menu: Menu, url: string, view: MarkdownView) => {
        // 添加自定义菜单项
        menu.addItem((item) =>
          item
            .setTitle('Edit Link(Modal)')
            .setSection("info")
            .setIcon('link')
            .onClick(() => {

              new InsertLinkModal(this).open()
            })
        );
      })


    );
    // 初始化图标
    addIcons();
    this.toolbarIconSize = this.settings.toolbarIconSize;
    this.positionStyle = this.settings.positionStyle;
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


  async tryGetAdmonitionTypes(retries = 0): Promise<void> {
    // @ts-ignore
    const admonitionPluginInstance = this.app.plugins?.getPlugin(ADMONITION_PLUGIN_ID);
    if (admonitionPluginInstance) {

        this.processAdmonitionTypes(admonitionPluginInstance);
    }
    }

processAdmonitionTypes(pluginInstance: any) {

  const admonitionPlugin = pluginInstance as { admonitions?: Record<string, AdmonitionDefinition> };

  let registeredTypes: string[] | null = null;
  let typesSource: string | null = null;

  if (admonitionPlugin.admonitions &&
      typeof admonitionPlugin.admonitions === 'object' &&
      !Array.isArray(admonitionPlugin.admonitions) && // 确保不是数组
      Object.keys(admonitionPlugin.admonitions).length > 0) {

      registeredTypes = Object.keys(admonitionPlugin.admonitions);
      this.admonitionDefinitions = admonitionPlugin.admonitions;

  }  else {
    console.warn('未能从 admonitionPlugin.admonitions (作为对象) 获取类型。');
    this.admonitionDefinitions = null;
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

    if (!this.formatBrushActive) {
      activeDocument.body.classList.remove('format-brush-cursor');
    }
    if (this.settings.cMenuVisibility == true) {
      const view = this.app.workspace.getActiveViewOfType(ItemView);
      let toolbar = isExistoolbar(this.app, this);

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
          if (this.positionStyle === "following") {
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
    let editingToolbarModalBar = isExistoolbar(this.app, this);

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
        if (this.positionStyle === "following") {
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
    if (this.settings.cMenuVisibility == true && this.positionStyle == "top") {
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
    let currentstyle = style || this.positionStyle;
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

    switch (this.positionStyle) {
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
    const editor = this.commandsManager.getActiveEditor();
    let detectedFormat = false;
    let calloutType = "";
    // 判断是否有选中文本
    if (editor) {
      if (editor.somethingSelected()) {
        const selectedText = editor.getSelection();
        // 检测选中文本的格式
        if (/^\*\*.*\*\*$/.test(selectedText)) {
          // 粗体
          this.lastExecutedCommand = "editor:toggle-bold";
          this.lastExecutedCommandName = "Bold";
          detectedFormat = true;
        } else if (/^\*.*\*$/.test(selectedText) || /^_.*_$/.test(selectedText)) {
          // 斜体
          this.lastExecutedCommand = "editor:toggle-italics";
          this.lastExecutedCommandName = "Italic";
          detectedFormat = true;
        } else if (/^~~.*~~$/.test(selectedText)) {
          // 删除线
          this.lastExecutedCommand = "editor:toggle-strikethrough";
          this.lastExecutedCommandName = "Strikethrough";
          detectedFormat = true;
        } else if (/^==.*==$/.test(selectedText)) {
          // 高亮
          this.lastExecutedCommand = "editor:toggle-highlight";
          this.lastExecutedCommandName = "Highlight";
          detectedFormat = true;
        } else if (/^`.*`$/.test(selectedText)) {
          // 代码
          this.lastExecutedCommand = "editor:toggle-code";
          this.lastExecutedCommandName = "Code";
          detectedFormat = true;
        } else if (/^<font color=".*">.*<\/font>$/.test(selectedText)) {
          // 字体颜色
          this.lastExecutedCommand = "editing-toolbar:change-font-color";
          this.lastExecutedCommandName = "Font Color";
          detectedFormat = true;
        } else if (/^<span style="background:.*">.*<\/span>$/.test(selectedText)) {
          // 背景颜色
          this.lastExecutedCommand = "editing-toolbar:change-background-color";
          this.lastExecutedCommandName = "Background Color";
          detectedFormat = true;
        }
        else if (/^<u>([^<]+)<\/u>$/.test(selectedText)) {
          this.lastExecutedCommand = "editor:toggle-underline";
          this.lastExecutedCommandName = "Underline";
          detectedFormat = true;
        }
        else if (/^<center>([^<]+)<\/center>$/.test(selectedText)) {
          this.lastExecutedCommand = "editing-toolbar:center";
          this.lastExecutedCommandName = "Center";
          detectedFormat = true;
        }
        else if (/^<p align="left">(.*?)<\/p>$/.test(selectedText)) {
          this.lastExecutedCommand = "editing-toolbar:left";
          this.lastExecutedCommandName = "Left Align";
          detectedFormat = true;
        }
        else if (/^<p align="right">(.*?)<\/p>$/.test(selectedText)) {
          this.lastExecutedCommand = "editing-toolbar:right";
          this.lastExecutedCommandName = "Right Align";
          detectedFormat = true;
        }
        else if (/^<p align="justify">(.*?)<\/p>$/.test(selectedText)) {
          this.lastExecutedCommand = "editing-toolbar:justify";
          this.lastExecutedCommandName = "Justify";
          detectedFormat = true;
        }
        else if (/^<sup>(.*?)<\/sup>$/.test(selectedText)) {
          this.lastExecutedCommand = "editing-toolbar:superscript";
          this.lastExecutedCommandName = "Superscript";
          detectedFormat = true;
        }
        else if (/^<sub>(.*?)<\/sub>$/.test(selectedText)) {
          this.lastExecutedCommand = "editing-toolbar:subscript";
          this.lastExecutedCommandName = "Subscript";
          detectedFormat = true;
        }
        else if (
          /^> \[!(note|tip|warning|danger|info|success|question|quote)\]/i.test(selectedText)
        ) {
          const match = selectedText.match(/^> \[!(note|tip|warning|danger|info|success|question|quote)\]/i);
          if (match) {
            this.lastExecutedCommand = "editor:insert-callout";
            this.lastExecutedCommandName = "Callout-" + match[1].toLowerCase();
            detectedFormat = true;
            calloutType = match[1].toLowerCase(); // 转换为小写
          }
        }
        // 检测标题格式
        else if (/^# /.test(selectedText)) {
          this.lastExecutedCommand = "editor:set-heading-1";
          this.lastExecutedCommandName = "Heading 1";
          detectedFormat = true;
        } else if (/^## /.test(selectedText)) {
          this.lastExecutedCommand = "editor:set-heading-2";
          this.lastExecutedCommandName = "Heading 2";
          detectedFormat = true;
        } else if (/^### /.test(selectedText)) {
          this.lastExecutedCommand = "editor:set-heading-3";
          this.lastExecutedCommandName = "Heading 3";
          detectedFormat = true;
        } else if (/^#### /.test(selectedText)) {
          this.lastExecutedCommand = "editor:set-heading-4";
          this.lastExecutedCommandName = "Heading 4";
          detectedFormat = true;
        } else if (/^##### /.test(selectedText)) {
          this.lastExecutedCommand = "editor:set-heading-5";
          this.lastExecutedCommandName = "Heading 5";
          detectedFormat = true;
        } else if (/^###### /.test(selectedText)) {
          this.lastExecutedCommand = "editor:set-heading-6";
          this.lastExecutedCommandName = "Heading 6";
          detectedFormat = true;
        }

      }
      else {
        // 没有选中文本时，探测光标周围的格式
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        const cursorPos = cursor.ch;

        // 用于记录找到的所有格式及其范围
        const foundFormats = [];

        // 检测下划线
        const underlineRegex = /<u>([^<]+)<\/u>/g;
        let match;
        while ((match = underlineRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:toggle-underline",
              name: "Underline",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        // 检测居中
        const centerRegex = /<center>([^<]+)<\/center>/g;
        while ((match = centerRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:center",
              name: "Center",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        // 检测居左
        const leftRegex = /<p align="left">([^<]+)<\/p>/g;
        while ((match = leftRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:left",
              name: "Left Align",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        // 检测居右
        const rightRegex = /<p align="right">([^<]+)<\/p>/g;
        while ((match = rightRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:right",
              name: "Right Align",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        // 检测两端对齐
        const justifyRegex = /<p align="justify">([^<]+)<\/p>/g;
        while ((match = justifyRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:justify",
              name: "Justify",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        // 检测上标
        const superscriptRegex = /<sup>([^<]+)<\/sup>/g;
        while ((match = superscriptRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:superscript",
              name: "Superscript",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        // 检测下标
        const subscriptRegex = /<sub>([^<]+)<\/sub>/g;
        while ((match = subscriptRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:subscript",
              name: "Subscript",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }


        // 检测光标是否在粗体中
        const boldRegex = /\*\*([^*]+)\*\*/g;

        while ((match = boldRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editor:toggle-bold",
              name: "Bold",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }


        // 检测删除线

        const strikeRegex = /~~([^~]+)~~/g;
        while ((match = strikeRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editor:toggle-strikethrough",
              name: "Strikethrough",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }


        // 检测高亮

        const highlightRegex = /==([^=]+)==/g;
        while ((match = highlightRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editor:toggle-highlight",
              name: "Highlight",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }


        // 检测代码

        const codeRegex = /`([^`]+)`/g;
        while ((match = codeRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editor:toggle-code",
              name: "Code",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }


        // 检测字体颜色

        const fontColorRegex = /<font color="([^"]+)">([^<]+)<\/font>/g;
        while ((match = fontColorRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:change-font-color",
              name: "Font Color",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }


        // 检测背景颜色

        const bgColorRegex = /<span style="background:([^"]+)">([^<]+)<\/span>/g;
        while ((match = bgColorRegex.exec(lineText)) !== null) {
          const formatStart = match.index;
          const formatEnd = match.index + match[0].length;
          if (cursorPos > formatStart && cursorPos < formatEnd) {
            foundFormats.push({
              command: "editing-toolbar:change-background-color",
              name: "Background Color",
              distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos)
            });
          }
        }

        if (foundFormats.length > 0) {
          // 按照距离排序，距离最小的在前
          foundFormats.sort((a, b) => a.distance - b.distance);

          // 使用距离最近的格式
          const nearestFormat = foundFormats[0];
          this.lastExecutedCommand = nearestFormat.command;
          this.lastExecutedCommandName = nearestFormat.name;
          detectedFormat = true;
        }

        // 如果不是粗体，检测是否在斜体中
        if (!detectedFormat) {
          const italicRegex = /(\*|_)([^*_]+)(\*|_)/g;
          while ((match = italicRegex.exec(lineText)) !== null) {
            this.lastExecutedCommand = "editor:toggle-italics";
            this.lastExecutedCommandName = "Italic";
            detectedFormat = true;
          }
        }

        // 检测标题
        if (!detectedFormat) {

          if (/^# /.test(lineText) && cursorPos > 0) {
            this.lastExecutedCommand = "editor:set-heading-1";
            this.lastExecutedCommandName = "Heading 1";
            detectedFormat = true;
          } else if (/^## /.test(lineText) && cursorPos > 1) {
            this.lastExecutedCommand = "editor:set-heading-2";
            this.lastExecutedCommandName = "Heading 2";
            detectedFormat = true;
          } else if (/^### /.test(lineText) && cursorPos > 2) {
            this.lastExecutedCommand = "editor:set-heading-3";
            this.lastExecutedCommandName = "Heading 3";
            detectedFormat = true;
          } else if (/^#### /.test(lineText) && cursorPos > 3) {
            this.lastExecutedCommand = "editor:set-heading-4";
            this.lastExecutedCommandName = "Heading 4";
            detectedFormat = true;
          } else if (/^##### /.test(lineText) && cursorPos > 4) {
            this.lastExecutedCommand = "editor:set-heading-5";
            this.lastExecutedCommandName = "Heading 5";
            detectedFormat = true;
          } else if (/^###### /.test(lineText) && cursorPos > 5) {
            this.lastExecutedCommand = "editor:set-heading-6";
            this.lastExecutedCommandName = "Heading 6";
            detectedFormat = true;
          }
        }
      }
    }
    if (!detectedFormat && !this.lastExecutedCommand) {
      new Notice(t("Please execute a format command or select format text first, then enable the format brush"));
      return;
    }

    this.formatBrushActive = !this.formatBrushActive;

    if (this.formatBrushActive) {


      activeDocument.body.classList.add('format-brush-cursor');
      // 关闭其他格式刷
      this.EN_FontColor_Format_Brush = false;
      this.EN_BG_Format_Brush = false;
      this.EN_Text_Format_Brush = false;
      // 存储 Callout 类型
      this.lastCalloutType = calloutType;
      // 显示通知，包含具体命令名称
      if (this.formatBrushNotice) this.formatBrushNotice.hide();
      this.formatBrushNotice = new Notice(t("Format brush ON! Select text to apply【") + this.lastExecutedCommandName + t("】format"), 0);
    } else {
      activeDocument.body.classList.remove('format-brush-cursor');
      // 关闭通知
      if (this.formatBrushNotice) {
        this.formatBrushNotice.hide();
        this.formatBrushNotice = null;
      }
    }
  }
  // 应用 Callout 的方法
  applyCalloutFormat(editor: Editor, text: string, calloutType: string) {
    // 移除现有的 Callout 前缀（如果存在）
    const calloutPrefixRegex = /^> \[!(note|tip|warning|danger|info|success|question|quote)\] ?/i;
    const cleanedText = text.replace(calloutPrefixRegex, '').trim();

    // 处理多行 Callout 文本，去除第二行及以后的行首 >
    const lines = cleanedText.split('\n');
    const processedLines = lines.map((line, index) =>
      line.replace(/^\s*>\s*/, '')
    );

    // 构建新的 Callout 文本
    const newText = `> [!${calloutType}]\n> ${processedLines.join('\n> ')}`;

    // 替换文本
    editor.replaceSelection(newText);
  }
  applyFormatBrush(editor: Editor): void {
    if (!this.lastExecutedCommand || !this.formatBrushActive) return;
    // 执行保存的命令
    const command = this.app.commands.commands[this.lastExecutedCommand];
    if (command && command.callback) {
      command.callback();
    }
    if (command && command.editorCallback) {
      command.editorCallback(editor, this.app.workspace.getActiveViewOfType(MarkdownView));
    }
  }

  // 扩展现有方法以支持格式刷
  quiteAllFormatBrushes(): void {
    this.EN_FontColor_Format_Brush = false;
    this.EN_BG_Format_Brush = false;
    this.EN_Text_Format_Brush = false;
    activeDocument.body.classList.remove('format-brush-cursor');
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


  init_evt(container: Document, editor: Editor) {
    // 重置状态
    this.resetFormatBrushStates();

    // 防抖的文本选择处理
    const debouncedHandleTextSelection = debounce(() => {
      this.handleTextSelection();
    }, 100);

    // 统一的鼠标事件处理
    this.registerDomEvent(container, "mousedown", (e: MouseEvent) => {
      if (!this.isView() || !this.commandsManager.getActiveEditor()) return;

      const mouseDownTime = Date.now(); // 记录按下时间
      if (e.button === 1) {
          this.registerDomEvent(container, "mouseup", (e2: MouseEvent) => {
              const mouseUpTime = Date.now(); // 记录释放时间
              if (mouseUpTime - mouseDownTime < 300 && e2.button === 1) {
                  this.handleMiddleClickToolbar(e2);
              }
          });
      }

      // 格式刷重置
      this.resetFormatBrushIfActive(container, e);
    });

    // 跨平台选择处理
    if (Platform.isMobileApp) {
      this.registerDomEvent(container, "selectionchange", () => {
        debouncedHandleTextSelection();
      });
    } else {
      this.registerDomEvent(container, "mouseup", (e) => {
        if (e.button !== 1) {
          debouncedHandleTextSelection();
        }
      });
    }

    // 键盘选择处理
    this.registerDomEvent(container, "keyup", this.handleKeyboardSelection);

    // 滚动和失焦隐藏工具栏
    this.registerScrollAndBlurEvents(container);
  }

  private resetFormatBrushStates() {
    this.EN_FontColor_Format_Brush = false;
    this.EN_BG_Format_Brush = false;
    this.EN_Text_Format_Brush = false;
    this.formatBrushActive = false;
  }

  private handleMiddleClickToolbar(e: MouseEvent) {
    const cmEditor = this.commandsManager.getActiveEditor();
    if (this.positionStyle === "following" && cmEditor?.hasFocus()) {
      this.showFollowingToolbar(cmEditor);
    }
  }

  private resetFormatBrushIfActive(container: Document, e: MouseEvent) {
    if (e.button === 2 && this.isFormatBrushActive()) {
      this.registerDomEvent(container, "contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }, {capture: true});
      quiteFormatbrushes(this);
    }
  }

  private isFormatBrushActive(): boolean {
    return this.EN_FontColor_Format_Brush ||
      this.EN_BG_Format_Brush ||
      this.EN_Text_Format_Brush ||
      this.formatBrushActive;
  }

  private handleKeyboardSelection = (e: KeyboardEvent) => {
    const selectionKeys = [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Home", "End", "PageUp", "PageDown", "ShiftLeft", "ShiftRight"
    ];

    const cmEditor = this.commandsManager.getActiveEditor();

    if (selectionKeys.includes(e.code) || e.shiftKey) {
      this.handleTextSelection();
    } else if (!e.shiftKey && this.positionStyle === "following") {
      this.hideToolbarIfNotSelected();
    }
  }

  private registerScrollAndBlurEvents(container: Document) {
    const hideToolbar = this.throttle(() => {
      if (this.positionStyle !== "following") return;
      this.hideToolbarIfNotSelected();
    }, 200);

    this.registerDomEvent(activeDocument, "wheel", hideToolbar);
    this.registerDomEvent(container, "blur", () => {
      this.hideToolbarIfNotSelected();
    });
  }

  private hideToolbarIfNotSelected() {
    const editingToolbarModalBar = isExistoolbar(this.app, this);
    if (editingToolbarModalBar && this.positionStyle == "following") {
      editingToolbarModalBar.style.visibility = "hidden";
    }
  }

  private handleTextSelection() {
    if (!this.isView()) return;

    const cmEditor = this.commandsManager.getActiveEditor();
    if (!cmEditor?.hasFocus()) return;


    if (cmEditor.somethingSelected()) {
      this.handleSelectedText(cmEditor);
    } else {
      this.hideToolbarIfNotSelected();
    }
  }

  private handleSelectedText(cmEditor: Editor) {
    if (this.EN_FontColor_Format_Brush) {
      setFontcolor(this.settings.cMenuFontColor, cmEditor);
    } else if (this.EN_BG_Format_Brush) {
      setBackgroundcolor(this.settings.cMenuBackgroundColor, cmEditor);
    } else if (this.EN_Text_Format_Brush) {
      setFormateraser(this, cmEditor);
    }
    else if (this.formatBrushActive && this.lastCalloutType) {
      this.applyCalloutFormat(cmEditor, cmEditor.getSelection(), this.lastCalloutType);
    } else if (this.formatBrushActive && this.lastExecutedCommand) {
      this.applyFormatBrush(cmEditor);
    }
    else if (this.positionStyle === "following") {
      this.showFollowingToolbar(cmEditor);
    }
  }

  private throttle(func: Function, limit: number = 100) {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 抽取显示工具栏的逻辑
  private showFollowingToolbar(editor: Editor) {
    const editingToolbarModalBar = isExistoolbar(this.app, this);

    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "visible";
      editingToolbarModalBar.classList.add("editingToolbarFlex");
      editingToolbarModalBar.classList.remove("editingToolbarGrid");

      // 直接使用createFollowingbar的定位逻辑
      createFollowingbar(this.app, this.toolbarIconSize, this, editor, true);
    } else {
      createFollowingbar(this.app, this.toolbarIconSize, this, editor, true);
    }
  }


  public onPositionStyleChange(newStyle: string): void {
    this.positionStyle = newStyle;
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
