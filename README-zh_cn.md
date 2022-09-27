### 中文 | [English](./README.md)

# obsidian-editing-toolbar 插件

感谢 [cmenu](https://github.com/chetachiezikeuzor/cMenu-Plugin)插件的开发，给我了很多灵感，但这个插件已经一年多没有维护了，于是我重新魔改了它，并增加了很多有趣的功能，包括置顶工具栏,光标跟随等，于是 Cmenu toolbar 就诞生了。
**Obsidian Editing Toolbar**是一个提供类似于 MS-Word 的工具栏的插件，并增加了一个最小的和用户友好的文本编辑器模式，以获得更顺畅的写作/编辑体验。不需要记住复杂的 markdown 命令，类似于富文本编辑器的所见即所得。
这个插件是专门为那些希望有一个简单的文本编辑器来帮助标记他们的笔记设计的。它解决了必须记住许多热键或命令来实现所需要的功能的问题。一个简单的工具条可以改善你在 Obsidian 中的写作体验。

> 建议配合[增强编辑插件](https://github.com/obsidian-canzi/Enhanced-editing)，可以添加更多的实用的编辑指令。

![](editing-toolbar-demo.gif)

## 目录导航

    - [如何安装](#如何安装)
    - [视频介绍](#视频介绍)
    - [功能特性](#功能特性)
    - [跟其他插件协作](#跟其他插件协作)
    - [完整示例库分享](#完整示例库分享)
    - [支持与赞助](#赞助)

## 如何安装

1.  (推荐)brat 安装。插件目前还没有上架官方商店可以通过  [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)去安装。
    `cumany/obsidian-editing-toolbar`
2.  所有的插件手动安装方法都是一样的，本插件也不例外。 
    在[releases](https://github.com/cumany/obsidian-editing-toolbar/releases) 下载 `main.js` `mainfest.json` `styles.css` 三个文件
    在Obsidian库目录下的 `.obsidian\plugins\` 新建一个插件目录名字`Obsidian-editing-toolbar`文件夹。把刚才下载的三个文件放进去。
     ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209221441394.png)
    最后在obsidian中开启本插件即可。
3.  手动安装教程
    [Plugins mini FAQ ](https://forum.obsidian.md/t/plugins-mini-faq/7737)
    [如何安装 obsdiain 插件](https://publish.obsidian.md/chinesehelp/01+2021%E6%96%B0%E6%95%99%E7%A8%8B/%E5%A6%82%E4%BD%95%E5%AE%89%E8%A3%85obsdiain%E6%8F%92%E4%BB%B6)

## 视频介绍

[谁说 Obsidian 不如语雀，这个插件让你使用 ob 不用再记那么多指令了，ob 工具栏你值得拥有](https://www.bilibili.com/video/BV1mY4y1T7g2/)

## 功能特性

功能在延续之前 cmenu 功能的基础上增加了下面额外的功能。

1. 增加新的工具栏样式 tiny

   ![|400](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071131715.png)
2. 增加工具栏位置选项，top，following

   ![|400](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071133753.png)
   ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071751006.gif)

3. 增加一些内置命令
   1. change-font-color
    字体颜色调色板和格式刷
   2. change-background-color
   背景颜色调色板和格式刷
   3. indent-list
   列表缩进
   4. undent-list
   列表反缩进
   5. editor-undo
   6. editor-redo
   7. hrline  
      会插入一个`---`分割线
   8. justify 两端对齐
      插入一个 html 代码，让文字两端对齐`<p align="justify">.....</p>`
   9. left
      插入一个 html 代码，让文字左对齐`<p align="left">.....</p>`
   10. right  
        插入一个 html 代码，让文字右对齐`<p align="right">.....</p>`
   11. center 居中对齐
       插入一个 html 代码，让文字居中`<center>.....</center>`
   12. fullscreen-focus
       默认绑定快捷键`Ctrl+shift+F11`。
       将使笔记页面全屏显示，让你更专注于写作本身。要退出全屏，请按 ESC 或再次执行全屏命令。
   13. workplace-fullscreen-focus
       默认绑定快捷键`Ctrl+F11`。
       与全屏聚焦模式不同，这个模式只是隐藏了左右侧边栏的面板，它只是工作区全屏。
   14. head 1-6 级标题设置
       默认绑定快捷键`Ctrl+1,ctrl+2,...Ctrl+6`。

       ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071707695.png)
   15. 支持自定义命令图标

       ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071717111.gif)
   16. 支持修改命令名称

       ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071720159.gif)
   17. 支持添加子菜单

       ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071722207.gif)
   18. 支持菜单拖动排序
   19. 增加格式刷功能 内置字体颜色和背景颜色两种格式刷（鼠标中键或者右键可取消格式刷状态）

       ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071731151.gif)
   20. 工具栏图标宽度自适应收缩
   
       ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209072157728.gif)

### 跟其他插件协作

1. [emjoi toolbar ](obsidian://show-plugin?id=obsidian-emoji-toolbar)快捷插入表情
   ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209092001600.gif)


2.  [Obsidian-Table-Generator](https://github.com/Quorafind/Obsidian-Table-Generator/)  & [ob-table-enhance](https://github.com/Stardusten/ob-table-enhancer) 快捷插入表格并编辑
   ![](https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209092008571.gif)

> 上面插件均可从示例库获取，示例库的插件一般都经过了优化并修复了一些错误
☟☟☟
### 完整示例库分享

这是可以让你大开眼界的 Obsidian 示例库，里面有很多眼花缭乱的功能和示例，相信你看过一定会惊叹，这是 Obsidian 吗？
[Blue-topaz-examples](https://github.com/cumany/Blue-topaz-examples)

### 赞助

Thank you very much for your support!

<div align="center">
<img src="https://ghproxy.com/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209192228895.png" width="400px">
</div>
