# Changelog

## 3.2.2 (2026-01-12)
### Version 3.2.2 Release Notes
## 3.2.2 (2026-01-12)
### 🐛 Bug Fixes
#### Fixed multi-configuration command synchronization issue
- **Problem**: When multiple toolbar configurations were enabled (top, following, fixed), adding commands in one configuration would incorrectly sync to other configurations
- **Root Cause**: The `updateCurrentCommands()` method was using `this.positionStyle` (the currently displayed toolbar style) instead of the configuration being edited in settings
- **Solution**: Modified `CommandPicker` and `ChooseFromIconList` classes to properly pass the `currentEditingConfig` parameter when updating commands
- **Impact**: Now each toolbar configuration maintains its own independent command list. Adding, modifying, deleting, and reordering commands in one configuration will not affect other configurations
#### Auto-add Text Tools submenu to top toolbar
- **Feature**: When users update the plugin and click the "Repair command" button, the system will automatically add the "Text Tools" submenu to the top toolbar if it doesn't exist
- **Included Commands**:
  - Get Plain Text (获取无语法文本)
  - Full Half Converter (全角半角转换)
  - Insert Blank Lines (插入空行)
  - Remove Blank Lines (删除空行)
  - Split Lines (拆分行)
  - Merge Lines (合并行)
  - Dedupe Lines (去重行)
  - Add Prefix/Suffix (添加前后缀)
  - Number Lines (Custom) (添加行号)
  - Trim Line Ends (去除行首尾空格)
  - Shrink Extra Spaces (压缩多余空格)
  - Remove All Whitespace (移除所有空白)
  - List to Table (列表转表格)
  - Table to List (表格转列表)
  - Extract Between Strings (提取字符串之间内容)
### 📝 Technical Details
**Modified Files**:
- `src/modals/suggesterModals.ts`: Fixed command synchronization in `CommandPicker` and `ChooseFromIconList` classes
- `src/modals/updateModal.ts`: Added `checkTextTools()` and `addTextToolsIfNeeded()` functions to automatically add text tools submenu
### 🔧 How to Update
1. Update the plugin to version 3.2.2
2. Reload Obsidian (Ctrl+R or complete restart)
3. Open Settings → Editing Toolbar
4. Click "Repair command ID" button to apply the text tools submenu (if using top toolbar)
---
## 3.2.2 版本说明 (2026-01-12)
### 🐛 Bug 修复
#### 修复多配置模式下命令同步问题
- **问题描述**：当同时启用多个工具栏配置（顶部、跟随、固定）时，在一个配置中添加命令会错误地同步到其他配置
- **根本原因**：`updateCurrentCommands()` 方法使用了 `this.positionStyle`（当前实际显示的工具栏样式）而不是设置页面正在编辑的配置
- **解决方案**：修改了 `CommandPicker` 和 `ChooseFromIconList` 类，在更新命令时正确传递 `currentEditingConfig` 参数
- **影响**：现在每个工具栏配置都能维护自己独立的命令列表。在一个配置中添加、修改、删除、调整命令顺序都不会影响其他配置
#### 自动添加文本工具子菜单到顶部工具栏
- **功能说明**：当用户更新插件并点击"修复命令"按钮时，如果顶部工具栏中没有"文本工具"子菜单，系统会自动添加
- **包含的命令**：
  - 获取无语法文本 (Get Plain Text)
  - 全角半角转换 (Full Half Converter)
  - 插入空行 (Insert Blank Lines)
  - 删除空行 (Remove Blank Lines)
  - 拆分行 (Split Lines)
  - 合并行 (Merge Lines)
  - 去重行 (Dedupe Lines)
  - 添加前后缀 (Add Prefix/Suffix)
  - 添加行号（自定义）(Number Lines)
  - 去除行首尾空格 (Trim Line Ends)
  - 压缩多余空格 (Shrink Extra Spaces)
  - 移除所有空白 (Remove All Whitespace)
  - 列表转表格 (List to Table)
  - 表格转列表 (Table to List)
  - 提取字符串之间内容 (Extract Between Strings)
### 📝 技术细节
**修改的文件**：
- `src/modals/suggesterModals.ts`：修复了 `CommandPicker` 和 `ChooseFromIconList` 类中的命令同步问题
- `src/modals/updateModal.ts`：添加了 `checkTextTools()` 和 `addTextToolsIfNeeded()` 函数来自动添加文本工具子菜单
### 🔧 如何更新
1. 将插件更新到 3.2.2 版本
2. 重新加载 Obsidian（Ctrl+R 或完全重启）
3. 打开设置 → Editing Toolbar
4. 点击"修复命令 ID"按钮以应用文本工具子菜单（如果使用顶部工具栏）
### 🙏 致谢
感谢所有报告问题和提供反馈的用户！
### #266 支持子菜单改名
### #272 #274 fixed
### 相关命令国际化
### Feat:增加文本处理工具
  Line Operations（行操作）：
  - Get Plain Text
  - Full Half Converter
  - Insert Blank Lines
  - Remove Blank Lines
  - Split Lines
  - Merge Lines
  - Dedupe Lines
  Text Processing（文本处理）：
  - Add Prefix/Suffix ✨ 新增
  - Number Lines (Custom) ✨ 更新名称
  - Trim Line Ends
  - Shrink Extra Spaces ✨ 更新名称
  - Remove All Whitespace
  Advanced Tools（高级工具）：
  - List to Table
  - Table to List
  - Extract Between Strings
### 子菜单可以改名可以设置为按钮和菜单两种形式
### Add Portuguese translations for Editing Toolbar settings and commands
### Merge pull request #268 from davidvkimball/master
Fixed issue where it conflicted with the Settings Search plugin.
### Update manifest.json and CHANGELOG.md for version 3.2.1
### Fixed issue where it conflicted with the Settings Search plugin. If editing toolbar was hidden, and you reloaded Obsidian, it would show anyway, even though it was hidden. This fixes this conflict.


## 3.2.2 (2026-01-12)

### 🐛 Bug Fixes

#### Fixed multi-configuration command synchronization issue
- **Problem**: When multiple toolbar configurations were enabled (top, following, fixed), adding commands in one configuration would incorrectly sync to other configurations
- **Root Cause**: The `updateCurrentCommands()` method was using `this.positionStyle` (the currently displayed toolbar style) instead of the configuration being edited in settings
- **Solution**: Modified `CommandPicker` and `ChooseFromIconList` classes to properly pass the `currentEditingConfig` parameter when updating commands
- **Impact**: Now each toolbar configuration maintains its own independent command list. Adding, modifying, deleting, and reordering commands in one configuration will not affect other configurations

#### Auto-add Text Tools submenu to top toolbar
- **Feature**: When users update the plugin and click the "Repair command" button, the system will automatically add the "Text Tools" submenu to the top toolbar if it doesn't exist
- **Included Commands**: Get Plain Text, Full Half Converter, Insert Blank Lines, Remove Blank Lines, Split Lines, Merge Lines, Dedupe Lines, Add Prefix/Suffix, Number Lines, Trim Line Ends, Shrink Extra Spaces, Remove All Whitespace, List to Table, Table to List, Extract Between Strings

### 📝 Technical Details
**Modified Files**: `src/modals/suggesterModals.ts`, `src/modals/updateModal.ts`

---

## 3.2.1 (2026-01-04)
### Fixed issue where it conflicted with the Settings Search plugin. If editing toolbar was hidden, and you reloaded Obsidian, it would show anyway, even though it was hidden. This fixes this conflict.
### Update CHANGELOG.md
### Update manifest.json and CHANGELOG.md for version 3.2.0



## 3.2.0 – Multi-toolbar and settings overhaul (2025-12-05)


🎉 Release v3.2.0

  这是一个重大更新版本，全面改进了工具栏的启用、配置和预览方式，并优化了设置界面的文本和翻译。 

  **从旧版本升级到 v3.2.0 后，请完全重启 Obsidian**   

  ✨ 新功能

  🎯 多工具栏同时运行 #259

  - 独立工具栏切换：顶部、跟随和固定工具栏现在可以在"设置 → 常规"中独立切换
  - 可以单独运行一个工具栏，或同时运行任意两个，甚至三个全部启用

  ⚙️ 激活与外观分离

  - 工具栏的激活状态仅由"设置 → 常规"中的切换开关控制
  - 原有的"编辑工具栏位置"控制已重构为"工具栏设置"部分，仅控制所选工具栏的外观和行为（位置、布局等），而不控制工具栏类型

  🎨 独立命令集

  - "命令"选项卡现在支持三种工具栏类型
  - 每个工具栏都有自己的命令配置，顶部、跟随和固定工具栏可以拥有不同的按钮集，互不覆盖

  👁️ 更新的预览面板

  - 预览面板专注于显示所选工具栏的外观（位置、方向、布局）
  - 固定工具栏预览已标准化

  🔧 正则命令增强 (#265)

  - 支持对当前行应用正则表达式操作，无需选中整行即可快速处理 (感谢 @felix)

  🐛 Bug 修复

  - 修复工具栏可能意外镜像或复制彼此命令配置的问题
  - 修复外观和主题设置可能跨工具栏模式泄漏的问题，现在正确限定在所选工具栏范围内
  - 修复子菜单被遮挡的显示问题
  - 修复早期工具栏更改引入的一些小布局故障
  - 修复部分翻译错误

  ⚡ 性能优化

  - 增加工具栏缓存机制，显著提升响应速度和用户体验

  🔧 改进

  设置布局和措辞

  - 将设置重新组织为更清晰的"常规"与"外观"分组
  - 在整个 UI 中统一三种工具栏类型的命名
  - 清理标签和描述，使英文措辞更清晰，标点更一致

  视觉优化

  - 清理所有工具栏变体的 CSS，实现更一致的间距、对齐和悬停状态
  - 进行小幅调整，使工具栏在不同宽度和缩放级别下保持可读性和整洁
  - 更新"玻璃"主题以提高可读性

  UI 优化

  - 语义化标签 (#257)：高亮背景色改用 <mark> 标签，替代 <span> 标签 (感谢 @MarkusRitschel)
  - 命令名称优化 (#250)：更新工具栏、命令面板和工具提示的命令名称，提升易用性 (感谢 @NicolaiSkodtHolmgaard)
  - 更改正则命令相关选项的位置，优化设置界面布局
  - 取消中键关闭功能，改为支持右键关闭格式刷

  🌍 国际化 (#259)

  - 大规模翻译改进：全面更新多语言翻译文件 (感谢 @MiserMagus)
    - en (默认英语)
    - en-gb (新增英式英语变体)
    - zh-cn (简体中文)
  - 新的 en-gb 语言环境使用英式拼写和标点符号
  - 所有当前设置文本现已完全翻译，并与新的配置流程保持一致
  - 修复设置界面、模态框和命令的翻译问题
  - 更新 CHANGELOG 文档

  📦 兼容性

  - 导入/导出行为在此版本中保持不变
  - 现有配置文件保持兼容

  🙏 致谢

  特别感谢以下贡献者对本次重大发布的贡献：

  - @MiserMagus - 多工具栏实现！大量的翻译改进、文档更新和设置界面重构工作
  - @felix - 实现正则表达式当前行支持功能
  - @MarkusRitschel - 改进高亮标签的语义化实现
  - @NicolaiSkodtHolmgaard - 优化命令名称和用户界面
  

This release overhauls how toolbars are enabled, configured, and previewed, and cleans up the settings UI text and translations.

### New

- Multiple toolbar types at the same time
  - Top, Following, and Fixed toolbars can now be toggled individually in **Settings → General**.
  - You can run a single toolbar, any two of them, or all three together.

- Clear separation of activation vs appearance
  - Which toolbars are active is controlled only by the toggles in **Settings → General**.
  - The old “Editing toolbar position” control has been reworked into a **Toolbar Settings** section that only controls how the selected toolbar looks and behaves (position, layout, etc.), not which toolbar is represented.

- Per-toolbar command sets
  - The **Commands** tab is now aware of the three toolbar types.
  - Each toolbar has its own command configuration, so Top, Following, and Fixed can all have different button sets without overwriting one another.

- Updated preview panel
  - The preview focuses on showing the selected toolbar’s appearance (position, orientation, layout) as you adjust settings.
  - It still does not mirror the command set.
  - "Fixed toolbar" preview has been normalised.

### Improvements

- Settings layout and wording
  - Reorganised settings into clearer **General** vs **Appearance** groups.
  - Normalised naming for the three toolbar types across the UI.
  - Cleaned up labels and descriptions for clearer wording and more consistent punctuation in English.

- Visual polish
  - CSS clean-up across all toolbar variants for more consistent spacing, alignment, and hover states.
  - Small adjustments to keep toolbars readable and tidy at different widths and zoom levels.
  - Updated the "glass" theme for better readability.

### Localization / translations

- Updated built-in locales for all new and renamed settings strings:
  - `en` (default English),
  - `en-gb` (new British English variant),
  - `zh-cn` (Simplified Chinese).
- The new `en-gb` locale mirrors the default English text but uses British spelling and punctuation.
- For these locales, all current settings text should now be fully translated and consistent with the new configuration flow.

### Fixes

- Fixed issues where:
  - Toolbars could unintentionally mirror or copy each other’s command configuration.
  - Appearance and theme settings could bleed across toolbar modes instead of staying scoped to the selected toolbar.
- Fixed a few minor layout glitches introduced by earlier toolbar changes.

### Unchanged

- Import/export behaviour is unchanged in this release; existing configuration files remain compatible.


## 3.1.18 (2025-07-10)
### 国际化部分字段
### 修复自定义正则命令，换行符\n无效
修复自定义正则命令，换行符\n无效
修复命令列表设置时 点击事件跟拖动列表事件冲突
支持笔记属性增加 cssclasses:hide-toolbar 对某个笔记隐藏工具栏。
### #226 fixed
### Update manifest.json and CHANGELOG.md for version 3.1.16


## 3.1.16 (2025-05-15)
### Update manifest.json
### Update commands.ts
### 自定义命令 支持添加换行符等
### Update manifest.json and CHANGELOG.md for version 3.1.15


## 3.1.15 (2025-05-14)
### #219 fixed
添加callout 支持 admonition 插件的自定义的callout类型
### Update manifest.json and CHANGELOG.md for version 3.1.14


## 3.1.14 (2025-05-12)
### #220  fixed
When the toolbar position is top, add an option to set whether the toolbar is full-width or centred.
### Update README.md
### Update README-zh_cn.md
### Update manifest.json and CHANGELOG.md for version 3.1.13


## 3.1.13 (2025-03-30)
### 增加格式刷应用时光标特殊效果
### 优化格式刷命令，会自动识别光标所在格式
支持选中callout文本，应用格式刷。
### 确认对话框更改为模态框
### 图片链接也可以设置title
### Update manifest.json and CHANGELOG.md for version 3.1.12


## 3.1.12 (2025-03-29)
### 增加获取远程url标题，自适应图片宽度
### 优化对链接格式判断逻辑
### Update manifest.json
### Merge branch 'master' of https://github.com/PKM-er/obsidian-editing-toolbar
### Update manifest.json and CHANGELOG.md for version 3.1.10


## 3.1.10 (2025-03-28)
### 右键增加链接，图片修改模态框
### Update CHANGELOG.md
### Update manifest.json and CHANGELOG.md for version 3.1.9


## 3.1.9 (2025-03-27)
### ADD Renumber  List
### Update manifest.json and CHANGELOG.md for version 3.1.8
![renumber](https://github.com/user-attachments/assets/d086221e-38c8-4c23-b5fd-86766694d957)


## 3.1.8 (2025-03-22)
### #214 fixed 兼容 Excalidraw
### Update manifest.json and CHANGELOG.md for version 3.1.7


## 3.1.7 (2025-03-22)
### fix：移动端固定模式失效
### Update manifest.json and CHANGELOG.md for version 3.1.6


## 3.1.6 (2025-03-21)
### 移动端设备开启following时屏蔽系统菜单
### 优化following工具栏位置展示
###  解决移动端选中文本无法触发following样式
### Update CHANGELOG.md
### Update manifest.json and CHANGELOG.md for version 3.1.5


## 3.1.5 (2025-03-20)
### #35 #55 #203 feat: Support toolbar theme & icon size!!
![image](https://github.com/user-attachments/assets/dc75340a-5b59-4212-ae4f-3b17ab6242d9)
### 多配置下，状态栏切换位置也可以初始化工具栏
### Update manifest.json and CHANGELOG.md for version 3.1.4


## 3.1.4 (2025-03-19)
### 优化跟随模式工具栏位置
- 如果执行命令后文本仍然是选中状态，工具栏不会消失。
- 当选择范围都在一行工具栏总在上方出现。
### #184 #152 优化following模式呼出逻辑
- 双击鼠标中键可以在不选择文本情况下呼出following菜单
- 键盘选择也可以呼出菜单
- 修复某些主题下显示异常
### Update manifest.json and CHANGELOG.md for version 3.1.3


## 3.1.3 (2025-03-18)
### #207 现在工具栏支持添加到任何视图类型
- 通过在状态栏控制当前视图类型下启用还是禁用。
- 视图类型一旦禁用，此类视图都不会再显示工具栏
### 状态栏增加外观设置，视图设置
### 优化工具栏显示规则
对于不在允许列表中的视图类型：
总是隐藏工具栏
对于Markdown视图：
在源码（编辑）模式下：
following样式：只有选中文本时才显示
其他样式：始终显示
在阅读模式下：
所有样式：始终隐藏
对于其他允许的视图类型（canvas、excalidraw等）：
所有样式：始终显示
### #211  只对低版本进行更新提示
### Update CHANGELOG.md
### Update manifest.json and CHANGELOG.md for version 3.1.2


## 3.1.2 (2025-03-17)
- 增加不同配置文件可以互相导入
- 针对对每个配置命令可以单独初始化
- 支持对某个样式工具栏单独导出
- 优化工具栏子菜单位置，减少被遮挡的概率
- 完善导入导出信息，增加元数据
- 增加正则表达式命令
- 现在可以添加正则格式命令，可以对选中文本和剪贴板数据执行命令并插入当前编辑器中。



## 3.1.1 (2025-03-14)
### 添加了导入导出功能

添加了导入导出功能

- 支持三种导出类型：所有设置、仅工具栏命令、仅自定义命令
- 支持导入功能，覆盖导入（完全清空已有设置）和更新导入（更新已有设置和新增）。



## 3.1.0 (2025-03-14)
### 功能亮点
### 1. 支持自定义命令添加到不同配置文件
- 增加不同场景（following、top、fixed、mobile）使用单独的工具栏配置
- 新增自定义命令部署功能，支持将命令添加到不同配置（following、top、fixed、mobile）
- 添加部署选择界面，可选择将命令部署到单个或多个配置
- 部署时自动检查目标配置中是否已存在相同命令，避免重复添加

### 2. 自定义命令管理优化
- 编辑自定义命令时，命令ID设置为只读，防止误修改
- 添加删除自定义命令会同步更新配置文件
- 恢复默认设置时保留自定义命令，不再丢失用户自定义内容

### 3. 删除操作安全优化
- 所有删除操作增加二次确认机制


### 注意事项
1. 多配置功能需要在设置中启用"Enable multiple configurations"
2. 移动端配置需要启用"Mobile enabled"才会显示
3. 恢复默认设置时会保留自定义命令，其他设置将重置为默认值

## 3.0.9 (2025-03-13)
- 增加更新说明 (8341694)
- Update manifest.json and CHANGELOG.md for version 3.0.8 (56cf078)
## 3.0.8 (2025-03-13)

### 更新内容 (3.0.7 -> 3.0.8)
- add changelog (118f535)

- 增加剪贴板链接自动解析命令（Insert Link(Modal)）
- 智能解析外链图片
- 智能解析文本中的链接文本 标题 以及别名，快捷转换为md格式并插入。
- 智能解析外链图片的宽高
- 优化自定义命令光标偏移判断（当偏移量大于0 才进行光标偏移）

## 3.0.7 (2025-03-13)

## 3.0.5 (2025-03-12)

### 增加智能解析外部链接(图片)功能

## 3.0.4 (2025-03-11)

### 增加callout模态框插入指令
- 使用之前先修复指令

## 3.0.3 (2025-03-11)

### 增加对excalidraw支持
- 修复文件上传命令报错
- 修复excalidraw样

## 3.0.0 Major update！

### ✨新功能
- 增加一键添加自定义命令到工具栏
- 增加自定义命令功能
- 增加对 Callout 格式擦除的支持
- 支持 Markdown 指令格式刷
- 增加对 Canvas 视图的支持
- 增加对 meld-encrypted-view 视图的支持
- 固定模式下支持水平和垂直调节工具栏
### 优化
- 优化 Pickr 引起的内存占用问题
- 设置项改版
- 移动端体验优化
### 修复
- 修复编辑器光标失焦问题
- 修改拼写问题
### 清理
- 删除冗余文件
### 重构
- 代码重构
### 注意事项
本次更新后，请在弹窗中点击“修复命令”按钮，以确保之前的旧命令不会失效。
### ✨New Features
Added one-click addition of custom commands to the toolbar
Added custom command functionality
Added support for erasing Callout format
Added support for Markdown command format brush
Added support for Canvas view
Added support for meld-encrypted-view view
Added support for horizontal and vertical toolbar adjustments in fixed mode
Added update notifications
### Improvements
Optimized memory usage caused by Pickr
Revamped settings interface
Optimised for mobile devices
### Fixes
Fixed editor cursor focus loss issue
Fixed spelling issues
### Cleanup
Removed redundant files
### Refactor
Code refactoring
### Notes
After this update, please click the "Fix Commands" button in the popup to prevent previous commands from becoming invalid.
