import EditingToolbarPlugin from "../../main";
import { isExistoolbar, isSource } from "../../modals/common";
import { createCMenuToolbarPopover } from "../../modals/createCMenuTollbarPopover";

export function setupLayoutChangeEvent(plugin: EditingToolbarPlugin) {
    plugin.registerEvent(plugin.app.workspace.on("layout-change", () => {
        if (plugin.settings.cMenuVisibility == true) {
            let cMenuToolbarModalBar = isExistoolbar(plugin)
            // console.log(cMenuToolbarModalBar,"cMenuToolbarModalBar" )
            //let view = plugin.app.workspace.getActiveViewOfType(MarkdownView) || true
            let view = true
            if (!isSource(plugin) || (!view)) //no source mode
            {
                if (cMenuToolbarModalBar) {
                    cMenuToolbarModalBar.style.visibility = "hidden"
                }
            }
            else if (isSource(plugin)) {
                if (cMenuToolbarModalBar) {
                    if (plugin.settings.positionStyle == "following")
                        cMenuToolbarModalBar.style.visibility = "hidden"
                    else {
                        cMenuToolbarModalBar.style.visibility = "visible"
                    }

                } else {
                    // console.log("cMenuToolbarPopover begin..." )
                    setTimeout(() => {
                        createCMenuToolbarPopover(plugin)
                    }, 100);
                }


            }

        } else {
            return false;
        }
    }));
}

