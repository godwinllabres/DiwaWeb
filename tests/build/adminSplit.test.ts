import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The public chat bundle must contain no admin code.
 *
 * This is asserted as a security property in app/App.tsx and
 * app/admin/AdminApp.tsx, and it was checked only by
 * tests/e2e/admin-codesplit.demo.cjs — a Playwright script wired to
 * `npm run demo:admin-split`, which no automated path ran, and which could not
 * even start on Windows until recently. This port keeps the same fingerprints
 * but scans the emitted bundles directly, so it runs under `npm test` with no
 * browser download and gates the deploy.
 *
 * The browser-level demo stays: it proves the boundary holds at runtime
 * (which bundles a real page actually requests), which a static scan cannot.
 */

const ASSETS = resolve(__dirname, "..", "..", "dist", "assets");

/** Strings that must never appear in a chunk the public entry can reach. */
const ADMIN_FINGERPRINTS = [
  "X-Admin-Pin",
  "/admin/status",
  "/admin/moderation",
  "/admin/verify",
  "Add a new item to the map",
];

const built = existsSync(ASSETS);

describe("public bundle carries no admin code", () => {
  it("has a build to inspect", () => {
    // In CI this is a hard failure: the workflow builds before it tests, so a
    // missing dist/ means the ordering broke and this suite would otherwise
    // pass by inspecting nothing. Locally it is a skip with a hint.
    if (!built && process.env.CI) {
      throw new Error(
        "dist/assets is missing. CI must run `npm run build` before `npm test`.",
      );
    }
    if (!built) {
      console.warn("[adminSplit] dist/ absent — run `npm run build` to check the bundle split.");
    }
    expect(true).toBe(true);
  });

  it.runIf(built)("ships no admin fingerprint outside the admin chunk", () => {
    const files = readdirSync(ASSETS).filter((f) => f.endsWith(".js"));
    expect(files.length).toBeGreaterThan(0);

    // The admin entry is emitted as admin-<hash>.js (vite.config.ts names the
    // input "admin"). Every other chunk is reachable from the public entry.
    const publicChunks = files.filter((f) => !/^admin-[A-Za-z0-9_-]+\.js$/.test(f));
    expect(publicChunks.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of publicChunks) {
      const src = readFileSync(join(ASSETS, file), "utf8");
      for (const fp of ADMIN_FINGERPRINTS) {
        if (src.includes(fp)) offenders.push(`${file} contains ${JSON.stringify(fp)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it.runIf(built)("emits a distinct admin chunk", () => {
    const files = readdirSync(ASSETS).filter((f) => f.endsWith(".js"));
    // If this fails the two entries have been merged, and the check above
    // would start passing for the wrong reason.
    expect(files.some((f) => /^admin-[A-Za-z0-9_-]+\.js$/.test(f))).toBe(true);
  });
});
