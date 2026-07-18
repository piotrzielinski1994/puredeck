import { describe, expect, it } from "vitest";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/registry";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";

describe("save-active-deck shortcut action (AC-003 / TC-003)", () => {
  it("should register a save-active-deck action with a name and Mod+S default", () => {
    const action = SHORTCUT_ACTIONS.find((a) => a.id === "save-active-deck");

    expect(action).toBeDefined();
    expect(action?.name.length).toBeGreaterThan(0);
    expect(action?.defaultHotkey).toBe("Mod+S");
  });

  it("should resolve save-active-deck to Mod+S when no override is given", () => {
    const effective = resolveShortcuts({});

    expect(effective["save-active-deck"]).toBe("Mod+S");
  });
});
