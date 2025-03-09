import { Editor, Command, Notice, MarkdownView } from "obsidian";
import { editingToolbarSettings } from "src/settings/settingsData";
import { setMenuVisibility } from "src/util/statusBarConstants";
import { selfDestruct, setFormateraser, quiteFormatbrushes } from "src/modals/editingToolbarModal";
import { setHeader,setFontcolor, setBackgroundcolor } from "src/util/util";
import { fullscreenMode, workplacefullscreenMode } from "src/util/fullscreen";
import editingToolbarPlugin from "src/plugin/main";

export class CommandsManager {
    private plugin: editingToolbarPlugin;

    constructor(plugin: editingToolbarPlugin) {
        this.plugin = plugin;
    }

    // 执行命令时保持编辑器焦点的辅助函数
    private executeCommandWithoutBlur = async (editor: Editor, callback: () => any) => {

        if (editor) {
            const selection = editor.getSelection();
            const cursor = editor.getCursor();

            await callback();

            editor.focus();

            if (selection) {
                editor.setSelection(cursor);
            }
        }
    };

    // 命令配置类型定义
    private commandsMap: Record<string, CommandPlot> = {
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
            char: 15,
            line: 0,
            prefix: "<p align=\"left\">",
            suffix: "</p>",
            islinehead: false,
        },
        right: {
            char: 16,
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
        }
    };

    // 完整的内置编辑器命令列表
    private modCommands: Command[] = [
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
            id: "editor:insert-callout",
            name: "Insert Callout",
            icon: "lucide-quote",
        },
        {
            id: "editor:insert-mathblock",
            name: "MathBlock",
            icon: "lucide-sigma-square",
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

    // 应用格式化命令的辅助函数
    private applyCommand = (command: CommandPlot, editor: Editor) => {
        const selectedText = editor.getSelection();
        const curserStart = editor.getCursor("from");
        const curserEnd = editor.getCursor("to");
        let prefix = command.prefix;

        if (command.islinehead && curserStart.ch > 0) {
            prefix = '\n' + prefix;
        }

        const suffix = command.suffix || prefix;

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
                editor.replaceRange(selectedText, preStart, sufEnd);
                editor.setCursor(curserStart.line - command.line, curserStart.ch - command.char);
                return;
            }
        }
        editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
        editor.setCursor(curserStart.line + command.line, curserStart.ch + command.char);
    };

  
    public getActiveEditor(): any {
        // 首先尝试获取常规的 Markdown 视图
        const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          return markdownView.editor;
        }
        
       // @ts-ignore
        const activeEditor = this.plugin.app.workspace?.activeEditor;
        if (activeEditor && activeEditor.editor) {
          return activeEditor.editor;
        }
        
        // 最后尝试从活跃叶子获取编辑器
        const activeLeafEditor = this.plugin.app.workspace.activeLeaf?.view?.editor;
        if (activeLeafEditor) {
          return activeLeafEditor;
        }
        
        return null;
      };

    public registerCommands() {
    
        // 隐藏/显示菜单命令
        this.plugin.addCommand({
            id: "hide-show-menu",
            name: "Hide/show ",
            icon: "editingToolbar",
            callback: async () => {
                this.plugin.settings.cMenuVisibility = !this.plugin.settings.cMenuVisibility;
                if (this.plugin.settings.cMenuVisibility) {
                    setTimeout(() => {
                        dispatchEvent(new Event("editingToolbar-NewCommand"));
                    }, 100);
                } else {
                    setMenuVisibility(this.plugin.settings.cMenuVisibility);
                }
                selfDestruct();
                await this.plugin.saveSettings();
            },
        });

        // 格式刷相关命令
        this.plugin.addCommand({
            id: 'format-eraser',
            name: 'Format Eraser',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => setFormateraser(this.plugin,editor));

            },
            icon: `<svg>...</svg>`
        });

        // 添加格式刷相关命令
        this.plugin.addCommand({
            id: 'change-font-color',
            name: 'Change font color[html]',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => setFontcolor(this.plugin.settings.cMenuFontColor ?? "#2DC26B",editor));
            },
            icon: `<svg width="24" height="24" focusable="false" fill="currentColor"><g fill-rule="evenodd"><path id="change-font-color-icon" d="M3 18h18v3H3z" style="fill:#2DC26B"></path><path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z"></path></g></svg>`
        });

        this.plugin.addCommand({
            id: 'change-background-color',
            name: 'Change Backgroundcolor[html]',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => setBackgroundcolor(this.plugin.settings.cMenuBackgroundColor ?? "#FA541C",editor));
            },
            icon: `<svg width="18" height="24" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg"><g   stroke="none" stroke-width="1" fill="currentColor" fill-rule="evenodd"><g  ><g fill="currentColor"><g transform="translate(119.502295, 137.878331) rotate(-135.000000) translate(-119.502295, -137.878331) translate(48.002295, 31.757731)" ><path d="M100.946943,60.8084699 L43.7469427,60.8084699 C37.2852111,60.8084699 32.0469427,66.0467383 32.0469427,72.5084699 L32.0469427,118.70847 C32.0469427,125.170201 37.2852111,130.40847 43.7469427,130.40847 L100.946943,130.40847 C107.408674,130.40847 112.646943,125.170201 112.646943,118.70847 L112.646943,72.5084699 C112.646943,66.0467383 107.408674,60.8084699 100.946943,60.8084699 Z M93.646,79.808 L93.646,111.408 L51.046,111.408 L51.046,79.808 L93.646,79.808 Z" fill-rule="nonzero"></path><path d="M87.9366521,16.90916 L87.9194966,68.2000001 C87.9183543,69.4147389 86.9334998,70.399264 85.7187607,70.4 L56.9423078,70.4 C55.7272813,70.4 54.7423078,69.4150264 54.7423078,68.2 L54.7423078,39.4621057 C54.7423078,37.2523513 55.5736632,35.1234748 57.0711706,33.4985176 L76.4832996,12.4342613 C78.9534987,9.75382857 83.1289108,9.5834005 85.8093436,12.0535996 C87.1658473,13.303709 87.9372691,15.0644715 87.9366521,16.90916 Z" fill-rule="evenodd"></path><path d="M131.3,111.241199 L11.7,111.241199 C5.23826843,111.241199 0,116.479467 0,122.941199 L0,200.541199 C0,207.002931 5.23826843,212.241199 11.7,212.241199 L131.3,212.241199 C137.761732,212.241199 143,207.002931 143,200.541199 L143,122.941199 C143,116.479467 137.761732,111.241199 131.3,111.241199 Z M124,130.241 L124,193.241 L19,193.241 L19,130.241 L124,130.241 Z" fill-rule="nonzero"></path></g></g><path d="M51,218 L205,218 C211.075132,218 216,222.924868 216,229 C216,235.075132 211.075132,240 205,240 L51,240 C44.9248678,240 40,235.075132 40,229 C40,222.924868 44.9248678,218 51,218 Z" id="change-background-color-icon" style="fill:#FA541C"></path></g></g></svg>`

        });
        this.plugin.addCommand({
            id: 'indent-list',
            name: 'Indent list',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.indentList());
            },
            icon: "indent-glyph"

        });
        this.plugin.addCommand({
            id: 'undent-list',
            name: 'Unindent list',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.unindentList());
            },
            icon: "unindent-glyph"

        });
        this.plugin.addCommand({
            id: 'toggle-numbered-list',
            name: 'Numbered list',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.toggleNumberList());
            },
            icon: "number-list-glyph"

        });
        this.plugin.addCommand({
            id: 'toggle-bullet-list',
            name: 'bullet list',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.toggleBulletList());
            },
            icon: "bullet-list-glyph"

        });
        this.plugin.addCommand({
            id: 'toggle-highlight',
            name: 'highlight',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.toggleMarkdownFormatting("highlight"));
            },
            icon: "highlight-glyph"

        });
        this.plugin.addCommand({
            id: 'toggle-bold',
            name: 'Bold',
            callback: () => {
              const editor = this.getActiveEditor();
              if (editor) {
                this.executeCommandWithoutBlur(editor, () => {
                  // 执行编辑器操作
                  editor.toggleMarkdownFormatting("bold");
                });
              } 
            },
            icon: "bold-glyph"
          });
        this.plugin.addCommand({
            id: 'toggle-italics',
            name: 'Italics',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.toggleMarkdownFormatting("italic"));
            },
            icon: "italic-glyph"

        });
        this.plugin.addCommand({
            id: 'toggle-strikethrough',
            name: 'Strikethrough',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.toggleMarkdownFormatting("strikethrough"));
            },
            icon: "strikethrough-glyph"

        });
        this.plugin.addCommand({
            id: 'toggle-inline-math',
            name: 'Inline math',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.toggleMarkdownFormatting("math"));
            },
            icon: "lucide-sigma"

        });
        this.plugin.addCommand({
            id: 'editor-undo',
            name: 'Undo editor',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.undo());
            },
            icon: "undo-glyph"

        });
        this.plugin.addCommand({
            id: 'editor-redo',
            name: 'Redo editor',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, () => editor?.redo());
            },
            icon: "redo-glyph"

        });
        this.plugin.addCommand({
            id: 'editor-copy',
            name: 'Copy editor',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, async () => {
                    try {
                        await window.navigator.clipboard.writeText(editor.getSelection());
                        this.plugin.app.commands.executeCommandById("editor:focus");
                    } catch (error) {
                        console.error("Copy failed:", error);
                    }
                });
            },
            icon: "lucide-copy"

        });
        this.plugin.addCommand({
            id: 'editor-paste',
            name: 'Paste editor',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, async () => {
                    try {
                        const text = await window.navigator.clipboard.readText();
                        if (text) editor.replaceSelection(text);
                        this.plugin.app.commands.executeCommandById("editor:focus");
                    } catch (error) {
                        console.error("Paste failed:", error);
                    }
                });
            },
            icon: "lucide-clipboard-type"

        });
        this.plugin.addCommand({
            id: 'editor-cut',
            name: 'Cut editor',
            callback: () => {
                const editor = this.getActiveEditor();
                editor&&this.executeCommandWithoutBlur(editor, async () => {
                    try {
                        await window.navigator.clipboard.writeText(editor.getSelection());
                        editor.replaceSelection("");
                        this.plugin.app.commands.executeCommandById("editor:focus");
                    } catch (error) {
                        console.error("Cut failed:", error);
                    }
                });
            },
            icon: "lucide-scissors"

        });
        this.plugin.addCommand({
            id: "fullscreen-focus",
            name: "Fullscreen focus mode",
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "F11" }],
            callback: () => {
                return fullscreenMode(app)
            },
            icon: "fullscreen"
        });
        this.plugin.addCommand({
            id: "workplace-fullscreen-focus",
            name: "Workplace Fullscreen Focus",
            callback: () => {
                return workplacefullscreenMode(app)
            },
            hotkeys: [{ modifiers: ['Mod'], key: "F11" }],
            icon: "remix-SplitCellsHorizontal"
        });

        // 添加标题相关命令
        for (let i = 0; i <= 6; i++) {
            this.plugin.addCommand({
                id: `header${i}-text`,
                name: i === 0 ? 'Remove header level' : `Header ${i}`,
                callback: () => {
                    const editor = this.getActiveEditor();
                    editor&&this.executeCommandWithoutBlur(editor, () => setHeader("#".repeat(i), editor));
                },
                icon: i === 0 ? "heading-glyph" : `header-${i}`
            });
        }

        // 添加HTML格式化命令
        Object.keys(this.commandsMap).forEach((type) => {
            this.plugin.addCommand({
                id: `${type}`,
                name: `Toggle ${type}`,
                icon: `${type}-glyph`,
                callback: () => {
                    const editor = this.getActiveEditor();
                    editor&&this.executeCommandWithoutBlur(editor, () => {
                        this.applyCommand(this.commandsMap[type], editor);
                    });
                },
            });
        });

        // 增强编辑器命令
        this.modCommands.forEach((type) => {
            this.plugin.addCommand({
                id: `${type["id"]}`,
                name: `${type["name"]}`,
                icon: `${type["icon"]}`,
                callback: () => {
                    const editor = this.getActiveEditor();
                    editor&&this.executeCommandWithoutBlur(editor, async () => {
                        const curserEnd = editor.getCursor("to");
                        let char = this.getCharacterOffset(type["id"]);
                        await this.plugin.app.commands.executeCommandById(`${type["id"]}`);
                        if (char != 0) editor.setCursor(curserEnd.line, curserEnd.ch + char);
                    });
                }
            });
        });

        // 添加格式刷命令
        this.plugin.addCommand({
            id: 'toggle-format-brush',
            name: '切换格式刷',
            icon: 'paintbrush',
            editorCallback: (editor: Editor) => {
                this.plugin.toggleFormatBrush();
            }
        });

        // 修改所有需要支持格式刷的命令
        const formatCommands = [
            'toggle-bold', 'toggle-italics', 'toggle-strikethrough', 
            'toggle-highlight', 'toggle-code', 'toggle-blockquote',
            'header0-text', 'header1-text', 'header2-text', 'header3-text', 
            'header4-text', 'header5-text', 'header6-text',
            'underline', 'superscript', 'subscript', 'codeblock',
            'justify', 'left', 'right', 'center',
            'change-font-color', 'change-background-color'
            // 可以添加其他需要支持格式刷的命令
        ];

        formatCommands.forEach(cmdId => {
            const originalCommand = this.plugin.app.commands.commands[`editing-toolbar:${cmdId}`];
            if (originalCommand && originalCommand.callback) {
                const originalCallback = originalCommand.callback;
                originalCommand.callback = () => {
                    originalCallback();
                    this.plugin.setLastExecutedCommand(`editing-toolbar:${cmdId}`);
                };
            }
        });
    }

    private getCharacterOffset(commandId: string): number {
        switch (commandId) {
            case "editor:insert-embed": return 3;
            case "editor:insert-link": return 0;
            case "editor:insert-tag": return 1;
            case "editor:insert-wikilink": return 2;
            case "editor:toggle-code": return 0;
            case "editor:toggle-blockquote": return 2;
            case "editor:toggle-checklist-status": return 4;
            case "editor:toggle-comments": return 2;
            case "editor:insert-callout": return 11;
            default: return 2;
        }
    }
}

type CommandPlot = {
    char: number;
    line: number;
    prefix: string;
    suffix: string;
    islinehead: boolean;
}; 