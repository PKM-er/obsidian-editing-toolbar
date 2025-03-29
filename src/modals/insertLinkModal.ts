import { App, Modal,Editor,EditorPosition, Setting, TextComponent, ToggleComponent, Platform, setIcon, Notice, requestUrl, MarkdownView } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";

interface ClipboardItems {
    [key: string]: string;
}

   // 定义目标类型
interface LinkTarget {
    isImage: boolean;
    text: string;
    url: string;
    title: string;
    from: EditorPosition;
    to: EditorPosition;
}

class UrlTitleFetcher {
    private static htmlTitlePattern = /<title>([^<]*)<\/title>/im;
    private static wxTitlePattern = /<meta property="og:title" content="([^<]*)" \/>/im;

    // 检查是否为有效 URL
    private static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch (err) {
            return false;
        }
    }

    private static parseTitle(url: string, body: string): string {
        const patterns = [
            url.includes('mp.weixin.qq.com') ? this.wxTitlePattern : null,
            this.htmlTitlePattern,
            /<title [^>]*>(.*?)<\/title>/i,
            /<meta name="title" content="([^<]*)" \/>/im
        ].filter(Boolean);
    
        for (const pattern of patterns) {
            const match = body.match(pattern);
            if (match && typeof match[1] === 'string') {
                return match[1].trim();
            }
        }
        
        throw new Error('Unable to parse the title tag');
    }

    // 获取默认标题
    public static getFallbackTitle(url: string): string {
        const pathMatch = url.match(/[^/\\]+$/);
        if (pathMatch) {
            return pathMatch[0]
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .trim();
        }
        return url;
    }

    // 异步获取远程标题
    public static async fetchRemoteTitle(url: string): Promise<string> {
        // 如果不是有效的 URL 或不是 http/https 开头，返回默认标题
        if (!this.isValidUrl(url) || !url.match(/^https?:\/\//)) {
            return this.getFallbackTitle(url);
        }

        try {
            const response = await requestUrl({
                url,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                throw: true // 抛出异常以便捕获非 200 状态
            });

            if (response.status !== 200) {
                throw new Error(`Status code ${response.status}`);
            }

            const html = response.text;
            const title = this.parseTitle(url, html);

            // 如果标题为空或过长，返回默认标题
            if (!title || title.length > 100) {
                return this.getFallbackTitle(url);
            }

            return title;
        } catch (error) {
            console.error(`Failed to fetch title for ${url}:`, error);
     
            return this.getFallbackTitle(url);
        }
    }
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
    
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (editor) {
            const selectedText = editor.getSelection() || "";
            if (selectedText) {
                this.handleSelectedText(editor, selectedText);
            } else {
                this.handleCursorPosition(editor);
            }
        } else {
            this.parseClipboard();
        }
    
        this.updateHeader();
    }
    
    // 处理选中文本
    private handleSelectedText(editor: Editor, selectedText: string) {
        const target = this.tryExpandSelection(editor, selectedText);
        if (target) {
            // 扩展选择并处理完整链接或图片
            const expandedText = this.formatTargetText(target);
            editor.setSelection(target.from, target.to);
            this.selectedText = expandedText;
            this.parseSelectedText(expandedText);
        } else {
            // 未找到完整链接，按原始选中文本处理
            this.selectedText = selectedText;
            this.parseSelectedText(selectedText);
        }
    }
    
    // 处理光标位置
    private handleCursorPosition(editor: Editor) {
        const cursor = editor.getCursor();
        const target = this.findLinkAtCursor(editor, cursor);
        if (target) {
            const formattedText = this.formatTargetText(target);
            editor.setSelection(target.from, target.to);
            this.selectedText = formattedText;
            this.parseSelectedText(formattedText);
        } else {
            this.parseClipboard();
        }
    }
    
    // 尝试扩展选择范围，查找完整链接或图片
    private tryExpandSelection(editor: Editor, selectedText: string): LinkTarget | null {
        const cursorFrom = editor.getCursor('from');
        const line = editor.getLine(cursorFrom.line);
        const selectionStart = cursorFrom.ch;
        const selectionEnd = editor.getCursor('to').ch;
    
        return this.matchLinkInLine(line, selectionStart, selectionEnd, cursorFrom.line);
    }
    
    // 在光标位置查找链接或图片
    private findLinkAtCursor(editor: Editor, cursor: EditorPosition): LinkTarget | null {
        const line = editor.getLine(cursor.line);
        const cursorPosInLine = cursor.ch;
    
        return this.matchLinkInLine(line, cursorPosInLine, cursorPosInLine, cursor.line);
    }
    
   // 匹配行内的链接或图片，优先匹配 Markdown 格式，再匹配普通 URL
private matchLinkInLine(line: string, startPos: number, endPos: number, lineNumber: number): LinkTarget | null {
    // 优先匹配 Markdown 格式的链接或图片
    const markdownRegex = /(!)?\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g;
    let match;

    while ((match = markdownRegex.exec(line)) !== null) {
        const isImage = !!match[1];
        const linkStart = match.index;
        const linkEnd = match.index + match[0].length;
        const text = match[2];
        const url = match[3];
        const quotedTitle = match[4] || '';

        if (startPos <= linkEnd && endPos >= linkStart) {
            return {
                isImage,
                text,
                url,
                title: quotedTitle,
                from: { line: lineNumber, ch: linkStart },
                to: { line: lineNumber, ch: linkEnd }
            };
        }
    }

    // 如果 Markdown 格式未匹配到，尝试匹配普通 URL

   // 匹配非 Markdown 格式的 URL
   const urlRegex = /(?:^|\s)([a-zA-Z][a-zA-Z\d+\-.]*:\/\/\S+|\S+\.[a-zA-Z]{2,}(?:\/\S*)?)/g;

   while ((match = urlRegex.exec(line)) !== null) {
       const url = match[1]; // 获取完整 URL
       const linkStart = match.index + (match[0].startsWith(' ') ? 1 : 0); // 调整起始位置
       const linkEnd = linkStart + url.length;

       // 检查是否与选择范围重叠，并排除已经被 Markdown 匹配的 URL
       if (startPos <= linkEnd && endPos >= linkStart) {
           return {
               isImage: /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url), // 根据文件扩展名判断是否为图片
               text: url,      // 使用 URL 作为默认文本
               url,
               title: '',
               from: { line: lineNumber, ch: linkStart },
               to: { line: lineNumber, ch: linkEnd }
           };
       }
   }

   return null;
}
    
    // 格式化目标文本
    private formatTargetText(target: LinkTarget): string {
        if (target.isImage) {
            return `![${target.text}](${target.url}${target.title ? ` "${target.title}"` : ''})`;
        }
        return target.title
            ? `[${target.text}](${target.url} "${target.title}")`
            : `[${target.text}](${target.url})`;
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
                this.linkAlias = imageMatch.quotedTitle || '';
                this.imageWidth = imageMatch.width || '';
                this.imageHeight = imageMatch.height || '';
                this.isEmbed = true;
                this.prefixText = prefixText;
                this.suffixText = suffixText;
                return;
            }
        }

        const linkMatch = text.match(/\[([^\]]+)\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)/);
        if (linkMatch) {
            const linkPart = linkMatch[0];
            const prefixText = text.substring(0, linkMatch.index); // 获取链接前的文本
            const suffixText = text.substring(linkMatch.index + linkPart.length); // 获取链接后的文本
            // 解析链接部分
            const parsedLink = this.parseMarkdownLink(linkPart);

            if (parsedLink) {
                this.linkText = parsedLink.text;
                this.linkUrl = parsedLink.url;
                this.linkAlias = parsedLink.title || ''; // 使用 text 作为默认别名
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
        quotedTitle?: string;
    } | null {
        // 匹配完整的图片链接格式，包括尺寸参数和可选标题
        // 格式1: ![title|widthxheight](url "optional title")
        // 格式2: ![title|width](url "optional title")
        // 格式3: ![title](url "optional title")
        const imageRegex = /!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?\]\(\s*([^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)/; const match = markdown.match(imageRegex);

        if (match) {
            const[, title , width, height, url, quotedTitle] = match;
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
                height: height,
                quotedTitle: quotedTitle?.trim()
            };
        }
        return null;
    }

    private parseMarkdownLink(markdown: string): {
        text: string;
        url: string;
        title?: string;
    } | null {
        // 匹配 Markdown 链接格式，包括可选的 title
        const linkRegex = /\[([^\]]+)\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)/;
        const match = markdown.match(linkRegex);

        if (match) {
            const [, text, url, title] = match;
            return {
                text: text.trim(),
                url: url.trim(),
                title: title?.trim() // 可选的 title
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
                    this.linkAlias = imageMatch.quotedTitle || '';
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
                    this.linkText = linkMatch.text;
                    this.linkUrl = linkMatch.url;
                    this.linkAlias = linkMatch.title || '';
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
        }

        markdownLink += `](${linkUrl}`;

        // 添加 title（如果存在）
        if (this.linkAlias) {
            markdownLink += ` "${this.linkAlias}"`;
        }

        markdownLink += `)`;
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
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (this.insertButton) {
                    this.insertButton.click();
                }
            }
        });
    
        // 链接文本输入（带获取远程标题图标）
        const linkTextSetting = new Setting(contentEl)

        .addButton((btn) => {
            btn.setIcon("lucide-globe")
                .setTooltip(t("Fetch Remote Title"))
                .onClick(async () => {
                    if (this.linkUrl) {
                        btn.setDisabled(true); // 禁用按钮，避免重复点击
                        btn.setIcon("lucide-loader"); // 显示加载图标
                        const title = await this.fetchRemoteTitle(this.linkUrl);
                        btn.setIcon("lucide-globe"); // 恢复图标
                        btn.setDisabled(false);
                        this.linkText = title;
                        this.linkTextInput.setValue(title);
                        this.updateHeader();
                    } else {
                        new Notice(t("Please enter a URL first"));
                    }
                });
        });
        linkTextSetting.setName(t("Link Text"))
            .addText((text) => {
                this.linkTextInput = text;
                text.setPlaceholder(t("Link Text"))
                    .setValue(this.linkText)
                    .onChange((value) => {
                        this.linkText = value;
                        this.updateHeader();
                    });
            })
       
    
        // 链接别名输入（非图片模式时显示）
        const aliasSetting = new Setting(linkTextSetting.controlEl)
            .setName(t("Title"))
            .addText((text) => {
                this.linkAliasInput = text;
                text.setPlaceholder(t("Link Title (optional)"))
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
    
        // URL 错误提示
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
    
        // 图片尺寸设置（带自适应宽度图标）
        const imageSizeSetting = new Setting(contentEl)
        .addButton((btn) => {
            btn.setIcon("lucide-maximize")
                .setTooltip(t("Fit Editor Width"))
                .onClick(() => {
                    const dimensions = this.getImageDimensions();
                    if (dimensions) {
                        this.imageWidth = dimensions.width.toString();
                        this.imageHeight = dimensions.height?.toString();
                        (imageSizeSetting.components[1] as TextComponent).setValue(this.imageWidth); // 更新宽度
                        if (this.imageHeight) {
                            (imageSizeSetting.components[2] as TextComponent).setValue(this.imageHeight); // 更新高度
                        }
                        this.updateHeader();
                    }
                });
        });
        imageSizeSetting.setClass('image-size-setting')
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
          
    
        const imageSizeIcon = imageSizeSetting.controlEl.createDiv("image-size-icon");
        setIcon(imageSizeIcon, "lucide-x");
    
        imageSizeSetting.addText((text) => {
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
                    .inputEl.setAttribute("readonly", "true");
            });
    
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
            if (!this.linkText && !this.linkUrl) {
                this.linkTextInput.inputEl.focus();
            } else if (!this.linkText && this.linkUrl) {
                this.linkTextInput.inputEl.focus();
            } else if (this.linkText && !this.linkUrl) {
                this.linkUrlInput.inputEl.focus();
            } else {
                this.linkAliasInput.inputEl.focus();
            }
        }, 10);
    }
    
 // 在你的插件中使用
private async fetchRemoteTitle(url: string): Promise<string> {
    return UrlTitleFetcher.fetchRemoteTitle(url);
}

// 获取默认标题（保持原样供其他地方使用）
private getFallbackTitle(url: string): string {
    return UrlTitleFetcher.getFallbackTitle(url);
}
    // 获取当前编辑器宽度
    private getImageDimensions(): { width: number; height: number } | null {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return null;
    
        // 获取编辑器内容区域
    const editorEl = view.contentEl.querySelector('.markdown-source-view .cm-content') as HTMLElement;
    const containerEl = view.contentEl as HTMLElement;
    if (!editorEl || !containerEl) return null;

    const editorWidth = editorEl.offsetWidth;
    const viewHeight = containerEl.offsetHeight;
    const maxHeight = Math.floor(viewHeight / 2);

    // 在实时预览模式下，查找已渲染的 <img> 元素
    if (view.getMode() === 'preview' || view.getMode() === 'source') { // Live Preview 或源代码模式
        const imgEls = editorEl.querySelectorAll('img');
        if (imgEls.length > 0) {
            // 如果有多个 <img>，优先选择与当前 URL 匹配的，或者第一个已加载的
            let targetImg: HTMLImageElement | null = null;
            if (this.linkUrl) {
                imgEls.forEach((img) => {
                    if (img.src === this.linkUrl && img.complete && img.naturalWidth > 0) {
                        targetImg = img as HTMLImageElement;
                    }
                });
            }
            if (!targetImg) {
                // 如果未找到匹配 URL 的，取第一个已加载的图片
                targetImg = Array.from(imgEls).find(img => img.complete && img.naturalWidth > 0) as HTMLImageElement || null;
            }

            if (targetImg) {
                const naturalWidth = targetImg.naturalWidth;
                const naturalHeight = targetImg.naturalHeight;
                const aspectRatio = naturalWidth / naturalHeight;

                let adjustedWidth = Math.min(naturalWidth, Math.floor(editorWidth * 0.65));
                let adjustedHeight = Math.floor(adjustedWidth / aspectRatio);

                if (adjustedHeight > maxHeight) {
                    adjustedHeight = maxHeight;
                    adjustedWidth = Math.floor(adjustedHeight * aspectRatio);
                }

                return { width: adjustedWidth, height: adjustedHeight };
            }
        }
    }
     
      
    
        
        const defaultAspectRatio = 4 / 3;
        const heightLimitedWidth = Math.floor(maxHeight * defaultAspectRatio);
        const adjustedWidth = Math.min(Math.floor(editorWidth * 0.65), heightLimitedWidth);
      
    
        return { width: adjustedWidth, height: null };
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
        }
        markdownLink += `](${linkUrl}`;

        // 添加 title（如果存在）
        if (this.linkAlias) {
            markdownLink += ` "${this.linkAlias}"`;
        }

        markdownLink += `)`;

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
                    { line: selectionStart.line, ch: selectionStart.ch },
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

