import { type Command } from "obsidian"
import type EditingToolbarPlugin from "../../main"

export default function offFormatBrush(plugin: EditingToolbarPlugin): Command {
    const name = "Off Format Brush"
    return {
        id: name.replaceAll(" ", "-").toLocaleLowerCase(),
        name,
        callback: async () => {
            if (plugin.Temp_Notice) plugin.Temp_Notice.hide();
            plugin.setEN_BG_Format_Brush(false);
            plugin.setEN_FontColor_Format_Brush(false);
            plugin.setEN_Text_Format_Brush(false);
        }

    }
}