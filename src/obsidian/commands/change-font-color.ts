import type { Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"
import { customIcons } from "../icons/customIcons";

export function setFontColor(plugin: EditingToolbarPlugin, color: string) {
    const editor = plugin.getActiveEditor()
    if (!editor) {
        return
    }
    let selectText = editor.getSelection();
    // if (selectText == null || selectText.trim() == "") {
    //   //如果没有选中内容激活格式刷
    //   quiteFormatbrushes(plugin);
    //   plugin.setEN_FontColor_Format_Brush(true);
    //   plugin.setTemp_Notice(new Notice(t("Font-Color formatting brush ON!"), 0));
    //   return;
    // }

    let _html0 = /\<font color=[0-9a-zA-Z#]+[^\<\>]*\>[^\<\>]+\<\/font\>/g;
    let _html1 = /^\<font color=[0-9a-zA-Z#]+[^\<\>]*\>([^\<\>]+)\<\/font\>$/;
    let _html2 = '<font color="' + color + '">$1</font>';
    let _html3 = /\<font color=[^\<]*$|^[^\>]*font\>/g; //是否只包含一侧的<>

    if (_html3.test(selectText)) {
        return;
    } else if (_html0.test(selectText)) {

        if (_html1.test(selectText)) {
            selectText = selectText.replace(/<font color="[^"]+">|<\/font>/g, ''); //应用新颜色之前先清空旧颜色
            selectText = selectText.replace(_html1, _html2);
        } else {
            selectText = selectText.replace(
                /\<font color=[0-9a-zA-Z#]+[^\<\>]*?\>|\<\/font\>/g,
                ""
            );
        }
    } else {
        selectText = selectText.replace(/<font color=["'#0-9a-zA-Z]+>[^<]+<\/font>/g, ''); //应用新颜色之前先清空旧颜色
        selectText = selectText.replace(/^(.+)$/gm, _html2);
    }
    editor.replaceSelection(selectText);
    editor.exec("goRight");
    // @ts-ignore
    app.commands.executeCommandById("editor:focus");

}

export default function changeFontColor(plugin: EditingToolbarPlugin): Command {
    const name = "Change Font Color"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        icon: customIcons[name],
        callback: async () => {
            setFontColor(plugin, plugin.settings.cMenuFontColor ?? "#2DC26B")
        }
    }

}