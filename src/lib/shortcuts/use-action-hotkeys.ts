import { useContext } from "react";
import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import type { Hotkey } from "@tanstack/hotkeys";
import { SettingsContext } from "@/lib/settings/settings-context";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";
import type { ShortcutActionId } from "@/lib/shortcuts/registry";

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
