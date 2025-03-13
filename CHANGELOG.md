# Changelog

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