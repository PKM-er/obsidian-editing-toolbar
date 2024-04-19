import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { appIcons } from "../icons/appIcons"

export default function editorPaste(plugin: EditingToolbarPlugin): Command {
    const name = "Editor Paste"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: appIcons["lucide-clipboard-type"],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            try {
                const replaceSelection = editor.replaceSelection; // 获取编辑器的替换选区方法
                const text = await window.navigator.clipboard.readText(); // 使用 window.navigator.clipboard.readText() 方法读取剪贴板中的文本
                if (text) replaceSelection.apply(editor, [text]); // 将读取的文本替换当前选区
                //@ts-ignore
                app.commands.executeCommandById("editor:focus");
            } catch (error) {
                console.error("Paste failed:", error);
            }
        }

    }
}