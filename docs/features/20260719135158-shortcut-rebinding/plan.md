# F4 - Plan (how) - Shortcut rebinding UI

Spec: [spec.md](spec.md) | Task file: [.pzielinski/F4-shortcut-rebinding/F4.md](../../../.pzielinski/F4-shortcut-rebinding/F4.md)
Reference: port from `purerequest` (near-verbatim; same subsystem lineage, same tanstack 0.10).

## Approach

purerequest already solved this exact problem on the same code lineage. Port its pieces with
minimal puredeck-specific change:

- **Widen the override model** from `string` to `string[]` in the registry type, resolver, and
  load-time merge. This is the only non-additive change; its blast radius is exactly
  `use-action-hotkeys.ts` and `settings-view.tsx` (the two `resolveShortcuts`/`effective[]`
  consumers).
- **Add a recorder seam** (`record-hotkey.ts`): a `useRecordHotkey` hook + pure `eventToHotkey`
  helper, ported verbatim from purerequest (the `event.code`-aware capture that fixes the
  macOS Option-glyph bug). Deep, testable interface over the raw keydown.
- **Add context mutators** (`addShortcut`/`removeShortcut`/`replaceShortcut`/`resetShortcut`)
  built on the existing `update()` helper.
- **Add `findConflict`** to `resolve.ts`.
- **Replace the read-only panel** with `ShortcutsSection` + `ShortcutRow` ported from
  purerequest, adapted to puredeck's `settings-view.tsx` (which currently inlines its own
  ShortcutsSection and wraps sections in `p-6`).

## File Structure

| File | C/M/D | Responsibility |
| ---- | ----- | -------------- |
| `src/lib/shortcuts/registry.ts` | Modify | `ShortcutOverrides` -> `Partial<Record<id, string[]>>` |
| `src/lib/shortcuts/resolve.ts` | Modify | `resolveShortcuts` -> `Record<id, string[]>` (array-aware); add `findConflict` |
| `src/lib/shortcuts/record-hotkey.ts` | Create | `useRecordHotkey` hook + pure `eventToHotkey`/`physicalKey` (port) |
| `src/lib/settings/settings.ts` | Modify | `mergeShortcutValue` (legacy string->list + array sanitize); `mergeShortcuts` uses it |
| `src/lib/settings/settings-context.tsx` | Modify | add `addShortcut`/`removeShortcut`/`replaceShortcut`/`resetShortcut` to context value |
| `src/lib/shortcuts/use-action-hotkeys.ts` | Modify | one definition per binding (`flatMap` over `effective[id]`) |
| `src/components/settings/shortcut-row.tsx` | Create | per-action row: chips + Edit/Remove/Add/Reset + conflict alert (port) |
| `src/components/settings/shortcuts-section.tsx` | Create | maps `SHORTCUT_ACTIONS` -> `ShortcutRow` (port) |
| `src/components/workspace/settings-view.tsx` | Modify | drop inline read-only ShortcutsSection; render new `<ShortcutsSection/>` in `p-6` wrapper |
| `tests/shortcuts-resolve.test.ts` | Modify | array-model `resolveShortcuts` + new `findConflict` cases |
| `tests/settings-keymap.test.ts` | Modify | `mergeShortcutValue` migration + array sanitize |
| `tests/record-hotkey.test.ts` | Create | `eventToHotkey`/`physicalKey` capture logic |
| `tests/shortcut-rebinding.test.tsx` | Create | panel: add/remove/disable/reset/conflict/replace |
| `tests/shortcut-mutators.test.tsx` | Create | context add/remove/replace/reset + dedupe/no-op |
| `tests/use-action-hotkeys.test.tsx` | Modify | multi-binding fires on either hotkey |

## Task Breakdown

### Task 1: Widen override model to `string[]`

**Files:** Modify `registry.ts`, `resolve.ts` (resolveShortcuts only), `use-action-hotkeys.ts`, `settings-view.tsx` (fix `formatForDisplay(effective[id])` -> map over array); Test `tests/shortcuts-resolve.test.ts`, `tests/use-action-hotkeys.test.tsx`.

**Interfaces:**
- Produces: `type ShortcutOverrides = Partial<Record<ShortcutActionId, string[]>>`; `resolveShortcuts(overrides): Record<ShortcutActionId, string[]>`.
- Consumes: existing `safeNormalize`, `SHORTCUT_ACTIONS`.

- [ ] Write failing tests (TC-001..003, TC-017): resolve defaults/override/invalid/empty; action fires on either of two bindings.
- [ ] Confirm RED (type + assertion failures).
- [ ] Widen types + array-aware resolve + `flatMap` in `useActionHotkeys`; keep `settings-view.tsx` compiling (temporary: `effective[id].map(formatForDisplay).join(", ")` until Task 5 replaces it).
- [ ] Confirm GREEN.
- [ ] Commit (`feat(F4): AC-001 AC-007 widen shortcut overrides to lists`).

### Task 2: Load-time migration + sanitize

**Files:** Modify `settings.ts` (`mergeShortcutValue` + `mergeShortcuts`); Test `tests/settings-keymap.test.ts`.

**Interfaces:**
- Consumes: `safeNormalize`, `ACTION_IDS`, widened `ShortcutOverrides` (Task 1).
- Produces: `mergeShortcuts(persisted): ShortcutOverrides` returning lists.

- [ ] Write failing tests (TC-004..005): legacy string->`[normalized]`; array sanitized; `[]` preserved; garbage dropped; no throw.
- [ ] Confirm RED.
- [ ] Add `mergeShortcutValue`, route `mergeShortcuts` through it.
- [ ] Confirm GREEN.
- [ ] Commit (`feat(F4): AC-002 migrate legacy single-string keymap to lists`).

### Task 3: Recorder seam

**Files:** Create `src/lib/shortcuts/record-hotkey.ts`; Test `tests/record-hotkey.test.ts`.

**Interfaces:**
- Produces: `eventToHotkey(event, platform?): string | null`; `useRecordHotkey({ onRecord, onCancel }): { isRecording, startRecording, cancelRecording }`.
- Consumes: `@tanstack/hotkeys` (`PUNCTUATION_CODE_MAP`, `detectPlatform`, `isModifierKey`, `normalizeHotkeyFromParsed`, `normalizeKeyName`, `rawHotkeyToParsedHotkey`).

- [ ] Write failing tests (TC-006..008): meta+alt+P->code-based hotkey; modifier-only->null; ascii-letter path; digit/punctuation code path.
- [ ] Confirm RED.
- [ ] Port `record-hotkey.ts` verbatim.
- [ ] Confirm GREEN.
- [ ] Commit (`feat(F4): AC-003 add event.code-aware hotkey recorder`).

### Task 4: Context mutators + findConflict

**Files:** Modify `settings-context.tsx` (add 4 mutators to `SettingsContextValue` + provider + memo deps), `resolve.ts` (add `findConflict`); Test `tests/shortcut-mutators.test.tsx`, `tests/shortcuts-resolve.test.ts` (conflict cases).

**Interfaces:**
- Consumes: existing `update()`, `resolveShortcuts` (Task 1), `safeNormalize`.
- Produces: `addShortcut(id, hotkey)`, `removeShortcut(id, hotkey)`, `replaceShortcut(id, oldHotkey, newHotkey)`, `resetShortcut(id)`; `findConflict(hotkey, forAction, effective): ShortcutActionId | null`.

- [ ] Write failing tests (TC-014 conflict, TC-016 dedupe, add/remove/replace/reset/disable-on-last).
- [ ] Confirm RED.
- [ ] Add mutators (port purerequest impls) + `findConflict`.
- [ ] Confirm GREEN.
- [ ] Commit (`feat(F4): AC-005 AC-006 add shortcut mutators and conflict detection`).

### Task 5: Interactive panel UI

**Files:** Create `src/components/settings/shortcut-row.tsx`, `src/components/settings/shortcuts-section.tsx`; Modify `settings-view.tsx` (drop inline read-only section, render new one); Test `tests/shortcut-rebinding.test.tsx`.

**Interfaces:**
- Consumes: `useRecordHotkey` (Task 3), context mutators + `findConflict` (Task 4), `resolveShortcuts` (Task 1), `SHORTCUT_ACTIONS`, `Button`, `formatForDisplay`.
- Produces: `<ShortcutsSection/>` rendered by `SettingsView`.

- [ ] Write failing tests (TC-009..013, TC-015): render rows; add persists; remove; last-remove->disabled; reset restores + hidden w/o override; conflict alert + no persist; edit replaces in place.
- [ ] Confirm RED.
- [ ] Port `shortcut-row.tsx` + `shortcuts-section.tsx`; wire into `settings-view.tsx` (wrap in the existing `p-6` section styling; remove the temporary Task-1 join).
- [ ] Confirm GREEN.
- [ ] Commit (`feat(F4): AC-004 interactive shortcut rebinding panel`).

## Cross-cutting notes

- **Approach/patterns:** deep-module seam for the recorder (raw keydown hidden behind
  `useRecordHotkey`); functional-updater mutators (no mutation); declarative array methods
  throughout (`map`/`filter`/`flatMap`/`reduce`, no raw loops). No comments per repo rule.
- **Edge cases** (from spec): legacy string migration, empty-list-as-disabled, modifier-only /
  dead / Escape ignored, Option-glyph via code, duplicate no-op, cross-action conflict.
- **Tests:** one+ per AC (mapping in F4.md); jsdom-non-mac convention (`Mod` records as
  `Control`) mirrored from purerequest.
- **Mobile:** rebinding needs a physical keyboard; the panel still renders and the chips are
  readable at a phone width, but capture is a desktop affordance. No mobile regression - the
  read-only info remains visible; Add/Edit simply aren't reachable without a keyboard.

## Acceptance Verification

Phase 4 fresh verifier runs: `npm test` (full suite), `npm run typecheck` / `tsc`, lint,
and adversarially checks each AC against a real test body + drives the panel (add/remove/
reset/conflict) in the running app via the `run` skill for AC-004/005 screenshots.
