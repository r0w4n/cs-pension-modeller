/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveInputPath(relativePath: string) {
  return decodeURIComponent(new URL(relativePath, import.meta.url).pathname);
}

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolveInputPath("./index.html"),
        "settings/index": resolveInputPath("./settings/index.html"),
        "privacy/index": resolveInputPath("./privacy/index.html"),
        "methodology/index": resolveInputPath("./methodology/index.html"),
        "about/index": resolveInputPath("./about/index.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["src/test/**", "**/*.test.ts", "**/*.test.tsx"],
    },
  },
});
