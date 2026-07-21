import { describe, expect, it } from "vitest";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
} from "@/lib/settings/settings";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";

function mergedShortcuts(shortcuts: unknown): Settings["shortcuts"] {
  return mergeSettings(DEFAULT_SETTINGS, { shortcuts }).shortcuts;
}

describe("DEFAULT_SETTINGS.shortcuts (AC-002)", () => {
  it("should default the shortcuts override map to empty", () => {
    expect(DEFAULT_SETTINGS.shortcuts).toEqual({});
  });
});

describe("mergeSettings shortcuts migration (AC-002 / TC-004 / TC-005)", () => {
  it("should migrate a legacy string override to a one-element list", () => {
    const merged = mergedShortcuts({ "flip-card": "Enter" });

    expect(merged["flip-card"]).toEqual(["Enter"]);
  });

  it("should normalize a legacy string override on migration", () => {
    const merged = mergedShortcuts({ "toggle-sidebar": "mod+b" });

    expect(merged["toggle-sidebar"]).toEqual(["Mod+B"]);
  });

  it("should drop invalid entries from an array override", () => {
    const merged = mergedShortcuts({
      "flip-card": ["Enter", "not a hotkey!!"],
    });

    expect(merged["flip-card"]).toEqual(["Enter"]);
  });

  it("should keep the key as an empty list if every array entry is invalid", () => {
    const merged = mergedShortcuts({ "flip-card": ["not a hotkey!!"] });

    expect(merged["flip-card"]).toEqual([]);
  });

  it("should keep an empty-array override as an empty list", () => {
    const merged = mergedShortcuts({ "flip-card": [] });

    expect(merged["flip-card"]).toEqual([]);
  });

  it("should drop a non-string/non-array value and an unknown id but keep a valid sibling", () => {
    const merged = mergedShortcuts({
      "flip-card": 42,
      bogus: ["X"],
      "toggle-sidebar": ["Mod+B"],
    });

    expect(merged).not.toHaveProperty("flip-card");
    expect(merged).not.toHaveProperty("bogus");
    expect(merged["toggle-sidebar"]).toEqual(["Mod+B"]);
  });

  it("should coerce a non-object shortcuts blob to an empty map without throwing", () => {
    const blobs: unknown[] = [null, "nope", 42, []];

    blobs.forEach((blob) => {
      expect(() => mergedShortcuts(blob)).not.toThrow();
      expect(mergedShortcuts(blob)).toEqual({});
    });
  });
});

describe("shortcuts round-trip through the SettingsStore port (AC-002)", () => {
  it("should carry a saved shortcuts override into a freshly loaded Settings", async () => {
    const store = createInMemorySettingsStore();
    const loaded = await store.load();

    await store.save({ ...loaded, shortcuts: { "flip-card": ["Enter"] } });
    const reloaded = await store.load();

    expect(reloaded.shortcuts).toEqual({ "flip-card": ["Enter"] });
    expect(resolveShortcuts(reloaded.shortcuts)["flip-card"]).toEqual([
      "Enter",
    ]);
  });
});
