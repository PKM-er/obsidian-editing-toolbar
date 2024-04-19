import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function headerSix(plugin: EditingToolbarPlugin): Command {
    const name = "Header Six"
    return {
        id: "header6-text",
        name,
        icon: appIcons["header-6"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            setHeader(editor, "######")
        }

    }
}