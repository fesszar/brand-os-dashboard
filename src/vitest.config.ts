import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    root: path.resolve(__dirname, ".."),
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
