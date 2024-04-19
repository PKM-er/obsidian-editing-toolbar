import { MarkdownView } from "obsidian";
import EditingToolbarPlugin from "../../main";
import { createCMenuToolbarPopover } from "../../modals/createCMenuTollbarPopover";
import { resetToolbar } from "../../modals/cMenuToolbarModal";
import { isSource } from "../../modals/common";

export function setupResizeEvent(plugin: EditingToolbarPlugin) {
    plugin.registerEvent(plugin.app.workspace.on("resize", () => {
        if (plugin.settings.cMenuVisibility == true && plugin.settings.positionStyle == "top") {
            if (isSource(plugin)) {
                //@ts-ignore
                let leafwidth = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.leaf.view.width ?? 0
                //let leafwidth = view.containerEl?.querySelector<HTMLElement>(".markdown-source-view").offsetWidth ?? 0
                if (plugin.Leaf_Width == leafwidth) return false;
                if (leafwidth > 0) {
                    plugin.Leaf_Width = leafwidth
                    if (plugin.settings.cMenuWidth && leafwidth) {
                        if ((leafwidth - plugin.settings.cMenuWidth) < 78 && (leafwidth > plugin.settings.cMenuWidth))
                            return;
                        else {
                            setTimeout(() => {
                                resetToolbar()
                                createCMenuToolbarPopover(plugin)
                            }, 200)
                        }
                    }
                }

            }
        } else {
            return false;
        }
    }));
}