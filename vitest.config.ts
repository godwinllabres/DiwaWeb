import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      reporter: ["text", "json-summary", "html"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        // Vendored shadcn source — not authored here.
        "app/components/ui/**",
        // Both entries: app/main.tsx and app/admin/main.tsx. The admin one was
        // previously counted and permanently 0%, which dragged the totals.
        "app/**/main.tsx",
        "**/*.d.ts",
      ],
    },
  },
});
