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
      // A ratchet, not a target. Raise as coverage improves; never lower.
      //
      // Seeded 2026-07-28 from a measured run at lines 39.09 / statements
      // 38.82 / functions 35.34 / branches 28.88. Raised the same day after
      // the characterization suites for ChatMessage and AdminMapEditor landed
      // and took the measured figures to lines 66.38 / statements 64.93 /
      // functions 59.93 / branches 59.41. Set a point or two under measured so
      // ordinary churn does not red-build.
      //
      // Deliberately NOT seeded from the coverage-summary.json that used to be
      // committed here — it read 57%/48% because it predated the two-entry
      // architecture entirely, and would have failed on the first honest run.
      thresholds: {
        lines: 65,
        statements: 64,
        functions: 59,
        branches: 58,
      },
    },
  },
});
