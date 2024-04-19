import EditingToolbarPlugin from "../../main";
import { isExistoolbar } from "../../modals/common";
import { createCMenuToolbarPopover } from "../../modals/createCMenuTollbarPopover";

export function patchThinoEvent(plugin: EditingToolbarPlugin) {
    //@ts-ignore
    const isThinoEnabled = app.plugins.enabledPlugins.has("obsidian-memos");
    //@ts-ignore
    if (isThinoEnabled) plugin.registerEvent(plugin.app.workspace.on("thino-editor-created", () => {
        if (plugin.settings.cMenuVisibility == true) {
            //const view = plugin.app.workspace.getActiveViewOfType(ItemView);
            //console.log(view?.getViewType() )
            //   const type= plugin.app.workspace.activeLeaf.getViewState().type
            //   console.log(type,"active-leaf-chang" )
            //  let view =   true

            let toolbar = isExistoolbar(plugin)
            // if(view)


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
                    // console.log("cMenuToolbarPopover begin...")
                    createCMenuToolbarPopover(plugin)
                }, 100);
            }

        }
    }));

}