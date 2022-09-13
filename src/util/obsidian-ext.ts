import { Workspace, WorkspaceContainer, WorkspaceItem, WorkspaceParent, WorkspaceWindow } from 'obsidian';

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