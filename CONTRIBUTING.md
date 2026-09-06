# Contributing to Editing Toolbar

Thanks for your interest in contributing! This plugin is modified from cMenu and provides a MS Word-like editing toolbar for Obsidian.

## Development Setup

1. Clone the repository.
2. Install dependencies with `pnpm install`.
3. Build in watch mode with `pnpm dev`, or a production build with `pnpm build`.
4. The compiled `main.js`, `manifest.json`, and `styles.css` are copied into `Editing-Toolbar-Test-Vault/.obsidian/plugins/editing-toolbar/` for local testing.

## Code Style

- TypeScript with strict typing — avoid `any` where a concrete type is possible.
- Prefer Obsidian's `createEl` helpers over `document.createElement`.
- Do not write to the DOM via `innerHTML`; use `createEl` + `textContent` or `setIcon`.
- Use `window.setTimeout` / `window.clearTimeout` (not the global shortcuts) for popout-window compatibility.
- Put static styles in `styles.css` or via CSS variables; avoid inline `style` assignments and `!important`.
- Do not import Node.js built-in modules — the plugin runs in the browser/Electron renderer.

## Linting

Run `pnpm lint` to check, `pnpm lint:fix` to auto-fix. The CI build fails on new lint errors.

## Submitting Changes

1. Open an issue describing the problem or feature before starting work.
2. Fork and branch from `master`.
3. Keep commits focused; one logical change per commit.
4. Test in the bundled `Editing-Toolbar-Test-Vault` on both desktop and mobile if possible.
5. Open a pull request referencing the issue.

## Releasing

Releases are tagged on `master` and built by the `release.yml` workflow. Only maintainers cut releases.
