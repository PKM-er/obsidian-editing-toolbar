import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function redoEditor(plugin: EditingToolbarPlugin): Command {
    const name = "Editor Redo"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: appIcons["redo-glyph"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            return editor.redo()
        }

    }
}