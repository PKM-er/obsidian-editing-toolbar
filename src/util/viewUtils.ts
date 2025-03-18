import { View, Plugin } from 'obsidian';
import type editingToolbarPlugin from 'src/plugin/main';

// 新建工具类文件来统一管理视图相关逻辑
export class ViewUtils {
  // 检查视图类型是否允许显示工具栏
  static isAllowedViewType(view: View | null, allowedTypes?: string[]): boolean {
    if (!view) return false;

    // 获取视图类型
    const viewType = view.getViewType();

    // 尝试获取插件实例
    const plugin = (window as any).app?.plugins?.plugins?.['editing-toolbar'] as editingToolbarPlugin | undefined;
    
    // 如果有插件设置且有视图类型设置，使用用户设置的值
    if (plugin?.settings?.viewTypeSettings && plugin.settings.viewTypeSettings[viewType] !== undefined) {
      return plugin.settings.viewTypeSettings[viewType];
    }

    // 如果没有配置允许的类型,使用默认类型
    const defaultAllowedTypes =
      [
        'markdown',
        'canvas',
        'thino_view',
        'meld-encrypted-view',
        'excalidraw',
        'image',
      ];
    const types = allowedTypes || defaultAllowedTypes;

    return types.includes(viewType);
  }

  // 检查是否为源码模式
  static isSourceMode(view: View | null): boolean {
    if (!view) return false;
    return view.getMode?.() === 'source';
  }
} 