import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * The repo carried six `eslint-disable react-hooks/exhaustive-deps` comments
 * for years with no ESLint installed to read them. This config exists so those
 * directives mean something, and so the structural rules in CONTRIBUTING.md
 * have an enforcer rather than being a wish.
 */

const STORAGE_MESSAGE =
  "Use the helpers in app/lib/storage.ts. A browser blocking site data throws " +
  "on the property access itself, so an unguarded read in a render path " +
  "white-screens the page.";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      // Vendored shadcn source — not authored here, and `npx shadcn add`
      // rewrites it. Linting it would fight the generator.
      "app/components/ui/**",
      // Copied verbatim into the build; widget.js is a standalone IIFE with
      // its own conventions.
      "public/**",
    ],
  },

  {
    // A disable comment that suppresses nothing is worse than none: it reads
    // as "this was considered and waived" when the rule never fired. Two of
    // the six in this repo were exactly that.
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },

  ...tseslint.configs.recommended,

  {
    files: ["app/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Structural rule: cross-directory imports go through the @/ alias.
      // Siblings ("./x") stay relative.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message:
                "Use the @/ alias for cross-directory imports; keep relative paths for siblings only.",
            },
          ],
        },
      ],

      // Structural rule: only app/lib/storage.ts touches Web Storage.
      // Both forms have to be covered — a bare `sessionStorage.getItem(...)`
      // is a global reference, while `window.sessionStorage` is a member
      // access that no-restricted-globals cannot see.
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: STORAGE_MESSAGE },
        { name: "sessionStorage", message: STORAGE_MESSAGE },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "localStorage", message: STORAGE_MESSAGE },
        { object: "window", property: "sessionStorage", message: STORAGE_MESSAGE },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],

      // Pre-existing debt, deliberately a warning. There are ~25 `any`s, most
      // of them the `import.meta` cast this project uses instead of pulling in
      // vite/client's ambient types. Landing this as an error would fail the
      // build on day one, and a rule that blocks everyone on introduction gets
      // deleted rather than fixed. Burn them down, then promote it.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    // Node-side scripts: CommonJS by design (package.json is type:module, so
    // the .cjs extension is what lets them use require()).
    files: ["**/*.cjs"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },

  {
    // The public bundle must contain no admin code. That is asserted as a
    // security property in App.tsx and AdminApp.tsx and checked at the bundle
    // level by tests/build/adminSplit.test.ts; this stops a violation at the
    // import instead of after a build.
    files: [
      "app/App.tsx",
      "app/main.tsx",
      "app/components/**/*.{ts,tsx}",
      "app/lib/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message:
                "Use the @/ alias for cross-directory imports; keep relative paths for siblings only.",
            },
            {
              group: ["@/admin", "@/admin/*"],
              message:
                "Public code cannot import from app/admin/. The admin app is a separate Vite entry and the public chat bundle must ship none of it.",
            },
          ],
        },
      ],
    },
  },

  {
    // The one module allowed to touch Web Storage — it is the guard.
    files: ["app/lib/storage.ts"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },

  {
    // Tests assert against storage directly and mock it.
    files: ["tests/**"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
