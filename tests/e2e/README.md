# e2e — admin decoupling demo

Proves the admin panel is a **separate app** from the public chat SPA: its own
Vite entry, its own bundle, and none of it — UI or API surface — reaching the
page a public visitor loads.

## Run it

```bash
npm run demo:admin-split
```

One-time browser download (if you've never run Playwright here):

```bash
npx playwright install chromium
```

The runner is self-contained — it builds the app if `dist/` is missing, starts
`vite preview`, drives a headless Chromium, writes three screenshots, prints a
report, and shuts the server down. No Sevi API is needed (the backend is stubbed
at the network layer).

## What it checks

| Phase | Request | Expectation |
|-------|---------|-------------|
| A | `GET /` (public chat) | the admin bundle is **not** requested, and none of the loaded bundles contain any admin fingerprint |
| B | `GET /admin.html` | the admin app loads **its own** bundle and renders the PIN gate |
| C | submit the PIN | the dashboard opens |

Phase A greps every JS bundle the public page actually requested for these
fingerprints — a hit on any one fails the run:

```
"X-Admin-Pin"  "/admin/status"  "/admin/moderation"  "/admin/verify"
"Add a new item to the map"
```

That covers both halves of the boundary: the admin **UI** (dashboard, system
panel, map editor, intent onboarding) and the admin **API client**
(`app/lib/adminApi.ts` — route names plus the PIN header).

Exit code `0` = pass. Screenshots land in `tests/e2e/screenshots/`
(`01-public-chat.png`, `02-admin-locked.png`, `03-admin-unlocked.png`).

## Paths

`vite preview` serves built pages by filename, so the admin entry is
`/admin.html` here. In production nginx maps `/admin/` → `admin.html` — see
`deploy/nginx.conf`. The old `?admin=1` deep link on the chat app redirects to
`/admin/`, so existing bookmarks keep working.

## Notes

- Sample output:

  ```
  PHASE A   GET /            admin bundle: not requested ✓  fingerprints: none ✓
  PHASE B   GET /admin.html  own bundle: admin-*.js ✓      PIN gate ✓
  PHASE C   submit PIN       dashboard opened ✓
  RESULT: PASS ✓
  ```
- The PIN is only a key to the server-side gate. `require_admin` in
  `api/app.py` is the real authorization boundary, and an import-time audit
  there fails the boot if any protected route loses its gate.
- Requires `playwright` (a devDependency) and a Chromium build.
