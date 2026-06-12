import js from "@eslint/js";
import { fileURLToPath } from "node:url";
import globals from "globals";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import reactX from "@eslint-react/eslint-plugin";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import testingLibrary from "eslint-plugin-testing-library";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";

const tsconfigRootDir = fileURLToPath(new URL(".", import.meta.url));
const importResolvers = [
  createTypeScriptImportResolver({
    project: "./tsconfig.eslint.json",
  }),
  createNodeResolver(),
];

export default tseslint.config(
  {
    ignores: ["coverage", "dist", "node_modules"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...importX.flatConfigs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    settings: {
      "import-x/resolver-next": importResolvers,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      reactX.configs["recommended-type-checked"],
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
      "react-refresh": reactRefreshPlugin,
      sonarjs,
    },
    settings: {
      "import-x/resolver-next": importResolvers,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@eslint-react/jsx-no-children-prop": "error",
      "@eslint-react/dom-no-unsafe-target-blank": "error",
      "@eslint-react/purity": "off",
      "@eslint-react/use-state": "off",
      "@eslint-react/naming-convention-ref-name": "off",
      "@eslint-react/no-children-to-array": "off",
      "@eslint-react/no-children-for-each": "off",
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
    extends: [vitest.configs.recommended, testingLibrary.configs["flat/react"]],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
    rules: {
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/cyclomatic-complexity": "off",
      "testing-library/no-node-access": "off",
    },
  }
);
