/*!
 * Sevi chat widget — drop-in launcher.
 * (data-diwa-* attributes and window.diwa are kept for embedder compatibility.)
 *
 * Usage on any page (e.g. cvsu.edu.ph):
 *
 *   <script src="https://dev.godwincreates.net/widget.js"
 *           data-diwa-url="https://dev.godwincreates.net"
 *           data-diwa-color="#16803c"
 *           data-diwa-position="bottom-right"
 *           async></script>
 *
 * Drops a floating chat-bubble button bottom-right. Clicking it opens an
 * iframe overlay pointing at <data-diwa-url>?embed=1. Clicking the X (or
 * outside the bubble on mobile) collapses it.
 *
 * Vanilla JS, no framework, no build. Inject via <script src=...> once;
 * everything else is done at load.
 */
(function () {
  "use strict";

  var DEBUG = true; // flip to false for production
  function log() {
    if (!DEBUG) return;
    try { console.log.apply(console, ["[Sevi widget]"].concat([].slice.call(arguments))); } catch (e) {}
  }

  log("script start");

  if (window.__diwaWidgetLoaded) { log("already loaded — skipping"); return; }
  window.__diwaWidgetLoaded = true;

  // If the page itself is the chat (the ?embed=1 iframe, or the fullscreen
  // /chat · ?chat=1 route), don't mount a bubble — that would nest the widget
  // inside itself.
  try {
    var qs = new URLSearchParams(window.location.search);
    if (
      qs.get("embed") === "1" ||
      qs.get("chat") === "1" ||
      /\/chat\/?$/.test(window.location.pathname)
    ) {
      log("chat surface detected on host page — skipping bubble mount");
      window.diwa = { open: function () {}, close: function () {}, toggle: function () {}, reset: function () {} };
      return;
    }
  } catch (e) {}

  // ── Config from the script tag's data-* attributes ────────────────────────
  var self = document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  // Fallback host when the embed tag omits data-diwa-url. Points at the CURRENT
  // Sevi deployment — NOT the old dev.godwincreates.net tunnel, which serves a
  // stale build (that mismatch is why the widget lagged behind the full-screen
  // app). Swap for the final domain (e.g. https://sevi.cvsu.edu.ph) once live.
  var BASE_URL =
    (self && self.getAttribute("data-diwa-url")) ||
    "https://godwincreates.net/diwa";
  var ACCENT =
    (self && self.getAttribute("data-diwa-color")) || "#16803c";
  var POSITION =
    (self && self.getAttribute("data-diwa-position")) || "bottom-right";
  var BTN_LABEL =
    (self && self.getAttribute("data-diwa-label")) || "Chat with Sevi";

  // Auto-open behavior. `data-diwa-open-after="3000"` opens the panel after
  // 3s on page load. `data-diwa-remember="closed"` writes a localStorage flag
  // when the user dismisses the widget so subsequent page loads don't nag.
  var OPEN_AFTER = parseInt(
    (self && self.getAttribute("data-diwa-open-after")) || "0", 10,
  );
  var REMEMBER_CLOSED =
    (self && self.getAttribute("data-diwa-remember")) === "closed";
  var STORAGE_KEY = "diwa_widget_dismissed";

  var EMBED_URL = BASE_URL.replace(/\/$/, "") + "/?embed=1";
  // Fullscreen chat entry — the same app full-window (App.tsx IS_CHAT_PAGE).
  // Query form (not /chat) so it also works on static hosts without an SPA
  // fallback, e.g. GitHub Pages.
  var FULLSCREEN_URL = BASE_URL.replace(/\/$/, "") + "/?chat=1";

  // Internal identity token for the Desk embed. The host page (cvsu_web) sets
  // window.__seviTokenProvider = async () => "<jwt>" (minted from the Desk
  // session); or a static token via data-diwa-token. Passed into the iframe via
  // the URL hash and refreshed by postMessage. Absent -> anonymous public bot.
  var TOKEN_ATTR = (self && self.getAttribute("data-diwa-token")) || null;
  function getToken() {
    try {
      if (typeof window.__seviTokenProvider === "function") {
        return Promise.resolve(window.__seviTokenProvider()).catch(function () { return null; });
      }
    } catch (e) {}
    return Promise.resolve(TOKEN_ATTR);
  }

  // ── Z-index above most page chrome but below modals / toasts ───────────────
  var Z = 2147483600;

  // ── Layout queries ────────────────────────────────────────────────────────
  // The floating bottom-right panel is only worth showing when there is room
  // for it in BOTH axes. Width alone used to decide this, which meant a phone
  // in landscape (e.g. 844x390) read as "desktop" and got a 420px panel whose
  // height collapsed to min(720px, 100dvh - 100px) = 290px — a conversation in
  // a letterbox. Anything shorter than 600px now gets the fullscreen
  // treatment, which is exactly the space a rotated phone has to give.
  var PANEL_MQ = "(min-width: 640px) and (min-height: 600px)";
  // Short viewport: every phone in landscape (932x430 on the largest) sits
  // under this, every tablet in landscape (768+) sits above it.
  var shortMq = window.matchMedia("(max-height: 560px)");

  function onMediaChange(mql, handler) {
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else if (mql.addListener) mql.addListener(handler);
  }

  function isPanelLayout() {
    try {
      return window.matchMedia(PANEL_MQ).matches;
    } catch (e) {
      return false;
    }
  }

  // ── Build the launcher button ─────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", BTN_LABEL);
  btn.setAttribute("data-diwa-launcher", "");
  btn.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
    'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 ' +
    "8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 " +
    "8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 " +
    '8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round"/></svg>';

  var corner =
    POSITION === "bottom-left"
      ? "left: 20px;"
      : POSITION === "top-right"
        ? "top: 20px; right: 20px;"
        : POSITION === "top-left"
          ? "top: 20px; left: 20px;"
          : "right: 20px;";

  btn.style.cssText =
    "position: fixed; " +
    (POSITION.indexOf("top") === 0 ? "" : "bottom: 20px;") +
    corner +
    "width: 60px; height: 60px; border-radius: 50%; border: 0; " +
    "background: " + ACCENT + "; color: #ffffff; " +
    "box-shadow: 0 6px 24px rgba(0,0,0,0.18); cursor: pointer; " +
    "display: flex; align-items: center; justify-content: center; " +
    "transition: transform 0.15s ease, box-shadow 0.15s ease; " +
    "z-index: " + Z + ";";

  btn.onmouseenter = function () {
    btn.style.transform = "scale(1.05)";
    btn.style.boxShadow = "0 10px 32px rgba(0,0,0,0.22)";
  };
  btn.onmouseleave = function () {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 6px 24px rgba(0,0,0,0.18)";
  };

  // ── Overlay container (lazy-built on first open) ──────────────────────────
  var overlay = null;
  var iframe = null;
  var isOpen = false;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.setAttribute("data-diwa-overlay", "");
    overlay.style.cssText =
      "position: fixed; inset: 0; z-index: " + (Z - 1) + "; " +
      "background: rgba(0, 0, 0, 0.45); " +
      "display: none; align-items: flex-end; justify-content: flex-end; " +
      "padding: 0;";

    // Click outside the panel closes (desktop convenience).
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeWidget();
    });

    var panel = document.createElement("div");
    panel.setAttribute("data-diwa-panel", "");
    panel.style.cssText =
      "position: relative; background: #ffffff; " +
      "width: 100%; height: 100%; max-width: 100vw; max-height: 100dvh; " +
      "box-shadow: 0 12px 48px rgba(0,0,0,0.25); " +
      "display: flex; flex-direction: column; overflow: hidden;";

    // Desktop sizing — slide-in panel from bottom-right, not fullscreen.
    // On desktop the widget is NON-modal: the backdrop is transparent and
    // click-through (pointer-events: none) so the page behind stays usable
    // while chatting. Mobile keeps the fullscreen modal treatment.
    var mq = window.matchMedia(PANEL_MQ);
    function applySize() {
      if (mq.matches) {
        panel.style.width = "420px";
        panel.style.height = "min(720px, calc(100dvh - 100px))";
        panel.style.borderRadius = "20px";
        panel.style.margin = "0 20px 90px 0";
        panel.style.pointerEvents = "auto";
        overlay.style.background = "transparent";
        overlay.style.pointerEvents = "none";
      } else {
        panel.style.width = "100%";
        panel.style.height = "100dvh";
        panel.style.borderRadius = "0";
        panel.style.margin = "0";
        panel.style.pointerEvents = "auto";
        overlay.style.background = "rgba(0, 0, 0, 0.45)";
        overlay.style.pointerEvents = "auto";
      }
      // `header` is built further down and is undefined on this first call;
      // it gets its size from the same helper right after it is created.
      if (header) applyHeaderSize();
    }
    applySize();
    onMediaChange(mq, applySize);
    // Rotating a phone crosses PANEL_MQ too, but a device that is short in
    // BOTH orientations (or a resized desktop window) would not — watch the
    // height on its own so the header always matches the space available.
    onMediaChange(shortMq, applySize);

    // Header bar — gives the close X its own space ABOVE the iframe so it
    // never overlaps with content rendered inside the iframe (e.g. the map
    // dialog's own close button at the iframe's top-right corner).
    var header = document.createElement("div");
    header.setAttribute("data-diwa-header", "");
    header.style.cssText =
      "flex: 0 0 auto; height: 44px; background: " + ACCENT + "; color: #ffffff; " +
      "display: flex; align-items: center; justify-content: space-between; " +
      "padding: 0 12px 0 16px; font: 600 14px system-ui, -apple-system, sans-serif;";

    // A landscape phone has ~390px of height to spend in total, so a 44px
    // chrome bar is more than a tenth of the conversation. Trim it (and the
    // close button with it) whenever the viewport is short.
    function applyHeaderSize() {
      var short = shortMq.matches;
      header.style.height = short ? "34px" : "44px";
      header.style.fontSize = short ? "13px" : "14px";
      var btnSize = short ? "26px" : "32px";
      closeBtn.style.width = btnSize;
      closeBtn.style.height = btnSize;
      if (expandBtn) {
        expandBtn.style.width = btnSize;
        expandBtn.style.height = btnSize;
      }
    }

    var title = document.createElement("span");
    title.textContent = "Sevi";
    title.style.cssText = "letter-spacing: 0.02em;";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round"/></svg>';
    closeBtn.style.cssText =
      "width: 32px; height: 32px; border-radius: 50%; border: 0; " +
      "background: rgba(255,255,255,0.15); color: #ffffff; cursor: pointer; " +
      "display: flex; align-items: center; justify-content: center;";
    closeBtn.onmouseenter = function () {
      closeBtn.style.background = "rgba(255,255,255,0.28)";
    };
    closeBtn.onmouseleave = function () {
      closeBtn.style.background = "rgba(255,255,255,0.15)";
    };
    closeBtn.onclick = closeWidget;

    // Fullscreen link — desktop/tablet only (on phones the widget already
    // fills the screen, so the extra tab would just be noise).
    var actions = document.createElement("div");
    actions.style.cssText = "display: flex; align-items: center; gap: 6px;";
    var wantsFullscreen = false;
    try {
      wantsFullscreen =
        window.matchMedia("(min-width: 768px)").matches && !shortMq.matches;
    } catch (e) {}
    if (wantsFullscreen) {
      var expandBtn = document.createElement("a");
      expandBtn.href = FULLSCREEN_URL;
      expandBtn.target = "_blank";
      expandBtn.rel = "noopener";
      expandBtn.setAttribute("aria-label", "Open chat in fullscreen (new tab)");
      expandBtn.title = "Open in fullscreen";
      expandBtn.innerHTML =
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" ' +
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" ' +
        'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" ' +
        'stroke-linejoin="round"/></svg>';
      expandBtn.style.cssText =
        "width: 32px; height: 32px; border-radius: 50%; " +
        "background: rgba(255,255,255,0.15); color: #ffffff; cursor: pointer; " +
        "display: flex; align-items: center; justify-content: center; text-decoration: none;";
      expandBtn.onmouseenter = function () {
        expandBtn.style.background = "rgba(255,255,255,0.28)";
      };
      expandBtn.onmouseleave = function () {
        expandBtn.style.background = "rgba(255,255,255,0.15)";
      };
      actions.appendChild(expandBtn);
    }
    actions.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(actions);
    applyHeaderSize();

    iframe = document.createElement("iframe");
    iframe.title = "Sevi — CvSU Virtual Assistant";
    // Hand the internal token to the embedded app via the URL hash (not sent to
    // the server / not logged), then refresh on request via postMessage.
    getToken().then(function (tok) {
      // Cache-bust the entry document so the widget ALWAYS loads the current
      // build and stays in lock-step with the full-screen app. Cloudflare pins
      // index.html (max-age=600, overriding nginx no-cache), which otherwise
      // leaves the embedded iframe showing a stale bundle. Hashed /assets are
      // still cached normally, so this only re-fetches the tiny index.html.
      var join = EMBED_URL.indexOf("?") === -1 ? "?" : "&";
      var fresh = EMBED_URL + join + "_cb=" + Date.now();
      iframe.src = fresh + (tok ? "#sevi_token=" + encodeURIComponent(tok) : "");
    });
    window.addEventListener("message", function (e) {
      if (!iframe || e.source !== iframe.contentWindow) return;
      if (e.data && e.data.type === "sevi:need-token") {
        getToken().then(function (tok) {
          if (tok) e.source.postMessage({ type: "sevi:token", token: tok }, "*");
        });
      }
    });
    iframe.setAttribute(
      "allow",
      "clipboard-write; clipboard-read; microphone *",
    );
    iframe.style.cssText =
      "border: 0; flex: 1 1 auto; width: 100%; min-height: 0; display: block; background: #ffffff;";

    panel.appendChild(header);
    panel.appendChild(iframe);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function openWidget() {
    if (!overlay) buildOverlay();
    overlay.style.display = "flex";
    btn.style.display = "none";
    isOpen = true;
    // Lock page scroll only for the fullscreen (mobile) treatment — the
    // desktop panel is non-modal and the page should keep scrolling.
    if (!isPanelLayout()) {
      document.documentElement.style.overflow = "hidden";
    }
  }
  function closeWidget() {
    if (overlay) overlay.style.display = "none";
    btn.style.display = "flex";
    isOpen = false;
    document.documentElement.style.overflow = "";
    if (REMEMBER_CLOSED) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
    }
  }

  // Auto-open after the configured delay, but only if the user hasn't already
  // dismissed the widget on a previous visit (when REMEMBER_CLOSED is on).
  function scheduleAutoOpen() {
    if (OPEN_AFTER <= 0) return;
    var dismissed = false;
    if (REMEMBER_CLOSED) {
      try { dismissed = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) {}
    }
    if (dismissed) {
      log("auto-open skipped — user previously dismissed");
      return;
    }
    log("auto-open scheduled in " + OPEN_AFTER + "ms");
    setTimeout(function () {
      if (!isOpen) openWidget();
    }, OPEN_AFTER);
  }

  btn.onclick = function () {
    if (isOpen) closeWidget();
    else openWidget();
  };

  // Close on Esc.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeWidget();
  });

  // Append after the body exists. If the script is in <head>, defer.
  function mount() {
    if (!document.body) {
      log("no document.body yet — deferring");
      return;
    }
    document.body.appendChild(btn);
    log(
      "bubble mounted",
      "tag=" + self.tagName,
      "base=" + BASE_URL,
      "embed=" + EMBED_URL,
      "color=" + ACCENT,
      "position=" + POSITION,
      "open-after=" + OPEN_AFTER,
      "remember-closed=" + REMEMBER_CLOSED,
    );
    scheduleAutoOpen();
  }
  if (document.body) {
    mount();
  } else {
    log("waiting for DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", mount);
  }

  // ── Public API on window.diwa ─────────────────────────────────────────────
  window.diwa = {
    open: openWidget,
    close: closeWidget,
    toggle: function () { isOpen ? closeWidget() : openWidget(); },
    // Clear the "user previously dismissed" flag — useful for QA/testing
    // when you want to see the auto-open behavior again without clearing
    // all of localStorage by hand.
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      log("dismissed flag cleared");
    },
  };
})();
