import { normalizeHotkey, validateHotkey } from "@tanstack/hotkeys";
import {
  SHORTCUT_ACTIONS,
  type ShortcutActionId,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";

export function safeNormalize(hotkey: string): string | null {
  if (typeof hotkey !== "string" || hotkey.length === 0) {
    return null;
  }
  const result = validateHotkey(hotkey);
  const hasUnknownKey = result.warnings.some((warning) =>
    warning.includes("Unknown key"),
  );
  if (!result.valid || hasUnknownKey) {
    return null;
  }
  return normalizeHotkey(hotkey);
}

export function resolveShortcuts(
  overrides: ShortcutOverrides,
): Record<ShortcutActionId, string> {
  const overlay =
    typeof overrides === "object" && overrides !== null ? overrides : {};
  return SHORTCUT_ACTIONS.reduce(
    (acc, action) => {
      const candidate = overlay[action.id];
      const normalized =
        typeof candidate === "string" ? safeNormalize(candidate) : null;
      acc[action.id] = normalized ?? action.defaultHotkey;
      return acc;
    },
    {} as Record<ShortcutActionId, string>,
  );
}
