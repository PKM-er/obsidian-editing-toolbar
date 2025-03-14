import type editingToolbarPlugin from "src/plugin/main";
import { App, Notice, requireApiVersion, ItemView, MarkdownView, ButtonComponent, WorkspaceParent, WorkspaceWindow, WorkspaceParentExt } from "obsidian";
import { backcolorpicker, colorpicker } from "src/util/util";
import { t } from "src/translations/helper";
import { editingToolbarSettings } from "src/settings/settingsData";
import { ViewUtils } from 'src/util/viewUtils';
import { setBottomValue, setHorizontalValue } from "src/util/statusBarConstants";
import { Editor } from "obsidian";
import { setFontcolor, setBackgroundcolor } from "src/util/util";

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
  let currentleaf = activeDocument;
  let editingToolbarModalBar = currentleaf.querySelectorAll(
    "#editingToolbarModalBar"
  );
  let editingToolbarPopoverBar = currentleaf.querySelectorAll(
    "#editingToolbarPopoverBar"
  );
  editingToolbarModalBar.forEach(element => {
    if (element) {
      if (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.remove();
    }

  });
  editingToolbarPopoverBar.forEach(element => {
    if (element) {
      if (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.remove();
    }

  });

}

export function selfDestruct() {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  const toolBarElement = activeDocument.getElementById("editingToolbarModalBar");
  if (toolBarElement) toolBarElement.remove();
  const rootSplits = getRootSplits();
  const clearToolbar = (leaf: HTMLElement) => {

    let editingToolbarModalBar = leaf.querySelectorAll(
      "#editingToolbarModalBar"
    );
    let editingToolbarPopoverBar = leaf.querySelectorAll(
      "#editingToolbarPopoverBar"
    );

    editingToolbarModalBar.forEach(element => {
      if (element) {
        if (element.firstChild) {
          element.removeChild(element.firstChild);
        }
        element.remove();
      }

    });
    editingToolbarPopoverBar.forEach(element => {
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

export function isExistoolbar(app: App, settings: editingToolbarSettings): HTMLElement {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  let container = settings.positionStyle == "top" ? app.workspace.activeLeaf?.view.containerEl?.querySelector("#editingToolbarModalBar")
    : activeDocument.getElementById("editingToolbarModalBar");
  return (container) ? container as HTMLElement : null;
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
  let cursorFrom = editor.getCursor("head");
  if (editor.getCursor("head").ch !== editor.getCursor("from").ch) cursorFrom.ch = Math.max(0, cursorFrom.ch - 1);

  let coords;
  if (editor.cursorCoords) coords = editor.cursorCoords(true, "window");
  else if (editor.coordsAtPos) {
    const offset = editor.posToOffset(cursorFrom);
    coords = editor.cm.coordsAtPos?.(offset) ?? editor.coordsAtPos(offset);
  } else return;

  return coords;
};




export function checkHtml(htmlStr: string) {
  let reg = /<[^>]+>/g;
  return reg.test(htmlStr);
}

export function createDiv(selector: string) {
  let div = createEl("div");
  div.addClass(selector);
  return div;
}


export function createTablecell(app: App, plugin: editingToolbarPlugin, el: string) {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;

  const editor = plugin.commandsManager.getActiveEditor();
  let container = isExistoolbar(app, plugin.settings) as HTMLElement;
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
            // console.log(backcolor,'backcolor')
            if (el == "x-color-picker-table") {
              plugin.settings.cMenuFontColor = backcolor;
              setFontcolor(backcolor, editor);
              let font_colour_dom = activeDocument.querySelectorAll("#change-font-color-icon")
              font_colour_dom.forEach(element => {
                let ele = element as HTMLElement
                ele.style.fill = backcolor;
              });

            } else if (el == "x-backgroundcolor-picker-table") {
              plugin.settings.cMenuBackgroundColor = backcolor;
              //console.log("333")
              setBackgroundcolor(backcolor, editor);
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
      if (hex.length == 1) {
        hex = '0' + hex;
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
      return numHex;
    }
  } else {
    return that;
  }
};

export function createMoremenu(app: App, plugin: editingToolbarPlugin, selector: HTMLDivElement) {
  const view = app.workspace.getActiveViewOfType(ItemView);
  if (!ViewUtils.isAllowedViewType(view)) return;

  let Morecontainer = view.containerEl.querySelector("#editingToolbarPopoverBar") as HTMLElement
  if (!plugin.IS_MORE_Button) return;
  let cMoreMenu = selector.createEl("span");
  cMoreMenu.addClass("more-menu");
  let morebutton = new ButtonComponent(cMoreMenu);
  morebutton
    .setClass("editingToolbarCommandItem")
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
  plugin.setIS_MORE_Button(false);
  return cMoreMenu;
}

export function quiteFormatbrushes(plugin: editingToolbarPlugin) {
  plugin.quiteAllFormatBrushes();
}


export function setFormateraser(plugin: editingToolbarPlugin, editor: Editor) {
  // const editor = app.workspace.activeLeaf.view?.editor;

  let selectText = editor.getSelection();
  if (!selectText || selectText.trim() === "") {
    return;
  }
  //const cursor = editor.getCursor();
  // if (selectText == null || selectText == "") {
  //   quiteFormatbrushes(plugin);
  //   plugin.setEN_Text_Format_Brush(true);
  //   plugin.Temp_Notice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);

  // } else {
  // 处理 callout 格式
  // 处理最外层的 callout 格式，每次只脱一层壳
   // 检查是否是 callout 格式
   if (selectText.match(/^>\s*\[\![\w\s]*\]/m)) {
    // 处理 callout 格式
    let lines = selectText.split('\n');
    let result = [];
    let inCallout = false;
    let calloutLevel = 0;
    let foundFirstCallout = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // 检测 callout 开始
        let calloutMatch = line.match(/^(>+)\s*\[\!([\w\s]*)\]\s*(.*?)$/);
        if (calloutMatch && !foundFirstCallout) {
            // 找到第一个 callout，记录其级别
            calloutLevel = calloutMatch[1].length;
            foundFirstCallout = true;
            
            // 如果有标题，保留标题
            if (calloutMatch[3].trim()) {
                result.push(calloutMatch[3].trim());
            }
            
            inCallout = true;
            continue;
        }
        
        // 处理 callout 内容
        if (inCallout) {
            let linePrefix = line.match(/^(>+)\s*/);
            if (linePrefix && linePrefix[1].length >= calloutLevel) {
                // 这行是当前 callout 的一部分
                // 去除与当前 callout 级别相同的前缀
                let newLine = line.replace(new RegExp(`^>{${calloutLevel}}\\s*`), '');
                
                // 如果有更深层次的 >，保留它们
                result.push(newLine);
            } else {
                // 这行不是当前 callout 的一部分
                inCallout = false;
                result.push(line);
            }
        } else {
            result.push(line);
        }
    }
    
    editor.replaceSelection(result.join('\n'));
    return;
}

  let mdText = /(^#+\s|^#(?=\s)|^\>|^\- \[( |x)\]|^\+ |\<[^\<\>]+?\>|^1\. |^\s*\- |^\-+$|^\*+$)/mg;
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

  //editor.setSelection(cursor);


 
  //app.commands.executeCommandById("editor:clear-formatting");


}

export function createFollowingbar(app: App, settings: editingToolbarSettings, editor: Editor) {
  let editingToolbarModalBar = isExistoolbar(app, settings);

  const view = app.workspace.getActiveViewOfType(ItemView);
  if (!ViewUtils.isAllowedViewType(view)) {
    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "hidden";
    }
    return;
  }

  if (ViewUtils.isSourceMode(view)) {
    if (editingToolbarModalBar) {
      // const editor = app.workspace.activeLeaf.view?.editor;

      editingToolbarModalBar.style.visibility = editor.somethingSelected() ? "visible" : "hidden";
      editingToolbarModalBar.style.height = (settings.aestheticStyle === "tiny") ? 30 + "px" : 40 + "px";
      editingToolbarModalBar.addClass("editingToolbarFlex");
      editingToolbarModalBar.removeClass("editingToolbarGrid");

      if (editingToolbarModalBar.style.visibility === "visible") {

        const editorRect = editor.containerEl.getBoundingClientRect();
        const toolbarWidth = editingToolbarModalBar.offsetWidth;
        const toolbarHeight = editingToolbarModalBar.offsetHeight;
        const coords = getCoords(editor);
        const isSelectionFromBottomToTop = editor.getCursor("head").ch == editor.getCursor("from").ch;
        const rightMargin = 12;

        const sideDockWidth = activeDocument.getElementsByClassName("mod-left-split")[0]?.clientWidth ?? 0;
        const sideDockRibbonWidth = activeDocument.getElementsByClassName("side-dock-ribbon mod-left")[0]?.clientWidth ?? 0;
        const leftSideDockWidth = sideDockWidth + sideDockRibbonWidth;

        let leftPosition = coords.left - leftSideDockWidth;
        if (leftPosition + toolbarWidth + rightMargin >= editorRect.right)
          leftPosition = Math.max(0, editorRect.right - toolbarWidth - leftSideDockWidth - rightMargin);

        let topPosition = 0;

        if (isSelectionFromBottomToTop) {
          topPosition = coords.top - toolbarHeight - 10;
          if (topPosition <= editorRect.top) topPosition = editorRect.top + toolbarHeight;
        } else {
          topPosition = coords.top + 25;
          if (topPosition >= editorRect.bottom - toolbarHeight) topPosition = editorRect.bottom - 2 * toolbarHeight;
        }

        editingToolbarModalBar.style.left = leftPosition + "px";
        editingToolbarModalBar.style.top = topPosition + "px";
      }
    }
  } else {
    editingToolbarModalBar.style.visibility = "hidden";
  }
}

export function editingToolbarPopover(app: App, plugin: editingToolbarPlugin): void {
  let settings = plugin.settings;
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;

  function createMenu() {
    const generateMenu = () => {
      let btnwidth = 0;
      let leafwidth = 0;
      let editingToolbar = createEl("div");
      if (editingToolbar) {
        if (settings.positionStyle == "top") {
          editingToolbar.setAttribute(
            "style",
            `position: relative; grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));`
          );
          editingToolbar.className += " top";
          if (settings.autohide) {
            editingToolbar.className += " autohide";
          }
        } else if (settings.positionStyle == "following") {
          editingToolbar.style.visibility = "hidden"
        }
      }
      editingToolbar.setAttribute("id", "editingToolbarModalBar");
      //二级弹出菜单

      let PopoverMenu = createEl("div");
      PopoverMenu.addClass("editingToolbarpopover");
      PopoverMenu.addClass("editingToolbarTinyAesthetic");
      PopoverMenu.setAttribute("id", "editingToolbarPopoverBar");
      PopoverMenu.style.visibility = "hidden";
      PopoverMenu.style.height = "0";
      if (settings.aestheticStyle == "default") {
        editingToolbar.addClass("editingToolbarDefaultAesthetic");
        editingToolbar.removeClass("editingToolbarTinyAesthetic");
        editingToolbar.removeClass("editingToolbarGlassAesthetic");
      } else if (settings.aestheticStyle == "tiny") {
        editingToolbar.addClass("editingToolbarTinyAesthetic");
        editingToolbar.removeClass("editingToolbarDefaultAesthetic");
        editingToolbar.removeClass("editingToolbarGlassAesthetic");
      } else {
        editingToolbar.addClass("editingToolbarGlassAesthetic");
        editingToolbar.removeClass("editingToolbarTinyAesthetic");
        editingToolbar.removeClass("editingToolbarDefaultAesthetic");
      }

      //  if (settings.positionStyle == "following") {
      //    editingToolbar.style.visibility = "hidden";
      // }

      if (settings.positionStyle == "top") {
        let currentleaf = app.workspace.activeLeaf.view.containerEl;

        // 尝试获取 markdown 视图或 canvas 视图，并指定为 HTMLElement 类型
        const markdownDom = currentleaf?.querySelector<HTMLElement>(".markdown-source-view");
        const canvasDom = currentleaf?.querySelector<HTMLElement>(".canvas-wrapper");
        const excalidrawDom = currentleaf?.querySelector<HTMLElement>(".excalidraw-wrapper");

        // 确定要插入工具栏的目标元素
        const targetDom = markdownDom || canvasDom || excalidrawDom;

        if (!targetDom) return;

        // 只有在没有工具栏时才添加 PopoverMenu
        if (!currentleaf?.querySelector("#editingToolbarPopoverBar")) {
          targetDom.insertAdjacentElement("afterbegin", PopoverMenu);
        }

        // 添加编辑工具栏
        targetDom.insertAdjacentElement("afterbegin", editingToolbar);

        // 获取宽度
        leafwidth = targetDom?.offsetWidth;

      } else if (settings.appendMethod == "body") {
        activeDocument.body.appendChild(editingToolbar);
      } else if (settings.appendMethod == "workspace") {
        activeDocument.body
          ?.querySelector(".mod-vertical.mod-root")
          .insertAdjacentElement("afterbegin", editingToolbar);
      }

      let editingToolbarPopoverBar = app.workspace.activeLeaf.view.containerEl
        ?.querySelector("#editingToolbarPopoverBar") as HTMLElement;
      
      // 使用plugin.getCurrentCommands()获取当前位置样式对应的命令配置
      const currentCommands = plugin.getCurrentCommands();
      
      currentCommands.forEach((item, index) => {
        let tip;
        if ("SubmenuCommands" in item) {
          let _btn: any;

          if (btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
            //说明已经溢出
            plugin.setIS_MORE_Button(true);
            // globalThis.IS_MORE_Button = true; //需要添加更多按钮
            _btn = new ButtonComponent(editingToolbarPopoverBar);
          } else _btn = new ButtonComponent(editingToolbar);

          _btn.setClass("editingToolbarCommandsubItem" + index);
          if (index >= settings.cMenuNumRows) {
            _btn.setClass("editingToolbarSecond");
          }
          else {
            if (settings.positionStyle != "top")
              _btn.buttonEl.setAttribute('aria-label-position', 'top')
          }

          checkHtml(item.icon)
            ? (_btn.buttonEl.innerHTML = item.icon)
            : _btn.setIcon(item.icon);

          // let __btnwidth;
          // if (_btn.buttonEl.offsetWidth > 100) __btnwidth = 26;
          // else {
          //   if (_btn.buttonEl.offsetWidth < 26) __btnwidth = 26;
          //   else __btnwidth = _btn.buttonEl.offsetWidth;
          // }
          btnwidth += 26 + 2;
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

                    app.commands.executeCommandById(subitem.id);

                    if (settings.cMenuVisibility == false)
                      editingToolbar.style.visibility = "hidden";
                    else {
                      if (settings.positionStyle == "following") {
                        editingToolbar.style.visibility = "hidden";
                      } else editingToolbar.style.visibility = "visible";
                    }
                  });
                if (index < settings.cMenuNumRows) {
                  if (settings.positionStyle != "top")
                    sub_btn.buttonEl.setAttribute('aria-label-position', 'top')
                }
                if (subitem.id == "editingToolbar-Divider-Line")
                  sub_btn.setClass("editingToolbar-Divider-Line");
                checkHtml(subitem.icon)
                  ? (sub_btn.buttonEl.innerHTML = subitem.icon)
                  : sub_btn.setIcon(subitem.icon);

                _btn.buttonEl.insertAdjacentElement("afterbegin", submenu);
              }
            );
          }
        } else {
          if (item.id == "editing-toolbar:change-font-color") {
            let button2 = new ButtonComponent(editingToolbar);
            button2
              .setClass("editingToolbarCommandsubItem-font-color")
              .setTooltip(t("Font Colors"))
              .onClick(() => {

                app.commands.executeCommandById(item.id);
                if (settings.cMenuVisibility == false)
                  editingToolbar.style.visibility = "hidden";
                else {
                  if (settings.positionStyle == "following") {
                    editingToolbar.style.visibility = "hidden";
                  } else editingToolbar.style.visibility = "visible";
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
              submenu2.innerHTML = colorpicker(plugin);

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              //    if (settings.cMenuFontColor)
              //     activeDocument.getElementById("change-font-color-icon").style.fill = settings.cMenuFontColor;
              createTablecell(app, plugin, "x-color-picker-table");
              let el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              let button3 = new ButtonComponent(el);
              button3
                .setIcon("paintbrush")
                .setTooltip(t("Format Brush"))
                .onClick(() => {
                  quiteFormatbrushes(plugin);
                  plugin.setEN_FontColor_Format_Brush(true);
                  //  globalThis.EN_FontColor_Format_Brush = true;
                  plugin.Temp_Notice = new Notice(
                    t("Font-Color formatting brush ON!"),
                    0
                  );

                });
              let button4 = new ButtonComponent(el);
              button4
                .setIcon("palette")
                .setTooltip(t("Custom Font Color"))
                .onClick(() => {
                  app.setting.open();
                  app.setting.openTabById("editing-toolbar");
                  setTimeout(() => {
                    // 获取标签页容器
                    const tabsContainer = app.setting.activeTab.containerEl.querySelector(".editing-toolbar-tabs");
                    if (tabsContainer) {
                      // 获取第二个标签页按钮(appearance)并触发点击
                      const appearanceTab = tabsContainer.children[1] as HTMLElement;
                      appearanceTab?.click();

                      // 等待标签页切换完成后定位到颜色设置
                      setTimeout(() => {
                        let settingEI = app.setting.activeTab.containerEl.querySelector(".custom_font");
                        if (settingEI) { settingEI.addClass?.("toolbar-cta"); }
                      }, 100);
                    }
                  }, 200);

                });
            }
          } else if (item.id == "editing-toolbar:change-background-color") {
            let button2 = new ButtonComponent(editingToolbar);
            button2
              .setClass("editingToolbarCommandsubItem-font-color")
              .setTooltip(t("Background color"))
              .onClick(() => {

                app.commands.executeCommandById(item.id);
                if (settings.cMenuVisibility == false)
                  editingToolbar.style.visibility = "hidden";
                else {
                  if (settings.positionStyle == "following") {
                    editingToolbar.style.visibility = "hidden";
                  } else editingToolbar.style.visibility = "visible";
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
              submenu2.innerHTML = backcolorpicker(plugin);

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              // if (plugin.settings.cMenuBackgroundColor)
              //  activeDocument.getElementById("change-background-color-icon").style.fill = plugin.settings.cMenuBackgroundColor;
              createTablecell(app, plugin, "x-backgroundcolor-picker-table");
              let el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              let button3 = new ButtonComponent(el);
              button3
                .setIcon("paintbrush")
                .setTooltip(t("Format Brush"))
                .onClick(() => {
                  quiteFormatbrushes(plugin);
                  plugin.setEN_BG_Format_Brush(true);
                  //  globalplugin.EN_BG_Format_Brush = true;
                  plugin.Temp_Notice = new Notice(
                    t("Font-Color formatting brush ON!"),
                    0
                  );

                });
              let button4 = new ButtonComponent(el);
              button4
                .setIcon("palette")
                .setTooltip(t("Custom Backgroud Color"))
                .onClick(() => {
                  app.setting.open();
                  app.setting.openTabById("editing-toolbar");
                  setTimeout(() => {
                    // 获取标签页容器
                    const tabsContainer = app.setting.activeTab.containerEl.querySelector(".editing-toolbar-tabs");
                    if (tabsContainer) {
                      // 获取第二个标签页按钮(appearance)并触发点击
                      const appearanceTab = tabsContainer.children[1] as HTMLElement;
                      appearanceTab?.click();

                      // 等待标签页切换完成后定位到颜色设置
                      setTimeout(() => {
                        let settingEI = app.setting.activeTab.containerEl.querySelector(".custom_bg");
                        if (settingEI) { settingEI.addClass?.("toolbar-cta"); }
                      }, 100);
                    }
                  }, 200);

                });

            }
          } else {
            let button;
            if (btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
              //说明已经溢出
              plugin.setIS_MORE_Button(true);
              //globalpluginIS_MORE_Button = true; //需要添加更多按钮
              button = new ButtonComponent(editingToolbarPopoverBar);
            } else button = new ButtonComponent(editingToolbar);
            let hotkey = getHotkey(app, item.id);
            hotkey == "–" ? tip = item.name : tip = item.name + "(" + hotkey + ")";
            button.setTooltip(tip).onClick(() => {
              app.commands.executeCommandById(item.id);
              if (settings.cMenuVisibility == false)
                editingToolbar.style.visibility = "hidden";
              else {
                if (settings.positionStyle == "following") {
                  editingToolbar.style.visibility = "hidden";
                } else editingToolbar.style.visibility = "visible";
              }
            });

            button.setClass("editingToolbarCommandItem");
            if (index >= settings.cMenuNumRows) {

              button.setClass("editingToolbarSecond");
            } else {
              if (settings.positionStyle != "top")
                button.buttonEl.setAttribute('aria-label-position', 'top')
            }
            if (item.id == "editingToolbar-Divider-Line")
              button.setClass("editingToolbar-Divider-Line");
            checkHtml(item.icon)
              ? (button.buttonEl.innerHTML = item.icon)
              : button.setIcon(item.icon);
            //let __btnwidth2;
            // if (button.buttonEl.offsetWidth > 100) __btnwidth2 = 26;
            // else {
            //   if (button.buttonEl.offsetWidth < 26) __btnwidth2 = 26;
            //   else __btnwidth2 = button.buttonEl.offsetWidth;
            // }

            btnwidth += 26;
          }
        }
      });

      createMoremenu(app, plugin, editingToolbar);
      if (Math.abs(plugin.settings.cMenuWidth - Number(btnwidth)) > 30) {
        plugin.settings.cMenuWidth = Number(btnwidth);
        setTimeout(() => {
          plugin.saveSettings();
        }, 100);
      }
    };
    if (!plugin.isLoadMobile()) return;
    const view = app.workspace.getActiveViewOfType(ItemView);
    if (ViewUtils.isAllowedViewType(view)) {
      //  let Markdown = app.workspace.getActiveViewOfType(MarkdownView);
      // if (Markdown) {
      if (isExistoolbar(app, plugin.settings)) return;

      generateMenu();

      setHorizontalValue(plugin.settings);
      setBottomValue(plugin.settings);
      setsvgColor(settings.cMenuFontColor, settings.cMenuBackgroundColor)

    } else {
      //  selfDestruct();
      return;
    }

  }

  createMenu();
}

function setsvgColor(fontcolor: string, bgcolor: string) {
  requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  let font_colour_dom = activeDocument.querySelectorAll("#change-font-color-icon")
  if (font_colour_dom) {
    font_colour_dom.forEach(element => {
      let ele = element as HTMLElement
      ele.style.fill = fontcolor;
    });
  }

  let background_colour_dom = activeDocument.querySelectorAll("#change-background-color-icon")
  if (background_colour_dom) {
    background_colour_dom.forEach(element => {
      let ele = element as HTMLElement
      ele.style.fill = bgcolor;
    });
  }

}
