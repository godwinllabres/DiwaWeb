# Contributing to Sevi (web)

This file **codifies what the repository already does** — 95 of 113 commits already
carry a type prefix. It is written down so the convention survives a change of
maintainer, not to introduce a new one.

## Before you start

```bash
nvm use && npm ci
```

Node 20 (`.nvmrc`). Read `README.md` first — in particular the two-entry
public/admin split and the three deploy targets, because a change to base paths
or the `/admin/` route affects all three.

## Branching

Work on a branch; `main` deploys on push. Prefix with the change type, matching the
history: `feat/`, `fix/`, `refactor/`, `chore/`, `ci/`, `security/`.

## Commit messages

`type(scope): imperative summary`, lowercase, no trailing period.

**Types in use.** The first seven are the conventional set; the last three are
project-specific and are kept because they carry real meaning here.

| Type | For |
|---|---|
| `feat` | new user-visible capability |
| `fix` | corrects broken behaviour |
| `refactor` | restructuring with no behaviour change |
| `chore` | housekeeping, dependencies, untracking files |
| `ci` | workflow and pipeline changes |
| `docs` | documentation and comments only |
| `test` | tests only |
| `build` | build config, bundler, tooling |
| `perf` | performance work |
| `style` | visual/CSS polish with no logic change |
| `security` | closes an exposure — use it, it makes the history auditable |
| `assets` | mascot, sticker, and image drops |
| `polish` | small UX refinements below the `feat` threshold |

Common scopes: `chat`, `map`, `admin`, `widget`, `build`, `deps`, `web`.

Do not invent new types. `update:` appears once in history and is the example to
avoid — it says nothing the diff does not.

Explain **why** in the body when the reason is not obvious from the diff. The good
commits in this history do exactly that, and they are the reason the codebase can be
picked up by someone new.

This convention is documented, not hook-enforced. A one-contributor repo at 95/113
adherence does not need `husky` + `commitlint` and a clone-time hook install.

## Before you push

```bash
npm run typecheck
npm test
```

CI runs `npm test` before it builds the Pages artifact, so a red suite blocks the
deploy. Do not push past it.

## Structural rules

These exist because the repository drifted from each one at least once. Where a rule
has an automated enforcer, it is named — a rule nothing checks is a wish.

1. **Never commit generated output.** Coverage reports, `dist/`, e2e screenshots,
   `*.tsbuildinfo`. Adding a `.gitignore` entry does **not** untrack a file already in
   the index — use `git rm -r --cached`.
2. **The public bundle contains no admin code.** Admin-only components, routes and
   headers stay behind the `admin/` entry. Enforced by `tests/e2e/admin-codesplit.demo.cjs`.
3. **Only `app/lib/storage.ts` touches `localStorage`/`sessionStorage`.** A browser
   blocking site data throws on the *property access*, before any method call, so an
   unguarded read in a render path white-screens the page.
4. **No deploy-target value is a literal in source.** Base paths, hostnames and origins
   come from `VITE_BASE_PATH` / `VITE_API_URL`. The only legitimate homes for
   `godwincreates.net` or `/diwa/` are `deploy.yml`, `Dockerfile`, `public/CNAME` and
   the README.
5. **Every runtime dependency has a live import site.** If you delete the last consumer
   of a package, uninstall the package in the same commit.
6. **Cross-directory imports use the `@/` alias**; relative imports are for siblings
   only. `app/components/ui/` is exempt — the vendored shadcn primitives use `./utils`
   so `npx shadcn add` does not fight the convention.
7. **No new top-level directory** without a line in the README explaining why it exists.

## Repository layout

`app/` is source, `tests/` mirrors it, `public/` ships verbatim. When you add a module,
add its test in the mirrored path. When you delete one, delete its test in the same
commit.

## What needs a human, not a pull request

Do not resolve these in code — they are institutional decisions. They are listed under
**Open items** in `README.md`: the production domain, privacy-notice sign-off, admin
console exposure, and the `frame-ancestors` allowlist.
