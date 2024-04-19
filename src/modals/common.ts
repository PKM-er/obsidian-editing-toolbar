import { App, MarkdownView, WorkspaceParent, WorkspaceWindow } from "obsidian";
import EditingToolbarPlugin from "../main";

export function isExistoolbar(plugin: EditingToolbarPlugin): HTMLElement | null {
    const activeDocument = plugin.getActiveDocument()
    let container = plugin.settings.positionStyle == "top" ? app.workspace.activeLeaf?.view.containerEl?.querySelector("#cMenuToolbarModalBar")
        : activeDocument.getElementById("cMenuToolbarModalBar");
    return (container) ? container as HTMLElement : null;
}



export const getNestedObject = (nestedObj: any, pathArr: any[]) => {
    return pathArr.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
}

export function setHilite(keys: any, how: string) {
    // need to check if existing key combo is overridden by undefining it
    if (keys && keys[1][0] !== undefined) {
        return how + keys.flat(2).join('+').replace('Mod', 'Ctrl') + how;
    } else {
        return how + '–' + how;
    }
}

export function getHotkey(app: App, cmdid: string, highlight = true) {
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

export function isSource(plugin: EditingToolbarPlugin) {
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView); // 获取当前活动的 leaf

    if (activeView) {
        return activeView.getMode() === "source"; // 检查当前 view 的模式是否是 "source"
    }
    return false; // 如果未能获取到合适的 view，返回 false
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

export function getRootSplits(plugin: EditingToolbarPlugin) {

    const rootSplits = [];

    // push the main window's root split to the list
    rootSplits.push(app.workspace.rootSplit as WorkspaceParent)

    // @ts-ignore floatingSplit is undocumented
    const floatingSplit = plugin.app.workspace.floatingSplit as WorkspaceParentExt;
    floatingSplit?.children.forEach((child: any) => {
        // if this is a window, push it to the list
        if (child instanceof WorkspaceWindow) {
            rootSplits.push(child);
        }
    });

    return rootSplits;
}

export function quiteFormatbrushes(plugin: EditingToolbarPlugin) {
    if (plugin.Temp_Notice) plugin.Temp_Notice.hide();
    plugin.setEN_BG_Format_Brush(false);
    plugin.setEN_FontColor_Format_Brush(false);
    plugin.setEN_Text_Format_Brush(false);
}

export function setsvgColor(plugin: EditingToolbarPlugin, fontcolor: string, bgcolor: string) {
    const activeDocument = plugin.getActiveDocument()
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