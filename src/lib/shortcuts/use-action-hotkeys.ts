import type { Hotkey } from "@tanstack/hotkeys";
import { type UseHotkeyDefinition, useHotkeys } from "@tanstack/react-hotkeys";
import { useContext } from "react";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { SettingsContext } from "@/lib/settings/settings-context";
import type { ShortcutActionId } from "@/lib/shortcuts/registry";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";

export function useActionHotkeys(
  handlers: Partial<Record<ShortcutActionId, () => void>>,
): void {
  const context = useContext(SettingsContext);
  const shortcuts = context?.settings.shortcuts ?? DEFAULT_SETTINGS.shortcuts;
  const effective = resolveShortcuts(shortcuts);

  const definitions: UseHotkeyDefinition[] = (
    Object.keys(handlers) as ShortcutActionId[]
  ).flatMap((id) =>
    effective[id].map((hotkey) => ({
      hotkey: hotkey as Hotkey,
      callback: (event) => {
        event.preventDefault();
        handlers[id]?.();
      },
    })),
  );

  useHotkeys(definitions);
}
