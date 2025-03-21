import { App, Modal, Setting, TextComponent, ToggleComponent, Platform } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";

interface ClipboardItems {
    [key: string]: string;
}

export class InsertLinkModal extends Modal {
    private linkText: string = "";
    private linkUrl: string = "";
    private linkAlias: string = "";
    private isEmbed: boolean = false;
    private insertNewLine: boolean = false;
    private imageWidth: string = "";
    private imageHeight: string = "";
    private prefixText: string = "";
    private suffixText: string = "";
    private selectedText: string = "";
    private linkTextInput: TextComponent;
    private linkUrlInput: TextComponent;
    private linkAliasInput: TextComponent;
    private embedToggle: ToggleComponent;
    private urlErrorMsg: HTMLElement;
    private previewSetting: Setting;
    // URL 验证正则表达式
    private insertButton: HTMLElement;

    constructor(private plugin: editingToolbarPlugin) {
        super(plugin.app);

        // 如果有选中的文本，用作链接文本
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (editor) {
            const selectedText = editor.getSelection() || "";

            // 优先处理选中文本
            if (selectedText) {
                this.selectedText = selectedText;
                this.parseSelectedText(selectedText);
            }
            // 如果没有选中文本，则尝试解析剪贴板
            else {
                this.parseClipboard();
            }
        }
        // 如果没有编辑器，尝试解析剪贴板
        else {
            this.parseClipboard();
        }

        this.updateHeader();

    }

    // 解析选中的文本
    private parseSelectedText(text: string) {
        // 解析图片链接
        const imglinkMatch = text.match(/!\[.*?\]\(.*?\)/);
        if (imglinkMatch) {
            const prefixText = text.substring(0, imglinkMatch.index); // 获取链接前的文本
            const suffixText = text.substring(imglinkMatch.index + imglinkMatch[0].length); // 获取链接后的文本
            const imageMatch = this.parseMarkdownImageLink(text);
            if (imageMatch) {
                this.linkText = imageMatch.title;
                this.linkUrl = imageMatch.url;
                this.imageWidth = imageMatch.width || '';
                this.imageHeight = imageMatch.height || '';
                this.isEmbed = true;
                this.prefixText = prefixText;
                this.suffixText = suffixText;
                return;
            }
        }
        // 查找链接的起始位置
        const linkMatch = text.match(/\[.*?\]\(.*?\)/);
        if (linkMatch) {
            const linkPart = linkMatch[0];
            const prefixText = text.substring(0, linkMatch.index); // 获取链接前的文本
            const suffixText = text.substring(linkMatch.index + linkPart.length); // 获取链接后的文本

            // 解析链接部分
            const parsedLink = this.parseMarkdownLink(linkPart);
            if (parsedLink) {
                this.linkText = parsedLink.title;
                this.linkUrl = parsedLink.url;
                this.linkAlias = parsedLink.alias || '';
                this.isEmbed = false; // 默认非嵌入模式
            }

            // 保存前缀和后缀文本
            this.prefixText = prefixText;
            this.suffixText = suffixText;
        } else {
            // 如果没有找到链接格式，将整个文本作为链接文本
            const parsed = this.parseMixedContent(text);
            if (parsed) {
                this.linkText = parsed.title;
                this.linkUrl = parsed.url;
            }
        }
    }

    // 解析混合内容（标题和URL）
    private parseMixedContent(content: string): { title: string; url: string } | null {
        // 尝试匹配常见的浏览器复制格式

        // 格式1: 标题 https://url
        const titleUrlPattern = /^(.*?)\s*((?:https?:\/\/|www\.)\S+)$/i;

        // 格式2: [标题](url)
        const markdownPattern = /^\[(.*?)\]\((.*?)\)$/;

        // 格式3: <a href="url">标题</a>
        const htmlPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i;

        let match;

        // 尝试匹配 Markdown 格式
        if ((match = content.match(markdownPattern))) {
            return {
                title: match[1].trim(),
                url: match[2].trim()
            };
        }

        // 尝试匹配 HTML 格式
        if ((match = content.match(htmlPattern))) {
            return {
                title: match[2].trim(),
                url: match[1].trim()
            };
        }

        // 尝试匹配标题+URL格式
        if ((match = content.match(titleUrlPattern)) && match[1].trim()) {
            return {
                title: match[1].trim(),
                url: match[2].trim()
            };
        }

        // 检查是否只是一个URL
        if (this.isValidUrl(content.trim())) {
            return {
                title: this.extractTitleFromUrl(content.trim()),
                url: content.trim()
            };
        }

        return {
            title: content.trim(),
            url: ""
        };
    }

    // 从 URL 提取标题
    private extractTitleFromUrl(url: string): string {
        // 处理特殊协议
        const specialProtocolMatch = url.match(/^([a-zA-Z]+):\/\/(.+)$/);
        if (specialProtocolMatch) {
            const [, protocol, path] = specialProtocolMatch;
            // 如果是特殊协议，尝试提取最后一个路径段
            const segments = path.split(/[/\\]/);
            const lastSegment = segments[segments.length - 1];
            if (lastSegment) {
                return decodeURIComponent(lastSegment)
                    .trim();
            }
            // 如果无法提取有效的标题，返回协议名称
            return protocol.toUpperCase();
        }

        // 处理内部链接
        const wikiLinkMatch = url.match(/^\[\[(.*?)\]\]$/);
        if (wikiLinkMatch) {
            return wikiLinkMatch[1];
        }

        // 处理相对路径
        const pathMatch = url.match(/[^/\\]+$/);
        if (pathMatch) {
            return pathMatch[0]
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .trim();
        }

        return url;
    }

    // 更宽松的 URL 验证规则
    private isValidUrl(url: string): boolean {
        if (!url || url.includes('\n') || /\s/.test(url)) {
            return false;
        }

        // 支持的特殊协议列表
        const specialProtocols = [
            'obsidian://',
            'zotero://',
            'evernote://',
            'notion://',
            'bear://',
            'things://',
            'drafts://',
            'x-devonthink-item://',
            'file://',
            'ftp://',
            'ftps://',
            'http://',
            'https://',
            'tel:',
            'mailto:',
        ];

        // 检查特殊协议
        if (specialProtocols.some(protocol => url.startsWith(protocol))) {
            return true;
        }

        // 检查是否是内部链接格式
        if (url.match(/^\[\[.*?\]\]$/)) {
            return true;
        }

        // 检查是否是相对路径或本地文件路径
        if (url.match(/^[./\\]/) || // 以 ./ 或 ../ 开头
            url.match(/^[a-zA-Z]:\\/) || // Windows 路径
            url.match(/^\/[^/]/) ||// Unix 路径
            url.match(/^[a-zA-Z]+:\/\//)  // 标准 URL 格式
        ) {
            return true;
        }


        try {

            new URL(url);
            return true;
        } catch (e) {
            // 如果 URL 构造失败，检查是否符合基本格式
            // 允许几乎任何不包含空格的字符串作为 URL
            return false;
        }
    }

    // 解析 Markdown 图片链接格式
    private parseMarkdownImageLink(markdown: string): {
        title: string;
        url: string;
        width?: string;
        height?: string;
    } | null {
        // 匹配完整的图片链接格式，包括尺寸参数
        // ![title|widthxheight](url) 或 ![title|width](url)
        const imageRegex = /!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?\]\(([^)]+)\)(?:!.*)?$/;
        const match = markdown.match(imageRegex);

        if (match) {
            const [, title, width, height, url] = match;
            // 设置为嵌入模式
            this.isEmbed = true;
            // 如果 embedToggle 已经创建，更新其状态
            if (this.embedToggle) {
                this.embedToggle.setValue(true);
                // 显示图片尺寸设置
                const imageSizeEl = this.contentEl.querySelector('.image-size-setting');
                if (imageSizeEl) {
                    (imageSizeEl as HTMLElement).style.display = 'block';
                }
            }

            return {
                title: title.trim(),
                url: url.trim(),
                width: width,
                height: height
            };
        }
        return null;
    }

    // 解析 Markdown 链接格式
    private parseMarkdownLink(markdown: string): {
        title: string;
        url: string;
        alias?: string;
    } | null {
        // 匹配带别名的链接格式 [title|alias](url)
        const linkRegex = /\[(.*?)(?:\|(.*?))?\]\(([^)]+)\)/;
        const match = markdown.match(linkRegex);

        if (match) {
            const [, title, alias, url] = match;
            return {
                title: title.trim(),
                url: url.trim(),
                alias: alias?.trim()
            };
        }
        return null;
    }

    // 解析剪贴板内容
    private async parseClipboard() {
        try {
            const clipboardItems = await this.readClipboard();

            // 首先尝试解析为 Markdown 图片格式
            const plainText = clipboardItems['text/plain'];
            if (plainText) {
                const imageMatch = this.parseMarkdownImageLink(plainText);

                if (imageMatch) {
                    this.linkText = imageMatch.title;
                    this.linkUrl = imageMatch.url;
                    if (imageMatch.width || imageMatch.height) {
                        this.isEmbed = true; // 自动开启嵌入模式
                        this.imageWidth = imageMatch.width || '';
                        this.imageHeight = imageMatch.height || '';
                    }
                    this.updateUI();
                    return;
                }

                // 然后尝试解析为普通链接格式
                const linkMatch = this.parseMarkdownLink(plainText);
                if (linkMatch) {
                    this.linkText = linkMatch.title;
                    this.linkUrl = linkMatch.url;
                    this.linkAlias = linkMatch.alias || '';
                    this.isEmbed = false;
                    this.updateUI();
                    return;
                }
            }

            // 其他格式的解析保持不变
            if (clipboardItems['text/html']) {
                // 解析 HTML 格式
                const parsed = this.parseHtmlContent(clipboardItems['text/html']);
                if (parsed) {
                    this.linkText = this.linkText || parsed.title;
                    this.linkUrl = parsed.url;
                }
            } else if (clipboardItems['text/markdown']) {
                // 解析 Markdown 格式
                const parsed = this.parseMarkdownContent(clipboardItems['text/markdown']);
                if (parsed) {
                    this.linkText = this.linkText || parsed.title;
                    this.linkUrl = parsed.url;
                }
            } else if (clipboardItems['text/plain']) {
                // 解析纯文本格式
                const parsed = this.parseMixedContent(clipboardItems['text/plain']);
                if (parsed) {
                    this.linkText = this.linkText || parsed.title;
                    this.linkUrl = parsed.url;
                }
            }

            this.updateUI();

        } catch (e) {
            console.error("Failed to read clipboard:", e);
        }
    }

    // 读取剪贴板多种格式
    private async readClipboard(): Promise<ClipboardItems> {
        const items: ClipboardItems = {};

        try {
            // 尝试读取剪贴板项目
            const clipboardItems = await navigator.clipboard.read();

            for (const clipboardItem of clipboardItems) {
                // 获取所有可用的类型
                const types = clipboardItem.types;

                for (const type of types) {
                    if (type === 'text/html' || type === 'text/plain' || type === 'text/markdown') {
                        const blob = await clipboardItem.getType(type);
                        items[type] = await blob.text();
                    }
                }
            }
        } catch (e) {
            // 如果无法访问剪贴板 API，回退到基本文本读取
            try {
                const text = await navigator.clipboard.readText();
                items['text/plain'] = text;
            } catch (e) {
                console.error("Failed to read clipboard:", e);
            }
        }

        return items;
    }

    // 解析 HTML 内容
    private parseHtmlContent(html: string): { title: string; url: string } | null {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 尝试找到链接元素
        const linkElement = doc.querySelector('a');
        if (linkElement) {
            return {
                title: linkElement.textContent?.trim() || '',
                url: linkElement.href
            };
        }

        // 如果没有找到链接元素，尝试解析文本内容
        const text = doc.body.textContent || '';
        return this.parseMixedContent(text);
    }

    // 解析 Markdown 内容
    private parseMarkdownContent(markdown: string): { title: string; url: string } | null {
        // 匹配 Markdown 链接格式 [title](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const match = markdown.match(markdownLinkRegex);

        if (match) {
            return {
                title: match[1].trim(),
                url: match[2].trim()
            };
        }

        // 如果不是 Markdown 链接格式，尝试解析普通文本
        return this.parseMixedContent(markdown);
    }

    onOpen() {
        this.display();
    }
    private updateHeader() {


        const previewText = this.getPreviewText();
        if (this.previewSetting) {
            this.previewSetting.controlEl.querySelector('input').value = previewText;
        }
    }
    private getPreviewText(): string {
        // 拼接链接标题
        // 构建链接文本
        const linkText = this.linkText || "";
        const linkUrl = this.linkUrl;
        let markdownLink = this.isEmbed ? "!" : "";
        markdownLink += `[${linkText}`;

        // 添加图片尺寸参数或链接别名
        if (this.isEmbed && (this.imageWidth || this.imageHeight)) {
            markdownLink += "|";
            if (this.imageWidth && this.imageHeight) {
                markdownLink += `${this.imageWidth}x${this.imageHeight}`;
            } else if (this.imageWidth) {
                markdownLink += this.imageWidth;
            } else if (this.imageHeight) {
                markdownLink += `x${this.imageHeight}`;
            }
        } else if (!this.isEmbed && this.linkAlias) {
            markdownLink += `|${this.linkAlias}`;
        }

        markdownLink += `](${linkUrl})`;
        return markdownLink;
    }

    private async display() {
        const { contentEl } = this;

        contentEl.empty();
        contentEl.addClass("insert-link-modal");
        this.titleEl.textContent = "";
        this.titleEl.addClass("insert-link-modal-title");

        // 添加键盘事件监听器到整个模态框

        contentEl.addEventListener('keydown', (event) => {
            // 检测 Ctrl+Enter 或 Command+Enter
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (this.insertButton) {
                    this.insertButton.click();
                }
            }
        });
        // 链接文本输入
        const linkTextSetting = new Setting(contentEl)
            .setName(t("Link Text"))
            .addText((text) => {
                this.linkTextInput = text;
                text.setPlaceholder(t("Link Text"))
                    .setValue(this.linkText)
                    .onChange((value) => {
                        this.linkText = value;
                        this.updateHeader();
                    });
            });

        // 链接别名输入（非图片模式时显示）
        const aliasSetting = new Setting(linkTextSetting.controlEl)
            .setName(t("Alias"))
            .addText((text) => {
                this.linkAliasInput = text;
                text.setPlaceholder(t("Link Alias(optional)"))
                    .setValue(this.linkAlias)
                    .onChange((value) => {
                        this.linkAlias = value;
                        this.updateHeader();
                    });
            });

        // 链接地址输入
        const urlSetting = new Setting(contentEl)
            .setName(t("Link URL"))
            .setClass("link-url-setting")
            .addText((text) => {
                this.linkUrlInput = text;
                text.setPlaceholder(t("Link URL"))
                    .setValue(this.linkUrl)
                    .onChange((value) => {
                        this.linkUrl = value.trim();
                        this.validateUrl(this.linkUrl);
                        this.updateHeader();
                    });
            })
            .addButton((btn) => {
                btn
                    .setIcon("lucide-clipboard")
                    .setTooltip(t("Paste and Parse"))
                    .onClick(async () => {
                        await this.parseClipboard();
                        this.updateHeader();
                    });
            });

        // 添加 URL 错误提示元素
        this.urlErrorMsg = urlSetting.descEl.createDiv("url-error");
        this.urlErrorMsg.style.color = "var(--text-error)";
        this.urlErrorMsg.style.display = "none";

        // 嵌入选项
        const embedSetting = new Setting(contentEl)
            .setName(t("Embed Content"))
            .setDesc(t("If it is an image, turn on"));

        this.embedToggle = new ToggleComponent(embedSetting.controlEl);
        this.embedToggle
            .setValue(this.isEmbed)
            .onChange((value) => {
                this.isEmbed = value;
                // 显示/隐藏图片尺寸设置和别名设置
                const imageSizeEl = contentEl.querySelector('.image-size-setting');
                const aliasSettingEl = aliasSetting.settingEl;
                if (imageSizeEl) {
                    (imageSizeEl as HTMLElement).style.display = value ? 'flex' : 'none';
                }
                if (aliasSettingEl) {
                    aliasSettingEl.style.display = value ? 'none' : 'flex';
                }
                this.updateHeader();
            });

        // 图片尺寸设置
        const imageSizeSetting = new Setting(contentEl)
            .setClass('image-size-setting')
            .setName(t("Image Size"))
            .addText((text) => {
                text.inputEl.addClass('image-width-input');
                text.setPlaceholder(t("Image Width"))
                    .setValue(this.imageWidth)
                    .onChange((value) => {
                        this.imageWidth = value.replace(/[^\d]/g, '');
                        text.setValue(this.imageWidth);
                        this.updateHeader();
                    });
            })
            .addText((text) => {
                text.inputEl.addClass('image-height-input');
                text.setPlaceholder(t("Image Height"))
                    .setValue(this.imageHeight)
                    .onChange((value) => {
                        this.imageHeight = value.replace(/[^\d]/g, '');
                        text.setValue(this.imageHeight);
                        this.updateHeader();
                    });
            });

        // 初始隐藏图片尺寸设置
        imageSizeSetting.settingEl.style.display = this.isEmbed ? 'block' : 'none';

        // 新行插入选项
        new Setting(contentEl)
            .setName(t("Insert New Line"))
            .setDesc(t("Insert a link on the next line"))
            .addToggle((toggle) => {
                toggle.setValue(this.insertNewLine)
                    .onChange((value) => {
                        this.insertNewLine = value;
                        this.updateHeader();
                    });
            });
        // 预览设置
        this.previewSetting = new Setting(contentEl)
            .setClass("preview-setting")
            .addText((text) => {
                text.setValue(this.getPreviewText())
                    .inputEl.setAttribute("readonly", "true"); // 只读
            })
        const shortcutHint = contentEl.createDiv("shortcut-hint");
        shortcutHint.setText(`${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${t("to insert")}`);
        shortcutHint.style.textAlign = "right";
        shortcutHint.style.fontSize = "0.8em";
        shortcutHint.style.opacity = "0.7";
        shortcutHint.style.marginTop = "5px";
        // 按钮
        const buttonSetting = new Setting(contentEl)
            .addButton((btn) => {
                btn
                    .setButtonText(t("Insert"))
                    .setCta()
                    .onClick(() => {
                        this.insertLink();
                        this.close();
                    });
                this.insertButton = btn.buttonEl;
            })
            .addButton((btn) =>
                btn
                    .setButtonText(t("Cancel"))
                    .onClick(() => {
                        this.close();
                    })
            );

        // 设置光标聚焦逻辑
        setTimeout(() => {
            // 如果链接文本和URL都为空，聚焦到链接文本
            if (!this.linkText && !this.linkUrl) {
                this.linkTextInput.inputEl.focus();
            }
            // 如果链接文本为空但URL不为空，聚焦到链接文本
            else if (!this.linkText && this.linkUrl) {
                this.linkTextInput.inputEl.focus();
            }
            // 如果链接文本不为空但URL为空，聚焦到URL
            else if (this.linkText && !this.linkUrl) {
                this.linkUrlInput.inputEl.focus();
            }
            // 如果两者都不为空，默认聚焦到链接文本
            else {
                this.linkAliasInput.inputEl.focus();
            }
        }, 10);
    }

    private validateUrl(url: string) {
        if (!url) {
            this.urlErrorMsg.style.display = "none";
            return true;
        }

        if (!this.isValidUrl(url)) {
            this.urlErrorMsg.textContent = t("URL Format Error");
            this.urlErrorMsg.style.display = "block";
            return false;
        }

        this.urlErrorMsg.style.display = "none";
        return true;
    }

    private insertLink() {
        if (!this.validateUrl(this.linkUrl)) {
            return;
        }

        const editor = this.plugin.commandsManager.getActiveEditor();
        if (!editor) return;

        let linkText = this.linkText || this.linkUrl;
        const linkUrl = this.linkUrl;

        // 构建链接文本
        let markdownLink = this.isEmbed ? "!" : "";
        markdownLink += `[${linkText}`;

        // 添加图片尺寸参数或链接别名
        if (this.isEmbed && (this.imageWidth || this.imageHeight)) {
            markdownLink += "|";
            if (this.imageWidth && this.imageHeight) {
                markdownLink += `${this.imageWidth}x${this.imageHeight}`;
            } else if (this.imageWidth) {
                markdownLink += this.imageWidth;
            } else if (this.imageHeight) {
                markdownLink += `x${this.imageHeight}`;
            }
        } else if (!this.isEmbed && this.linkAlias) {
            markdownLink += `|${this.linkAlias}`;
        }

        markdownLink += `](${linkUrl})`;

        // 用于存储新光标位置
        let newCursorPos: { line: number, ch: number };

        const selection = editor.somethingSelected();
        if (selection) {
            // 如果有选中文本
            const selectionStart = editor.getCursor('from');
            const selectionEnd = editor.getCursor('to');

            if (this.insertNewLine) {
                // 在选中文本下一行插入链接
                editor.replaceRange('\n' + markdownLink, { line: selectionEnd.line, ch: editor.getLine(selectionEnd.line).length });
                // 设置新光标位置在链接后面
                newCursorPos = { line: selectionEnd.line + 1, ch: markdownLink.length };
            } else {
                // 替换选中的文本为链接
                const fullText = this.prefixText + markdownLink + this.suffixText;
                editor.replaceRange(
                    fullText, 
                    { line: selectionStart.line, ch: 0 }, 
                    selectionEnd
                );
                // 设置新光标位置在链接后面
                newCursorPos = { 
                    line: selectionStart.line, 
                    ch: this.prefixText.length + markdownLink.length 
                };
            }
        } else {
            // 没有选中文本的处理逻辑
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);

            if (this.insertNewLine) {
                // 在下一行插入并移动光标
                const nextLineNum = cursor.line + 1;
                editor.replaceRange('\n', { line: cursor.line, ch: line.length });
                editor.setCursor({ line: nextLineNum, ch: 0 });
                editor.replaceRange(markdownLink, { line: nextLineNum, ch: 0 });
                // 设置新光标位置在链接后面
                newCursorPos = { line: nextLineNum, ch: markdownLink.length };
            } else {
                // 在当前位置插入
                editor.replaceRange(markdownLink, cursor);
                // 设置新光标位置在链接后面
                newCursorPos = { 
                    line: cursor.line, 
                    ch: cursor.ch + markdownLink.length 
                };
            }
        }

        // 在下一个事件循环中设置光标位置，确保编辑器已更新
        setTimeout(() => {
            // 将光标移动到链接后面
            if (newCursorPos) {
                editor.setCursor(newCursorPos);
            }
            // 确保编辑器获得焦点
            editor.focus();
        }, 0);
    }

    // 更新 UI 显示
    private updateUI() {
        if (this.linkTextInput) {
            this.linkTextInput.setValue(this.linkText);
        }
        if (this.linkUrlInput) {
            this.linkUrlInput.setValue(this.linkUrl);
            this.validateUrl(this.linkUrl);
        }

        // 更新图片尺寸输入框
        const widthInput = this.contentEl.querySelector('.image-width-input') as HTMLInputElement;
        const heightInput = this.contentEl.querySelector('.image-height-input') as HTMLInputElement;
        if (widthInput) widthInput.value = this.imageWidth;
        if (heightInput) heightInput.value = this.imageHeight;

        // 更新别名输入框
        if (this.linkAliasInput) {
            this.linkAliasInput.setValue(this.linkAlias);
        }

        // 更新别名设置的显示状态
        const aliasSettingEl = this.contentEl.querySelector('.setting-item:nth-child(2)');
        if (aliasSettingEl) {
            (aliasSettingEl as HTMLElement).style.display = this.isEmbed ? 'none' : 'flex';
        }
        this.updateHeader();
    }
}

