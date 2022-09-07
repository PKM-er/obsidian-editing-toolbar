import type { Command } from "obsidian";
export const APPEND_METHODS = ["body", "workspace"];
export const AESTHETIC_STYLES = ["glass", "default", "tiny"];
export const POSITION_STYLES = ["fixed", "following", "top"];



declare module 'obsidian' {
  export interface Command {
    SubmenuCommands?: Command[];
  }
}
export interface cMenuToolbarSettings {
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
}

export const DEFAULT_SETTINGS: cMenuToolbarSettings = {
  aestheticStyle: "default",
  positionStyle: "top",
  menuCommands: [
    {
      id: 'obsidian-editing-toolbar:editor-undo',
      name: 'undo editor',
      icon: "undo-glyph"

    },
    {
      id: 'obsidian-editing-toolbar:editor-redo',
      name: 'redo editor',
      icon: "redo-glyph"
    },
    {
      id: "obsidian-editing-toolbar:header2-text",
      name: "Cmenu toolbar: Header 2",
      hotkeys: [
        {
          "modifiers": [
            "Mod"
          ],
          "key": "2"
        }
      ],
      icon: "header-2"
    },
    {
      id: "obsidian-editing-toolbar:header3-text",
      name: "Cmenu toolbar: Header 3",
      hotkeys: [
        {
          "modifiers": [
            "Mod"
          ],
          "key": "3"
        }
      ],
      icon: "header-3"
    },
    {
      id: "SubmenuCommands-header",
      name: "submenu",
      icon: "header-n",
      SubmenuCommands: [
        {
          id: "obsidian-editing-toolbar:header1-text",
          name: "Cmenu toolbar: Header 1",
          hotkeys: [
            {
              "modifiers": [
                "Mod"
              ],
              "key": "1"
            }
          ],
          icon: "header-1"
        },
        {
          id: "obsidian-editing-toolbar:header4-text",
          name: "Cmenu toolbar: Header 4",
          hotkeys: [
            {
              "modifiers": [
                "Mod"
              ],
              "key": "4"
            }
          ],
          icon: "header-4"
        },
        {
          id: "obsidian-editing-toolbar:header5-text",
          name: "Cmenu toolbar: Header 5",
          hotkeys: [
            {
              "modifiers": [
                "Mod"
              ],
              "key": "5"
            }
          ],
          icon: "header-5"
        },
        {
          id: "obsidian-editing-toolbar:header6-text",
          name: "Cmenu toolbar: Header 6",
          hotkeys: [
            {
              "modifiers": [
                "Mod"
              ],
              "key": "6"
            }
          ],
          icon: "header-6"
        }
      ]
    },
    {
      id: "obsidian-editing-toolbar:editor:toggle-bold",
      name: "cMenuToolbar: Toggle bold",
      icon: "bold-glyph",
    },
    {
      id: "obsidian-editing-toolbar:editor:toggle-italics",
      name: "cMenuToolbar: Toggle italics",
      icon: "italic-glyph",
    },
    {
      id: "obsidian-editing-toolbar:editor:toggle-strikethrough",
      name: "cMenuToolbar: Toggle strikethrough",
      icon: "strikethrough-glyph",
    },
    {
      id: "obsidian-editing-toolbar:underline",
      name: "cMenuToolbar: Toggle underline",
      icon: "underline-glyph",
    },
    {
      id: "obsidian-editing-toolbar:superscript",
      name: "cMenuToolbar: Toggle superscript",
      icon: "superscript-glyph",
    },
    {
      id: "obsidian-editing-toolbar:subscript",
      name: "cMenuToolbar: Toggle subscript",
      icon: "subscript-glyph",
    },
    {
      id: "obsidian-editing-toolbar:editor:toggle-code",
      name: "cMenuToolbar: Toggle code",
      icon: "code-glyph",
    },
    {
      id: "obsidian-editing-toolbar:codeblock",
      name: "cMenuToolbar: Toggle codeblock",
      icon: "codeblock-glyph",
    },
    {
      id: "obsidian-editing-toolbar:editor:toggle-blockquote",
      name: "cMenuToolbar: Toggle blockquote",
      icon: "quote-glyph",
    },
    {
      id: 'obsidian-editing-toolbar:indent-list',
      name: 'indent list',
      icon: "indent-glyph"
    },
    {
      id: 'obsidian-editing-toolbar:undent-list',
      name: 'unindent-list',
      icon: "unindent-glyph"

    },
    {
      id: 'obsidian-editing-toolbar:change-font-color',
      name: 'Change font color[html]',
      icon: `<svg width="24" height="24" focusable="false" fill="currentColor"><g fill-rule="evenodd"><path id="change-font-color-icon" d="M3 18h18v3H3z" style="fill:#2DC26B"></path><path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z"></path></g></svg>`

    },
    {
      id: 'obsidian-editing-toolbar:change-background-color',
      name: 'Change Backgroundcolor[html]',
      icon: `<svg width="18px" height="18px" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg"><g   stroke="none" stroke-width="1" fill="currentColor" fill-rule="evenodd"><g  ><g fill="currentColor"><g transform="translate(119.502295, 137.878331) rotate(-135.000000) translate(-119.502295, -137.878331) translate(48.002295, 31.757731)" ><path d="M100.946943,60.8084699 L43.7469427,60.8084699 C37.2852111,60.8084699 32.0469427,66.0467383 32.0469427,72.5084699 L32.0469427,118.70847 C32.0469427,125.170201 37.2852111,130.40847 43.7469427,130.40847 L100.946943,130.40847 C107.408674,130.40847 112.646943,125.170201 112.646943,118.70847 L112.646943,72.5084699 C112.646943,66.0467383 107.408674,60.8084699 100.946943,60.8084699 Z M93.646,79.808 L93.646,111.408 L51.046,111.408 L51.046,79.808 L93.646,79.808 Z" fill-rule="nonzero"></path><path d="M87.9366521,16.90916 L87.9194966,68.2000001 C87.9183543,69.4147389 86.9334998,70.399264 85.7187607,70.4 L56.9423078,70.4 C55.7272813,70.4 54.7423078,69.4150264 54.7423078,68.2 L54.7423078,39.4621057 C54.7423078,37.2523513 55.5736632,35.1234748 57.0711706,33.4985176 L76.4832996,12.4342613 C78.9534987,9.75382857 83.1289108,9.5834005 85.8093436,12.0535996 C87.1658473,13.303709 87.9372691,15.0644715 87.9366521,16.90916 Z" fill-rule="evenodd"></path><path d="M131.3,111.241199 L11.7,111.241199 C5.23826843,111.241199 0,116.479467 0,122.941199 L0,200.541199 C0,207.002931 5.23826843,212.241199 11.7,212.241199 L131.3,212.241199 C137.761732,212.241199 143,207.002931 143,200.541199 L143,122.941199 C143,116.479467 137.761732,111.241199 131.3,111.241199 Z M124,130.241 L124,193.241 L19,193.241 L19,130.241 L124,130.241 Z" fill-rule="nonzero"></path></g></g><path d="M51,218 L205,218 C211.075132,218 216,222.924868 216,229 C216,235.075132 211.075132,240 205,240 L51,240 C44.9248678,240 40,235.075132 40,229 C40,222.924868 44.9248678,218 51,218 Z" id="change-background-color-icon" style="fill:#FA541C"></path></g></g></svg>`

    },
    {
      id: "obsidian-editing-toolbar:fullscreen-focus",
      name: "Fullscreen focus mode",
      icon: "fullscreen"
    },
    {
      id: "obsidian-editing-toolbar:workplace-fullscreen-focus",
      name: "workplace-Fullscreen ",
      icon: "remix-SplitCellsHorizontal"
    },
  ],
  appendMethod: "workspace",
  shouldShowMenuOnSelect: false,
  cMenuVisibility: true,
  cMenuBottomValue: 4.25,
  cMenuNumRows: 12,
  cMenuWidth: 300,
  cMenuFontColor: "#2DC26B",
  cMenuBackgroundColor: "#d3f8b6"
};
