import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    reporters: ["verbose"],
    // Separate processes avoid stalled thread workers on Windows.
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
