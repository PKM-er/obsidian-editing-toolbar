import { Menu, setIcon, ToggleComponent, requireApiVersion } from "obsidian";
import { t } from "src/translations/helper";
import type editingToolbarPlugin from "src/plugin/main";
import { CommandPicker, openSlider } from "src/modals/suggesterModals";
import { selfDestruct } from "src/modals/editingToolbarModal";
import { setMenuVisibility } from "src/util/statusBarConstants";

export class StatusBar {
  private plugin: editingToolbarPlugin;
  private statusBarIcon: HTMLElement;

  constructor(plugin: editingToolbarPlugin) {
    this.plugin = plugin;
  }

  public init(): void {
    this.statusBarIcon = this.plugin.addStatusBarItem();
    this.statusBarIcon.addClass("editingToolbar-statusbar-button");
    setIcon(this.statusBarIcon, "editingToolbar");
    this.registerClickEvent();
  }

  private registerClickEvent(): void {
    this.plugin.registerDomEvent(this.statusBarIcon, "click", () => {
      const statusBarRect = this.statusBarIcon.parentElement.getBoundingClientRect();
      const statusBarIconRect = this.statusBarIcon.getBoundingClientRect();
      this.showMenu(statusBarIconRect, statusBarRect);
    });
  }

  private showMenu(iconRect: DOMRect, barRect: DOMRect): void {
    const menu = new Menu();
    
    // 添加第一个部分
    menu.addSections(["settings"]); // 使用 addSections 添加部分
    this.addVisibilityToggle(menu);
    
    // 添加第二个部分
    menu.addSections(["controls"]); // 使用 addSections 添加部分
    this.addToolbarControls(menu);

    const menuDom = (menu as any).dom as HTMLElement;
    menuDom.addClass("editingToolbar-statusbar-menu");

    menu.showAtPosition({
      x: iconRect.right + 5,
      y: barRect.top - 5,
    });
  }

  private addVisibilityToggle(menu: Menu): void {
    menu.addItem((item) => {
      // 先设置所有属性
      item.setTitle(t("Hide & Show"));
      requireApiVersion("0.15.0") ? item.setSection("settings") : true;
      const itemDom = (item as any).dom as HTMLElement;
      const toggleComponent = new ToggleComponent(itemDom)
        .setValue(this.plugin.settings.cMenuVisibility)
        .setDisabled(true);

      const toggle = async () => {
        this.plugin.settings.cMenuVisibility = !this.plugin.settings.cMenuVisibility;
        toggleComponent.setValue(this.plugin.settings.cMenuVisibility);
        this.plugin.settings.cMenuVisibility == true
          ? setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100)
          : setMenuVisibility(this.plugin.settings.cMenuVisibility);
        selfDestruct();
        await this.plugin.saveSettings();
      };

      item.onClick((e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggle();
      });
        
      
    });

    // 添加位置样式切换
    menu.addItem((item) => {
      item.setTitle(t("Toolbar Position"));
      requireApiVersion("0.15.0") ? item.setSection("settings") : true;
      item.setIcon("layout");

      // 使用 setSubmenu 创建子菜单
      const submenu = item.setSubmenu();
      
      // 为每个位置样式添加选项
      ["top", "fixed", "following"].forEach(position => {
        submenu.addItem(subItem => {
          subItem.setTitle(position);
          subItem.setIcon(this.plugin.settings.positionStyle === position ? "check" : "");
          subItem.onClick(async () => {
            this.plugin.settings.positionStyle = position;
            await this.plugin.saveSettings();
            // 触发刷新
            selfDestruct();
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
          });
        });
      });
    });
  }

  private addToolbarControls(menu: Menu): void {
    const controls = [
      {
        icon: "plus",
        title: t("Add Command"),
        click: () => new CommandPicker(this.plugin).open()
      }
    ];

    // 只在 positionStyle 为 "fixed" 时添加 sliders 选项
    if (this.plugin.settings.positionStyle === "fixed") {
      controls.push({
        icon: "sliders",
        title: t("Settings"),
        click: () => new openSlider(this.plugin.app, this.plugin).open()
      });
    }

    controls.forEach(control => {
      menu.addItem((item) => {
        // 分别设置每个属性
        item.setIcon(control.icon);
        item.setTitle(control.title);
        item.onClick(control.click);

        if (requireApiVersion("0.15.0")) {
          item.setSection("controls");
        }
      });
    });
  }

 
} 