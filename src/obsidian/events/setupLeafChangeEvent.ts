import EditingToolbarPlugin from "../../main";
import { isExistoolbar } from "../../modals/common";
import { createCMenuToolbarPopover } from "../../modals/createCMenuTollbarPopover";

export function setupLeafChangeEvent(plugin: EditingToolbarPlugin) {
    plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", () => {
        if (plugin.settings.cMenuVisibility == true) {
            let toolbar = isExistoolbar(plugin)

            if (toolbar) {
                if (plugin.settings.positionStyle != "following") {
                    try {
                        toolbar.style.visibility = "visible";
                    } catch (err) {
                        console.log(toolbar, "toolbar_error");
                    }
                } else {
                    try {
                        toolbar.style.visibility = "hidden";
                    } catch (err) {
                        console.log(toolbar, "toolbar_error");
                    }
                }

            } else {

                setTimeout(() => {
                    createCMenuToolbarPopover(plugin)
                }, 100);
            }

        }
    }))
}