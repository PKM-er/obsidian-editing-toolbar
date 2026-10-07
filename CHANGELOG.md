# Changelog

## 4.1.9 (2026-10-07)
### Update manifest.json and versions.json for version 4.1.9
### 修复 AI 自定义改写面板无法打开的问题
- 面板类操作（自定义改写 / Canvas 提示）不再受 provider 登录态检查拦截，直接打开；
  provider 检查仅保留给真正发起 AI 请求的操作（行内补全、改写指令等），未登录时在发送环节提示
- 面板渲染增加陈旧引用自愈：面板 DOM 被外部移除时（全屏模式的 body 节点搬移观察器、
  工作区重建、其他插件清理 body 节点），管理器引用会脱离 DOM，导致后续打开跳过创建、
  点击无任何反应；现在检测到引用脱离 DOM 即丢弃并重建
- 覆盖 AI 菜单项与 AI 主按钮两条点击路径
### AI 自定义改写面板外观改为 Obsidian 原生风格
- 面板改用 Obsidian 设计变量：prompt 系列（--prompt-radius/-border-color/-background/-shadow）、
  表单域（--background-modifier-form-field）、交互态（--interactive-normal/-hover/-accent）、
  字体/间距/圆角/阴影令牌，随主题与用户外观设置自适应；输入框 hover/focus 采用原生表单域反馈
### 修复 AI 菜单被 PKMer 网络检查阻塞 + 刷新超时保护
- AI 下拉菜单不再在弹出前等待网络检查（此前 PKMer 服务慢时菜单弹不出来）；
  登录状态改为点击菜单项时动态检查，并后台预热
- token 刷新加 3 秒超时上限，网络挂起不再阻塞交互
### 主题动画防御去掉 !important，改用 id 双写超高特异性
- animation/transition 的 none 恢复为普通声明；防御选择器特异性增强至 (2,x,x) 级，
  实测可压制普通高特异性及带 !important 的主题图标动画
### 修复 4.1.8 回归：AI 按钮无法点击 + 工具栏闪烁
- 删除 AI busy 规则中的孤儿选择器行（曾导致 AI 按钮常驻 pointer-events: none 与循环动画）
- 主题动画防御恢复生效（防主题 svg 循环动画导致的工具栏闪烁）
### AI 自定义改写面板：修复 1.14 下创建失败 + 外观优化
- 面板构建改用原生 createElement（24 处）：Obsidian 1.14 的 enhance.js 会 patch
  HTMLDocument 的 createDiv/createEl/createSpan 帮助函数，导致面板创建失败、输入框不出现
- 外观改简约精致风：实色背景 + 细边框 + 双层柔和阴影，去除毛玻璃
- 拖动手柄改横向圆角胶囊（hover 加宽提亮）；标题栏加分隔线
## 4.1.8 (2026-10-07)
### styles.css :has 与 !important 全部清零（官方性能与样式建议）
:has 23 → 0：
- AI 加载状态 15 处删除冗余 :has 路径（body[data-editing-toolbar-ai-busy]
  状态属性选择器已覆盖，属性由 AIEditorManager 维护）
- hide-toolbar 2 处：新增 MutationObserver 同步 editing-toolbar-force-hidden
  类（setTimeout 防抖，替代 :has 跨级条件）
- 手机端 4 处 + thino 3 处：工具栏挂载时给宿主容器加 has-editing-toolbar
  标记类，CSS 改用标记类
!important 12 → 0：
- following 过渡/gap/拖拽把手：特异性增强或确认无对手后移除
- font-size initial：body 前缀 + 双写类至 (1,3,0)
- AI 内联面板按钮 ×4：双写类增强
- 主题动画防御 ×2：4 支选择器加 body 前缀
- 格式刷高亮：hover 规则 :not 排除 Format Brush 按钮
- hide-toolbar 旧规则并入 force-hidden 类方案
其他：
- d.ts Menu 增强声明 addItem/onHide 回调 any → void
- Obsidian 1.14.4 实测回归：hide-toolbar 隐藏/恢复、AI busy 状态、调色板
  颜色加固、AI 按钮 padding、设置页预览、跟随工具栏全部正常，零错误
### 调色板色块颜色加固为内联 !important（issue #88）
主题/插件样式表的 !important 会把调色板色块覆盖成纯色（用户环境
computed 全部变 #232323）。createTablecell 渲染时把 HTML style 属性里的
background-color 提升为内联 !important，样式表无法再覆盖。
已在注入覆盖 CSS 的环境下实测：75 个色块颜色全部保持正确。
### Update manifest.json and CHANGELOG.md for version 4.1.7
### 修复 1.13.x 设置子页面兼容性 + setFontcolor 崩溃 + 清理 27 处 !important
- 修复 Obsidian 1.13+/1.14+ 设置子页面无法进入：声明式渲染器把 render()
  返回值当 cleanup 调用，表达式回调返回 Setting 组件导致核心抛
  "t is not a function"；getSettingDefinitions 出口统一规范化返回值
- 修复无选区点击调色板色块的 TypeError：setFontcolor 模块级函数误用
  this.plugin，签名新增 plugin 参数并传入全部调用点
- styles.css 清理 27 处 !important（39→12，经 CDP computed-style 逐条实测
  确认无视觉变化；3 处承重的以选择器增强/删除死代码替代；保留 12 处必要的
  主题防御并注释说明）；删除标准 mask-image 行消除 css-masks 兼容警告
- scorecard 清理：d.ts any 4 处、不必要断言、enabledPlugins 改 Set 类型
- Obsidian 1.14.4 实测回归：工具栏/调色板/AI 按钮/设置页预览/跟随工具栏
  全部正常，控制台零错误
### Update manifest.json and CHANGELOG.md for version 4.1.6


### styles.css :has 全部清零（23 → 0，官方性能建议）
- AI 加载状态 15 处：:has(.cm-ai-loading / .cm-ai-result-panel[data-phase=streaming])
  冗余路径删除，保留已有的 body[data-editing-toolbar-ai-busy] 状态属性选择器
  （AIEditorManager 一直在维护该属性）
- hide-toolbar 2 处：新增 MutationObserver 监听编辑器 hide-toolbar 类
  （class 变化 + setTimeout 100ms 防抖），同步为工具栏
  editing-toolbar-force-hidden 类，CSS 改为 #id.类 双条件（特异性高于基础规则）
- 手机端 4 处：工具栏挂载时给宿主容器加 has-editing-toolbar 标记类
  （view-content / workspace-leaf-content），CSS 改用标记类
- thino 3 处：同理给 memo-editor-wrapper / common-editor-inputer 加标记类
### styles.css !important 全部清零（39 → 0，含此前保留的 12 处）
- following 过渡禁用、CustomAesthetic gap：选择器特异性本已足够，直接移除
- 工具栏按钮字体（font-size: initial）：加 body 前缀 + 双写类至 (1,3,0)
- 设置页拖拽把手：加 .modal.mod-settings 前缀
- hide-toolbar 旧规则：并入 force-hidden 类方案
- AI 内联面板按钮（padding/box-shadow ×4）：双写类增强
- 主题动画防御（transition none ×2）：4 支选择器加 body 前缀
- 格式刷高亮：hover 规则排除 Format Brush 按钮，专属高亮无冲突生效
### 其他
- d.ts：Menu 增强声明的 addItem/onHide 回调 any → void
- Obsidian 1.14.4 实测回归：hide-toolbar 隐藏/恢复、AI busy 状态、调色板
  （含颜色加固）、AI 按钮、设置页预览、跟随工具栏全部正常，控制台零错误
### 修复无选区点击调色板色块时的 TypeError
- setFontcolor() 是模块级函数却在内部使用 this.plugin，无选中文本时点击
  字体颜色色块（或执行 Change Font Color 命令）必抛
  "TypeError: Cannot read properties of undefined (reading 'plugin')"，
  中断后续的图标颜色更新与设置保存
- 签名新增可选 plugin 参数并传入全部 3 个调用点（main.ts / commands.ts /
  editingToolbarModal.ts），改用 plugin?.setLastExecutedCommand
### styles.css 清理 27 处 !important（39 → 12，经 CDP computed-style 逐条实测）
- 经 CDP computed-style 逐条实测：27 处移除后渲染无任何变化，安全删除；
  3 处真实承重的以选择器增强替代（AI 按钮 padding 双写类、跟随栏 height
  改为删除 JS 侧从未生效的内联 height:0 死代码）
- 删除标准 mask-image 行保留 -webkit- 回退（消除 css-masks 兼容性警告）
### 修复 Obsidian 1.13.x/1.14.x 设置子页面无法进入的兼容性问题
- 根因：1.13 原生声明式渲染器把每个条目 render() 的返回值存为 cleanup，
  在页面切换（openPage → G2 清理）时作为函数调用。本插件大量表达式形式的
  回调（render: (setting) => setting.addDropdown(...)）返回 Setting 组件这类
  "真值但非函数"的对象，导致核心抛 "TypeError: t is not a function"，
  且六个设置子页面（常规/外观/自定义命令/工具栏命令/AI/导入导出）全部无法进入
- 修复：getSettingDefinitions() 出口新增 normalizeDefinitionRenders 深度遍历，
  将 render 返回值规范化——只有真正的清理函数（如 pickr 销毁回调）才保留，
  其余丢弃；保留 1.13 声明式渲染路径，无需退回 display() 兼容模式
- Obsidian 1.13.7/1.14.4 实测（含独立设置窗口）：六个子页面全部正常打开
  （常规页 10 个取色器、工具栏命令页 78 项、AI/导入导出页分享链接锚点正确
  渲染），零报错
### Scorecard 清理第十批：no-explicit-any 132 → 0
- Obsidian API 兼容断言：vault.on/metadataCache.on/getMarkdownFiles/getFileCache
  等直接使用 0.15.9 类型包已有 API，去掉 as any；secretStorage 已有类型声明，直接使用
- Editor.cm 相关（getToolbarHostDocument/getCoords/getEditorView）：运行时是
  CodeMirror 6 视图而类型包声明为 CM5 Editor，改为 unknown 中转 + 结构化类型收窄
- 命令数组统一使用 obsidian Command 类型（settingsData 已做 SubmenuCommands 模块增强）
- AI 响应解析（AIService/errorHandling）：payload 参数改为结构化接口 + unknown 收窄
- PKMerAuthService：callbackServer 使用 node:http Server 类型，window.require
  返回值 as typeof import("http")，错误回调参数改 Error & { code?: string }
- 颜色选择器（settingsTab）：pickr 参数使用 Pickr/Pickr.HSVaColor 类型；
  动态键写入设置改用 Record 视图断言（避免联合键写入 never）
- 声明式设置页框架：新增 DeclarativeSettingsNode 接口替换 any/any[]
- main.ts 设置外观迁移：APPEARANCE_KEYS 已是 keyof StyleAppearanceSettings，
  去掉 as any 直接索引；throttle 改泛型；isTopToolbarActive 探测改结构化断言
- util.ts：findmenuID/colorpicker/backcolorpicker 参数 any → 具体类型
- viewUtils：window.app 为 obsidian 官方声明的全局 App 类型，去掉 as any
- 本地 eslint 队列：266 → 41（全部为官方扫描不包含的 sentence-case）。
  tsc 0 错误，构建通过。
### Scorecard 清理第九批：未使用变量 72 → 0 + 正则转义 8 → 0 + 断言/app/SVG样式/innerHTML 清零
- no-unused-vars 72 处：删除无用导入与死代码、构建语句去掉无用变量名、
  未使用回调参数改 _ 前缀、catch (e) 改可选 catch 绑定
- no-useless-escape 8 处：字符类内多余转义清理
- 全局 app 2 处：fullscreenMode(app) → fullscreenMode(this.plugin.app)
- no-static-styles-assignment 2 处：自定义 SVG 内联样式迁移为 CSS 类
- @microsoft/sdl/no-inner-html 1 处：safeSetInnerHTML 改用 DOMParser 解析后
  adoptNode 移入节点（惰性文档不加载资源，比 innerHTML 更安全）
### 发布流程修复（scorecard Other 项）
- release.yml：zip 改用 -j 将三个官方允许文件放到压缩包根层级
- release.yml：新增 actions/attest-build-provenance 生成构建来源证明

## 4.1.7 (2026-10-06)
### 修复 1.13.x 设置子页面兼容性 + setFontcolor 崩溃 + 清理 27 处 !important
- 修复 Obsidian 1.13+/1.14+ 设置子页面无法进入：声明式渲染器把 render()
  返回值当 cleanup 调用，表达式回调返回 Setting 组件导致核心抛
  "t is not a function"；getSettingDefinitions 出口统一规范化返回值
- 修复无选区点击调色板色块的 TypeError：setFontcolor 模块级函数误用
  this.plugin，签名新增 plugin 参数并传入全部调用点
- styles.css 清理 27 处 !important（39→12，经 CDP computed-style 逐条实测
  确认无视觉变化；3 处承重的以选择器增强/删除死代码替代；保留 12 处必要的
  主题防御并注释说明）；删除标准 mask-image 行消除 css-masks 兼容警告
- scorecard 清理：d.ts any 4 处、不必要断言、enabledPlugins 改 Set 类型
- Obsidian 1.14.4 实测回归：工具栏/调色板/AI 按钮/设置页预览/跟随工具栏
  全部正常，控制台零错误
### Update manifest.json and CHANGELOG.md for version 4.1.6


## 4.1.6 (2026-10-05)
### Update manifest.json and versions.json for version 4.1.6
### chore: 发布 zip 根层级化并生成构建来源证明
- zip 改用 -j 使 main.js/manifest.json/styles.css 位于压缩包根层级
  （对应官方 scorecard 的 Release contains extra unsupported files）
- 新增 actions/attest-build-provenance 为发布资产生成来源证明
  （对应 Missing GitHub artifact attestations for release assets）
### Scorecard 清理第九批+第十批 + 修复 Obsidian 1.13.x 设置子页面兼容性
Scorecard 官方扫描问题从 288 清到约 60：
- no-unused-vars 72→0、no-useless-escape 8→0、不必要断言/app 全局/SVG 内联样式/
  innerHTML 全部清零；safeSetInnerHTML 改 DOMParser 解析后移入节点
- no-explicit-any 132→0：Obsidian API/命令数组/AI 响应/声明式设置框架等
  全部替换为真实类型
- 修复 Obsidian 1.13.x 设置子页面无法进入：1.13 声明式渲染器把 render() 返回值
  当 cleanup 函数调用，表达式回调返回 Setting 组件导致核心抛
  "t is not a function"；getSettingDefinitions 出口统一规范化返回值
- 修复全屏 Reflect.get 未绑定接收者的 Illegal invocation；isFull 增加 null 守卫
本地 eslint 队列 266→41（均为官方不扫描的 sentence-case）。tsc 0 错误，构建通过。
Obsidian 1.13.7 实测：六个子页面全部正常、工具栏/命令/弹窗/全屏/跟随模式正常。
### 修复 Obsidian 1.13.x/1.14.x 设置子页面无法进入的兼容性问题
- 根因：1.13 原生声明式渲染器把每个条目 render() 的返回值存为 cleanup，
  在页面切换（openPage → G2 清理）时作为函数调用。本插件大量表达式形式的
  回调（render: (setting) => setting.addDropdown(...)）返回 Setting 组件这类
  "真值但非函数"的对象，导致核心抛 "TypeError: t is not a function"，
  且六个设置子页面（常规/外观/自定义命令/工具栏命令/AI/导入导出）全部无法进入
- 修复：getSettingDefinitions() 出口新增 normalizeDefinitionRenders 深度遍历，
  将 render 返回值规范化——只有真正的清理函数（如 pickr 销毁回调）才保留，
  其余丢弃；保留 1.13 声明式渲染路径，无需退回 display() 兼容模式
- Obsidian 1.13.7/1.14.4 实测（含独立设置窗口）：六个子页面全部正常打开
  （常规页 10 个取色器、工具栏命令页 78 项、AI/导入导出页分享链接锚点正确
  渲染），零报错
### 修复无选区点击调色板色块时的 TypeError
- setFontcolor() 是模块级函数却在内部使用 this.plugin，无选中文本时点击
  字体颜色色块（或执行 Change Font Color 命令）必抛
  "TypeError: Cannot read properties of undefined (reading 'plugin')"，
  中断后续的图标颜色更新与设置保存
- 签名新增可选 plugin 参数并传入全部 3 个调用点（main.ts / commands.ts /
  editingToolbarModal.ts），改用 plugin?.setLastExecutedCommand
### styles.css 清理 27 处 !important（39 → 12，其余为必要的主题防御）
- 经 CDP computed-style 逐条实测：27 处移除后渲染无任何变化，安全删除；
  3 处真实承重的以选择器增强替代（AI 按钮 padding 双写类、跟随栏 height
  改为删除 JS 侧从未生效的内联 height:0 死代码）
- 保留 12 处必要用例：对抗主题动画/内联样式/自身高特异性规则，已在源码注释
- 删除标准 mask-image 行保留 -webkit- 回退（消除 css-masks 兼容性警告）
- 全流程在 Obsidian 1.14.4 实测回归：工具栏布局、调色板渲染、AI 按钮、
  设置页预览可见性、跟随工具栏均正常，控制台零错误
### Scorecard 清理第十批：no-explicit-any 132 → 0
- Obsidian API 兼容断言：vault.on/metadataCache.on/getMarkdownFiles/getFileCache
  等直接使用 0.15.9 类型包已有 API，去掉 as any；secretStorage 已有类型声明，直接使用
- Editor.cm 相关（getToolbarHostDocument/getCoords/getEditorView）：运行时是
  CodeMirror 6 视图而类型包声明为 CM5 Editor，改为 unknown 中转 + 结构化类型收窄
- 命令数组统一使用 obsidian Command 类型（settingsData 已做 SubmenuCommands 模块增强）
- AI 响应解析（AIService/errorHandling）：payload 参数改为结构化接口 + unknown 收窄
- PKMerAuthService：callbackServer 使用 node:http Server 类型，window.require
  返回值 as typeof import("http")，错误回调参数改 Error & { code?: string }
- 颜色选择器（settingsTab）：pickr 参数使用 Pickr/Pickr.HSVaColor 类型；
  动态键写入设置改用 Record 视图断言（避免联合键写入 never）
- 声明式设置页框架：新增 DeclarativeSettingsNode 接口替换 any/any[]
- fullscreen：HTMLElementWithFullscreen 索引签名 any → unknown，动态全屏 API
  键访问改用 Reflect.get 并绑定接收者调用（修复 Illegal invocation）；
  isFull 增加 null 守卫（修复 modroot 为 null 时误判为全屏的隐患）
- main.ts 设置外观迁移：APPEARANCE_KEYS 已是 keyof StyleAppearanceSettings，
  去掉 as any 直接索引；throttle 改泛型；isTopToolbarActive 探测改结构化断言
- util.ts：findmenuID/colorpicker/backcolorpicker 参数 any → 具体类型
- viewUtils：window.app 为 obsidian 官方声明的全局 App 类型，去掉 as any
- 本地 eslint 队列：266 → 41（全部为官方扫描不包含的 sentence-case）。
  tsc 0 错误，构建通过。
### Scorecard 清理第九批：未使用变量 72 → 0 + 正则转义 8 → 0 + 断言/app/SVG样式/innerHTML 清零
- no-unused-vars 72 处：删除无用导入（Command/setIcon/ToggleComponent/View/
  MarkdownView/TextAreaComponent/Plugin/AdmonitionDefinition/App 等）、删除从未
  使用的局部变量（currentVer/registeredTypes/typesSource/positionAISubmenu/
  toggleFull/requestCompletion/TYPE_ON_FULL_SCREEN_CHANGE/AdmonitionPluginPublic
  接口及 exports.beFull 遗留语句等）、Setting/createDiv/createEl 构建语句去掉
  无用变量名、未使用回调参数改 _ 前缀或直接删除、catch (e) 改可选 catch 绑定
- no-useless-escape 8 处：字符类内多余转义清理（类内 \[ \( \) 为字面量无需转义，
  类内 \] 属必要转义保留）
- no-unnecessary-type-assertion 2 处：document as DocumentWithFullscreen 改
  Reflect.get 访问动态全屏 API 键
- 全局 app 2 处：fullscreenMode(app) → fullscreenMode(this.plugin.app)
- no-static-styles-assignment 2 处：insertCalloutModal 自定义 SVG 的 width/height
  内联样式迁移为 styles.css 的 .custom-admonition-icon 类（fill 为动态值保留）
- @microsoft/sdl/no-inner-html 1 处：safeSetInnerHTML 改用 DOMParser 解析后
  adoptNode 移入节点（惰性文档不加载资源，比 innerHTML 更安全；官方配置禁止
  disable 该规则）
- 本地 eslint 队列：321 → 266 warnings。tsc 0 错误，构建通过。
### 发布流程修复（scorecard Other 项）
- release.yml：zip 改用 -j 将 main.js/manifest.json/styles.css 放到压缩包根层级
  （原 zip -r 产生嵌套目录，对应官方 "Release contains extra unsupported files"）
- release.yml：新增 actions/attest-build-provenance 步骤为 4 个发布资产生成
  构建来源证明，并补充 id-token/attestations 权限（对应官方
  "Missing GitHub artifact attestations for release assets"）

## 4.1.5 (2026-10-03)