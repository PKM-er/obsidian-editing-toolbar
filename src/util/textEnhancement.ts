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

    const mdPattern =
      /(^#+\s|(?<=^|\s*)#|^>|^\- \[( |x)\]|^\+ |<[^<>]+>|^1\. |^\-+$|^\*+$|==|\*+|~~|```|!*\[\[|\]\])/gm;
    let plainText = selection
      .replace(/\[([^\[\]]*)\]\([^\(\)]+\)/gim, "$1")
      .replace(mdPattern, "")
      .replace(/^[ ]+|[ ]+$/gm, "")
      .replace(/(\r\n|\n)+/gm, "\n");

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

  static processWhitespace(
    editor: Editor,
    options: {
      trim?: boolean; // 去除行首尾空格
      compress?: boolean; // 多个空格压缩为一个
      all?: boolean; // 删除所有空格（含全角）
      tabs?: boolean; // 删除/处理制表符
      removeEmptyLines?: boolean; // 删除所有空行（不留痕迹）
      compactEmptyLines?: boolean; // 压缩空行（连续多个空行合并为一个）
    } = {}
  ): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice("请先选择文本");
      return;
    }

    let result = selection;

    // 1. 处理空格和制表符
    if (options.all) {
      result = result.replace(/[ \u3000\t]+/g, "");
    } else {
      if (options.tabs) result = result.replace(/\t/g, "");
      if (options.compress) result = result.replace(/[ \u3000]+/g, " ");
    }

    // 2. 按行处理逻辑
    let lines = result.split(/\r?\n/);

    if (options.trim) {
      lines = lines.map((line) => line.trim());
    }

    // 3. 处理空行逻辑
    if (options.removeEmptyLines) {
      // 彻底删除所有空行
      lines = lines.filter((line) => line.length > 0);
    } else if (options.compactEmptyLines) {
      // 压缩连续空行：将多个连续的空字符串合并为一个
      const newLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length === 0 && i > 0 && lines[i - 1].length === 0) {
          continue;
        }
        newLines.push(lines[i]);
      }
      lines = newLines;
    }

    result = lines.join("\n");

    // 4. 特殊情况：如果开启了 removeEmptyLines，可能还需要处理首尾残留的换行
    if (options.removeEmptyLines) {
      result = result.trim();
    }

    editor.replaceSelection(result);
    new Notice("空白字符清洗完成");
  }
  /**
   * 拆分多行 - 将选中文本按指定分隔符拆分成多行
   */
  static splitLines(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice("请先选择文本");
      return;
    }

    // 1. 尝试识别特殊模式（如数字列表）
    const listPattern = this.detectPattern(selection);

    let result: string[];

    if (listPattern) {
      // 如果识别到了数字列表模式 (1. 2. 3. 或 ① ②)
      result = selection
        .split(listPattern)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      new Notice("检测到列表模式，已自动拆分");
    } else {
      // 2. 否则退回到之前的智能字符统计
      const sep = this.detectSeparator(selection);
      if (!sep) {
        new Notice("未识别到明显的分隔符或列表模式");
        return;
      }
      result = this.smartSplit(selection, sep);
      new Notice(`按字符 '${sep}' 拆分`);
    }

    editor.replaceSelection(result.join("\n"));
  }

  /**
   * 专门检测列表型模式
   */
  private static detectPattern(text: string): RegExp | null {
    // 模式 A: 阿拉伯数字列表 "1. ", "2. " (必须后面跟着点和空格，防止误伤小数)
    const numberedList = /\s?\d+[\.、]\s?/g;

    // 模式 B: 箭头或符号分隔 "→", "=>", ">"
    const arrowSymbol = /\s?[→=>]\s?/g;

    // 校验：如果匹配到的次数 > 1，说明这是一种规律模式
    if ((text.match(numberedList) || []).length > 1) return numberedList;
    if ((text.match(arrowSymbol) || []).length > 1) return arrowSymbol;

    return null;
  }
  /**
   * 智能拆分
   */
  private static smartSplit(text: string, separator: string): string[] {
    const parts: string[] = [];
    let current = "";
    let inQuote: string | null = null; // 记录当前在哪个闭合符内

    // 定义成对的闭合符号
    const pairs: Record<string, string> = {
      '"': '"',
      "'": "'",
      "“": "”",
      "‘": "’",
      "(": ")",
      "（": "）",
      "《": "》",
      "[": "]",
      "[[": "]]",
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (!inQuote) {
        // 如果不在闭合区间内
        if (pairs[char]) {
          // 进入了闭合区间
          inQuote = pairs[char];
          current += char;
        } else if (char === separator) {
          // 遇到了真正的分隔符
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      } else {
        // 如果在闭合区间内
        current += char;
        if (char === inQuote) {
          // 闭合区间结束
          inQuote = null;
        }
      }
    }

    if (current) parts.push(current.trim());

    // 过滤掉因为末尾分隔符产生的空项
    return parts.filter((p) => p.length > 0);
  }

  /**
   * 自动识别分隔符（依然保留）
   */
  private static detectSeparator(text: string): string | null {
    const candidates = ["、", "，", ",", ";", "；", "|", "·"];
    let maxCount = 0;
    let bestSeparator = null;

    candidates.forEach((sep) => {
      // 这里的统计也需要排除闭合区间内的符号，但简单统计通常也够用
      const count = text.split(sep).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestSeparator = sep;
      }
    });

    return bestSeparator;
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
   * 智能全角半角转换 - 自动感知语境并规范化排版
   */
  static smartTypography(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection || selection.trim().length === 0) {
      new Notice("请先选择文本");
      return;
    }

    // 1. 语境识别逻辑
    const cjkRegex = /[\u4e00-\u9fa5]/g;
    const cjkCount = (selection.match(cjkRegex) || []).length;
    // 中文字符占比超过 10% 判定为中文语境（转全角），否则为英文语境（转半角）
    const isChineseContext = cjkCount / selection.length > 0.1;

    let result = selection;

    // 2. 占位保护（避开代码、网址、链接、公式）
    const placeholders: string[] = [];
    const protectedPatterns = [
      /`[^`]+`/g,
      /\$[^$]+\$/g,
      /https?:\/\/[^\s)]+/g,
      /!\[.*?\]\(.*?\)/g,
      /\[.*?\]\(.*?\)/g,
    ];

    protectedPatterns.forEach((reg) => {
      result = result.replace(reg, (match) => {
        placeholders.push(match);
        return `__PROTECTED_${placeholders.length - 1}__`;
      });
    });

    // 3. 执行核心转换
    if (isChineseContext) {
      // --- 目标：规范化为【全角】标点 ---
      result = result
        .replace(/,/g, "，")
        .replace(/\.(?!\d)/g, "。")
        .replace(/;/g, "；")
        .replace(/:/g, "：")
        .replace(/\?/g, "？")
        .replace(/!/g, "！")
        .replace(/\(/g, "（")
        .replace(/\)/g, "）")
        .replace(/"([^"]*)"/g, "“$1”")
        // 额外福利：自动优化中英间距
        .replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, "$1 $2")
        .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, "$1 $2");

      new Notice("检测为中文语境：已转换为全角符号");
    } else {
      // --- 目标：规范化为【半角】标点 ---
      result = result
        .replace(/，/g, ", ")
        .replace(/。/g, ". ")
        .replace(/；/g, "; ")
        .replace(/：/g, ": ")
        .replace(/？/g, "? ")
        .replace(/！/g, "! ")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/[“”]/g, '"')
        .replace(/ {2,}/g, " "); // 压缩多余空格

      new Notice("检测为代码/英文语境：已转换为半角符号");
    }

    // 4. 还原保护内容
    placeholders.forEach((val, index) => {
      result = result.replace(`__PROTECTED_${index}__`, val);
    });

    editor.replaceSelection(result);
  }
  /**
   * 去重 - 删除重复的行
   */
  static dedupe(
    editor: Editor,
    options: {
      includeEmpty?: boolean;
      trimBeforeCompare?: boolean; // 比较前忽略首尾空格
      sort?: boolean; // 去重后是否排序
    } = {}
  ): void {
    // 1. 仅处理选中文本，更安全
    const selection = editor.getSelection();
    if (!selection) {
      new Notice("请先选择要去重的文本");
      return;
    }

    const lines = selection.split(/\r?\n/);
    const seen = new Set<string>();
    const result: string[] = [];

    for (const line of lines) {
      const content = options.trimBeforeCompare ? line.trim() : line;

      // 处理空行
      if (content === "") {
        if (options.includeEmpty) {
          if (!seen.has("")) {
            seen.add("");
            result.push(line);
          }
        } else {
          // 不包含空行去重时，保留原样空行（起到分隔作用）
          result.push(line);
        }
        continue;
      }

      // 非空行去重
      if (!seen.has(content)) {
        seen.add(content);
        result.push(line); // 放入原行（保留原始缩进）
      }
    }

    // 2. 排序逻辑
    if (options.sort) {
      result.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
    }

    editor.replaceSelection(result.join("\n"));
    new Notice(`去重完成，剩余 ${result.length} 行`);
  }

  /**
   * 添加前后缀 - 为每行添加前缀和后缀
   */
  static addWrap(
    editor: Editor,
    prefix: string = "",
    suffix: string = "",
    excludeEmpty: boolean = true
  ): void {
    const selection = editor.getSelection();
    const useSelection = selection && selection.trim() !== "";
    const text = useSelection ? selection : editor.getValue();

    if (!text) return;

    const lines = text.split("\n");
    const result = lines
      .map((line) => {
        if (excludeEmpty && line.trim().length === 0) {
          return line;
        }
        return `${prefix}${line}${suffix}`;
      })
      .join("\n");

    if (useSelection) {
      editor.replaceSelection(result);
    } else {
      editor.setValue(result);
    }
    new Notice("添加前后缀完成");
  }

  /**
   * 添加序号
   */
  static numberList(
    editor: Editor,
    startNumber: number = 1,
    stepNumber: number = 1,
    separator: string = ". ",
    prefix: string = ""
  ): void {
    // 1. 只获取选中的文本
    const selection = editor.getSelection();
    if (!selection) {
      new Notice("请先选择要编号的文本");
      return;
    }

    const lines = selection.split("\n");
    let currentNum = startNumber;

    const result = lines
      .map((line) => {
        // 跳过纯空行
        if (line.trim() === "") return line;

        // 2. 智能清理：移除行首现有的数字序号模式 (如 "1. ", "2) ", "3、")
        // 正则解释：匹配开头可选的空格 + 数字 + [点/右括号/顿号] + 可选空格
        const cleanLine = line.replace(/^\s*\d+[\.\)）、]?\s*/, "");

        // 3. 组合新序号
        const numberedLine = `${prefix}${currentNum}${separator}${cleanLine}`;
        currentNum += stepNumber;
        return numberedLine;
      })
      .join("\n");

    // 4. 只替换选中的部分，不触动文档其他内容
    editor.replaceSelection(result);
    new Notice(`已完成编号：从 ${startNumber} 开始`);
  }

  /**
   * 提取两个字符串之间的内容
   */
  static extractBetween(
    editor: Editor,
    startStr: string,
    endStr: string
  ): void {
    if (!startStr && !endStr) {
      new Notice("请指定起始或结束字符串");
      return;
    }

    const text = editor.getValue();
    if (!text) return;

    try {
      // 转义正则特殊字符
      const escapeRegExp = (str: string) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const s = escapeRegExp(startStr);
      const e = escapeRegExp(endStr);
      const pattern = new RegExp(`${s}(.*?)${e}`, "g");

      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] !== undefined) {
          matches.push(match[1]);
        }
      }

      if (matches.length > 0) {
        editor.setValue(matches.join("\n"));
        new Notice(`提取了 ${matches.length} 个匹配项`);
      } else {
        new Notice("未找到匹配项");
      }
    } catch (e) {
      new Notice("提取失败");
    }
  }

  /**
   * 智能合并行 - 自动识别中英环境并处理间距
   */
 /**
 * 智能/自定义合并行
 */
static mergeLines(
    editor: Editor, 
    options: { 
        separator?: string, 
        preserveParagraphs?: boolean, 
        trimLines?: boolean 
    }
): void {
    const selection = editor.getSelection();
    if (!selection || selection.trim() === "") {
        new Notice("请先选择要合并的行");
        return;
    }

    const lines = selection.split(/\r?\n/);
    const hasCustomSep = options.separator !== "";
    let result = "";

    for (let i = 0; i < lines.length; i++) {
        let currentLine = options.trimLines ? lines[i].trim() : lines[i];
        
        // 处理空行
        if (currentLine === "") {
            if (options.preserveParagraphs && !hasCustomSep) {
                result += "\n\n";
            }
            continue;
        }

        if (result !== "" && !result.endsWith("\n")) {
            if (hasCustomSep) {
                // --- 强制模式：使用用户指定的符号 ---
                result += options.separator;
            } else {
                // --- 智能模式：判定中英连接 ---
                const lastChar = result.slice(-1);
                const firstChar = currentLine.charAt(0);
                const isCjkConnection = /[\u4e00-\u9fa5]/.test(lastChar) && /[\u4e00-\u9fa5]/.test(firstChar);
                if (!isCjkConnection) result += " "; 
            }
        }

        result += currentLine;
    }

    // 清理首尾和重复空格
    result = result.replace(/[ ]{2,}/g, " ").trim();
    
    editor.replaceSelection(result);
    new Notice(hasCustomSep ? `已按 '${options.separator}' 合并` : "已完成合并");
}
/**
 * 智能多级列表转表格 (Smart List to Table)
 * 借鉴正则逻辑，支持任务列表与层级分列
 */
static convertListToTable(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection || selection.trim() === "") {
        new Notice("请先选择要转换的列表");
        return;
    }

    const lines = selection.split(/\r?\n/);
    
    // 借鉴并增强的正则：捕获缩进、符号、任务状态和内容
    // group(1): 缩进, group(2): 任务状态, group(3): 文本内容
    const listItemRegex = /^(\s*)(?:[-*+]|\d+\.)\s+(?:\[([ xX])\]\s+)?(.*)$/;

    const tableRows: string[][] = [];
    let maxCols = 1;

    for (const line of lines) {
        if (line.trim() === "") continue;

        const match = line.match(listItemRegex);
        if (match) {
            const indent = match[1] || "";
            const taskStatus = match[2] ? `[${match[2]}] ` : "";
            const content = taskStatus + (match[3] || "");

            // 计算层级（基于空格或制表符缩进）
            // 假设 2 或 4 个空格为一个层级
            const level = indent.length === 0 ? 0 : Math.floor(indent.length / 2);

            if (level === 0) {
                // 第一层：新开一行
                tableRows.push([content]);
            } else {
                // 子层级：存入当前行的后续列
                if (tableRows.length > 0) {
                    const currentRow = tableRows[tableRows.length - 1];
                    currentRow[level] = content;
                    maxCols = Math.max(maxCols, level + 1);
                }
            }
        }
    }

    if (tableRows.length === 0) {
        new Notice("未发现有效的列表格式");
        return;
    }

    // 构建 Markdown 表格
    let table = "| " + Array.from({ length: maxCols }, (_, i) => i === 0 ? "项目" : `内容 ${i}`).join(" | ") + " |\n";
    table += "| " + Array.from({ length: maxCols }, () => "---").join(" | ") + " |\n";

    for (const row of tableRows) {
        // 填充长度一致
        const rowData = Array.from({ length: maxCols }, (_, i) => row[i] || "");
        table += `| ${rowData.join(" | ")} |\n`;
    }

    editor.replaceSelection(table);
    new Notice("列表已转换为多维表格");
}
   /**
 * 表格转列表 - 将 Markdown 表格还原为多级大纲
 */
static convertTableToList(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection || !selection.includes("|")) {
        new Notice("请先选择有效的 Markdown 表格");
        return;
    }

    const lines = selection.split(/\r?\n/);
    const result: string[] = [];

    for (const line of lines) {
        // 跳过表头分割线 (如 | --- | --- |) 和空行
        if (line.match(/^\s*\|?[\s\-:|]+\|?\s*$/) || line.trim() === "") continue;

        // 解析单元格内容，去除首尾管道符并分割
        const cells = line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(c => c.trim());

        // 如果是表头行（通常是第一行），用户可能不需要转为列表，可以根据需求跳过
        // 这里我们简单处理，把每一行非空单元格转为层级
        cells.forEach((cell, index) => {
            if (cell !== "" && cell !== "项目" && !cell.startsWith("内容 ")) {
                const indent = "  ".repeat(index); // 每级增加两个空格
                result.push(`${indent}- ${cell}`);
            }
        });
    }

    editor.replaceSelection(result.join("\n"));
    new Notice("表格已还原为多级列表");
}
}
