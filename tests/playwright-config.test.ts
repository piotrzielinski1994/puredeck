import { describe, expect, it } from "vitest";
import config from "../playwright.config";

describe("playwright config (AC-004 / TC-015)", () => {
  it("should target the tests/e2e directory with the e2e testMatch", () => {
    expect(config.testDir).toBe("tests/e2e");
    expect(config.testMatch).toEqual(/.*\.e2e\.ts$/);
  });

  it("should run the dev server on the vite devPort 1433", () => {
    const webServer = Array.isArray(config.webServer)
      ? config.webServer[0]
      : config.webServer;
    expect(webServer?.command).toBe("npm run dev");
    expect(webServer?.url).toBe("http://localhost:1433");
    expect(webServer?.reuseExistingServer).toBe(!process.env.CI);
  });
});
