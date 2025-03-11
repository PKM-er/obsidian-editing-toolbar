import "obsidian";



declare module "obsidian" {
	export interface App {
		foldManager: FoldManager
		plugins: Plugins
		commands: Commands
		setting: SettingsManager
	}

	interface SettingsManager {
		activeTab: SettingTab | null;
		openTabById(id: string): SettingTab | null;
		openTab(tab: SettingTab): void;
		open(): void;
		close(): void;
		onOpen(): void;
		onClose(): void;
		settingTabs: SettingTab[];
		pluginTabs: SettingTab[];
		addSettingTab(): void;
		removeSettingTab(): void;
		containerEl: HTMLDivElement;
	}

	interface Plugins {
		manifests: Record<string, PluginManifest>;
		plugins: Record<string, Plugin_2>;
		enabledPlugins: any;
		enablePlugin(pluginId: string): Promise<boolean>;
		disablePlugin(pluginId: string): Promise<void>;
	}

	interface Commands {
		commands: Record<string, Command>;
		addCommand(cmd: Command): void;
		removeCommand(cmd: string): void;
		executeCommandById(id: string): boolean;
	}




	interface MarkdownView {
		onMarkdownFold(): void;
	}

	interface MarkdownSubView {
		applyFoldInfo(foldInfo: FoldInfo): void;
		getFoldInfo(): FoldInfo | null;
	}

	interface Editor {
		cm: CodeMirror.Editor;
		getScrollerElement: () => HTMLElement;
		containerEl: HTMLElement;
	}

	interface EditorSuggestManager {
		suggests: EditorSuggest<any>[];
	}

	interface Notice {
		noticeEl: HTMLElement;
	}
	interface FoldPosition {
		from: number;
		to: number;
	}

	interface FoldInfo {
		folds: FoldPosition[];
		lines: number;
	}

	export interface FoldManager {
		load(file: TFile): Promise<FoldInfo>;
		save(file: TFile, foldInfo: FoldInfo): Promise<void>;
	}



	export interface WorkspaceItemExt extends WorkspaceItem {
		// the parent of the item
		parentSplit: WorkspaceParentExt;

		// the container element
		containerEl: HTMLElement;

		// the width of the item in pixels
		width: number;
	}

	// interface for extending WorkspaceParent with undocumented properties
	export interface WorkspaceParentExt extends WorkspaceParent, WorkspaceItemExt, WorkspaceContainer {
		// the child items of the split
		children: WorkspaceItemExt[];

		// function for child resizing
		onChildResizeStart: (leaf: WorkspaceItemExt, event: MouseEvent) => void;
		// ...and backup thereof
		oldChildResizeStart: (leaf: WorkspaceItemExt, event: MouseEvent) => void;

		// split direction
		direction: 'horizontal' | 'vertical';
	}

	export class WorkspaceExt extends Workspace {
		floatingSplit: WorkspaceParentExt;
	}

	interface View {
		editor: Editor | undefined;
		leaf: WorkspaceLeaf | undefined;
		getMode: () => string;
	}

	interface WorkspaceLeaf {
		view: View;
		width: number;
	}

	interface WorkspaceRibbon {
		show(): void;
		hide(): void;
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

	interface Menu extends Component {

		/**
		 * @public
		 */
		constructor();

		/**
		 * @public
		 */
		setNoIcon(): this;
		/**
		 * @public
		 */
		addItem(cb: (item: MenuItem) => any): this;
		/**
		 * @public
		 */
		addSeparator(): this;

		/**
		 * @public
		 */
		showAtMouseEvent(evt: MouseEvent): this;
		/**
		 * @public
		 */
		showAtPosition(position: Point, doc?: Document): this;
		/**
		 * @public
		 */
		hide(): this;
		/**
		 * @public
		 */
		onHide(callback: () => any): void;

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

}

