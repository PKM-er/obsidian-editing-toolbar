import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function undoEditor(plugin: EditingToolbarPlugin): Command {
    const name = "Editor Undo"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: appIcons["undo-glyph"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            return editor.undo()
        }

    }
}