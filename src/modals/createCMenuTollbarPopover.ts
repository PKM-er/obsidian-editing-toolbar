import { ButtonComponent, ItemView, MarkdownView, Notice } from "obsidian";
import EditingToolbarPlugin from "../main";
import { checkHtml, getHotkey, isExistoolbar, quiteFormatbrushes, setsvgColor } from "./common";
import { backcolorpicker, colorpicker } from "../utils/util";
import { createTablecell } from "./createTableCell";
import { t } from "../translations/helper"
import { createMoremenu } from "./cMenuToolbarModal";
import { setBottomValue } from "../obsidian/common/statusBar";

export function createCMenuToolbarPopover(
    plugin: EditingToolbarPlugin
): void {
    let settings = plugin.settings;
    const activeDocument = plugin.getActiveDocument()
    const generateMenu = () => {
        let btnwidth = 0;
        let leafwidth: number | undefined = 0;
        let cMenuToolbar = createEl("div");
        if (cMenuToolbar) {
            if (settings.positionStyle == "top") {
                let topem = (settings.cMenuBottomValue - 4.25) * 5;
                cMenuToolbar.setAttribute(
                    "style",
                    `position: relative; grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));top: ${topem
                    }px;`
                );
                cMenuToolbar.className += " top";
                if (settings.autohide) {
                    cMenuToolbar.className += " autohide";
                }
            } else {
                cMenuToolbar.setAttribute(
                    "style",
                    `left: calc(50% - calc(${cMenuToolbar.offsetWidth
                    }px / 2)); bottom: ${settings.cMenuBottomValue
                    }em; grid-template-columns: ${"1fr ".repeat(settings.cMenuNumRows)}`
                );
            }
        }
        cMenuToolbar.setAttribute("id", "cMenuToolbarModalBar");
        //二级弹出菜单

        let PopoverMenu = createEl("div");
        PopoverMenu.addClass("cMenuToolbarpopover");
        PopoverMenu.addClass("cMenuToolbarTinyAesthetic");
        PopoverMenu.setAttribute("id", "cMenuToolbarPopoverBar");
        PopoverMenu.style.visibility = "hidden";
        PopoverMenu.style.height = "0";
        if (settings.aestheticStyle == "default") {
            cMenuToolbar.addClass("cMenuToolbarDefaultAesthetic");
            cMenuToolbar.removeClass("cMenuToolbarTinyAesthetic");
            cMenuToolbar.removeClass("cMenuToolbarGlassAesthetic");
        } else if (settings.aestheticStyle == "tiny") {
            cMenuToolbar.addClass("cMenuToolbarTinyAesthetic");
            cMenuToolbar.removeClass("cMenuToolbarDefaultAesthetic");
            cMenuToolbar.removeClass("cMenuToolbarGlassAesthetic");
        } else {
            cMenuToolbar.addClass("cMenuToolbarGlassAesthetic");
            cMenuToolbar.removeClass("cMenuToolbarTinyAesthetic");
            cMenuToolbar.removeClass("cMenuToolbarDefaultAesthetic");
        }

        //  if (settings.positionStyle == "following") {
        //    cMenuToolbar.style.visibility = "hidden";
        // }

        if (settings.positionStyle == "top") {
            // let currentleaf = app.workspace.activeLeaf.view.containerEl;
            const currentleaf = app.workspace.getActiveViewOfType(MarkdownView)?.contentEl;
            if (!currentleaf) return
            if (!currentleaf?.querySelector("#cMenuToolbarPopoverBar")) {
                const markdownDom = currentleaf?.querySelector(".markdown-source-view");
                if (markdownDom)
                    markdownDom.insertAdjacentElement("afterbegin", PopoverMenu);
                else return;
            }
            const markdownDom2 = currentleaf?.querySelector(".markdown-source-view");
            if (markdownDom2)
                markdownDom2.insertAdjacentElement("afterbegin", cMenuToolbar);
            else return;

            leafwidth = currentleaf?.querySelector<HTMLElement>(
                ".markdown-source-view"
            )?.offsetWidth;

        } else if (settings.appendMethod == "body") {
            activeDocument.body.appendChild(cMenuToolbar);
        } else if (settings.appendMethod == "workspace") {
            activeDocument.body
                ?.querySelector(".mod-vertical.mod-root")
                ?.insertAdjacentElement("afterbegin", cMenuToolbar);
        }


        //@ts-ignore
        let cMenuToolbarPopoverBar = app.workspace.activeLeaf.view.containerEl
            ?.querySelector("#cMenuToolbarPopoverBar") as HTMLElement;
        settings.menuCommands.forEach((item, index) => {
            if (!item.icon) return
            let tip;
            if ("SubmenuCommands" in item) {
                let _btn: any;

                if (leafwidth && btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
                    //说明已经溢出
                    plugin.setIS_MORE_Button(true);
                    // globalThis.IS_MORE_Button = true; //需要添加更多按钮
                    _btn = new ButtonComponent(cMenuToolbarPopoverBar);
                } else _btn = new ButtonComponent(cMenuToolbar);

                _btn.setClass("cMenuToolbarCommandsubItem" + index);
                if (index >= settings.cMenuNumRows) {
                    _btn.setClass("cMenuToolbarSecond");
                }
                else {
                    if (settings.positionStyle != "top")
                        _btn.buttonEl.setAttribute('aria-label-position', 'top')
                }

                checkHtml(item.icon)
                    ? (_btn.buttonEl.innerHTML = item.icon)
                    : _btn.setIcon(item.icon);

                // let __btnwidth;
                // if (_btn.buttonEl.offsetWidth > 100) __btnwidth = 26;
                // else {
                //   if (_btn.buttonEl.offsetWidth < 26) __btnwidth = 26;
                //   else __btnwidth = _btn.buttonEl.offsetWidth;
                // }
                btnwidth += 26 + 2;
                let submenu = createDiv("subitem");
                if (submenu && item.SubmenuCommands) {
                    item.SubmenuCommands.forEach(
                        (subitem: any) => {
                            let hotkey = getHotkey(app, subitem.id);
                            hotkey == "–" ? tip = subitem.name : tip = subitem.name + "(" + hotkey + ")";
                            let sub_btn = new ButtonComponent(submenu)
                                .setTooltip(tip)
                                .setClass("menu-item")
                                .onClick(() => {
                                    console.log(subitem)
                                    //@ts-ignore
                                    app.commands.executeCommandById(subitem.id);

                                    if (settings.cMenuVisibility == false)
                                        cMenuToolbar.style.visibility = "hidden";
                                    else {
                                        if (settings.positionStyle == "following") {
                                            cMenuToolbar.style.visibility = "hidden";
                                        } else cMenuToolbar.style.visibility = "visible";
                                    }
                                });
                            if (index < settings.cMenuNumRows) {
                                if (settings.positionStyle != "top")
                                    sub_btn.buttonEl.setAttribute('aria-label-position', 'top')
                            }
                            if (subitem.id == "cMenuToolbar-Divider-Line")
                                sub_btn.setClass("cMenuToolbar-Divider-Line");
                            checkHtml(subitem.icon)
                                ? (sub_btn.buttonEl.innerHTML = subitem.icon)
                                : sub_btn.setIcon(subitem.icon);

                            _btn.buttonEl.insertAdjacentElement("afterbegin", submenu);
                        }
                    );
                }
            } else {
                if (item.id == "editing-toolbar:change-font-color") {
                    let button2 = new ButtonComponent(cMenuToolbar);
                    button2
                        .setClass("cMenuToolbarCommandsubItem-font-color")
                        .setTooltip(t("Font Colors"))
                        .onClick(() => {
                            //@ts-ignore
                            app.commands.executeCommandById(item.id);
                            if (settings.cMenuVisibility == false)
                                cMenuToolbar.style.visibility = "hidden";
                            else {
                                if (settings.positionStyle == "following") {
                                    cMenuToolbar.style.visibility = "hidden";
                                } else cMenuToolbar.style.visibility = "visible";
                            }
                        });
                    checkHtml(item.icon)
                        ? (button2.buttonEl.innerHTML = item.icon)
                        : button2.setIcon(item.icon);

                    btnwidth += 26;
                    //  let Selection = createDiv("triangle-icon");
                    let submenu2 = createEl("div");
                    submenu2.addClass("subitem");

                    if (submenu2) {
                        submenu2.innerHTML = colorpicker(plugin);

                        button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
                        //    if (settings.cMenuFontColor)
                        //     activeDocument.getElementById("change-font-color-icon").style.fill = settings.cMenuFontColor;
                        createTablecell(plugin, "x-color-picker-table");
                        let el = submenu2.querySelector(
                            ".x-color-picker-wrapper"
                        ) as HTMLElement;

                        let button3 = new ButtonComponent(el);
                        button3
                            .setIcon("paintbrush")
                            .setTooltip(t("Format Brush"))
                            .onClick(() => {
                                quiteFormatbrushes(plugin)
                                //  globalThis.EN_FontColor_Format_Brush = true;
                                plugin.Temp_Notice = new Notice(
                                    t("Font-Color formatting brush ON!"),
                                    0
                                );

                            });
                        let button4 = new ButtonComponent(el);
                        button4
                            .setIcon("palette")
                            .setTooltip(t("Custom Font Color"))
                            .onClick(() => {
                                //@ts-ignore
                                app.setting.open();
                                //@ts-ignore
                                app.setting.openTabById("editing-toolbar");
                                setTimeout(() => {
                                    //@ts-ignore
                                    let settingEI = app.setting.activeTab.containerEl.querySelector(".custom_font")
                                    if (settingEI) { settingEI.addClass?.("toolbar-cta"); }
                                }, 200);

                            });
                    }
                } else if (item.id == "editing-toolbar:change-background-color") {
                    let button2 = new ButtonComponent(cMenuToolbar);
                    button2
                        .setClass("cMenuToolbarCommandsubItem-font-color")
                        .setTooltip(t("Background color"))
                        .onClick(() => {
                            //@ts-ignore
                            app.commands.executeCommandById(item.id);
                            if (settings.cMenuVisibility == false)
                                cMenuToolbar.style.visibility = "hidden";
                            else {
                                if (settings.positionStyle == "following") {
                                    cMenuToolbar.style.visibility = "hidden";
                                } else cMenuToolbar.style.visibility = "visible";
                            }
                        });
                    checkHtml(item.icon)
                        ? (button2.buttonEl.innerHTML = item.icon)
                        : button2.setIcon(item.icon);

                    btnwidth += 26;
                    //  let Selection = createDiv("triangle-icon");
                    let submenu2 = createEl("div");
                    submenu2.addClass("subitem");
                    //   console.log(btnwidth,item.name)
                    if (submenu2) {
                        submenu2.innerHTML = backcolorpicker(plugin);

                        button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
                        // if (plugin.settings.cMenuBackgroundColor)
                        //  activeDocument.getElementById("change-background-color-icon").style.fill = plugin.settings.cMenuBackgroundColor;
                        createTablecell(plugin, "x-backgroundcolor-picker-table");
                        let el = submenu2.querySelector(
                            ".x-color-picker-wrapper"
                        ) as HTMLElement;

                        let button3 = new ButtonComponent(el);
                        button3
                            .setIcon("paintbrush")
                            .setTooltip(t("Format Brush"))
                            .onClick(() => {
                                quiteFormatbrushes(plugin)
                                //  globalplugin.EN_BG_Format_Brush = true;
                                plugin.Temp_Notice = new Notice(
                                    t("Font-Color formatting brush ON!"),
                                    0
                                );

                            });
                        let button4 = new ButtonComponent(el);
                        button4
                            .setIcon("palette")
                            .setTooltip(t("Custom Backgroud Color"))
                            .onClick(() => {
                                //@ts-ignore
                                app.setting.open();
                                //@ts-ignore
                                app.setting.openTabById("editing-toolbar");
                                setTimeout(() => {
                                    //@ts-ignore
                                    let settingEI = app.setting.activeTab.containerEl.querySelector(".custom_bg")
                                    if (settingEI) { settingEI.addClass?.("toolbar-cta"); }
                                }, 200);

                            });

                    }
                } else {
                    let button;
                    if (leafwidth && btnwidth >= leafwidth - 26 * 4 && leafwidth > 100) {
                        //说明已经溢出
                        plugin.setIS_MORE_Button(true);
                        //globalpluginIS_MORE_Button = true; //需要添加更多按钮
                        button = new ButtonComponent(cMenuToolbarPopoverBar);
                    } else {
                        button = new ButtonComponent(cMenuToolbar)
                    }
                    let hotkey = getHotkey(app, item.id);
                    hotkey == "–" ? tip = item.name : tip = item.name + "(" + hotkey + ")";
                    button.setTooltip(tip).onClick(() => {
                        //@ts-ignore
                        app.commands.executeCommandById(item.id);
                        if (settings.cMenuVisibility == false)
                            cMenuToolbar.style.visibility = "hidden";
                        else {
                            if (settings.positionStyle == "following") {
                                cMenuToolbar.style.visibility = "hidden";
                            } else cMenuToolbar.style.visibility = "visible";
                        }
                    });

                    button.setClass("cMenuToolbarCommandItem");
                    if (index >= settings.cMenuNumRows) {

                        button.setClass("cMenuToolbarSecond");
                    } else {
                        if (settings.positionStyle != "top")
                            button.buttonEl.setAttribute('aria-label-position', 'top')
                    }
                    if (item.id == "cMenuToolbar-Divider-Line")
                        button.setClass("cMenuToolbar-Divider-Line");
                    checkHtml(item.icon)
                        ? (button.buttonEl.innerHTML = item.icon)
                        : button.setIcon(item.icon);
                    //let __btnwidth2;
                    // if (button.buttonEl.offsetWidth > 100) __btnwidth2 = 26;
                    // else {
                    //   if (button.buttonEl.offsetWidth < 26) __btnwidth2 = 26;
                    //   else __btnwidth2 = button.buttonEl.offsetWidth;
                    // }

                    btnwidth += 26;
                }
            }
        });

        createMoremenu(plugin, cMenuToolbar);
        if (Math.abs(plugin.settings.cMenuWidth - Number(btnwidth)) > 30) {
            plugin.settings.cMenuWidth = Number(btnwidth);
            setTimeout(() => {
                plugin.saveSettings();
            }, 100);
        }
    };
    if (!plugin.isLoadMobile()) return;
    const view = app.workspace.getActiveViewOfType(ItemView);
    if (view?.getViewType() === "markdown" || view?.getViewType() === "thino_view") {
        //  let Markdown = app.workspace.getActiveViewOfType(MarkdownView);
        // if (Markdown) {
        if (isExistoolbar(plugin)) return;

        generateMenu();

        setBottomValue(plugin);

        setsvgColor(plugin, settings.cMenuFontColor, settings.cMenuBackgroundColor)

    } else {
        //  selfDestruct();
        return;
    }


}