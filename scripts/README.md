# scripts/

Build-time and operational helpers. **None of these run during `npm run build`,
in CI, or in a deployment** — the site builds with Node alone. They are here so
generated artefacts can be reproduced rather than only existing as committed
binaries.

## Python — asset and document generation

Needs Python 3.10+ and `pip install -r scripts/requirements.txt` (see that file
for the venv steps).

| Script | Produces | Runs from a clean clone? |
|---|---|---|
| `generate_docs.py` | `docs/Sevi_Feasibility_POC.pptx`, `docs/Sevi_Feasibility_Study.docx` | Yes |
| `make_social_assets.py` | `public/og-image.jpg`, `public/favicon-*.png`, `public/apple-touch-icon.png` | **No** — see below |
| `vectorize_gifs.py` | `public/sevi-reactions/*.svg` from the sticker GIFs | **No** — needs the gitignored `sevi-asset/` drop |

Two of the three cannot run from a fresh checkout, and that is worth knowing
before you rely on them:

- `make_social_assets.py` hardcodes a source image path on one developer's
  machine (`C:/Users/.../POC/SeviAI/ref/diwa.jpg`). It needs that argument made
  into a parameter before anyone else can run it.
- `vectorize_gifs.py` reads `sevi-asset/exports/gifs/`, which is deliberately
  gitignored — it is a 16 MB design-source drop, not repository content.

The outputs of all three **are** committed, so the site builds without them.

## PowerShell — dev tunnel

`start-trycloudflare.ps1` / `stop-trycloudflare.ps1`, wired to
`npm run tunnel:start` / `tunnel:stop`. They expose the local Vite dev server
through a Cloudflare quick tunnel so the widget can be demoed on a real device.

**Windows-only.** A maintainer on macOS or Linux has no equivalent here and
should run `cloudflared tunnel --url http://localhost:5173` directly.

> Security note: the dev server runs with `allowedHosts: true` (vite.config.ts)
> so any generated tunnel subdomain resolves. Combined with the current
> dev-dependency advisories against Vite's `server.fs.deny` on Windows, do not
> leave a tunnel running unattended or on an untrusted network. Nothing here
> affects the built site — these advisories are dev-only and the production
> dependency tree reports zero vulnerabilities.
