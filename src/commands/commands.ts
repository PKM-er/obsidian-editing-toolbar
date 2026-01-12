import {
  Editor,
  Command,
  Notice,
  MarkdownView,
  htmlToMarkdown,
} from "obsidian";

import { setMenuVisibility } from "src/util/statusBarConstants";
import {
  selfDestruct,
  setFormateraser,
  quiteFormatbrushes,
} from "src/modals/editingToolbarModal";
import {
  setHeader,
  setFontcolor,
  setBackgroundcolor,
  renumberSelection,
} from "src/util/util";
import { fullscreenMode, workplacefullscreenMode } from "src/util/fullscreen";
import editingToolbarPlugin from "src/plugin/main";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import { InsertLinkModal } from "src/modals/insertLinkModal";
import { CustomCommand } from "src/settings/settingsData";
import { t } from "src/translations/helper";
import { TextEnhancement } from "src/util/textEnhancement";
import {
  TextInputModal,
  IWrapInputResult,
  IExtractColumnResult,
  IExtractBetweenResult,
} from "src/modals/TextInputModal";

export class CommandsManager {
  private plugin: editingToolbarPlugin;

  constructor(plugin: editingToolbarPlugin) {
    this.plugin = plugin;
  }

  // 执行命令时保持编辑器焦点的辅助函数
  private executeCommandWithoutBlur = async (
    editor: Editor,
    callback: () => any
  ) => {
    if (editor) {
      await callback();

      editor.focus();

      // 取消选中
      // if (selection) {
      //     editor.setSelection(cursor);
      // }
    }
  };

  // 命令配置类型定义
  private _commandsMap: Record<string, CommandPlot> = {
    hrline: {
      char: 5,
      line: 1,
      prefix: "\n---",
      suffix: "\n",
      islinehead: true,
    },
    justify: {
      char: 0,
      line: 0,
      prefix: '<p align="justify">',
      suffix: "</p>",
      islinehead: false,
    },
    left: {
      char: 0,
      line: 0,
      prefix: '<p align="left">',
      suffix: "</p>",
      islinehead: false,
    },
    right: {
      char: 0,
      line: 0,
      prefix: '<p align="right">',
      suffix: "</p>",
      islinehead: false,
    },
    center: {
      char: 0,
      line: 0,
      prefix: "<center>",
      suffix: "</center>",
      islinehead: false,
    },
    underline: {
      char: 0,
      line: 0,
      prefix: "<u>",
      suffix: "</u>",
      islinehead: false,
    },
    superscript: {
      char: 0,
      line: 0,
      prefix: "<sup>",
      suffix: "</sup>",
      islinehead: false,
    },
    subscript: {
      char: 0,
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

  // 完整的内置编辑器命令列表
  private modCommands: Command[] = [
    {
      id: "editor:insert-embed",
      name: "Insert Embed",
      icon: "note-glyph",
    },
    {
      id: "editor:insert-link",
      name: "Insert Link",
      icon: "link-glyph",
    },
    {
      id: "editor:insert-tag",
      name: "Insert Tag",
      icon: "price-tag-glyph",
    },
    {
      id: "editor:insert-wikilink",
      name: "Insert Internal link",
      icon: "bracket-glyph",
    },
    {
      id: "editor:toggle-code",
      name: "Insert Code",
      icon: "code-glyph",
    },
    {
      id: "editor:toggle-blockquote",
      name: "Insert Blockquote",
      icon: "lucide-text-quote",
    },
    {
      id: "editor:toggle-checklist-status",
      name: "Cycle List and Checklist",
      icon: "checkbox-glyph",
    },
    {
      id: "editor:toggle-comments",
      name: "Insert Comment",
      icon: "percent-sign-glyph",
    },

    {
      id: "editor:insert-callout",
      name: "Insert Callout",
      icon: "lucide-quote",
    },
    {
      id: "editor:insert-mathblock",
      name: "Insert MathBlock",
      icon: "lucide-sigma-square",
    },
    {
      id: "editor:insert-table",
      name: "Insert Table",
      icon: "lucide-table",
    },
    {
      id: "editor:swap-line-up",
      name: "Swap Line Up",
      icon: "lucide-corner-right-up",
    },
    {
      id: "editor:swap-line-down",
      name: "Swap Line Down",
      icon: "lucide-corner-right-down",
    },
    {
      id: "editor:attach-file",
      name: "Attach File",
      icon: "lucide-paperclip",
    },
    {
      id: "editor:clear-formatting",
      name: "Clear Formatting",
      icon: "lucide-eraser",
    },
  ];

  // 应用格式化命令的辅助函数
  public applyCommand = (command: CommandPlot, editor: Editor) => {
    // 获取选中的文本
    const selectedText = editor.getSelection();
    const curserStart = editor.getCursor("from");
    const curserEnd = editor.getCursor("to");
    let prefix = command.prefix;

    if (command.islinehead && curserStart.ch > 0) {
      prefix = "\n" + prefix;
    }
    const suffix = command.suffix;

    const preStart = {
      line: curserStart.line - command.line,
      ch: curserStart.ch - prefix.length,
    };
    const pre = editor.getRange(preStart, curserStart);

    if (pre == prefix) {
      const sufEnd = {
        line: curserStart.line + command.line,
        ch: curserEnd.ch + suffix.length,
      };
      const suf = editor.getRange(curserEnd, sufEnd);
      if (suf == suffix) {
        editor.replaceRange(selectedText, preStart, sufEnd);
        editor.setCursor(curserStart.line - command.line, curserStart.ch);
        const newSelectionStart = {
          line: curserStart.line,
          ch: curserStart.ch - prefix.length,
        };
        const newSelectionEnd = {
          line: curserStart.line,
          ch: newSelectionStart.ch + selectedText.length,
        };
        editor.setSelection(newSelectionStart, newSelectionEnd);
        return;
      }
    }
    editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
    //  editor.setCursor(curserStart.line + command.line, curserStart.ch + command.char + selectedText.length);
    if (command.char > 0) {
      editor.setCursor(
        curserStart.line + command.line,
        curserStart.ch + command.char + selectedText.length
      );
    } else {
      // 记录原始选中范围的起始位置
      const originalSelectionStart = curserStart;

      // 计算新的选中范围
      const newSelectionStart = {
        line: originalSelectionStart.line,
        ch: originalSelectionStart.ch + prefix.length,
      };
      const newSelectionEnd = {
        line: originalSelectionStart.line,
        ch: newSelectionStart.ch + selectedText.length,
      };

      // 重新设置选中状态
      editor.setSelection(newSelectionStart, newSelectionEnd);
    }
  };

  // 应用正则表达式命令
  public async applyRegexCommand(editor: Editor, command: CustomCommand) {
    try {
      // 获取选中的文本
      let selectedText = editor.getSelection();
      let curserStart = editor.getCursor("from");
      let curserEnd = editor.getCursor("to");

      // 如果没有选中文本，根据设置决定行为
      if (!selectedText) {
        if (this.plugin.settings.useCurrentLineForRegex) {
          // 新行为：使用当前光标所在行的内容
          const currentLine = curserStart.line;
          const lineText = editor.getLine(currentLine);

          if (!lineText || lineText.trim() === "") {
            new Notice(
              t(
                "Current line is empty, please select text or move to a non-empty line"
              )
            );
            return;
          }

          // 使用当前行的内容
          selectedText = lineText;

          // 更新光标位置为整行
          curserStart = { line: currentLine, ch: 0 };
          curserEnd = { line: currentLine, ch: lineText.length };

          // 选中当前行
          editor.setSelection(curserStart, curserEnd);
        } else {
          // 旧行为：尝试从剪贴板读取
          try {
            const clipboardItems = await this.readClipboard();

            if (clipboardItems["text/html"]) {
              selectedText = htmlToMarkdown(clipboardItems["text/html"]);
            } else {
              selectedText =
                clipboardItems["text/markdown"] || clipboardItems["text/plain"];
            }

            if (!selectedText) {
              new Notice(
                t("Please select text or copy text to clipboard first")
              );
              return;
            }

            // 将剪贴板文本插入到当前光标位置
            editor.replaceRange(selectedText, curserStart, curserStart);
            // 更新光标位置
            const newEnd = editor.offsetToPos(
              editor.posToOffset(curserStart) + selectedText.length
            );
            editor.setSelection(curserStart, newEnd);
          } catch (error) {
            console.error("读取剪贴板失败:", error);
            new Notice(t("Please select text first"));
            return;
          }
        }
      }

      // 检查条件匹配
      if (command.useCondition && command.conditionPattern) {
        const conditionRegex = new RegExp(command.conditionPattern);
        if (!conditionRegex.test(selectedText)) {
          // 如果不满足条件，则不执行操作
          new Notice(
            t("The selected text does not meet the condition requirements")
          );
          return;
        }
      }

      // 构建正则表达式标志
      let flags = "";
      if (command.regexGlobal !== false) flags += "g";
      if (command.regexCaseInsensitive) flags += "i";
      if (command.regexMultiline) flags += "m";

      // 创建正则表达式
      const regex = new RegExp(command.regexPattern, flags);

      // 获取更新后的光标位置
      const updatedCurserStart = editor.getCursor("from");
      const updatedCurserEnd = editor.getCursor("to");

      editor.transaction({
        changes: [
          {
            from: updatedCurserStart,
            to: updatedCurserEnd,
            text: selectedText.replace(regex, command.regexReplacement),
          },
        ],
      });

      const replacedText = editor.getSelection();
      const newStart = editor.offsetToPos(
        editor.posToOffset(updatedCurserStart)
      );
      const newEnd = editor.offsetToPos(
        editor.posToOffset(updatedCurserStart) + replacedText.length
      );
      editor.setSelection(newStart, newEnd);
    } catch (error) {
      console.error("正则表达式命令执行错误:", error);
      new Notice(t("Regex command execution error: ") + error.message);
    }
  }

  // 添加读取剪贴板的方法
  private async readClipboard(): Promise<Record<string, string>> {
    const items: Record<string, string> = {};

    try {
      // 尝试读取剪贴板项目
      const clipboardItems = await navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        // 获取所有可用的类型
        const types = clipboardItem.types;

        for (const type of types) {
          if (
            type === "text/html" ||
            type === "text/plain" ||
            type === "text/markdown"
          ) {
            const blob = await clipboardItem.getType(type);
            items[type] = await blob.text();
          }
        }
      }
    } catch (e) {
      // 如果无法访问剪贴板 API，回退到基本文本读取
      try {
        const text = await navigator.clipboard.readText();
        items["text/plain"] = text;
      } catch (e) {
        console.error("读取剪贴板失败:", e);
      }
    }

    return items;
  }

  public getActiveEditor(): any {
    // 首先尝试获取常规的 Markdown 视图
    // const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    // if (markdownView) {
    //     return markdownView.editor;
    // }

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
  }

  public registerCommands() {
    this.plugin.addCommand({
      id: "renumber-ordered-list",
      name: "Renumber Ordered List",
      editorCallback: (editor: Editor) => {
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            renumberSelection(editor)
          );
      },
    });
    // 隐藏/显示菜单命令
    this.plugin.addCommand({
      id: "hide-show-menu",
      name: "Hide/Show ",
      icon: "editingToolbar",
      callback: async () => {
        this.plugin.settings.cMenuVisibility =
          !this.plugin.settings.cMenuVisibility;
        if (this.plugin.settings.cMenuVisibility) {
          setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100);
        } else {
          setMenuVisibility(this.plugin.settings.cMenuVisibility);
        }
        selfDestruct(this.plugin);
        await this.plugin.saveSettings();
      },
    });

    // Top 工具栏开关命令
    this.plugin.addCommand({
      id: "toggle-top-toolbar",
      name: "Toggle Top Toolbar",
      callback: async () => {
        const s = this.plugin.settings;
        const prevStyle = this.plugin.positionStyle;
        s.enableTopToolbar = !s.enableTopToolbar;
        let nextStyle: string | null = null;
        if (s.enableTopToolbar) {
          nextStyle = "top";
        } else if (prevStyle === "top") {
          if (s.enableFollowingToolbar) nextStyle = "following";
          else if (s.enableFixedToolbar) nextStyle = "fixed";
          else nextStyle = null;
        }
        if (nextStyle && nextStyle !== prevStyle) {
          this.plugin.onPositionStyleChange(nextStyle);
        }
        await this.plugin.saveSettings();
        this.plugin.handleeditingToolbar();
      },
    });

    // Following 工具栏开关命令
    this.plugin.addCommand({
      id: "toggle-following-toolbar",
      name: "Toggle Following Toolbar",
      callback: async () => {
        const s = this.plugin.settings;
        const prevStyle = this.plugin.positionStyle;
        s.enableFollowingToolbar = !s.enableFollowingToolbar;
        let nextStyle: string | null = null;
        if (s.enableFollowingToolbar) {
          nextStyle = "following";
        } else if (prevStyle === "following") {
          if (s.enableTopToolbar) nextStyle = "top";
          else if (s.enableFixedToolbar) nextStyle = "fixed";
          else nextStyle = null;
        }
        if (nextStyle && nextStyle !== prevStyle) {
          this.plugin.onPositionStyleChange(nextStyle);
        }
        await this.plugin.saveSettings();
        this.plugin.handleeditingToolbar();
      },
    });

    // Fixed 工具栏开关命令
    this.plugin.addCommand({
      id: "toggle-fixed-toolbar",
      name: "Toggle Fixed Toolbar",
      callback: async () => {
        const s = this.plugin.settings;
        const prevStyle = this.plugin.positionStyle;
        s.enableFixedToolbar = !s.enableFixedToolbar;
        let nextStyle: string | null = null;
        if (s.enableFixedToolbar) {
          nextStyle = "fixed";
        } else if (prevStyle === "fixed") {
          if (s.enableTopToolbar) nextStyle = "top";
          else if (s.enableFollowingToolbar) nextStyle = "following";
          else nextStyle = null;
        }
        if (nextStyle && nextStyle !== prevStyle) {
          this.plugin.onPositionStyleChange(nextStyle);
        }
        await this.plugin.saveSettings();
        this.plugin.handleeditingToolbar();
      },
    });

    // 文本增强功能命令
    this.plugin.addCommand({
      id: "get-plain-text",
      name: "Get Plain Text",
      editorCallback: (editor: Editor) => {
        TextEnhancement.getPlainText(editor);
      },
    });

    this.plugin.addCommand({
      id: "insert-blank-lines",
      name: "Insert Blank Lines",
      editorCallback: (editor: Editor) => {
        TextEnhancement.insertBlankLines(editor);
      },
    });

    this.plugin.addCommand({
      id: "remove-blank-lines",
      name: "Remove Blank Lines",
      editorCallback: (editor) =>
        TextEnhancement.processWhitespace(editor, { removeEmptyLines: true }),
    });

    this.plugin.addCommand({
      id: "split-lines",
      name: "Split Lines",
      editorCallback: (editor: Editor) => {
        TextEnhancement.splitLines(editor);
      },
    });

   

    this.plugin.addCommand({
      id: "smart-symbols",
      name: "Full Half Converter",
      editorCallback: (editor: Editor) => {
        TextEnhancement.smartTypography(editor);
      },
    });

    this.plugin.addCommand({
      id: "dedupe-lines",
      name: "Dedupe Lines",
      editorCallback: (editor) =>
        TextEnhancement.dedupe(editor, { trimBeforeCompare: true }),
    });

    this.plugin.addCommand({
      id: "add-wrap",
      name: "Add Prefix/Suffix",
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          t("Add Prefix/Suffix"),
          [
            {
              key: "prefix",
              label: t("Prefix"),
              placeholder: t("Enter prefix"),
              defaultValue: "",
            },
            {
              key: "suffix",
              label: t("Suffix"),
              placeholder: t("Enter suffix"),
              defaultValue: "",
            },
          ],
          (result) => {
            const typedResult = result as unknown as IWrapInputResult;
            TextEnhancement.addWrap(
              editor,
              typedResult.prefix,
              typedResult.suffix,
              true
            );
          }
        ).open();
      },
    });

    this.plugin.addCommand({
      id: "number-lines",
      name: "Number Lines (Custom)",
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          t("Number Lines Configuration"),
          [
            {
              key: "start",
              label: t("Start Number"),
              placeholder: "1",
              defaultValue: "1",
            },
            {
              key: "step",
              label: t("Step"),
              placeholder: "1",
              defaultValue: "1",
            },
            {
              key: "sep",
              label: t("Separator"),
              placeholder: ". ",
              defaultValue: ". ",
            },
          ],
          (result) => {
            // 将输入转换为对应的类型
            const start = parseInt(result.start) || 1;
            const step = parseInt(result.step) || 1;
            const sep = result.sep || ". ";

            // 调用你改进后的 numberList
            TextEnhancement.numberList(editor, start, step, sep, "");
          }
        ).open();
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-trim",
      name: "Trim Line Ends",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { trim: true });
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-compress",
      name: "Shrink Extra Spaces",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { compress: true });
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-all",
      name: "Remove All Whitespace",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { all: true });
      },
    });
    this.plugin.addCommand({
      id: "list-to-table",
      name: t("List to Table"),
      editorCallback: (editor: Editor) => {
     TextEnhancement.convertListToTableMultiDim(editor);
      },
    });

    // 表格 -> 列表
    this.plugin.addCommand({
      id: "table-to-list",
      name: t("Table to List"),
      editorCallback: (editor: Editor) =>
        TextEnhancement.convertTableToList(editor),
    });
    this.plugin.addCommand({
      id: "extract-between",
      name: "Extract Between Strings",
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          t("Extract Between Strings"),
          [
            {
              key: "start",
              label: t("Start String"),
              placeholder: t("Enter start string"),
              defaultValue: "[",
            },
            {
              key: "end",
              label: t("End String"),
              placeholder: t("Enter end string"),
              defaultValue: "]",
            },
          ],
          (result) => {
            const typedResult = result as unknown as IExtractBetweenResult;
            TextEnhancement.extractBetween(
              editor,
              typedResult.start,
              typedResult.end
            );
          }
        ).open();
      },
    });

    this.plugin.addCommand({
      id: "merge-lines",
      name: t("Merge Lines"),
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          t("Merge Lines Settings"),
          [
            {
              key: "sep",
              label: t("Separator (leave empty for smart spacing)"),
              placeholder: t("e.g., comma, pipe, arrow"),
              defaultValue: "",
            },
          ],
          (result) => {
            // 如果用户输入了分隔符，则强制使用；如果留空，则进入智能模式
            TextEnhancement.mergeLines(editor, {
              separator: result.sep,
              preserveParagraphs: result.sep === "", // 只有智能模式下才尝试保留段落
              trimLines: true,
            });
          }
        ).open();
      },
    });

    // 格式擦相关命令
    this.plugin.addCommand({
      id: "format-eraser",
      name: "Format Eraser",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            setFormateraser(this.plugin, editor)
          );
      },
      icon: `eraser`,
    });

    // 添加字体颜色相关命令
    this.plugin.addCommand({
      id: "change-font-color",
      name: "Change Font Color",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            setFontcolor(
              this.plugin.settings.cMenuFontColor ?? "#2DC26B",
              editor
            )
          );
      },
      icon: `<svg width="24" height="24" focusable="false" fill="currentColor"><g fill-rule="evenodd"><path id="change-font-color-icon" d="M3 18h18v3H3z" style="fill:#2DC26B"></path><path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z"></path></g></svg>`,
    });

    this.plugin.addCommand({
      id: "change-background-color",
      name: "Change Background Color",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            setBackgroundcolor(
              this.plugin.settings.cMenuBackgroundColor ?? "#FA541C",
              editor
            )
          );
      },
      icon: `<svg width="18" height="24" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg"><g   stroke="none" stroke-width="1" fill="currentColor" fill-rule="evenodd"><g  ><g fill="currentColor"><g transform="translate(119.502295, 137.878331) rotate(-135.000000) translate(-119.502295, -137.878331) translate(48.002295, 31.757731)" ><path d="M100.946943,60.8084699 L43.7469427,60.8084699 C37.2852111,60.8084699 32.0469427,66.0467383 32.0469427,72.5084699 L32.0469427,118.70847 C32.0469427,125.170201 37.2852111,130.40847 43.7469427,130.40847 L100.946943,130.40847 C107.408674,130.40847 112.646943,125.170201 112.646943,118.70847 L112.646943,72.5084699 C112.646943,66.0467383 107.408674,60.8084699 100.946943,60.8084699 Z M93.646,79.808 L93.646,111.408 L51.046,111.408 L51.046,79.808 L93.646,79.808 Z" fill-rule="nonzero"></path><path d="M87.9366521,16.90916 L87.9194966,68.2000001 C87.9183543,69.4147389 86.9334998,70.399264 85.7187607,70.4 L56.9423078,70.4 C55.7272813,70.4 54.7423078,69.4150264 54.7423078,68.2 L54.7423078,39.4621057 C54.7423078,37.2523513 55.5736632,35.1234748 57.0711706,33.4985176 L76.4832996,12.4342613 C78.9534987,9.75382857 83.1289108,9.5834005 85.8093436,12.0535996 C87.1658473,13.303709 87.9372691,15.0644715 87.9366521,16.90916 Z" fill-rule="evenodd"></path><path d="M131.3,111.241199 L11.7,111.241199 C5.23826843,111.241199 0,116.479467 0,122.941199 L0,200.541199 C0,207.002931 5.23826843,212.241199 11.7,212.241199 L131.3,212.241199 C137.761732,212.241199 143,207.002931 143,200.541199 L143,122.941199 C143,116.479467 137.761732,111.241199 131.3,111.241199 Z M124,130.241 L124,193.241 L19,193.241 L19,130.241 L124,130.241 Z" fill-rule="nonzero"></path></g></g><path d="M51,218 L205,218 C211.075132,218 216,222.924868 216,229 C216,235.075132 211.075132,240 205,240 L51,240 C44.9248678,240 40,235.075132 40,229 C40,222.924868 44.9248678,218 51,218 Z" id="change-background-color-icon" style="fill:#FA541C"></path></g></g></svg>`,
    });
    this.plugin.addCommand({
      id: "indent-list",
      name: "Indent List",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () => editor?.indentList());
      },
      icon: "indent-glyph",
    });
    this.plugin.addCommand({
      id: "undent-list",
      name: "Unindent List",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () => editor?.unindentList());
      },
      icon: "unindent-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-numbered-list",
      name: "Numbered List",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleNumberList()
          );
      },
      icon: "number-list-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-bullet-list",
      name: "Unordered List",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleBulletList()
          );
      },
      icon: "bullet-list-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-highlight",
      name: "Highlight",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleMarkdownFormatting("highlight")
          );
      },
      icon: "highlight-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-bold",
      name: "Toggle Bold",
      callback: () => {
        const editor = this.getActiveEditor();
        if (editor) {
          this.executeCommandWithoutBlur(editor, () => {
            // 执行编辑器操作
            editor.toggleMarkdownFormatting("bold");
          });
        }
      },
      icon: "bold-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-italics",
      name: "Toggle Italics",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleMarkdownFormatting("italic")
          );
      },
      icon: "italic-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-strikethrough",
      name: "Toggle Strikethrough",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleMarkdownFormatting("strikethrough")
          );
      },
      icon: "strikethrough-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-inline-math",
      name: "Toggle Inline Math",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleMarkdownFormatting("math")
          );
      },
      icon: "lucide-sigma",
    });
    this.plugin.addCommand({
      id: "editor:cycle-list-checklist",
      name: "Cycle List and Checklist",
      icon: "lucide-check-square",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, () =>
            editor?.toggleCheckList(true)
          );
      },
    });
    this.plugin.addCommand({
      id: "editor-undo",
      name: "Undo Edit",
      callback: () => {
        const editor = this.getActiveEditor();
        editor && this.executeCommandWithoutBlur(editor, () => editor?.undo());
      },
      icon: "undo-glyph",
    });
    this.plugin.addCommand({
      id: "editor-redo",
      name: "Redo Edit",
      callback: () => {
        const editor = this.getActiveEditor();
        editor && this.executeCommandWithoutBlur(editor, () => editor?.redo());
      },
      icon: "redo-glyph",
    });
    this.plugin.addCommand({
      id: "editor-copy",
      name: "Copy",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, async () => {
            try {
              await window.navigator.clipboard.writeText(editor.getSelection());
              this.plugin.app.commands.executeCommandById("editor:focus");
            } catch (error) {
              console.error("Copy failed:", error);
            }
          });
      },
      icon: "lucide-copy",
    });
    this.plugin.addCommand({
      id: "editor-paste",
      name: "Paste",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, async () => {
            try {
              const text = await window.navigator.clipboard.readText();
              if (text) editor.replaceSelection(text);
              this.plugin.app.commands.executeCommandById("editor:focus");
            } catch (error) {
              console.error("Paste failed:", error);
            }
          });
      },
      icon: "lucide-clipboard-type",
    });
    this.plugin.addCommand({
      id: "editor-cut",
      name: "Cut",
      callback: () => {
        const editor = this.getActiveEditor();
        editor &&
          this.executeCommandWithoutBlur(editor, async () => {
            try {
              await window.navigator.clipboard.writeText(editor.getSelection());
              editor.replaceSelection("");
              this.plugin.app.commands.executeCommandById("editor:focus");
            } catch (error) {
              console.error("Cut failed:", error);
            }
          });
      },
      icon: "lucide-scissors",
    });

    this.plugin.addCommand({
      id: "insert-callout",
      name: "Insert Callout(Modal)",
      icon: "lucide-quote",
      callback: () => {
        const modal = new InsertCalloutModal(this.plugin);
        modal.open();
      },
    });
    this.plugin.addCommand({
      id: "insert-link",
      name: "Insert Link(Modal)",
      icon: "lucide-link",
      callback: () => {
        const modal = new InsertLinkModal(this.plugin);
        modal.open();
      },
    });
    this.plugin.addCommand({
      id: "fullscreen-focus",
      name: "Toggle Fullscreen Focus Mode",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "F11" }],
      callback: () => {
        return fullscreenMode(app);
      },
      icon: "fullscreen",
    });
    this.plugin.addCommand({
      id: "workplace-fullscreen-focus",
      name: "Toggle Workplace Fullscreen Focus",
      callback: () => {
        return workplacefullscreenMode(app);
      },
      hotkeys: [{ modifiers: ["Mod"], key: "F11" }],
      icon: "remix-SplitCellsHorizontal",
    });

    // 添加标题相关命令
    for (let i = 0; i <= 6; i++) {
      this.plugin.addCommand({
        id: `header${i}-text`,
        name: i === 0 ? "Remove header level" : `Header ${i}`,
        callback: () => {
          const editor = this.getActiveEditor();
          editor &&
            this.executeCommandWithoutBlur(editor, () =>
              setHeader("#".repeat(i), editor)
            );
        },
        icon: i === 0 ? "heading-glyph" : `header-${i}`,
      });
    }

    // 添加HTML格式化命令
    Object.keys(this._commandsMap).forEach((type) => {
      this.plugin.addCommand({
        id: `${type}`,
        name: `Toggle ${type}`,
        icon: `${type}-glyph`,
        callback: () => {
          const editor = this.getActiveEditor();
          editor &&
            this.executeCommandWithoutBlur(editor, () => {
              this.applyCommand(this._commandsMap[type], editor);
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
          editor &&
            this.executeCommandWithoutBlur(editor, async () => {
              const curserEnd = editor.getCursor("to");
              let char = this.getCharacterOffset(type["id"]);
              await this.plugin.app.commands.executeCommandById(
                `${type["id"]}`
              );
              if (char != 0)
                editor.setCursor(curserEnd.line, curserEnd.ch + char);
            });
        },
      });
    });

    // 添加格式刷命令
    this.plugin.addCommand({
      id: "toggle-format-brush",
      name: "Toggle Format Brush",
      icon: "paintbrush",
      editorCallback: (editor: Editor) => {
        this.plugin.toggleFormatBrush();
      },
    });

    // 注册自定义命令
    this.registerCustomCommands();

    // 修改格式刷相关代码，确保包含自定义命令
    const formatCommands = [
      "toggle-bold",
      "toggle-italics",
      "toggle-strikethrough",
      "toggle-highlight",
      "toggle-code",
      "toggle-blockquote",
      "header0-text",
      "header1-text",
      "header2-text",
      "header3-text",
      "header4-text",
      "header5-text",
      "header6-text",
      "toggle-numbered-list",
      "toggle-bullet-list",
      "format-eraser",
      "indent-list",
      "undent-list",
      "change-font-color",
      "change-background-color",
      // 添加所有自定义命令
      ...this.plugin.settings.customCommands.map((cmd) => `${cmd.id}`),
      ...Object.keys(this._commandsMap),
    ];

    formatCommands.forEach((cmdId) => {
      const originalCommand =
        this.plugin.app.commands.commands[`editing-toolbar:${cmdId}`];
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
      case "editor:insert-tag":
        return 1;

      case "editor:insert-callout":
        return 11;
      default:
        return 0;
    }
  }

  // 添加重新加载自定义命令的方法
  public reloadCustomCommands() {
    // 移除旧的自定义命令
    this.plugin.settings.customCommands.forEach((command) => {
      const commandId = `${command.id}`;
      if (this.plugin.app.commands.commands[`editing-toolbar:${commandId}`]) {
        // 从命令注册表中移除命令
        delete this.plugin.app.commands.commands[
          `editing-toolbar:${commandId}`
        ];
      }
    });

    // 注册新的自定义命令
    this.registerCustomCommands();
  }

  // 注册自定义命令
  private registerCustomCommands() {
    // 遍历自定义命令并注册
    this.plugin.settings.customCommands.forEach((command) => {
      const commandId = `${command.id}`;

      this.plugin.addCommand({
        id: commandId,
        name: command.name,
        icon: command.icon,
        editorCallback: (editor) => {
          // 检查是否使用正则表达式替换
          if (command.useRegex && command.regexPattern) {
            editor &&
              this.executeCommandWithoutBlur(editor, () => {
                // 应用命令
                this.applyRegexCommand(editor, command);
                this.plugin.setLastExecutedCommand(
                  `editing-toolbar:${commandId}`
                );
              });
          } else {
            // 创建命令配置对象
            const commandConfig: CommandPlot = {
              prefix: command.prefix,
              suffix: command.suffix,
              char: command.char,
              line: command.line,
              islinehead: command.islinehead,
            };
            this._commandsMap[command.id] = commandConfig;

            editor &&
              this.executeCommandWithoutBlur(editor, () => {
                // 应用命令
                this.applyCommand(commandConfig, editor);
                this.plugin.setLastExecutedCommand(
                  `editing-toolbar:${commandId}`
                );
              });
          }
          // 记录为最后执行的命令，以支持格式刷
        },
      });
    });
  }

  // 添加 commandsMap 的访问器
  public get commandsMap(): Record<string, CommandPlot> {
    return this._commandsMap;
  }
}

type CommandPlot = {
  char: number;
  line: number;
  prefix: string;
  suffix: string;
  islinehead: boolean;
};
