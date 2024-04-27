// copy from https://github.com/Fevol/obsidian-typings/blob/main/obsidian-ex.d.ts

import { EditorSelection, EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { IpcRenderer } from "electron";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import {
	CachedMetadata,
	Command,
	Component,
	EditorPosition,
	EditorRange,
	EditorRangeOrCaret,
	EditorSuggest,
	Events,
	HoverPopover,
	KeymapInfo,
	Loc,
	MarkdownFileInfo,
	MarkdownSubView,
	MarkdownViewModeType,
	Plugin,
	Reference,
	SearchResult,
	SplitDirection,
	TFolder,
	ViewState,
} from "obsidian";
import * as path from "path";
export * from "obsidian";

declare module "@codemirror/view" {
	/** @todo Documentation incomplete */
	interface EditorView {
		cm?: VimEditor;
	}

	/** @todo Documentation incomplete */
	interface VimEditor {
		state: VimState;
	}

	/** @todo Documentation incomplete */
	interface VimState {
		vim: {
			inputState: {
				changeQueue: null;
				keyBuffer: [];
				motion: null;
				motionArgs: null;
				motionRepeat: [];
				operator: null;
				operatorArgs: null;
				prefixRepeat: [];
				registerName: null;
			};
			insertMode: false;
			insertModeRepeat: undefined;
			lastEditActionCommand: undefined;
			lastEditInputState: undefined;
			lastHPos: number;
			lastHSPos: number;
			lastMotion: {
				name?: string;
			};
			lastPastedText: null;
			lastSelection: null;
		};
		vimPlugin: {
			lastKeydown: string;
		};
	}
}

/**
 * @remark Interfaces that have not been fully typed yet are marked as `\@internal` with 'unknown'
 * @todo Add Canvas typings (work off base from Dev-Mike, attribute)
 */
declare module "obsidian" {
	/** @todo Documentation incomplete */
	type ConfigItem =
		| "accentColor"
		| "alwaysUpdateLinks"
		| "attachmentFolderPath"
		| "autoConvertHtml"
		| "autoPairBrackets"
		| "autoPairMarkdown"
		| "baseFontSize"
		| "baseFontSizeAction"
		| "cssTheme"
		| "defaultViewMode"
		| "emacsyKeys"
		| "enabledCssSnippets"
		| "fileSortOrder"
		| "focusNewTab"
		| "foldHeading"
		| "foldIndent"
		| "hotkeys"
		| "interfaceFontFamily"
		| "legacyEditor"
		| "livePreview"
		| "mobilePullAction"
		| "mobileQuickRibbonItem"
		| "mobileToolbarCommands"
		| "monospaceFontFamily"
		| "nativeMenus"
		| "newFileFolderPath"
		| "newFileLocation"
		| "newLinkFormat"
		| "pdfExportSettings"
		| "promptDelete"
		| "propertiesInDocument"
		| "readableLineLength"
		| "rightToLeft"
		| "showIndentGuide"
		| "showInlineTitle"
		| "showLineNumber"
		| "showUnsupportedFiles"
		| "showViewHeader"
		| "smartIndentList"
		| "spellcheck"
		| "spellcheckLanguages"
		| "strictLineBreaks"
		| "tabSize"
		| "textFontFamily"
		| "theme"
		| "translucency"
		| "trashOption"
		| "types"
		| "useMarkdownLinks"
		| "useTab"
		| "userIgnoreFilters"
		| "vimMode";

	/** @todo Documentation incomplete */
	type EmbedableConstructor = (context: EmbedContext, file: TFile, path?: string) => Component;

	/** @todo Documentation incomplete */
	type InternalPluginName =
		| "audio-recorder"
		| "backlink"
		| "bookmarks"
		| "canvas"
		| "command-palette"
		| "daily-notes"
		| "editor-status"
		| "file-explorer"
		| "file-recovery"
		| "global-search"
		| "graph"
		| "markdown-importer"
		| "note-composer"
		| "outgoing-link"
		| "outline"
		| "page-preview"
		| "properties"
		| "publish"
		| "random-note"
		| "slash-command"
		| "slides"
		| "starred"
		| "switcher"
		| "sync"
		| "tag-pane"
		| "templates"
		| "word-count"
		| "workspaces"
		| "zk-prefixer";

	/**
	 * @todo Documentation incomplete
	 */
	type PropertyWidgetType =
		| "aliases"
		| "checkbox"
		| "date"
		| "datetime"
		| "multitext"
		| "number"
		| "tags"
		| "text"
		| (string & any);

	/** @todo Documentation incomplete */
	type TreeItem<T> = TreeNode<T> & {
		collapseEl: HTMLElement;
		collapsed: boolean;
		collapsible: boolean;
		coverEl: HTMLElement;
		innerEl: HTMLElement;
		parent: TreeNode<T> | undefined;
		selfEl: HTMLElement;
		view: View;

		/**
		 * Execute collapse functionality on mouse click
		 */
		onCollapseClick(event: MouseEvent): void;
		/**
		 * Execute item functionality on clicking tree item
		 */
		onSelfClick(event: MouseEvent): void;
		/**
		 * Set clickable state of tree item
		 */
		setClickable(clickable: boolean): void;
		/**
		 * Set collapsed state of tree item
		 */
		setCollapsed(collapsed: boolean, check: boolean): Promise<undefined>;
		/**
		 * Set collapsible state of tree item
		 */
		setCollapsible(collapsible: boolean): void;
		/**
		 * Toggle collapsed state of tree item
		 */
		toggleCollapsed(check: boolean): Promise<undefined>;
		/**
		 * @internal Update the tree item's cover element
		 */
		updateCollapsed(check: boolean): Promise<undefined>;
	};

	/**
	 * @todo Documentation incomplete
	 */
	type TreeNode<T = object> = T & {
		childrenEl: HTMLElement;
		el: HTMLElement;
		info: {
			childLeft: number;
			childLeftPadding: number;
			childTop: number;
			computed: boolean;
			height: number;
			hidden: boolean;
			next: boolean;
			queued: boolean;
			width: number;
		};
		pusherEl: HTMLElement;
		vChildren: {
			_children: TreeNode<T>[];
			owner: TreeNode<T>;
		};
	};

	// Interfaces
	interface AbstractSearchComponent {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * The container element in which the search component exists (i.e. Editor)
		 */
		containerEl: HTMLElement;
		/**
		 * Container for the replacement input field
		 */
		replaceInputEl: HTMLInputElement;
		/**
		 * Keyscope for search component
		 */
		scope: Scope;
		/**
		 * Container for all the action buttons
		 */
		searchButtonContainerEl: HTMLElement;
		/**
		 * Container for the search component itself
		 */
		searchContainerEl: HTMLElement;
		/**
		 * Container for the search input field
		 */
		searchInputEl: HTMLInputElement;

		/**
		 * Returns the current search query
		 */
		getQuery(): string;
		/**
		 * Switch to the next inputElement
		 */
		goToNextInput(event: KeyboardEvent): unknown;
		/**
		 * Invokes findNextOrReplace
		 */
		onEnter(event: KeyboardEvent): unknown;
		/**
		 * Invokes findPrevious
		 */
		onShiftEnter(event: KeyboardEvent): unknown;
	}

	/** @todo Documentation incomplete */
	interface Account {
		/**
		 * The company associated with the activated commercial license
		 */
		company: string;
		/**
		 * The email address associated with the account
		 */
		email: string;
		expiry: number;
		key: string | undefined;
		keyValidation: string;
		/**
		 * The license available to the account
		 */
		license: "" | "insider";
		/**
		 * Profile name
		 */
		name: string;
		seats: number;
		token: string;
	}

	/** @todo Documentation incomplete */
	interface App {
		/**
		 * The account signed in to Obsidian
		 */
		account: Account;
		/**
		 * ID that uniquely identifies the vault
		 *
		 * @tutorial Used for implementing device *and* vault-specific data storage using LocalStorage or IndexedDB
		 */
		appId: string;
		/** @internal */
		appMenuBarManager: AppMenuBarManager;
		/**
		 * Contains all registered commands
		 *
		 * @tutorial Can be used to manually invoke the functionality of a specific command
		 */
		commands: Commands;
		/**
		 * Custom CSS (snippets/themes) applied to the application
		 *
		 * @tutorial Can be used to view which snippets are enabled or available, or inspect loaded-in theme manifests
		 */
		customCss: CustomCSS;
		/**
		 * References to important DOM elements of the application
		 */
		dom: ObsidianDOM;
		/** @internal */
		dragManager: DragManager;
		/**
		 * Registry that manages the creation of generic media type embeds
		 */
		embedRegistry: EmbedRegistry;
		/**
		 * Manage the creation, deletion and renaming of files from the UI.
		 *
		 * @remark Prefer using the `vault` API for programmatic file management
		 */
		fileManager: FileManager;
		/** @internal */
		foldManager: FoldManager;
		/**
		 * Manages global hotkeys
		 *
		 * @tutorial Can be used for manually invoking a command, or finding which hotkey is assigned to a specific key input
		 * @remark This should not be used for adding hotkeys to your custom commands, this can easily be done via the official API
		 */
		hotkeyManager: HotkeyManager;
		/**
		 * Manager of internal 'core' plugins
		 *
		 * @tutorial Can be used to check whether a specific internal plugin is enabled, or grab specific parts from its config for simplifying your own plugin's settings
		 */
		internalPlugins: InternalPlugins;
		/**
		 * Whether the application is currently running on mobile
		 *
		 * @remark Prefer usage of `Platform.isMobile`
		 * @remark Will be true if `app.emulateMobile()` was enabled
		 */
		isMobile: boolean;
		/** @internal */
		loadProgress: LoadProgress;
		/**
		 * Manages the gathering and updating of metadata for all files in the vault
		 *
		 * @tutorial Use for finding tags and backlinks for specific files, grabbing frontmatter properties, ...
		 */
		metadataCache: MetadataCache;
		/**
		 * Manages the frontmatter properties of the vault and the rendering of the properties
		 *
		 * @tutorial Fetching properties used in all frontmatter fields, may potentially be used for adding custom frontmatter widgets
		 */
		metadataTypeManager: MetadataTypeManager;
		/** @internal */
		mobileNavbar?: MobileNavbar;
		/** @internal */
		mobileToolbar?: MobileToolbar;
		/** @internal Events to execute on the next frame */
		nextFrameEvents: unknown[];
		/** @internal Timer for the next frame */
		nextFrameTimer: number;
		/**
		 * Manages loading and enabling of community (non-core) plugins
		 *
		 * @tutorial Can be used to communicate with other plugins, custom plugin management, ...
		 * @remark Be careful when overriding loading logic, as this may result in other plugins not loading
		 */
		plugins: Plugins;
		/** @internal Root keyscope of the application */
		scope: Scope;
		/**
		 * Manages the settings modal and its tabs
		 *
		 * @tutorial Can be used to open the settings modal to a specific tab, extend the settings modal functionality, ...
		 * @remark Do not use this to get settings values from other plugins, it is better to do this via `app.plugins.getPlugin(ID)?.settings` (check how the plugin stores its settings)
		 */
		setting: Setting;
		/** @internal */
		shareReceiver: { app: App };
		/** @internal Status bar of the application */
		statusBar: { app: App; containerEl: HTMLElement };
		/**
		 * Name of the vault with version suffix
		 *
		 * @remark Formatted as 'NAME - Obsidian vX.Y.Z'
		 */
		title: string;
		/**
		 * Manages all file operations for the vault, contains hooks for file changes, and an adapter for
		 * low-level file system operations
		 *
		 * @tutorial Used for creating your own files and folders, renaming, ...
		 * @tutorial Use `app.vault.adapter` for accessing files outside the vault (desktop-only)
		 * @remark Prefer using the regular `vault` whenever possible
		 */
		vault: Vault;
		/**
		 * Manages the construction of appropriate views when opening a file of a certain type
		 *
		 * @remark Prefer usage of view registration via the Plugin class
		 */
		viewRegistry: ViewRegistry;
		/**
		 * Manages the workspace layout, construction, rendering and manipulation of leaves
		 *
		 * @tutorial Used for accessing the active editor leaf, grabbing references to your views, ...
		 */
		workspace: Workspace;

		/**
		 * Sets the accent color of the application to the OS preference
		 */
		adaptToSystemTheme(): void;
		/**
		 * Sets the accent color of the application (light/dark mode)
		 */
		changeTheme(theme: "moonstone" | "obsidian"): void;
		/**
		 * Copies Obsidian URI of given file to clipboard
		 *
		 * @param file File to generate URI for
		 */
		copyObsidianUrl(file: TFile): void;
		/**
		 * Disables all CSS transitions in the vault (until manually re-enabled)
		 */
		disableCssTransition(): void;
		/**
		 * Restarts Obsidian and renders workspace in mobile mode
		 *
		 * @tutorial Very useful for testing the rendering of your plugin on mobile devices
		 */
		emulateMobile(emulate: boolean): void;
		/**
		 * Enables all CSS transitions in the vault
		 */
		enableCssTransition(): void;
		/**
		 * Manually fix all file links pointing towards image/audio/video resources in element
		 *
		 * @param element Element to fix links in
		 */
		fixFileLinks(element: HTMLElement): void;
		/**
		 * Applies an obfuscation font to all text characters in the vault
		 *
		 * @tutorial Useful for hiding sensitive information or sharing pretty screenshots of your vault
		 * @remark Uses the `Flow Circular` font
		 * @remark You will have to restart the app to get normal text back
		 */
		garbleText(): void;
		/**
		 * Get the accent color of the application
		 *
		 * @remark Often a better alternative than `app.vault.getConfig('accentColor')` as it returns an empty string if no accent color was set
		 */
		getAccentColor(): string;
		/**
		 * Get the current title of the application
		 *
		 * @remark The title is based on the currently active leaf
		 */
		getAppTitle(): string;
		/**
		 * Get the URI for opening specified file in Obsidian
		 */
		getObsidianUrl(file: TFile): string;
		/**
		 * Get currently active spellcheck languages
		 *
		 * @deprecated Originally spellcheck languages were stored in app settings, languages are now stored
		 *   in `localStorage.getItem(spellcheck-languages)`
		 */
		getSpellcheckLanguages(): string[];
		/**
		 * Get the current color scheme of the application
		 *
		 * @remark Identical to `app.vault.getConfig('theme')`
		 */
		getTheme(): "moonstone" | "obsidian";
		/**
		 * Import attachments into specified folder
		 */
		importAttachments(imports: ImportedAttachments[], folder: TFolder): Promise<void>;
		/** @internal Initialize the entire application using the provided FS adapter */
		initializeWithAdapter(adapter: DataAdapter): Promise<void>;
		/**
		 * Load a value from the localstorage given key
		 *
		 * @param key Key of value to load
		 * @remark This method is device *and* vault specific
		 * @tutorial Use load/saveLocalStorage for saving configuration data that needs to be unique to the current vault
		 */
		loadLocalStorage(key: string): any;
		/** @internal Add callback to execute on next frame */
		nextFrame(callback: () => void): void;
		/** @internal Add callback to execute on next frame, and remove after execution */
		nextFrameOnceCallback(callback: () => void): void;
		/** @internal Add callback to execute on next frame with promise */
		nextFramePromise(callback: () => Promise<void>): Promise<void>;
		/** @internal */
		onMouseEvent(evt: MouseEvent): void;
		/** @internal Execute all logged callback (called when next frame is loaded) */
		onNextFrame(callback: () => void): void;
		/**
		 * Open the help vault (or site if mobile)
		 */
		openHelp(): void;
		/**
		 * Open the vault picker
		 */
		openVaultChooser(): void;
		/**
		 * Open the file with OS defined default file browser application
		 */
		openWithDefaultApp(path: string): void;
		/** @internal Register all basic application commands */
		registerCommands(): void;
		/** @internal Register a hook for saving workspace data before unload */
		registerQuitHook(): void;
		/** @internal Save attachment at default attachments location */
		saveAttachment(path: string, extension: string, data: ArrayBuffer): Promise<void>;
		/**
		 * Save a value to the localstorage given key
		 *
		 * @param key Key of value to save
		 * @param value Value to save
		 * @remark This method is device *and* vault specific
		 * @tutorial Use load/saveLocalStorage for saving configuration data that needs to be unique to the current vault
		 */
		saveLocalStorage(key: string, value: unknown): void;
		/**
		 * Set the accent color of the application
		 *
		 * @remark Also updates the CSS `--accent` variables
		 */
		setAccentColor(color: string): void;
		/**
		 * Set the path where attachments should be stored
		 */
		setAttachmentFolder(path: string): void;
		/**
		 * Set the spellcheck languages
		 */
		setSpellcheckLanguages(languages: string[]): void;
		/**
		 * Set the current color scheme of the application and reload the CSS
		 */
		setTheme(theme: "moonstone" | "obsidian"): void;
		/**
		 * Open the OS file picker at path location
		 */
		showInFolder(path: string): void;
		/**
		 * Show the release notes for provided version as a new leaf
		 *
		 * @param version Version to show release notes for (defaults to current version)
		 */
		showReleaseNotes(version?: string): void;
		/**
		 * Updates the accent color and reloads the CSS
		 */
		updateAccentColor(): void;
		/**
		 * Update the font family of the application and reloads the CSS
		 */
		updateFontFamily(): void;
		/**
		 * Update the font size of the application and reloads the CSS
		 */
		updateFontSize(): void;
		/**
		 * Update the inline title rendering in notes
		 */
		updateInlineTitleDisplay(): void;
		/**
		 * Update the color scheme of the application and reloads the CSS
		 */
		updateTheme(): void;
		/**
		 * Update the view header display in notes
		 */
		updateViewHeaderDisplay(): void;
	}

	/** @todo Documentation incomplete */
	interface AppMenuBarManager {
	}

	interface AppVaultConfig {
		/**
		 * Appearance > Accent color
		 */
		accentColor: "" | string;
		/**
		 * Files & Links > Automatically update internal links
		 */
		alwaysUpdateLinks?: false | boolean;
		/**
		 * Files & Links > Attachment folder path
		 */
		attachmentFolderPath?: "/" | string;
		/**
		 * Editor > Auto convert HTML
		 */
		autoConvertHtml?: true | boolean;
		/**
		 * Editor > Auto pair brackets
		 */
		autoPairBrackets?: true | boolean;
		/**
		 * Editor > Auto pair Markdown syntax
		 */
		autoPairMarkdown?: true | boolean;
		/**
		 * Appearance > Font size
		 */
		baseFontSize?: 16 | number;
		/**
		 * Appearance > Quick font size adjustment
		 */
		baseFontSizeAction?: true | boolean;
		/**
		 * Community Plugins > Browse > Sort order
		 */
		communityPluginSortOrder: "download" | "update" | "release" | "alphabetical";
		/**
		 * Themes > Browse > Sort order
		 */
		communityThemeSortOrder: "download" | "update" | "release" | "alphabetical";
		/**
		 * Appearance > Theme
		 *
		 * @remark is the default Obsidian theme
		 */
		cssTheme?: "" | string;
		/**
		 * Editor > Default view for new tabs
		 */
		defaultViewMode?: "source" | "preview";
		emacsyKeys?: true | boolean;
		/**
		 * Appearance > CSS snippets
		 */
		enabledCssSnippets?: string[];
		fileSortOrder?: "alphabetical";
		/**
		 * Editor > Always focus new tabs
		 */
		focusNewTab?: true | boolean;
		/**
		 * Editor > Fold heading
		 */
		foldHeading?: true | boolean;
		/**
		 * Editor > Fold indent
		 */
		foldIndent?: true | boolean;
		/**
		 * Hotkeys
		 *
		 * @deprecated Likely not used anymore
		 */
		hotkeys?: Record<string, string>;
		/**
		 * Appearance > Interface font
		 */
		interfaceFontFamily?: "" | string;
		/**
		 * Editor > Use legacy editor
		 */
		legacyEditor?: false | boolean;
		livePreview?: true | boolean;
		/**
		 * Mobile > Configure mobile Quick Action
		 */
		mobilePullAction?: "command-palette:open" | string;
		mobileQuickRibbonItem?: "" | string;
		/**
		 * Mobile > Manage toolbar options
		 */
		mobileToolbarCommands?: string[];
		monospaceFontFamily?: "" | string;
		/**
		 * Appearance > Native menus
		 */
		nativeMenus?: null | boolean;
		/**
		 * Files & Links > Default location for new notes | 'folder' > Folder to create new notes in
		 */
		newFileFolderPath?: "/" | string;
		/**
		 * Files & Links > Default location for new notes
		 */
		newFileLocation?: "root" | "current" | "folder";
		/**
		 * Files & Links > New link format
		 */
		newLinkFormat?: "shortest" | "relative" | "absolute";
		/**
		 * Saved on executing 'Export to PDF' command
		 */
		pdfExportSettings?: {
			pageSize: "letter" | string;
			landscape: false | boolean;
			margin: "0" | string;
			downscalePercent: 100 | number;
		};
		/**
		 * Files & Links > Confirm line deletion
		 */
		promptDelete?: true | boolean;
		/**
		 * Editor > Properties in document
		 */
		propertiesInDocument?: "visible" | "hidden" | "source";
		/**
		 * Editor > Readable line length
		 */
		readableLineLength?: true | boolean;
		/**
		 * Editor > Right-to-left (RTL)
		 */
		rightToLeft?: false | boolean;
		/** @deprecated Removed as of version 1.4.3 */
		showFrontmatter?: false | boolean;
		/**
		 * Editor > Show indentation guides
		 */
		showIndentGuide?: true | boolean;
		/**
		 * Editor > Show inline title
		 */
		showInlineTitle?: true | boolean;
		/**
		 * Editor > Show line numbers
		 */
		showLineNumber?: false | boolean;
		/**
		 * Files & Links > Detect all file extensions
		 */
		showUnsupportedFiles?: false | boolean;
		/**
		 * Appearance > Show tab title bar
		 */
		showViewHeader?: false | boolean;
		/**
		 * Editor > Smart indent lists
		 */
		smartIndentList?: true | boolean;
		/**
		 * Editor > Spellcheck
		 */
		spellcheck?: false | boolean;
		/** @deprecated */
		spellcheckDictionary?: [] | string[];
		/**
		 * Editor > Spellcheck languages
		 */
		spellcheckLanguages?: null | string[];
		/**
		 * Editor > Strict line breaks
		 */
		strictLineBreaks?: false | boolean;
		/**
		 * Editor > Tab indent size
		 */
		tabSize?: 4 | number;
		/**
		 * Appearance > Text font
		 */
		textFontFamily?: "" | string;
		/**
		 * Appearance > Base color scheme
		 *
		 * @remark Not be confused with cssTheme, this setting is for the light/dark mode
		 * @remark moonstone is light theme, "obsidian" is dark theme
		 */
		theme?: "moonstone" | "obsidian";
		/**
		 * Appearance > Translucent window
		 */
		translucency?: false | boolean;
		/**
		 * Files & Links > Deleted files
		 */
		trashOption?: "system" | "local" | "none";
		/** @deprecated Probably left-over code from old properties type storage */
		types: object;
		/**
		 * Files & Links > Use [[Wikilinks]]
		 */
		useMarkdownLinks?: false | boolean;
		/**
		 * Files & Links > Excluded files
		 */
		userIgnoreFilters?: null | string[];
		/**
		 * Editor > Indent using tabs
		 */
		useTab?: true | boolean;
		/**
		 * Editor > Vim key bindings
		 */
		vimMode?: false | boolean;
	}

	/** @todo Documentation incomplete */
	interface BlockCache {
		/**
		 * Reference to App
		 */
		app: App;
		/** @internal */
		cache: unknown;
	}

	interface CanvasConnection {}

	interface CanvasLeaf extends WorkspaceLeaf {}

	interface CanvasNode {}

	interface CanvasPlugin extends InternalPlugin {}

	interface CanvasView {}

	interface ClipBoardManager {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Reference to the Editor View
		 */
		info: MarkdownView;

		/**
		 * Get current path of editor view for determining storage location embed
		 */
		getPath(): string;
		/**
		 * Process incoming data (image, text, url, html)
		 *
		 * @remark When processing HTML, function will be async
		 */
		handleDataTransfer(data: DataTransfer): null | Promise<void>;
		/**
		 * Handle an incoming drag-over event
		 */
		handleDragOver(event: DragEvent): void;
		/**
		 * Handle an incoming drag-drop event
		 */
		handleDrop(event: DragEvent): boolean;
		/**
		 * Process a drop event into the editor
		 */
		handleDropIntoEditor(event: DragEvent): null | string;
		/**
		 * Handle an incoming paste event
		 */
		handlePaste(event: ClipboardEvent): boolean;
		/**
		 * Insert single file as embed into the editor
		 */
		insertAttachmentEmbed(file: TAbstractFile, replace: boolean): Promise<void>;
		/**
		 * Insert files from drop-event into the editor
		 */
		insertFiles(files: ImportedAttachments[]): Promise<void>;
		/**
		 * Save an attachment of specified name and extension to the vault
		 *
		 * @remark Invokes insertAttachmentEmbed
		 */
		saveAttachment(name: string, extension: string, data: ArrayBuffer, replace: boolean): Promise<void>;
	}

	interface Commands {
		/**
		 * Reference to App
		 */
		app: App;
		/**
		 * Commands *without* editor callback, will always be available in the command palette
		 *
		 * @example
		 *     `app:open-vault` or `app:reload`
		 */
		commands: Record<string, Command>;
		/**
		 * Commands *with* editor callback, will only be available when editor is active and callback returns
		 * true
		 *
		 * @example
		 *     `editor:fold-all` or `command-palette:open`
		 */
		editorCommands: Record<string, Command>;

		/**
		 * Add a command to the command registry
		 *
		 * @param command Command to add
		 */
		addCommand(command: Command): void;
		/**
		 * Execute a command by reference
		 *
		 * @param command Command to execute
		 */
		executeCommand(command: Command): boolean;
		/**
		 * Execute a command by ID
		 *
		 * @param commandId ID of command to execute
		 */
		executeCommandById(commandId: string): boolean;
		/**
		 * Find a command by ID
		 *
		 * @param commandId
		 */
		findCommand(commandId: string): Command | undefined;
		/**
		 * Lists **all** commands, both with and without editor callback
		 */
		listCommands(): Command[];
		/**
		 * Remove a command from the command registry
		 *
		 * @param commandId Command to remove
		 */
		removeCommand(commandId: string): void;
	}

	interface Component {
		/**
		 * Child Components attached to current component, will be unloaded on unloading parent component
		 */
		_children: Component[];
		/**
		 * Events that are attached to the current component, will be detached on unloading parent component
		 */
		_events: EventRef[];
		/**
		 * Whether the component and its children are loaded
		 */
		_loaded: boolean;
	}

	/** @todo Documentation incomplete */
	interface CustomArrayDict<T> {
		data: Record<string, T[]>;

		add(key: string, value: T): void;
		clear(key: string): void;
		clearAll(): void;
		contains(key: string, value: T): boolean;
		count(): number;
		get(key: string): T[] | null;
		keys(): string[];
		remove(key: string, value: T): void;
		removeKey(key: string): void;
	}

	/** @todo Documentation incomplete */
	interface CustomCSS extends Component {
		/**
		 * Reference to App
		 */
		app: App;
		/** @internal Cache of CSS snippet filepath (relative to vault root) to CSS snippet contents */
		csscache: Map<string, string>;
		/**
		 * Set of enabled snippet, given by filenames
		 */
		enabledSnippets: Set<string>;
		/**
		 * @internal
		 * Contains references to Style elements containing custom CSS snippets
		 */
		extraStyleEls: HTMLStyleElement[];
		/**
		 * List of theme names not fully updated to post v1.0.0 theme guidelines
		 */
		oldThemes: string[];
		/** @internal */
		queue: WeakMap<object, unknown>;
		/**
		 * List of snippets detected by Obsidian, given by their filenames
		 */
		snippets: string[];
		/**
		 * Currently active theme, given by its name
		 *
		 * @remark is the default Obsidian theme
		 */
		theme: "" | string;
		/**
		 * Mapping of theme names to their manifest
		 */
		themes: Record<string, ThemeManifest>;
		/** @internal */
		updates: Record<string, unknown>;

		/** @internal */
		boundRaw(): void;
		/**
		 * Check whether a specific theme can be updated
		 *
		 * @param themeName - Name of the theme to check
		 */
		checkForUpdate(themeName: string): void;
		/**
		 * Check all themes for updates
		 */
		checkForUpdates(): void;
		/**
		 * Disable translucency of application background
		 */
		disableTranslucency(): void;
		/**
		 * Fetch legacy theme CSS using the pre-v1.0.0 theme download pipeline
		 *
		 * @returns String obsidian.css contents
		 */
		downloadLegacyTheme(arg: { repo: string }): Promise<string>;
		/**
		 * Enable translucency of application background
		 */
		enableTranslucency(): void;
		/**
		 * Fetch a theme's manifest using repository URL
		 *
		 * @remark Do **not** include github prefix, only `username/repo`
		 */
		getManifest(repoUrl: string): Promise<ThemeManifest>;
		/**
		 * Convert snippet name to its corresponding filepath (relative to vault root)
		 *
		 * @returns String `.obsidian/snippets/${snippetName}.css`
		 */
		getSnippetPath(snippetName: string): string;
		/**
		 * Returns the folder path where snippets are stored (relative to vault root)
		 */
		getSnippetsFolder(): string;
		/**
		 * Convert theme name to its corresponding filepath (relative to vault root)
		 *
		 * @returns String `.obsidian/themes/${themeName}/theme.css`
		 */
		getThemePath(themeName: string): string;
		/**
		 * Returns the folder path where themes are stored (relative to vault root)
		 */
		getThemesFolder(): string;
		/**
		 * Returns whether there are themes that can be updated
		 */
		hasUpdates(): boolean;
		/**
		 * Install a legacy theme using the pre-v1.0.0 theme download pipeline<br> Will create a corresponding
		 * dummy manifest for the theme
		 *
		 * @remark Name will be used as the folder name for the theme
		 */
		installLegacyTheme(arg: { name: string; repo: string; author: string }): Promise<void>;
		/**
		 * Install a theme using the regular theme download pipeline
		 */
		installTheme(arg: { name: string; repo: string; author: string }, version: string): Promise<void>;
		/**
		 * Check whether a specific theme is installed by theme name
		 */
		isThemeInstalled(themeName: string): boolean;
		/** @internal */
		onload(): void;
		/** @internal */
		onRaw(e: unknown): void;
		/** @internal */
		readSnippets(): void;
		/** @internal */
		readThemes(): void;
		/**
		 * Remove a theme by theme name
		 */
		removeTheme(themeName: string): Promise<void>;
		/** @internal */
		requestLoadSnippets(): void;
		/** @internal */
		requestLoadTheme(): void;
		/** @internal */
		requestReadThemes(): void;
		/**
		 * Set the activation status of a snippet by snippet name
		 */
		setCssEnabledStatus(snippetName: string, enabled: boolean): void;
		/**
		 * Set the active theme by theme name
		 */
		setTheme(themeName: string): void;
		/**
		 * Set the translucency of application background
		 */
		setTranslucency(translucency: boolean): void;
	}

	/** @todo Documentation incomplete */
	interface DataAdapter {
		/**
		 * Base OS path for the vault (e.g. /home/user/vault, or C:\Users\user\documents\vault)
		 */
		basePath: string;
		/** @internal */
		btime: { btime(path: string, btime: number): void };
		/**
		 * Mapping of file/folder path to vault entry, includes non-MD files
		 */
		files: Record<string, FileEntry>;
		/**
		 * Reference to node fs module
		 */
		fs?: typeof fs;
		/**
		 * Reference to node fs:promises module
		 */
		fsPromises?: typeof fsPromises;
		/** @internal */
		insensitive: boolean;
		/**
		 * Reference to electron ipcRenderer module
		 */
		ipcRenderer?: IpcRenderer;
		/**
		 * Reference to node path module
		 */
		path: typeof path;
		/** @internal */
		promise: Promise<unknown>;
		/**
		 * Reference to node URL module
		 */
		url: URL;
		/** @internal */
		watcher: unknown;
		/** @internal */
		watchers: Record<string, { resolvedPath: string; watcher: unknown }>;

		/**
		 * @param normalizedPath Path to file
		 * @param options Data write options
		 * @internal Apply data write options to file
		 */
		applyWriteOptions(normalizedPath: string, options: DataWriteOptions): Promise<void>;
		/**
		 * Get base path of vault (OS path)
		 */
		getBasePath(): string;
		/**
		 * Get full path of file (OS path)
		 *
		 * @param normalizedPath Path to file
		 * @returns URL path to file
		 */
		getFilePath(normalizedPath: string): string;
		/**
		 * Get full path of file (OS path)
		 *
		 * @param normalizedPath Path to file
		 * @returns String full path to file
		 */
		getFullPath(normalizedPath: string): string;
		/**
		 * Get full path of file (OS path)
		 *
		 * @param normalizedPath Path to file
		 * @returns String full path to file
		 */
		getFullRealPath(normalizedPath: string): string;
		/**
		 * @param normalizedPath Path to file
		 * @returns String URL of form: app://FILEHASH/path/to/file
		 * @internal Get resource path of file (URL path)
		 */
		getResourcePath(normalizedPath: string): string;
		/** @internal Handles vault events */
		handler(): void;
		/** @internal Kill file system action due to timeout */
		kill(): void;
		/** @internal */
		killLastAction(): void;
		/** @internal Generates `this.files` from the file system */
		listAll(): Promise<void>;
		/** @internal Generates `this.files` for specific directory of the vault */
		listRecursive(normalizedPath: string): Promise<void>;
		/**
		 * @param normalizedPath Path to directory
		 * @internal Helper function for `listRecursive` reads children of directory
		 */
		listRecursiveChild(normalizedPath: string): Promise<void>;
		/** @internal */
		onFileChange(normalizedPath: string): void;
		/** @internal */
		queue(cb: unknown): Promise<void>;
		/** @internal */
		reconcileDeletion(normalizedPath: string, normalizedNewPath: string, option: boolean): Promise<void>;
		/** @internal */
		reconcileFile(normalizedPath: string, normalizedNewPath: string, option: boolean): Promise<void>;
		/** @internal */
		reconcileFileCreation(normalizedPath: string, normalizedNewPath: string, option: boolean): Promise<void>;
		/** @internal */
		reconcileFileInternal(normalizedPath: string, normalizedNewPath: string): Promise<void>;
		/** @internal */
		reconcileFolderCreation(normalizedPath: string, normalizedNewPath: string): Promise<void>;
		/** @internal */
		reconcileInternalFile(normalizedPath: string): Promise<void>;
		/** @internal */
		reconcileSymbolicLinkCreation(normalizedPath: string, normalizedNewPath: string): Promise<void>;
		/** @internal Remove file from files listing and trigger deletion event */
		removeFile(normalizedPath: string): void;
		/** @internal */
		startWatchpath(normalizedPath: string): Promise<void>;
		/** @internal Remove all listeners */
		stopWatch(): void;
		/** @internal Remove listener on specific path */
		stopWatchPath(normalizedPath: string): void;
		/** @internal Set whether OS is insensitive to case */
		testInsensitive(): void;
		/** @internal */
		thingsHappening(): void;
		/** @internal */
		update(normalizedPath: string): unknown;
		/** @internal Add change watcher to path */
		watch(normalizedPath: string): Promise<void>;
		/** @internal Watch recursively for changes */
		watchHiddenRecursive(normalizedPath: string): Promise<void>;
	}

	/** @todo Documentation incomplete */
	interface DragManager {
	}

	/** @todo Documentation incomplete */
	interface EditableFileView {
		/**
		 * The file that is currently being renamed
		 */
		fileBeingRenamed: null | TFile;
	}

	interface Editor {
		/**
		 * CodeMirror editor instance
		 */
		cm: EditorView;
		/**
		 * HTML instance the CM editor is attached to
		 */
		containerEl: HTMLElement;

		/**
		 * Clean-up function executed after indenting lists
		 */
		afterIndent(): void;
		/**
		 * Expand text
		 *
		 * @internal
		 */
		expandText(): void;
		/**
		 * Indents a list by one level
		 */
		indentList(): void;
		/**
		 * Insert a template callout at the current cursor position
		 */
		insertCallout(): void;
		/**
		 * Insert a template code block at the current cursor position
		 */
		insertCodeblock(): void;
		/**
		 * Insert a markdown link at the current cursor position
		 */
		insertLink(): void;
		/**
		 * Insert a mathjax equation block at the current cursor position
		 */
		insertMathJax(): void;
		/**
		 * Insert specified text at the current cursor position
		 *
		 * @remark Might be broken, inserts at the end of the document
		 */
		insertText(text: string): void;
		/**
		 * Inserts a new line and continues a markdown bullet point list at the same level
		 */
		newlineAndIndentContinueMarkdownList(): void;
		/**
		 * Inserts a new line at the same indent level
		 */
		newlineAndIndentOnly(): void;
		/**
		 * Get the character position at a mouse event
		 */
		posAtMouse(e: MouseEvent): EditorPosition;
		/**
		 * Toggles blockquote syntax on paragraph under cursor
		 */
		toggleBlockquote(): void;
		/**
		 * Toggle bullet point list syntax on paragraph under cursor
		 */
		toggleBulletList(): void;
		/**
		 * Toggle checkbox syntax on paragraph under cursor
		 */
		toggleCheckList(): void;
		/**
		 * Toggle numbered list syntax on paragraph under cursor
		 */
		toggleNumberList(): void;
		/**
		 * Convert word under cursor into a wikilink
		 *
		 * @param embed Whether to embed the link or not
		 */
		triggerWikiLink(embed: boolean): void;
		/**
		 * Unindents a list by one level
		 */
		unindentList(): void;
	}

	interface EditorSearchComponent extends AbstractSearchComponent {
		/**
		 * Search cursor for editor, handles search and replace functionality for editor
		 */
		cursor: null | SearchCursor;
		/**
		 * Linked editor for search component
		 */
		editor: ExtendedEditor;
		/**
		 * Whether search component is currently rendering
		 */
		isActive: boolean;
		/**
		 * Whether search component is replacing text (includes "Replace" input field)
		 */
		isReplace: boolean;

		/**
		 * Remove all highlights from editor
		 */
		clear(): void;
		/**
		 * Find next search results from cursor and highlights it
		 */
		findNext(): void;
		/**
		 * Replace cursor with replacement string if not null and moves to next search result
		 */
		findNextOrReplace(): void;
		/**
		 * Find previous search results from cursor and highlights it
		 */
		findPrevious(): void;
		/**
		 * Hide/detaches the search component and removes cursor highlights
		 */
		hide(): void;
		/**
		 * Add highlights for specified ranges
		 *
		 * @remark Invokes editor.addHighlights
		 */
		highlight(ranges: EditorRange[]): void;
		/**
		 * Highlights all matches if search element focused
		 */
		onAltEnter(e?: KeyboardEvent): void;
		/**
		 * Replace all search results with specified text if replace mode and replacement element is focused
		 */
		onModAltEnter(e?: KeyboardEvent): void;
		/**
		 * Updates search cursor on new input query and highlights search results
		 */
		onSearchInput(): void;
		/**
		 * Replaces all search results with replacement query
		 */
		replaceAll(): void;
		/**
		 * Replace current search result, if any, with replacement query
		 */
		replaceCurrentMatch(): void;
		/**
		 * Find all matches of search query and highlights them
		 */
		searchAll(): void;
		/**
		 * Reveal the search (and replace) component
		 */
		show(replace: boolean): void;
	}

	/** @todo Documentation incomplete */
	interface EditorSuggest<T> {
		showSuggestions(results: SearchResult[]): void;
	}

	interface EditorSuggests {
		/**
		 * Currently active and rendered editor suggestion popup
		 */
		currentSuggest: null | EditorSuggest<any>;
		/**
		 * Registered editor suggestions
		 *
		 * @remark Used for providing autocompletions for specific strings
		 * @tutorial Reference official documentation under EditorSuggest<T> for usage
		 */
		suggests: EditorSuggest<any>[];

		/**
		 * Add a new editor suggestion to the list of registered suggestion providers
		 */
		addSuggest(suggest: EditorSuggest<any>): void;
		/**
		 * Close the currently active editor suggestion popup
		 */
		close(): void;
		/**
		 * Whether there is a editor suggestion popup active and visible
		 */
		isShowingSuggestion(): boolean;
		/**
		 * Remove a registered editor suggestion from the list of registered suggestion providers
		 */
		removeSuggest(suggest: EditorSuggest<any>): void;
		/**
		 * Update position of currently active and rendered editor suggestion popup
		 */
		reposition(): void;
		/**
		 * Set the currently active editor suggestion popup to specified suggestor
		 */
		setCurrentSuggest(suggest: EditorSuggest<any>): void;
		/**
		 * Run check on focused editor to see whether a suggestion should be triggered and rendered
		 */
		trigger(editor: MarkdownBaseView, t: TFile, n: boolean): void;
	}

	interface EmbedContext {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Element where the embed should be displayed
		 */
		containerEl: HTMLElement;
		/**
		 * Depth of the embed within its container (how many levels of embeds are above it)
		 */
		depth?: number;
		/**
		 * Whether the embed should be dynamic (CM) or static (postProcessed)
		 */
		displayMode?: boolean;
		/**
		 * Text that should be displayed in the embed
		 */
		linktext?: string;
		/**
		 * Whether the embed should be an inline embed
		 */
		showInline?: boolean;
		/**
		 * Optional path to the current open file
		 */
		sourcePath?: string;
		/** @internal */
		state?: unknown;
	}

	class EmbeddedEditorView extends Component {
		constructor(app: App, containerEl: HTMLElement, file: TFile | null, state: EditorState);
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Container element for the embedded view
		 */
		containerEl: HTMLElement;
		/**
		 * Whether the view is currently saving
		 */
		dirty: boolean;
		/**
		 * Whether the editor may be edited
		 *
		 * @remark Fun fact, setting this to true and calling showEditor() for embedded MD views, allows them to be edited.
		 *          Though the experience is a little buggy
		 */
		editable: boolean;
		/**
		 * Editor component of the view
		 */
		editMode?: IFramedMarkdownEditor | undefined;
		/**
		 * Container in which the editor is embedded
		 */
		editorEl: HTMLElement;
		/**
		 * File to which the view is attached
		 */
		file: null | TFile;
		/**
		 * Hover element container
		 */
		hoverPopover: null | HoverPopover;
		/**
		 * Element containing the preview for the embedded markdown
		 */
		previewEl: HTMLElement;
		/**
		 * Preview component of the view
		 */
		previewMode: MarkdownPreviewView;
		/**
		 * Current state of the editor
		 */
		state: {} | EditorState | unknown;
		/**
		 * Text contents being embedded
		 */
		text: string;
		/**
		 * Whether the view renders contents using an iFrame
		 */
		useIframe: boolean;

		/**
		 * Get the preview editor, if exists
		 */
		get editor(): IFramedMarkdownEditor | null;
		/**
		 * Get the path to the file, if any file registered
		 */
		get path(): string;
		/**
		 * Get the scroll of the file renderer component
		 */
		get scroll(): unknown;

		/**
		 * Destroy edit component editor and save contents if specified
		 */
		destroyEditor(save?: boolean): void;
		/**
		 * Gets currently active mode (editMode returns 'source')
		 */
		getMode(): "source" | "preview";
		/**
		 * On load of editor, show preview
		 */
		onload(): void;
		/**
		 * Trigger markdown scroll on workspace
		 */
		onMarkdownScroll(): void;
		/**
		 * On unload of editor, destroy editor and unset workspace activeEditor
		 */
		onunload(): void;
		/**
		 * Debounced save of contents
		 */
		requestSave(): void;
		/**
		 * Debounced save of editor folds
		 */
		requestSaveFolds(): void;
		/**
		 * Set file contents
		 */
		save(data: string, save?: boolean): void;
		/**
		 * Set the state of the editor
		 */
		set(data: string, clear: boolean): void;
		/**
		 * Reveal the editor if editable widget and applies saved state
		 */
		showEditor(): void;
		/**
		 * Reveal preview mode and destroy editor, save if specified
		 */
		showPreview(save?: boolean): void;
		/**
		 * Reveal search component in file renderer component
		 */
		showSearch(replace?: boolean): void;
		/**
		 * Toggle between edit and preview mode
		 */
		toggleMode(): void;
	}

	interface EmbedRegistry extends Events {
		/**
		 * Mapping of file extensions to constructors for embeddable widgets
		 */
		embedByExtension: Record<string, EmbedableConstructor>;

		/**
		 * Get the embed constructor for a specific file type
		 */
		getEmbedCreator(file: TFile): EmbedableConstructor | null;
		/**
		 * Check whether a file extension has a registered embed constructor
		 */
		isExtensionRegistered(extension: string): boolean;
		/**
		 * Register an embed constructor for a specific file extension
		 */
		registerExtension(extension: string, embedCreator: EmbedableConstructor): void;
		/**
		 * Register an embed constructor for a list of file extensions
		 */
		registerExtensions(extensions: string[], embedCreator: EmbedableConstructor): void;
		/**
		 * Unregister an embed constructor for a specific file extension
		 */
		unregisterExtension(extension: string): void;
		/**
		 * Unregister an embed constructor for a list of file extensions
		 */
		unregisterExtensions(extensions: string[]): void;
	}

	interface EventRef {
		/**
		 * Context applied to the event callback
		 */
		ctx?: unknown;
		/**
		 * Events object the event was registered on
		 */
		e: Events;
		/**
		 * Event name the event was registered on
		 */
		name: string;

		/**
		 * Function to be called on event trigger on the events object
		 */
		fn(...arg: unknown[]): void;
	}

	interface ExtendedEditor extends Editor {
		/**
		 * Linked Editor manager instance
		 */
		editorComponent: undefined | MarkdownScrollableEditView;
		/**
		 * Currently active CM instance
		 *
		 * @remark Can be null when Editor is not instantiated
		 */
		get activeCm(): EditorView | null;
		/**
		 * Whether the editor is embedded in a table cell
		 */
		get inTableCell(): boolean;

		/**
		 * Make ranges of text highlighted within the editor given specified class (style)
		 */
		addHighlights(
			ranges: EditorRange[],
			style: "is-flashing" | "obsidian-search-match-highlight",
			remove_previous: boolean,
			range?: EditorSelection,
		): void;
		/**
		 * Convert editor position to screen position
		 *
		 * @param pos Editor position
		 * @param relative_to_editor Relative to the editor or the application window
		 */
		coordsAtPos(
			pos: EditorPosition,
			relative_to_editor: boolean,
		): { left: number; top: number; bottom: number; right: number };
		/**
		 * Unfolds all folded lines one level up
		 *
		 * @remark If level 1 and 2 headings are folded, level 2 headings will be unfolded
		 */
		foldLess(): void;
		/**
		 * Folds all the blocks that are of the lowest unfolded level
		 *
		 * @remark If there is a document with level 1 and 2 headings, level 2 headings will be folded
		 */
		foldMore(): void;
		/**
		 * Get all ranges that can be folded away in the editor
		 */
		getAllFoldableLines(): { from: number; to: number }[];
		/**
		 * Get a clickable link - if it exists - at specified position
		 */
		getClickableTokenAt(pos: EditorPosition): {
			start: EditorPosition;
			end: EditorPosition;
			text: string;
			type: string;
		} | null;
		/**
		 * Get all blocks that were folded by their starting character position
		 */
		getFoldOffsets(): Set<number>;
		/**
		 * Checks whether the editor has a highlight of specified class
		 *
		 * @remark If no style is specified, checks whether the editor has unknown highlights
		 */
		hasHighlight(style?: string): boolean;
		/**
		 * Wraps current line around specified characters
		 *
		 * @remark Was added in a recent Obsidian update (1.4.0 update cycle)
		 */
		insertBlock(start: string, end: string): void;
		/**
		 * Get the closest character position to the specified coordinates
		 */
		posAtCoords(coords: { left: number; top: number }): EditorPosition;
		/**
		 * Removes all highlights of specified class
		 */
		removeHighlights(style: string): void;
		/**
		 * Adds a search cursor to the editor
		 */
		searchCursor(searchString: string): SearchCursor;
		/**
		 * Applies specified markdown syntax to selected text or word under cursor
		 */
		toggleMarkdownFormatting(
			syntax: "bold" | "italic" | "strikethrough" | "highlight" | "code" | "math" | "comment",
		): void;
	}

	interface FileCacheEntry {
		/**
		 * Hash of file contents
		 */
		hash: string;
		/**
		 * Last modified time of file
		 */
		mtime: number;
		/**
		 * Size of file in bytes
		 */
		size: number;
	}

	interface FileEntry {
		/**
		 * Creation time (if file)
		 */
		ctime?: number;
		/**
		 * Modification time (if file)
		 */
		mtime?: number;
		/**
		 * Full path to file or folder
		 *
		 * @remark Might be used for resolving symlinks
		 */
		realpath: string;
		/**
		 * Size in bytes (if file)
		 */
		size?: number;
		/**
		 * Type of entry
		 */
		type: "file" | "folder";
	}

	/** @todo Documentation incomplete */
	interface FileExplorerLeaf extends WorkspaceLeaf {
		view: FileExplorerView;
	}

	/** @todo Documentation incomplete */
	interface FileExplorerPlugin extends InternalPlugin {
		/**
		 * Reveals a file or folder in the file explorer view, opens the view if it is not already
		 * open/visible
		 */
		revealInFolder(item: TFile | TFolder): void;
	}

	/** @todo Documentation incomplete */
	interface FileExplorerView extends View {
		/**
		 * Mapping of file path to tree item
		 */
		fileItems: Record<string, TreeItem<FileTreeItem>>;
		/**
		 * Mapping of tree self element to abstract file
		 */
		files: WeakMapWrapper<HTMLElement, TAbstractFile>;
		/**
		 * Tree view of files
		 */
		tree: Tree<FileTreeItem>;

		openFileContextMenu(event: Event, fileItemElement: HTMLElement): void;
		/**
		 * Reveal a file or folder in the file tree
		 */
		revealInFolder(file: TFile | TFolder): void;
	}

	interface FileManager {
		/**
		 * Reference to App
		 */
		app: App;
		/** @internal */
		fileParentCreatorByType: Map<string, (path: string) => TFolder>;
		/** @internal */
		inProgressUpdates: null | unknown[];
		/** @internal */
		linkUpdaters: {
			canvas: {
				app: App;
				canvas: unknown;
			};
		};
		/** @internal */
		updateQueue: {
			promise: Promise<void>;
		};
		/**
		 * Reference to Vault
		 */
		vault: Vault;

		/**
		 * Creates a new Markdown file in specified location and opens it in a new view
		 *
		 * @param path - Path to the file to create (missing folders will be created)
		 * @param location - Where to open the view containing the new file
		 */
		createAndOpenMarkdownFile(path: string, location: PaneType): Promise<void>;
		/**
		 * Create a new file in the vault at specified location
		 *
		 * @param location - Location to create the file in, defaults to root
		 * @param filename - Name of the file to create, defaults to "Untitled" (incremented if file already
		 *   exists)
		 * @param extension - Extension of the file to create, defaults to "md"
		 * @param contents - Contents of the file to create, defaults to empty string
		 */
		createNewFile(location: TFolder, filename: string, extension: string, contents: string): Promise<TFile>;
		/**
		 * Creates a new untitled folder in the vault at specified location
		 *
		 * @param location - Location to create the folder in, defaults to root
		 */
		createNewFolder(location: TFolder): Promise<TFolder>;
		/**
		 * Creates a new Markdown file in the vault at specified location
		 */
		createNewMarkdownFile(location: TFolder, filename: string, contents: string): Promise<TFile>;
		/**
		 * Creates a new Markdown file based on linktext and path
		 *
		 * @param filename - Name of the file to create
		 * @param path - Path to where the file should be created
		 */
		createNewMarkdownFileFromLinktext(filename: string, path: string): Promise<TFile>;
		/** @internal */
		getAllLinkResolutions(): [];
		/**
		 * Gets the folder that new markdown files should be saved to, based on the current settings
		 *
		 * @param path - The path of the current opened/focused file, used when the user wants new files to be
		 *   created in the same folder as the current file
		 */
		getMarkdownNewFileParent(path: string): TFolder;
		/**
		 * Insert text into a file
		 *
		 * @param file - File to insert text into
		 * @param primary_text - Text to insert (will not be inserted if secondary_text exists)
		 * @param basename - ???
		 * @param secondary_text - Text to insert (always inserted)
		 * @param atStart - Whether to insert text at the start or end of the file
		 */
		insertTextIntoFile(
			file: TFile,
			primary_text: string,
			basename: string,
			secondary_text: string,
			atStart: boolean,
		): Promise<void>;
		/**
		 * Iterate over all links in the vault with callback
		 *
		 * @param callback - Callback to execute for each link
		 */
		iterateAllRefs(callback: (path: string, link: PositionedReference) => void): void;
		/**
		 * Merge two files
		 *
		 * @param file - File to merge to
		 * @param otherFile - File to merge from
		 * @param override - If not empty, will override the contents of the file with this string
		 * @param atStart - Whether to insert text at the start or end of the file
		 */
		mergeFile(file: TFile, otherFile: TFile, override: string, atStart: boolean): Promise<void>;
		/**
		 * Prompt the user to delete a file
		 */
		promptForDeletion(file: TFile): Promise<void>;
		/**
		 * Prompt the user to rename a file
		 */
		promptForFileRename(file: TFile): Promise<void>;
		/**
		 * @internal
		 * Register an extension to be the parent for a specific file type
		 */
		registerFileParentCreator(extension: string, location: TFolder): void;
		/**
		 * @param callback - Callback to execute for each link
		 * @internal
		 */
		runAsyncLinkUpdate(callback: (link: LinkUpdate) => unknown): void;
		/**
		 * @param path
		 * @param data
		 * @internal
		 */
		storeTextFileBackup(path: string, data: string): void;
		/**
		 * Remove a file and put it in the trash (no confirmation modal)
		 */
		trashFile(file: TFile): Promise<void>;
		/** @internal : Unregister extension as root input directory for file type */
		unregisterFileCreator(extension: string): void;
		/** @internal */
		updateAllLinks(links: unknown[]): Promise<void>;
		/** @internal */
		updateInternalLinks(data: unknown): unknown;
	}

	/** @todo Documentation incomplete */
	class FileSuggest<T> extends EditorSuggest<T> {
		/**
		 * Manages fetching of suggestions from metadatacache
		 */
		suggestManager: FileSuggestManager;
	}

	interface FileSuggestManager {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Selection of files and their paths that can be matched to
		 */
		fileSuggestions: null | { file: TFile | null; path: string }[];
		/**
		 * Determine the source path of current context
		 */
		getSourcePath: () => null | string;
		/**
		 * Whether search should be vault-wide rather than scoped to current file
		 */
		global: boolean;
		/**
		 * Type of suggestions that should be provided
		 */
		mode: "file" | "heading" | "block" | "display" | string;
		/**
		 * Executor of the search
		 */
		runnable: null | Runnable;

		/**
		 * Get suggestions for block query
		 */
		getBlockSuggestions(runner: Runnable, file: TFile, text: string): Promise<SearchResult[]>;
		/**
		 * Get suggestions for display alias query
		 */
		getDisplaySuggestions(
			runner: Runnable,
			linkpath: string,
			subpath: string,
			alias: string,
		): Promise<SearchResult[]>;
		/**
		 * Get suggestions for file query
		 */
		getFileSuggestions(runner: Runnable, text: string): Promise<SearchResult[]>;
		/**
		 * Get suggestions for global block query
		 */
		getGlobalBlockSuggestions(runner: Runnable, text: string): Promise<SearchResult[]>;
		/**
		 * Get suggestions for global heading query
		 */
		getGlobalHeadingSuggestions(runner: Runnable, text: string): Promise<SearchResult[]>;
		/**
		 * Get suggestions for file heading query
		 */
		getHeadingSuggestions(runner: Runnable, file: TFile, text: string): Promise<SearchResult[]>;
		/**
		 * Get suggestions for current input text
		 *
		 * @remark Type is determined from text: e.g. [[Thi]] will give completions for files, [[Thi^]] for blocks, etc.
		 */
		getSuggestionsAsync(runner: Runnable, text: string): Promise<SearchResult[]>;
		/**
		 * Match search fragments to a block
		 */
		matchBlock(
			path: string,
			file: TFile,
			block: BlockCache,
			sourcePath: null | string,
			content: string,
			text_parts: string[],
		): SearchResult | null;
	}

	interface FileSystemAdapter extends DataAdapter {}

	/** @todo Documentation incomplete */
	interface FileTreeItem {
		file: TAbstractFile;
	}

	/** @todo Documentation incomplete */
	interface FileView {
		/**
		 * Whether the view may be run without an attached file
		 */
		allowNoFile: boolean;
	}

	/** @todo Documentation incomplete */
	interface FoldInfo {
		folds: { from: number; to: number }[];
		lines: number;
	}

	/** @todo Documentation incomplete */
	interface FoldManager {
	}

	/** @todo Documentation incomplete */
	interface GlobalSearchLeaf extends WorkspaceLeaf {}

	/** @todo Documentation incomplete */
	interface GlobalSearchPlugin extends InternalPlugin {}

	interface HotkeyManager {
		/**
		 * Reference to App
		 */
		app: App;
		/** @internal Whether hotkeys have been baked (checks completed) */
		baked: boolean;
		/**
		 * Assigned hotkeys
		 */
		bakedHotkeys: KeymapInfo[];
		/**
		 * Array of hotkey index to command ID
		 */
		bakedIds: string[];
		/**
		 * Custom (non-Obsidian default) hotkeys, one to many mapping of command ID to assigned hotkey
		 */
		customKeys: Record<string, KeymapInfo[]>;
		/**
		 * Default hotkeys, one to many mapping of command ID to assigned hotkey
		 */
		defaultKeys: Record<string, KeymapInfo[]>;

		/**
		 * Add a hotkey to the default hotkeys
		 *
		 * @param command - Command ID to add hotkey to
		 * @param keys - Hotkeys to add
		 */
		addDefaultHotkeys(command: string, keys: KeymapInfo[]): void;
		/** @internal Bake hotkeys (create mapping of pressed key to command ID) */
		bake(): void;
		/**
		 * Get hotkey associated with command ID
		 *
		 * @param command - Command ID to get hotkey for
		 */
		getDefaultHotkeys(command: string): KeymapInfo[];
		/**
		 * Get hotkey associated with command ID
		 *
		 * @param command - Command ID to get hotkey for
		 */
		getHotkeys(command: string): KeymapInfo[];
		/** @internal Load hotkeys from storage */
		load(): void;
		/**
		 * Trigger a command by keyboard event
		 *
		 * @param event - Keyboard event to trigger command with
		 * @param keypress - Pressed key information
		 */
		onTrigger(event: KeyboardEvent, keypress: KeymapInfo): boolean;
		/**
		 * Pretty-print hotkey of a command
		 *
		 * @param command
		 */
		printHotkeyForCommand(command: string): string;
		/**
		 * Remove a hotkey from the default hotkeys
		 *
		 * @param command - Command ID to remove hotkey from
		 */
		removeDefaultHotkeys(command: string): void;
		/**
		 * Remove a hotkey from the custom hotkeys
		 *
		 * @param command - Command ID to remove hotkey from
		 */
		removeHotkeys(command: string): void;
		/** @internal Save custom hotkeys to storage */
		save(): void;
		/**
		 * Add a hotkey to the custom hotkeys (overrides default hotkeys)
		 *
		 * @param command - Command ID to add hotkey to
		 * @param keys - Hotkeys to add
		 */
		setHotkeys(command: string, keys: KeymapInfo[]): void;
	}

	/** @todo Documentation incomplete */
	interface HoverLinkEvent {
		event: MouseEvent;
		hoverParent: WorkspaceLeaf;
		linktext: string;
		source: "search" | "editor" | "preview" | "properties" | "graph" | "file-explorer" | "hover-link";
		sourcePath?: string;
		state?: {
			scroll: unknown;
		};
		targetEl: HTMLElement | null;
	}

	/** @todo Documentation incomplete */
	interface HoverLinkSource {
		defaultMod: boolean;
		display: string;
	}

	class IFramedMarkdownEditor extends MarkdownScrollableEditView {
		constructor(context: WidgetEditorView);
		/**
		 * Function that cleans up the iframe and listeners
		 */
		cleanup: null | (() => void);
		/**
		 * Element where the editor is embedded into
		 */
		iframeEl: null | HTMLIFrameElement;

		/**
		 * Executes cleanup function if exists
		 */
		cleanupIframe(): void;
		/**
		 * Constructs extensions for the editor based on user settings
		 *
		 * @remark Creates extension for overriding escape keymap to showPreview
		 */
		getDynamicExtensions(): Extension[];
		/**
		 * Loads the iframe element and prepare cleanup function
		 */
		onIframeLoad(): void;
		/**
		 * Execute cleanup of the iframe
		 */
		onunload(): void;
		/**
		 * Execute functionality on CM editor state update
		 */
		onUpdate(update: ViewUpdate, changed: boolean): void;
	}

	/** @todo Documentation incomplete */
	interface ImportedAttachments {
		data: Promise<ArrayBuffer>;
		extension: string;
		filename: string;
		name: string;
	}

	/** @todo Documentation incomplete */
	interface InfinityScroll {
		height: number;
		lastScroll: number;
		queued: unknown | null;
		renderBlockSize: number;
		rootEl: unknown;
		scrollEl: HTMLElement;
		setWidth: boolean;
		width: number;

		_layout(x: unknown, y: unknown): unknown;
		_measure(x: unknown): unknown;
		_precompute(x: unknown): unknown;
		compute(x: unknown): unknown;
		findElementTop(x: unknown, y: unknown, z: unknown): unknown;
		getRootTop(): unknown;
		invalidate(x: unknown, y: unknown): unknown;
		invalidateAll(): unknown;
		measure(x: unknown, y: unknown): unknown;
		onResize(): unknown;
		onScroll(): unknown;
		queueCompute(): unknown;
		scrollIntoView(x: unknown, y: unknown): unknown;
		update(x: unknown, y: unknown, z: unknown, u: unknown, v: unknown, w: unknown): unknown;
		updateVirtualDisplay(x: unknown): unknown;
	}

	/** @todo Documentation incomplete */
	interface InternalPlugin extends Plugin {
		disable(): void;
		enable(): void;
	}

	interface InternalPlugins extends Events {
		/**
		 * Reference to App
		 */
		app: App;
		/**
		 * Mapping of whether an internal plugin is enabled
		 */
		config: Record<InternalPluginName, boolean>;
		/** @internal */
		migration: boolean;
		/**
		 * Plugin configs for internal plugins
		 *
		 * @remark Prefer usage of getPluginById to access a plugin
		 */
		plugins: {
			"file-explorer": FileExplorerPlugin;
			"global-search": GlobalSearchPlugin;
			[key: string]: InternalPlugin;
		};

		/** @internal - Load plugin configs and enable plugins */
		enable(): Promise<void>;
		/**
		 * Get an enabled internal plugin by ID
		 *
		 * @param id - ID of the plugin to get
		 */
		getEnabledPluginById(id: InternalPluginName): InternalPlugin | null;
		getEnabledPluginById(id: "file-explorer"): FileExplorerPlugin | null;
		getEnabledPluginById(id: "global-search"): GlobalSearchPlugin | null;
		/**
		 * Get all enabled internal plugins
		 */
		getEnabledPlugins(): InternalPlugin[];
		/**
		 * Get an internal plugin by ID
		 *
		 * @param id - ID of the plugin to get
		 */
		getPluginById(id: InternalPluginName): InternalPlugin;
		/** @internal */
		loadPlugin(arg: { id: string; name: string }): string;
		/** @internal */
		onRaw(cb1: unknown, cb2: unknown): void;
		/** @internal Request save of plugin configs */
		requestSaveConfig(): void;
		/** @internal - Save current plugin configs */
		saveConfig(): Promise<void>;
	}

	/** @todo Documentation incomplete */
	interface ItemView {
		/**
		 * Container of actions for the view
		 */
		actionsEl: HTMLElement;
		/**
		 * Back button element for changing view history
		 */
		backButtonEl: HTMLButtonElement;
		/**
		 * Whether the view may be dropped anywhere in workspace
		 */
		canDropAnywhere: boolean;
		/**
		 * Forward button element for changing view history
		 */
		forwardButtonEl: HTMLButtonElement;
		/**
		 * Header bar container of view
		 */
		headerEl: HTMLElement;
		/**
		 * Icon element for the view (for dragging)
		 */
		iconEl: HTMLElement;
		/**
		 * Anchor button for revealing more view actions
		 */
		moreOptionsButtonEl: HTMLAnchorElement;
		/**
		 * Container for the title of the view
		 */
		titleContainerEl: HTMLElement;
		/**
		 * Title element for the view
		 */
		titleEl: HTMLElement;
		/**
		 * Title of the parent
		 *
		 * @remark Used for breadcrumbs rendering
		 */
		titleParentEl: HTMLElement;
	}

	/** @todo Documentation incomplete */
	interface Keymap {
	}

	/** @todo Documentation incomplete */
	interface KeyScope {
		/**
		 * Key to match
		 */
		key: string | null;
		/**
		 * Modifiers to match
		 */
		modifiers: string | null;
		/**
		 * Scope where the key interceptor is registered
		 */
		scope: Scope;

		/**
		 * Callback of function to execute when key is pressed
		 */
		func(): void;
	}

	/** @todo Documentation incomplete */
	interface LeafEntry {
		children?: LeafEntry[];
		direction?: SplitDirection;
		id: string;
		state?: ViewState;
		type: string;
		width?: number;
	}

	interface LinkUpdate {
		/**
		 * Reference to App
		 */
		app: App;
		/**
		 * Link position in the file
		 */
		reference: PositionedReference;
		/**
		 * File that was resolved
		 */
		resolvedFile: TFile;
		/**
		 * Paths the file could have been resolved to
		 */
		resolvedPaths: string[];
		/**
		 * File that contains the link
		 */
		sourceFile: TFile;
	}

	/** @todo Documentation incomplete */
	interface LoadProgress {
	}

	class MarkdownBaseView extends Component {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Callback to clear all elements
		 */
		cleanupLivePreview: null | (() => void);
		/**
		 * Manager that handles pasting text, html and images into the editor
		 */
		clipboardManager: ClipBoardManager;
		/**
		 * Codemirror editor instance
		 */
		cm: EditorView;
		/**
		 * Whether CodeMirror is initialized
		 */
		cmInit: boolean;
		/**
		 * Container element of the editor view
		 */
		containerEl: HTMLElement;
		/**
		 * Popup element for internal link
		 */
		cursorPopupEl: HTMLElement | null;
		/**
		 * Obsidian editor instance
		 *
		 * @remark Handles formatting, table creation, highlight adding, etc.
		 */
		editor: ExtendedEditor;
		/**
		 * Element in which the CodeMirror editor resides
		 */
		editorEl: HTMLElement;
		/**
		 * Editor suggestor for autocompleting files, links, aliases, etc.
		 */
		editorSuggest: EditorSuggests;
		/**
		 * The CodeMirror plugins that handle the rendering of, and interaction with Obsidian's Markdown
		 */
		livePreviewPlugin: Extension[];
		/**
		 * Local (always active) extensions for the editor
		 */
		localExtensions: Extension[];
		/**
		 * Controller of the editor view
		 */
		owner: MarkdownFileInfo;
		/**
		 * Whether live preview rendering is disabled
		 */
		sourceMode: boolean;
		/**
		 * Reference to editor attached to table cell, if any
		 */
		tableCell: null | TableCellEditor;

		/**
		 * Currently active CM instance (table cell CM or main CM)
		 */
		get activeCM(): EditorView;
		/**
		 * Returns attached file of the owner instance
		 */
		get file(): TFile | null;
		/**
		 * Returns path of the attached file
		 */
		get path(): string;

		/**
		 * Apply fold history to editor
		 */
		applyFoldInfo(info: FoldInfo): void;
		/**
		 * Constructs local (always active) extensions for the editor
		 *
		 * @remark Creates extensions for handling dom events, editor info statefields, update listener, suggestions
		 */
		buildLocalExtensions(): Extension[];
		/**
		 * Cleanup live preview, remove and then re-add all editor extensions
		 */
		clear(): void;
		/**
		 * Clean up live preview, remove all extensions, destory editor
		 */
		destroy(): void;
		/**
		 * Removes specified tablecell
		 */
		destroyTableCell(cell?: TableCellEditor): void;
		/**
		 * Edit a specified table cell, creating a table cell editor
		 */
		editTableCell(cell: TableEditor, new_cell: TableCell): TableCellEditor;
		/**
		 * Get the current editor document as a string
		 */
		get(): string;
		/**
		 * Constructs extensions for the editor based on user settings
		 *
		 * @remark Creates extension for tab size, RTL rendering, spellchecking, pairing markdown syntax, live preview and vim
		 */
		getDynamicExtensions(): Extension[];
		/**
		 * Get the current folds of the editor
		 */
		getFoldInfo(): null | FoldInfo;
		/**
		 * Builds all local extensions and assigns to this.localExtensions
		 *
		 * @remark Will build extensions if they were not already built
		 */
		getLocalExtensions(): unknown;
		/**
		 * Creates menu on right mouse click
		 */
		onContextMenu(event: PointerEvent, x: boolean): Promise<void>;
		/**
		 * Execute click functionality on token on mouse click
		 */
		onEditorClick(event: MouseEvent, element?: HTMLElement): void;
		/**
		 * Execute drag functionality on drag start
		 *
		 * @remark Interfaces with dragManager
		 */
		onEditorDragStart(event: DragEvent): void;
		/**
		 * Execute hover functionality on mouse over event
		 */
		onEditorLinkMouseover(event: MouseEvent, target: HTMLElement): void;
		/**
		 * Execute context menu functionality on right mouse click
		 *
		 * @deprecated Use onContextMenu instead
		 */
		onMenu(event: MouseEvent): void;
		/**
		 * Reposition suggest and scroll position on resize
		 */
		onResize(): void;
		/**
		 * Execute functionality on CM editor state update
		 */
		onUpdate(update: ViewUpdate, changed: boolean): void;
		/**
		 * Reinitialize the editor inside new container
		 */
		reinit(): void;
		/**
		 * Move the editor into the new container
		 */
		reparent(new_container: HTMLElement): void;
		/**
		 * Bodge to reset the syntax highlighting
		 *
		 * @remark Uses single-character replacement transaction
		 */
		resetSyntaxHighlighting(): void;
		/** @internal Save history of file and data (for caching, for faster reopening of same file in editor) */
		saveHistory(): void;
		/**
		 * Set the state of the editor
		 */
		set(data: string, clear: boolean): void;
		/**
		 * Enables/disables frontmatter folding
		 */
		toggleFoldFrontmatter(): void;
		/**
		 * Toggle sourcemode for editor and dispatch effect
		 */
		toggleSource(): void;
		/**
		 * Execute functionality of token (open external link, open internal link in leaf, ...)
		 */
		triggerClickableToken(token: Token, new_leaf: boolean): void;
		/** @internal Callback for onUpdate functionality added as an extension */
		updateEvent(): (update: ViewUpdate) => void;
		/**
		 * In mobile, creates a popover link on clickable token, if exists
		 */
		updateLinkPopup(): void;
		/**
		 * Reconfigure/re-add all the dynamic extensions
		 */
		updateOptions(): void;
	}

	interface MarkdownEditView extends MarkdownScrollableEditView {
		/**
		 * Frontmatter editor extension for the editor
		 */
		propertiesExtension: Extension[];
		/**
		 * Editing mode of the editor
		 */
		type: "source";
		/**
		 * View the source view editor is attached to
		 */
		view: MarkdownView;

		/**
		 * Save functionality to execute before editor view unload
		 */
		beforeUnload(): void;
		/**
		 * Clear the editor view
		 */
		clear(): void;
		/**
		 * Destroy/Detach the editor view
		 */
		destroy(): void;
		/**
		 * Constructs extensions for the editor based on user settings
		 *
		 * @remark Creates extension for properties rendering
		 */
		getDynamicExtensions(): Extension[];
		/**
		 * Gets the ephemeral (non-persistent) state of the editor
		 */
		getEphemeralState(state: any): { cursor: EditorRange } & any;
		/**
		 * Get the current folds of the editor
		 */
		getFoldInfo(): null | FoldInfo;
		/**
		 * Get the main selected range as string
		 */
		getSelection(): string;
		/**
		 * Add highlights for specified ranges
		 *
		 * @remark Only ranges parameter is used
		 */
		highlightSearchMatches(
			ranges: EditorRange[],
			style?: "is-flashing" | "obsidian-search-match-highlight",
			remove_previous?: boolean,
			range?: EditorSelection,
		): void;
		/**
		 * Execute functionality on CM editor state update
		 */
		onUpdate(update: ViewUpdate, changed: boolean): void;
		/**
		 * Debounced onInternalDataChange of view
		 */
		requestOnInternalDataChange(): void;
		/**
		 * Debounced onMarkdownFold of view
		 */
		requestSaveFolds(): unknown;
		/**
		 * Set the state of the editor
		 */
		set(data: string, clear: boolean): void;
		/**
		 * Set the ephemeral (non-persistent) state of the editor
		 */
		setEphemeralState(state: any): void;
		/**
		 * Set highlight of any search match
		 */
		setHighlight(match: {
			focus: boolean;
			startLoc?: number;
			endLoc?: number;
			line?: number;
			match?: unknown;
		}): void;
		/**
		 * Set the state of the editor (applies selections, scrolls, ...)
		 */
		setState(state: any): void;
		/**
		 * Render the editor and the metadata-editor element
		 */
		show(): void;
		/**
		 * Update the bottom padding of the CodeMirror contentdom (based on backlinksEl)
		 */
		updateBottomPadding(height: number): void;
		/**
		 * Update options of the editor from settings
		 */
		updateOptions(): void;
	}

	/** @todo Documentation incomplete */
	interface MarkdownPreviewView {
		/**
		 * Unique identifier for the rendered element
		 */
		docId: string;
		/**
		 * HTML renderer for the Markdown
		 */
		renderer: ReadViewRenderer;
		search: null | unknown;
		type: "preview" | string;
		view: MarkdownView;

		applyFoldInfo(e: unknown): unknown;
		beforeUnload(): unknown;
		clear(): unknown;
		edit(e: unknown): unknown;
		foldAll(): unknown;
		getEphemeralState(e: unknown): unknown;
		getFoldInfo(): unknown;
		getSelection(): unknown;
		hide(): unknown;
		onFoldChange(): unknown;
		onRenderComplete(): unknown;
		onResize(): unknown;
		onScroll(): unknown;
		requestUpdateLinks(): unknown;
		setEphemeralState(e: unknown): unknown;
		show(): unknown;
		showSearch(): unknown;
		unfoldAll(): unknown;
		updateOptions(): unknown;
	}

	/** @todo Documentation incomplete */
	interface MarkdownRenderer {
		get path(): unknown;
		onCheckboxClick(e: unknown, n: unknown, i: unknown): unknown;
		onFileChange(e: unknown): unknown;
		onFoldChange(): unknown;
		onload(): unknown;
		onRenderComplete(): unknown;
		onScroll(): unknown;
		postProcess(e: unknown, t: unknown, n: unknown): unknown;
		resolveLinks(e: unknown): unknown;
	}

	class MarkdownScrollableEditView extends MarkdownBaseView {
		/**
		 * List of CSS classes applied to the editor
		 */
		cssClasses: [];
		/**
		 * Whether the editor is currently scrolling
		 */
		isScrolling: boolean;
		/**
		 * Scope for the search component, if exists
		 */
		scope: Scope | undefined;
		/**
		 * Search component for the editor, provides highlight and search functionality
		 */
		search: EditorSearchComponent;
		/**
		 * Container for the editor, handles editor size
		 */
		sizerEl: HTMLElement;

		/**
		 * Set the scroll count of the editor scrollbar
		 */
		applyScroll(scroll: number): void;
		/**
		 * Constructs local (always active) extensions for the editor
		 *
		 * @remark Creates extensions for list indentation, tab indentations
		 */
		buildLocalExtensions(): Extension[];
		/**
		 * Focus the editor (and for mobile: render keyboard)
		 */
		focus(): void;
		/**
		 * Constructs extensions for the editor based on user settings
		 *
		 * @remark Creates toggleable extensions for showing line numbers, indentation guides,
		 *          folding, brackets pairing and properties rendering
		 */
		getDynamicExtensions(): Extension[];
		/**
		 * Get the current scroll count of the editor scrollbar
		 */
		getScroll(): number;
		/**
		 * Invokes onMarkdownScroll on scroll
		 */
		handleScroll(): void;
		/**
		 * Hides the editor (sets display: none)
		 */
		hide(): void;
		/**
		 * Clear editor cache and refreshes editor on app css change
		 */
		onCssChange(): void;
		/**
		 * Update editor size and bottom padding on resize
		 */
		onResize(): void;
		/**
		 * Update editor suggest position and invokes handleScroll on scroll
		 */
		onScroll(): void;
		/**
		 * Execute functionality on CM editor state update
		 */
		onUpdate(update: ViewUpdate, changed: boolean): void;
		/**
		 * Close editor suggest and removes highlights on click
		 */
		onViewClick(event?: MouseEvent): void;
		/**
		 * Add classes to the editor, functions as a toggle
		 */
		setCssClass(classes: string[]): void;
		/**
		 * Reveal the editor (sets display: block)
		 */
		show(): void;
		/**
		 * Reveal the search (and replace) component
		 */
		showSearch(replace: boolean): void;
		/**
		 * Update the bottom padding of the CodeMirror contentdom
		 */
		updateBottomPadding(height: number): void;
	}

	interface MarkdownView {
		/**
		 * Backlinks component
		 */
		backlinks: null | unknown;
		/**
		 * The embedded backlinks element for the current file
		 */
		backlinksEl: HTMLElement;
		/**
		 * The currently active markdown view (preview or edit view)
		 */
		currentMode: MarkdownSubView;
		/**
		 * Editor component of the view
		 */
		editMode: MarkdownEditView;
		/**
		 * Editable title element of the view
		 */
		inlineTitleEl: HTMLElement;
		/**
		 * Frontmatter editor of the editor
		 */
		metadataEditor: MetadataEditor;
		/**
		 * Button for switching between different modes of the view
		 */
		modeButtonEl: HTMLAnchorElement;
		/**
		 * The registered modes of the view
		 */
		modes: { source: MarkdownEditView; preview: MarkdownPreviewView };
		/**
		 * Preview component of the view
		 */
		previewMode: MarkdownPreviewView;
		/**
		 * File frontmatter as a raw string
		 */
		rawFrontmatter: string;
		/**
		 * Current scroll position of the editor
		 */
		scroll: null | number;
		/**
		 * Whether to show backlinks in the editor
		 */
		showBacklinks: boolean;
		/** @deprecated CM5 Editor */
		sourceMode: { cmEditor: any };

		/**
		 * Add property to inline metadata editor or properties plugin
		 *
		 * @remark Parameter is not used
		 */
		addProperty(unused: undefined): void;
		/**
		 * Whether the editor can render properties according to the current mode and config
		 */
		canShowProperties(): boolean;
		/**
		 * Whether the editor can toggle backlinks according to current mode
		 */
		canToggleBacklinks(): boolean;
		/**
		 * Collapse the properties editor
		 */
		collapseProperties(collapse: boolean): void;
		/**
		 * Edit the focused property in the metadata editor
		 *
		 * @remark Parameter is not used
		 */
		editProperty(unused: undefined): void;
		/**
		 * Focus on the metadata editor given property information
		 */
		focusMetadata(focus?: { focusHeading: boolean; propertyIdx?: number; propertyKey?: string }): void;
		/**
		 * Gets the ephemeral (non-persistent) state of the editor
		 */
		getEphemeralState(): any & { scroll: number };
		/**
		 * Get the file attached to the view
		 */
		getFile(): TFile | null;
		/**
		 * Get the current mode of the editor
		 */
		getMode(): MarkdownViewModeType;
		/**
		 * Get selection of current mode
		 */
		getSelection(): string;
		/**
		 * Get view state for sync plugin
		 */
		getSyncViewState(): any;
		/**
		 * Get the current view type
		 */
		getViewType(): string;
		/**
		 * Handle copy event on metadata editor and serialize properties
		 */
		handleCopy(event: ClipboardEvent): void;
		/**
		 * Handle cut event on metadata editor and serialize and remove properties
		 */
		handleCut(event: ClipboardEvent): void;
		/**
		 * Handle paste event of properties on metadata editor
		 */
		handlePaste(event: ClipboardEvent): void;
		/**
		 * Validate correctness of frontmatter and update metadata editor
		 */
		loadFrontmatter(data: string): void;
		/**
		 * Whether the metadata editor has focus
		 */
		metadataHasFocus(): boolean;
		/**
		 * On app css change, update source mode editor
		 */
		onCssChange(): void;
		/**
		 * Update editor on external data change (from sync plugin)
		 */
		onExternalDataChange(file: TFile, data: string): void;
		/**
		 * On blur of inline title, save new filename
		 */
		onInlineTitleBlur(): Promise<void>;
		/**
		 * On data change of editor, update internal data and metadata editor
		 */
		onInternalDataChange(): void;
		/**
		 * On loading markdown view, register resize, css-change and quick-preview events
		 */
		onload(): void;
		/**
		 * On fold of markdown in source editor, save fold info to fold manager
		 */
		onMarkdownFold(): void;
		/**
		 * On markdown scroll in editors, update scroll, sync state and trigger markdown scroll event
		 */
		onMarkdownScroll(): void;
		/**
		 * Populate the context menu
		 */
		onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string): void;
		/**
		 * Trigger onResize function of currently active editor component
		 */
		onResize(): void;
		/**
		 * On mod click, opens editor of opposite mode in split view to right
		 */
		onSwitchView(event: KeyboardEvent | MouseEvent): Promise<void>;
		/**
		 * Opens PDF modal for exporting PDF of the current file
		 */
		printToPdf(): void;
		/**
		 * Redo action of source mode editor
		 */
		redo(): void;
		/**
		 * Register editor mode component to view
		 */
		registerMode(component: MarkdownSubView): void;
		/**
		 * Save the frontmatter of the file
		 */
		saveFrontmatter(properties: Record<string, any>): void;
		/**
		 * Set the ephemeral (non-persistent) state of the editor
		 */
		setEphemeralState(
			state: any & {
				focus: boolean;
				focusOnMobie: boolean;
				cursor: EditorRangeOrCaret;
			},
		): void;
		/**
		 * Set the mode of the editor
		 */
		setMode(component: MarkdownSubView): Promise<void>;
		/**
		 * Shift focus to first line of editor
		 */
		shiftFocusAfter(): void;
		/**
		 * Shift focus to inline title
		 */
		shiftFocusBefore(): void;
		/**
		 * Toggle backlinks on editor
		 */
		toggleBacklinks(): Promise<void>;
		/**
		 * Toggle collapse status of properties editor if allowed
		 */
		toggleCollapseProperties(): void;
		/**
		 * Toggle between source and preview mode
		 */
		toggleMode(): void;
		/**
		 * Execute functionality of token (open external link, open internal link in leaf, ...)
		 */
		triggerClickableToken(token: Token, new_leaf: boolean): void;
		/**
		 * Undo action of source mode editor
		 */
		undo(): void;
		/**
		 * Update the backlinks component for new file
		 */
		updateBacklinks(): void;
		/**
		 * Update reading/source view action buttons of modeButtonEl with current mode
		 */
		updateButtons(): void;
		/**
		 * Update options of the editors from settings
		 */
		updateOptions(): void;
		/**
		 * Hide/render backlinks component
		 */
		updateShowBacklinks(): void;
	}

	interface Menu extends Component {
		/**
		 * Background for the suggestion menu
		 */
		bgEl: HTMLElement;
		/**
		 * The currently active submenu, if any
		 */
		currentSubmenu?: Menu;
		/**
		 * DOM element of the menu
		 */
		dom: HTMLElement;
		/**
		 * Callback to execute when the menu is hidden
		 */
		hideCallback: () => void;
		/**
		 * Items contained in the menu
		 */
		items: MenuItem[];
		/** @internal Callback that opens the submenu after a delay */
		openSubmenuSoon: () => void;
		/**
		 * Parent menu of the current menu
		 */
		parentMenu: Menu | null;
		/**
		 * Scope in which the menu is active
		 */
		scope: Scope;
		/**
		 * Sections within the menu
		 */
		sections: string[];
		/** @internal Which menuitem is currently selected */
		selected: number;
		/** @internal Configurations for the submenu configs */
		submenuConfig: Record<string, { title: string; icon: string }>;
		/** @internal Whether the submenu is currently unloading */
		unloading: boolean;
		/**
		 * Whether the menu is rendered in native mode
		 */
		useNativeMenu: boolean;

		/** @internal Add a section to the menu */
		addSections(items: string[]): this;
		/** @internal Close the currently open submenu */
		closeSubmenu(): void;
		/** @internal Check whether the clicked element is inside the menu */
		isInside(e: HTMLElement): boolean;
		/**
		 * @param e - Keyboard event
		 * @internal Move selection to the next item in the menu
		 */
		onArrowDown(e: KeyboardEvent): boolean;
		/** @internal Move selection out of the submenu */
		onArrowLeft(e: KeyboardEvent): boolean;
		/** @internal Move selection into the submenu */
		onArrowRight(e: KeyboardEvent): boolean;
		/**
		 * @param e - Keyboard event
		 * @internal Move selection to the previous item in the menu
		 */
		onArrowUp(e: KeyboardEvent): boolean;
		/** @internal Execute selected menu item (does nothing if item is submenu) */
		onEnter(e: KeyboardEvent): boolean;
		/**
		 * @param e
		 * @internal Pre-emptively closes the menu if click is registered on menu item
		 */
		onMenuClick(e: MouseEvent): void;
		/**
		 * @param e - Mouse event
		 * @internal Opens submenu if mouse is hovering over item with submenu
		 */
		onMouseOver(e: MouseEvent): boolean;
		/** @internal Registers dom events and scope for the menu */
		openSubmenu(item: MenuItem): void;
		/**
		 * @param index
		 * @internal Select the item at the specified index (after either hovering or arrowing over it)
		 */
		select(index: number): void;
		/**
		 * @param el - Element to set as parent
		 * @internal Set the parent element of the menu (i.e. for workspace leaf context menu)
		 */
		setParentElement(el: HTMLElement): this;
		/**
		 * @param section
		 * @param submenu
		 * @internal Add a section to the submenu config
		 */
		setSectionSubmenu(section: string, submenu: { title: string; icon: string }): this;
		/** @internal Sort the items in the menu */
		sort(): void;
		/** @internal Unselect the currently selected item and closes the submenu */
		unselect(): void;
	}

	interface MenuItem {
		/**
		 * The callback that is executed when the menu item is clicked
		 */
		callback?: () => void;
		/**
		 * Whether the menu item is checked
		 */
		checked: boolean | null;
		/**
		 * Check icon element of the menu item, only present if the item is checked
		 */
		checkIconEl?: HTMLElement;
		/**
		 * Whether the menu item is disabled
		 */
		disabled: boolean;
		/**
		 * Dom element of the menu item
		 */
		dom: HTMLElement;
		/**
		 * Icon element of the menu item
		 */
		iconEl: HTMLElement;
		/**
		 * Menu the item is in
		 */
		menu: Menu;
		/**
		 * The section the item belongs to
		 */
		section: string;
		/**
		 * The submenu that is attached to the item
		 */
		submenu: Menu | null;
		/**
		 * Title of the menu item
		 */
		titleEl: string;

		/**
		 * @param e - Mouse or keyboard event
		 * @internal Executes the callback of the onClick event (if not disabled)
		 */
		handleEvent(e: MouseEvent | KeyboardEvent): void;
		/** @internal Remove the icon element from the menu item */
		removeIcon(): void;
		/**
		 * @deprecated
		 * @param active - Whether the menu item should be checked
		 * @internal Calls `setChecked`, prefer usage of that function instead
		 */
		setActive(active: boolean): this;
		/**
		 * Create a submenu on the menu item
		 *
		 * @tutorial Creates the foldable menus with more options as seen when you right-click in the editor (e.g. "Insert", "Format", ...)
		 */
		setSubmenu(): Menu;
		/**
		 * @param warning - Whether the menu item should be styled as a warning
		 * @internal Add warning styling to the menu item
		 */
		setWarning(warning: boolean): this;
	}

	interface MetadataCache {
		/**
		 * Reference to App
		 */
		app: App;
		/** @internal */
		blockCache: BlockCache;
		/** @internal IndexedDB database */
		db: IDBDatabase;
		/** @internal File contents cache */
		fileCache: Record<string, FileCacheEntry>;
		/** @internal Whether the cache is fully loaded */
		initialized: boolean;
		/** @internal Amount of tasks currently in progress */
		inProgressTaskCount: number;
		/** @internal */
		linkResolverQueue: unknown;
		/** @internal File hash to metadata cache entry mapping */
		metadataCache: Record<string, CachedMetadata>;
		/** @internal Callbacks to execute on cache clean */
		onCleanCacheCallbacks: unknown[];
		/** @internal Mapping of filename to collection of files that share the same name */
		uniqueFileLookup: CustomArrayDict<TFile>;
		/** @internal */
		userIgnoreFilterCache: unknown;
		/** @internal */
		userIgnoreFilters: unknown;
		/** @internal */
		userIgnoreFiltersString: string;
		/**
		 * Reference to Vault
		 */
		vault: Vault;
		/** @internal */
		worker: Worker;
		/** @internal */
		workerResolve: unknown;
		/** @internal */
		workQueue: unknown;

		_getLinkpathDest(origin: string, path: string): TFile[];
		/** @internal Clear all caches to null values */
		cleanupDeletedCache(): void;
		/** @internal */
		clear(): unknown;
		/** @internal */
		computeMetadataAsync(e: unknown): Promise<unknown>;
		/** @internal Remove all entries that contain deleted path */
		deletePath(path: string): void;
		/**
		 * Get all property infos of the vault
		 */
		getAllPropertyInfos(): Record<string, PropertyInfo>;
		/**
		 * Get all backlink information for a file
		 */
		getBacklinksForFile(file?: TFile): CustomArrayDict<LinkCache>;
		/**
		 * Get paths of all files cached in the vault
		 */
		getCachedFiles(): string[];
		/**
		 * Get an entry from the file cache
		 */
		getFileInfo(path: string): FileCacheEntry;
		/**
		 * Get property values for frontmatter property key
		 */
		getFrontmatterPropertyValuesForKey(key: string): string[];
		/**
		 * Get destination of link path
		 */
		getLinkpathDest(origin: string, path: string): TFile[];
		/**
		 * Get all links within the vault per file
		 */
		getLinks(): Record<string, Reference[]>;
		/**
		 * Get all links (resolved or unresolved) in the vault
		 */
		getLinkSuggestions(): { file: TFile | null; path: string }[];
		/**
		 * Get all tags within the vault and their usage count
		 */
		getTags(): Record<string, number>;
		/** @internal Initialize Database connection and load up caches */
		initialize(): Promise<void>;
		/** @internal Check whether there are no cache tasks in progress */
		isCacheClean(): boolean;
		/** @internal Check whether file can support metadata (by checking extension support) */
		isSupportedFile(file: TFile): boolean;
		/** @internal Check whether string is part of the user ignore filters */
		isUserIgnored(filter: unknown): boolean;
		/**
		 * Iterate over all link references in the vault with callback
		 */
		iterateReferences(callback: (path: string) => void): void;
		/** @internal */
		linkResolver(): void;
		/**
		 * Called whenever the metadatacache is fully loaded in
		 *
		 * @remark 'finished' is also emitted when the cache is initialized
		 */
		on(name: "initialized", callback: () => void): EventRef;
		/**
		 * Called whenever the metadatacache has finished updating
		 */
		on(name: "finished", callback: () => void): EventRef;
		/** @internal Execute onCleanCache callbacks if cache is clean */
		onCleanCache(): void;
		/** @internal On creation of the cache: update metadata cache */
		onCreate(file: TFile): void;
		/** @internal On creation or modification of the cache: update metadata cache */
		onCreateOrModify(file: TFile): void;
		/** @internal On deletion of the cache: update metadata cache */
		onDelete(file: TFile): void;
		/** @internal */
		onReceiveMessageFromWorker(e: unknown): void;
		/** @internal On rename of the cache: update metadata cache */
		onRename(file: TFile, oldPath: string): void;
		/** @internal Check editor for unresolved links and mark these as unresolved */
		resolveLinks(editor: Element): void;
		/** @internal Update file cache entry and sync to indexedDB */
		saveFileCache(path: string, entry: FileCacheEntry): void;
		/** @internal Update metadata cache entry and sync to indexedDB */
		saveMetaCache(path: string, entry: CachedMetadata): void;
		/** @internal Show a notice that the cache is being rebuilt */
		showIndexingNotice(): void;
		/** @internal Re-resolve all links for changed path */
		updateRelatedLinks(path: string): void;
		/** @internal Update user ignore filters from settings */
		updateUserIgnoreFilters(): void;
		/** @internal Bind actions to listeners on vault */
		watchVaultChanges(): void;
		/** @internal Send message to worker to update metadata cache */
		work(cacheEntry: unknown): void;
	}

	interface MetadataEditor extends Component {
		/**
		 * Button element for adding a new property
		 */
		addPropertyButtonEl: HTMLButtonElement;
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Whether the frontmatter editor is collapsed
		 */
		collapsed: boolean;
		/**
		 * Container element for the metadata editor
		 */
		containerEl: HTMLElement;
		/**
		 * Element containing metadata table and addPropertyButton
		 */
		contentEl: HTMLElement;
		/**
		 * The currently focused property
		 */
		focusedLine: null | MetadataEditorProperty;
		/**
		 * Fold button for folding away the frontmatter editor on hovering over headingEl
		 */
		foldEl: HTMLElement;
		/**
		 * Heading element for the metadata editor
		 */
		headingEl: HTMLElement;
		/**
		 * Hover element container
		 */
		hoverPopover: null | HoverPopover;
		/**
		 * Owner of the metadata editor
		 */
		owner: MarkdownView;
		/**
		 * All properties existing in the metadata editor
		 */
		properties: PropertyEntryData<unknown>[];
		/**
		 * Element containing all property elements
		 */
		propertyListEl: HTMLElement;
		/**
		 * List of all property field editors
		 */
		rendered: MetadataEditorProperty[];
		/**
		 * Set of all selected property editors
		 */
		selectedLines: Set<MetadataEditorProperty>;

		/**
		 * Convert given properties to a serialized object and store in clipboard as obsidian/properties
		 */
		_copyToClipboard(event: ClipboardEvent, properties: MetadataEditorProperty[]): void;
		/**
		 * Uncollapse editor if collapsed and create a new property row
		 */
		addProperty(): void;
		/**
		 * Clear all properties
		 */
		clear(): void;
		/**
		 * Unselect all lines
		 */
		clearSelection(): void;
		/**
		 * Focus on property field with given key
		 */
		focusKey(key: string): void;
		/**
		 * Focus on property
		 */
		focusProperty(property: MetadataEditorProperty): void;
		/**
		 * Focus on property at specified index
		 */
		focusPropertyAtIndex(index: number): void;
		/**
		 * Focus on property with value
		 */
		focusValue(value: string, which: "both" | "end" | "start"): void;
		/**
		 * Handle copy event on selection and serialize properties
		 */
		handleCopy(event: ClipboardEvent): void;
		/**
		 * Handle cut event and serialize and remove properties
		 */
		handleCut(event: ClipboardEvent): void;
		/**
		 * Handle selection of item for drag handling
		 */
		handleItemSelection(event: PointerEvent, property: MetadataEditorProperty): boolean;
		/**
		 * Handle key press event for controlling selection or movement of property up/down
		 */
		handleKeypress(event: KeyboardEvent): void;
		/**
		 * Handle paste event of properties into metadata editor
		 */
		handlePaste(event: ClipboardEvent): void;
		/**
		 * Whether the editor has focus
		 */
		hasFocus(): boolean;
		/**
		 * Whether there is a property that is focused
		 */
		hasPropertyFocused(): boolean;
		/**
		 * Add new properties to the metadata editor and save
		 */
		insertProperties(properties: Record<string, any>): void;
		/**
		 * On loading of the metadata editor, register on metadata type change event
		 */
		onload(): void;
		/**
		 * On vault metadata update, update property render
		 */
		onMetadataTypeChange(property: MetadataEditorProperty): void;
		/**
		 * Remove specified properties from the metadata editor and save, and reset focus if specified
		 */
		removeProperties(properties: MetadataEditorProperty[], reset_focus?: boolean): unknown;
		/**
		 * Reorder the entry to specified index position and save
		 */
		reorderKey(entry: PropertyEntryData<unknown>, index: number): unknown;
		/**
		 * Serialize the properties and save frontmatter
		 */
		save(): void;
		/**
		 * Select all property fields
		 */
		selectAll(): void;
		/**
		 * Mark specified property as selected
		 */
		selectProperty(property: MetadataEditorProperty | undefined, select: boolean): void;
		/**
		 * Convert properties to a serialized object
		 */
		serialize(): Record<string, any>;
		/**
		 * Sets frontmatter as collapsed or uncollapsed
		 */
		setCollapse(collapsed: boolean, x: boolean): void;
		/**
		 * On context menu event on header element, show property menu
		 */
		showPropertiesMenu(event: MouseEvent): void;
		/**
		 * Synchronize data with given properties and re-render them
		 */
		synchronize(data: Record<string, any>): void;
		/**
		 * Toggle collapsed state of the metadata editor
		 */
		toggleCollapse(): void;
	}

	interface MetadataEditorProperty extends Component {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Container element for the metadata editor property
		 */
		containerEl: HTMLElement;
		/**
		 * Entry information for the property
		 */
		entry: PropertyEntryData<unknown>;
		/**
		 * Icon element of the property
		 */
		iconEl: HTMLSpanElement;
		/**
		 * Key value of the property
		 */
		keyEl: HTMLElement;
		/**
		 * Input field for key value of the property
		 */
		keyInputEl: HTMLInputElement;
		/**
		 * Metadata editor the property is attached to
		 */
		metadataEditor: MetadataEditor;
		/**
		 * Widget that handles user input for this property widget type
		 */
		rendered: MetadataWidget | null;
		/**
		 * Info about the inferred and expected property widget given key-value pair
		 */
		typeInfo: { expected: PropertyWidget<unknown>; inferred: PropertyWidget<unknown> };
		/**
		 * Element that contains the value input or widget
		 */
		valueEl: HTMLElement;
		/**
		 * Element containing the displayed warning on malformed property field
		 */
		warningEl: HTMLElement;

		/**
		 * Focus on the key input element
		 */
		focusKey(): void;
		/**
		 * Focus on the property (container element)
		 */
		focusProperty(): void;
		/**
		 * Focus on the value input element
		 */
		focusValue(which?: "both" | "end" | "start"): void;
		/**
		 * Reveal the property menu on click event
		 */
		handleItemClick(event: MouseEvent): void;
		/**
		 * Focus on property on blur event
		 */
		handlePropertyBlur(): void;
		/**
		 * Update key of property and saves, returns false if error
		 */
		handleUpdateKey(key: string): boolean;
		/**
		 * Update value of property and saves
		 */
		handleUpdateValue(value: any): void;
		/**
		 * Loads as draggable property element
		 */
		onload(): void;
		/**
		 * Render property widget based on type
		 */
		renderProperty(entry: PropertyEntryData<unknown>, check_errors?: boolean, use_expected_type?: boolean): void;
		/**
		 * Set the selected class of property
		 */
		setSelected(selected: boolean): void;
		/**
		 * Reveal property selection menu at mouse event
		 */
		showPropertyMenu(event: MouseEvent): void;
	}

	interface MetadataTypeManager extends Events {
		/**
		 * Reference to App
		 */
		app: App;
		/**
		 * Registered properties of the vault
		 */
		properties: Record<string, PropertyInfo>;
		/** @internal Registered type widgets */
		registeredTypeWidgets: Record<PropertyWidgetType, PropertyWidget>;
		/**
		 * Associated widget types for each property
		 */
		types: Record<string, PropertyWidgetType>;

		/**
		 * Get all registered properties of the vault
		 */
		getAllProperties(): Record<string, PropertyInfo>;
		/**
		 * Get assigned widget type for property
		 */
		getAssignedType(property: string): PropertyWidgetType | null;
		/**
		 * Get info for property
		 */
		getPropertyInfo(property: string): PropertyInfo;
		/** @internal Get expected widget type for property and the one inferred from the property value */
		getTypeInfo(arg: { key: string; type: string; value: unknown }): {
			inferred: PropertyWidget;
			expected: PropertyWidget;
		};
		/**
		 * Get all properties with an assigned widget type
		 */
		getTypes(): string[];
		/** @internal Load property types from config */
		loadData(): Promise<void>;
		/** @internal Save property types to config */
		save(): Promise<void>;
		/** @internal Get all properties from metadata cache */
		savePropertyInfo(): void;
		/** @internal Set widget type for property */
		setType(property: string, type: PropertyWidgetType): Promise<void>;
		/** @internal Unset widget type for property */
		unsetType(property: string): Promise<void>;
	}

	interface MetadataWidget {}

	/** @todo Documentation incomplete */
	interface MobileNavbar {
	}

	/** @todo Documentation incomplete */
	interface MobileToolbar {
	}

	interface Modal {
		/** @internal Background applied to application to dim it */
		bgEl: HTMLElement;
		/** @internal Opacity percentage of the background */
		bgOpacity: number;
		/** @internal Whether the background is being dimmed */
		dimBackground: boolean;
		/** @internal Modal container element */
		modalEl: HTMLElement;
		/** @internal Selection logic handler */
		selection: WindowSelection;
		/**
		 * Reference to the global Window object
		 */
		win: Window;

		/** @internal On escape key press close modal */
		onEscapeKey(): void;
		/** @internal On closing of the modal */
		onWindowClose(): void;
		/**
		 * @param opacity Opacity percentage
		 * @internal Set the background opacity of the dimmed background
		 */
		setBackgroundOpacity(opacity: string): this;
		/**
		 * @param content Content to set
		 * @internal Set the content of the modal
		 */
		setContent(content: HTMLElement | string): this;
		/**
		 * @param dim Whether the background should be dimmed
		 * @internal Set whether the background should be dimmed
		 */
		setDimBackground(dim: boolean): this;
		/**
		 * @param title Title to set
		 * @internal Set the title of the modal
		 */
		setTitle(title: string): this;
	}

	interface ObsidianDOM {
		/**
		 * Root element of the application
		 */
		appContainerEl: HTMLElement;
		/**
		 * Child of `appContainerEl` containing the main content of the application
		 */
		horizontalMainContainerEl: HTMLElement;
		/**
		 * Status bar element containing word count among other things
		 */
		statusBarEl: HTMLElement;
		/**
		 * Child of `horizontalMainContainerEl` containing the workspace DOM
		 */
		workspaceEl: HTMLElement;
	}

	/** @todo Documentation incomplete */
	interface ObsidianTouchEvent {
		direction: "x" | "y";
		evt: TouchEvent;
		points: number;
		registerCallback: {
			move: (x: number) => void;
			cancel: () => void;
			finish: (x: number, y: number, z: number) => void;
		};
		startX: number;
		startY: number;
		targetEl: HTMLElement;
		touch: Touch;
		x: number;
		y: number;
	}

	interface PluginManifest {
		/**
		 * Name of the author of the plugin
		 */
		author: string;
		/**
		 * URL to the author's website
		 */
		authorUrl?: string;
		/**
		 * Description of the plugin's functionality
		 */
		description: string;
		/**
		 * Storage location of the plugin relative to the vault root
		 */
		dir?: string;
		/**
		 * URL for funding the author
		 */
		fundingUrl?: string;
		/**
		 * Unique identifier of the plugin
		 */
		id: string;
		/**
		 * Whether the plugin is designed for desktop use only
		 */
		isDesktopOnly?: boolean;
		/**
		 * Minimum Obsidian version compatible with the plugin
		 */
		minAppVersion: string;
		/**
		 * Name of the plugin
		 */
		name: string;
		/**
		 * Version of the plugin
		 */
		version: string;
	}

	interface Plugins {
		/**
		 * Reference to App
		 */
		app: App;
		/**
		 * Set of enabled plugin IDs
		 *
		 * @remark The plugin ids aren't guaranteed to be either active (in `app.plugins.plugins`) or installed (in `app.plugins.manifests`)
		 */
		enabledPlugins: Set<string>;
		/** @internal Plugin ID that is currently being enabled */
		loadingPluginId: string | null;
		/**
		 * Manifests of all the plugins that are installed
		 */
		manifests: Record<string, PluginManifest>;
		/**
		 * Mapping of plugin ID to active plugin instance
		 *
		 * @remark Prefer usage of getPlugin to access a plugin
		 */
		plugins: Record<string, Plugin>;
		/**
		 * Mapping of plugin ID to available updates
		 */
		updates: Map<string, PluginUpdateManifest>;

		/** @internal Check online list for deprecated plugins to automatically disable */
		checkForDeprecations(): Promise<void>;
		/**
		 * Check for plugin updates
		 */
		checkForUpdates(): Promise<void>;
		/**
		 * Unload a plugin by ID
		 */
		disablePlugin(id: string): Promise<void>;
		/**
		 * Unload a plugin by ID and save config for persistence
		 */
		disablePluginAndSave(id: string): Promise<void>;
		/**
		 * Enable a plugin by ID
		 */
		enablePlugin(id: string): Promise<void>;
		/**
		 * Enable a plugin by ID and save config for persistence
		 */
		enablePluginAndSave(id: string): Promise<void>;
		/**
		 * Get a plugin by ID
		 */
		getPlugin(id: string): Plugin | null;
		/**
		 * Get the folder where plugins are stored
		 */
		getPluginFolder(): string;
		/** @internal Load plugin manifests and enable plugins from config */
		initialize(): Promise<void>;
		/**
		 * Install a plugin from a given URL
		 */
		installPlugin(repo: string, version: string, manifest: PluginManifest): Promise<void>;
		/**
		 * Check whether a plugin is deprecated
		 */
		isDeprecated(id: string): boolean;
		/**
		 * Check whether community plugins are enabled
		 */
		isEnabled(): boolean;
		/**
		 * Load a specific plugin's manifest by its folder path
		 */
		loadManifest(path: string): Promise<void>;
		/** @internal Load all plugin manifests from plugin folder */
		loadManifests(): Promise<void>;
		/**
		 * Load a plugin by its ID
		 */
		loadPlugin(id: string): Promise<Plugin>;
		/** @internal */
		onRaw(e: unknown): void;
		/** @internal - Save current plugin configs */
		saveConfig(): Promise<void>;
		/** @internal Toggle whether community plugins are enabled */
		setEnable(enabled: boolean): Promise<void>;
		/**
		 * Uninstall a plugin by ID
		 */
		uninstallPlugin(id: string): Promise<void>;
		/**
		 * Unload a plugin by ID
		 */
		unloadPlugin(id: string): Promise<void>;
	}

	interface PluginUpdateManifest {
		/**
		 * Manifest of the plugin
		 */
		manifest: PluginManifest;
		/**
		 * Repository of the plugin
		 */
		repo: string;
		/**
		 * New version of the plugin
		 */
		version: string;
	}

	interface PopoverSuggest<T> {
		/**
		 * Whether the suggestion popup is currently open and visible
		 */
		isOpen: boolean;
		/**
		 * Suggestion container element
		 */
		suggestEl: HTMLElement;
		/**
		 * Handles selection and rendering of the suggestions
		 */
		suggestions: SuggestionContainer<T>;
	}

	interface PositionedReference extends Reference {
		/**
		 * Position of the reference in the file
		 */
		position: {
			start: Loc;
			end: Loc;
		};
	}

	interface PropertyEntryData<T> {
		/**
		 * Property key
		 */
		key: string;
		/**
		 * Property widget type
		 */
		type: string;
		/**
		 * Property value
		 */
		value: T;
	}

	interface PropertyInfo {
		/**
		 * Usage count of property
		 */
		count: number;
		/**
		 * Name of property
		 */
		name: string;
		/**
		 * Type of property
		 */
		type: string;
	}

	interface PropertyRenderContext {
		/**
		 * Reference to the app
		 */
		app: App;
		/**
		 * Callback called on property field unfocus
		 */
		blur: () => void;
		/**
		 * Key of the property field
		 */
		key: string;
		/**
		 * Reference to the metadata editor
		 */
		metadataEditor: MetadataEditor;
		/**
		 * Callback called on property value change
		 */
		onChange: () => void;
		/**
		 * Determine the source path of current context
		 */
		sourcePath: string;
	}

	interface PropertyWidget<T> {
		/**
		 * Lucide-dev icon associated with the widget
		 */
		icon: string;
		/**
		 * Returns the I18N name of the widget
		 */
		name: () => string;
		/**
		 * Reserved keys for the widget
		 */
		reservedKeys?: string[];
		/**
		 * Identifier for the widget
		 */
		type: string;

		/**
		 * Get the default value for the property widget
		 */
		default(): T;
		/**
		 * Render function for the widget on field container given context and data
		 */
		render(containerEl: HTMLElement, data: PropertyEntryData<T>, context: PropertyRenderContext): Component | void;
		/**
		 * Validate whether the input value to the widget is correct
		 */
		validate(value: T): boolean;
	}

	/** @todo Documentation incomplete */
	interface ReadViewRenderer {
		addBottomPadding: boolean;
		asyncSections: unknown[];
		lastRender: number;
		lastScroll: number;
		lastText: string;
		previewEl: HTMLElement;
		pusherEl: HTMLElement;
		recycledSections: unknown[];
		rendered: unknown[];
		sections: RendererSection[];
		text: string;

		clear(): void;
		parseAsync(): void;
		parseSync(): void;
		queueRender(): void;
		set(text: string): void;
	}

	interface RecentFileTracker {
		/**
		 * List of last opened file paths, limited to 50
		 */
		lastOpenFiles: string[];
		/**
		 * Reference to Vault
		 */
		vault: Vault;
		/**
		 * Reference to Workspace
		 */
		workspace: Workspace;

		/** @internal */
		collect(file: TFile): void;
		/**
		 * Returns the last 10 opened files
		 */
		getLastOpenFiles(): string[];
		/**
		 * Get last n files of type (defaults to 10)
		 */
		getRecentFiles(arg?: {
			showMarkdown: boolean;
			showCanvas: boolean;
			showNonImageAttachments: boolean;
			showImages: boolean;
			maxCount: number;
		}): string[];
		/**
		 * Set the last opened files
		 */
		load(savedFiles: string[]): void;
		/** @internal On file create, save file to last opened files */
		onFileCreated(file: TFile): void;
		/** @internal On file open, save file to last opened files */
		onFileOpen(prevFile: TFile, file: TFile): void;
		/** @internal On file rename, update file path in last opened files */
		onRename(file: TFile, oldPath: string): void;
		/** @internal Get last opened files */
		serialize(): string[];
	}

	/** @todo Documentation incomplete */
	interface RendererSection {
		el: HTMLElement;
		html: string;
		rendered: boolean;
	}

	/** @todo Documentation incomplete */
	interface Runnable {
		cancelled: boolean;
		onCancel: null | (() => void);
		onStart: null | (() => void);
		onStop: null | (() => void);
		running: boolean;

		cancel(): void;
		isCancelled(): boolean;
		isRunning(): boolean;
		start(): void;
		stop(): void;
	}

	interface Scope {
		/** @internal - Callback to execute when scope is matched */
		cb: (() => boolean) | undefined;
		/**
		 * Overridden keys that exist in this scope
		 */
		keys: KeyScope[];
		/** @internal Scope that this scope is a child of */
		parent: Scope | undefined;
		/** @internal */
		tabFocusContainer: HTMLElement | null;

		/**
		 * @param event - Keyboard event
		 * @param keypress - Pressed key information
		 * @internal Execute keypress within this scope
		 */
		handleKey(event: KeyboardEvent, keypress: KeymapInfo): unknown;
		/**
		 * @deprecated - Executes same functionality as `Scope.register`
		 * @internal
		 */
		registerKey(modifiers: Modifier[], key: string | null, func: KeymapEventListener): KeymapEventHandler;
		/** @internal */
		setTabFocusContainer(container: HTMLElement): void;
	}

	interface SearchCursor {
		/**
		 * Current editor search position
		 */
		current(): { from: EditorPosition; to: EditorPosition };
		/**
		 * All search results
		 */
		findAll(): { from: EditorPosition; to: EditorPosition }[];
		/**
		 * Next editor search position
		 */
		findNext(): { from: EditorPosition; to: EditorPosition };
		/**
		 * Previous editor search position
		 */
		findPrevious(): { from: EditorPosition; to: EditorPosition };
		/**
		 * Replace current search result with specified text
		 *
		 * @remark origin is used by CodeMirror to determine which component was responsible for the change
		 */
		replace(replacement: string, origin: string): void;
		/**
		 * Replace all search results with specified text
		 */
		replaceAll(replacement: string, origin: string): void;
	}

	interface SerializedWorkspace {
		/**
		 * Last active leaf
		 */
		active: string;
		/**
		 * Last opened files
		 */
		lastOpenFiles: string[];
		/**
		 * Left opened leaf
		 */
		left: LeafEntry;
		/**
		 * Left ribbon
		 */
		leftRibbon: { hiddenItems: Record<string, boolean> };
		/**
		 * Main (center) workspace leaf
		 */
		main: LeafEntry;
		/**
		 * Right opened leaf
		 */
		right: LeafEntry;
	}

	interface Setting extends Modal {
		/**
		 * Current active tab of the settings modal
		 */
		activateTab: SettingTab;
		/** @internal Container element containing the community plugins */
		communityPluginTabContainer: HTMLElement;
		/** @internal Container element containing the community plugins header */
		communityPluginTabHeaderGroup: HTMLElement;
		/**
		 * Previously opened tab ID
		 */
		lastTabId: string;
		/**
		 * List of all plugin tabs (core and community, ordered by precedence)
		 */
		pluginTabs: SettingTab[];
		/**
		 * List of all core settings tabs (editor, files & links, ...)
		 */
		settingTabs: SettingTab[];
		/** @internal Container element containing the core settings */
		tabContainer: HTMLElement;
		/** @internal Container for currently active settings tab */
		tabContentContainer: HTMLElement;
		/** @internal Container for all settings tabs */
		tabHeadersEl: HTMLElement;

		/**
		 * @param tab Tab to add
		 * @internal Add a new plugin tab to the settings modal
		 */
		addSettingTab(tab: SettingTab): void;
		/** @internal Closes the currently active tab */
		closeActiveTab(): void;
		/**
		 * @param tab Tab to check
		 * @internal Check whether tab is a plugin tab
		 */
		isPluginSettingTab(tab: SettingTab): boolean;
		/**
		 * @param tab Tab to open
		 * @internal Open a specific tab by tab reference
		 */
		openTab(tab: SettingTab): void;
		/**
		 * Open a specific tab by ID
		 *
		 * @param id ID of the tab to open
		 */
		openTabById(id: string): void;
		/**
		 * @param tab Tab to remove
		 * @internal Remove a plugin tab from the settings modal
		 */
		removeSettingTab(tab: SettingTab): void;
		/**
		 * @param tab Tab to update the title to
		 * @internal Update the title of the modal
		 */
		updateModalTitle(tab: SettingTab): void;
		/** @internal Update a tab section */
		updatePluginSection(): void;
	}

	interface SettingTab {
		/**
		 * Unique ID of the tab
		 */
		id: string;
		/**
		 * Reference to installed plugins element
		 *
		 * @if Tab is the community plugins tab
		 */
		installedPluginsEl?: HTMLElement;
		/**
		 * Sidebar name of the tab
		 */
		name: string;
		/**
		 * Sidebar navigation element of the tab
		 */
		navEl: HTMLElement;
		/**
		 * Reference to the plugin that initialised the tab
		 *
		 * @if Tab is a plugin tab
		 */
		plugin?: Plugin;
		/**
		 * Reference to the settings modal
		 */
		setting: Setting;
	}

	interface StateHistory {
		/**
		 * Ephemeral cursor state within Editor of leaf
		 */
		eState: {
			cursor: EditorRange;
			scroll: number;
		};
		/**
		 * Icon of the leaf
		 */
		icon?: string;
		/**
		 * History of previous and future states of leaf
		 */
		leafHistory?: {
			backHistory: StateHistory[];
			forwardHistory: StateHistory[];
		};
		/**
		 * Id of parent to which the leaf belonged
		 */
		parentId?: string;
		/**
		 * Id of root to which the leaf belonged
		 */
		rootId?: string;
		/**
		 * Last state of the leaf
		 */
		state: ViewState;
		/**
		 * Title of the leaf
		 */
		title?: string;
	}

	interface SuggestionContainer<T> {
		/**
		 * Which suggestions should be picked from
		 */
		chooser: EditorSuggest<T>;
		/**
		 * Pop-up element that displays the suggestions
		 */
		containerEl: HTMLElement;
		/**
		 * The currently focused item
		 */
		selectedItem: number;
		/**
		 * List of all possible suggestions as elements
		 */
		suggestions: HTMLElement[];
		/**
		 * List of all possible suggestions as data
		 */
		values: SearchResult[];
		/**
		 * Amount of suggestions that can be displayed at once within containerEl
		 */
		get numVisibleItems(): number;
		/**
		 * Height in pixels of the selected item
		 */
		get rowHeight(): number;

		/**
		 * Add an empty message with provided text
		 */
		addMessage(text: string): HTMLElement;
		/**
		 * Add suggestion to container
		 */
		addSuggestion(suggestion: SearchResult): void;
		/**
		 * Set selected item to one specified by index, if keyboard navigation, force scroll into view
		 *
		 * @remark Prefer setSelectedItem, which clamps the index to within suggestions array
		 */
		forceSetSelectedItem(index: number, event: Event): void;
		/**
		 * Move selected item to next suggestion
		 */
		moveDown(event: KeyboardEvent): boolean;
		/**
		 * Move selected item to previous suggestion
		 */
		moveUp(event: KeyboardEvent): boolean;
		/**
		 * Process click on suggestion item
		 */
		onSuggestionClick(event: MouseEvent, element: HTMLElement): void;
		/**
		 * Process hover on suggestion item
		 */
		onSuggestionMouseover(event: MouseEvent, element: HTMLElement): unknown;
		/**
		 * Move selected item to the one in the next 'page' (next visible block)
		 */
		pageDown(event: KeyboardEvent): boolean;
		/**
		 * Move selected item to the one in the previous 'page' (previous visible block)
		 */
		pageUp(event: KeyboardEvent): boolean;
		/**
		 * Set selected item to one specified by index, invokes forceSetSelectedItem
		 */
		setSelectedItem(index: number, event: Event): void;
		/**
		 * Empties original container and adds multiple suggestions
		 */
		setSuggestions(suggestions: SearchResult[]): void;
		/**
		 * Use currently selected suggestion as the accepted one
		 */
		useSelectedItem(event: Event): boolean;
	}

	/** @todo Documentation incomplete */
	interface TableCell {
		col: number;
		contentEl: HTMLElement;
		dirty: boolean;
		el: HTMLElement;
		end: number;
		padEnd: number;
		padStart: number;
		row: number;
		start: number;
		table: TableCellEditor;
		text: string;
	}

	/** @todo Documentation incomplete */
	class TableCellEditor extends MarkdownBaseView implements TableCell {}

	/** @todo Documentation incomplete */
	interface TableEditor {}

	interface TAbstractFile {
		/**
		 * Whether the file or folder is being deleted
		 */
		deleted: boolean;
	}

	interface TextFileView {
		/**
		 * Whether current file is dirty (different from saved contents)
		 */
		dirty: boolean;
		/**
		 * Whether editor should be rendered as plaintext
		 */
		isPlaintext: boolean;
		/**
		 * The data that was last saved
		 */
		lastSavedData: null | string;
		/**
		 * Whether on saving, the file should be saved again (for dirtyness checks)
		 */
		saveAgain: boolean;
		/**
		 * Whether the file is currently saving
		 */
		saving: boolean;
	}

	interface TFile {
		/**
		 * Whether the file is being saved
		 */
		saving: boolean;
	}

	interface ThemeManifest {
		/**
		 * Name of the author of the theme
		 */
		author: string;
		/**
		 * URL to the author's website
		 */
		authorUrl?: string;
		/**
		 * Storage location of the theme relative to the vault root
		 */
		dir: string;
		/**
		 * URL for funding the author
		 */
		fundingUrl?: string;
		/**
		 * Minimum Obsidian version compatible with the theme
		 */
		minAppVersion: string;
		/**
		 * Name of the theme
		 */
		name: string;
		/**
		 * Version of the theme
		 *
		 * @remark Defaults to "0.0.0" if no theme manifest was provided in the repository
		 */
		version: "0.0.0" | string;
	}

	/** @todo Documentation incomplete */
	interface Token extends EditorRange {
		text: string;
		type: "tag" | "external-link" | "internal-link";
	}

	interface Tree<T> {
		/**
		 * Currently active item in tree view
		 */
		activeDom: TreeNode<T> | null;
		/**
		 * Reference to App
		 */
		app: App;
		/**
		 * Container element of the tree view
		 */
		containerEl: HTMLElement;
		/**
		 * Currently focused item in tree view
		 */
		focusedItem: TreeNode<T> | null;
		/**
		 * Gets the ID of a tree item given its Node
		 */
		getNodeId: (node: TreeNode<T>) => string | undefined;
		/**
		 * Handle collapsing of all nodes
		 */
		handleCollapseAll: () => void;
		/**
		 * Handle deletion of selected nodes
		 */
		handleDeleteSelectedItems: () => void | undefined;
		/**
		 * Handle renaming of focused item
		 */
		handleRenameFocusedItem: () => void;
		/**
		 * ID of the view the tree is associated with
		 */
		id: string;
		/** @internal Facilitates rendering of tree view */
		infinityScroll: InfinityScroll;
		/**
		 * Whether all items in the tree are collapsed
		 */
		isAllCollapsed: boolean;
		/**
		 * Whether tree items should default to collapsed state
		 */
		prefersCollapsed: boolean;
		/**
		 * Request saving of the current fold states
		 */
		requestSaveFolds: () => void;
		/**
		 * Key scope for tree view
		 */
		scope: Scope;
		/**
		 * Currently selected items in tree view
		 */
		selectedDoms: Set<TreeNode<T>>;
		/**
		 * The view the tree is associated with
		 */
		view: View;
		/**
		 * Root item of the tree view
		 */
		get root(): TreeNode<T>;

		/**
		 * Change the focused item to the next item in specified direction
		 */
		changeFocusedItem(direction: "forwards" | "backwards"): void;
		/**
		 * Unselect all selected items in the tree view
		 */
		clearSelectedDoms(): void;
		/**
		 * Mark tree item as deselected
		 */
		deselectItem(node: TreeNode<T>): void;
		/**
		 * Get the local storage key for the saved tree view folds
		 */
		getFoldKey(): string;
		/**
		 * Handle selection of tree item via keyboard event
		 */
		handleItemSelection(event: MouseEvent, node: TreeNode<T>): void;
		/** @internal Registers all keyboard actions to the tree view keyscope */
		initializeKeyboardNav(): void;
		/**
		 * Check whether item is a valid tree item
		 */
		isItem(node: TreeNode<T> | undefined): boolean;
		/**
		 * Load the saved fold states of the tree view from local storage
		 */
		loadFolds(): void;
		/**
		 * Handle keyboard event for moving/selecting tree item below
		 */
		onKeyArrowDown(event: KeyboardEvent): void;
		/**
		 * Handle keyboard event for moving through the hierarchy of tree items (and/or folding/unfolding)
		 */
		onKeyArrowLeft(event: KeyboardEvent): void;
		/**
		 * Handle keyboard event for moving through the hierarchy of tree items (and/or folding/unfolding)
		 */
		onKeyArrowRight(event: KeyboardEvent): void;
		/**
		 * Handle keyboard event for moving/selecting tree item above
		 */
		onKeyArrowUp(event: KeyboardEvent): void;
		/**
		 * Handle keyboard event for opening tree item
		 */
		onKeyOpen(event: KeyboardEvent): void;
		/** @internal Update scroll representation on resize */
		onResize(): void;
		/**
		 * Save the current fold states of the tree view to local storage
		 */
		saveFolds(): void;
		/**
		 * Mark tree item as selected
		 */
		selectItem(node: TreeNode<T>): void;
		/**
		 * Set all items in the tree view to be collapsed or expanded
		 */
		setCollapseAll(collapse: boolean): void;
		/**
		 * Set the focused item in the tree view
		 */
		setFocusedItem(node: TreeNode<T>, scrollIntoView?: boolean): void;
		/**
		 * (Un)Collapse all items in the tree view
		 */
		toggleCollapseAll(): void;
	}

	interface Vault {
		/**
		 * Low-level file system adapter for read and write operations
		 *
		 * @tutorial Can be used to read binaries, or files not located directly within the vault
		 */
		adapter: DataAdapter;
		/** @internal Max size of the cache in bytes */
		cacheLimit: number;
		/**
		 * Object containing all config settings for the vault (editor, appearance, ... settings)
		 *
		 * @remark Prefer usage of `app.vault.getConfig(key)` to get settings, config does not contain settings that were not changed from their default value
		 */
		config: AppVaultConfig;
		/** @internal Timestamp of the last config change */
		configTs: number;
		/** @internal Mapping of path to Obsidian folder or file structure */
		fileMap: Record<string, TAbstractFile>;

		/** @internal Add file as child/parent to respective folders */
		addChild(file: TAbstractFile): void;
		/** @internal Check whether new file path is available */
		checkForDuplicate(file: TAbstractFile, newPath: string): boolean;
		/** @internal Check whether path has valid formatting (no dots/spaces at end, ...) */
		checkPath(path: string): boolean;
		/** @internal Remove a vault config file */
		deleteConfigJson(configFile: string): Promise<void>;
		/**
		 * Check whether a file exists in the vault
		 */
		exists(file: TAbstractFile, senstive?: boolean): Promise<boolean>;
		/** @internal */
		generateFiles(e: AsyncGenerator<TFile>, t: boolean): Promise<void>;
		/**
		 * Get an abstract file by path, insensitive to case
		 */
		getAbstractFileByPathInsensitive(path: string): TAbstractFile | null;
		/** @internal Get path for file that does not conflict with other existing files */
		getAvailablePath(path: string, extension: string): string;
		/** @internal Get path for attachment that does not conflict with other existing files */
		getAvailablePathForAttachments(filename: string, file: TAbstractFile, extension: string): string;
		/**
		 * Get value from config by key
		 *
		 * @param string Key of config value
		 * @remark Default value will be selected if config value was not manually changed
		 */
		getConfig(string: ConfigItem): unknown;
		/**
		 * Get path to config file (relative to vault root)
		 */
		getConfigFile(configFile: string): string;
		/**
		 * Get direct parent of file
		 *
		 * @param file File to get parent of
		 */
		getDirectParent(file: TAbstractFile): TFolder | null;
		/** @internal Check whether files map cache is empty */
		isEmpty(): boolean;
		/** @internal Iterate over the files and read them */
		iterateFiles(files: TFile[], cachedRead: boolean): void;
		/** @internal Load vault adapter */
		load(): Promise<void>;
		/**
		 * Called whenever any of Obsidian's settings are changed
		 *
		 * @remark Does *not* trigger when a particular plugin's settings are changed, for that, you could monkey-patch the `saveSettings` method of a plugin instance
		 */
		on(name: "config-changed", callback: () => void, ctx?: unknown): EventRef;
		/** @internal Triggered whenever a file gets loaded internally */
		on(name: "raw", callback: (path: string) => void, ctx?: unknown): EventRef;
		/** @internal Listener for all events on the vault */
		onChange(eventType: string, path: string, x: unknown, y: unknown): void;
		/**
		 * Read a config file from the vault and parse it as JSON
		 *
		 * @param config Name of config file
		 */
		readConfigJson(config: string): Promise<null | object>;
		/**
		 * Read a config file (full path) from the vault and parse it as JSON
		 *
		 * @param path Full path to config file
		 */
		readJson(path: string): Promise<null | object>;
		/**
		 * Read a plugin config file (full path relative to vault root) from the vault and parse it as JSON
		 *
		 * @param path Full path to plugin config file
		 */
		readPluginData(path: string): Promise<null | object>;
		/**
		 * Read a file from the vault as a string
		 *
		 * @param path Path to file
		 */
		readRaw(path: string): Promise<string>;
		/** @internal Reload all config files */
		reloadConfig(): void;
		/**
		 * @param file File to remove
		 * @internal Remove file as child/parent from respective folders
		 */
		removeChild(file: TAbstractFile): void;
		/** @internal Debounced function for saving config */
		requestSaveConfig(): void;
		/**
		 * @param path Path to file
		 * @internal Get the file by absolute path
		 */
		resolveFilePath(path: string): TAbstractFile | null;
		/** @internal Get the file by Obsidian URL */
		resolveFileUrl(url: string): TAbstractFile | null;
		/** @internal Save app and appearance configs to disk */
		saveConfig(): Promise<void>;
		/**
		 * Set value of config by key
		 *
		 * @param key Key of config value
		 * @param value Value to set
		 */
		setConfig(key: ConfigItem, value: unknown): void;
		/**
		 * Set where the config files are stored (relative to vault root)
		 *
		 * @param configDir Path to config files
		 */
		setConfigDir(configDir: string): void;
		/** @internal Set file cache limit */
		setFileCacheLimit(limit: number): void;
		/** @internal Load all config files into memory */
		setupConfig(): Promise<void>;
		/**
		 * Write a config file to disk
		 *
		 * @param config Name of config file
		 * @param data Data to write
		 */
		writeConfigJson(config: string, data: object): Promise<void>;
		/**
		 * Write a config file (full path) to disk
		 *
		 * @param path Full path to config file
		 * @param data Data to write
		 * @param pretty Whether to insert tabs or spaces
		 */
		writeJson(path: string, data: object, pretty?: boolean): Promise<void>;
		/**
		 * Write a plugin config file (path relative to vault root) to disk
		 */
		writePluginData(path: string, data: object): Promise<void>;
	}

	/** @todo Documentation incomplete */
	interface View {
		/**
		 * Whether the leaf may close the view
		 */
		closeable: boolean;
	}

	interface ViewRegistry extends Events {
		/**
		 * Mapping of file extensions to view type
		 */
		typeByExtension: Record<string, string>;
		/**
		 * Mapping of view type to view constructor
		 */
		viewByType: Record<string, (leaf: WorkspaceLeaf) => View>;

		/**
		 * Get the view type associated with a file extension
		 *
		 * @param extension File extension
		 */
		getTypeByExtension(extension: string): string;
		/**
		 * Get the view constructor associated with a view type
		 */
		getViewCreatorByType(type: string): (leaf: WorkspaceLeaf) => View;
		/**
		 * Check whether a view type is registered
		 */
		isExtensionRegistered(extension: string): boolean;
		/**
		 * Called when a view of type has been registered into the registry
		 */
		on(name: "view-registered", callback: (type: string) => void): EventRef;
		/**
		 * Called when a view of type has been unregistered from the registry
		 */
		on(name: "view-unregistered", callback: (type: string) => void): EventRef;
		/**
		 * Called when the file extensions mapping has been updated
		 */
		on(name: "extensions-updated", callback: () => void): EventRef;
		/**
		 * Register a view type for a file extension
		 *
		 * @param extension File extension
		 * @param type View type
		 * @remark Prefer registering the extension via the Plugin class
		 */
		registerExtensions(extension: string[], type: string): void;
		/**
		 * Register a view constructor for a view type
		 */
		registerView(type: string, viewCreator: (leaf: WorkspaceLeaf) => View): void;
		/**
		 * Register a view and its associated file extensions
		 */
		registerViewWithExtensions(
			extensions: string[],
			type: string,
			viewCreator: (leaf: WorkspaceLeaf) => View,
		): void;
		/**
		 * Unregister extensions for a view type
		 */
		unregisterExtensions(extension: string[]): void;
		/**
		 * Unregister a view type
		 */
		unregisterView(type: string): void;
	}

	interface WeakMapWrapper<K extends object, V> extends WeakMap<K, V> {
		map: WeakMap<K, V>;
	}

	class WidgetEditorView extends EmbeddedEditorView {
		constructor(context: EmbedContext, file: TFile, path?: string);
		/**
		 * Data after reference
		 */
		after: string;
		/**
		 * Data before reference
		 */
		before: string;
		/**
		 * Full file contents
		 */
		data: string;
		/**
		 * File being currently renamed
		 */
		fileBeingRenamed: null | TFile;
		/**
		 * Current heading
		 */
		heading: string;
		/**
		 * Indent
		 */
		indent: string;
		/**
		 * Inline title element
		 */
		inlineTitleEl: HTMLElement;
		/**
		 * Full inline content string
		 */
		lastSavedData: null | string;
		/**
		 * Whether embedding should be saved twice on save
		 */
		saveAgain: boolean;
		/**
		 * Whether the widget is currently saving
		 */
		saving: boolean;
		/**
		 * Subpath reference of the path
		 */
		subpath: string;
		/**
		 * Whether the subpath was not found in the cache
		 */
		subpathNotFound: boolean;

		/**
		 * Push/pop current scope
		 */
		applyScope(scope: Scope): void;
		/**
		 * Get the current folds of the editor
		 */
		getFoldInfo(): null | FoldInfo;
		/**
		 * Splice incoming data at according to subpath for correct reference, then update heading and render
		 */
		loadContents(data: string, cache: CachedMetadata): void;
		/**
		 * Load file from cache based on stored path
		 */
		loadFile(): Promise<void>;
		/**
		 * Load file and check if data is different from last saved data, then loads contents
		 */
		loadFileInternal(data: string, cache?: CachedMetadata): void;
		/**
		 * Update representation on file finished updating
		 */
		onFileChanged(file: TFile, data: string, cache: CachedMetadata): void;
		/**
		 * Update representation on file rename
		 */
		onFileRename(file: TAbstractFile, oldPath: string): void;
		/**
		 * On loading widget, register vault change and rename events
		 */
		onload(): void;
		/**
		 * Save fold made in the editor to foldmanager
		 */
		onMarkdownFold(): void;
		/** @internal On change of editor title element */
		onTitleChange(element: HTMLElement): void;
		/** @internal On keypress on editor title element */
		onTitleKeydown(event: KeyboardEvent): void;
		/** @internal On pasting on editor title element */
		onTitlePaste(element: HTMLElement, event: ClipboardEvent): void;
		/**
		 * On unloading widget, unload component and remove scope
		 */
		onunload(): void;
		/**
		 * Save changes made in editable widget
		 */
		save(data: string, delayed?: boolean): Promise<void>;
		/**
		 * On blur widget, save title
		 */
		saveTitle(element: HTMLElement): void;
		/**
		 * Show preview of widget
		 */
		showPreview(show?: boolean): void;
	}

	/** @todo Documentation incomplete */
	interface WindowSelection {
		focusEl: HTMLElement;
		range: Range;
		win: Window;
	}

	interface Workspace {
		/**
		 * Currently active tab group
		 */
		activeTabGroup: WorkspaceTabs;
		/**
		 * Reference to App
		 */
		app: App;
		/** @internal */
		backlinkInDocument?: unknown;
		/**
		 * Registered CodeMirror editor extensions, to be applied to all CM instances
		 */
		editorExtensions: Extension[];
		/** @internal */
		editorSuggest: {
			currentSuggest?: EditorSuggest<unknown>;
			suggests: EditorSuggest<unknown>[];
		};
		/** @internal */
		floatingSplit: WorkspaceSplit;
		/** @internal */
		hoverLinkSources: Record<string, HoverLinkSource>;
		/**
		 * Last opened file in the vault
		 */
		lastActiveFile: TFile;
		/** @internal */
		lastTabGroupStacked: boolean;
		/** @internal */
		layoutItemQueue: unknown[];
		/**
		 * Workspace has finished loading
		 */
		layoutReady: boolean;
		/** @internal */
		leftSidebarToggleButtonEl: HTMLElement;
		/** @internal Array of renderCallbacks */
		mobileFileInfos: unknown[];
		/** @internal */
		onLayoutReadyCallbacks?: unknown;
		/**
		 * Protocol handlers registered on the workspace
		 */
		protocolHandlers: Map<string, ObsidianProtocolHandler>;
		/**
		 * Tracks last opened files in the vault
		 */
		recentFileTracker: RecentFileTracker;
		/** @internal */
		rightSidebarToggleButtonEl: HTMLElement;
		/** @internal Keyscope registered to the vault */
		scope: Scope;
		/**
		 * List of states that were closed and may be reopened
		 */
		undoHistory: StateHistory[];

		/** @internal Change active leaf and trigger leaf change event */
		activeLeafEvents(): void;
		/** @internal Add file to mobile file info */
		addMobileFileInfo(file: unknown): void;
		/** @internal Clear layout of workspace and destruct all leaves */
		clearLayout(): Promise<void>;
		/**
		 * @param tabs Tab group to create leaf in
		 * @internal Create a leaf in the selected tab group or last used tab group
		 */
		createLeafInTabGroup(tabs?: WorkspaceTabs): WorkspaceLeaf;
		/**
		 * @param leaf Leaf entry to deserialize
		 * @param ribbon Whether the leaf belongs to the left or right ribbon
		 * @internal Deserialize workspace entries into actual Leaf objects
		 */
		deserializeLayout(leaf: LeafEntry, ribbon?: "left" | "right"): Promise<WorkspaceLeaf>;
		/**
		 * @param type View type of leaf
		 * @param ribbon Side ribbon to reveal leaf in
		 * @param viewstate Open state of leaf
		 * @internal Reveal leaf in side ribbon with specified view type and state
		 */
		ensureSideLeaf(type: string, ribbon: "left" | "right", viewstate: OpenViewState): void;
		/**
		 * Get active file view if exists
		 */
		getActiveFileView(): FileView | null;
		/** @deprecated Use `getActiveViewOfType` instead */
		getActiveLeafOfViewType<T extends View>(type: Constructor<T>): T | null;
		/**
		 * Get adjacent leaf in specified direction
		 *
		 * @remark Potentially does not work
		 */
		getAdjacentLeafInDirection(
			leaf: WorkspaceLeaf,
			direction: "top" | "bottom" | "left" | "right",
		): WorkspaceLeaf | null;
		/** @internal Get the direction where the leaf should be dropped on dragevent */
		getDropDirection(
			e: DragEvent,
			rect: DOMRect,
			directions: ["left", "right"],
			leaf: WorkspaceLeaf,
		): "left" | "right" | "top" | "bottom" | "center";
		/**
		 * @param e Drag event
		 * @internal Get the leaf where the leaf should be dropped on dragevent
		 */
		getDropLocation(e: DragEvent): WorkspaceLeaf | null;
		/**
		 * Get the workspace split for the currently focused container
		 */
		getFocusedContainer(): WorkspaceSplit;
		getLeavesOfType(viewType: "file-explorer"): FileExplorerLeaf[];
		/**
		 * Get n last opened files of type (defaults to 10)
		 */
		getRecentFiles(arg?: {
			showMarkdown: boolean;
			showCanvas: boolean;
			showNonImageAttachments: boolean;
			showImages: boolean;
			maxCount: number;
		}): string[];
		/**
		 * Get leaf in the side ribbon/dock and split if necessary
		 *
		 * @param sideRibbon Side ribbon to get leaf from
		 * @param split Whether to split the leaf if it does not exist
		 */
		getSideLeaf(sideRibbon: WorkspaceSidedock | WorkspaceMobileDrawer, split: boolean): WorkspaceLeaf;
		/** @internal */
		handleExternalLinkContextMenu(menu: Menu, linkText: string): void;
		/** @internal */
		handleLinkContextMenu(menu: Menu, linkText: string, sourcePath: string): void;
		/** @internal Check if leaf has been attached to the workspace */
		isAttached(leaf?: WorkspaceLeaf): boolean;
		/**
		 * Iterate the leaves of a split
		 */
		iterateLeaves(split: WorkspaceSplit, callback: (leaf: WorkspaceLeaf) => unknown): void;
		/**
		 * Iterate the tabs of a split till meeting a condition
		 */
		iterateTabs(tabs: WorkspaceSplit | WorkspaceSplit[], cb: (leaf: WorkspaceLeaf) => boolean): boolean;
		/** @internal Load workspace from disk and initialize */
		loadLayout(): Promise<void>;
		/**
		 * @internal Triggers when user hovers over any note link element (file explorer, editor, ...)
		 * @remark Used for preparing (Ctrl) hover previews
		 */
		on(name: "hover-link", callback: (event: HoverLinkEvent) => void, ctx?: unknown): EventRef;
		/** @internal Called whenever user opens tab group menu (contains e.g. stacked tabs button) */
		on(name: "tab-group-menu", callback: (tabMenu: Menu, tabsLeaf: WorkspaceTabs) => void, ctx?: unknown): EventRef;
		/** @internal Triggers when user swipes open left/right sidebar */
		on(name: "swipe", callback: (touchEvents: ObsidianTouchEvent[]) => void, ctx?: unknown): EventRef;
		/**
		 * Triggers when workspace layout is loaded
		 *
		 * @remark Prefer usage of onLayoutReady instead
		 */
		on(name: "layout-ready", callback: () => void, ctx?: unknown): EventRef;
		/** @internal Triggers when user right-clicks on external URL in editor */
		on(name: "url-menu", callback: (menu: Menu, url: string) => void, ctx?: unknown): EventRef;
		/**
		 * Triggers when user clicks on 'N results' button in search view
		 */
		on(
			name: "search:results-menu",
			callback: (menu: Menu, search: GlobalSearchLeaf) => void,
			ctx?: unknown,
		): EventRef;
		/** @internal Called when user shares text on mobile */
		on(name: "receive-text-menu", callback: (menu: Menu, x: unknown) => void, ctx?: unknown): EventRef;
		/** @internal Called when user shares files on mobile */
		on(name: "receive-files-menu", callback: (menu: Menu, x: unknown) => void, ctx?: unknown): EventRef;
		/**
		 * Triggers when the user opens a context menu on a selection of multiple nodes in the canvas
		 */
		on(
			name: "canvas:selection-menu",
			callback: (menu: Menu, canvasView: CanvasView) => void,
			ctx?: unknown,
		): EventRef;
		/**
		 * Triggers when the user opens a context menu on a single node in the canvas
		 */
		on(name: "canvas:node-menu", callback: (menu: Menu, node: CanvasNode) => void, ctx?: unknown): EventRef;
		/**
		 * Triggers when the user drops edge connection to empty space in the canvas
		 */
		on(
			name: "canvas:node-connection-drop-menu",
			callback: (menu: Menu, originalNode: CanvasNode, connection: CanvasConnection) => void,
			ctx?: unknown,
		): EventRef;
		/**
		 * Triggers when the user opens a context menu on a connection in the canvas
		 */
		on(
			name: "canvas:edge-menu",
			callback: (menu: Menu, connection: CanvasConnection) => void,
			ctx?: unknown,
		): EventRef;
		/** @internal Handles drag event on leaf */
		onDragLeaf(e: DragEvent, leaf: WorkspaceLeaf): void;
		/** @internal Handles layout change and saves layout to disk */
		onLayoutChange(leaf?: WorkspaceLeaf): void;
		/** @internal */
		onLinkContextMenu(args: unknown[]): void;
		/** @internal */
		onQuickPreview(args: unknown[]): void;
		/** @internal */
		onResize(): void;
		/** @internal */
		onStartLink(leaf: WorkspaceLeaf): void;
		/**
		 * Open a leaf in a popup window
		 *
		 * @remark Prefer usage of `app.workspace.openPopoutLeaf`
		 */
		openPopout(data?: WorkspaceWindowInitData): WorkspaceWindow;
		/** @internal Push leaf change to history */
		pushUndoHistory(leaf: WorkspaceLeaf, parentID: string, rootID: string): void;
		/** @internal Get drag event target location */
		recursiveGetTarget(e: DragEvent, leaf: WorkspaceLeaf): WorkspaceTabs | null;
		/**
		 * @internal Register a CodeMirror editor extension
		 * @remark Prefer registering the extension via the Plugin class
		 */
		registerEditorExtension(extension: Extension): void;
		/** @internal Registers hover link source */
		registerHoverLinkSource(key: string, source: HoverLinkSource): void;
		/** @internal Registers Obsidian protocol handler */
		registerObsidianProtocolHandler(protocol: string, handler: ObsidianProtocolHandler): void;
		/** @internal Constructs hook for receiving URI actions */
		registerUriHook(): void;
		/** @internal Request execution of activeLeaf change events */
		requestActiveLeafEvents(): void;
		/** @internal Request execution of resize event */
		requestResize(): void;
		/** @internal Request execution of layout update event */
		requestUpdateLayout(): void;
		/**
		 * Save workspace layout to disk
		 */
		saveLayout(): Promise<void>;
		/** @internal Use deserialized layout data to reconstruct the workspace */
		setLayout(data: SerializedWorkspace): Promise<void>;
		/** @internal Split leaves in specified direction */
		splitLeaf(leaf: WorkspaceLeaf, newleaf: WorkspaceLeaf, direction?: SplitDirection, before?: boolean): void;
		/**
		 * Split provided leaf, or active leaf if none provided
		 */
		splitLeafOrActive(leaf?: WorkspaceLeaf, direction?: SplitDirection): void;
		/** @internal Unregister a CodeMirror editor extension */
		unregisterEditorExtension(extension: Extension): void;
		/** @internal Unregister hover link source */
		unregisterHoverLinkSource(key: string): void;
		/** @internal Unregister Obsidian protocol handler */
		unregisterObsidianProtocolHandler(protocol: string): void;
		/** @internal */
		updateFrameless(): void;
		/** @internal Invoke workspace layout update, redraw and save */
		updateLayout(): void;
		/** @internal Update visibility of tab group */
		updateMobileVisibleTabGroup(): void;
		/**
		 * Update the internal title of the application
		 *
		 * @remark This title is shown as the application title in the OS taskbar
		 */
		updateTitle(): void;
	}

	/** @todo Documentation incomplete */
	interface WorkspaceLeaf {
		activeTime?: number;
		id?: string;
		parent?: WorkspaceSplit;
		tabHeaderEl: HTMLElement;
		tabHeaderInnerIconEl: HTMLElement;
		tabHeaderInnerTitleEl: HTMLElement;

		/**
		 * Triggers when the leaf's history gets updated (e.g. when new file is opened, or moving through
		 * history)
		 */
		on(name: "history-change", callback: () => void, ctx?: unknown): EventRef;
		/**
		 * Triggers when context menu action is executed on the leaf
		 */
		on(name: "leaf-menu", callback: (menu: Menu, leaf: WorkspaceLeaf) => void, ctx?: unknown): EventRef;
		/**
		 * Set the vertical height a leaf may occupy if it is in a split. The height is not set directly, but
		 * by setting the flex-grow (css) of the element. This means to predictably affect the height, you
		 * also need to use setDimension on the other leafs of the column. (The flex-grow values of every leaf
		 * work basically like a ratio, e.g. 1:2 meaning the first leaf takes 33% of the height, and the
		 * second 67%.)
		 *
		 * @param flexgrow - Sets the flex-grow of the leaf. (0-100)
		 */
		setDimension(flexgrow?: number | null): void;
	}

	/** @todo Documentation incomplete */
	interface WorkspaceSplit {
		parent?: WorkspaceSplit;
	}
}
