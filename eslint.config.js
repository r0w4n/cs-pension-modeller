import js from "@eslint/js";
import { fileURLToPath } from "node:url";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

const tsconfigRootDir = fileURLToPath(new URL(".", import.meta.url));

export default tseslint.config(
  {
    ignores: ["coverage", "dist", "node_modules"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...importPlugin.flatConfigs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    settings: {
      "import/resolver": {
        node: true,
        typescript: true,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.eslint.json",
        tsconfigRootDir,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefreshPlugin,
      sonarjs,
    },
    settings: {
      react: {
        version: "19.0",
      },
      "import/resolver": {
        node: true,
        typescript: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react/jsx-key": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-no-target-blank": "error",
      "react/no-children-prop": "error",
      "react/no-danger-with-children": "error",
      "react/no-danger": "off",
      "react/no-deprecated": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-find-dom-node": "error",
      "react/no-is-mounted": "error",
      "react/no-namespace": "error",
      "react/no-render-return-value": "error",
      "react/no-string-refs": "error",
      "react/no-unescaped-entities": "error",
      "react/require-render-return": "error",
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "sonarjs/cognitive-complexity": ["error", 25],
      "sonarjs/cyclomatic-complexity": ["error", { threshold: 20 }],
      "sonarjs/no-identical-expressions": "error",
      "sonarjs/no-small-switch": "off",
      "sonarjs/pseudo-random": "off",
      "sonarjs/prefer-read-only-props": "off",
    },
  },
  {
    files: ["src/App.tsx"],
    rules: {
      "sonarjs/cognitive-complexity": ["error", 40],
      "sonarjs/cyclomatic-complexity": ["error", { threshold: 45 }],
    },
  },
  {
    files: ["src/settings.ts"],
    rules: {
      "sonarjs/cognitive-complexity": ["error", 60],
      "sonarjs/cyclomatic-complexity": ["error", { threshold: 70 }],
    },
  },
  {
    files: ["src/projection.ts", "src/RetirementIncomeBridgeChart.tsx"],
    rules: {
      "sonarjs/cyclomatic-complexity": ["error", { threshold: 35 }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
    rules: {
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/cyclomatic-complexity": "off",
    },
  },
);
