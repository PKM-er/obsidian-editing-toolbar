import EditingToolbarPlugin from "../main";
import { getCoords, isExistoolbar, isSource } from "./common";

export const createFollowingbar = (plugin: EditingToolbarPlugin) => {
    let cMenuToolbarModalBar = isExistoolbar(plugin);

    if (isSource(plugin)) {
        if (cMenuToolbarModalBar) {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            cMenuToolbarModalBar.style.visibility = editor.somethingSelected() ? "visible" : "hidden";
            cMenuToolbarModalBar.style.height = (plugin.settings.aestheticStyle === "tiny") ? 30 + "px" : 40 + "px";
            cMenuToolbarModalBar.addClass("cMenuToolbarFlex");
            cMenuToolbarModalBar.removeClass("cMenuToolbarGrid");

            if (cMenuToolbarModalBar.style.visibility === "visible") {
                // @ts-ignore
                const editorRect = editor.containerEl.getBoundingClientRect();
                const toolbarWidth = cMenuToolbarModalBar.offsetWidth;
                const toolbarHeight = cMenuToolbarModalBar.offsetHeight;
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

                cMenuToolbarModalBar.style.left = leftPosition + "px";
                cMenuToolbarModalBar.style.top = topPosition + "px";
            }
        }
    } else if (cMenuToolbarModalBar) {
        cMenuToolbarModalBar.style.visibility = "hidden"
    }
}