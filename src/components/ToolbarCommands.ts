import { App, Command } from 'obsidian';

export class ToolbarCommands {
  private app: App;
  private registeredCommands: Command[] = [];

  constructor(app: App) {
    this.app = app;
  }

  public registerAll() {
    this.registerBasicCommands();
    this.registerFormatCommands();
    this.registerListCommands();
  }

  public unregisterAll() {
    this.registeredCommands.forEach(command => {
      // 取消注册命令
      this.app.commands.removeCommand(command.id);
    });
    this.registeredCommands = [];
  }

  private registerBasicCommands() {
    // 注册基本命令
    const commands: Command[] = [
      {
        id: 'toolbar-toggle',
        name: 'Toggle Toolbar',
        callback: () => {
          // 切换工具栏显示/隐藏
        }
      },
      // 添加更多命令...
    ];

    commands.forEach(command => {
      this.app.commands.addCommand(command);
      this.registeredCommands.push(command);
    });
  }

  private registerFormatCommands() {
    // 注册格式化命令
  }

  private registerListCommands() {
    // 注册列表相关命令
  }
} 