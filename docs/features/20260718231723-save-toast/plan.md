# Save toast + Cmd+S - Plan

Coverage threshold: none. React 19. Mirrors `~/projects/private/purerequest`.

## Decision Log

| Date       | Decision | Rationale |
| ---------- | -------- | --------- |
| 2026-07-18 | Design gate: pz-ddd / pz-archetypes / pz-codebase-design. Invoked pz-codebase-design (mentally). | pz-codebase-design: ToastProvider is a thin deep-ish module (compound context, no-op fallback) mirrored from purerequest; toast wired at the single `saveDeck` chokepoint. pz-ddd/archetypes: none - UI feedback, no domain model. |
| 2026-07-18 | Mirror purerequest hand-rolled `toast.tsx` (no `sonner` dep). | CLAUDE.local: base on purerequest. Matches puredeck's lean stack; `--popover` token already exists; jsdom-testable. |
| 2026-07-18 | Toast fires inside `saveDeck` (workspace-context), not at each call site. | `saveDeck` is F1's single deck-save chokepoint -> AC-002 covers edit/add/delete in one place. Settings autosave uses a different path (settings-context) so it stays silent -> E-4 free. |
| 2026-07-18 | `useToast()` returns a NOOP outside a provider (mirror purerequest). | Existing workspace tests that don't wrap ToastProvider keep passing; `saveDeck`'s `show` is a no-op there. |
| 2026-07-18 | Cmd+S handler: if a card `<input>` is focused -> `blur()` (commits pending edit via the F1 save-on-blur path, which saves+toasts); else -> `saveDeck(activeDeck)` directly. Only when active tab kind==="deck". | Exactly one save path runs -> no stale-deck clobber, no double toast. Honors E-1 (blur commits pending edit). Off-deck = no-op (AC-005). `useActionHotkeys` already calls `event.preventDefault()` -> blocks browser save (AC-004). |
| 2026-07-18 | `save-active-deck` default hotkey `Mod+S` (purerequest uses `Mod+S` for `save-active-editor`). | Direct mirror. Registry auto-lists it in Settings > Shortcuts and `resolveShortcuts`. |

## File Structure

- `src/components/ui/toast.tsx` (**new**) - `ToastProvider` + `useToast` (mirror purerequest 1:1).
- `src/routes/__root.tsx` (**modify**) - wrap `WorkspaceProvider` subtree in `ToastProvider`.
- `src/lib/shortcuts/registry.ts` (**modify**) - add `save-active-deck` action + union member.
- `src/components/workspace/workspace-context.tsx` (**modify**) - `useToast()`; `saveDeck` calls `show("Saved")`.
- `src/components/workspace/main.tsx` (**modify**) - `useWorkspace()`; register `save-active-deck` hotkey.

Tests:
- `tests/toast.test.tsx` (**new**) - TC-001.
- `tests/shortcuts-registry-save.test.ts` (**new**) or append to `shortcuts-resolve.test.ts` - TC-003.
- `tests/save-toast.test.tsx` (**new**) - TC-002, TC-004, TC-005 (workspace + injected store + ToastProvider).

## Tasks

### Task 1: ToastProvider (mirror purerequest)

**Files:** Create `src/components/ui/toast.tsx`; Test `tests/toast.test.tsx`; Modify `src/routes/__root.tsx`.

**Interfaces:**
- Produces: `ToastProvider({children})`, `useToast(): { show(message: string): void }`. Outside a provider `useToast()` returns a NOOP. `aria-live="polite"` region, auto-dismiss ~2500ms, bottom-right.

- [ ] Failing test (TC-001): show("X") -> "X" visible; useToast with no provider -> click no throw.
- [ ] Confirm FAIL.
- [ ] Copy purerequest `toast.tsx` verbatim (paths/tokens already match); mount `<ToastProvider>` wrapping the `WorkspaceProvider` subtree in `__root.tsx`.
- [ ] Confirm PASS.
- [ ] Commit (`feat(save-toast): AC-001 ToastProvider + useToast`).

### Task 2: save-active-deck shortcut action

**Files:** Modify `src/lib/shortcuts/registry.ts`; Test `tests/shortcuts-resolve.test.ts` (append) or new file.

**Interfaces:**
- Produces: `ShortcutActionId` gains `"save-active-deck"`; `SHORTCUT_ACTIONS` gains `{ id, name: "Save", description, defaultHotkey: "Mod+S" }`.

- [ ] Failing test (TC-003): registry contains the action; `resolveShortcuts({})["save-active-deck"] === "Mod+S"`.
- [ ] Confirm FAIL.
- [ ] Add the union member + action entry.
- [ ] Confirm PASS (settings-view test also still green - it iterates SHORTCUT_ACTIONS, no exact-count assert).
- [ ] Commit (`feat(save-toast): AC-003 save-active-deck shortcut`).

### Task 3: Toast on deck save

**Files:** Modify `src/components/workspace/workspace-context.tsx`; Test `tests/save-toast.test.tsx`.

**Interfaces:**
- Consumes: `useToast`.
- Produces: `saveDeck` unchanged signature; now also `show("Saved")` after updating state + `store.save`.

- [ ] Failing test (TC-002): render workspace+DeckView in ToastProvider with injected store; edit a card front + blur -> "Saved" toast.
- [ ] Confirm FAIL.
- [ ] `const { show } = useToast()` in provider; call `show("Saved")` in `saveDeck`.
- [ ] Confirm PASS.
- [ ] Commit (`feat(save-toast): AC-002 toast on deck save`).

### Task 4: Cmd+S saves active deck

**Files:** Modify `src/components/workspace/main.tsx`; Test `tests/save-toast.test.tsx`.

**Interfaces:**
- Consumes: `useWorkspace()` (`tabs`, `activeTabId`, `deckById`, `saveDeck`), `useActionHotkeys`.
- Produces: `save-active-deck` handler - guard `activeTab?.kind === "deck"` (else no-op); if `document.activeElement instanceof HTMLInputElement` -> `.blur()`; else `saveDeck(activeDeck)`.

- [ ] Failing tests: TC-004 (deck active -> fire Mod+S -> store.save called + "Saved" toast), TC-005 (settings active -> Mod+S -> save NOT called, no toast).
- [ ] Confirm FAIL.
- [ ] Add `useWorkspace()` in Main; register the hotkey alongside `toggle-sidebar`.
- [ ] Confirm PASS.
- [ ] Commit (`feat(save-toast): AC-004/005 Cmd+S saves active deck`).

## Edge cases

E-1 blur commits pending edit (Cmd+S input-focused branch). E-2 stacking toasts (purerequest
setTimeout-per-toast). E-3 no-provider no-op (Task 1 test). E-4 settings autosave silent
(toast only in `saveDeck`, not settings-context - no code needed, assert by absence).

## Risks

- Double toast if both blur-save and explicit save ran: avoided - Cmd+S runs exactly one
  branch (blur XOR saveDeck).
- Stale-deck clobber on Cmd+S: avoided - never call `saveDeck(stale)` after a blur in the
  same tick (branches are mutually exclusive).
- Adding a shortcut action could break count-based tests: checked - settings-view/command-palette
  tests iterate `SHORTCUT_ACTIONS`, no `toHaveLength` on it.

## AC traceability (verified)

| AC | Behavior | Proving tests |
| -- | -------- | ------------- |
| AC-001 | ToastProvider + useToast (no-op outside) | toast "should display the message if show is called inside a provider" + "should not throw if useToast is used without a provider" |
| AC-002 | deck save -> toast | save-toast "should show a Saved toast if a card is edited and blurred (TC-002)" |
| AC-003 | save-active-deck / Mod+S in registry | shortcuts-save-action (both tests) + shortcuts-resolve EXPECTED map |
| AC-004 | Cmd+S saves active deck + toast + preventDefault | save-toast "should save the active deck and show a Saved toast if Mod+S is pressed on a deck tab (TC-004)" |
| AC-005 | Cmd+S off-deck = no-op | save-toast "should not save or toast if Mod+S is pressed while the settings tab is active (TC-005)" |
| E-1 | Cmd+S with focused input commits pending edit via blur | save-toast "should commit a focused pending edit if Mod+S is pressed with a card input focused (E-1)" |

## Status: DONE (branch, not merged)

- All 5 ACs + E-1 PASS (verifier + fresh re-run). Gates: 131/131 tests, tsc 0 errors, eslint 0 errors (7 pre-existing warnings, +1 for toast.tsx context export).
- Live-verified in webview (Playwright): edit+blur -> "Saved" toast (stacks on repeat = E-2); Cmd+S (Meta in real webview) -> defaultPrevented:true + "Saved" toast. Screenshot `.pzielinski/card-editing/verify-toast.png`.
- Note: jsdom resolves `Mod` to Control (tests fire ctrlKey); real macOS webview resolves `Mod` to Meta - both handled by @tanstack/hotkeys, verified live with metaKey.

## Plan self-review

- Coverage: AC-001->TC-001, AC-002->TC-002, AC-003->TC-003, AC-004->TC-004, AC-005->TC-005. All covered.
- Interface consistency: `useToast().show`, `saveDeck`, `save-active-deck` used identically across tasks.
- Scope: toast + one shortcut. Single-ticket-sized. No deck-CRUD creep.
