import { App, Command } from 'obsidian';
import type editingToolbarPlugin from '../plugin/main';

export class CommandRegistry {
  private app: App;
  private plugin: editingToolbarPlugin;
  private commands: Command[] = [];

  constructor(app: App, plugin: editingToolbarPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  public registerCommand(command: Command) {
    // @ts-ignore - Obsidian 类型定义不完整
    this.app.commands.addCommand(command);
    this.commands.push(command);
  }

  public removeCommand(commandId: string) {
    // @ts-ignore - Obsidian 类型定义不完整
    this.app.commands.removeCommand(commandId);
    this.commands = this.commands.filter(cmd => cmd.id !== commandId);
  }

  public executeCommand(commandId: string) {
    // @ts-ignore - Obsidian 类型定义不完整
    this.app.commands.executeCommandById(commandId);
  }
} 