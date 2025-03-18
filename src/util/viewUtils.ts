import { View } from 'obsidian';

// 新建工具类文件来统一管理视图相关逻辑
export class ViewUtils {
  // 检查视图类型是否允许显示工具栏
  static isAllowedViewType(view: View | null, allowedTypes?: string[]): boolean {
    if (!view) return false;

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
    const types = defaultAllowedTypes;

    const viewType = view.getViewType();
    // 特殊处理 markdown 视图类型
    if (viewType === 'markdown') {
      return true;
    }
    return types.includes(view.getViewType());
  }

  // 检查是否为源码模式
  static isSourceMode(view: View | null): boolean {
    if (!view) return false;
    return view.getMode?.() === 'source';
  }
} 