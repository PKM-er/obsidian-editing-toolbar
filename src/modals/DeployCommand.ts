import { App, Modal, Setting, Notice, setIcon, ToggleComponent } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";

interface DeployOption {
  id: string;
  name: string;
  enabled: boolean;
  toggle?: ToggleComponent;
}

export class DeployCommandModal extends Modal {
    private deployOptions: DeployOption[] = [];
    private command: any;
    private plugin: editingToolbarPlugin;
  

    constructor(app: App, plugin: editingToolbarPlugin, command: any) {
      super(app);
      this.plugin = plugin;
      this.command = command;
      this.deployOptions = [
        { id: 'following', name: t('Following Style'), enabled: true },
        { id: 'top', name: t('Top Style'), enabled: true },
        { id: 'fixed', name: t('Fixed Style'), enabled: true },
      ];
      if (this.plugin.settings.isLoadOnMobile) {
        this.deployOptions.push({ id: 'mobile', name: t('Mobile Style'), enabled: true });
      }
    }
  
    onOpen() {
      const { contentEl } = this;
      contentEl.empty();
      
      contentEl.createEl('h3', { text: t('Deploy command to configurations') });
      
      const allContainer = contentEl.createDiv('deploy-option');
  
  
      const optionsContainer = contentEl.createDiv('deploy-options');
      this.deployOptions.forEach(option => {
        const setting = new Setting(optionsContainer)
          .setName(option.name)
          .addToggle(toggle => {
            return toggle
              .setValue(option.enabled)
              .onChange(value => {
                option.enabled = value;
              });
          });
        setting.settingEl.addClass('deploy-option');
      });
  
      const buttonContainer = contentEl.createDiv('deploy-buttons');
      new Setting(buttonContainer)
        .addButton(button => button
          .setButtonText(t('Deploy'))
          .setCta()
          .onClick(() => {
            this.deployCommand();
            this.close();
          }))
        .addButton(button => button
          .setButtonText(t('Cancel'))
          .onClick(() => {
            this.close();
          }));
    }
    

  
    private deployCommand() {
      // 创建工具栏命令对象
      const toolbarCommand = {
        id: `editing-toolbar:${this.command.id}`,
        name: this.command.name,
        icon: this.command.icon || 'obsidian-new'
      };

      // 检查默认配置中是否已存在该命令
      const existsInDefault = this.plugin.settings.menuCommands.some(
        cmd => cmd.id === toolbarCommand.id
      );

      // 如果默认配置中不存在，则添加
      if (!existsInDefault) {
        this.plugin.settings.menuCommands.push({...toolbarCommand});
      }

      let deployedCount = 0;
      
      // 部署到选中的配置
      this.deployOptions.forEach(option => {
        if (option.enabled) {
          let targetCommands: any[] | undefined;
          
          switch (option.id) {
            case 'mobile':
              targetCommands = this.plugin.settings.mobileCommands;
              break;
            case 'following':
              targetCommands = this.plugin.settings.followingCommands;
              break;
            case 'top':
              targetCommands = this.plugin.settings.topCommands;
              break;
            case 'fixed':
              targetCommands = this.plugin.settings.fixedCommands;
              break;
          }

          if (targetCommands && !targetCommands.some(cmd => cmd.id === toolbarCommand.id)) {
            targetCommands.push({...toolbarCommand});
            deployedCount++;
          }
        }
      });

      // 保存设置
      this.plugin.saveSettings().then(() => {
        let message = '';
        
        if (deployedCount > 0) {
          const deployedConfigs = this.deployOptions
            .filter(opt => opt.enabled)
            .map(opt => opt.name)
            .join(', ');
          
          message = t('Command deployed to: ') + deployedConfigs;
        
        } else {
          message = t('Command already exists in selected configurations');
        }

        new Notice(message);
        // 触发工具栏更新
        dispatchEvent(new Event("editingToolbar-NewCommand"));
        this.plugin.reloadCustomCommands();
      });
    }
}

  
