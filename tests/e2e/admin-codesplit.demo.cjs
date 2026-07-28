/**
 * Admin decoupling demo / e2e check (Phase 2).
 *
 * Proves the structural boundary: the admin panel is its OWN Vite entry with
 * its own bundle, and the public chat page downloads none of it — not the UI,
 * not the admin route names, not the X-Admin-Pin plumbing.
 *
 *   npm run demo:admin-split
 *
 * Self-contained: builds if dist/ is missing, launches vite preview on a fixed
 * port, drives a headless Chromium, writes screenshots, prints a report, and
 * tears the server down. Exit code 0 = pass, non-zero = fail.
 *
 * Requires the Chromium browser once:  npx playwright install chromium
 *
 * The backend is stubbed at the network layer, so no Sevi API is needed.
 *
 * NOTE ON PATHS: the admin entry is built to dist/admin/index.html, so /admin/
 * resolves on any static host (GitHub Pages) as a directory index, and nginx
 * serves the same path (deploy/nginx.conf). This test hits /admin/ — the URL
 * the app actually links to — rather than the emitted filename, because the
 * mismatch between the two is exactly the bug it needs to catch.
 */
const { chromium } = require("playwright");
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

// This script had never run on Windows. `spawn("npx", …)` is ENOENT there (npx
// is a .cmd shim), and naming the shim instead is EINVAL on Node >= 20, which
// refuses to exec .cmd without a shell (CVE-2024-27980). Rather than reach for
// shell:true — which concatenates argv unescaped (DEP0190) — run Vite's own JS
// entry with the Node binary already executing this file. No shim, no shell,
// identical on every platform.
const WIN = process.platform === "win32";
const NPM = WIN ? "npm.cmd" : "npm";
const VITE_BIN = path.join(__dirname, "..", "..", "node_modules", "vite", "bin", "vite.js");
const PORT = Number(process.env.PORT || 4179);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..");
const DIST = path.join(ROOT, "dist");
const SHOTS = path.join(__dirname, "screenshots");

// Fingerprints of the admin surface that must never reach the public page.
const ADMIN_FINGERPRINTS = [
  "X-Admin-Pin",
  "/admin/status",
  "/admin/moderation",
  "/admin/verify",
  "Add a new item to the map",
];

const kB = (n) => (n / 1024).toFixed(1) + " kB";

function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => { res.resume(); resolve(); });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("preview server did not start"));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

/** Read the on-disk bundle for each JS file the page actually requested. */
function scanLoadedBundles(urls) {
  const hits = [];
  let bytes = 0;
  for (const u of urls) {
    const file = path.join(DIST, "assets", path.basename(new URL(u).pathname));
    if (!fs.existsSync(file)) continue;
    bytes += fs.statSync(file).size;
    const src = fs.readFileSync(file, "utf8");
    for (const fp of ADMIN_FINGERPRINTS) {
      if (src.includes(fp)) hits.push({ file: path.basename(file), fingerprint: fp });
    }
  }
  return { hits, bytes };
}

(async () => {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.log("• dist/ missing — running `npm run build` first…");
    // Fixed argv, no interpolation, so shell:true is safe here; npm is the one
    // caller we cannot replace with a JS entry point.
    const b = spawnSync(NPM, ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: WIN });
    if (b.status !== 0) { console.error("build failed"); process.exit(2); }
  }

  console.log(`• starting vite preview on :${PORT} …`);
  const preview = spawn(process.execPath,
    [VITE_BIN, "preview", "--port", String(PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore" });
  const shutdown = () => { try { preview.kill(); } catch (e) {} };
  process.on("exit", shutdown);
  process.on("SIGINT", () => { shutdown(); process.exit(130); });

  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); return cond ? "✓" : "✗"; };

  try {
    await waitForServer(BASE + "/");
    fs.mkdirSync(SHOTS, { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1180, height: 840 }, deviceScaleFactor: 2 });

    // Stub the Sevi API so the app renders offline and the panel populates.
    await context.route("**/api/**", (route) => {
      const p = new URL(route.request().url()).pathname.replace(/^\/api/, "");
      const json = (o) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(o) });
      if (p === "/health") return json({ status: "healthy", classifier_ready: true, model_loaded: true, intents_available: 127 });
      if (p === "/admin/verify") return json({ status: "ok" });
      if (p.startsWith("/admin/status")) return json({ service: "Sevi API", uptime_seconds: 4211, brain: { classifier_ready: true, neural_net_ready: true, charter_rag: { available: true, chunks: 342 }, usage: { naive_bayes: 88, neural_network: 31, llm_claude: 9 } }, llm: { provider: "claude", model: "claude-haiku-4-5", available: true, second_opinion: false }, moderation: { blocked: 3, flagged: 11 }, connectors_bridge: {}, ais_bridge: {}, campus_context: {} });
      if (p.startsWith("/admin/moderation")) return json({ counts: { blocked: 3, flagged: 11 }, recent: [], lexicon: { loaded: true, version: "2026.06", entries: 512, forms: 1840 } });
      if (p.startsWith("/admin/llm")) return json({ provider: "claude", model: "claude-haiku-4-5", available: true, ollama_models: [] });
      if (p.startsWith("/logs/today")) return json({ messages: 128, sessions: 22, fallbacks: 6 });
      if (p.startsWith("/logs")) return json({});
      if (p.startsWith("/feedback/stats")) return json({ total_feedback: 44, avg_rating: 4.3, helpful_pct: 86 });
      if (p.startsWith("/feedback")) return json({ count: 0, feedback: [], positive: [], negative: [] });
      if (p.startsWith("/map")) return json({ places: [], coords: {}, overrides: {}, markers: {} });
      if (p.startsWith("/topics/recommended")) return json({ today: "", season: "", label: "", reason: "", tags: [] });
      if (p.startsWith("/intents")) return json({ total_intents: 127, intents: [] });
      return json({});
    });

    // Consent pre-accepted so the chat renders; deliberately NOT admin-authed,
    // so the admin entry shows its PIN gate.
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem("diwa_privacy_consent_v1", JSON.stringify({ accepted: true, timestamp: new Date(0).toISOString() }));
      } catch (e) {}
    });

    // ── PHASE A — the public chat page ──────────────────────────────────
    const pubPage = await context.newPage();
    const pubJs = [];
    pubPage.on("request", (r) => { if (/\.js(\?|$)/.test(r.url())) pubJs.push(r.url()); });
    await pubPage.goto(`${BASE}/?embed=1`, { waitUntil: "networkidle" });
    await pubPage.waitForTimeout(600);
    await pubPage.screenshot({ path: path.join(SHOTS, "01-public-chat.png") });
    const pub = scanLoadedBundles(pubJs);
    const pubAdminEntry = pubJs.filter((u) => /\/admin-[A-Za-z0-9_-]+\.js/.test(u));
    await pubPage.close();

    // ── PHASE B — the admin entry, locked ───────────────────────────────
    const admPage = await context.newPage();
    const admJs = [];
    admPage.on("request", (r) => { if (/\.js(\?|$)/.test(r.url())) admJs.push(r.url()); });
    await admPage.goto(`${BASE}/admin/`, { waitUntil: "networkidle" });
    await admPage.waitForSelector("#admin-pin", { timeout: 8000 });
    const lockedVisible = await admPage.isVisible("#admin-pin");
    await admPage.screenshot({ path: path.join(SHOTS, "02-admin-locked.png") });
    const adm = scanLoadedBundles(admJs);
    const admEntry = admJs.filter((u) => /\/admin-[A-Za-z0-9_-]+\.js/.test(u));

    // ── PHASE C — unlock with the PIN ───────────────────────────────────
    await admPage.fill("#admin-pin", "1234");
    await admPage.click('button[type="submit"]');
    await admPage.waitForTimeout(1200);
    const unlocked = !(await admPage.isVisible("#admin-pin").catch(() => false));
    await admPage.screenshot({ path: path.join(SHOTS, "03-admin-unlocked.png") });
    await browser.close();

    // ── Report ──────────────────────────────────────────────────────────
    const m1 = ok(pubAdminEntry.length === 0, "public page requested the admin bundle");
    const m2 = ok(pub.hits.length === 0, "admin fingerprints found in public bundles");
    const m3 = ok(admEntry.length > 0, "admin page did not load its own bundle");
    const m4 = ok(lockedVisible, "admin PIN gate did not render");
    const m5 = ok(unlocked, "admin dashboard did not open after unlock");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ADMIN DECOUPLING — Phase 2 (separate entry + separate bundle)");
    console.log("══════════════════════════════════════════════════════════════");
    console.log(`\n  PHASE A   GET /            → public chat page`);
    console.log(`     JS bundles loaded:     ${pubJs.length}  (${kB(pub.bytes)} on disk)`);
    console.log(`     admin bundle:          ${m1}  ${pubAdminEntry.length === 0 ? "not requested" : "REQUESTED"}`);
    console.log(`     admin fingerprints:    ${m2}  ${pub.hits.length === 0 ? "none in any loaded bundle" : JSON.stringify(pub.hits)}`);
    console.log(`        checked for:        ${ADMIN_FINGERPRINTS.map((s) => `"${s}"`).join(", ")}`);
    console.log(`\n  PHASE B   GET /admin/      → admin app (locked)`);
    console.log(`     own bundle loaded:     ${m3}  ${admEntry.map((u) => path.basename(u)).join(", ") || "—"}`);
    console.log(`     PIN gate rendered:     ${m4}`);
    console.log(`\n  PHASE C   submit PIN       → dashboard`);
    console.log(`     dashboard opened:      ${m5}`);
    console.log(`\n  Screenshots → tests/e2e/screenshots/`);
    console.log(`     01-public-chat.png · 02-admin-locked.png · 03-admin-unlocked.png`);
    console.log(`\n  RESULT: ${fails.length === 0 ? "PASS ✓  the public bundle contains no admin code or admin API surface" : "FAIL ✗  " + fails.join("; ")}`);
    console.log("══════════════════════════════════════════════════════════════\n");
    shutdown();
    process.exit(fails.length === 0 ? 0 : 1);
  } catch (err) {
    console.error(err);
    shutdown();
    process.exit(2);
  }
})();
