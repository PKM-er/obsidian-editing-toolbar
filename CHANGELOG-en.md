# Changelog (English)

> The Chinese changelog lives in [CHANGELOG.md](CHANGELOG.md). This file mirrors it in English; the plugin shows whichever matches your Obsidian language.

## 4.1.11 (2026-10-24)
### Fixed the Toolbar Theme dropdown snapping back to "Custom Theme" (issues #371, #372)
- Preset themes are stored as `aestheticStyle: 'custom'` plus concrete colours, so the dropdown read back the disabled "Custom Theme" entry. The selected preset is now reverse-mapped from the stored colours and shown again.
- Picking Default / Tiny / Glass now clears the stored custom colour overrides and resets the `--editing-toolbar-background-color` / `--editing-toolbar-icon-color` CSS variables, so the preview and the color pickers stop sticking to the previous custom colours.
### Fixed Pickr error spam and the settings re-render loop (issues #371, #372)
- The color picker's `save` handler re-rendered the whole settings page unconditionally. When a window produces no frames (e.g. an occluded popout settings window), Pickr replays its initialization and emits a `save` with the unchanged colour, which recreated the pickers and emitted `save` again — an endless loop that rebuilt the page several times per second and made the dropdown unusable. Unchanged colours are now ignored.
- Pending animation frames are now cancelled on both the main window and the settings window; the bundled Pickr always queues its setup frame on the main window, so cancelling only the settings window left a stray callback behind.
- After a picker is destroyed (all instance fields nulled), stray callbacks kept dereferencing the dead DOM root and threw `Cannot read properties of null (reading 'interaction')` every frame. Instance methods are now guarded and become no-ops once destroyed, and destroy is idempotent.
### Clear Formatting now removes the colour emoji of Obsidian 1.14 coloured highlights (issue #367)
- Obsidian 1.14 encodes highlight colours as a leading emoji inside `==…==` (e.g. `==🟠text==`). Clear Formatting left the emoji behind (`🟠text`); it now strips it too (`text`).
- "Copy as plain text" handles the emoji the same way.

## 4.1.10 (2026-10-09)
### Fixed two identical greens in the background palette's "translucent" row (issue #358)
- rgba(3, 135, 102, 0.2) appeared twice (present since the first release); slot 6 is now rgba(0, 176, 80, 0.2), aligned with the green/cyan sequence of the font palette.
### Fixed toolbar palette "jump to setting" no longer working (including the AI panel's settings button)
- The old implementation clicked the plugin's own `.editing-toolbar-tabs` strip, which no longer exists after the 1.13 settings rework, so it neither switched pages nor highlighted anything.
- Now uses the 1.13 navigation API (getElementForDefinition + clicking the page item); the legacy tab strip remains as a fallback. After jumping, the target row is scrolled into view and highlighted with `toolbar-cta`.
- The same problem affected the "Settings" button in the top-right of the AI prompt panel (it also clicked the old AI tab); fixed as well.
- Verified on 1.13.4: background palette → General page "🎨 Set Custom Background"; font palette → "🖌️ Set Custom Font Color"; AI panel → AI page.
### Fixed color popups not closing + custom colours not syncing (including pickr initialization)
- Color picker popups wouldn't close on Save / Cancel: the pickr fork used by the plugin never closes on Save (`!this.applyColor()` is always false, `hide()` unreachable) and Cancel only dispatched an event; the "click outside to close" listener was bound to the main window's document, which also failed when 1.13 settings render in their own window. Save / Cancel now close the popup explicitly and the outside-click handler is also bound to the settings window.
- Custom background / font colours didn't sync to the toolbar palette: the palette bakes `custom_bg1..5` / `custom_fc1..5` into its cell HTML when built, and nothing rebuilt the toolbar after saving, so old colours persisted. The toolbar is now rebuilt right after saving (without re-rendering the settings page; measured ~8ms).
- Under the 1.13 declarative rendering path the `.custom_bg` / `.custom_font` classes were never applied: the five swatches stacked vertically and their layout CSS (including the toolbar palette jump highlight) broke; the classes are now applied explicitly in render.
- pickr initialization depends on requestAnimationFrame; when the window is occluded / produces no frames the frame never arrives and pickr stays "initializing", swallowing all save/change events — colours looked changed on the swatch but nothing saved. Initialization is now completed synchronously when the instance is created (cancel the pending frame → apply the default colour → reposition → clear the initializing flag → dispatch init).
### Fixed drag-to-reorder not working in the 1.13 settings page
- Root cause: `saveSettings()` called `syncAIToolbarCommandVisibility()`, which removed the AI command from the list and unshifted it back to position 0 every time, so dragging the AI button — or dragging anything in front of it — was silently reverted.
- The existing object and its position are now preserved; it is only re-added when missing. This also fixed the AI button's custom name / icon being overwritten.
- Verified in the Obsidian 1.13.4 settings window: dragging the AI row to position 3 persists in both the UI and data.json, surviving a plugin reload.
