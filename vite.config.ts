import { defineConfig } from "vite"


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const isProd = mode === "production" ? true : false
    return {
        esbuild: {
            define: {
                'process.env.NODE_ENV': `'${mode}'`
            }
        },
        build: {
            minify: isProd ? true : false,
            lib: {
                entry: "./src/main.ts",
                formats: ["cjs"]
            },
            sourcemap: isProd ? false : "inline",
            emptyOutDir: false,
            rollupOptions: {
                external: [
                    "obsidian",
                    "electron",
                    "@codemirror/autocomplete",
                    "@codemirror/collab",
                    "@codemirror/commands",
                    "@codemirror/language",
                    "@codemirror/lint",
                    "@codemirror/search",
                    "@codemirror/state",
                    "@codemirror/view",
                    "@lezer/common",
                    "@lezer/highlight",
                    "@lezer/lr"
                ],
                output: {
                    entryFileNames: "main.js",
                    assetFileNames: "styles.css",
                    dir: "./Editing-Toolbar-Test-Vault/.obsidian/plugins/editing-toolbar",
                    format: "cjs"
                }
            }
        },
    }
})
