import EditingToolbarPlugin from "../main";
import { setBackgroundcolor } from "../obsidian/commands/change-background-color";
import { setFontColor } from "../obsidian/commands/change-font-color";
import { isExistoolbar, setcolorHex } from "./common";

export function createTablecell(plugin: EditingToolbarPlugin, el: string) {
    const activeDocument = plugin.getActiveDocument()
    let container = isExistoolbar(plugin) as HTMLElement;
    let tab = container?.querySelector('#' + el);
    if (tab) {
        // @ts-ignore
        let rows = tab.rows;
        let rlen = rows.length;
        for (let i = 1; i < rlen; i++) {
            //遍历所有行
            let cells = rows[i].cells; //得到这一行的所有单元格
            for (let j = 0; j < cells.length; j++) {
                //给每一个单元格添加click事件
                cells[j].onclick = function () {
                    let backcolor = this.style.backgroundColor;
                    if (backcolor != "") {
                        backcolor = setcolorHex(backcolor);
                        // console.log(backcolor,'backcolor')
                        if (el == "x-color-picker-table") {
                            plugin.settings.cMenuFontColor = backcolor;
                            setFontColor(plugin, backcolor)
                            let font_colour_dom = activeDocument.querySelectorAll("#change-font-color-icon")
                            font_colour_dom.forEach(element => {
                                let ele = element as HTMLElement
                                ele.style.fill = backcolor;
                            });

                        } else if (el == "x-backgroundcolor-picker-table") {
                            plugin.settings.cMenuBackgroundColor = backcolor;
                            //console.log("333")
                            setBackgroundcolor(plugin, backcolor);
                            let background_colour_dom = activeDocument.querySelectorAll("#change-background-color-icon")
                            background_colour_dom.forEach(element => {
                                let ele = element as HTMLElement
                                ele.style.fill = backcolor;
                            });


                            //  background_colour_dom.style.fill = plugin.settings.cMenuBackgroundColor;
                        }
                        plugin.saveSettings();
                    }
                };

            }
        }
    }
}