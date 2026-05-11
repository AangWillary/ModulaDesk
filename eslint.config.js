import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  prettier,
  {
    files: ["src/**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    ignores: ["dist/", "node_modules/", "src-tauri/"],
  },
  // Layer constraint: core/ cannot import other layers
  {
    files: ["src/core/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@host/*",
                "@layout/*",
                "@ui/*",
                "@modules/*",
                "@stores/*",
                "@app/*",
              ],
              message: "core/ cannot depend on other layers",
            },
            {
              group: ["vue", "pinia", "@tauri-apps/*"],
              message: "core/ cannot import runtime dependencies",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: modules/ only depends on core/
  {
    files: ["src/modules/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@host/*",
                "@layout/*",
                "@ui/*",
                "@shell/*",
                "@stores/*",
                "@app/*",
              ],
              message: "modules/ can only depend on core/",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: layout/ only depends on core/
  {
    files: ["src/layout/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@host/*",
                "@ui/*",
                "@shell/*",
                "@modules/*",
                "@stores/*",
                "@app/*",
              ],
              message: "layout/ can only depend on core/",
            },
            {
              group: ["vue", "pinia", "@tauri-apps/*"],
              message: "layout/ cannot import Vue/Pinia/Tauri",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: host/ only depends on core/
  {
    files: ["src/host/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@layout/*",
                "@ui/*",
                "@shell/*",
                "@modules/*",
                "@stores/*",
                "@app/*",
              ],
              message: "host/ can only depend on core/",
            },
            {
              group: ["@tauri-apps/*"],
              message:
                "host/ cannot import Tauri directly, use injected HostRuntime",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: ui/ cannot depend on host/, modules/, or Tauri
  {
    files: ["src/ui/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@host/*", "@modules/*"],
              message: "ui/ cannot depend on host/ or modules/",
            },
            {
              group: ["@tauri-apps/*"],
              message: "ui/ cannot import Tauri directly, use app/bridge",
            },
          ],
        },
      ],
    },
  },
  // Layer constraint: only app/bridge.ts can import Tauri
  {
    files: ["src/**/*.{ts,vue}"],
    ignores: ["src/app/bridge.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@tauri-apps/*"],
              message: "Must use @app/bridge to call Tauri",
            },
          ],
        },
      ],
    },
  },
];
