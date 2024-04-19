import { Editor } from "obsidian";
import EditingToolbarPlugin from "../../main";

export function setHeader(editor: Editor, _str: string) {
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