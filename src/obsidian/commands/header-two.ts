import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function headerTwo(plugin: EditingToolbarPlugin): Command {
    const name = "Header 2"
    return {
        id: "header2-text",
        name,
        icon: appIcons["header-2"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }
            console.log("222222222")
            setHeader(editor, "##")
        }

    }
}