import { type Command, MarkdownView } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function fullscreenFocus(plugin: EditingToolbarPlugin): Command {
    const name = "Fullscreen Focus"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: appIcons["fullscreen"],
        hotkeys: [{ modifiers: ["Mod", "Shift"], key: "F11" }],
        callback: async () => {
            let DOC_EL = document.documentElement;
            let headEl = DOC_EL.querySelector('head');
            let styleEl = document.createElement('style');
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
            let el = leaf.containerEl;
            let modroot = document.body?.querySelector(".mod-vertical.mod-root .workspace-tab-container") as HTMLElement
            let fullscreenMutationObserver: MutationObserver;
            fullscreenMutationObserver = new MutationObserver(function (mutationRecords) {
                mutationRecords.forEach(function (mutationRecord) {
                    mutationRecord.addedNodes.forEach(function (node) {
                        if (isFull(modroot)) {
                            try {

                                document.body.removeChild(node);
                                el.appendChild(node);
                            } catch (error) {
                                console.log(error)
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

            function getCurrentElement(el: HTMLElement) {
                return el instanceof HTMLElement ? el : DOC_EL;
            }
            function beFull(el: HTMLElement) {
                //@ts-ignore
                return getCurrentElement(el)[TYPE_REQUEST_FULL_SCREEN]();
            }
            function exitFull() {
                if (DOC_EL.contains(styleEl)) {
                    headEl === null || headEl === void 0 ? void 0 : headEl.removeChild(styleEl);
                }
                //@ts-ignore
                return document[TYPE_EXIT_FULL_SCREEN]();
            }
            function isFull(el: any) {
                //@ts-ignore
                return getCurrentElement(el) === document[TYPE_FULL_SCREEN_ELEMENT];
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

    }
}