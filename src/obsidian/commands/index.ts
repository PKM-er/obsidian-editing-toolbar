import { Command } from "obsidian";
import type EditingToolbarPlugin from "../../main";
import changeFontColor from "./change-font-color";
import editorCopy from "./editor-copy";
import editorCut from "./editor-cut";
import editorPaste from "./editor-paste";
import formatEraser from "./format-eraser";
import fullscreenFocus from "./fullscreen-focus";
import headerOne from "./header-one";
import headerTwo from "./header-two";
import headerThree from "./header-three";
import headerFive from "./header-five";
import headerSix from "./header-six";
import hideOrShowMenu from "./hide-show-menu";
import offFormatBrush from "./off-format-brush";
import redoEditor from "./redo-editor";
import removeHeadingLevel from "./remove-heading-level";
import undoEditor from "./undo-editor";
import unIndentList from "./unindent-list";
import indentList from "./indent-list";
import workspaceFullscreenFocus from "./workspace-fullscreen-focus";
import headerFour from "./header-four";
import { registerModCommands } from "./mod-command";
import { RegisterTypographicalCommands } from "./typographical-commands";


export default async function registerEditingToolbarCommands(plugin: EditingToolbarPlugin) {
    const commands: Command[] = []
    commands.push(changeFontColor(plugin))
    commands.push(editorCopy(plugin))
    commands.push(editorCut(plugin))
    commands.push(editorPaste(plugin))
    commands.push(formatEraser(plugin))
    commands.push(fullscreenFocus(plugin))
    commands.push(headerOne(plugin))
    commands.push(headerTwo(plugin))
    commands.push(headerThree(plugin))
    commands.push(headerFour(plugin))
    commands.push(headerFive(plugin))
    commands.push(headerSix(plugin))
    commands.push(hideOrShowMenu(plugin))
    commands.push(offFormatBrush(plugin))
    commands.push(redoEditor(plugin))
    commands.push(undoEditor(plugin))
    commands.push(removeHeadingLevel(plugin))
    commands.push(indentList(plugin))
    commands.push(unIndentList(plugin))
    commands.push(workspaceFullscreenFocus(plugin))

    commands.forEach((command: Command) => {
        plugin.addCommand(command)
    })

    registerModCommands(plugin)
    RegisterTypographicalCommands(plugin)
}