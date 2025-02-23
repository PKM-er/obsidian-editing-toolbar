import { Editor } from 'obsidian';

interface Position {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
}

export class ToolbarUI {
  private container: HTMLElement;
  private visible: boolean = false;
  private height: number = 40;
  private width: number = 400;

  constructor() {
    this.container = document.createElement('div');
    this.container.addClass('editing-toolbar');
  }

  public create() {
    document.body.appendChild(this.container);
    this.hide();
  }

  public destroy() {
    this.container.remove();
  }

  public show() {
    this.container.style.display = 'flex';
    this.visible = true;
  }

  public hide() {
    this.container.style.display = 'none';
    this.visible = false;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public update(editor: Editor) {
    // 更新工具栏内容
    this.container.empty();
    // 添加工具栏按钮等
  }

  public setPosition(position: Position) {
    if (position.top !== undefined) {
      this.container.style.top = `${position.top}px`;
      this.container.style.bottom = 'auto';
    }
    if (position.bottom !== undefined) {
      this.container.style.bottom = `${position.bottom}px`;
      this.container.style.top = 'auto';
    }
    if (position.left !== undefined) {
      this.container.style.left = `${position.left}px`;
    }
  }

  public getHeight(): number {
    return this.height;
  }

  public getWidth(): number {
    return this.width;
  }
} 