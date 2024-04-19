import { Editor } from 'obsidian';
import EditingToolbarPlugin from '../../main';
import { wait } from '../../utils/util';

type commandPlot = {
    char: number;
    line: number;
    prefix: string;
    suffix: string;
    islinehead: boolean;
};

type commandsPlot = {
    [key: string]: commandPlot;
};

const applyCommand = (command: commandPlot, editor: Editor) => {
    const selectedText = editor.getSelection();
    const curserStart = editor.getCursor("from");
    const curserEnd = editor.getCursor("to");
    let prefix = command.prefix;
    if (command.islinehead && curserStart.ch > 0) // cursor position is not line head
        prefix = '\n' + prefix
    const suffix = command.suffix || prefix;
    const setCursor = (mode: number) => {
        editor.setCursor(
            curserStart.line + command.line * mode,
            curserEnd.ch + command.char * mode
        );
    };
    const preStart = {
        line: curserStart.line - command.line,
        ch: curserStart.ch - prefix.length,
    };
    const pre = editor.getRange(preStart, curserStart);

    if (pre == prefix.trimStart()) {
        const sufEnd = {
            line: curserStart.line + command.line,
            ch: curserEnd.ch + suffix.length,
        };
        const suf = editor.getRange(curserEnd, sufEnd);
        if (suf == suffix.trimEnd()) {
            editor.replaceRange(selectedText, preStart, sufEnd); // codeblock leave blank lines
            return setCursor(-1);
        }
    }
    editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
    return setCursor(1);
};


export function RegisterTypographicalCommands(plugin: EditingToolbarPlugin) {
    const commandsMap: commandsPlot = {
        hrline: {
            char: 5,
            line: 1,
            prefix: "\n---",
            suffix: "\n",
            islinehead: true
        },
        justify: {
            char: 17,
            line: 0,
            prefix: "<p align=\"justify\">",
            suffix: "</p>",
            islinehead: false,
        },
        left: {
            char: 17,
            line: 0,
            prefix: "<p align=\"left\">",
            suffix: "</p>",
            islinehead: false,
        },
        right: {
            char: 17,
            line: 0,
            prefix: "<p align=\"right\">",
            suffix: "</p>",
            islinehead: false,
        },
        center: {
            char: 8,
            line: 0,
            prefix: "<center>",
            suffix: "</center>",
            islinehead: false,
        },
        underline: {
            char: 3,
            line: 0,
            prefix: "<u>",
            suffix: "</u>",
            islinehead: false,
        },
        superscript: {
            char: 5,
            line: 0,
            prefix: "<sup>",
            suffix: "</sup>",
            islinehead: false,
        },
        subscript: {
            char: 5,
            line: 0,
            prefix: "<sub>",
            suffix: "</sub>",
            islinehead: false,
        },
        codeblock: {
            char: 4,
            line: 0,
            prefix: "\n```\n",
            suffix: "\n```\n",
            islinehead: false,
        },
    };
    // Add new commands
    Object.keys(commandsMap).forEach((type) => {
        plugin.addCommand({
            id: `${type}`,
            name: `Toggle ${type}`,
            icon: `${type}-glyph`,
            callback: async () => {
                const editor = plugin.getActiveEditor()
                if (!editor) {
                    return
                }
                applyCommand(commandsMap[type], editor);
                await wait(10);
                //@ts-ignore
                app.commands.executeCommandById("editor:focus");

            },
        });
    });
}
