import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@host": path.resolve(__dirname, "src/host"),
      "@layout": path.resolve(__dirname, "src/layout"),
      "@shell": path.resolve(__dirname, "src/shell"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@stores": path.resolve(__dirname, "src/stores"),
      "@app": path.resolve(__dirname, "src/app"),
    },
  },
});
