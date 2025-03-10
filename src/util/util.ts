import { Editor } from "obsidian";
export async function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
// GenNonDuplicateID(3) 将生成类似 ix49wl2978w 的ID
export function GenNonDuplicateID(randomLength: number) {
  let idStr = Date.now().toString(36)
  idStr += Math.random().toString(36).substr(3, randomLength)
  return idStr
}
export function findmenuID(plugin: { settings: { menuCommands: any; }; }, command: { id: any; }, issub: any) {
  let index;
  let res = { "index": -1, "subindex": -1 };
  let menucmd = plugin.settings.menuCommands
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
  //from https://github.com/obsidian-canzi/Enhanced-editing
    let selectText = editor?.getSelection();
  //  console.log(selectText,'selectText')
    // if (selectText == null || selectText.trim() == "") {
    //   //如果没有选中内容激活格式刷
    //   quiteFormatbrushes(plugin);
    //   plugin.setEN_BG_Format_Brush(true);
    //   plugin.setTemp_Notice(new Notice(t("Background-color formatting brush ON!"), 0));
    //   return;
    // }
    if (!selectText || selectText.trim() === "") {
      return;
    }

    let _html0 =
      /\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>[^\<\>]+\<\/span\>/g;
    let _html1 =
      /^\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>([^\<\>]+)\<\/span\>$/;
    let _html2 = '<span style="background:' + color + '">$1</span>';
    let _html3 = /\<span style=[^\<]*$|^[^\>]*span\>/g; //是否只包含一侧的<>
    if (_html3.test(selectText)) {
      return;
    } else if (_html0.test(selectText)) {
      if (_html1.test(selectText)) {
        selectText = selectText.replace(_html1, _html2);
      } else {
        selectText = selectText.replace(
          /\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>|\<\/span\>/g,
          ""
        );

      }
    } else {
      selectText = selectText.replace(/^(.+)$/gm, _html2);
    }
    editor.replaceSelection(selectText);
    //editor.exec("goRight");
    
    // app.commands.executeCommandById("editor:focus");

}
