import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { customIcons } from "../icons/customIcons";

export function setBackgroundcolor(plugin: EditingToolbarPlugin, color: string) {
    const editor = plugin.getActiveEditor()
    if (!editor) {
        return
    }

    let selectText = editor.getSelection();
    let _html0 =
        /\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>[^\<\>]+\<\/span\>/g;
    let _html1 =
        /^\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>([^\<\>]+)\<\/span\>$/;
    let _html2 = '<span style="background:' + color + '">$1</span>';
    let _html3 = /\<span style=[^\<]*$|^[^\>]*span\>/g; //是否只包含一侧的<>
    if (_html3.test(selectText)) {
        return;
    } else if (_html0.test(selectText)) {
        if (_html1.test(selectText)) {
            selectText = selectText.replace(_html1, _html2);
        } else {
            selectText = selectText.replace(
                /\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>|\<\/span\>/g,
                ""
            );

        }
    } else {
        selectText = selectText.replace(/^(.+)$/gm, _html2);
    }
    editor.replaceSelection(selectText);
    editor.exec("goRight");
    //@ts-ignore
    app.commands.executeCommandById("editor:focus");
}

export default function changeBackgroundColor(plugin: EditingToolbarPlugin): Command {
    const name = "Change Background Color"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: customIcons[name],
        callback: async () => {
            setBackgroundcolor(plugin, plugin.settings.cMenuBackgroundColor ?? "#2DC26B")
        }

    }
}