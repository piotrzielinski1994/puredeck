# F4 - Shortcut rebinding UI

Backlog: [.pzielinski/todos.md](../../../.pzielinski/todos.md) F4
Task file: [.pzielinski/F4-shortcut-rebinding/F4.md](../../../.pzielinski/F4-shortcut-rebinding/F4.md)
Reference: mirrors the `purerequest` repo (shared shortcut-subsystem lineage).

## Overview

The Settings > Shortcuts panel currently only *displays* bindings read-only
([settings-view.tsx:74-97](../../../src/components/workspace/settings-view.tsx#L74-L97)) even
though the keymap-override backend is already shipped (separate `keymap.json` store,
`resolveShortcuts`, `safeNormalize`, `useActionHotkeys`). This feature makes the panel
interactive: record a keystroke to bind an action, keep several bindings per action, remove a
binding, reset to the registry default, and block a hotkey already owned by another action.

The design mirrors purerequest, the more-evolved sibling with the same subsystem. The one
model change: puredeck's `ShortcutOverrides` widens from one binding per action
(`Record<id, string>`) to a list (`Record<id, string[]>`), which is what enables multiple
bindings and the Add/chip UI. Persisted legacy single-string overrides migrate on load.

Out of scope: rebinding UI on mobile touch (no physical keyboard to capture - the read-only
display remains the mobile story); a searchable/filterable shortcut list; import/export of
keymaps; the `ALLOWED_UNKNOWN_KEYS` escape hatch (puredeck binds no ContextMenu-type keys).

## Acceptance Criteria

- AC-001: The override model is a list per action - `ShortcutOverrides = Partial<Record<ShortcutActionId, string[]>>` - and `resolveShortcuts` returns `Record<ShortcutActionId, string[]>`: an absent override resolves to `[defaultHotkey]`, an override array is normalized entry-by-entry (invalid entries dropped), an empty array is preserved (the action is deliberately disabled).
- AC-002: Persisted overrides migrate/sanitize on load: a legacy single string migrates to a one-element list, a list keeps only entries `safeNormalize` accepts, an empty list is preserved, a value neither string nor array is dropped (action falls back to default). Corrupt/partial data never throws.
- AC-003: A key-capture recorder (`useRecordHotkey`) records a keystroke via a capture-phase `keydown` listener and builds the canonical hotkey string from `event.code` (not the composed `event.key`), so macOS Option combos record the physical key the matcher fires on. Modifier-only / dead-key presses are ignored (keep listening); `Escape` cancels and can never be bound.
- AC-004: The panel renders one row per registry action. Each bound hotkey is a chip (platform-formatted) with an Edit affordance (re-record in place) and a `×` Remove affordance; a per-action Add button arms the recorder to append a binding; a Reset button (only when the action has an override) restores the default. Zero bindings shows `(disabled)`.
- AC-005: Recording a hotkey already bound to another action is blocked - no persist, and an inline `role="alert"` names the conflicting action (`"<name> already uses that shortcut"`). `findConflict(hotkey, forAction, effective)` returns the owning id or null, normalization-insensitively.
- AC-006: The settings context exposes `addShortcut(id, hotkey)`, `removeShortcut(id, hotkey)`, `replaceShortcut(id, oldHotkey, newHotkey)`, `resetShortcut(id)`. Add appends normalized + de-duplicated (invalid/duplicate = no-op); remove drops one binding (last removal leaves `[]` = disabled); replace swaps in place preserving slot (no-op if new invalid or old not bound); reset deletes the override key. All persist through the existing store.
- AC-007: An action bound to multiple hotkeys fires on any of them - `useActionHotkeys` registers one hotkey definition per binding; an empty (disabled) list registers none.

## User Test Cases

- TC-001..TC-017: see [F4.md](../../../.pzielinski/F4-shortcut-rebinding/F4.md#test-cases). Summary:
  - Resolve: `{}`->all defaults; override list respected; invalid entries dropped; `[]` disabled.
  - Migrate: legacy string->one-element list; garbage dropped; no throw.
  - Recorder: meta+alt+P records via code; modifier-only ignored; Escape cancels.
  - Panel: row per action; Add records+persists; `×` removes; last remove->`(disabled)`; Reset restores default and is hidden without override; conflict alerts + no persist; edit replaces in place; duplicate add no-op.
  - Runtime: an action with two bindings fires on either.

## UI States

| State    | Behavior                                                               |
| -------- | ---------------------------------------------------------------------- |
| Default  | Each action shows its default binding chip(s) + Add button, no Reset.  |
| Override | Action shows its custom chips + Add + Reset button.                    |
| Recording| Armed slot shows `Press keys…`; Add button becomes Cancel.             |
| Conflict | Inline `role="alert"`: `"<name> already uses that shortcut"`; no save. |
| Disabled | Action with an empty binding list shows `(disabled)`.                  |

## Data Model

- `ShortcutOverrides = Partial<Record<ShortcutActionId, string[]>>` (was `string`).
- `Settings.shortcuts: ShortcutOverrides` (shape of the value changes; the key and the
  `keymap.json` persistence location are unchanged - the store treats the value as opaque).
- No new persisted files. `keymap.json` continues to hold the `shortcuts` object.

## Edge Cases

- Legacy on-disk single-string override -> migrated to a one-element list on load.
- Empty list `[]` is meaningful (disabled), distinct from an absent override (default).
- Modifier-only keydown, dead keys, and `Escape` never produce a binding.
- macOS Option-composed glyphs (`⌥P`->`π`) - recorder reads `event.code`.
- Duplicate binding on Add / re-adding an existing hotkey -> no-op.
- Conflict with another action -> blocked with a named alert, no persist.
- Recording started on one row while another is mid-record - each row owns its own recorder
  state; only the actively-armed row captures (capture listener bound only while recording).

## Dependencies

- No new npm dependencies. Reuses `@tanstack/hotkeys` (recorder helpers already exported by
  the installed 0.10) and `@tanstack/react-hotkeys` (already present).
- Depends on the shipped keymap store, `resolveShortcuts`, `safeNormalize`, `useActionHotkeys`.
