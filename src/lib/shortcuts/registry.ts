export type ShortcutActionId =
  | "open-command-palette"
  | "flip-card"
  | "toggle-sidebar"
  | "panel-expand"
  | "panel-shrink"
  | "save-active-deck";

export type ShortcutAction = {
  id: ShortcutActionId;
  name: string;
  description: string;
  defaultHotkey: string;
};

export type ShortcutOverrides = Partial<Record<ShortcutActionId, string[]>>;

export const SHORTCUT_ACTIONS: readonly ShortcutAction[] = [
  {
    id: "open-command-palette",
    name: "Open command palette",
    description: "Search and run any action from a command list.",
    defaultHotkey: "Mod+K",
  },
  {
    id: "flip-card",
    name: "Flip card",
    description: "Reveal the back of the current study card.",
    defaultHotkey: "Space",
  },
  {
    id: "toggle-sidebar",
    name: "Toggle sidebar",
    description: "Show or hide the deck sidebar.",
    defaultHotkey: "Mod+B",
  },
  {
    id: "panel-expand",
    name: "Expand sidebar",
    description: "Widen the deck sidebar.",
    defaultHotkey: "Mod+Alt+=",
  },
  {
    id: "panel-shrink",
    name: "Shrink sidebar",
    description: "Narrow the deck sidebar.",
    defaultHotkey: "Mod+Alt+-",
  },
  {
    id: "save-active-deck",
    name: "Save",
    description: "Save the active deck.",
    defaultHotkey: "Mod+S",
  },
];
