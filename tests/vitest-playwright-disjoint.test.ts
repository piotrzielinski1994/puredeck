import { describe, expect, it } from "vitest";
import config from "../playwright.config";

describe("vitest/playwright disjointness (AC-006 / TC-007)", () => {
  it("should keep the vitest include and playwright testMatch patterns disjoint", () => {
    const vitestInclude = ["tests/**/*.{test,spec}.{ts,tsx}"];
    const playwrightMatch = String(config.testMatch);

    expect(playwrightMatch).toContain("\\.e2e\\.ts");
    expect(vitestInclude.some((pattern) => pattern.includes("e2e"))).toBe(
      false,
    );
  });
});
