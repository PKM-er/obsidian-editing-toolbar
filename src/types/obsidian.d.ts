import "obsidian";



declare module "obsidian" {
  export interface App {
    foldManager: FoldManager
    plugins: Plugins
    commands: Commands
    setting: SettingsManager
}

  interface SettingsManager {
    activeTab: SettingTab | null;
    openTabById(id: string): SettingTab | null;
    openTab(tab: SettingTab): void;
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
    settingTabs: SettingTab[];
    pluginTabs: SettingTab[];
    addSettingTab(): void;
    removeSettingTab(): void;
    containerEl: HTMLDivElement;
}

interface Plugins {
  manifests: Record<string, PluginManifest>;
  plugins: Record<string, Plugin_2>;
  enabledPlugins:any;
  enablePlugin(pluginId: string): Promise<boolean>;
  disblePlugin(pluginId: string): Promise<void>;
}

interface Commands {
  commands: Record<string, Command>;
  addCommand(cmd: Command): void;
  removeCommand(cmd: string): void;
  executeCommandById(id: string): boolean;
}




  interface MarkdownView {
    onMarkdownFold(): void;
  }

  interface MarkdownSubView {
    applyFoldInfo(foldInfo: FoldInfo): void;
    getFoldInfo(): FoldInfo | null;
  }

  interface Editor {
    cm: CodeMirror.Editor;
    getScrollerElement: () => HTMLElement;
    containerEl: HTMLElement;
    getSelection: () => string;
    replaceSelection: (text: string) => void;
    getCursor: () => EditorPosition;
  }

  interface EditorSuggestManager {
    suggests: EditorSuggest<any>[];
  }

  interface Notice {
    noticeEl: HTMLElement;
  }
  interface FoldPosition {
    from: number;
    to: number;
  }

  interface FoldInfo {
    folds: FoldPosition[];
    lines: number;
  }

  export interface FoldManager {
    load(file: TFile): Promise<FoldInfo>;
    save(file: TFile, foldInfo: FoldInfo): Promise<void>;
  }



  export interface WorkspaceItemExt extends WorkspaceItem {
    // the parent of the item
    parentSplit: WorkspaceParentExt;
  
    // the container element
    containerEl: HTMLElement;
  
    // the width of the item in pixels
    width:number;
  }
  
  // interface for extending WorkspaceParent with undocumented properties
  export interface WorkspaceParentExt extends WorkspaceParent, WorkspaceItemExt, WorkspaceContainer {
    // the child items of the split
    children: WorkspaceItemExt[];
  
    // function for child resizing
    onChildResizeStart: (leaf: WorkspaceItemExt, event: MouseEvent) => void;
    // ...and backup thereof
    oldChildResizeStart: (leaf: WorkspaceItemExt, event: MouseEvent) => void;
  
    // split direction
    direction: 'horizontal' | 'vertical';
  }
  
  export class WorkspaceExt extends Workspace {
    floatingSplit: WorkspaceParentExt;
  }

  interface View {
    editor: Editor | undefined;
    leaf: WorkspaceLeaf | undefined;
    getMode: () => string;
  }

  interface WorkspaceLeaf {
    view: View;
    width: number;
  }

  interface WorkspaceRibbon {
    show(): void;
    hide(): void;
  }

}

