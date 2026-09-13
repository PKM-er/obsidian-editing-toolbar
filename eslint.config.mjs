import js from "@eslint/js";
import tseslint from "typescript-eslint";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import obsidian from "eslint-plugin-obsidianmd";

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
  obsidian.configs.recommended,
  {
    // 启用类型感知规则（与 Obsidian 插件目录 Scorecard 扫描同口径）
    // 仅作用于 tsconfig 覆盖的 src 源码
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // no-unsafe-* 系列是 362 处 any 的连带产物，等类型化改造完成后自然消失，
      // 先关闭避免淹没真正对应 Scorecard 的队列
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // 官方 recommended 里这些是 error；作为清理队列统一按 warn 跟踪
      "obsidianmd/no-static-styles-assignment": "warn",
      "obsidianmd/rule-custom-message": "warn",
      "obsidianmd/settings-tab/no-manual-html-headings": "warn",
      "@typescript-eslint/await-thenable": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      // 全局 app 对象在弹窗/多窗口下不可靠，应使用插件实例提供的引用
      "no-restricted-globals": [
        "warn",
        {
          name: "app",
          message:
            "Do not use the global app object. Use the reference provided by your plugin instance (this.app / plugin.app).",
        },
        {
          name: "setTimeout",
          message: "Use window.setTimeout() for popout window compatibility.",
        },
        {
          name: "clearTimeout",
          message: "Use window.clearTimeout() for popout window compatibility.",
        },
      ],
    },
  },
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
