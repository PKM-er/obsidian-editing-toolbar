import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function headerFour(plugin: EditingToolbarPlugin): Command {
    const name = "Header Four"
    return {
        id: "header4-text",
        name,
        icon: appIcons["header-4"],
        hotkeys: [{ modifiers: ["Mod"], key: "`" }],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            setHeader(editor, "####")
        }

    }
}