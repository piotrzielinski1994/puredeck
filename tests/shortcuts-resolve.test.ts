import { describe, expect, it } from "vitest";
import {
  SHORTCUT_ACTIONS,
  type ShortcutActionId,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";
import {
  safeNormalize,
  resolveShortcuts,
  findConflict,
} from "@/lib/shortcuts/resolve";

const EXPECTED: Record<ShortcutActionId, string> = {
  "open-command-palette": "Mod+K",
  "flip-card": "Space",
  "toggle-sidebar": "Mod+B",
  "save-active-deck": "Mod+S",
};

const EXPECTED_IDS = Object.keys(EXPECTED).sort();

describe("SHORTCUT_ACTIONS registry (AC-007 / TC-006)", () => {
  it("should define exactly the in-scope actions, each id unique", () => {
    const ids = SHORTCUT_ACTIONS.map((action) => action.id);

    expect([...ids].sort()).toEqual(EXPECTED_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should give each action its expected default hotkey", () => {
    SHORTCUT_ACTIONS.forEach((action) => {
      expect(action.defaultHotkey).toBe(EXPECTED[action.id]);
    });
  });

  it("should give every action a non-empty display name and description", () => {
    SHORTCUT_ACTIONS.forEach((action) => {
      expect(action.name.length).toBeGreaterThan(0);
      expect(action.description.length).toBeGreaterThan(0);
    });
  });
});

describe("safeNormalize (AC-008 / E-7)", () => {
  it("should return the normalized form if the hotkey is valid", () => {
    expect(safeNormalize("Mod+K")).toBe("Mod+K");
  });

  it("should canonicalize a lower-case modifier+key into the uppercase form", () => {
    expect(safeNormalize("mod+k")).toBe("Mod+K");
  });

  it("should return null if the hotkey is an empty string", () => {
    expect(safeNormalize("")).toBeNull();
  });

  it("should return null if the hotkey is garbage", () => {
    expect(safeNormalize("not a hotkey!!")).toBeNull();
  });
});

describe("resolveShortcuts array model (AC-001 / TC-001 / TC-002 / TC-003)", () => {
  // AC-001, TC-001 — behavior: an absent override resolves to a one-element
  // list holding the registry default.
  it("should map every action to a single-element list of its default if no overrides are given", () => {
    const effective = resolveShortcuts({});

    SHORTCUT_ACTIONS.forEach((action) => {
      expect(effective[action.id]).toEqual([EXPECTED[action.id]]);
    });
  });

  // AC-001, TC-002 — behavior: a valid override array wins; other actions keep
  // their default lists.
  it("should let a valid override list win over the registry default", () => {
    const effective = resolveShortcuts({ "flip-card": ["Enter"] });

    expect(effective["flip-card"]).toEqual(["Enter"]);
    expect(effective["open-command-palette"]).toEqual(["Mod+K"]);
    expect(effective["toggle-sidebar"]).toEqual(["Mod+B"]);
  });

  // AC-001 — behavior: a multi-binding override resolves every normalized entry.
  it("should resolve a multi-binding override to every normalized hotkey", () => {
    const effective = resolveShortcuts({ "flip-card": ["Enter", "Mod+J"] });

    expect(effective["flip-card"]).toEqual(["Enter", "Mod+J"]);
  });

  // AC-001 — behavior: each entry is canonicalized (casing/aliases).
  it("should normalize each entry in a multi-binding override", () => {
    const effective = resolveShortcuts({ "flip-card": ["mod+j", "MOD+K"] });

    expect(effective["flip-card"]).toEqual(["Mod+J", "Mod+K"]);
  });

  // AC-001, TC-003 — behavior: an invalid entry is dropped, a valid one kept.
  it("should drop only the invalid entry from a mixed override list", () => {
    const effective = resolveShortcuts({
      "flip-card": ["not a hotkey!!", "Enter"],
    });

    expect(effective["flip-card"]).toEqual(["Enter"]);
  });

  // AC-001, TC-003 — behavior: an empty array is preserved (disabled).
  it("should preserve an empty-array override as an empty list", () => {
    const effective = resolveShortcuts({ "toggle-sidebar": [] });

    expect(effective["toggle-sidebar"]).toEqual([]);
  });

  // AC-001 — behavior: an all-invalid list collapses to an empty list.
  it("should resolve to an empty list if every entry in the override is invalid", () => {
    const effective = resolveShortcuts({
      "flip-card": ["not a hotkey!!", "also bad!!"],
    });

    expect(effective["flip-card"]).toEqual([]);
  });

  // AC-001 — behavior: a non-array override value falls back to the default list.
  it("should fall back to the default list if an override value is not an array", () => {
    const overrides = {
      "flip-card": "Enter",
    } as unknown as ShortcutOverrides;

    const effective = resolveShortcuts(overrides);

    expect(effective["flip-card"]).toEqual(["Space"]);
  });

  // AC-001 — behavior: an unknown action id is ignored; every default survives.
  it("should ignore an override for an unknown action id and keep every default", () => {
    const overrides = {
      "flip-card": ["Enter"],
      "bogus-id": ["X"],
    } as unknown as ShortcutOverrides;

    const effective = resolveShortcuts(overrides);

    expect(effective).not.toHaveProperty("bogus-id");
    expect(Object.keys(effective).sort()).toEqual(EXPECTED_IDS);
    expect(effective["flip-card"]).toEqual(["Enter"]);
  });

  // AC-001 — behavior: a corrupt overrides value never throws and yields defaults.
  it("should not throw on a corrupt overrides value", () => {
    const overrides = null as unknown as ShortcutOverrides;

    expect(() => resolveShortcuts(overrides)).not.toThrow();
    const effective = resolveShortcuts(overrides);
    SHORTCUT_ACTIONS.forEach((action) => {
      expect(effective[action.id]).toEqual([EXPECTED[action.id]]);
    });
  });
});

describe("findConflict (AC-005 / TC-014)", () => {
  // AC-005, TC-014 — behavior: another action's default binding is a conflict.
  it("should return the owning action id if another action's default holds the hotkey", () => {
    const effective = resolveShortcuts({});

    const owner = findConflict("Mod+K", "flip-card", effective);

    expect(owner).toBe("open-command-palette");
  });

  // AC-005 — behavior: the match is normalization-insensitive (casing/aliases).
  it("should detect a conflict from a differently-cased hotkey", () => {
    const effective = resolveShortcuts({});

    const owner = findConflict("mod+k", "flip-card", effective);

    expect(owner).toBe("open-command-palette");
  });

  // AC-005 — behavior: a match against a non-first entry proves the whole list
  // is scanned, not just the first binding.
  it("should detect a conflict from any binding in another action's multi-binding list", () => {
    const effective = resolveShortcuts({
      "open-command-palette": ["Mod+K", "Mod+Shift+P"],
    });

    const owner = findConflict("Mod+Shift+P", "flip-card", effective);

    expect(owner).toBe("open-command-palette");
  });

  // AC-005 — behavior: the edited action is excluded even when the hotkey sits
  // in its own list.
  it("should return null if the hotkey is only in the edited action's own list", () => {
    const effective = resolveShortcuts({
      "flip-card": ["Enter", "Mod+Shift+P"],
    });

    expect(effective["flip-card"]).toContain("Mod+Shift+P");
    expect(findConflict("Mod+Shift+P", "flip-card", effective)).toBeNull();
  });

  // AC-005 — behavior: a free hotkey owned by no action has no conflict.
  it("should return null if no action owns the hotkey", () => {
    const effective = resolveShortcuts({});

    expect(findConflict("Mod+Y", "flip-card", effective)).toBeNull();
  });

  // AC-005 — behavior: an invalid hotkey can never conflict.
  it("should return null if the hotkey is invalid", () => {
    const effective = resolveShortcuts({});

    expect(findConflict("not a hotkey!!", "flip-card", effective)).toBeNull();
  });

  // AC-005 — behavior: a disabled action ([]) is never reported as an owner.
  it("should not report a disabled action as a conflict owner", () => {
    const effective = resolveShortcuts({ "open-command-palette": [] });

    expect(findConflict("Mod+K", "flip-card", effective)).toBeNull();
  });
});
