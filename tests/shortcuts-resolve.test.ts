import { describe, expect, it } from "vitest";
import {
  SHORTCUT_ACTIONS,
  type ShortcutActionId,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";
import { safeNormalize, resolveShortcuts } from "@/lib/shortcuts/resolve";

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

describe("resolveShortcuts (AC-008 / AC-011 / TC-007 / E-7 / E-8 / E-9)", () => {
  it("should map every action to its registry default if no overrides are given", () => {
    const effective = resolveShortcuts({});

    expect(effective).toEqual(EXPECTED);
  });

  it("should let a valid override win over the registry default", () => {
    const effective = resolveShortcuts({ "flip-card": "Enter" });

    expect(effective["flip-card"]).toBe("Enter");
    expect(effective["open-command-palette"]).toBe("Mod+K");
    expect(effective["toggle-sidebar"]).toBe("Mod+B");
  });

  it("should fall back to the default if an override is an empty string", () => {
    const effective = resolveShortcuts({ "toggle-sidebar": "" });

    expect(effective["toggle-sidebar"]).toBe("Mod+B");
  });

  it("should fall back to the default if an override is an invalid hotkey", () => {
    const effective = resolveShortcuts({ "flip-card": "not a hotkey!!" });

    expect(effective["flip-card"]).toBe("Space");
  });

  it("should ignore an override for an unknown action id and keep every default", () => {
    const overrides = {
      "flip-card": "Enter",
      "bogus-id": "X",
    } as unknown as ShortcutOverrides;

    const effective = resolveShortcuts(overrides);

    expect(effective).not.toHaveProperty("bogus-id");
    expect(Object.keys(effective).sort()).toEqual(EXPECTED_IDS);
    expect(effective["flip-card"]).toBe("Enter");
  });

  it("should resolve the mixed spec override set (Enter + bogus + empty) correctly", () => {
    const overrides = {
      "flip-card": "Enter",
      "bogus-id": "X",
      "toggle-sidebar": "",
    } as unknown as ShortcutOverrides;

    const effective = resolveShortcuts(overrides);

    expect(effective["flip-card"]).toBe("Enter");
    expect(effective["toggle-sidebar"]).toBe("Mod+B");
    expect(effective["open-command-palette"]).toBe("Mod+K");
    expect(effective).not.toHaveProperty("bogus-id");
  });

  it("should not throw on a corrupt overrides value", () => {
    const overrides = null as unknown as ShortcutOverrides;

    expect(() => resolveShortcuts(overrides)).not.toThrow();
    expect(resolveShortcuts(overrides)).toEqual(EXPECTED);
  });
});
