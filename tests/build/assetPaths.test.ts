import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No deploy-target value may be a literal in source.
 *
 * Vite rewrites root-relative URLs in HTML attributes, but NOT string literals
 * inside TSX. So `src="/how-to-use-sevi.webm"` silently resolves to the server
 * root and 404s on the GitHub Pages deploy, which serves under /diwa/. That
 * exact bug shipped: the landing-page tour video and its poster were broken in
 * production until a base-path regression pass caught them.
 *
 * Assets referenced from source must be built from import.meta.env.BASE_URL,
 * the way SeviAvatar and SeviSticker already do it.
 */

const REPO = resolve(__dirname, "..", "..");

const ASSET_LITERAL =
  /["'`]\/[A-Za-z0-9_\-./]+\.(?:png|jpe?g|svg|gif|webm|webp|ico|mp4|avif)["'`]/;

function sourceFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "app/*.ts", "app/*.tsx"], {
    cwd: REPO,
    encoding: "utf8",
  });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Strip line and block comments so prose about the rule does not trip it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

describe("asset paths resolve from the Vite base", () => {
  it("has source files to scan", () => {
    expect(sourceFiles().length).toBeGreaterThan(10);
  });

  it("contains no root-absolute asset literal in app/ source", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const lines = stripComments(readFileSync(resolve(REPO, file), "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (ASSET_LITERAL.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
      });
    }

    // Build the URL from BASE_URL instead:
    //   const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
    //   <img src={`${BASE_URL}thing.png`} />
    expect(offenders).toEqual([]);
  });
});
