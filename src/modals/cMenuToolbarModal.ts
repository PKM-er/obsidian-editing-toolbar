import type EditingToolbarPlugin from "../main";
import { App, Notice, requireApiVersion, ItemView, ButtonComponent, WorkspaceParent, WorkspaceWindow, MarkdownView } from "obsidian";
import { setBottomValue } from "../obsidian/common/statusBar";
import { backcolorpicker, colorpicker } from "../utils/util";
import { t } from "../translations/helper";
import { EditingToolbarSettings } from "../settings/settingsData";
import { setFontColor } from "../obsidian/commands/change-font-color";
import { setBackgroundcolor } from "../obsidian/commands/change-background-color";
import { getRootSplits, quiteFormatbrushes } from "./common";


export function resetToolbar() {
    requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
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

export function selfDestruct(plugin: EditingToolbarPlugin) {
    const activeDocument = plugin.getActiveDocument()
    const toolBarElement = activeDocument.getElementById("cMenuToolbarModalBar");
    if (toolBarElement) toolBarElement.remove();
    const rootSplits = getRootSplits(plugin);
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
        rootSplits.forEach((rootSplit: any) => {
            if (rootSplit?.containerEl)
                clearToolbar(rootSplit?.containerEl)
        });

}


export function createMoremenu(plugin: EditingToolbarPlugin, selector: HTMLDivElement) {
    // let  issubmenu= activeDocument.getElementById("cMenuToolbarModalBar").querySelector('.'+selector);
    // let barHeight = activeDocument.getElementById("cMenuToolbarModalBar").offsetHeight;
    // requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
    //let Morecontainer = activeDocument.body?.querySelector(".workspace-leaf.mod-active")?.querySelector("#cMenuToolbarPopoverBar") as HTMLElement;
    // let view = app.workspace.getActiveViewOfType(MarkdownView)
    const view = plugin.app.workspace.getActiveViewOfType(ItemView);
    if (view?.getViewType() === "markdown" || view?.getViewType() === "thino_view") {
        let Morecontainer = view.containerEl.querySelector("#cMenuToolbarPopoverBar") as HTMLElement
        if (!plugin.IS_MORE_Button) return;
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
        plugin.setIS_MORE_Button(false);
        return cMoreMenu;
    }
}



export function setFormateraser(plugin: EditingToolbarPlugin) {
    const editor = plugin.getActiveEditor()
    if (!editor) {
        return
    }

    let selectText = editor.getSelection();
    if (selectText == null || selectText == "") {
        quiteFormatbrushes(plugin);
        plugin.setEN_Text_Format_Brush(true);
        // globalThis.EN_Text_Format_Brush = true;
        if (plugin.Temp_Notice) {
            if (plugin.Temp_Notice.noticeEl.innerText != t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"))
                plugin.Temp_Notice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);
        }
        else plugin.Temp_Notice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);

    } else {
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
        app.commands.executeCommandById("editor:focus");

    }
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
