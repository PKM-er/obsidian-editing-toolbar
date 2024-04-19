import { Notice, type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { customIcons } from "../icons/customIcons";
import { t } from "../../translations/helper";

export default function formatEraser(plugin: EditingToolbarPlugin): Command {
    const name = "Format Eraser"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: customIcons[name],
        callback: async () => {
            const editor = plugin.getActiveEditor()
            if (!editor) {
                return
            }

            let selectText = editor.getSelection();
            if (selectText == null || selectText == "") {
                if (plugin.Temp_Notice) plugin.Temp_Notice.hide();
                plugin.setEN_BG_Format_Brush(false);
                plugin.setEN_FontColor_Format_Brush(false);
                plugin.setEN_Text_Format_Brush(false);
                plugin.setEN_Text_Format_Brush(true);
                // globalThis.EN_Text_Format_Brush = true;
                if (plugin.Temp_Notice) {
                    if (plugin.Temp_Notice.noticeEl.innerText != t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"))
                        plugin.Temp_Notice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);
                }
                else plugin.Temp_Notice = new Notice(t("Clear formatting brush ON!\nClick the  mouse middle or right key to close the formatting-brush"), 0);

            } else {
                let mdText = /(^#+\s|^#(?=\s)|^\>|^\- \[( |x)\]|^\+ |\<[^\<\>]+?\>|^1\. |^\s*\- |^\-+$|^\*+$)/mg;
                selectText = selectText.replace(mdText, "");
                selectText = selectText.replace(/^[ ]+|[ ]+$/mg, "");
                selectText = selectText.replace(/\!?\[\[([^\[\]\|]*\|)*([^\(\)\[\]]+)\]\]/g, "$2");
                selectText = selectText.replace(/\!?\[+([^\[\]\(\)]+)\]+\(([^\(\)]+)\)/g, "$1");
                selectText = selectText.replace(/`([^`]+)`/g, "$1");
                selectText = selectText.replace(/_([^_]+)_/g, "$1");
                selectText = selectText.replace(/==([^=]+)==/g, "$1");
                selectText = selectText.replace(/\*\*\*([^\*]+)\*\*\*/g, "$1");
                selectText = selectText.replace(/\*\*?([^\*]+)\*\*?/g, "$1");
                selectText = selectText.replace(/~~([^~]+)~~/g, "$1");

                // selectText = selectText.replace(/(\r*\n)+/mg, "\r\n");
                editor.replaceSelection(selectText);
                //@ts-ignore
                app.commands.executeCommandById("editor:focus");
            }
        }

    }
}