# Sevi Chat Widget — Frappe / ERPNext v15 Embed Handoff

**Goal:** drop the Sevi chat bubble into a Frappe/ERPNext site (CvSU).
**Method:** the one-line launcher script (`widget.js`) — Option 1.
**Audience note:** if Sevi is for *students*, you want the **website/portal**, not the Desk.

---

## 0. What you're embedding

`widget.js` injects a floating bubble; clicking it opens Sevi (`/?embed=1`) in an
overlay iframe. Verified: the embed URL sends **no `X-Frame-Options` / CSP
`frame-ancestors`**, so it iframes fine from any domain.

Config is read from `data-*` attributes on the script tag:

| Attribute | Default | Purpose |
|---|---|---|
| `data-diwa-url` | `https://godwincreates.net/diwa` | Where Sevi is hosted (current build; swap for the final domain e.g. `https://sevi.cvsu.edu.ph` once live) |
| `data-diwa-color` | `#16803c` | Bubble + header accent |
| `data-diwa-position` | `bottom-right` | also `bottom-left`, `top-right`, `top-left` |
| `data-diwa-label` | `Chat with Sevi` | button aria-label |
| `data-diwa-open-after` | `0` | auto-open after N ms |
| `data-diwa-remember` | — | `"closed"` = don't reopen after dismissal |

---

## 1. Pick the surface (where Sevi appears)

Frappe has two separate include hooks — choose based on who should see the bubble:

| Hook (`hooks.py`) | Loads on | Who sees it |
|---|---|---|
| `app_include_js` | the Desk (`/app/*`) | **logged-in staff** (ERP users) |
| `web_include_js` | website + portal (`/`, `/login`, web pages, logged-in **portal**) | **the public + students** |

For a student-facing assistant → **`web_include_js`**. For an internal staff
helper → `app_include_js`. For both → list it in both.

---

## 2. Implementation — custom app hook (recommended, upgrade-safe)

> Golden rule: never touch core. This lives in a **custom app**. Use your existing
> CvSU custom app if you have one (`bench list-apps`); otherwise:
> `bench new-app cvsu_web` then `bench --site <site> install-app cvsu_web`.

### Step 1 — the injector asset

Create `cvsu_web/cvsu_web/public/js/sevi_widget.js`:

```js
/* Injects the Sevi chat widget once per page load. */
(function () {
  if (window.__seviInjected) return;      // guard against double-mount
  window.__seviInjected = true;

  // Don't mount inside Sevi's own iframe if this ever loads there.
  try { if (new URLSearchParams(location.search).get("embed") === "1") return; } catch (e) {}

  var s = document.createElement("script");
  s.src = "https://<YOUR-SEVI-HOST>/widget.js";          // <-- set stable host
  s.async = true;
  s.setAttribute("data-diwa-url", "https://<YOUR-SEVI-HOST>");
  s.setAttribute("data-diwa-color", "#0C6B45");          // CvSU green
  s.setAttribute("data-diwa-position", "bottom-right");
  (document.body || document.documentElement).appendChild(s);
})();
```

The widget reads its `data-*` from `document.currentScript`, which resolves to
this injected element during execution — so the config above is honoured.

### Step 2 — register it in `hooks.py`

`cvsu_web/cvsu_web/hooks.py`:

```python
# Public website + student portal:
web_include_js = ["/assets/cvsu_web/js/sevi_widget.js"]

# (optional) also on the logged-in Desk:
# app_include_js = ["/assets/cvsu_web/js/sevi_widget.js"]
```

### Step 3 — build & clear caches

```bash
bench build --app cvsu_web
bench --site <site> clear-cache
bench --site <site> clear-website-cache
bench restart            # production; on dev a hard refresh is enough
```

`bench build` symlinks `public/` to `/assets/cvsu_web/…`, so the path in
`hooks.py` resolves. Changing `hooks.py` needs the clear-cache + restart to take.

---

## 3. Alternative — no custom app (website pages only, fastest)

If your site has the **Website Script** doctype (Website workspace — confirm it
exists in your v15), paste the *body* of the injector from Step 1 there. It loads
on website/portal pages with no app, build, or deploy. Trade-off: it's a UI-only
change living in one site's DB — **export it as a fixture** if you want it
versioned/deployable (golden rule), and it does **not** cover the Desk.

---

## 4. Caveats — read before go-live

1. **Stable URL — do NOT ship the dev tunnel.** `dev.godwincreates.net` is a local
   cloudflared tunnel; it dies when the dev machine/tunnel is off. Host SeviWeb on
   a real domain (e.g. `sevi.cvsu.edu.ph`) and point `data-diwa-url` there.
2. **Content-Security-Policy.** If your Frappe/nginx sets a CSP (some hardened
   deployments do), allow-list the Sevi host in **both** directives:
   `script-src https://<YOUR-SEVI-HOST>;` and `frame-src https://<YOUR-SEVI-HOST>;`
   Otherwise the bubble script or the chat iframe is blocked. No CSP set → nothing to do.
3. **Turn off debug logging.** `widget.js` currently has `var DEBUG = true;` — it
   logs `[Sevi widget] …` to the console on every page. Ask for a production build
   with `DEBUG = false`.
4. **Desk = logged-in only.** `app_include_js` never runs for anonymous users; use
   `web_include_js` for anything public.
5. **z-index.** The bubble sits at `2147483600` — above the Frappe navbar (fine),
   but sanity-check it doesn't cover a Frappe modal's action button on small screens.
6. **Data Privacy.** Sevi logs chat messages. For a CvSU deployment, make sure the
   student-facing privacy notice (already shown by Sevi before first message) is
   consistent with your site's Data Privacy Act notice / consent.

---

## 5. Verify

- [ ] Bubble appears bottom-right on the intended surface (website and/or Desk).
- [ ] Clicking opens Sevi; the greeting + privacy notice render inside the iframe.
- [ ] A real question returns an answer (backend reachable from the user's browser).
- [ ] `data-diwa-color` is CvSU green, `data-diwa-url` is the stable host.
- [ ] Browser console is clean (DEBUG off).
- [ ] If CSP is set, no `Refused to load / frame` errors in the console.
- [ ] (If via Website Script) exported as a fixture so it survives redeploys.
