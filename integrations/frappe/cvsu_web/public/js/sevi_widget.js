/*
 * Sevi chat widget injector — CvSU internal Desk.
 *
 * Registered via `app_include_js` in hooks.py, so it runs on /app/* for
 * LOGGED-IN employees only. It injects Sevi's launcher (widget.js), which
 * reads its config from the data-* attributes set on the element below.
 *
 * Deploy path in the app:  cvsu_web/cvsu_web/public/js/sevi_widget.js
 * Served after `bench build` at:  /assets/cvsu_web/js/sevi_widget.js
 */
(function () {
  "use strict";

  // Guard: Frappe Desk is a SPA, but app_include_js loads once per full page
  // load — this also protects against any accidental double-include.
  if (window.__seviInjected) return;
  window.__seviInjected = true;

  // Never mount inside Sevi's own iframe (defensive).
  try {
    if (new URLSearchParams(window.location.search).get("embed") === "1") return;
  } catch (e) {}

  // Point this at a Sevi that HAS the AIS/HR connectors enabled — otherwise
  // finance/DTR queries fall through to the student NLU (no MCP results).
  //   • Local Desk testing: the connector stack in demo mode ->
  //       var SEVI_HOST = "http://localhost:8091";
  //     (demo mode = no auth needed; MCP routes for everyone locally.)
  //   • dev.godwincreates.net has NO connectors — do NOT use it for internal.
  //   • Staging/prod: the fenced Sevi host — the Desk must also mint + send a
  //     JWT (see docs/phase0-auth-fencing.md), or the fence blocks AIS/HR.
  //
  // The default is a deliberately invalid HTTPS host so that forgetting to set
  // it fails LOUDLY with a DNS error. A leftover "http://localhost:8091" on an
  // HTTPS Desk is blocked as mixed content instead — the widget simply never
  // appears, with nothing on screen to say why.
  var SEVI_HOST = "https://REPLACE_ME.cvsu.edu.ph";

  var s = document.createElement("script");
  s.src = SEVI_HOST + "/widget.js";
  s.async = true;
  s.setAttribute("data-diwa-url", SEVI_HOST);
  s.setAttribute("data-diwa-color", "#0C6B45");        // CvSU green
  s.setAttribute("data-diwa-position", "bottom-right");
  s.setAttribute("data-diwa-label", "Ask Sevi");
  (document.body || document.documentElement).appendChild(s);
})();
