
import type cMenuToolbarPlugin from "src/plugin/main";
import { App, Notice, Command, requireApiVersion, MarkdownView, ButtonComponent, WorkspaceParent, WorkspaceWindow } from "obsidian";
import { WorkspaceExt, WorkspaceItemExt, WorkspaceParentExt } from 'src/util/obsidian-ext';
import { setBottomValue } from "src/util/statusBarConstants";
import { backcolorpicker, colorpicker } from "src/util/util";
import { t } from "src/translations/helper";
import { cMenuToolbarSettings } from "src/settings/settingsData";

window.ISMORE = false;
window.isBgC = false;
window.isCTxt = false;
window.isText = false;
let activeDocument: Document;

export function getRootSplits(): WorkspaceParentExt[] {
  const rootSplits: WorkspaceParentExt[] = [];

  // push the main window's root split to the list
  rootSplits.push(app.workspace.rootSplit as WorkspaceParent as WorkspaceParentExt)

  // @ts-ignore floatingSplit is undocumented
  const floatingSplit = app.workspace.floatingSplit as WorkspaceParentExt;
  floatingSplit?.children.forEach((child: WorkspaceParentExt) => {
    // if this is a window, push it to the list 
    if (child instanceof WorkspaceWindow) {
      rootSplits.push(child);
    }
  });

  return rootSplits;
}
export function selfDestruct() {
  const rootSplits = getRootSplits();
  const clearToolbar = (leaf: HTMLElement) => {

    let cMenuToolbarModalBar = leaf.querySelector(
      "#cMenuToolbarModalBar"
    );
    let cMenuToolbarPopoverBar = leaf.querySelector(
      "#cMenuToolbarModalBar"
    );

    if (cMenuToolbarModalBar) {
      if (cMenuToolbarModalBar.firstChild) {
        cMenuToolbarModalBar.removeChild(cMenuToolbarModalBar.firstChild);
      }
      cMenuToolbarModalBar.remove();
    }
    if (cMenuToolbarPopoverBar) {
      if (cMenuToolbarPopoverBar.firstChild) {
        cMenuToolbarPopoverBar.removeChild(cMenuToolbarPopoverBar.firstChild);
      }
      cMenuToolbarPopoverBar.remove();
    }
  }
  if(rootSplits)
  rootSplits.forEach((rootSplit: WorkspaceParentExt) => {
    clearToolbar(rootSplit.containerEl)
  });

}
export const getcoords = (editor: any) => {
  const cursor = editor.getCursor("from");

  let coords;
  if (editor.cursorCoords) coords = editor.cursorCoords(true, "window");
  else if (editor.coordsAtPos) {
    const offset = editor.posToOffset(cursor);
    coords = editor.cm.coordsAtPos?.(offset) ?? editor.coordsAtPos(offset);
  } else return;

  return coords;
};

export function getModestate(app: {
  workspace: { getActiveViewOfType: (arg0: typeof MarkdownView) => any };
}) {
  const activePane = app.workspace.getActiveViewOfType(MarkdownView);
  if (activePane) {
    let currentmode = activePane?.getMode();

    if (currentmode === "empty") {
      return false;
    }
    if (currentmode == "preview") {
      return false;
    }
    if (currentmode == "source") {
      return true;
    }
  }
}

export function checksvg(htmlStr: string) {
  let reg = /<[^>]+>/g;
  return reg.test(htmlStr);
}

export function CreateDiv(selector: string) {
  let div = createEl("div");
  div.addClass(selector);
  return div;
}

export function tabCell(app: App, plugin: cMenuToolbarPlugin, el: string) {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  let tab = activeDocument.getElementById(el);
  // @ts-ignore
  let rows = tab.rows;
  let rlen = rows.length;
  for (let i = 1; i < rlen; i++) {
    //遍历所有行
    let cells = rows[i].cells; //得到这一行的所有单元格
    for (let j = 0; j < cells.length; j++) {
      //给每一个单元格添加click事件
      cells[j].onclick = function () {
        let backcolor = this.style.backgroundColor;
        if (backcolor != "") {
          backcolor = colorHex(backcolor);
          if (el == "x-color-picker-table") {
            plugin.settings.cMenuFontColor = backcolor;
            Setfontcolor(app, backcolor);
            activeDocument.getElementById("change-font-color-icon").style.fill =
              plugin.settings.cMenuFontColor;
          } else if (el == "x-backgroundcolor-picker-table") {
            plugin.settings.cMenuBackgroundColor = backcolor;
            Setbackgroundcolor(app, backcolor);
            activeDocument.getElementById(
              "change-background-color-icon"
            ).style.fill = plugin.settings.cMenuBackgroundColor;
          }

          plugin.saveSettings();
        }
      };
    }
  }
}

export function Setfontcolor(app: App, color: string) {
  //from https://github.com/obsidian-canzi/Enhanced-editing
  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor;
    let selectText = editor.getSelection();
    if (selectText == null || "") {
      return;
    }

    let _html0 = /\<font color=[0-9a-zA-Z#]+[^\<\>]*\>[^\<\>]+\<\/font\>/g;
    let _html1 = /^\<font color=[0-9a-zA-Z#]+[^\<\>]*\>([^\<\>]+)\<\/font\>$/;
    let _html2 = '<font color="' + color + '">$1</font>';
    let _html3 = /\<font color=[^\<]*$|^[^\>]*font\>/g; //是否只包含一侧的<>

    if (_html3.test(selectText)) {
      return;
    } else if (_html0.test(selectText)) {
      if (_html1.test(selectText)) {

        selectText = selectText.replace(_html1, _html2);
      } else {
        selectText = selectText.replace(
          /\<font color=[0-9a-zA-Z#]+[^\<\>]*?\>|\<\/font\>/g,
          ""
        );
      }
    } else {
      selectText = selectText.replace(/^(.+)$/gm, _html2);
    }
    editor.replaceSelection(selectText);
    editor.exec("goRight");
    // @ts-ignore
    app.commands.executeCommandById("editor:focus");
  }
}

export function Setbackgroundcolor(app: App, color: string) {
  //from https://github.com/obsidian-canzi/Enhanced-editing
  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor;
    let selectText = editor.getSelection();
    if (selectText == null || selectText == "") {
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
    editor.exec("goRight");
    //@ts-ignore
    app.commands.executeCommandById("editor:focus");
  }
}

export const colorHex = function (color: string) {
  let that = color;
  let reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  if (/^(rgb|RGB)/.test(that)) {
    let aColor = that.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(",");
    let strHex = "#";
    for (let i = 0; i < aColor.length; i++) {
      let hex = Number(aColor[i]).toString(16);
      if (hex === "0") {
        hex += hex;
      }
      strHex += hex;
    }
    if (strHex.length !== 7) {
      strHex = that;
    }
    return strHex;
  } else if (reg.test(that)) {
    let aNum = that.replace(/#/, "").split("");
    if (aNum.length === 6) {
      return that;
    } else if (aNum.length === 3) {
      let numHex = "#";
      for (let i = 0; i < aNum.length; i += 1) {
        numHex += aNum[i] + aNum[i];
      }
      console.log(numHex);
      return numHex;
    }
  } else {
    return that;
  }
};

export function CreateMoreMenu(selector: HTMLDivElement) {
  // let  issubmenu= activeDocument.getElementById("cMenuToolbarModalBar").querySelector('.'+selector);
  // let barHeight = activeDocument.getElementById("cMenuToolbarModalBar").offsetHeight;
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  if (!window.ISMORE) return;
  let cMoreMenu = selector.createEl("span");
  cMoreMenu.addClass("more-menu");
  let morebutton = new ButtonComponent(cMoreMenu);
  morebutton
    .setClass("cMenuToolbarCommandItem")
    .setTooltip(t("More"))
    .onClick(() => {
      if (
        activeDocument.getElementById("cMenuToolbarPopoverBar").style.visibility ==
        "hidden"
      ) {
        activeDocument.getElementById("cMenuToolbarPopoverBar").style.visibility =
          "visible";
        activeDocument.getElementById("cMenuToolbarPopoverBar").style.height = "32px";
      } else {
        activeDocument.getElementById("cMenuToolbarPopoverBar").style.visibility =
          "hidden";
        activeDocument.getElementById("cMenuToolbarPopoverBar").style.height = "0";
      }
    });
  morebutton.buttonEl.innerHTML = `<svg  width="14" height="14"  version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" enable-background="new 0 0 1024 1024" xml:space="preserve"><path fill="#666" d="M510.29 14.13 q17.09 -15.07 40.2 -14.07 q23.12 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.1 q-23.62 2.01 -41.71 -13.07 q-18.08 -15.08 -20.09 -38.19 q-2.01 -23.12 13.06 -41.21 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.67 -386.92 q-15.07 -17.09 -13.56 -40.7 q1.51 -23.62 19.59 -38.7 ZM81.17 14.13 q17.08 -15.07 40.19 -14.07 q23.11 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.6 q-23.61 2.51 -41.7 -12.57 q-18.09 -15.08 -20.1 -38.69 q-2.01 -23.62 13.06 -41.71 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.66 -386.92 q-15.08 -17.09 -13.57 -40.7 q1.51 -23.62 19.6 -38.7 Z"/></svg>`;
  window.ISMORE = false;
  return cMoreMenu;
}

export function QuiteFormatBrushes() {
  //from https://github.com/obsidian-canzi/Enhanced-editing
  //关闭所有格式刷变量
  if (window.newNotice) window.newNotice.hide();
  window.isBgC = false; //多彩背景刷
  window.isCTxt = false; //多彩文字刷
  window.isText = false;
}

export function SetHeader(_str: string) {
  //from https://github.com/obsidian-canzi/Enhanced-editing

  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor;
    let linetext = editor.getLine(editor.getCursor().line);
    let newstr, linend = "";
    if (_str == "") {   //若为标题，转为普通文本
      newstr = linetext.replace(/^(\>*(\[[!\w]+\])?\s*)#+\s/, "$1");
    } else {  //列表、引用，先转为普通文本，再转为标题
      newstr = linetext.replace(/^\s*(#*|\>|\-|\d+\.)\s*/m, "");
      newstr = _str + " " + newstr;
    }
    if (newstr != "") {
      linend = editor.getRange(editor.getCursor(), { line: editor.getCursor().line, ch: linetext.length });
    } else {
      linend = editor.getRange(editor.getCursor(), { line: editor.getCursor().line, ch: 0 });
    };
    editor.setLine(editor.getCursor().line, newstr);
    editor.setCursor({ line: editor.getCursor().line, ch: Number(newstr.length - linend.length) });
  };
}
export function FormatEraser() {
  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor
    let linend;
    let selstart = editor.getRange({ line: editor.getCursor().line, ch: 0 }, editor.getCursor());
    let linetext = editor.getLine(editor.getCursor().line);

    if (linetext != "") {
      linend = editor.getRange(editor.getCursor(), { line: editor.getCursor().line, ch: linetext.length });
    } else {
      linend = editor.getRange(editor.getCursor(), { line: editor.getCursor().line, ch: 0 });
    };
    let selectText = editor.getSelection();
    if (selectText == null || selectText == "") {
      QuiteFormatBrushes();
      window.isText = true;
      if (window.newNotice) {
        if (window.newNotice.noticeEl.innerText != t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"))
          window.newNotice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);
      }
      else window.newNotice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);

      //new obsidian.Notice("请先划选部分文本，再执行命令！");
      let reg1 = /(~~|%%|\*==|==|\*\*?|\<[^\<\>]*?\>|!?\[\[*|`|_|!?\[)([^!#=\[\]\<\>\`_\*~\(\)]*)$/;
      let reg2 = /^([^!=\[\]\<\>\`_\*~\(\)]*)(~~|%%|==\*|==|\*\*?|\<[^\<\>]*\>|\]\]|`|_|\]\([^\(\)\[\]]*\))/;
      if (selstart.match(reg1) != null && linend.match(reg2) != null) {
        selstart = selstart.replace(reg1, "$2");
        linend = linend.replace(reg2, "$1");
        //笔记全文.replaceRange(selstart+linend, {line:当前行号,ch:0},{line:当前行号,ch:当前行文本.length});
        editor.setLine(editor.getCursor().line, selstart + linend);
        editor.setCursor({ line: editor.getCursor().line, ch: Number(selstart.length) });
      }

    } else {
      let mdText = /(^#+\s|(?<=^|\s*)#|^\>|^\- \[( |x)\]|^\+ |\<[^\<\>]+?\>|^1\. |^\s*\- |^\-+$|^\*+$|==\*|\*==|==\*\*|\*\*==|==\*\*\*|\*\*\*==)/mg;
      selectText = selectText.replace(mdText, "");
      selectText = selectText.replace(/^[ ]+|[ ]+$/mg, "");
      selectText = selectText.replace(/\!?\[\[([^\[\]\|]*\|)*([^\(\)\[\]]+)\]\]/g, "$2");
      selectText = selectText.replace(/\!?\[+([^\[\]\(\)]+)\]+\(([^\(\)]+)\)/g, "$1");
      selectText = selectText.replace(/`([^`]+)`/g, "$1");
      selectText = selectText.replace(/_([^_]+)_/g, "$1");
      selectText = selectText.replace(/==([^=]+)==/g, "$1");
      selectText = selectText.replace(/\*\*?([^\*]+)\*\*?/g, "$1");
      selectText = selectText.replace(/~~([^~]+)~~/g, "$1");
      selectText = selectText.replace(/(\r*\n)+/mg, "\r\n");
      editor.replaceSelection(selectText);
      //@ts-ignore
      app.commands.executeCommandById("editor:focus");

    }
  };
}
export const followingbar = (settings: cMenuToolbarSettings) => {

  let isource = getModestate(app);
  let cMenuToolbarModalBar = activeDocument.getElementById(
    "cMenuToolbarModalBar"
  );
  //console.log(activeLeaf.getViewState().state.mode)
  if (isource) {
    const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
    const view = activeLeaf;
    const editor = view.editor;
    let coords = getcoords(editor);


    if (cMenuToolbarModalBar) {

      let selection = editor.somethingSelected();
      let cMenuToolbarRows = settings.cMenuNumRows;
      selection
        ? (cMenuToolbarModalBar.style.visibility = "visible")
        : (cMenuToolbarModalBar.style.visibility = "hidden");

      let ElementCount = cMenuToolbarModalBar.childElementCount;
      if (ElementCount) {
        ElementCount == cMenuToolbarRows
          ? (cMenuToolbarModalBar.addClass("cMenuToolbarGrid"),cMenuToolbarModalBar.removeClass("cMenuToolbarFlex"))
          : (cMenuToolbarModalBar.addClass("cMenuToolbarFlex"),cMenuToolbarModalBar.removeClass("cMenuToolbarGrid"))
      } else {
        ElementCount = 0;
      }
     
      let cmheight = Math.ceil(ElementCount / cMenuToolbarRows);

      cMenuToolbarModalBar.style.height = 40 * cmheight + "px";
      if (settings.aestheticStyle == "tiny") {
        cMenuToolbarModalBar.style.height = 25 * cmheight + "px";
      }
      let rleftwidth =
        activeDocument.getElementsByClassName("side-dock-ribbon mod-left")[0]
          ?.clientWidth ?? 0;

      let leftwidth =
        activeDocument.getElementsByClassName("mod-left-split")[0]
          ?.clientWidth ?? 0;

      let barwidth = activeDocument.getElementById(
        "cMenuToolbarModalBar"
      ).offsetWidth;
      let barHeight = activeDocument.getElementById(
        "cMenuToolbarModalBar"
      ).offsetHeight;

      let bodywidth = activeDocument.body.offsetWidth;
      /*添加判断边界 */
      cMenuToolbarModalBar.style.top = coords.top - barHeight - 30 + "px";
      let leftpx = coords.left - leftwidth - rleftwidth + 20;
  
      if (coords.left + barwidth + 15 > bodywidth)
        leftpx = coords.left - leftwidth - rleftwidth - barwidth / 1.3 - 60;
      if (leftpx < 0) leftpx = 0;
      cMenuToolbarModalBar.style.left = leftpx + "px";
    }


  } else
    cMenuToolbarModalBar.style.visibility = "hidden"
}
export function cMenuToolbarPopover(
  app: App,
  plugin: cMenuToolbarPlugin
): void {
  let settings = plugin.settings;
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  function createMenu() {
    const generateMenu = () => {
      let btnwidth = 0;
      let cMenuToolbar = createEl("div");
      if (cMenuToolbar) {
        if (settings.positionStyle == "top") {
          cMenuToolbar.setAttribute(
            "style",
            `position: relative; grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));`
          );
        } else {
          cMenuToolbar.setAttribute(
            "style",
            `left: calc(50% - calc(${cMenuToolbar.offsetWidth
            }px / 2)); bottom: ${settings.cMenuBottomValue
            }em; grid-template-columns: ${"1fr ".repeat(settings.cMenuNumRows)}`
          );
        }
      }
      cMenuToolbar.setAttribute("id", "cMenuToolbarModalBar");
      //二级弹出菜单

      let PopoverMenu = createEl("div");
      PopoverMenu.addClass("cMenuToolbarpopover");
      PopoverMenu.addClass("cMenuToolbarTinyAesthetic");
      PopoverMenu.setAttribute("id", "cMenuToolbarPopoverBar");
      PopoverMenu.style.visibility = "hidden";
      PopoverMenu.style.height = "0";
      if (settings.aestheticStyle == "default") {
        cMenuToolbar.addClass("cMenuToolbarDefaultAesthetic");
        cMenuToolbar.removeClass("cMenuToolbarTinyAesthetic");
        cMenuToolbar.removeClass("cMenuToolbarGlassAesthetic");
      } else if (settings.aestheticStyle == "tiny") {
        cMenuToolbar.addClass("cMenuToolbarTinyAesthetic");
        cMenuToolbar.removeClass("cMenuToolbarDefaultAesthetic");
        cMenuToolbar.removeClass("cMenuToolbarGlassAesthetic");
      } else {
        cMenuToolbar.addClass("cMenuToolbarGlassAesthetic");
        cMenuToolbar.removeClass("cMenuToolbarTinyAesthetic");
        cMenuToolbar.removeClass("cMenuToolbarDefaultAesthetic");
      }

      if (settings.positionStyle == "following") {
        cMenuToolbar.style.visibility = "hidden";
      }

      let leafwidth = 99999;
      if (settings.positionStyle == "top") {
        let currentleaf = activeDocument.body?.querySelector(
          ".workspace-leaf.mod-active"
        );
        if (!activeDocument.getElementById("cMenuToolbarPopoverBar"))
          currentleaf
            ?.querySelector(".markdown-source-view")
            .insertAdjacentElement("afterbegin", PopoverMenu);
        currentleaf
          ?.querySelector(".markdown-source-view")
          .insertAdjacentElement("afterbegin", cMenuToolbar);
        leafwidth = currentleaf.querySelector<HTMLElement>(
          ".markdown-source-view"
        ).offsetWidth;
      } else if (settings.appendMethod == "body") {
        activeDocument.body.appendChild(cMenuToolbar);
      } else if (settings.appendMethod == "workspace") {
        activeDocument.body
          ?.querySelector(".mod-vertical.mod-root")
          .insertAdjacentElement("afterbegin", cMenuToolbar);
      }




      let cMenuToolbarPopoverBar = activeDocument.getElementById(
        "cMenuToolbarPopoverBar"
      );
      settings.menuCommands.forEach((item, index) => {
        if ("SubmenuCommands" in item) {
          let _btn: any;
          if (btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
            //说明已经溢出
            window.ISMORE = true; //需要添加更多按钮
            _btn = new ButtonComponent(cMenuToolbarPopoverBar);
          } else _btn = new ButtonComponent(cMenuToolbar);

          _btn.setClass("cMenuToolbarCommandsubItem" + index);

          checksvg(item.icon)
            ? (_btn.buttonEl.innerHTML = item.icon)
            : _btn.setIcon(item.icon);

          let __btnwidth;
          if (_btn.buttonEl.offsetWidth > 100) __btnwidth = 26;
          else {
            if (_btn.buttonEl.offsetWidth < 26) __btnwidth = 26;
            else __btnwidth = _btn.buttonEl.offsetWidth;
          }
          btnwidth += __btnwidth + 2;
          let submenu = CreateDiv("subitem");
          if (submenu) {
            item.SubmenuCommands.forEach(
              (subitem: { name: string; id: any; icon: string }) => {
                let sub_btn = new ButtonComponent(submenu)
                  .setTooltip(subitem.name)
                  .setClass("menu-item")
                  .onClick(() => {
                    //@ts-ignore
                    app.commands.executeCommandById(subitem.id);

                    if (settings.cMenuVisibility == false)
                      cMenuToolbar.style.visibility = "hidden";
                    else {
                      if (settings.positionStyle == "following") {
                        cMenuToolbar.style.visibility = "hidden";
                      } else cMenuToolbar.style.visibility = "visible";
                    }
                  });
                checksvg(subitem.icon)
                  ? (sub_btn.buttonEl.innerHTML = subitem.icon)
                  : sub_btn.setIcon(subitem.icon);

                _btn.buttonEl.insertAdjacentElement("afterbegin", submenu);
              }
            );
          }
        } else {
          if (item.id == "obsidian-editing-toolbar:change-font-color") {
            let button2 = new ButtonComponent(cMenuToolbar);
            button2
              .setClass("cMenuToolbarCommandsubItem-font-color")
              .setTooltip(t("Font Colors"))
              .onClick(() => {
                //@ts-ignore
                app.commands.executeCommandById(item.id);
                if (settings.cMenuVisibility == false)
                  cMenuToolbar.style.visibility = "hidden";
                else {
                  if (settings.positionStyle == "following") {
                    cMenuToolbar.style.visibility = "hidden";
                  } else cMenuToolbar.style.visibility = "visible";
                }
              });
            checksvg(item.icon)
              ? (button2.buttonEl.innerHTML = item.icon)
              : button2.setIcon(item.icon);

            btnwidth += 26 + 36;
            //  let Selection = createDiv("triangle-icon");
            let submenu2 = createEl("div");
            submenu2.addClass("subitem");

            if (submenu2) {
              submenu2.innerHTML = colorpicker;

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              if (settings.cMenuFontColor)
                activeDocument.getElementById(
                  "change-font-color-icon"
                ).style.fill = settings.cMenuFontColor;
              tabCell(app, plugin, "x-color-picker-table");
              let el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              let button3 = new ButtonComponent(el);
              button3
                .setIcon("remix-Brush2Line")
                .setTooltip(t("Format Brush"))
                .onClick(() => {
                  QuiteFormatBrushes();
                  window.isCTxt = true;
                  window.newNotice = new Notice(
                    t("Font-Color formatting brush ON!"),
                    0
                  );
                });
            }
          } else if (item.id == "obsidian-editing-toolbar:change-background-color") {
            let button2 = new ButtonComponent(cMenuToolbar);
            button2
              .setClass("cMenuToolbarCommandsubItem-font-color")
              .setTooltip(t("Background color"))
              .onClick(() => {
                //@ts-ignore
                app.commands.executeCommandById(item.id);
                if (settings.cMenuVisibility == false)
                  cMenuToolbar.style.visibility = "hidden";
                else {
                  if (settings.positionStyle == "following") {
                    cMenuToolbar.style.visibility = "hidden";
                  } else cMenuToolbar.style.visibility = "visible";
                }
              });
            checksvg(item.icon)
              ? (button2.buttonEl.innerHTML = item.icon)
              : button2.setIcon(item.icon);

            btnwidth += 26 + 36;
            //  let Selection = CreateDiv("triangle-icon");
            let submenu2 = createEl("div");
            submenu2.addClass("subitem");
            //   console.log(btnwidth,item.name)
            if (submenu2) {
              submenu2.innerHTML = backcolorpicker;

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              if (plugin.settings.cMenuBackgroundColor)
                activeDocument.getElementById(
                  "change-background-color-icon"
                ).style.fill = plugin.settings.cMenuBackgroundColor;
              tabCell(app, plugin, "x-backgroundcolor-picker-table");
              let el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              let button3 = new ButtonComponent(el);
              button3
                .setIcon("remix-Brush2Line")
                .setTooltip(t("Format Brush"))
                .onClick(() => {
                  QuiteFormatBrushes();
                  window.isBgC = true;
                  window.newNotice = new Notice(
                    t("Background-color formatting brush ON!"),
                    0
                  );
                });
            }
          } else {
            let button;
            if (btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
              //说明已经溢出
              window.ISMORE = true; //需要添加更多按钮
              button = new ButtonComponent(cMenuToolbarPopoverBar);
            } else button = new ButtonComponent(cMenuToolbar);
            button.setTooltip(item.name).onClick(() => {
              //@ts-ignore
              app.commands.executeCommandById(item.id);
              if (settings.cMenuVisibility == false)
                cMenuToolbar.style.visibility = "hidden";
              else {
                if (settings.positionStyle == "following") {
                  cMenuToolbar.style.visibility = "hidden";
                } else cMenuToolbar.style.visibility = "visible";
              }
            });

            button.setClass("cMenuToolbarCommandItem");
            if (item.id == "cMenuToolbar-Divider-Line")
              button.setClass("cMenuToolbar-Divider-Line");
            checksvg(item.icon)
              ? (button.buttonEl.innerHTML = item.icon)
              : button.setIcon(item.icon);
            let __btnwidth2;
            if (button.buttonEl.offsetWidth > 100) __btnwidth2 = 26;
            else {
              if (button.buttonEl.offsetWidth < 26) __btnwidth2 = 26;
              else __btnwidth2 = button.buttonEl.offsetWidth;
            }

            btnwidth += __btnwidth2;
          }
        }
      });

      CreateMoreMenu(cMenuToolbar);
      if (Math.abs(plugin.settings.cMenuWidth - Number(btnwidth)) > 30) {
        plugin.settings.cMenuWidth = Number(btnwidth);
        setTimeout(() => {
          plugin.saveSettings();
        }, 100);
      }
    };
    let Markdown = app.workspace.getActiveViewOfType(MarkdownView);
    if (Markdown) {
      let currentnode = activeDocument.getElementById("cMenuToolbarModalBar");
      if (settings.positionStyle == "top") {
        if (!getModestate(app)) return;
        let activeleaf = activeDocument.body.querySelector(
          ".workspace-leaf.mod-active"
        );
        if (activeleaf)
          if (currentnode) {
            if (!activeleaf.querySelector("#cMenuToolbarModalBar")) {
              selfDestruct();
            } else {
              return;
            }
          }
      } else {
        if (currentnode) return;
      }
      generateMenu();
      let cMenuToolbarModalBar = activeDocument.getElementById(
        "cMenuToolbarModalBar"
      );
      setBottomValue(settings);

      settings.cMenuVisibility == false
        ? (cMenuToolbarModalBar.style.visibility = "hidden")
        : settings.positionStyle == "following" ?
          (cMenuToolbarModalBar?.style.visibility = "hidden") : (cMenuToolbarModalBar?.style.visibility = "visible");
    } else {
      selfDestruct();
    }

  }
  createMenu();
}
