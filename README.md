# Sevi — CvSU Virtual Assistant (web)

Sevi is the Cavite State University virtual assistant: a chat interface that answers
questions about admissions, enrollment, programs, scholarships and campus directions,
in English, Filipino and Taglish. This repository is the **web front end only**.

| | |
|---|---|
| **Front end** (this repo) | React 18 · TypeScript · Vite 6 · Tailwind 4 |
| **Back end** | `sevi-api` — [`Cavite-State-University-Official/sevi-api`](https://github.com/Cavite-State-University-Official/sevi-api). Locally `../SeviAI`. |
| **Node** | 20 (`.nvmrc`, `engines`, `Dockerfile`, CI) |

## Remotes — which one is authoritative

This repo has two remotes and they are **not** interchangeable:

| Remote | URL | Role |
|---|---|---|
| `cvsu` | `Cavite-State-University-Official/sevi-web` | Institutional mirror. The repository of record. |
| `origin` | `godwinllabres/DiwaWeb` | Personal. **This is the one that deploys** — `.github/workflows/deploy.yml` publishes its GitHub Pages site. |

> **Open item.** `public/CNAME` is `godwincreates.net`, a personally-owned apex domain.
> The production target should be a `cvsu.edu.ph` host. Until that migration happens the
> live service runs on personal infrastructure — see [Open items](#open-items).

## Repository map

```
app/                  Application source. The @/* path alias resolves here.
  main.tsx            Public chat entry      <- index.html
  App.tsx
  admin/main.tsx      Admin console entry    <- admin/index.html
  components/         Feature components; ui/ holds vendored shadcn primitives
  lib/                Transport, stores, pure helpers; lib/hooks/ holds the hooks
styles/               Tailwind layers and theme; imported by both entries
public/               Copied verbatim into the build (assets, widget.js, CNAME)
tests/                Mirrors app/. tests/e2e/ holds the Playwright demo.
docs/                 Handoff notes, mascot spec, feasibility deliverables
scripts/              Asset generation (Python) and tunnel helpers (PowerShell)
deploy/               nginx config for the Docker target
```

**Two entries, two bundles.** `index.html` → `app/main.tsx` is the public chat app.
`admin/index.html` → `app/admin/main.tsx` is the operator console. They are separate
Rollup inputs (`vite.config.ts`), not code-split chunks of one another — the public
bundle ships **zero** admin code, and that is a security property, not an optimisation.
`tests/e2e/admin-codesplit.demo.cjs` checks it.

The admin entry must stay at `admin/index.html`, not `admin.html`: Vite maps an HTML
entry's location to its URL, so the build emits `dist/admin/index.html` and a static
host resolves `/admin/` to it. Emitting `admin.html` at the root makes `/admin/` 404.

## Local setup

```bash
nvm use            # Node 20
npm ci
npm run dev        # http://localhost:5173
```

Chat calls go same-origin to `/api`; the dev server proxies them to a local `sevi-api`.
Start that separately, or override the proxy target (below). `/admin/` works in dev via
the `admin-path-parity` plugin in `vite.config.ts`, which mirrors what nginx does in
production.

## Environment variables

| Variable | Read by | Set by |
|---|---|---|
| `VITE_API_URL` | `app/lib/api.ts`. Empty/unset → same-origin `/api`. | CI (`vars.VITE_API_URL`); blanked in `Dockerfile` so nginx proxies instead |
| `VITE_API_PROXY_TARGET` | `vite.config.ts` dev proxy only. Default `http://127.0.0.1:8009`. | your local `.env.development.local` |
| `VITE_BASE_PATH` | `vite.config.ts` → Vite `base`. Default `/`. | `deploy.yml` (`/diwa/`) and `Dockerfile` (`/`) — **nowhere else** |

`.env.development` is committed **on purpose**: `VITE_*` values are compiled into the
client bundle and are public by definition, so it holds dev defaults, not secrets.
Never put a credential in any `VITE_*` variable.

To override the dev proxy, use `.env.development.local` — **not** `.env.local`. Vite
ranks `.env.[mode]` above `.env.local`, so an override placed there is silently ignored.

`VITE_BASE_PATH` is read from `process.env`, not `loadEnv`, so it **cannot** be set in
any `.env` file. Pass it on the command line or via the two setters named above.

## Deploy targets

Three, and a change to base paths or the admin route affects all of them.

1. **GitHub Pages** — `.github/workflows/deploy.yml`, on push to `main`. Builds with
   `VITE_BASE_PATH=/diwa/`, stages to `/diwa/`, serves `index.html` as `404.html` for
   SPA fallback, and puts a redirect at the apex.
2. **Docker + nginx** — `Dockerfile` (two-stage, `nginx-unprivileged` on :8080) with
   `deploy/nginx.conf`. Blanks `VITE_API_URL` so nginx reverse-proxies `/api/` to the
   `api` service. That service is owned by an **external** compose stack; do not add a
   second `docker-compose.yml` here.
3. **Frappe/ERPNext embed** — the university site loads a widget that iframes the
   deployed app. See `docs/embed/frappe-erpnext-handoff.md`. Because the app is embedded,
   `deploy/nginx.conf` must never send `X-Frame-Options: DENY`.

## Tests and checks

```bash
npm run typecheck        # tsc -b
npm test                 # vitest, 20 suites — gates the deploy
npm run test:coverage
npm run demo:admin-split # Playwright; needs `npx playwright install chromium` first
```

CI runs `npm test` before building the Pages artifact. A red suite blocks publication.

## Assets

Runtime assets live in `public/` and ship with the build. Two **gitignored** source
drops sit alongside — `sevi-asset/` and `sevi gif final/` — holding the large PNG/GIF
exports the shipped SVGs were derived from. They are deliberately not in git.

`scripts/*.py` regenerate social and mascot assets; see `scripts/README.md` for their
Python requirements. They are not part of the build.

## Ownership

Cavite State University. See `LICENSE` — all rights reserved.

Chat history is stored **on the user's device only**, opt-in, behind a consent gate
(`app/lib/hooks/useConsent.ts`). Privacy questions go to the CvSU Data Protection
Officer, `dpo@cvsu.edu.ph` (per `docs/alpha-testing-gform.md`).

## Open items

These are known, tracked, and need a decision from CvSU — not from a developer.

- **Production domain.** `public/CNAME` points at a personally-owned apex domain.
  Migrate to a `cvsu.edu.ph` host and record the cutover date.
- **Privacy notice sign-off.** `app/App.tsx` notes the in-app notice is *pending final
  CvSU Data Protection Officer sign-off*. It ships to real users in the meantime.
- **Admin console exposure.** The GitHub Pages target serves `/diwa/admin/` publicly.
  The real authorisation gate is server-side in `sevi-api`; the client gate is a
  convenience, not a boundary. Pages cannot provide edge auth — the Docker/nginx target
  can (`deploy/nginx.conf`, the `/admin/` location block).
- **Two product names.** The app titles itself **Sevi** (`index.html`), while the
  GitHub Pages deployment presents it as **DIWA** — 21 strings in `deploy.yml`
  drive the page title, OG tags and social previews at `/diwa/`. The remotes carry
  the same split (`sevi-web` institutional, `DiwaWeb` personal). This is a branding
  decision, not a cleanup: changing it rewrites live link previews. Pick one name
  and apply it in a dedicated change.
- **Security headers.** `deploy/nginx.conf` sets none. Adding
  `Content-Security-Policy: frame-ancestors` requires the Frappe Desk origin, which is a
  deployment fact and is not knowable from this repository.
