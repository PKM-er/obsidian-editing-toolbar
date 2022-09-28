
import type cMenuToolbarPlugin from "src/plugin/main";
import { App, Notice, Command, requireApiVersion, MarkdownView, ButtonComponent, WorkspaceParent, WorkspaceWindow, SettingTab, WorkspaceParentExt } from "obsidian";
import { setBottomValue } from "src/util/statusBarConstants";
import { backcolorpicker, colorpicker } from "src/util/util";
import { t } from "src/translations/helper";
import { cMenuToolbarSettings } from "src/settings/settingsData";


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

export function resetToolbar() {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  //  let currentleaf = activeDocument.body?.querySelector( ".workspace-leaf.mod-active");
  let currentleaf = activeDocument;
  let cMenuToolbarModalBar = currentleaf.querySelectorAll(
    "#cMenuToolbarModalBar"
  );
  let cMenuToolbarPopoverBar = currentleaf.querySelectorAll(
    "#cMenuToolbarPopoverBar"
  );
  cMenuToolbarModalBar.forEach(element => {
    if (element) {
      if (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.remove();
    }

  });
  cMenuToolbarPopoverBar.forEach(element => {
    if (element) {
      if (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.remove();
    }

  });

}

export function selfDestruct() {
  const rootSplits = getRootSplits();
  const clearToolbar = (leaf: HTMLElement) => {

    let cMenuToolbarModalBar = leaf.querySelectorAll(
      "#cMenuToolbarModalBar"
    );
    let cMenuToolbarPopoverBar = leaf.querySelectorAll(
      "#cMenuToolbarPopoverBar"
    );

    cMenuToolbarModalBar.forEach(element => {
      if (element) {
        if (element.firstChild) {
          element.removeChild(element.firstChild);
        }
        element.remove();
      }

    });
    cMenuToolbarPopoverBar.forEach(element => {
      if (element) {
        if (element.firstChild) {
          element.removeChild(element.firstChild);
        }
        element.remove();
      }

    });


  }
  if (rootSplits)
    rootSplits.forEach((rootSplit: WorkspaceParentExt) => {
      if (rootSplit?.containerEl)
        clearToolbar(rootSplit?.containerEl)
    });

}

export function isExistoolbar(settings: cMenuToolbarSettings): HTMLElement {
  const position = settings.positionStyle;
  let container;
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  position == "top" ? container = activeDocument?.querySelector(".workspace-leaf.mod-active")?.querySelector("#cMenuToolbarModalBar")
    : container = activeDocument.getElementById("cMenuToolbarModalBar");
  if (container) {
    return container as HTMLElement;
  } else {
    return null
  }
  return null;
}



const getNestedObject = (nestedObj: any, pathArr: any[]) => {
  return pathArr.reduce((obj, key) =>
    (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
}

function setHilite(keys: any, how: string) {
  // need to check if existing key combo is overridden by undefining it
  if (keys && keys[1][0] !== undefined) {
    return how + keys.flat(2).join('+').replace('Mod', 'Ctrl') + how;
  } else {
    return how + '–' + how;
  }
}

function getHotkey(app: App, cmdid: string, highlight = true) {
  // @ts-ignore
  let arr = app.commands.findCommand(cmdid)
  let hi = highlight ? '*' : '';
  if (arr) {
    let defkeys = arr.hotkeys ? [[getNestedObject(arr.hotkeys, [0, 'modifiers'])],
    [getNestedObject(arr.hotkeys, [0, 'key'])]] : undefined;
    // @ts-ignore
    let ck = app.hotkeyManager.customKeys[arr.id];
    var hotkeys = ck ? [[getNestedObject(ck, [0, 'modifiers'])], [getNestedObject(ck, [0, 'key'])]] : undefined;
    return hotkeys ? setHilite(hotkeys, hi) : setHilite(defkeys, '');
  } else
    return "–"
}



export const getCoords = (editor: any) => {
  const cursorFrom = editor.getCursor("head");

  let coords;
  if (editor.cursorCoords) coords = editor.cursorCoords(true, "window");
  else if (editor.coordsAtPos) {
    const offset = editor.posToOffset(cursorFrom);
    coords = editor.cm.coordsAtPos?.(offset) ?? editor.coordsAtPos(offset);
  } else return;

  return coords;
};

export function getModestate(app: App) {
  const activePane = app.workspace.getActiveViewOfType(MarkdownView);
  if (activePane) {
    let currentmode = activePane?.getMode();
    if (currentmode == "preview") {
      return false;
    } else
      if (currentmode == "source") {
        return true;
      } else
        return false;
  }
}

export function checkHtml(htmlStr: string) {
  let reg = /<[^>]+>/g;
  return reg.test(htmlStr);
}

export function createDiv(selector: string) {
  let div = createEl("div");
  div.addClass(selector);
  return div;
}

export function createTablecell(app: App, plugin: cMenuToolbarPlugin, el: string) {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  let container = isExistoolbar(plugin.settings) as HTMLElement;
  let tab = container?.querySelector('#' + el);
  if (tab) {
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
            backcolor = setcolorHex(backcolor);
            if (el == "x-color-picker-table") {
              plugin.settings.cMenuFontColor = backcolor;
              setFontcolor(app, backcolor);
              let font_colour_dom = activeDocument.querySelectorAll("#change-font-color-icon")
              font_colour_dom.forEach(element => {
                let ele = element as HTMLElement
                ele.style.fill = backcolor;
              });

            } else if (el == "x-backgroundcolor-picker-table") {
              plugin.settings.cMenuBackgroundColor = backcolor;
              setBackgroundcolor(app, backcolor);
              let background_colour_dom = activeDocument.querySelectorAll("#change-background-color-icon")
              background_colour_dom.forEach(element => {
                let ele = element as HTMLElement
                ele.style.fill = backcolor;
              });
              //  background_colour_dom.style.fill = plugin.settings.cMenuBackgroundColor;
            }

            plugin.saveSettings();
          }
        };
      }
    }
  }
}

export function setFontcolor(app: App, color: string) {
  //from https://github.com/obsidian-canzi/Enhanced-editing
  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor;
    let selectText = editor.getSelection();
    if (selectText == null || selectText.trim() == "") {
      //如果没有选中内容激活格式刷
      quiteFormatbrushes();
      globalThis.EN_FontColor_Format_Brush = true;
      globalThis.newNotice = new Notice(
        t("Font-Color formatting brush ON!"),
        0
      );
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

export function setBackgroundcolor(app: App, color: string) {
  //from https://github.com/obsidian-canzi/Enhanced-editing
  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor;
    let selectText = editor.getSelection();
    if (selectText == null || selectText.trim() == "") {
      //如果没有选中内容激活格式刷
      quiteFormatbrushes();
      globalThis.EN_BG_Format_Brush = true;
      globalThis.newNotice = new Notice(
        t("Background-color formatting brush ON!"),
        0
      );
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

export const setcolorHex = function (color: string) {
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
    //  console.log(numHex);
      return numHex;
    }
  } else {
    return that;
  }
};

export function createMoremenu(selector: HTMLDivElement) {
  // let  issubmenu= activeDocument.getElementById("cMenuToolbarModalBar").querySelector('.'+selector);
  // let barHeight = activeDocument.getElementById("cMenuToolbarModalBar").offsetHeight;
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  let Morecontainer = activeDocument.body?.querySelector(".workspace-leaf.mod-active")?.querySelector("#cMenuToolbarPopoverBar") as HTMLElement;

  if (!globalThis.IS_MORE_Button) return;
  let cMoreMenu = selector.createEl("span");
  cMoreMenu.addClass("more-menu");
  let morebutton = new ButtonComponent(cMoreMenu);
  morebutton
    .setClass("cMenuToolbarCommandItem")
    .setTooltip(t("More"))
    .onClick(() => {
      if (Morecontainer.style.visibility == "hidden") {
        Morecontainer.style.visibility = "visible";
        Morecontainer.style.height = "32px";
      } else {
        Morecontainer.style.visibility = "hidden";
        Morecontainer.style.height = "0";
      }
    });
  morebutton.buttonEl.innerHTML = `<svg  width="14" height="14"  version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" enable-background="new 0 0 1024 1024" xml:space="preserve"><path fill="#666" d="M510.29 14.13 q17.09 -15.07 40.2 -14.07 q23.12 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.1 q-23.62 2.01 -41.71 -13.07 q-18.08 -15.08 -20.09 -38.19 q-2.01 -23.12 13.06 -41.21 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.67 -386.92 q-15.07 -17.09 -13.56 -40.7 q1.51 -23.62 19.59 -38.7 ZM81.17 14.13 q17.08 -15.07 40.19 -14.07 q23.11 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.6 q-23.61 2.51 -41.7 -12.57 q-18.09 -15.08 -20.1 -38.69 q-2.01 -23.62 13.06 -41.71 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.66 -386.92 q-15.08 -17.09 -13.57 -40.7 q1.51 -23.62 19.6 -38.7 Z"/></svg>`;
  globalThis.IS_MORE_Button = false;
  return cMoreMenu;
}

export function quiteFormatbrushes() {
  //from https://github.com/obsidian-canzi/Enhanced-editing
  //关闭所有格式刷变量
  if (globalThis.newNotice) globalThis.newNotice.hide();
  globalThis.EN_BG_Format_Brush = false; //多彩背景刷
  globalThis.EN_FontColor_Format_Brush = false; //多彩文字刷
  globalThis.EN_Text_Format_Brush = false;
}

export function setHeader(_str: string) {
  //from https://github.com/obsidian-canzi/Enhanced-editing

  const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (activeLeaf) {
    const view = activeLeaf;
    const editor = view.editor;
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
  };
}
export function setFormateraser() {
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
      quiteFormatbrushes();
      globalThis.EN_Text_Format_Brush = true;
      if (globalThis.newNotice) {
       if (globalThis.newNotice.noticeEl.innerText != t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"))
          globalThis.newNotice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);
      }
      else globalThis.newNotice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);

    } else {
      let mdText = /(^#+\s|(?<=^|\s*)#|^\>|^\- \[( |x)\]|^\+ |\<[^\<\>]+?\>|^1\. |^\s*\- |^\-+$|^\*+$)/mg;
      selectText = selectText.replace(mdText, "");
      selectText = selectText.replace(/^[ ]+|[ ]+$/mg, "");
      selectText = selectText.replace(/\!?\[\[([^\[\]\|]*\|)*([^\(\)\[\]]+)\]\]/g, "$2");
      selectText = selectText.replace(/\!?\[+([^\[\]\(\)]+)\]+\(([^\(\)]+)\)/g, "$1");
      selectText = selectText.replace(/`([^`]+)`/g, "$1");
      selectText = selectText.replace(/_([^_]+)_/g, "$1");
      selectText = selectText.replace(/==([^=]+)==/g, "$1");
      selectText = selectText.replace(/\*\*\*([^\*]+)\*\*\*/g, "$1");
      selectText = selectText.replace(/\*\*?([^\*]+)\*\*?/g, "$1");
      selectText = selectText.replace(/~~([^~]+)~~/g, "$1");

      // selectText = selectText.replace(/(\r*\n)+/mg, "\r\n");
      editor.replaceSelection(selectText);
      //@ts-ignore
      app.commands.executeCommandById("editor:focus");

    }
  };
}
export const createFollowingbar = (settings: cMenuToolbarSettings) => {

  let isource = getModestate(app);

  let cMenuToolbarModalBar = isExistoolbar(settings);
  //console.log(activeLeaf.getViewState().state.mode)
  if (isource) {
    const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
    const view = activeLeaf;
    const editor = view.editor;


    if (cMenuToolbarModalBar) {

      let selection = editor.somethingSelected();
      // let cMenuToolbarRows = settings.cMenuNumRows;
      selection
        ? (cMenuToolbarModalBar.style.visibility = "visible")
        : (cMenuToolbarModalBar.style.visibility = "hidden");

      //   let ElementCount = cMenuToolbarModalBar.childElementCount;
      //   if (ElementCount) {
      //     ElementCount == cMenuToolbarRows
      //  ? (cMenuToolbarModalBar.addClass("cMenuToolbarGrid"), cMenuToolbarModalBar.removeClass("cMenuToolbarFlex"))
      cMenuToolbarModalBar.addClass("cMenuToolbarFlex")
      cMenuToolbarModalBar.removeClass("cMenuToolbarGrid")

      // let cmheight = Math.ceil(ElementCount / cMenuToolbarRows);
      let cmheight = 1;
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
      let coords = getCoords(editor);
      let cursor_head = editor.getCursor("head").ch
      let cursor_from = editor.getCursor("from").ch

      let toppx = 0;
      /*添加判断边界 */
      let leftpx = coords.left - leftwidth - rleftwidth + 20;
      if (coords.left + barwidth + 15 > bodywidth)
        leftpx = coords.left - leftwidth - rleftwidth - barwidth / 1.3 - 60;
      cursor_head == cursor_from ?
        toppx = coords.top - barHeight - 30 : (toppx = coords.top, leftpx = leftpx - 40);
      if (leftpx < 0) leftpx = 0;
      cMenuToolbarModalBar.style.visibility == "visible" ?
        (cMenuToolbarModalBar.style.left = leftpx + "px", cMenuToolbarModalBar.style.top = toppx + "px") : true;

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
          let topem = (settings.cMenuBottomValue - 4.25) * 5;
          cMenuToolbar.setAttribute(
            "style",
            `position: relative; grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));top: ${topem
            }px;`
          );
          cMenuToolbar.className += " top";
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

      //  if (settings.positionStyle == "following") {
      //    cMenuToolbar.style.visibility = "hidden";
      // }

      let leafwidth = 99999;
      if (settings.positionStyle == "top") {
        let currentleaf = activeDocument.body?.querySelector(
          ".workspace-leaf.mod-active"
        );
        if (!currentleaf?.querySelector("#cMenuToolbarPopoverBar"))
          currentleaf?.querySelector(".markdown-source-view")
            .insertAdjacentElement("afterbegin", PopoverMenu);
        currentleaf
          ?.querySelector(".markdown-source-view")
          .insertAdjacentElement("afterbegin", cMenuToolbar);
        leafwidth = currentleaf?.querySelector<HTMLElement>(
          ".markdown-source-view"
        ).offsetWidth;

      } else if (settings.appendMethod == "body") {
        activeDocument.body.appendChild(cMenuToolbar);
      } else if (settings.appendMethod == "workspace") {
        activeDocument.body
          ?.querySelector(".mod-vertical.mod-root")
          .insertAdjacentElement("afterbegin", cMenuToolbar);
      }




      let cMenuToolbarPopoverBar = activeDocument.body?.querySelector(".workspace-leaf.mod-active")
        ?.querySelector("#cMenuToolbarPopoverBar") as HTMLElement
      settings.menuCommands.forEach((item, index) => {
        let tip
        if ("SubmenuCommands" in item) {
          let _btn: any;
          if (btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
            //说明已经溢出
            globalThis.IS_MORE_Button = true; //需要添加更多按钮
            _btn = new ButtonComponent(cMenuToolbarPopoverBar);
          } else _btn = new ButtonComponent(cMenuToolbar);

          _btn.setClass("cMenuToolbarCommandsubItem" + index);

          checkHtml(item.icon)
            ? (_btn.buttonEl.innerHTML = item.icon)
            : _btn.setIcon(item.icon);

          let __btnwidth;
          if (_btn.buttonEl.offsetWidth > 100) __btnwidth = 26;
          else {
            if (_btn.buttonEl.offsetWidth < 26) __btnwidth = 26;
            else __btnwidth = _btn.buttonEl.offsetWidth;
          }
          btnwidth += __btnwidth + 2;
          let submenu = createDiv("subitem");
          if (submenu) {
            item.SubmenuCommands.forEach(
              (subitem: { name: string; id: any; icon: string }) => {
                let hotkey = getHotkey(app, subitem.id);
                hotkey == "–" ? tip = subitem.name : tip = subitem.name + "(" + hotkey + ")";
                let sub_btn = new ButtonComponent(submenu)
                  .setTooltip(tip)
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
                checkHtml(subitem.icon)
                  ? (sub_btn.buttonEl.innerHTML = subitem.icon)
                  : sub_btn.setIcon(subitem.icon);

                _btn.buttonEl.insertAdjacentElement("afterbegin", submenu);
              }
            );
          }
        } else {
          if (item.id == "editing-toolbar:change-font-color") {
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
            checkHtml(item.icon)
              ? (button2.buttonEl.innerHTML = item.icon)
              : button2.setIcon(item.icon);

            btnwidth += 26;
            //  let Selection = createDiv("triangle-icon");
            let submenu2 = createEl("div");
            submenu2.addClass("subitem");

            if (submenu2) {
              submenu2.innerHTML = colorpicker;

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              //    if (settings.cMenuFontColor)
              //     activeDocument.getElementById("change-font-color-icon").style.fill = settings.cMenuFontColor;
              createTablecell(app, plugin, "x-color-picker-table");
              let el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              let button3 = new ButtonComponent(el);
              button3
                .setIcon("remix-Brush2Line")
                .setTooltip(t("Format Brush"))
                .onClick(() => {
                    quiteFormatbrushes();
                    globalThis.EN_FontColor_Format_Brush = true;
                    globalThis.newNotice = new Notice(
                      t("Font-Color formatting brush ON!"),
                      0
                    );
                  
                });
            }
          } else if (item.id == "editing-toolbar:change-background-color") {
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
            checkHtml(item.icon)
              ? (button2.buttonEl.innerHTML = item.icon)
              : button2.setIcon(item.icon);

            btnwidth += 26;
            //  let Selection = createDiv("triangle-icon");
            let submenu2 = createEl("div");
            submenu2.addClass("subitem");
            //   console.log(btnwidth,item.name)
            if (submenu2) {
              submenu2.innerHTML = backcolorpicker;

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              // if (plugin.settings.cMenuBackgroundColor)
              //  activeDocument.getElementById("change-background-color-icon").style.fill = plugin.settings.cMenuBackgroundColor;
              createTablecell(app, plugin, "x-backgroundcolor-picker-table");
              let el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              let button3 = new ButtonComponent(el);
              button3
                .setIcon("remix-Brush2Line")
                .setTooltip(t("Format Brush"))
                .onClick(() => {
                    quiteFormatbrushes();
                    globalThis.EN_BG_Format_Brush = true;
                    globalThis.newNotice = new Notice(
                      t("Font-Color formatting brush ON!"),
                      0
                    );
                  
                });
            }
          } else {
            let button;
            if (btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
              //说明已经溢出
              globalThis.IS_MORE_Button = true; //需要添加更多按钮
              button = new ButtonComponent(cMenuToolbarPopoverBar);
            } else button = new ButtonComponent(cMenuToolbar);
            let hotkey = getHotkey(app, item.id);
            hotkey == "–" ? tip = item.name : tip = item.name + "(" + hotkey + ")";
            button.setTooltip(tip).onClick(() => {
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
            checkHtml(item.icon)
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

      createMoremenu(cMenuToolbar);
      if (Math.abs(plugin.settings.cMenuWidth - Number(btnwidth)) > 30) {
        plugin.settings.cMenuWidth = Number(btnwidth);
        setTimeout(() => {
          plugin.saveSettings();
        }, 100);
      }
    };
    let Markdown = app.workspace.getActiveViewOfType(MarkdownView);
    if (Markdown) {
      if (isExistoolbar(plugin.settings)) return;

      generateMenu();

      setBottomValue(settings);
    
      setsvgColor(settings.cMenuFontColor,settings.cMenuBackgroundColor)

    } else {
      //  selfDestruct();
      return;
    }

  }
  createMenu();
}

function setsvgColor(fontcolor: string,bgcolor: string)
{
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  let font_colour_dom = activeDocument.querySelectorAll("#change-font-color-icon")
  if(font_colour_dom)
  {
    font_colour_dom.forEach(element => {
      let ele = element as HTMLElement
      ele.style.fill = fontcolor;
    });
  }

  let background_colour_dom = activeDocument.querySelectorAll("#change-background-color-icon")
  if(background_colour_dom)
  {
    background_colour_dom.forEach(element => {
      let ele = element as HTMLElement
      ele.style.fill = bgcolor;
    });
  }
 
}