import EditingToolbarPlugin from "../../main";
import { isExistoolbar } from "../../modals/common"
import changeFontColor from "../commands/change-font-color"
import changeBackgroundColor from "../commands/change-background-color"
import { setFormateraser } from "../../modals/cMenuToolbarModal";
import { createFollowingbar } from "../../modals/createFollowingbar";

export function setupDomEvents(container: Document, plugin: EditingToolbarPlugin) {
    plugin.EN_FontColor_Format_Brush = false;
    plugin.EN_BG_Format_Brush = false;
    plugin.EN_Text_Format_Brush = false;

    plugin.registerDomEvent(container, "mouseup", async (e: { button: any; }) => {
        if (e.button) {
            if (plugin.EN_FontColor_Format_Brush || plugin.EN_BG_Format_Brush || plugin.EN_Text_Format_Brush) {
                if (plugin.Temp_Notice) plugin.Temp_Notice.hide();
                plugin.setEN_BG_Format_Brush(false);
                plugin.setEN_FontColor_Format_Brush(false);
                plugin.setEN_Text_Format_Brush(false);
            }
        }

        if (!plugin.isView()) return;

        let cmEditor = plugin.getActiveEditor()
        if (!cmEditor) return

        if (cmEditor.hasFocus()) {
            let cMenuToolbarModalBar = isExistoolbar(plugin);

            if (cmEditor.getSelection() == null || cmEditor.getSelection() == "") {
                if (cMenuToolbarModalBar && plugin.settings.positionStyle == "following")
                    cMenuToolbarModalBar.style.visibility = "hidden";
                return
            } else {
                //   console.log(plugin.EN_FontColor_Format_Brush,'EN_FontColor_Format_Brush')
                if (plugin.EN_FontColor_Format_Brush) {
                    const command = await changeFontColor(plugin)
                    if (command.callback) {
                        command.callback()
                    }
                } else if (plugin.EN_BG_Format_Brush) {
                    const command = await changeBackgroundColor(plugin)
                    if (command.callback) {
                        command.callback()
                    }
                } else if (plugin.EN_Text_Format_Brush) {
                    setFormateraser(plugin);
                } else if (plugin.settings.positionStyle == "following") {
                    createFollowingbar(plugin);
                }
            }
        } else if (plugin.EN_FontColor_Format_Brush || plugin.EN_BG_Format_Brush || plugin.EN_Text_Format_Brush) {
            if (plugin.Temp_Notice) plugin.Temp_Notice.hide();
            plugin.setEN_BG_Format_Brush(false);
            plugin.setEN_FontColor_Format_Brush(false);
            plugin.setEN_Text_Format_Brush(false);
        }
    });

    plugin.registerDomEvent(activeDocument, "keydown", (e) => {
        if (plugin.settings.positionStyle !== "following") return;
        const cMenuToolbarModalBar = isExistoolbar(plugin);
        if (!e.shiftKey && cMenuToolbarModalBar) cMenuToolbarModalBar.style.visibility = "hidden";
    });

    plugin.registerDomEvent(activeDocument, "wheel", () => {
        if (plugin.settings.positionStyle !== "following") return;
        const cMenuToolbarModalBar = isExistoolbar(plugin);
        if (cMenuToolbarModalBar) cMenuToolbarModalBar.style.visibility = "hidden";
    });
}