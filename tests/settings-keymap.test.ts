import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
} from "@/lib/settings/settings";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";

function mergedShortcuts(shortcuts: unknown): Settings["shortcuts"] {
  return mergeSettings(DEFAULT_SETTINGS, { shortcuts }).shortcuts;
}

describe("DEFAULT_SETTINGS.shortcuts (AC-009)", () => {
  it("should default the shortcuts override map to empty", () => {
    expect(DEFAULT_SETTINGS.shortcuts).toEqual({});
  });
});

describe("mergeSettings shortcuts sanitization (AC-011 / TC-008 / E-7 / E-8)", () => {
  it("should keep a valid override that resolves to the overridden binding", () => {
    const merged = mergedShortcuts({ "flip-card": "Enter" });

    expect(merged).toHaveProperty("flip-card");
    expect(resolveShortcuts(merged)["flip-card"]).toBe("Enter");
  });

  it("should drop an override for an unknown action id", () => {
    const merged = mergedShortcuts({
      "flip-card": "Enter",
      "bogus-id": "X",
    });

    expect(merged).not.toHaveProperty("bogus-id");
    expect(merged).toHaveProperty("flip-card");
  });

  it("should drop an override whose hotkey is invalid", () => {
    const merged = mergedShortcuts({ "flip-card": "not a hotkey!!" });

    expect(merged).not.toHaveProperty("flip-card");
    expect(resolveShortcuts(merged)["flip-card"]).toBe("Space");
  });

  it("should drop an override whose hotkey is an empty string", () => {
    const merged = mergedShortcuts({ "toggle-sidebar": "" });

    expect(merged).not.toHaveProperty("toggle-sidebar");
  });

  it("should coerce a non-object shortcuts blob to an empty map without throwing", () => {
    const blobs: unknown[] = [null, "nope", 42, []];

    blobs.forEach((blob) => {
      expect(() => mergedShortcuts(blob)).not.toThrow();
      expect(mergedShortcuts(blob)).toEqual({});
    });
  });
});

describe("shortcuts round-trip through the SettingsStore port (AC-009 / TC-008)", () => {
  it("should carry a saved shortcuts override into a freshly loaded Settings", async () => {
    const store = createInMemorySettingsStore();
    const loaded = await store.load();

    await store.save({ ...loaded, shortcuts: { "flip-card": "Enter" } });
    const reloaded = await store.load();

    expect(reloaded.shortcuts).toEqual({ "flip-card": "Enter" });
    expect(resolveShortcuts(reloaded.shortcuts)["flip-card"]).toBe("Enter");
  });
});
