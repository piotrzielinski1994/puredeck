// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Scanner } from "@tailwindcss/oxide";
import { describe, expect, it } from "vitest";

// Build-level guard for a bug jsdom unit tests cannot catch: Tailwind v4
// auto-detects sources but SKIPS node_modules, so utility classes used ONLY
// inside @pziel/pureui components (the context-menu's min-w-[10rem] width and
// its min-h-9 touch sizing) are never generated. Without them the hoisted
// context menu renders with the wrong width / hit-target on mobile. The fix is
// an explicit `@source` for the pureui bundle in src/index.css.
//
// Two assertions pin the fix: (1) src/index.css declares an `@source` covering
// the pureui bundle; (2) scanning that bundle with Tailwind's own oxide Scanner
// surfaces the context-menu candidates. Delete the @source line and (1)
// goes RED. See docs/learnings.md.

const ROOT = resolve(__dirname, "..");
const PUREUI_DIST = resolve(ROOT, "node_modules/@pziel/pureui/dist");

describe("app Tailwind build scans @pziel/pureui", () => {
  it("declares an @source that resolves to the pureui bundle", () => {
    const css = readFileSync(resolve(ROOT, "src/index.css"), "utf8");
    const match = css.match(/@source\s+"([^"]+)"/);
    expect(
      match,
      "src/index.css must @source the pureui bundle",
    ).not.toBeNull();

    // Resolve the directive relative to the CSS file's dir (as Tailwind does).
    const target = resolve(ROOT, "src", match![1]);
    expect(existsSync(target)).toBe(true);
    // The directive must cover the pureui dist (its components carry the classes).
    expect(
      target.startsWith(PUREUI_DIST) || PUREUI_DIST.startsWith(target),
    ).toBe(true);
  });

  it("emits the pureui context-menu utilities when scanned", () => {
    const scanner = new Scanner({
      sources: [{ base: PUREUI_DIST, pattern: "**/*", negated: false }],
    });
    const candidates = scanner.scan();

    // These context-menu utilities live ONLY inside pureui's context-menu
    // component; if the app doesn't scan pureui they never get generated.
    expect(candidates).toContain("min-w-[10rem]");
    expect(candidates).toContain("min-h-9");
  });
});
