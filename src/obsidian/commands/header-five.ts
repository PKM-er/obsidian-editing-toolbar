import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function headerFive(plugin: EditingToolbarPlugin): Command {
    const name = "Header Five"
    return {
        id: "header5-text",
        name,
        icon: appIcons["header-5"],
        hotkeys: [{ modifiers: ["Mod"], key: "`" }],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            setHeader(editor, "#####")
        }

    }
}