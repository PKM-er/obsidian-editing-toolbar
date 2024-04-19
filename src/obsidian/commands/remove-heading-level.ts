import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"
import { setHeader } from "../common/setHeader"

export default function removeHeadingLevel(plugin: EditingToolbarPlugin): Command {
    const name = "Remove Heading Level"
    return {
        id: "header0-text",
        name,
        icon: appIcons["heading-glyph"],
        hotkeys: [{ modifiers: ["Mod"], key: "`" }],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            setHeader(editor, "")
        }

    }
}