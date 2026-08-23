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
const functionalCoreRestrictedImportPaths = [
  {
    name: "react",
    message:
      "Keep the FCIS functional core and semantic adapters independent of React.",
  },
  {
    name: "react-dom",
    message:
      "Keep the FCIS functional core and semantic adapters independent of React.",
  },
];
const imperativeShellImportPatterns = [
  {
    group: ["../app", "../app/*", "../App"],
    message:
      "The FCIS functional core must not depend on the imperative application shell.",
  },
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
    files: ["src/projection.ts", "src/RetirementIncomeChart.tsx"],
    rules: {
      "sonarjs/cyclomatic-complexity": ["error", { threshold: 35 }],
    },
  },
  {
    files: [
      "src/calculation/**/*.ts",
      "src/projection-domains/**/*.ts",
      "src/result-projection/**/*.ts",
      "src/app-domains/**/*.ts",
    ],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: functionalCoreRestrictedImportPaths,
          patterns: imperativeShellImportPatterns,
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "document",
          message: "Pass browser state through the FCIS imperative shell.",
        },
        {
          name: "localStorage",
          message: "Pass browser state through the FCIS imperative shell.",
        },
        {
          name: "window",
          message: "Pass browser state through the FCIS imperative shell.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Pass the current time into the FCIS functional core.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "Pass the current time into the FCIS functional core.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "Generate identifiers in the FCIS imperative shell.",
        },
      ],
    },
  },
  {
    files: ["src/calculation/**/*.ts", "src/projection-domains/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: functionalCoreRestrictedImportPaths,
          patterns: [
            ...imperativeShellImportPatterns,
            {
              group: [
                "../app-domains",
                "../app-domains/*",
                "../result-projection",
                "../result-projection/*",
              ],
              message:
                "The FCIS calculation engine must not depend on downstream result or presentation adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/result-projection/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...functionalCoreRestrictedImportPaths,
            {
              name: "../projection",
              importNames: ["createProjectionTable"],
              message:
                "Result projection must consume canonical calculation output rather than starting a pension projection.",
            },
          ],
          patterns: [
            ...imperativeShellImportPatterns,
            {
              group: ["../app-domains", "../app-domains/*"],
              message:
                "FCIS result projection must not depend on presentation-domain adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app-domains/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...functionalCoreRestrictedImportPaths,
            {
              name: "../projection",
              importNames: ["createProjectionTable", "generatePensionSummary"],
              message:
                "Presentation-domain adapters must consume calculation or result-projection outputs rather than start pension projections.",
            },
            {
              name: "../calculation/retirement-plan",
              importNames: ["calculateRetirementPlan"],
              message:
                "The application shell owns canonical plan calculation orchestration.",
            },
            {
              name: "../calculation/retirement-plan-assessment",
              importNames: ["assessRetirementPlan"],
              message:
                "Presentation-domain adapters must consume canonical plan assessments.",
            },
          ],
          patterns: imperativeShellImportPatterns,
        },
      ],
    },
  },
  {
    files: ["features/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              message:
                "Keep Gherkin/Cucumber tests as fast business-rule checks. Put browser journeys in e2e Playwright specs.",
            },
            {
              name: "playwright",
              message:
                "Keep Gherkin/Cucumber tests as fast business-rule checks. Put browser journeys in e2e Playwright specs.",
            },
          ],
        },
      ],
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
