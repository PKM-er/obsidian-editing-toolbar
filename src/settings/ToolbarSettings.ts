export interface ToolbarSettings {
  enabled?: boolean;
  positionStyle: 'following' | 'top' | 'fixed';
  aestheticStyle: 'default' | 'tiny' | 'glass';
  cMenuVisibility: boolean;
  cMenuBottomValue: number;
  cMenuWidth: number;
  cMenuNumRows: number;
  appendMethod: 'body' | 'workspace';
  autohide: boolean;
  isLoadOnMobile: boolean;
  menuCommands: ToolbarCommand[];
  custom_bg1: string;
  custom_bg2: string;
  custom_bg3: string;
  custom_bg4: string;
  custom_bg5: string;
  custom_fc1: string;
  custom_fc2: string;
  custom_fc3: string;
  custom_fc4: string;
  custom_fc5: string;
  [key: string]: any;
}

export interface ToolbarCommand {
  id: string;
  name: string;
  icon: string;
  SubmenuCommands?: ToolbarCommand[];
}

export interface editingToolbarSettings {
  enabled?: boolean;
  positionStyle: 'following' | 'top' | 'fixed';
  cMenuFontColor?: string;
  cMenuBackgroundColor?: string;
  custom_bg1: string;
  custom_bg2: string;
  custom_bg3: string;
  custom_bg4: string;
  custom_bg5: string;
  custom_fc1: string;
  custom_fc2: string;
  custom_fc3: string;
  custom_fc4: string;
  custom_fc5: string;
  [key: string]: any;
}