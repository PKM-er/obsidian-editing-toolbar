import { App, MarkdownView, requireApiVersion } from "obsidian";
let activeDocument: Document;
export function workplacefullscreenMode(app: App) {
    requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
    const currentleaf = activeDocument;


    if (app.workspace.leftSplit.collapsed && app.workspace.rightSplit.collapsed) {
        app.commands.executeCommandById("app:toggle-right-sidebar");
        app.commands.executeCommandById("app:toggle-left-sidebar");
        app.workspace.leftRibbon.show()

        if (currentleaf.body.classList.contains('auto-hide-header')) {

            currentleaf.body.classList.remove('auto-hide-header');
        }
    }
    else {

        if (!currentleaf.body.classList.contains('auto-hide-header')) {


            currentleaf.body.classList.add('auto-hide-header');
        }
        app.workspace.leftRibbon.hide()
        if (!app.workspace.leftSplit.collapsed) {
            app.commands.executeCommandById("app:toggle-left-sidebar");

        }
        if (!app.workspace.rightSplit.collapsed) {
            app.commands.executeCommandById("app:toggle-right-sidebar");
        }
    }


}


//full screen mode
export function fullscreenMode(app: App) {


    const DOC_EL = document.documentElement;
    let TYPE_REQUEST_FULL_SCREEN = 'requestFullscreen';
    let TYPE_EXIT_FULL_SCREEN = 'exitFullscreen';
    let TYPE_FULL_SCREEN_ELEMENT = 'fullscreenElement';
    let TYPE_ON_FULL_SCREEN_CHANGE = 'onfullscreenchange';
    if ("webkitRequestFullScreen" in DOC_EL) {
        TYPE_REQUEST_FULL_SCREEN = 'webkitRequestFullScreen';
        TYPE_EXIT_FULL_SCREEN = 'webkitExitFullscreen';
        TYPE_FULL_SCREEN_ELEMENT = 'webkitFullscreenElement';
        TYPE_ON_FULL_SCREEN_CHANGE = 'onwebkitfullscreenchange';
    }
    else if ("msRequestFullscreen" in DOC_EL) {
        TYPE_REQUEST_FULL_SCREEN = 'msRequestFullscreen';
        TYPE_EXIT_FULL_SCREEN = 'msExitFullscreen';
        TYPE_FULL_SCREEN_ELEMENT = 'msFullscreenElement';
        TYPE_ON_FULL_SCREEN_CHANGE = 'MSFullscreenChange';
    }
    else if ("mozRequestFullScreen" in DOC_EL) {
        TYPE_REQUEST_FULL_SCREEN = 'mozRequestFullScreen';
        TYPE_EXIT_FULL_SCREEN = 'mozCancelFullScreen';
        TYPE_FULL_SCREEN_ELEMENT = 'mozFullScreenElement';
        TYPE_ON_FULL_SCREEN_CHANGE = 'onmozfullscreenchange';
    }
    else if (!("requestFullscreen" in DOC_EL)) {
        // throw "\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301Fullscreen API !";
        console.log("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301Fullscreen API !");
    }
    const leaf = app.workspace.getActiveViewOfType(MarkdownView)
    if (!leaf)
        return;
    const el = leaf.containerEl;
    const modroot = document.body?.querySelector(".mod-vertical.mod-root .workspace-tab-container") as HTMLElement
    let fullscreenMutationObserver: MutationObserver;
    fullscreenMutationObserver = new MutationObserver(function (mutationRecords) {
        mutationRecords.forEach(function (mutationRecord) {
            mutationRecord.addedNodes.forEach(function (node) {
                if (isFull(modroot)) {
                    try {

                        document.body.removeChild(node);
                        el.appendChild(node);
                    } catch (error) {
                        console.log(error.message)
                    }

                } else {
                    return;
                }
            });
        });

    });
    modroot.addEventListener("fullscreenchange", function () {
        if (!isFull(modroot)) {
            fullscreenMutationObserver.disconnect();
        }
    });
    if (isFull(modroot)) {
        fullscreenMutationObserver.disconnect();

        exitFull()

    } else {

        beFull(modroot)
        fullscreenMutationObserver.observe(document.body, { childList: true });

    }

    // 添加类型定义
    interface HTMLElementWithFullscreen extends HTMLElement {
      [key: string]: any;
    }

    interface DocumentWithFullscreen extends Document {
      [key: string]: any;
    }

    // 修改相关代码
    function getCurrentElement(el: HTMLElement): HTMLElementWithFullscreen {
      return el as HTMLElementWithFullscreen;
    }

    function beFull(el: HTMLElement) {

        return getCurrentElement(el)[TYPE_REQUEST_FULL_SCREEN]();
    }
    exports.beFull = beFull;
    function exitFull() {
        return (document as DocumentWithFullscreen)[TYPE_EXIT_FULL_SCREEN]();
    }
    function isFull(el: any) {
        return getCurrentElement(el) === (document as DocumentWithFullscreen)[TYPE_FULL_SCREEN_ELEMENT];
    }
    function toggleFull(el: any) {
        if (isFull(el)) {
            exitFull();
            return false;
        }
        else {
            beFull(el);
            return true;
        }
    }
}

