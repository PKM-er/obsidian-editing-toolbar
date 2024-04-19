import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function headerThree(plugin: EditingToolbarPlugin): Command {
    const name = "Header Three"
    return {
        id: "header3-text",
        name,
        icon: appIcons["header-3"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            setHeader(editor, "###")
        }

    }
}