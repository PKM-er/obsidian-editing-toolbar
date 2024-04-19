import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function headerOne(plugin: EditingToolbarPlugin): Command {
    const name = "Header One"
    return {
        id: "Header1-text",
        name,
        icon: appIcons["header-1"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            setHeader(editor, "#")
        }

    }
}