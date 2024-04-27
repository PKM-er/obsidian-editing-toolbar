import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function workspaceFullscreenFocus(plugin: EditingToolbarPlugin): Command {
    const name = "Workspace Fullscreen Focus"
    return {
        id: "workplace-fullscreen-focus",
        name,
        hotkeys: [{ modifiers: ['Mod'], key: "F11" }],
        icon: appIcons["remix-SplitCellsHorizontal"],
        callback: async () => {
            let currentleaf = plugin.getActiveDocument();
            if (app.workspace.leftSplit.collapsed && app.workspace.rightSplit.collapsed) {
                //@ts-ignore
                app.commands.executeCommandById("app:toggle-right-sidebar");
                //@ts-ignore
                app.commands.executeCommandById("app:toggle-left-sidebar");
                //@ts-ignore
                app.workspace.leftRibbon.show()

                if (currentleaf.body.classList.contains('auto-hide-header')) {

                    currentleaf.body.classList.remove('auto-hide-header');
                }
            }
            else {

                if (!currentleaf.body.classList.contains('auto-hide-header')) {


                    currentleaf.body.classList.add('auto-hide-header');
                }
                //@ts-ignore
                app.workspace.leftRibbon.hide()
                if (!app.workspace.leftSplit.collapsed) {
                    //@ts-ignore
                    app.commands.executeCommandById("app:toggle-left-sidebar");

                }
                if (!app.workspace.rightSplit.collapsed) {
                    //@ts-ignore
                    app.commands.executeCommandById("app:toggle-right-sidebar");
                }
            }
        }
    }
}