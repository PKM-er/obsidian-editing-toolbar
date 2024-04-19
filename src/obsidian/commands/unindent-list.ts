import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function unIndentList(plugin: EditingToolbarPlugin): Command {
    const name = "Unindent List"
    return {
        id: "undent-list",
        name,
        icon: appIcons["unindent-glyph"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            //@ts-ignore
            return editor.unindentList();
        }

    }
}