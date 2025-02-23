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
import { selfDestruct, editingToolbarPopover, quiteFormatbrushes, setFontcolor, setBackgroundcolor, setHeader, createFollowingbar, setFormateraser, isExistoolbar, resetToolbar } from "src/modals/editingToolbarModal";
import { editingToolbarSettings, DEFAULT_SETTINGS } from "src/settings/settingsData";
import addIcons, {
  // addFeatherIcons,
  // addRemixIcons
  // addBoxIcons
} from "src/icons/customIcons";

import { setMenuVisibility } from "src/util/statusBarConstants";
import { fullscreenMode, workplacefullscreenMode } from "src/util/fullscreen";
import { t } from "src/translations/helper";



import { ViewUtils } from 'src/util/viewUtils';



let activeDocument: Document;


export default class editingToolbarPlugin extends Plugin {
  app: App;
  settings: editingToolbarSettings;
  statusBarIcon: HTMLElement;
 

  modCommands: Command[] = [
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
      id: "editor:toggle-bold",
      name: "Bold",
      icon: "bold-glyph",
    },
    {
      id: "editor:toggle-italics",
      name: "Italics",
      icon: "italic-glyph",
    },
    {
      id: "editor:toggle-strikethrough",
      name: "Strikethrough",
      icon: "strikethrough-glyph",
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
      id: "editor:toggle-bullet-list",
      name: "Bullet list",
      icon: "bullet-list-glyph",
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
      id: "editor:toggle-highlight",
      name: "Highlight",
      icon: "highlight-glyph",
    },
    {
      id: "editor:toggle-numbered-list",
      name: "Numbered list",
      icon: "number-list-glyph",
    },
    {
      id: "editor:insert-callout",
      name: "Insert Callout ",
      icon: "lucide-quote",
    },
    {
      id: "editor:insert-mathblock",
      name: "MathBlock",
      icon: "lucide-sigma-square",
    },
    {
      id: "editor:toggle-inline-math",
      name: "Inline math",
      icon: "lucide-sigma",
    },
    {
      id: "editor:insert-table",
      name: "Insert Table",
      icon: "lucide-table",
    },
    {
      id: "editor:swap-line-up",
      name: "Swap line up",
      icon: "lucide-corner-right-up",
    },
    {
      id: "editor:swap-line-down",
      name: "Swap line down",
      icon: "lucide-corner-right-down",
    },
    {
      id: "editor:attach-file",
      name: "Attach file",
      icon: "lucide-paperclip",
    },
    {
      id: "editor:clear-formatting",
      name: "Clear formatting",
      icon: "lucide-eraser",
    },
    {
      id: "editor:cycle-list-checklist",
      name: "Cycle list checklist",
      icon: "lucide-check-square",
    }

  ];

  IS_MORE_Button: boolean;
  EN_BG_Format_Brush: boolean;
  EN_FontColor_Format_Brush: boolean;
  EN_Text_Format_Brush: boolean;
  Temp_Notice: Notice;
  Leaf_Width: number;

  async onload(): Promise<void> {
    console.log("editingToolbar v" + this.manifest.version + " loaded");

    requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
    await this.loadSettings();
    this.addSettingTab(new editingToolbarSettingTab(this.app, this));

    addIcons();
    // addRemixIcconsole.log();ons(appIcons);
    this.generateCommands();
    this.app.workspace.onLayoutReady(() => {
      setTimeout(() => {
        this.setupStatusBar();
      });
    });
      this.init_evt(activeDocument);
      if (requireApiVersion("0.15.0")) {
        this.app.workspace.on('window-open', (leaf) => {
          this.init_evt(leaf.doc);
        });
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
  init_evt(container: Document) {
    this.EN_FontColor_Format_Brush = false;
    this.EN_BG_Format_Brush = false;
    this.EN_Text_Format_Brush = false;

    this.registerDomEvent(container, "mouseup", async (e: { button: any; }) => {
      if (e.button) {
        if (this.EN_FontColor_Format_Brush || this.EN_BG_Format_Brush || this.EN_Text_Format_Brush) {
          quiteFormatbrushes(this);
        }
      }

      if (!this.isView()) return;

      // @ts-ignore - 使用 obsidian-ex.d.ts 中的扩展类型
      let cmEditor = app.workspace.activeLeaf.view?.editor;
      if (cmEditor?.hasFocus()) {
        let editingToolbarModalBar = isExistoolbar(this.app, this.settings);

        if (cmEditor.getSelection() == null || cmEditor.getSelection() == "") {
          if (editingToolbarModalBar && this.settings.positionStyle == "following")
            editingToolbarModalBar.style.visibility = "hidden";
          return
        } else {
          //   console.log(this.EN_FontColor_Format_Brush,'EN_FontColor_Format_Brush')
          if (this.EN_FontColor_Format_Brush) {
            setFontcolor(this.app, this.settings.cMenuFontColor);
          } else if (this.EN_BG_Format_Brush) {
            setBackgroundcolor(this.app, this.settings.cMenuBackgroundColor);
          } else if (this.EN_Text_Format_Brush) {
            setFormateraser(this.app, this);
          } else if (this.settings.positionStyle == "following") {
            createFollowingbar(this.app, this.settings);
          }
        }
      } else if (this.EN_FontColor_Format_Brush || this.EN_BG_Format_Brush || this.EN_Text_Format_Brush) {
        quiteFormatbrushes(this);
      }
    });

    this.registerDomEvent(activeDocument, "keydown", (e) => {
      if (this.settings.positionStyle !== "following") return;
      const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
      if (!e.shiftKey && editingToolbarModalBar) editingToolbarModalBar.style.visibility = "hidden";
    });

    this.registerDomEvent(activeDocument, "wheel", () => {
      if (this.settings.positionStyle !== "following") return;
      const editingToolbarModalBar = isExistoolbar(this.app, this.settings);
      if (editingToolbarModalBar) editingToolbarModalBar.style.visibility = "hidden";
    });
  }

  generateCommands() {
    //Hide-show menu
    this.addCommand({
      id: "hide-show-menu",
      name: "Hide/show ",
      icon: "editingToolbar",
      callback: async () => {
        this.settings.cMenuVisibility = !this.settings.cMenuVisibility;
        this.settings.cMenuVisibility == true
          ? setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100)
          : setMenuVisibility(this.settings.cMenuVisibility);
        selfDestruct();
        await this.saveSettings();
      },
    });
    this.addCommand({
      id: 'format-eraser',
      name: 'Format Eraser',
      callback: () => setFormateraser(this.app, this),
      icon: `<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M889 512 l-211 211 q-26 27 -61 36 q-35 9 -70 0 q-35 -9 -61 -36 l-351 -350 q-26 -27 -35.5 -62 q-9.5 -35 0 -70 q9.5 -35 35.5 -61 l170 -170 q12 -12 29 -12 l215 0 q17 0 29 12 l311 310 q26 26 35.5 61 q9.5 35 0 70 q-9.5 35 -35.5 61 ZM831 453 q15 -15 15.5 -36.5 q0.5 -21.5 -14.5 -37.5 l-300 -298 l-181 0 l-158 158 q-15 15 -15 37 q0 22 15 38 l351 351 q16 16 38 16 q22 0 37 -16 l212 -212 ZM686 217 l-59 -59 l-317 315 l58 59 l318 -315 ZM883 81 q18 0 30.5 -12 q12.5 -12 12.5 -29 q0 -17 -12.5 -29 q-12.5 -12 -29.5 -13 l-456 0 q-17 0 -29.5 12 q-12.5 12 -12.5 29 q0 17 12 29 q12 12 29 13 l456 0 Z\"></path></g></svg>`

    });
    this.addCommand({
      id: 'off-Format-Brush',
      name: 'OFF Format Brush',
      callback: () => quiteFormatbrushes(this),
    });
    this.addCommand({
      id: 'change-font-color',
      name: 'Change font color[html]',
      callback: () => setFontcolor(app, this.settings.cMenuFontColor ?? "#2DC26B"),
      icon: `<svg width="24" height="24" focusable="false" fill="currentColor"><g fill-rule="evenodd"><path id="change-font-color-icon" d="M3 18h18v3H3z" style="fill:#2DC26B"></path><path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z"></path></g></svg>`

    });
    this.addCommand({
      id: 'change-background-color',
      name: 'Change Backgroundcolor[html]',
      callback: () => setBackgroundcolor(app, this.settings.cMenuBackgroundColor ?? "#FA541C"),
      icon: `<svg width="18" height="24" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg"><g   stroke="none" stroke-width="1" fill="currentColor" fill-rule="evenodd"><g  ><g fill="currentColor"><g transform="translate(119.502295, 137.878331) rotate(-135.000000) translate(-119.502295, -137.878331) translate(48.002295, 31.757731)" ><path d="M100.946943,60.8084699 L43.7469427,60.8084699 C37.2852111,60.8084699 32.0469427,66.0467383 32.0469427,72.5084699 L32.0469427,118.70847 C32.0469427,125.170201 37.2852111,130.40847 43.7469427,130.40847 L100.946943,130.40847 C107.408674,130.40847 112.646943,125.170201 112.646943,118.70847 L112.646943,72.5084699 C112.646943,66.0467383 107.408674,60.8084699 100.946943,60.8084699 Z M93.646,79.808 L93.646,111.408 L51.046,111.408 L51.046,79.808 L93.646,79.808 Z" fill-rule="nonzero"></path><path d="M87.9366521,16.90916 L87.9194966,68.2000001 C87.9183543,69.4147389 86.9334998,70.399264 85.7187607,70.4 L56.9423078,70.4 C55.7272813,70.4 54.7423078,69.4150264 54.7423078,68.2 L54.7423078,39.4621057 C54.7423078,37.2523513 55.5736632,35.1234748 57.0711706,33.4985176 L76.4832996,12.4342613 C78.9534987,9.75382857 83.1289108,9.5834005 85.8093436,12.0535996 C87.1658473,13.303709 87.9372691,15.0644715 87.9366521,16.90916 Z" fill-rule="evenodd"></path><path d="M131.3,111.241199 L11.7,111.241199 C5.23826843,111.241199 0,116.479467 0,122.941199 L0,200.541199 C0,207.002931 5.23826843,212.241199 11.7,212.241199 L131.3,212.241199 C137.761732,212.241199 143,207.002931 143,200.541199 L143,122.941199 C143,116.479467 137.761732,111.241199 131.3,111.241199 Z M124,130.241 L124,193.241 L19,193.241 L19,130.241 L124,130.241 Z" fill-rule="nonzero"></path></g></g><path d="M51,218 L205,218 C211.075132,218 216,222.924868 216,229 C216,235.075132 211.075132,240 205,240 L51,240 C44.9248678,240 40,235.075132 40,229 C40,222.924868 44.9248678,218 51,218 Z" id="change-background-color-icon" style="fill:#FA541C"></path></g></g></svg>`

    });
    this.addCommand({
      id: 'indent-list',
      name: 'Indent list',
      callback: () => {
        //const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        //const view = activeLeaf;
        const editor = app.workspace.activeLeaf.view?.editor;
        // @ts-ignore - 使用扩展类型
        return editor?.indentList();
      },
      icon: "indent-glyph"

    });
    this.addCommand({
      id: 'undent-list',
      name: 'Unindent list',
      callback: () => {
        const editor = app.workspace.activeLeaf.view?.editor;
        // @ts-ignore - 使用扩展类型
        return editor?.unindentList();
      },
      icon: "unindent-glyph"

    });
    this.addCommand({
      id: 'editor-undo',
      name: 'Undo editor',
      callback: () => {
        const editor =  app.workspace.activeLeaf.view?.editor;
        return editor?.undo();
      },
      icon: "undo-glyph"

    });
    this.addCommand({
      id: 'editor-redo',
      name: 'Redo editor',
      callback: () => {
        const editor =  app.workspace.activeLeaf.view?.editor;
        return editor?.redo();
      },
      icon: "redo-glyph"

    });
    this.addCommand({
      id: 'editor-copy',
      name: 'Copy editor',
      callback: async () => {

        const editor =  app.workspace.activeLeaf.view?.editor;
        try {
          await window.navigator.clipboard.writeText(editor.getSelection()); // 使用 window.navigator.clipboard.writeText() 方法将选定的文本写入剪贴板
          app.commands.executeCommandById("editor:focus");
        } catch (error) {
          console.error("Copy failed:", error);
        }
      },
      icon: "lucide-copy"

    });
    this.addCommand({
      id: 'editor-paste',
      name: 'Paste editor',
      callback: async () => {
        const editor =  app.workspace.activeLeaf.view?.editor;
        try {
          var replaceSelection = editor.replaceSelection; // 获取编辑器的替换选区方法
          var text = await window.navigator.clipboard.readText(); // 使用 window.navigator.clipboard.readText() 方法读取剪贴板中的文本
          if(text)  replaceSelection.apply(editor, [text]); // 将读取的文本替换当前选区
          app.commands.executeCommandById("editor:focus");
        } catch (error) {
          console.error("Paste failed:", error);
        }
      },
      icon: "lucide-clipboard-type"

    });
    this.addCommand({
      id: 'editor-cut',
      name: 'Cut editor',
      callback: async () => {

        const editor =  app.workspace.activeLeaf.view?.editor;
        try {
          await window.navigator.clipboard.writeText(editor.getSelection()); // 使用 window.navigator.clipboard.writeText() 方法将选定的文本写入剪贴板
          editor.replaceSelection(""); // 清空选定的文本
          app.commands.executeCommandById("editor:focus");
        } catch (error) {
          console.error("Cut failed:", error);
        }
      },
      icon: "lucide-scissors"

    });
    this.addCommand({
      id: "fullscreen-focus",
      name: "Fullscreen focus mode",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "F11" }],
      callback: () => {
        return fullscreenMode(app)
      },
      icon: "fullscreen"
    });
    this.addCommand({
      id: "workplace-fullscreen-focus",
      name: "Workplace Fullscreen Focus",
      callback: () => {
        return workplacefullscreenMode(app)
      },
      hotkeys: [{ modifiers: ['Mod'], key: "F11" }],
      icon: "remix-SplitCellsHorizontal"
    });

    this.addCommand({
      id: 'header0-text',
      name: 'Remove header level',
      callback: () => setHeader(""),
      hotkeys: [{ modifiers: ["Mod"], key: "`" }],
      icon: "heading-glyph"
    });
    this.addCommand({
      id: 'header1-text',
      name: 'Header 1',
      callback: () => {setHeader("#");  app.commands.executeCommandById("editor:focus");},
      icon: "header-1"
    });
    this.addCommand({
      id: 'header2-text',
      name: 'Header 2',
      callback: () => {setHeader("##");  app.commands.executeCommandById("editor:focus");},
      icon: "header-2"
    });
    this.addCommand({
      id: 'header3-text',
      name: 'Header 3',
      callback: () => {setHeader("###");  app.commands.executeCommandById("editor:focus");},
      icon: "header-3"
    });
    this.addCommand({
      id: 'header4-text',
      name: 'Header 4',
      callback: () => {setHeader("####");  app.commands.executeCommandById("editor:focus");},
      icon: "header-4"
    });
    this.addCommand({
      id: 'header5-text',
      name: 'Header 5',
      callback: () => {setHeader("#####");  app.commands.executeCommandById("editor:focus");},
      icon: "header-5"
    });
    this.addCommand({
      id: 'header6-text',
      name: 'Header 6',
      callback: () => setHeader("######"),
      icon: "header-6"
    });


    const applyCommand = (command: commandPlot, editor: Editor) => {
      const selectedText = editor.getSelection();
      const curserStart = editor.getCursor("from");
      const curserEnd = editor.getCursor("to");
      let prefix = command.prefix;
      if (command.islinehead && curserStart.ch > 0) // cursor position is not line head
        prefix = '\n' + prefix
      const suffix = command.suffix || prefix;
      const setCursor = (mode: number) => {
        editor.setCursor(
          curserStart.line + command.line * mode,
          curserEnd.ch + command.char * mode
        );
      };
      const preStart = {
        line: curserStart.line - command.line,
        ch: curserStart.ch - prefix.length,
      };
      const pre = editor.getRange(preStart, curserStart);

      if (pre == prefix.trimStart()) {
        const sufEnd = {
          line: curserStart.line + command.line,
          ch: curserEnd.ch + suffix.length,
        };
        const suf = editor.getRange(curserEnd, sufEnd);
        if (suf == suffix.trimEnd()) {
          editor.replaceRange(selectedText, preStart, sufEnd); // codeblock leave blank lines
          return setCursor(-1);
        }
      }
      editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
      return setCursor(1);
    };

    type commandPlot = {
      char: number;
      line: number;
      prefix: string;
      suffix: string;
      islinehead: boolean;
    };

    type commandsPlot = {
      [key: string]: commandPlot;
    };

    const commandsMap: commandsPlot = {
      hrline: {
        char: 5,
        line: 1,
        prefix: "\n---",
        suffix: "\n",
        islinehead: true
      },
      justify: {
        char: 17,
        line: 0,
        prefix: "<p align=\"justify\">",
        suffix: "</p>",
        islinehead: false,
      },
      left: {
        char: 17,
        line: 0,
        prefix: "<p align=\"left\">",
        suffix: "</p>",
        islinehead: false,
      },
      right: {
        char: 17,
        line: 0,
        prefix: "<p align=\"right\">",
        suffix: "</p>",
        islinehead: false,
      },
      center: {
        char: 8,
        line: 0,
        prefix: "<center>",
        suffix: "</center>",
        islinehead: false,
      },
      underline: {
        char: 3,
        line: 0,
        prefix: "<u>",
        suffix: "</u>",
        islinehead: false,
      },
      superscript: {
        char: 5,
        line: 0,
        prefix: "<sup>",
        suffix: "</sup>",
        islinehead: false,
      },
      subscript: {
        char: 5,
        line: 0,
        prefix: "<sub>",
        suffix: "</sub>",
        islinehead: false,
      },
      codeblock: {
        char: 4,
        line: 0,
        prefix: "\n```\n",
        suffix: "\n```\n",
        islinehead: false,
      },
    };
    // Add new commands
    Object.keys(commandsMap).forEach((type) => {
      this.addCommand({
        id: `${type}`,
        name: `Toggle ${type}`,
        icon: `${type}-glyph`,
        callback: async () => {
            const editor =  app.workspace.activeLeaf.view?.editor;
            applyCommand(commandsMap[type], editor);
            await wait(10);
            //@ts-ignore
            app.commands.executeCommandById("editor:focus");

        },
      });
    });
    // Enhance editor commands
    this.modCommands.forEach((type) => {
      this.addCommand({
        id: `${type["id"]}`,
        name: `${type["name"]}`,
        icon: `${type["icon"]}`,
        callback: async () => {
          const editor =  app.workspace.activeLeaf.view?.editor;
          editor.getCursor("from");
          const curserEnd = editor.getCursor("to");
          let char;
          `${type["id"]}` == "editor:insert-embed"
            ? (char = 3)
            : `${type["id"]}` == "editor:insert-link"
              ? (char = 1)
              : `${type["id"]}` == "editor:insert-tag"
                ? (char = 1)
                : `${type["id"]}` == "editor:insert-wikilink"
                  ? (char = 2)
                  : `${type["id"]}` == "editor:toggle-bold"
                    ? (char = 2)
                    : `${type["id"]}` == "editor:toggle-italics"
                      ? (char = 1)
                      : `${type["id"]}` == "editor:toggle-strikethrough"
                        ? (char = 2)
                        : `${type["id"]}` == "editor:toggle-code"
                          ? (char = 1)
                          : `${type["id"]}` == "editor:toggle-blockquote"
                            ? (char = 2)
                            : `${type["id"]}` == "editor:toggle-bullet-list"
                              ? (char = 2)
                              : `${type["id"]}` == "editor:toggle-checklist-status"
                                ? (char = 4)
                                : `${type["id"]}` == "editor:toggle-comments"
                                  ? (char = 2)
                                  : `${type["id"]}` == "editor:toggle-highlight"
                                    ? (char = 2)
                                    : `${type["id"]}` == "editor:toggle-numbered-list"
                                      ? (char = 3)
                                      : (char = 2);
          //@ts-ignore
          app.commands.executeCommandById(`${type["id"]}`);
          if (type["id"] !== "editor:insert-link") editor.setCursor(curserEnd.line, curserEnd.ch + char);
          await wait(10);
          //@ts-ignore
          app.commands.executeCommandById("editor:focus");
        },
      });
    });
  }

  setupStatusBar() {
    addIcons();
    this.statusBarIcon = this.addStatusBarItem();
    this.statusBarIcon.addClass("editingToolbar-statusbar-button");
    setIcon(this.statusBarIcon, "editingToolbar");

    this.registerDomEvent(this.statusBarIcon, "click", () => {
      const statusBarRect =
        this.statusBarIcon.parentElement.getBoundingClientRect();
      const statusBarIconRect = this.statusBarIcon.getBoundingClientRect();

      const menu = new Menu().addItem((item) => {
        item.setTitle(t("Hide & Show"));
        requireApiVersion("0.15.0") ? item.setSection("settings") : true;
        const itemDom = (item as any).dom as HTMLElement;
        const toggleComponent = new ToggleComponent(itemDom)
          .setValue(this.settings.cMenuVisibility)
          .setDisabled(true);

        const toggle = async () => {
          this.settings.cMenuVisibility = !this.settings.cMenuVisibility;
          toggleComponent.setValue(this.settings.cMenuVisibility);
          this.settings.cMenuVisibility == true
            ? setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100)
            : setMenuVisibility(this.settings.cMenuVisibility);
          selfDestruct();
          await this.saveSettings();
        };

        item.onClick((e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          toggle();
        });
      });

      const menuDom = (menu as any).dom as HTMLElement;
      menuDom.addClass("editingToolbar-statusbar-menu");


      menu.addItem((item) => {

        item.setIcon("editingToolbarAdd");
        requireApiVersion("0.15.0") ? item.setSection("ButtonAdd") : true;
        item.onClick(() => {
          new CommandPicker(this).open();
        });
      });


      menu.addItem((item) => {

        item.setIcon("editingToolbarReload");
        requireApiVersion("0.15.0") ? item.setSection("ButtonAdd") : true;

        item.onClick(() => {
          setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100);
          console.log(`%ceditingToolbar refreshed`, "color: Violet");
        });
      });


      menu.addItem((item) => {

        item.setIcon("sliders")
        requireApiVersion("0.15.0") ? item.setSection("ButtonAdd") : true;
        item.onClick(() => {

          new openSlider(this.app, this).open();
        });
      });



      menu.showAtPosition({
        x: statusBarIconRect.right + 5,
        y: statusBarRect.top - 5,
      });
    });
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
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
