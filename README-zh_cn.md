### 中文 | [English](./README.md)

# obsidian-editing-toolbar 插件

感谢 [cmenu](https://github.com/chetachiezikeuzor/cMenu-Plugin)插件的开发，给我了很多灵感，但这个插件已经一年多没有维护了，在重新魔改后，增加了很多有趣的功能，包括置顶工具栏,光标跟随等，于是  Editing Toolbar 就诞生了。
**Obsidian Editing Toolbar**是一个提供类似于 MS-Word 的工具栏的插件，并增加了一个最小的和用户友好的文本编辑器模式，以获得更顺畅的写作/编辑体验。不需要记住复杂的 markdown 命令，类似于富文本编辑器的所见即所得。
这个插件是专门为那些希望有一个简单的文本编辑器来帮助标记他们的笔记设计的。它解决了必须记住许多热键或命令来实现所需要的功能的问题。一个简单的工具条可以改善你在 Obsidian 中的写作体验。

> 建议配合[增强编辑插件](https://github.com/obsidian-canzi/Enhanced-editing)，可以添加更多的实用的编辑指令。

![](editing-toolbar-demo.gif)

## 加入交流群

QQ： 825255377

## 详细教程 

[Obsidian 插件：Editing Toolbar 必装的可视化编辑工具]( https://pkmer.cn/show/20230329145815 )

## 目录导航

    - [如何安装](#如何安装)
    - [视频介绍](#视频介绍)
    - [3.x进阶功能说明](#3.x进阶功能说明)
    - [功能特性](#功能特性)
    - [跟其他插件协作](#跟其他插件协作)
    - [完整示例库分享](#完整示例库分享)
    - [支持与赞助](#赞助)

## 如何安装

1.  国内推荐使用 PKmer 商店安装，[Pkmer市场](https://pkmer.cn/products/plugin/pluginMarket/?editing-toolbar)
   
2.  所有的插件手动安装方法都是一样的，本插件也不例外。 
    在[releases](https://github.com/cumany/obsidian-editing-toolbar/releases) 下载 `main.js` `mainfest.json` `styles.css` 三个文件
    在Obsidian库目录下的 `.obsidian\plugins\` 新建一个插件目录名字`Obsidian-editing-toolbar`文件夹。把刚才下载的三个文件放进去。
     ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209221441394.png)
    最后在obsidian中开启本插件即可。
3.  手动安装教程
    [Plugins mini FAQ ](https://forum.obsidian.md/t/plugins-mini-faq/7737)
    [如何安装 obsdiain 插件](https://publish.obsidian.md/chinesehelp/01+2021%E6%96%B0%E6%95%99%E7%A8%8B/%E5%A6%82%E4%BD%95%E5%AE%89%E8%A3%85obsdiain%E6%8F%92%E4%BB%B6)


## 3.x进阶功能说明

Editing Toolbar是一款高度仿照Microsoft Word工具栏设计的Obsidian插件，经过3.x版本重构后功能全面升级。本指南将详细介绍其进阶使用方法。
一些基础功能使用，比如如果添加命令，更改命令图标等可以参考之前教程：
[PKMer_Obsidian 插件：Editing Toolbar 必装的可视化编辑工具](https://pkmer.cn/Pkmer-Docs/10-obsidian/obsidian%E7%A4%BE%E5%8C%BA%E6%8F%92%E4%BB%B6/editing-toolbar/)



> [!important]
> 从旧版本升级的用户需注意：
> 1. 完成更新后需进入Editing Toolbar设置界面
> 2. 点击右上角扳手图标执行命令修复
> 3. 建议重启Obsidian确保更新完全生效

### 安装验证
成功安装后，编辑器顶部将显示默认工具栏，包含基础Markdown格式按钮（如加粗、斜体等）。若未显示，请：
1. 确认Obsidian版本≥1.5.0
2. 检查插件是否已启用
3. 尝试重启应用程序

## 核心功能解析

### 工具栏布局配置
**功能说明**：工具栏支持多种位置模式，可通过设置调整。
![Pasted image 20250329180702|320](https://cdn.pkmer.cn/images/202503302237012.png!pkmer)

支持三种显示模式：
1. **顶部模式(Top)**
   - 固定显示于编辑器顶端
   - 适合传统文字处理软件用户
2. **跟随模式(Following)**
   - 动态定位当前编辑位置
   - 自动避开界面边缘
3. **底部模式(Fixed)**
   - 固定于编辑器底部区域
   - 保持界面整洁

配置路径：
`设置 > Editing Toolbar > 工具栏位置`

### 视图显示控制
**功能说明**：工具栏支持在不同视图下进行控制是否显示。比如Canvas,Excalidraw,图片等，可以控制某种视图下是否启用工具栏。
![Pasted image 20250329180804|320](https://cdn.pkmer.cn/images/202503302237013.png!pkmer)
支持按视图类型管理工具栏显示：
1. 点击状态栏工具栏图标![Pasted image 20250329175419|inl|30](https://cdn.pkmer.cn/images/202503302237014.png!pkmer)
2. 选择`当前视图`进行单独设置
3. 或通过`管理所有视图类型`批量配置

### 多配置管理
**功能说明**：支持不同位置的工具栏配置独立设置，特别是增加了`mobile`配置，对移动端工具栏也可以单独配置了。比如TOP工具栏可以设置的多而全，Following模式下工具栏只需要把最常用的添加上。
![Pasted image 20250329180850|380](https://cdn.pkmer.cn/images/202503302237015.png!pkmer)
支持创建独立配置方案：
1. 主工具栏(Top)
2. 跟随工具栏(Following) 
3. 固定工具栏(Fixed)
4. 移动端工具栏(Mobile)

**配置方法**：
1. 在设置中点击`启用多配置`。
2. 工具栏命令选项卡，即可对每个配置进行单独配置。
3. 为新配置添加命令并调整顺序。
特色功能：
- **配置清除**：清空当前配置，也就是把当前配置的命令按钮一键清除。
- **配置导入**：可以把其他配置下的命令集导入到当前配置中。比如 `Main Menu Commands` 就代表的是官方默认按钮集合，可以导入到其他配置文件中方便修改。
## 高级功能详解

### Markdown格式刷
- **功能说明**：Markdown格式刷（`Format Brush`）允许用户把一些Markdown样式（如加粗、高亮、标题级别、斜体、下划线、字体颜色，背景色等）应用到其他文本段，类似Word的格式刷。
- **使用场景**：快速批**量对选中文本**设置**样式**。
![格式刷演示](https://cdn.pkmer.cn/images/202503302237018.gif!pkmer)

**操作步骤**：
常规用法：
1. 先点击需要设置格式的按钮，比如`B 加粗`
2. 点击工具栏中的`Format Brush`按钮（默认图标为画刷）。
3. 选中目标文本，格式将自动应用。
4. 期间点击鼠标`中键`或者`右键`可以终止格式刷。

进阶用法：
1. 选中或者光标在格式文本中间（例如`**加粗文字**`）。
2. 点击工具栏中的`Format Brush`按钮（默认图标为画刷）。
3. 选中目标文本，格式将自动应用。

### Callout格式刷
- **功能说明**：选中callout文本，即可自动识别callout类型（目前识别类型为 note|tip|warning|danger|info|success|question|quote），通过格式刷即可对其他文本应用callout。
- **使用场景**：快速批量**对选中文本**设置**Callout样式** 。

### 主题适配
**功能说明**：工具栏支持与Obsidian主题同步，或手动选择深色/浅色模式。
![425070267-dc75340a-5b59-4212-ae4f-3b17ab6242d9|450](https://cdn.pkmer.cn/images/202503302237019.png!pkmer)

**设置方法**：
1. 进入`Settings > Editing Toolbar > Appearance`。
2. 工具栏主题选择`default`,`tiny`,`glass`（明暗跟随Obsidian外观）或`自定义主题`（固定模式）。
	自定义选项：
	- 图标色彩方案
	- 背景透明度
	- 图标尺寸调节
![主题设置](https://cdn.pkmer.cn/images/202503302237020.png!pkmer)


## 配置管理

### 导入导出机制
**功能说明**：支持将工具栏配置导出为JSON文件，或导入他人分享的配置。
支持四种导出模式：
- 所有设置：顾名思义就是包含插件的全部设置信息。
- 所有工具栏命令：只包含工具栏按钮命令内容，包括图标，顺序，子菜单等。
- 仅自定义命令：只包含用户自定义命令部分。
- 仅Following，top，fixed，mobile样式：如果启用`多配置`可以对每个配置单独导出。

导入策略：
- 更新导入：不会删除本地配置，只更新已有的命令，增加缺失的命令。
- 覆盖导入：会删除本地已有配置，用导入文件覆盖已有配置信息。

> [!caution]
> 误操作恢复方法：
> 进入插件设置 → 点击扳手图标 → 选择"恢复系统配置"

## 自定义功能开发

### 自定义格式命令
**功能说明**：用户设置自定义格式规则并生成命令添加到工具栏。这个功能主要为选中文本添加自定义前缀和后缀。
- 命令ID：设置后无法修改，英文不包含空格。
- 命令名称：命令列表显示的名称，可以设置一个容易记住的。
- **前缀：设置对选中文本前面需要添加的字符串。**
- **后缀：设置对选中文本后面需要添加的字符串。**
- 光标位置偏移量：一般不用设置，用于应用命令后，控制光标所在位置。
- 行偏移量：一般不用设置。用于应用命令后，控制光标所在行的位置。
- 行首格式：开启后，会在新行首部应用命令。
- 图标：可以自定义命令图标，如果不设置将使用默认图标。
**例子分享：**
- anki，完形填空规则
  {{c1::sometext}}. 其中sometext为需要处理的文本，只需要前缀填入` {{C1::`后缀填入`}} `如图所示。 保存后，点击添加工具栏，即可把自定义命令添加到工具栏对应位置。
  配合格式刷，即可快速为文章批量进行挖空操作。

![Pasted image 20250330212254|450](https://cdn.pkmer.cn/images/202503302237021.png!pkmer)
参数说明：

| 参数项  | 说明     | 示例       |
| ---- | ------ | -------- |
| 命令ID | 唯一标识符  | my-cloze |
| 前缀   | 插入文本前部 | `{{c1::` |
| 后缀   | 插入文本后部 | `}}`     |
| 行首格式 | 行起始应用  | 不启用      |
![命令设置界面](https://cdn.pkmer.cn/images/202503302237022.png!pkmer)

- 自定义高亮
  比如 `*==sometext==*` 只需要前缀填入` *==`后缀填入`==* `

| 参数项  | 说明     | 示例               |
| ---- | ------ | ---------------- |
| 命令ID | 唯一标识符  | custom-highlight |
| 前缀   | 插入文本前部 | `*==`            |
| 后缀   | 插入文本后部 | `==*`            |
| 行首格式 | 行起始应用  | 不启用              |
- 自定义字体大小
  比如设置字体为5号字体`<font size="5">sometext</font>`只需要前缀填入`<font size="5">`后缀填入`</font>`

| 参数项  | 说明     | 示例                |
| ---- | ------ | ----------------- |
| 命令ID | 唯一标识符  | font-size-5       |
| 前缀   | 插入文本前部 | `<font size="5">` |
| 后缀   | 插入文本后部 | `</font>`         |
| 行首格式 | 行起始应用  | 不启用               |

### 自定义正则表达式命令

**功能说明**：支持通过正则表达式定义复杂文本替换或格式化规则。
- 匹配模式：填写正则表达式，用于匹配目标文本中的特定模式
- 替换模式：使用 `$1`, `$2`, `$3` 等作为匹配占位符，将匹配到的内容替换为指定的格式或拼接内容。
- 忽略大小写：是否在匹配时忽略大小写。启用后，正则表达式 `hello` 可以匹配 `Hello`、`HELLO` 等。
- 全局替换：是否替换所有匹配项，而不仅仅是第一个。
- 多行模式：是否将文本按行处理，使 `^` 和 `$` 匹配每行的开头和结尾。一般适用于处理多行文本。
- 使用条件：使用正则之前先对选中的文本进行判断，符合条件要求，再执行正则操作。
- 正则表达式实例：内置了一些常见案例，点击即可自动把正则命令填充，只需要自己设置一个命令id保存即可使用。
- 预览文本：对设置的正则，提前看下效果是否达到预期，方便调试。
- 完整正则表达式代码：这部分用于向AI求助，会把设置的内容代码化，方便AI给出解答。
**示例：** 
- 匹配模式：`(\d{4})-(\d{2})-(\d{2})`（匹配日期）
- 替换模式：`Year: $1, Month: $2, Day: $3`
- 结果：
    - 输入：`2023-10-05`
    - 输出：`Year: 2023, Month: 10, Day: 05`
内置示例：
![Pasted image 20250330214755|450](https://cdn.pkmer.cn/images/202503302237024.png!pkmer)
插件已经内置很多正则案例，点击即可自动填充到对应的选项中，如果不知道正则对应的含义，可在后面的正则预览中，把正则命令复制发给AI即可给你解释。
![Pasted image 20250330214943|480](https://cdn.pkmer.cn/images/202503302237025.png!pkmer)

**绝大多数编辑器的强大功能都离不开正则表达式的支持**。无论是文本搜索、批量替换，还是复杂的数据格式化，正则表达式都扮演着不可或缺的角色。它让文本处理变得高效而精准，极大地提升了工作效率。

> [!question]
> 如果您在使用过程中创建了有趣或实用的自定义指令，我们非常期待您能分享到社区，与大家一起交流和学习！您可以前往 [Obsidian Editing Toolbar Show And Tell 讨论区](https://github.com/PKM-er/obsidian-editing-toolbar/discussions/categories/show-and-tell) 发布您的创意，或许您的想法会成为他人的灵感源泉！


## 个性化命令
以下是工具栏插件已经内置的常用个性化命令：
1. **自定义文本颜色**：`editing-toolbar:change-font-color`-->`Change font color[html]`
2. **自定义文本背景色**:`editing-toolbar:change-background-color`-->`Change Backgroundcolor[html]`
3. **全屏切换** ：`editing-toolbar:fullscreen-focus` -->`Fullscreen focus mode`，绑定到工具栏。
4. **对话框中编辑链接**
   - **功能**：选中Markdown链接（如`[文字](URL)`），右键选择`Edit Link(Modal)`即可快捷对链接内容，标题进行编辑。
     ![Pasted image 20250330221356|450](https://cdn.pkmer.cn/images/202503302237026.png!pkmer)

	   - 支持一键获取远程连接的文本内容，添加链接标题。
5. **图片外链编辑**
   - **功能**：对`![描述](图片路径)`外链格式右键选择菜单中的`Edit Link(Modal)`即可快捷设置。
     ![Pasted image 20250330221658|450](https://cdn.pkmer.cn/images/202503302237027.png!pkmer)
	- 获取远程标题文本
	- 设置图片尺寸，可以自适应设置图片推荐尺寸。
6. **编辑Callout**
   - **功能**：通过命令`editing-toolbar:insert-callout`-->`Insert Callout` 提供一个对话框快速添加Callout样式或内容。
     ![Pasted image 20250330221955|450](https://cdn.pkmer.cn/images/202503302237029.png!pkmer)
     - 选择Callout类型
     - 标题：设置callout标题
     - 折叠状态：设置callout是否默认折叠
     - 内容：设置callout内容。
7. **有序列表重新编号**
   - **功能**：对有序列表重新编号，比如对`5.`编号重新改为`1. `。
   - 使用方法：对需要改编号的有序列表右键，选择`列表重新编号`，即可重新编号，因为Obsidian编辑器机制，重新编号会自动添加空行分割。
     ![Pasted image 20250330222822](https://cdn.pkmer.cn/images/202503302237030.png!pkmer)

   
 ## 常见问题排查
1. **工具栏未显示**
   - 确认插件启用状态及视图设置。
   - 重启Obsidian或更新Editing Toolbar到最新版。
2. **命令无效**
   - 插件设置--右上角扳手--使用`Fix Commands`修复。
3. **反馈问题**
   - 提交至[Issues](https://github.com/PKM-er/obsidian-editing-toolbar/issues)，附上复现步骤和Obsidian版本。

--- 

## 视频介绍

[谁说 Obsidian 不如语雀，这个插件让你使用 ob 不用再记那么多指令了，ob 工具栏你值得拥有](https://www.bilibili.com/video/BV1mY4y1T7g2/)


---
以下为2.x 版本旧内容参考


## 功能特性

功能在延续之前 cmenu 功能的基础上增加了下面额外的功能。

1. 增加新的工具栏样式 tiny

   ![|400](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071131715.png)
2. 增加工具栏位置选项，top，following

   ![|400](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071133753.png)
   ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071751006.gif)

3. 支持 多窗口，多tab 适应obsidian 0.14+

4. 增加一些内置命令
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
   10.  right  
        插入一个 html 代码，让文字右对齐`<p align="right">.....</p>`
   11.  center 居中对齐
       插入一个 html 代码，让文字居中`<center>.....</center>`
   12.  fullscreen-focus
       默认绑定快捷键`Ctrl+shift+F11`。
       将使笔记页面全屏显示，让你更专注于写作本身。要退出全屏，请按 ESC 或再次执行全屏命令。
   13.  workplace-fullscreen-focus
       默认绑定快捷键`Ctrl+F11`。
       与全屏聚焦模式不同，这个模式只是隐藏了左右侧边栏的面板，它只是工作区全屏。
   14. head 1-6 级标题设置
       默认绑定快捷键`Ctrl+1,ctrl+2,...Ctrl+6`。

       ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071707695.png)
   15. 支持自定义命令图标

       ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071717111.gif)
   16. 支持修改命令名称

       ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071720159.gif)
   17. 支持添加子菜单

       ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071722207.gif)
   18. 支持菜单拖动排序
   19. 增加格式刷功能 内置字体颜色和背景颜色两种格式刷（鼠标中键或者右键可取消格式刷状态）

       ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main//pic/202209071731151.gif)
   20. 工具栏图标宽度自适应收缩
   
       ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209072157728.gif)

### 跟其他插件协作

1. [emjoi toolbar ](obsidian://show-plugin?id=obsidian-emoji-toolbar)快捷插入表情
   ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209092001600.gif)


2.  [Obsidian-Table-Generator](https://github.com/Quorafind/Obsidian-Table-Generator/)  & [ob-table-enhance](https://github.com/Stardusten/ob-table-enhancer) 快捷插入表格并编辑
   ![](https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209092008571.gif)

> 上面插件均可从示例库获取，示例库的插件一般都经过了优化并修复了一些错误
☟☟☟
### 完整示例库分享

这是可以让你大开眼界的 Obsidian 示例库，里面有很多眼花缭乱的功能和示例，相信你看过一定会惊叹，这是 Obsidian 吗？
[Blue-topaz-examples](https://github.com/cumany/Blue-topaz-examples)

### 赞助

Thank you very much for your support!

<div align="center">
<img src="https://ghproxy.net/https://raw.githubusercontent.com/cumany/cumany/main/pic/202209192228895.png" width="400px">
</div>
