import type { Command } from "obsidian";
export const APPEND_METHODS = ["body", "workspace"];
export const AESTHETIC_STYLES = ["glass", "default", "tiny"];
export const POSITION_STYLES = ["fixed", "following", "top"];



declare module 'obsidian' {
    export interface Command {
        SubmenuCommands?: Command[];
    }
}
export interface EditingToolbarSettings {
    cMenuWidth: number;
    cMenuFontColor: string;
    cMenuBackgroundColor: string;
    aestheticStyle: string;
    positionStyle: string;
    menuCommands: Command[];
    appendMethod: string;
    shouldShowMenuOnSelect: boolean;
    cMenuVisibility: boolean;
    cMenuBottomValue: number;
    cMenuNumRows: number;
    autohide: boolean;
    custom_bg1: string;
    custom_bg2: string;
    custom_bg3: string;
    custom_bg4: string;
    custom_bg5: string;
    custom_fc1: string;
    custom_fc2: string;
    custom_fc3: string;
    custom_fc4: string;
    custom_fc5: string;
    isLoadOnMobile: boolean;
    [index: string]: any
}

export const DEFAULT_SETTINGS: EditingToolbarSettings = {
    "aestheticStyle": "default",
    "positionStyle": "top",
    "menuCommands": [
        {
            "id": "editing-toolbar:editor-undo",
            "name": "undo editor",
            "icon": "undo-glyph"
        },
        {
            "id": "editing-toolbar:editor-redo",
            "name": "redo editor",
            "icon": "redo-glyph"
        },
        {
            "id": "editing-toolbar:format-eraser",
            "name": "Clear text formatting",
            "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M889 512 l-211 211 q-26 27 -61 36 q-35 9 -70 0 q-35 -9 -61 -36 l-351 -350 q-26 -27 -35.5 -62 q-9.5 -35 0 -70 q9.5 -35 35.5 -61 l170 -170 q12 -12 29 -12 l215 0 q17 0 29 12 l311 310 q26 26 35.5 61 q9.5 35 0 70 q-9.5 35 -35.5 61 ZM831 453 q15 -15 15.5 -36.5 q0.5 -21.5 -14.5 -37.5 l-300 -298 l-181 0 l-158 158 q-15 15 -15 37 q0 22 15 38 l351 351 q16 16 38 16 q22 0 37 -16 l212 -212 ZM686 217 l-59 -59 l-317 315 l58 59 l318 -315 ZM883 81 q18 0 30.5 -12 q12.5 -12 12.5 -29 q0 -17 -12.5 -29 q-12.5 -12 -29.5 -13 l-456 0 q-17 0 -29.5 12 q-12.5 12 -12.5 29 q0 17 12 29 q12 12 29 13 l456 0 Z\"></path></g></svg>"
        },
        {
            "id": "editing-toolbar:header2-text",
            "name": "Header 2",
            "icon": "header-2"
        },
        {
            "id": "editing-toolbar:header3-text",
            "name": "Header 3",
            "icon": "header-3"
        },
        {
            "id": "SubmenuCommands-header",
            "name": "submenu",
            "icon": "header-n",
            "SubmenuCommands": [
                {
                    "id": "editing-toolbar:header1-text",
                    "name": "Header 1",
                    "icon": "header-1"
                },
                {
                    "id": "editing-toolbar:header4-text",
                    "name": "Header 4",
                    "icon": "header-4"
                },
                {
                    "id": "editing-toolbar:header5-text",
                    "name": "Header 5",
                    "icon": "header-5"
                },
                {
                    "id": "editing-toolbar:header6-text",
                    "name": "Header 6",
                    "icon": "header-6"
                }
            ]
        },
        {
            "id": "editing-toolbar:editor:toggle-bold",
            "name": "Toggle bold",
            "icon": "bold-glyph"
        },
        {
            "id": "editing-toolbar:editor:toggle-italics",
            "name": "Toggle italics",
            "icon": "italic-glyph"
        },
        {
            "id": "editing-toolbar:editor:toggle-strikethrough",
            "name": "Toggle strikethrough",
            "icon": "strikethrough-glyph"
        },
        {
            "id": "editing-toolbar:underline",
            "name": "Toggle underline",
            "icon": "underline-glyph"
        },
        {
            "id": "editor:toggle-highlight",
            "name": "==Toggle highlight ==",
            "icon": "highlight-glyph"
        },
        {
            "id": "SubmenuCommands-lucdf3en5",
            "name": "submenu",
            "icon": "edit",
            "SubmenuCommands": [
                {
                    "id": "editing-toolbar:editor-copy",
                    "name": " copy ",
                    "icon": "lucide-copy"
                },
                {
                    "id": "editing-toolbar:editor-cut",
                    "name": " cut ",
                    "icon": "lucide-scissors"
                },
                {
                    "id": "editing-toolbar:editor-paste",
                    "name": "paste ",
                    "icon": "lucide-clipboard-type"
                },
                {
                    "id": "editing-toolbar:editor:swap-line-down",
                    "name": "swap line down",
                    "icon": "lucide-corner-right-down"
                },
                {
                    "id": "editing-toolbar:editor:swap-line-up",
                    "name": "swap line up",
                    "icon": "lucide-corner-right-up"
                }
            ]
        },
        {
            "id": "editing-toolbar:editor:attach-file",
            "name": "upload attach file",
            "icon": "lucide-paperclip"
        },
        {
            "id": "editing-toolbar:editor:insert-table",
            "name": "Toggle table",
            "icon": "lucide-table"
        },
        {
            "id": "editing-toolbar:editor:cycle-list-checklist",
            "name": "Toggle cycle list checklist",
            "icon": "check-circle"
        },
        {
            "id": "SubmenuCommands-luc8efull",
            "name": "submenu",
            "icon": "message-square",
            "SubmenuCommands": [
                {
                    "id": "editing-toolbar:editor:toggle-blockquote",
                    "name": "Toggle blockquote",
                    "icon": "lucide-text-quote"
                },
                {
                    "id": "editing-toolbar:editor:insert-callout",
                    "name": "Toggle Callout ",
                    "icon": "lucide-quote"
                }
            ]
        },
        {
            "id": "SubmenuCommands-mdcmder",
            "name": "submenu",
            "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M464 608 l0 -568 q0 -3 -2.5 -5.5 q-2.5 -2.5 -5.5 -2.5 l-80 0 q-3 0 -5.5 2.5 q-2.5 2.5 -2.5 5.5 l0 568 l-232 0 q-3 0 -5.5 2.5 q-2.5 2.5 -2.5 5.5 l0 80 q0 3 2.5 5.5 q2.5 2.5 5.5 2.5 l560 0 q3 0 5.5 -2.5 q2.5 -2.5 2.5 -5.5 l0 -80 q0 -3 -2.5 -5.5 q-2.5 -2.5 -5.5 -2.5 l-232 0 ZM864 696 q17 0 28.5 11.5 q11.5 11.5 11.5 28.5 q0 17 -11.5 28.5 q-11.5 11.5 -28.5 11.5 q-17 0 -28.5 -11.5 q-11.5 -11.5 -11.5 -28.5 q0 -17 11.5 -28.5 q11.5 -11.5 28.5 -11.5 ZM864 640 q-40 0 -68 28 q-28 28 -28 68 q0 40 28 68 q28 28 68 28 q40 0 68 -28 q28 -28 28 -68 q0 -40 -28 -68 q-28 -28 -68 -28 ZM576 322 l0 -63 q0 -3 2 -5 l89 -70 l-89 -70 q-2 -2 -2 -5 l0 -63 q0 -4 3.5 -5.5 q3.5 -1.5 6.5 0.5 l170 133 q4 3 4.5 8.5 q0.5 5.5 -2.5 9.5 l-2 2 l-170 133 q-3 2 -6.5 0.5 q-3.5 -1.5 -3.5 -5.5 ZM256 322 l0 -63 q0 -3 -2 -5 l-89 -70 l89 -70 q2 -2 2 -5 l0 -63 q0 -4 -3.5 -5.5 q-3.5 -1.5 -6.5 0.5 l-170 133 q-4 3 -4.5 8.5 q-0.5 5.5 2.5 9.5 l2 2 l170 133 q3 2 6.5 0.5 q3.5 -1.5 3.5 -5.5 Z\"></path></g></svg>",
            "SubmenuCommands": [
                {
                    "id": "editing-toolbar:superscript",
                    "name": "Toggle superscript",
                    "icon": "superscript-glyph"
                },
                {
                    "id": "editing-toolbar:subscript",
                    "name": "Toggle subscript",
                    "icon": "subscript-glyph"
                },
                {
                    "id": "editing-toolbar:editor:toggle-code",
                    "name": "inline code",
                    "icon": "code-glyph"
                },
                {
                    "id": "editing-toolbar:codeblock",
                    "name": "Toggle codeblock",
                    "icon": "codeblock-glyph"
                },
                {
                    "id": "editing-toolbar:editor:insert-wikilink",
                    "name": "insert wikilink [[]]",
                    "icon": "<svg width=\"15\" height=\"15\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M306 134 l91 0 q1 0 1 -8 l0 -80 q0 -8 -1 -8 l-91 0 q-1 0 -1 7 q0 -8 -5 -8 l-45 0 q-5 0 -5 8 l0 784 q0 8 5 8 l45 0 q5 0 5 -8 q0 8 1 8 l91 0 q1 0 1 -8 l0 -80 q0 -8 -1 -8 l-91 0 q-1 0 -1 8 l0 -623 q0 8 1 8 ZM139 134 l91 0 q1 0 1 -8 l0 -80 q0 -8 -1 -8 l-91 0 q-1 0 -1 7 q0 -8 -5 -8 l-45 0 q-5 0 -5 8 l0 784 q0 8 5 8 l45 0 q5 0 5 -8 q0 8 1 8 l91 0 q1 0 1 -8 l0 -80 q0 -8 -1 -8 l-91 0 q-1 0 -1 8 l0 -623 q0 8 1 8 ZM711 134 q1 0 1 -8 l0 623 q0 -8 -1 -8 l-91 0 q-1 0 -1 8 l0 80 q0 8 1 8 l91 0 q1 0 1 -8 q0 8 4 8 l46 0 q4 0 4 -8 l0 -784 q0 -8 -4 -8 l-46 0 q-4 0 -4 8 q0 -7 -1 -7 l-91 0 q-1 0 -1 8 l0 80 q0 8 1 8 l91 0 ZM878 134 q1 0 1 -8 l0 623 q0 -8 -1 -8 l-91 0 q-1 0 -1 8 l0 80 q0 8 1 8 l91 0 q1 0 1 -8 q0 8 5 8 l45 0 q4 0 4 -8 l0 -784 q0 -8 -4 -8 l-45 0 q-5 0 -5 8 q0 -7 -1 -7 l-91 0 q-1 0 -1 8 l0 80 q0 8 1 8 l91 0 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:editor:insert-embed",
                    "name": "insert embed ![[]]",
                    "icon": "note-glyph"
                },
                {
                    "id": "editing-toolbar:editor:insert-link",
                    "name": "insert link []()",
                    "icon": "link-glyph"
                },
                {
                    "id": "editing-toolbar:hrline",
                    "name": "Horizontal divider",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M912 424 l0 -80 q0 -3 -2.5 -5.5 q-2.5 -2.5 -5.5 -2.5 l-784 0 q-3 0 -5.5 2.5 q-2.5 2.5 -2.5 5.5 l0 80 q0 3 2.5 5.5 q2.5 2.5 5.5 2.5 l784 0 q3 0 5.5 -2.5 q2.5 -2.5 2.5 -5.5 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:editor:toggle-inline-math",
                    "name": "Toggle inline math",
                    "icon": "lucide-sigma"
                },
                {
                    "id": "editing-toolbar:editor:insert-mathblock",
                    "name": "Toggle MathBlock",
                    "icon": "lucide-sigma-square"
                }
            ]
        },
        {
            "id": "SubmenuCommands-list",
            "name": "submenu-list",
            "icon": "bullet-list-glyph",
            "SubmenuCommands": [
                {
                    "id": "editing-toolbar:editor:toggle-checklist-status",
                    "name": "checklist",
                    "icon": "checkbox-glyph"
                },
                {
                    "id": "editor:toggle-numbered-list",
                    "name": "numbered list",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M860 424 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-457 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l457 0 ZM860 756 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-457 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l457 0 ZM860 92 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-457 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l457 0 ZM264 136 l-3 -3 l-51 -57 l56 0 q14 0 24.5 -10 q10.5 -10 11.5 -25 l0 -1 q0 -15 -10.5 -25.5 q-10.5 -10.5 -24.5 -10.5 l-137 0 q-15 0 -25 10 q-10 10 -11 24.5 q-1 14.5 9 25.5 l63 70 l49 54 q7 7 7 16.5 q0 9.5 -7.5 16.5 q-7.5 7 -18.5 7 q-11 0 -18.5 -6.5 q-7.5 -6.5 -8.5 -16.5 l0 0 q0 -15 -10.5 -25.5 q-10.5 -10.5 -25.5 -10.5 q-15 0 -25.5 10.5 q-10.5 10.5 -10.5 25.5 q0 26 13.5 47.5 q13.5 21.5 36 34.5 q22.5 13 49 13 q26.5 0 49.5 -13 q23 -13 36 -34.5 q13 -21.5 13 -47.5 q0 -20 -7.5 -37.5 q-7.5 -17.5 -21.5 -30.5 l-1 -1 ZM173 794 q11 11 25 10.5 q14 -0.5 24.5 -10.5 q10.5 -10 10.5 -25 l0 -293 q0 -15 -10 -25.5 q-10 -10.5 -25 -10.5 q-15 0 -25.5 10 q-10.5 10 -11.5 25 l0 211 q-10 -8 -23.5 -7 q-13.5 1 -22.5 11 l-1 0 q-10 11 -9.5 25.5 q0.5 14.5 10.5 24.5 l58 54 Z\"></path></g></svg>"
                },
                {
                    "id": "editor:toggle-bullet-list",
                    "name": "bullet list",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M860 424 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-477 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l477 0 ZM860 756 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-477 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l477 0 ZM860 92 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-477 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l477 0 ZM176 716 l0 0 ZM112 716 q0 -27 18.5 -45.5 q18.5 -18.5 45.5 -18.5 q27 0 45.5 18.5 q18.5 18.5 18.5 45.5 q0 27 -18.5 45.5 q-18.5 18.5 -45.5 18.5 q-27 0 -45.5 -18.5 q-18.5 -18.5 -18.5 -45.5 ZM176 384 l0 0 ZM112 384 q0 -27 18.5 -45.5 q18.5 -18.5 45.5 -18.5 q27 0 45.5 18.5 q18.5 18.5 18.5 45.5 q0 27 -18.5 45.5 q-18.5 18.5 -45.5 18.5 q-27 0 -45.5 -18.5 q-18.5 -18.5 -18.5 -45.5 ZM176 52 l0 0 ZM112 52 q0 -27 18.5 -45.5 q18.5 -18.5 45.5 -18.5 q27 0 45.5 18.5 q18.5 18.5 18.5 45.5 q0 27 -18.5 45.5 q-18.5 18.5 -45.5 18.5 q-27 0 -45.5 -18.5 q-18.5 -18.5 -18.5 -45.5 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:undent-list",
                    "name": "unindent-list",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M872 302 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-429 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l429 0 ZM872 542 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-429 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l429 0 ZM872 784 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM872 62 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM244 534 l-123 -122 q-8 -7 -8 -18 q0 -11 8 -18 l123 -122 q8 -7 19 -7 q11 0 18.5 7.5 q7.5 7.5 7.5 18.5 l0 242 q0 11 -7.5 18.5 q-7.5 7.5 -18.5 7.5 q-11 0 -19 -7 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:indent-list",
                    "name": "indent list",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M872 302 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-429 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l429 0 ZM872 542 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-429 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l429 0 ZM872 784 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM872 62 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM158 534 l124 -122 q7 -7 7 -18 q0 -11 -7 -18 l-124 -122 q-7 -7 -18 -7 q-11 0 -19 7.5 q-8 7.5 -8 18.5 l0 242 q0 11 8 18.5 q8 7.5 19 7.5 q11 0 18 -7 Z\"></path></g></svg>"
                }
            ]
        },
        {
            "id": "SubmenuCommands-aligin",
            "name": "submenu-aligin",
            "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M724 304 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 540 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM724 776 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 68 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 Z\"></path></g></svg>",
            "SubmenuCommands": [
                {
                    "id": "editing-toolbar:justify",
                    "name": "<p aligin=\"justify\"></p>",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M112 736 l0 0 ZM120 736 l784 0 q8 0 8 -8 l0 -80 q0 -8 -8 -8 l-784 0 q-8 0 -8 8 l0 80 q0 8 8 8 ZM112 331 l0 0 ZM120 331 l784 0 q8 0 8 -8 l0 -80 q0 -8 -8 -8 l-784 0 q-8 0 -8 8 l0 80 q0 8 8 8 ZM112 128 l0 0 ZM120 128 l784 0 q8 0 8 -8 l0 -80 q0 -8 -8 -8 l-784 0 q-8 0 -8 8 l0 80 q0 8 8 8 ZM112 533 l0 0 ZM120 533 l784 0 q8 0 8 -8 l0 -80 q0 -8 -8 -8 l-784 0 q-8 0 -8 8 l0 80 q0 8 8 8 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:left",
                    "name": "<p aligin=\"left\"></p>",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M572 304 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 540 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM572 776 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 68 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:center",
                    "name": "<center>",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M724 304 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 540 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM724 776 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 68 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 Z\"></path></g></svg>"
                },
                {
                    "id": "editing-toolbar:right",
                    "name": "<p aligin=\"right\"></p>",
                    "icon": "<svg width=\"18\" height=\"18\" focusable=\"false\" fill=\"currentColor\"  viewBox=\"0 0 1024 1024\"><g transform=\"scale(1, -1) translate(0, -896) scale(0.9, 0.9) \"><path class=\"path\" d=\"M872 304 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 540 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 ZM872 776 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-421 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l421 0 ZM872 68 q17 0 28.5 -11.5 q11.5 -11.5 11.5 -28 q0 -16.5 -11.5 -28.5 q-11.5 -12 -27.5 -12 l-721 0 q-17 0 -28.5 11.5 q-11.5 11.5 -11.5 28 q0 16.5 11.5 28.5 q11.5 12 27.5 12 l721 0 Z\"></path></g></svg>"
                }
            ]
        },
        {
            "id": "editing-toolbar:change-font-color",
            "name": "Change font color[html]",
            "icon": "<svg width=\"24\" height=\"24\" focusable=\"false\" fill=\"currentColor\"><g fill-rule=\"evenodd\"><path id=\"change-font-color-icon\" d=\"M3 18h18v3H3z\" style=\"fill:#2DC26B\"></path><path d=\"M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z\"></path></g></svg>"
        },
        {
            "id": "editing-toolbar:change-background-color",
            "name": "Change Backgroundcolor[html]",
            "icon": "<svg width=\"18\" height=\"24\" viewBox=\"0 0 256 256\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\"><g   stroke=\"none\" stroke-width=\"1\" fill=\"currentColor\" fill-rule=\"evenodd\"><g  ><g fill=\"currentColor\"><g transform=\"translate(119.502295, 137.878331) rotate(-135.000000) translate(-119.502295, -137.878331) translate(48.002295, 31.757731)\" ><path d=\"M100.946943,60.8084699 L43.7469427,60.8084699 C37.2852111,60.8084699 32.0469427,66.0467383 32.0469427,72.5084699 L32.0469427,118.70847 C32.0469427,125.170201 37.2852111,130.40847 43.7469427,130.40847 L100.946943,130.40847 C107.408674,130.40847 112.646943,125.170201 112.646943,118.70847 L112.646943,72.5084699 C112.646943,66.0467383 107.408674,60.8084699 100.946943,60.8084699 Z M93.646,79.808 L93.646,111.408 L51.046,111.408 L51.046,79.808 L93.646,79.808 Z\" fill-rule=\"nonzero\"></path><path d=\"M87.9366521,16.90916 L87.9194966,68.2000001 C87.9183543,69.4147389 86.9334998,70.399264 85.7187607,70.4 L56.9423078,70.4 C55.7272813,70.4 54.7423078,69.4150264 54.7423078,68.2 L54.7423078,39.4621057 C54.7423078,37.2523513 55.5736632,35.1234748 57.0711706,33.4985176 L76.4832996,12.4342613 C78.9534987,9.75382857 83.1289108,9.5834005 85.8093436,12.0535996 C87.1658473,13.303709 87.9372691,15.0644715 87.9366521,16.90916 Z\" fill-rule=\"evenodd\"></path><path d=\"M131.3,111.241199 L11.7,111.241199 C5.23826843,111.241199 0,116.479467 0,122.941199 L0,200.541199 C0,207.002931 5.23826843,212.241199 11.7,212.241199 L131.3,212.241199 C137.761732,212.241199 143,207.002931 143,200.541199 L143,122.941199 C143,116.479467 137.761732,111.241199 131.3,111.241199 Z M124,130.241 L124,193.241 L19,193.241 L19,130.241 L124,130.241 Z\" fill-rule=\"nonzero\"></path></g></g><path d=\"M51,218 L205,218 C211.075132,218 216,222.924868 216,229 C216,235.075132 211.075132,240 205,240 L51,240 C44.9248678,240 40,235.075132 40,229 C40,222.924868 44.9248678,218 51,218 Z\" id=\"change-background-color-icon\" style=\"fill:#FA541C\"></path></g></g></svg>"
        },
        {
            "id": "editing-toolbar:fullscreen-focus",
            "name": "Fullscreen focus mode",
            "icon": "fullscreen"
        },
        {
            "id": "editing-toolbar:workplace-fullscreen-focus",
            "name": "workplace-Fullscreen ",
            "icon": "exit-fullscreen"
        }
    ],
    "appendMethod": "workspace",
    "shouldShowMenuOnSelect": false,
    "cMenuVisibility": true,
    "cMenuBottomValue": 4.25,
    "cMenuNumRows": 12,
    "cMenuWidth": 610,
    "cMenuFontColor": "#2DC26B",
    "cMenuBackgroundColor": "#d3f8b6",
    "autohide": false,
    "custom_bg1": "#FFB78B8C",
    "custom_bg2": "#CDF4698C",
    "custom_bg3": "#A0CCF68C",
    "custom_bg4": "#F0A7D88C",
    "custom_bg5": "#ADEFEF8C",
    "custom_fc1": "#D83931",
    "custom_fc2": "#DE7802",
    "custom_fc3": "#245BDB",
    "custom_fc4": "#6425D0",
    "custom_fc5": "#646A73",
    "isLoadOnMobile": false
}
