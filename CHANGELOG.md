# Changelog

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
