import { Plugin, requireApiVersion, Notice, ItemView, Platform } from "obsidian"
import addIcons from "./obsidian/icons/customIcons"
import { EditingToolbarSettings, DEFAULT_SETTINGS } from "./settings/settingsData"
import registerEditingToolbarCommands from "./obsidian/commands"
import { setupDomEvents } from "./obsidian/events/setupDomEvents"
import { setupLayoutChangeEvent } from "./obsidian/events/setupLayoutChangeEvent"
import { setupLeafChangeEvent } from "./obsidian/events/setupLeafChangeEvent"
import { setupResizeEvent } from "./obsidian/events/setupResizeEvent"
import { patchThinoEvent } from "./obsidian/events/patchThinoEvent"
import { cMenuToolbarSettingTab } from "./settings/settingsTab"
import "./styles/styles.css"


export default class EditingToolbarPlugin extends Plugin {
    settings: EditingToolbarSettings
    IS_MORE_Button: boolean;
    EN_BG_Format_Brush: boolean;
    EN_FontColor_Format_Brush: boolean;
    EN_Text_Format_Brush: boolean;
    Temp_Notice: Notice;
    Leaf_Width: number;

    async onload(): Promise<void> {
        console.log("loading editing toolbar plugin...")

        //Setting
        await this.loadSettings()
        this.addSettingTab(new cMenuToolbarSettingTab(this.app, this));

        this.registerIcons()
        await this.registerCommands()

        this.setupEvents()
    }

    registerIcons() {
        try {
            addIcons()
        } catch (error) {
            console.error("Register Icons failed: " + error)
        }
    }

    async registerCommands() {
        try {
            await registerEditingToolbarCommands(this)
        } catch (error) {
            console.error("Register Commands failed: " + error)
        }
    }

    setupEvents() {
        setupDomEvents(this.getActiveDocument(), this)
        setupLayoutChangeEvent(this)
        setupLeafChangeEvent(this)
        setupResizeEvent(this)
        patchThinoEvent(this)

        if (this.settings.cMenuVisibility == true) {
            setTimeout(() => {
                dispatchEvent(new Event("cMenuToolbar-NewCommand"));
            }, 100)
        }
    }

    isLoadMobile(): boolean {
        let screenWidth = window.innerWidth > 0 ? window.innerWidth : screen.width;
        let isLoadOnMobile = this.settings?.isLoadOnMobile ? this.settings.isLoadOnMobile : false;
        if (Platform.isMobileApp && !isLoadOnMobile) {
            if (screenWidth <= 768) {
                // 移动设备且屏幕宽度小于等于 768px，默认不开启toolbar
                console.log("editing toolbar disable loading on mobile");
                return false;
            }
        }
        return true;
    }

    getActiveDocument(): Document {
        return requireApiVersion("0.15.0") ? activeWindow.document : activeDocument = window.document;
    }

    getActiveEditor() {
        return this.app.workspace.activeEditor?.editor
    }

    isView() {
        const view = app.workspace.getActiveViewOfType(ItemView);
        if (view?.getViewType() === "markdown" || view?.getViewType() === "thino_view")
            return true;
        else return false;
    }

    setIS_MORE_Button(status: boolean): void {
        this.IS_MORE_Button = status
    }
    setEN_BG_Format_Brush(status: boolean): void {
        this.EN_BG_Format_Brush = status
    }
    setEN_FontColor_Format_Brush(status: boolean): void {
        this.EN_FontColor_Format_Brush = status
    }
    setEN_Text_Format_Brush(status: boolean): void {
        this.EN_Text_Format_Brush = status;
    }
    setTemp_Notice(content: Notice): void {
        this.Temp_Notice = content;
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        )
    }

    async saveSettings() {
        await this.saveData(this.settings)
    }


    async onunload(): Promise<void> {
    }
}
