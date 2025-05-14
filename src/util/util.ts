import { Editor,Command,MarkdownView } from "obsidian";
import { syntaxTree } from '@codemirror/language';
export async function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
// GenNonDuplicateID(3) 将生成类似 ix49wl2978w 的ID
export function GenNonDuplicateID(randomLength: number) {
  let idStr = Date.now().toString(36)
  idStr += Math.random().toString(36).substr(3, randomLength)
  return idStr
}
export function findmenuID(plugin: { settings: { menuCommands: any; }; }, command: Command, issub: boolean,currentCommands:any[]) {
  let index;
  let res = { "index": -1, "subindex": -1 };
  let menucmd = currentCommands
  if (issub) {
    menucmd.forEach((item: { SubmenuCommands: any[]; }, idx: any) => {
      if ("SubmenuCommands" in item) {
        index = item.SubmenuCommands.findIndex((v) => v.id == command.id);
        if (index >= 0) {
          res = { "index": idx, "subindex": index };
          return res;
        }
      }
    });
  }
  else {
    index = menucmd.findIndex((v: { id: any; }) => v.id == command.id);
    res = { "index": index, "subindex": -1 };
  }
  return res;
}

export function colorpicker(plugin: { settings: { custom_fc1: any; custom_fc2: any; custom_fc3: any; custom_fc4: any; custom_fc5: any; }; }) {
  return `<div class='x-color-picker-wrapper'>
<div class='x-color-picker' >
  <table class="x-color-picker-table" id='x-color-picker-table'>
    <tbody>
      <tr>
        <th colspan="10" class="ui-widget-content">Theme Colors</th>
      </tr>
      <tr>
        <td style="background-color:#ffffff"><span></span></td>
        <td style="background-color:#000000"><span></span></td>
        <td style="background-color:#eeece1"><span></span></td>
        <td style="background-color:#1f497d"><span></span></td>
        <td style="background-color:#4f81bd"><span></span></td>
        <td style="background-color:#c0504d"><span></span></td>
        <td style="background-color:#9bbb59"><span></span></td>
        <td style="background-color:#8064a2"><span></span></td>
        <td style="background-color:#4bacc6"><span></span></td>
        <td style="background-color:#f79646"><span></span></td>
      </tr>
      <tr>
        <th colspan="10"></th>
      </tr>
      <tr class="top">
        <td style="background-color:#f2f2f2"><span></span></td>
        <td style="background-color:#7f7f7f"><span></span></td>
        <td style="background-color:#ddd9c3"><span></span></td>
        <td style="background-color:#c6d9f0"><span></span></td>
        <td style="background-color:#dbe5f1"><span></span></td>
        <td style="background-color:#f2dcdb"><span></span></td>
        <td style="background-color:#ebf1dd"><span></span></td>
        <td style="background-color:#e5e0ec"><span></span></td>
        <td style="background-color:#dbeef3"><span></span></td>
        <td style="background-color:#fdeada"><span></span></td>
      </tr>
      <tr class="in">
        <td style="background-color:#d8d8d8"><span></span></td>
        <td style="background-color:#595959"><span></span></td>
        <td style="background-color:#c4bd97"><span></span></td>
        <td style="background-color:#8db3e2"><span></span></td>
        <td style="background-color:#b8cce4"><span></span></td>
        <td style="background-color:#e5b9b7"><span></span></td>
        <td style="background-color:#d7e3bc"><span></span></td>
        <td style="background-color:#ccc1d9"><span></span></td>
        <td style="background-color:#b7dde8"><span></span></td>
        <td style="background-color:#fbd5b5"><span></span></td>
      </tr>
      <tr class="in">
        <td style="background-color:#bfbfbf"><span></span></td>
        <td style="background-color:#3f3f3f"><span></span></td>
        <td style="background-color:#938953"><span></span></td>
        <td style="background-color:#548dd4"><span></span></td>
        <td style="background-color:#95b3d7"><span></span></td>
        <td style="background-color:#d99694"><span></span></td>
        <td style="background-color:#c3d69b"><span></span></td>
        <td style="background-color:#b2a2c7"><span></span></td>
        <td style="background-color:#92cddc"><span></span></td>
        <td style="background-color:#fac08f"><span></span></td>
      </tr>
      <tr class="in">
        <td style="background-color:#a5a5a5"><span></span></td>
        <td style="background-color:#262626"><span></span></td>
        <td style="background-color:#494429"><span></span></td>
        <td style="background-color:#17365d"><span></span></td>
        <td style="background-color:#366092"><span></span></td>
        <td style="background-color:#953734"><span></span></td>
        <td style="background-color:#76923c"><span></span></td>
        <td style="background-color:#5f497a"><span></span></td>
        <td style="background-color:#31859b"><span></span></td>
        <td style="background-color:#e36c09"><span></span></td>
      </tr>
      <tr class="bottom">
        <td style="background-color:#7f7f7f"><span></span></td>
        <td style="background-color:#0c0c0c"><span></span></td>
        <td style="background-color:#1d1b10"><span></span></td>
        <td style="background-color:#0f243e"><span></span></td>
        <td style="background-color:#244061"><span></span></td>
        <td style="background-color:#632423"><span></span></td>
        <td style="background-color:#4f6128"><span></span></td>
        <td style="background-color:#3f3151"><span></span></td>
        <td style="background-color:#205867"><span></span></td>
        <td style="background-color:#974806"><span></span></td>
      </tr>
       <tr>
        <th colspan="10"></th>
      </tr>
      <tr>
        <th colspan="10" class="ui-widget-content">Standard Colors</th>
      </tr>
      <tr>
        <td style="background-color:#c00000"><span></span></td>
        <td style="background-color:#ff0000"><span></span></td>
        <td style="background-color:#ffc000"><span></span></td>
        <td style="background-color:#ffff00"><span></span></td>
        <td style="background-color:#92d050"><span></span></td>
        <td style="background-color:#00b050"><span></span></td>
        <td style="background-color:#00b0f0"><span></span></td>
        <td style="background-color:#0070c0"><span></span></td>
        <td style="background-color:#002060"><span></span></td>
        <td style="background-color:#7030a0"><span></span></td>
      </tr>
      <tr>
      <th colspan="10" class="ui-widget-content">Custom Font Colors</th>
    </tr>
    <tr>
      <td style="background-color:${plugin.settings.custom_fc1}"><span></span></td>
      <td style="background-color:${plugin.settings.custom_fc2}"><span></span></td>
      <td style="background-color:${plugin.settings.custom_fc3}"><span></span></td>
      <td style="background-color:${plugin.settings.custom_fc4}"><span></span></td>
      <td style="background-color:${plugin.settings.custom_fc5}"><span></span></td>
    </tr>
    </tbody>
  </table>
</div>
</div>`;
}

export function backcolorpicker(plugin: { settings: { custom_bg1: any; custom_bg2: any; custom_bg3: any; custom_bg4: any; custom_bg5: any; }; }) {
  return `<div class='x-color-picker-wrapper'>
<div class='x-color-picker' >
  <table class="x-color-picker-table" id='x-backgroundcolor-picker-table'>
    <tbody>
      <tr>
        <th colspan="5" class="ui-widget-content">Translucent Colors</th>
      </tr>
      <tr class="top">
        <td style="background-color:rgba(140, 140, 140, 0.12)"><span></span></td>
        <td style="background-color:rgba(92, 92, 92, 0.2)"><span></span></td>
        <td style="background-color:rgba(163, 67, 31, 0.2)"><span></span></td>
        <td style="background-color:rgba(240, 107, 5, 0.2)"><span></span></td>
        <td style="background-color:rgba(240, 200, 0, 0.2)"><span></span></td>
        </tr>
        <tr class="bottom">
        <td style="background-color:rgba(3, 135, 102, 0.2)"><span></span></td>
        <td style="background-color:rgba(3, 135, 102, 0.2)"><span></span></td>
        <td style="background-color:rgba(5, 117, 197, 0.2)"><span></span></td>
        <td style="background-color:rgba(74, 82, 199, 0.2)"><span></span></td>
        <td style="background-color:rgba(136, 49, 204, 0.2)"><span></span></td>
      </tr>

      <tr>
      <th colspan="5" class="ui-widget-content">Highlighter Colors</th>
    </tr>
    
    <tr class="top">
      <td style="background-color:rgb(255, 248, 143)"><span></span></td>
      <td style="background-color:rgb(211, 248, 182)"><span></span></td>
      <td style="background-color:rgb(175, 250, 209)"><span></span></td>
      <td style="background-color:rgb(177, 255, 255)"><span></span></td>
      <td style="background-color:rgb(253, 191, 255)"><span></span></td>
      </tr>
      <tr class="bottom">
      <td style="background-color:rgb(210, 203, 255);"><span></span></td>
      <td style="background-color:rgb(64, 169, 255);"><span></span></td>
      <td style="background-color:rgb(255, 77, 79);"><span></span></td>
      <td style="background-color:rgb(212, 177, 6);"><span></span></td>
      <td style="background-color:rgb(146, 84, 222);"><span></span></td>
    </tr>
    <tr>
    <th colspan="5" class="ui-widget-content">Custom Colors</th>
  </tr>
    <tr class="bottom">
    <td style="background-color: ${plugin.settings.custom_bg1};"><span></span></td>
    <td style="background-color:${plugin.settings.custom_bg2};"><span></span></td>
    <td style="background-color:${plugin.settings.custom_bg3};"><span></span></td>
    <td style="background-color:${plugin.settings.custom_bg4};"><span></span></td>
    <td style="background-color:${plugin.settings.custom_bg5};"><span></span></td>
  </tr>
    </tbody>
  </table>
</div>
</div>`;
}

export function setHeader(_str: string, editor?: Editor) {
  //from https://github.com/obsidian-canzi/Enhanced-editing

    let linetext = editor.getLine(editor.getCursor().line);
    let newstr, linend = "";
    const regex = /^(\>*(\[[!\w]+\])?\s*)#+\s/;
    let matchstr
    const match = linetext.match(regex);
    if (match) matchstr = match[0].trim();
    if (_str == matchstr)   //转换的跟原来的一致就取消标题
    {
      newstr = linetext.replace(regex, "$1");
    } else {
      if (_str == "") {   //若为标题，转为普通文本
        newstr = linetext.replace(regex, "$1");
      } else {  //列表、引用，先转为普通文本，再转为标题
        newstr = linetext.replace(/^\s*(#*|\>|\-|\d+\.)\s*/m, "");
        newstr = _str + " " + newstr;
      }
    }

    if (newstr != "") {
      linend = editor.getRange(editor.getCursor(), { line: editor.getCursor().line, ch: linetext.length });
    } else {
      linend = editor.getRange(editor.getCursor(), { line: editor.getCursor().line, ch: 0 });
    };
    editor.setLine(editor.getCursor().line, newstr);
    editor.setCursor({ line: editor.getCursor().line, ch: Number(newstr.length - linend.length) });

}


export function setFontcolor(color: string, editor?: Editor) {
  if (!editor) return;

  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    this.plugin.setLastExecutedCommand("editing-toolbar:change-font-color");
    return;
  }

  // Regex to match font color tags, with multiline support
  const fontColorRegex = /<font\s+color=["']?[^"'>]+["']?>(.*?)<\/font>/gms;
  const hasColorTag = fontColorRegex.test(selectText);
  // Function to check if the text is already wrapped in the same color
  const isAlreadyInSameColor = (text: string, targetColor: string): boolean => {
    const cleanColorRegex = new RegExp(`^<font\\s+color=["']?${targetColor}["']?>(.+)<\\/font>$`, 'ms');
    return cleanColorRegex.test(text.trim());
  };

  // If the text is already in the same color, do nothing
  if (isAlreadyInSameColor(selectText, color)) {
    return;
  }

  // Function to replace color while preserving text content and line breaks
  const replaceColor = (match: string, text: string) => {
    return text.split('\n').map(line => 
      line.trim() ? `<font color="${color}">${line}</font>` : line
    ).join('\n');
  };

  // Replace existing font color tags or wrap text in new color tag
  const newText = selectText.replace(fontColorRegex, replaceColor);

  // If no color tags existed, wrap each non-empty line in a new color tag
  const finalText = newText === selectText 
    ? selectText.split('\n').map(line => 
        line.trim() ? `<font color="${color}">${line}</font>` : line
      ).join('\n')
    : newText;

  // Store the current selection
  const currentSelection = editor.listSelections();
  const adjustedSelections = currentSelection.map(sel => {
    const tagLength = hasColorTag ? 0:`<font color="${color}"></font>`.length ;
    const isForward = sel.anchor.line < sel.head.line || 
                      (sel.anchor.line === sel.head.line && sel.anchor.ch < sel.head.ch);

    if (isForward) {
      // 从前到后选择
      return {
        anchor: {
          line: sel.anchor.line,
          ch: sel.anchor.ch
        },
        head: {
          line: sel.head.line,
          ch: sel.head.ch + tagLength
        }
      };
    } else {
      // 从后到前选择
      return {
        anchor: {
          line: sel.anchor.line,
          ch: sel.anchor.ch + tagLength
        },
        head: {
          line: sel.head.line,
          ch: sel.head.ch
        }
      };
    }
  });

  // Replace the selection
  editor.replaceSelection(finalText);

  // Restore the original selection
  editor.setSelections(adjustedSelections);
}

export function setBackgroundcolor(color: string, editor?: Editor) {
  if (!editor) return;

  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  // Regex to match background color tags, with multiline support
  const bgColorRegex = /<span\s+style=["']?background:(?:#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))["']?>([\s\S]*?)<\/span>/g;
  const hasColorTag = bgColorRegex.test(selectText);

  // Function to check if the text is already wrapped in the same background color
  const isAlreadyInSameColor = (text: string, targetColor: string): boolean => {
    // 转义正则表达式中的特殊字符，特别是对于rgba格式
    const escapedColor = targetColor.replace(/([()[{*+.$^\\|?])/g, '\\$1');
    const cleanColorRegex = new RegExp(`^<span\\s+style=["']?background:${escapedColor}["']?>([\s\S]+)<\\/span>$`);
    return cleanColorRegex.test(text.trim());
  };

  // If the text is already in the same color, do nothing
  if (isAlreadyInSameColor(selectText, color)) {
    return;
  }

  let finalText;
  
  if (hasColorTag) {
    // 如果已经有背景色标签，只替换颜色值
    finalText = selectText.replace(/(background:)(?:#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/gi, `$1${color}`);
  } else {
    // 如果没有背景色标签，为每行添加背景色
    finalText = selectText.split('\n').map(line => 
      line.trim() ? `<span style="background:${color}">${line}</span>` : line
    ).join('\n');
  }

  // Store the current selection
  const currentSelection = editor.listSelections();
  const adjustedSelections = currentSelection.map(sel => {
    const tagLength = hasColorTag ? 0 : `<span style="background:${color}"></span>`.length;
    const isForward = sel.anchor.line < sel.head.line || 
                      (sel.anchor.line === sel.head.line && sel.anchor.ch < sel.head.ch);

    if (isForward) {
      // 从前到后选择
      return {
        anchor: {
          line: sel.anchor.line,
          ch: sel.anchor.ch
        },
        head: {
          line: sel.head.line,
          ch: sel.head.ch + tagLength
        }
      };
    } else {
      // 从后到前选择
      return {
        anchor: {
          line: sel.anchor.line,
          ch: sel.anchor.ch + tagLength
        },
        head: {
          line: sel.head.line,
          ch: sel.head.ch
        }
      };
    }
  });

  // Replace the selection
  editor.replaceSelection(finalText);

  // Restore the original selection
  editor.setSelections(adjustedSelections);
}
// 重编号选中的行
export function renumberSelection(editor: Editor) {
  const selection = editor.getSelection();
  if (!selection) {
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    if (/^\s*\d+\.\s/.test(lineText)) {
      const currentIndent = editor.getLine(cursor.line).match(/^\s*/)?.[0].length || 0;
      const prevLineNum = cursor.line - 1;
      const prevLine = prevLineNum >= 0 ? editor.getLine(prevLineNum).trim() : '';
      const isListStart = prevLineNum < 0 || !/^\s*\d+\.\s/.test(prevLine) || (prevLine.match(/^\s*/)?.[0].length || 0) < currentIndent;

      if (isListStart) {
        // 光标在列表首行，处理整个连续列表
        const { startLine, endLine } = getFullListRange(editor, cursor.line);
        renumberLines(editor, startLine, endLine);
      } else {
        // 光标在列表中间行，处理从当前行开始的列表
        const { startLine, endLine } = getListRangeForCursor(editor, cursor.line);
        renumberLines(editor, startLine, endLine);
      }
    }
    return;
  }

  const { lines, startLine } = getSelectionLines(editor);
  processSelectionWithContext(lines, startLine, editor);
}

function getSelectionLines(editor: Editor): { lines: string[]; startLine: number } {
  const selection = editor.getSelection();
  const cursor = editor.getCursor('from');
  return { lines: selection.split('\n'), startLine: cursor.line };
}

function processSelectionWithContext(lines: string[], startLine: number, editor: Editor) {
  // 检查是否选中的行中有列表项
  let hasListItems = false;
  for (const line of lines) {
    if (/^\s*\d+\.\s/.test(line.trim())) {
      hasListItems = true;
      break;
    }
  }
  if (!hasListItems) {
    return;
  };

  // 获取 CodeMirror 视图和语法树
  const view = (app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView)?.editor.cm;
  if (!view) return;

  const state = view.state;
  const tree = syntaxTree(state);

  // 计算选中范围的字符位置
  const docStartPos = editor.posToOffset({ line: startLine, ch: 0 });
  let prevListEndPos = -1;

  // 遍历语法树，找到上一个有序列表的结束位置
  tree.iterate({
    from: 0,
    to: docStartPos,
    enter: (node) => {
      if (node.name === 'OrderedList') {
        prevListEndPos = node.to; // 记录最后一个有序列表的结束位置
      }
    },
  });

  // 在上一个列表后插入空行（如果需要）
  if (prevListEndPos >= 0) {
    const prevListEndLine = editor.offsetToPos(prevListEndPos).line;
    const nextLineAfterPrevList = prevListEndLine + 1;
    if (nextLineAfterPrevList < startLine && !/^\s*$/.test(editor.getLine(nextLineAfterPrevList).trim())) {
      editor.replaceRange(
        '\n',
        { line: nextLineAfterPrevList, ch: 0 },
        { line: nextLineAfterPrevList, ch: 0 }
      );
      startLine++; // 调整选中范围的起始行
    }
  }

  // 检查选中列表是否已经正确编号
  let isAlreadyNumberedCorrectly = true;
  let expectedNumbers: number[] = [];
  let prevIndentLevel = -1;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (/^\d+\.\s/.test(trimmedLine)) {
      const indentLevel = line.match(/^\s*/)?.[0].length || 0;
      const currentNumber = parseInt(trimmedLine.match(/^\d+/)![0], 10);

      if (indentLevel !== prevIndentLevel) {
        expectedNumbers[indentLevel] = 1;
      } else {
        expectedNumbers[indentLevel] = (expectedNumbers[indentLevel] || 1) + 1;
      }

      if (currentNumber !== expectedNumbers[indentLevel]) {
        isAlreadyNumberedCorrectly = false;
        break;
      }
      prevIndentLevel = indentLevel;
    }
  }

  // 处理选中部分
  let result: string[] = [];
  const prevLineNum = startLine - 1;
  const prevLine = prevLineNum >= 0 ? editor.getLine(prevLineNum).trim() : '';
  const needsSeparationBefore = prevLine && !/^\s*$/.test(prevLine) && !prevLine.includes('ㅤ');

  if (needsSeparationBefore) {
    result.push('');
    result.push('ㅤ');
  }

  if (isAlreadyNumberedCorrectly) {
    result.push(...lines);
  } else {
    let numberByIndent: { [level: number]: number } = {};
    let prevLevel = -1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const isListItem = /^\d+\.\s/.test(trimmedLine);
      const indentation = line.match(/^\s*/)?.[0] || '';

      if (isListItem) {
        const indentLevel = indentation.length;
        if (indentLevel !== prevLevel) {
          numberByIndent[indentLevel] = 1;
        } else {
          numberByIndent[indentLevel] = (numberByIndent[indentLevel] || 1) + 1;
        }
        result.push(`${indentation}${numberByIndent[indentLevel]}. ${trimmedLine.replace(/^\d+\.\s/, '')}`);
        prevLevel = indentLevel;
      } else {
        result.push(line);
        prevLevel = -1;
      }
    }
  }

  editor.replaceRange(
    result.join('\n'),
    { line: startLine, ch: 0 },
    { line: startLine + lines.length - 1, ch: editor.getLine(startLine + lines.length - 1).length }
  );
}

function getListRangeForCursor(editor: Editor, currentLine: number): { startLine: number; endLine: number } {
  let startLine = currentLine;
  let endLine = currentLine;

  const currentIndent = editor.getLine(currentLine).match(/^\s*/)?.[0].length || 0;

  // 向下查找同级列表或子列表
  while (endLine < editor.lineCount() - 1) {
    const nextLine = editor.getLine(endLine + 1);
    const nextIndent = nextLine.match(/^\s*/)?.[0].length || 0;
    if (!/^\s*\d+\.\s/.test(nextLine.trim()) || nextIndent < currentIndent) {
      break; // 遇到非列表行或上级列表，停止
    }
    endLine++;
  }

  return { startLine, endLine };
}

function getFullListRange(editor: Editor, currentLine: number): { startLine: number; endLine: number } {
  let startLine = currentLine;
  let endLine = currentLine;

  // 向上查找顶级列表起点
  while (startLine > 0) {
    const prevLine = editor.getLine(startLine - 1);
    if (!/^\s*\d+\.\s/.test(prevLine.trim())) {
      break; // 遇到非列表行，停止
    }
    startLine--;
  }

  // 向下查找顶级列表终点
  while (endLine < editor.lineCount() - 1) {
    const nextLine = editor.getLine(endLine + 1);
    if (!/^\s*\d+\.\s/.test(nextLine.trim())) {
      break; // 遇到非列表行，停止
    }
    endLine++;
  }

  return { startLine, endLine };
}

function renumberLines(editor: Editor, startLine: number, endLine: number) {
  const lines = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(editor.getLine(i));
  }
  processSelectionWithContext(lines, startLine, editor);
}

// 重编号选中的行结束