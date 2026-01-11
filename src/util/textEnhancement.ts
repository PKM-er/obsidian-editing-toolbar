import { Editor, Notice } from "obsidian";

export class TextEnhancement {
    /**
     * 获取无语法文本 - 去除 Markdown 语法后复制到剪贴板
     */
    static getPlainText(editor: Editor): void {
        const selection = editor.getSelection();
        if (!selection) {
            new Notice("请先选择文本");
            return;
        }

        const mdPattern = /(^#+\s|(?<=^|\s*)#|^>|^\- \[( |x)\]|^\+ |<[^<>]+>|^1\. |^\-+$|^\*+$|==|\*+|~~|```|!*\[\[|\]\])/mg;
        let plainText = selection
            .replace(/\[([^\[\]]*)\]\([^\(\)]+\)/img, "$1")
            .replace(mdPattern, "")
            .replace(/^[ ]+|[ ]+$/mg, "")
            .replace(/(\r\n|\n)+/mg, "\n");

        navigator.clipboard.writeText(plainText);
        new Notice("无语法文本已复制到剪贴板");
    }

    /**
     * 批量插入空行 - 在每行之间插入空行
     */
    static insertBlankLines(editor: Editor): void {
        const text = editor.getValue();
        if (!text) return;

        const result = text.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");
        editor.setValue(result);
    }

    /**
     * 批量去除空行 - 删除所有空白行
     */
    static removeBlankLines(editor: Editor): void {
        const text = editor.getValue();
        if (!text) return;

        const result = text.replace(/(\r\n|\n)[\t\s]*(\r\n|\n)/g, "\n");
        editor.setValue(result);
    }

    /**
     * 拆分多行 - 将选中文本按指定分隔符拆分成多行
     */
    static splitLines(editor: Editor, separator: string = "、"): void {
        const selection = editor.getSelection();
        if (!selection) {
            new Notice("请先选择文本");
            return;
        }

        const result = selection.split(separator).join("\n");
        editor.replaceSelection(result);
    }

    /**
     * 智能粘贴 - 粘贴时自动处理格式
     */
    static async smartPaste(editor: Editor): Promise<void> {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;

            // 移除多余空行
            let processed = text.replace(/(\r\n|\n){3,}/g, "\n\n");
            // 移除行尾空格
            processed = processed.replace(/[ \t]+$/gm, "");

            editor.replaceSelection(processed);
        } catch (err) {
            new Notice("粘贴失败");
        }
    }

    /**
     * 智能符号 - 自动转换中英文标点
     */
    static smartSymbols(editor: Editor): void {
        const selection = editor.getSelection();
        if (!selection) {
            new Notice("请先选择文本");
            return;
        }

        const result = selection
            .replace(/,/g, "，")
            .replace(/\./g, "。")
            .replace(/;/g, "；")
            .replace(/:/g, "：")
            .replace(/\?/g, "？")
            .replace(/!/g, "！")
            .replace(/\(/g, "（")
            .replace(/\)/g, "）");

        editor.replaceSelection(result);
    }
}
