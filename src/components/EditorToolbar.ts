import { App, WorkspaceLeaf, Editor, MarkdownView, View, requireApiVersion } from 'obsidian';
import { ToolbarSettings } from '../settings/ToolbarSettings';
import { ToolbarUI } from './ToolbarUI';
import { ToolbarCommands } from './ToolbarCommands';
import { ViewUtils } from '../util/viewUtils';
interface Position {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
}

export class EditorToolbar {
  private app: App;
  private settings: ToolbarSettings;
  private ui: ToolbarUI;
  private commands: ToolbarCommands;
  private activeDocument: Document;
  
  constructor(app: App, settings: ToolbarSettings) {
    this.app = app;
    this.settings = settings;
    this.ui = new ToolbarUI();
    this.commands = new ToolbarCommands(app);
    requireApiVersion("0.15.0") ? 
      this.activeDocument = activeWindow.document : 
      this.activeDocument = window.document;
  }

  public initialize() {
    if (!this.settings.enabled) {
      return;
    }

    this.ui.create();
    this.commands.registerAll();
    this.updatePosition();
    this.registerEvents();
  }

  public destroy() {
    this.ui.destroy();
    this.commands.unregisterAll();
    this.unregisterEvents();
  }

  public toggle() {
    if (this.ui.isVisible()) {
      this.ui.hide();
    } else {
      this.ui.show();
    }
  }

  public handleActiveLeafChange() {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf || !this.isValidView(activeLeaf.view)) {
      this.ui.hide();
      return;
    }

    this.updateToolbarForLeaf(activeLeaf);
  }

  public handleLayoutChange() {
    this.updatePosition();
  }

  private registerEvents() {
    // 注册编辑器相关事件
    this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this));
    this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this));
    this.app.workspace.on('resize', this.handleLayoutChange.bind(this));

    // 注册文档事件
    this.activeDocument.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.activeDocument.addEventListener('wheel', this.handleWheel.bind(this));
  }

  private unregisterEvents() {
    this.app.workspace.off('active-leaf-change', this.handleActiveLeafChange.bind(this));
    this.app.workspace.off('layout-change', this.handleLayoutChange.bind(this));
    this.app.workspace.off('resize', this.handleLayoutChange.bind(this));

    this.activeDocument.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.activeDocument.removeEventListener('wheel', this.handleWheel.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.settings.positionStyle !== "following") return;
    
    if (!e.shiftKey) {
      this.ui.hide();
    }
  }

  private handleWheel() {
    if (this.settings.positionStyle !== "following") return;
    
    this.ui.hide();
  }

  private isValidView(view: View): boolean {
    const viewType = view.getViewType();
    return ViewUtils.isAllowedViewType(view);
  }

  private updateToolbarForLeaf(leaf: WorkspaceLeaf) {
    const editor = this.getEditor(leaf);
    if (!editor) {
      return;
    }

    this.ui.update(editor);
    this.updatePosition();
  }

  private getEditor(leaf: WorkspaceLeaf): Editor | null {
    if (!leaf || !leaf.view) {
      return null;
    }

    const view = leaf.view as MarkdownView;
    return view.editor;
  }

  private updatePosition() {
    if (!this.settings.enabled) {
      return;
    }

    const position = this.calculatePosition();
    this.ui.setPosition(position);
  }

  private calculatePosition(): Position {
    const position: Position = {};
    const editor = this.getEditor(this.app.workspace.activeLeaf);
    
    if (!editor) {
      return position;
    }

    if (this.settings.positionStyle === "following") {
      const cursor = editor.getCursor();
      // @ts-ignore - 使用 obsidian-ex.d.ts 中的扩展类型
      const coords = editor.coordsAtPos ? editor.coordsAtPos(cursor) : null;
      
      if (!coords) {
        return position;
      }

      position.top = coords.top - this.ui.getHeight() - 10;
      position.left = coords.left;

      // @ts-ignore - 使用扩展类型
      const editorRect = editor.getScrollerElement ? 
        editor.getScrollerElement().getBoundingClientRect() : 
        editor.containerEl.getBoundingClientRect();

      if (position.top < editorRect.top) {
        position.top = coords.bottom + 10;
      }
      if (position.left + this.ui.getWidth() > editorRect.right) {
        position.left = editorRect.right - this.ui.getWidth() - 10;
      }
    } else if (this.settings.positionStyle === "top") {
      position.top = this.settings.cMenuBottomValue;
      position.left = 0;
    } else {
      position.bottom = this.settings.cMenuBottomValue;
      position.left = 50;
    }

    return position;
  }

  public isEnabled(): boolean {
    return this.settings.enabled;
  }

  public updateSettings(settings: Partial<ToolbarSettings>) {
    Object.assign(this.settings, settings);
    this.updatePosition();
  }

  public getUI(): ToolbarUI {
    return this.ui;
  }

  public getCommands(): ToolbarCommands {
    return this.commands;
  }
} 