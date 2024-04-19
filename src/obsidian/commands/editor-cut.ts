import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function editorCut(plugin: EditingToolbarPlugin): Command {
    const name = "Editor Cut"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: appIcons["lucide-scissors"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            try {
                await window.navigator.clipboard.writeText(editor.getSelection()); // 使用 window.navigator.clipboard.writeText() 方法将选定的文本写入剪贴板
                editor.replaceSelection(""); // 清空选定的文本
                // @ts-ignore
                app.commands.executeCommandById("editor:focus");
            } catch (error) {
                console.error("Cut failed:", error);
            }
        }

    }
}