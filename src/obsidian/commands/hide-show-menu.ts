import type { Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { setMenuVisibility } from "../common/statusBar";

export default function hideOrShowMenu(plugin: EditingToolbarPlugin): Command {
    return {
        id: "hide-show-menu",
        name: "Hide/show ",
        icon: "cMenuToolbar",
        callback: async () => {
            plugin.settings.cMenuVisibility = !plugin.settings.cMenuVisibility;
            plugin.settings.cMenuVisibility == true
                ? setTimeout(() => {
                    dispatchEvent(new Event("cMenuToolbar-NewCommand"));
                }, 100)
                : setMenuVisibility(plugin.settings.cMenuVisibility, plugin.getActiveDocument());
            await plugin.saveSettings();
        }
    }

}