import { Command } from "obsidian";
import EditingToolbarPlugin from "../../main";
import { wait } from "../../utils/util";

const modCommands: Command[] = [
    {
        id: "editor:insert-embed",
        name: "Add embed",
        icon: "note-glyph",
    },
    {
        id: "editor:insert-link",
        name: "Insert markdown link",
        icon: "link-glyph",
    },
    {
        id: "editor:insert-tag",
        name: "Add tag",
        icon: "price-tag-glyph",
    },
    {
        id: "editor:insert-wikilink",
        name: "Add internal link",
        icon: "bracket-glyph",
    },
    {
        id: "editor:toggle-bold",
        name: "Toggle bold",
        icon: "bold-glyph",
    },
    {
        id: "editor:toggle-italics",
        name: "Toggle italics",
        icon: "italic-glyph",
    },
    {
        id: "editor:toggle-strikethrough",
        name: "Toggle strikethrough",
        icon: "strikethrough-glyph",
    },
    {
        id: "editor:toggle-code",
        name: "Toggle code",
        icon: "code-glyph",
    },
    {
        id: "editor:toggle-blockquote",
        name: "Toggle blockquote",
        icon: "lucide-text-quote",
    },
    {
        id: "editor:toggle-bullet-list",
        name: "Toggle bullet",
        icon: "bullet-list-glyph",
    },
    {
        id: "editor:toggle-checklist-status",
        name: "Toggle checklist status",
        icon: "checkbox-glyph",
    },
    {
        id: "editor:toggle-comments",
        name: "Toggle comment",
        icon: "percent-sign-glyph",
    },
    {
        id: "editor:toggle-highlight",
        name: "Toggle highlight",
        icon: "highlight-glyph",
    },
    {
        id: "editor:toggle-numbered-list",
        name: "Toggle numbered list",
        icon: "number-list-glyph",
    },
    {
        id: "editor:insert-callout",
        name: "Toggle Callout ",
        icon: "lucide-quote",
    },
    {
        id: "editor:insert-mathblock",
        name: "Toggle MathBlock",
        icon: "lucide-sigma-square",
    },
    {
        id: "editor:toggle-inline-math",
        name: "Toggle inline math",
        icon: "lucide-sigma",
    },
    {
        id: "editor:insert-table",
        name: "Toggle table",
        icon: "lucide-table",
    },
    {
        id: "editor:swap-line-up",
        name: "Toggle swap line up",
        icon: "lucide-corner-right-up",
    },
    {
        id: "editor:swap-line-down",
        name: "Toggle swap line down",
        icon: "lucide-corner-right-down",
    },
    {
        id: "editor:attach-file",
        name: "Toggle upload attach file",
        icon: "lucide-paperclip",
    },
    {
        id: "editor:clear-formatting",
        name: "Toggle clear formatting",
        icon: "lucide-eraser",
    },
    {
        id: "editor:cycle-list-checklist",
        name: "Toggle cycle list checklist",
        icon: "lucide-check-square",
    }

];

export function registerModCommands(plugin: EditingToolbarPlugin) {
    modCommands.forEach((type) => {
        plugin.addCommand({
            id: `${type["id"]}`,
            name: `${type["name"]}`,
            icon: `${type["icon"]}`,
            callback: async () => {
                const editor = plugin.getActiveEditor()
                if (!editor) {
                    return
                }
                editor.getCursor("from");
                const curserEnd = editor.getCursor("to");
                let char;
                `${type["id"]}` == "editor:insert-embed"
                    ? (char = 3)
                    : `${type["id"]}` == "editor:insert-link"
                        ? (char = 1)
                        : `${type["id"]}` == "editor:insert-tag"
                            ? (char = 1)
                            : `${type["id"]}` == "editor:insert-wikilink"
                                ? (char = 2)
                                : `${type["id"]}` == "editor:toggle-bold"
                                    ? (char = 2)
                                    : `${type["id"]}` == "editor:toggle-italics"
                                        ? (char = 1)
                                        : `${type["id"]}` == "editor:toggle-strikethrough"
                                            ? (char = 2)
                                            : `${type["id"]}` == "editor:toggle-code"
                                                ? (char = 1)
                                                : `${type["id"]}` == "editor:toggle-blockquote"
                                                    ? (char = 2)
                                                    : `${type["id"]}` == "editor:toggle-bullet-list"
                                                        ? (char = 2)
                                                        : `${type["id"]}` == "editor:toggle-checklist-status"
                                                            ? (char = 4)
                                                            : `${type["id"]}` == "editor:toggle-comments"
                                                                ? (char = 2)
                                                                : `${type["id"]}` == "editor:toggle-highlight"
                                                                    ? (char = 2)
                                                                    : `${type["id"]}` == "editor:toggle-numbered-list"
                                                                        ? (char = 3)
                                                                        : (char = 2);
                //@ts-ignore
                app.commands.executeCommandById(`${type["id"]}`);
                if (type["id"] !== "editor:insert-link") editor.setCursor(curserEnd.line, curserEnd.ch + char);
                await wait(10);
                //@ts-ignore
                app.commands.executeCommandById("editor:focus");
            },
        });
    });
}