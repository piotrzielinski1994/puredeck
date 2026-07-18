# Save toast + Cmd+S

## Overview

Every deck save (card edit / add / delete) surfaces a transient "Saved" toast, and a
`Mod+S` shortcut explicitly commits the active deck and shows the same toast. Mirrors
purerequest's hand-rolled `ToastProvider` + `useToast().show()` (no `sonner` dep) and its
`save-active-editor` = `Mod+S` shortcut.

Scope: deck/card saves only. Settings autosave (layout, tabs, theme, keymap) stays silent -
it fires on every tab click / panel drag and would spam the toast.

## Acceptance Criteria

- AC-001: A `ToastProvider` renders an `aria-live="polite"` region; `useToast().show(msg)`
  displays `msg`, and it auto-dismisses after a timeout. `useToast()` outside a provider is
  a no-op (does not throw).
- AC-002: Saving a deck via card edit / add / delete shows a "Saved" toast.
- AC-003: A `save-active-deck` shortcut action exists with default hotkey `Mod+S`, listed in
  the Settings > Shortcuts panel like the other actions.
- AC-004: Pressing `Mod+S` while a deck tab is active commits the focused input (blur),
  re-saves that deck, shows the "Saved" toast, and prevents the browser's default save.
- AC-005: Pressing `Mod+S` when no deck tab is active (settings/study/no tab) does nothing
  and does not show the toast.

## Test Cases

- TC-001 (toast render): render `ToastProvider` + a trigger calling `show("X")` -> "X" in the
  document; a second component using `useToast()` with no provider -> click does not throw.
  Maps: AC-001.
- TC-002 (save -> toast): render DeckView-through-workspace with an injected store; edit a
  card front + blur -> "Saved" toast appears. Maps: AC-002.
- TC-003 (registry): `SHORTCUT_ACTIONS` contains `save-active-deck` with `defaultHotkey`
  `Mod+S` and a name; `resolveShortcuts({})` maps it to `Mod+S`. Maps: AC-003.
- TC-004 (Cmd+S saves active deck): active deck tab -> fire `Mod+S` -> store.save called for
  the active deck and "Saved" toast shown. Maps: AC-004.
- TC-005 (Cmd+S no-op off-deck): settings tab active -> fire `Mod+S` -> store.save NOT
  called, no toast. Maps: AC-005.

## UI States

| State   | Behavior                                                             |
| ------- | -------------------------------------------------------------------- |
| Loading | N/A - toast only appears in response to a save.                      |
| Empty   | No deck active: `Mod+S` is a silent no-op (AC-005).                  |
| Error   | Store save failure already logged by `saveDeck`; toast still shown optimistically (save is fire-and-forget). |
| Success | "Saved" toast, bottom-right, auto-dismiss ~2.5s.                     |

## Edge Cases

- E-1: `Mod+S` with unsaved keystroke in a card input -> blur commits it first, then save +
  toast (matches save-on-blur from F1).
- E-2: Rapid repeated saves -> each pushes its own toast; they stack and expire independently
  (purerequest behavior).
- E-3: `useToast()` without a provider (e.g. a unit test rendering DeckView bare) -> no-op,
  never throws (AC-001).
- E-4: Settings autosave (theme/layout/tabs/keymap) must NOT toast - only deck saves do.

## Dependencies

- Builds on F1 (`saveDeck` in workspace-context is the single deck-save chokepoint).
- Mirrors `~/projects/private/purerequest` `src/components/ui/toast.tsx` and its
  `save-active-editor` shortcut (per CLAUDE.local: base on purerequest).
