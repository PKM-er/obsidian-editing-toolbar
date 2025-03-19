import { Menu, setIcon, ToggleComponent, requireApiVersion, ItemView } from "obsidian";
import { t } from "src/translations/helper";
import type editingToolbarPlugin from "src/plugin/main";
import { CommandPicker, openSlider } from "src/modals/suggesterModals";
import { selfDestruct } from "src/modals/editingToolbarModal";
import { setMenuVisibility } from "src/util/statusBarConstants";
import { ViewUtils } from "src/util/viewUtils";
import { AESTHETIC_STYLES } from "src/settings/settingsData";

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

    this.addAestheticStyleToggle(menu);
    menu.addSections(["viewType"]);
    this.addViewTypeToggle(menu);
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
      item.setIcon("dock");

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
            // 调用插件的 onPositionStyleChange 方法
            this.plugin.onPositionStyleChange(position);
          });
        });
      });
    });
  }

  // 添加视图类型显示控制
  private addViewTypeToggle(menu: Menu): void {
    // 获取当前视图类型
    const view = this.plugin.app.workspace.getActiveViewOfType(ItemView);
    if (!view) return;
    
    const viewType = view.getViewType();
    
    // 主菜单项：当前视图类型状态
    menu.addItem((item) => {
      item.setTitle(t("Current View: ") + viewType);
      requireApiVersion("0.15.0") ? item.setSection("settings") : true;
      item.setIcon("layout-template");
      
      // 使用子菜单来显示当前视图类型的显示/隐藏控制
      const submenu = item.setSubmenu();
      
      // 检查当前视图类型是否在允许列表中
      const isAllowed = ViewUtils.isAllowedViewType(view);
      
      // 为当前视图类型添加显示/隐藏控制
      submenu.addItem(subItem => {
        subItem.setTitle(isAllowed ? t("Disable toolbar for this view") : t("Enable toolbar for this view"));
        subItem.setIcon(isAllowed ? "eye-off" : "eye");
        subItem.onClick(async () => {
          // 更新设置
          if (!this.plugin.settings.viewTypeSettings) {
            this.plugin.settings.viewTypeSettings = {};
          }
          
          // 切换当前视图类型的状态
          this.plugin.settings.viewTypeSettings[viewType] = !isAllowed;
          
          // 保存设置
          await this.plugin.saveSettings();
          
          // 刷新工具栏
          selfDestruct();
          setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100);
        });
      });
      
      // 添加管理所有视图类型的子菜单
      submenu.addItem(subItem => {
        subItem.setTitle(t("Manage all view types"));
        subItem.setIcon("settings-2");
        
        // 进一步的子菜单用于管理所有视图类型
        const allViewsSubmenu = subItem.setSubmenu();
        
        // 获取默认允许的视图类型
        const defaultViewTypes = [
          'markdown',
          'canvas',
          'thino_view',
          'meld-encrypted-view',
          'excalidraw',
          'image',
        ];
        
        // 添加所有当前已知的视图类型
        const knownViewTypes = new Set([
          ...defaultViewTypes,
          ...Object.keys(this.plugin.settings.viewTypeSettings || {})
        ]);
        
        // 为每个视图类型添加一个菜单项
        Array.from(knownViewTypes).sort().forEach(vType => {
          // 检查该视图类型的当前状态
          const isViewAllowed = this.isViewTypeAllowed(vType);
          
          allViewsSubmenu.addItem(viewItem => {
            viewItem.setTitle(vType);
            viewItem.setIcon(isViewAllowed ? "check" : "");
            viewItem.onClick(async () => {
              // 更新设置
              if (!this.plugin.settings.viewTypeSettings) {
                this.plugin.settings.viewTypeSettings = {};
              }
              
              // 切换状态
              this.plugin.settings.viewTypeSettings[vType] = !isViewAllowed;
              
              // 如果当前视图就是这个类型，则刷新工具栏
              if (viewType === vType) {
                selfDestruct();
                setTimeout(() => {
                  dispatchEvent(new Event("editingToolbar-NewCommand"));
                }, 100);
              }
              
              // 保存设置
              await this.plugin.saveSettings();
            });
          });
        });
      });
    });
  }

  // 检查视图类型是否允许显示工具栏
  private isViewTypeAllowed(viewType: string): boolean {
    // 如果没有专门的设置，使用默认值
    if (!this.plugin.settings.viewTypeSettings || 
        this.plugin.settings.viewTypeSettings[viewType] === undefined) {
      // 默认允许的视图类型
      const defaultViewTypes = [
        'markdown',
        'canvas',
        'thino_view',
        'meld-encrypted-view',
        'excalidraw',
        'image',
      ];
      return defaultViewTypes.includes(viewType);
    }
    
    // 使用用户设置的值
    return this.plugin.settings.viewTypeSettings[viewType];
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
        icon: "file-sliders",
        title: t("Position Settings"),
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

  private addAestheticStyleToggle(menu: Menu): void {
    menu.addItem((item) => {
      item.setTitle(t("Appearance Style"));
      requireApiVersion("0.15.0") ? item.setSection("settings") : true;
      item.setIcon("cherry");

      const submenu = item.setSubmenu();
      
      AESTHETIC_STYLES.forEach(style => {
        submenu.addItem(subItem => {
          subItem.setTitle(style);
          subItem.setIcon(this.plugin.settings.aestheticStyle === style ? "check" : "");
          subItem.onClick(async () => {
            this.plugin.settings.aestheticStyle = style;
            await this.plugin.saveSettings();
            selfDestruct();
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
          });
        });
      });
    });
  }
} 