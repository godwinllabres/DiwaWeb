# Sevi widget — `cvsu_web` drop-in files

Ready-to-drop files for embedding Sevi into the **internal Desk** of your
`cvsu_web` Frappe/ERPNext app. See `../frappe-erpnext-handoff.md` for the full
rationale and caveats.

## Where each file goes

| This file | Copy to (inside your app) |
|---|---|
| `public/js/sevi_widget.js` | `cvsu_web/cvsu_web/public/js/sevi_widget.js` |
| `hooks_additions.py` | merge its lines into `cvsu_web/cvsu_web/hooks.py` |

## Before you deploy

1. Edit `sevi_widget.js` → set `SEVI_HOST` to your **stable** Sevi URL
   (e.g. `https://sevi.cvsu.edu.ph`). **Do not** ship the dev tunnel URL.
2. Confirm the app module name is `cvsu_web` (underscore) — `bench list-apps`.

## Deploy

```bash
bench build --app cvsu_web
bench --site <your-site> clear-cache
bench --site <your-site> clear-website-cache
bench restart          # production; on dev, a hard refresh is enough
```

## Verify

- Log into the Desk → a green "Ask Sevi" bubble appears bottom-right.
- Click it → Sevi opens with its greeting + privacy notice.
- Browser console is clean (ask for a `DEBUG = false` build of `widget.js`).
- If your site enforces a Content-Security-Policy, allow-list your Sevi host in
  **both** `script-src` and `frame-src`.
