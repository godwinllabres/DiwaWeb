import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Kept SEPARATE from vite.config.ts on purpose.
 *
 * Folding the two would remove one copy of the `@` alias, but it would also
 * drag the whole build pipeline into every test run — the Tailwind plugin, the
 * admin-path-parity dev middleware, and the VITE_BASE_PATH resolution and its
 * build-time log. The alias is three stable lines; that is a cheaper
 * duplication than coupling the test environment to the deploy configuration.
 *
 * The tsconfig `paths` copy is unavoidable regardless: TypeScript resolves
 * imports independently of the bundler.
 */

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
      // A ratchet, not a target. Seeded from a real measured run on
      // 2026-07-28 (lines 39.09, statements 38.82, functions 35.34,
      // branches 28.88), set a point or two below so ordinary churn does not
      // red-build. Raise these as coverage improves; never lower them.
      //
      // Deliberately NOT seeded from the coverage-summary.json that used to be
      // committed here — it read 57%/48% because it predated the two-entry
      // architecture entirely, and would have failed on the first honest run.
      thresholds: {
        lines: 38,
        statements: 38,
        functions: 34,
        branches: 28,
      },
    },
  },
});
