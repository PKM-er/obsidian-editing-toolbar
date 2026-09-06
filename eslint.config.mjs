import js from "@eslint/js";
import tseslint from "typescript-eslint";
import noUnsanitized from "eslint-plugin-no-unsanitized";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      "main.js",
      "build/",
      "Editing-Toolbar-Test-Vault/",
      "**/*.d.ts",
      // Node.js build/config files — use `process.env`, not browser globals
      "rollup.config.js",
      "esbuild.config.mjs",
      "scripts/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLSpanElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLCanvasElement: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        CustomEvent: "readonly",
        DragEvent: "readonly",
        MutationObserver: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        getComputedStyle: "readonly",
        matchMedia: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        queueMicrotask: "readonly",
        atob: "readonly",
        btoa: "readonly",
        crypto: "readonly",
        performance: "readonly",
        structuredClone: "readonly",
        AbortController: "readonly",
      },
    },
    plugins: {
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      // === High: innerHTML / outerHTML 直写 DOM ===
      "no-unsanitized/property": "error",
      "no-unsanitized/method": "error",

      // === Medium: any 类型 ===
      "@typescript-eslint/no-explicit-any": "warn",

      // === Medium: 未使用变量 ===
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // === Medium: 不必要的转义 ===
      "no-useless-escape": "warn",

      // === Medium: 表达式语句无副作用 ===
      "no-unused-expressions": [
        "warn",
        { allowTernary: true, allowShortCircuit: true },
      ],
      "@typescript-eslint/no-unused-expressions": [
        "warn",
        { allowTernary: true, allowShortCircuit: true },
      ],

      // === Medium: var 声明 ===
      "no-var": "warn",
      "prefer-const": "warn",

      // === Medium: console ===
      "no-console": [
        "warn",
        { allow: ["warn", "error", "info", "debug"] },
      ],

      // === Medium: setTimeout/clearTimeout 应加 window. ===
      "no-restricted-globals": [
        "warn",
        {
          name: "setTimeout",
          message: "Use window.setTimeout() for popout window compatibility.",
        },
        {
          name: "clearTimeout",
          message: "Use window.clearTimeout() for popout window compatibility.",
        },
      ],

      // === Info: 弃用 API ===
      "no-restricted-syntax": [
        "warn",
        {
          selector: "MemberExpression[property.name='activeLeaf']",
          message:
            "activeLeaf is deprecated. Use workspace.getActiveViewOfType() or getLeavesOfType().",
        },
        {
          selector: "CallExpression[callee.property.name='substr']",
          message: "substr is deprecated. Use slice or substring instead.",
        },
      ],
    },
  },
);
