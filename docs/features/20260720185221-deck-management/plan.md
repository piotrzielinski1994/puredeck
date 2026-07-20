# F3 - Deck management - Implementation Plan

Spec: [spec.md](./spec.md)
Branch: `20260720185221-deck-management`
Coverage threshold: none (no enforced threshold in `vitest.config.ts` / `package.json`).

## Approach

Reuse the existing writable `CollectionStore` seam. `save(deck)` already handles
**create** (fresh id -> new file) and **rename** (same id -> rewrite same slug
file). The only new store capability is **delete**, so we add
`remove(deckId): Promise<void>` to the seam and implement it in all three stores.

The UI mirrors the sibling `purerequest` repo: a Radix `ContextMenu` per deck
row -> Rename (inline row edit) + Delete (destructive confirm dialog), plus a
header "+" New-deck button, plus palette commands. Deck-mutation logic
(create/rename validation/delete-with-tab-prune) is added to `WorkspaceContext`
as `createDeck` / `renameDeck` / `deleteDeck`, keeping components thin.

Pure helpers (name uniqueness, deck-list edits) go in `deck-ops.ts` next to the
existing `withCard*` functions, so they are unit-testable without React.

## File Structure

| File | Create/Modify | Responsibility |
| ---- | ------------- | -------------- |
| `src/lib/workspace/collection.ts` | Modify | Add `remove` to the `CollectionStore` type. |
| `src/lib/workspace/tauri-collection.ts` | Modify | Implement `remove` (delete slug file via `plugin-fs` `remove`, drop slug map entry). |
| `src/lib/workspace/in-memory-collection.ts` | Modify | Implement `remove` (delete matching map entry by deck id). |
| `src/lib/workspace/deck-ops.ts` | Modify | Add `uniqueDeckName(base, taken)`, `withDeckRemoved(decks, id)`, `withDeckUpserted(decks, deck)`. |
| `src/lib/workspace/slug.ts` | (reuse) | `slugify`/`uniqueSlug` reused as-is by the store. |
| `src/components/ui/context-menu.tsx` | Create | Radix ContextMenu wrapper (mirror purerequest's). |
| `src/components/workspace/workspace-context.tsx` | Modify | Add `createDeck`/`renameDeck`/`deleteDeck`, rename state (`renamingDeckId`, `beginRename`, `cancelRename`), delete state (`pendingDeleteDeckId`, `requestDeleteDeck`, `confirmDeleteDeck`, `cancelDeleteDeck`). |
| `src/components/workspace/sidebar.tsx` | Modify | Deck-list context menu (New deck, purerequest parity); per-row context menu (Rename/Delete); inline rename input. |
| `src/components/workspace/delete-deck-dialog.tsx` | Create | Destructive confirm dialog bound to `pendingDeleteDeckId` (mirror purerequest's `delete-confirm-dialog`). |
| `src/routes/__root.tsx` | Modify | Add `New deck` + `Delete deck: <name>` palette commands; mount `DeleteDeckDialog`. |
| `src-tauri/capabilities/default.json` | Modify | Add `fs:allow-remove`. |
| `package.json` / `package-lock.json` | Modify | Add `@radix-ui/react-context-menu`. |
| `tests/*` | Create | See per-task tests. |

## Tasks

### Task 1: Store `remove` on the seam (create + rename already work)

**Files:** Modify `collection.ts`, `tauri-collection.ts`, `in-memory-collection.ts`; Test `tests/collection-remove.test.ts`.

**Interfaces:**
- Produces: `CollectionStore.remove(deckId: string): Promise<void>`. In-memory: deletes the map key whose parsed deck id === deckId. Tauri: looks up slug via `slugById`, `remove(`${root}/${slug}.json`)`, deletes the map entry; unknown id -> no-op.
- Consumes: existing `slugById` map (tauri), `parseDeck` (in-memory).

- [ ] Failing test: in-memory `remove(idA)` drops deck A; `load()` returns only B; `remove("missing")` no-op, no throw.
- [ ] Run - confirm RED.
- [ ] Add `remove` to type + both stores.
- [ ] Run - GREEN.
- [ ] Commit (`feat: AC-011 CollectionStore.remove`)

### Task 2: Deck-list + name helpers in `deck-ops.ts`

**Files:** Modify `deck-ops.ts`; Test `tests/deck-ops.test.ts`.

**Interfaces:**
- Produces:
  - `uniqueDeckName(base: string, taken: Set<string>): string` - "New Deck", "New Deck 2", ... skipping names already in `taken`.
  - `withDeckUpserted(decks: Deck[], deck: Deck): Deck[]` - replace by id if present, else append.
  - `withDeckRemoved(decks: Deck[], id: string): Deck[]` - filter out id.
  - `newDeck(name: string): Deck` - `{ id: crypto.randomUUID(), name, cards: [] }`.

- [ ] Failing tests: uniqueDeckName collision suffixing; upsert replace vs append; remove filter; newDeck shape.
- [ ] Run - RED.
- [ ] Implement helpers (declarative, no loops).
- [ ] Run - GREEN.
- [ ] Commit (`feat: AC-002 deck-ops helpers`)

### Task 3: Workspace context deck mutations

**Files:** Modify `workspace-context.tsx`; Test `tests/workspace-deck-crud.test.tsx`.

**Interfaces:**
- Consumes: `collectionStore.save/remove`, `deck-ops` helpers, `pruneTabsToDecks`, `neighbourAfterClose`, `useToast`.
- Produces on the context value:
  - `createDeck(): string` - build `newDeck(uniqueDeckName("New Deck", takenNames))`, `save`, add to `loadedDecks`, open its tab, set `renamingDeckId`; returns the new deck id.
  - `renameDeck(id, name): void` - trim; if empty, cancel (keep old); else `save` renamed deck, update `loadedDecks`, clear `renamingDeckId`.
  - `deleteDeck(id): void` - `remove`, drop from `loadedDecks`, prune open tabs for that deck (deck + study tab ids), fix active tab.
  - rename UI state: `renamingDeckId: string | null`, `beginRename(id)`, `cancelRename()`.
  - delete UI state: `pendingDeleteDeckId: string | null`, `requestDeleteDeck(id)`, `confirmDeleteDeck()`, `cancelDeleteDeck()`.

- [ ] Failing tests: createDeck adds+opens+flags rename; renameDeck persists new name & keeps cards; blank rename keeps old; deleteDeck removes + prunes open deck/study tabs + active fallback.
- [ ] Run - RED.
- [ ] Implement in context.
- [ ] Run - GREEN.
- [ ] Commit (`feat: AC-001/005/006/009 workspace deck CRUD`)

### Task 4: Radix ContextMenu UI primitive

**Files:** Create `src/components/ui/context-menu.tsx`; Modify `package.json`. (No standalone test - exercised via Task 5.)

**Interfaces:**
- Produces: `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem` (variant default|destructive), `ContextMenuSeparator` - same API as purerequest's wrapper.

- [ ] `npm install @radix-ui/react-context-menu`.
- [ ] Add wrapper mirroring purerequest (import from `@radix-ui/react-context-menu`).
- [ ] `npm run typecheck` - GREEN.
- [ ] Commit (`feat: add context-menu ui primitive`)

### Task 5: Sidebar - deck-list context menu, per-row context menu, inline rename

**Files:** Modify `sidebar.tsx`; Test `tests/sidebar-deck-crud.test.tsx`.

**Interfaces:**
- Consumes: `createDeck`, `renamingDeckId`, `beginRename`, `renameDeck`, `cancelRename`, `requestDeleteDeck`, `decks`, `selectedDeckId`, `openDeck`.
- Produces: the deck-list `<nav>` wrapped in a `ContextMenu` whose menu has **New deck** (purerequest-style create-from-empty-area); each row wrapped in a nested `ContextMenu` with Rename/Delete items; row renders a rename `<input>` when `renamingDeckId === deck.id` (Enter/blur commit, Escape cancel, pre-selected). Nested row menu stops propagation so a row right-click shows only Rename/Delete, not New deck.

- [ ] Failing tests: right-click deck list -> New deck calls createDeck; context menu Rename -> input appears; Enter commits via renameDeck; Escape cancels; Delete -> requestDeleteDeck. (RTL, dispatch `contextmenu`.)
- [ ] Run - RED.
- [ ] Implement.
- [ ] Run - GREEN.
- [ ] Commit (`feat: AC-001/003/004 sidebar deck affordances`)

### Task 6: Delete confirm dialog + palette + capability

**Files:** Create `delete-deck-dialog.tsx`; Modify `__root.tsx`, `src-tauri/capabilities/default.json`; Test `tests/delete-deck-dialog.test.tsx`, `tests/palette-deck-crud.test.tsx`.

**Interfaces:**
- Consumes: `pendingDeleteDeckId`, `deckById`, `confirmDeleteDeck`, `cancelDeleteDeck`, `createDeck`, `requestDeleteDeck`, `decks`.
- Produces: `<DeleteDeckDialog />` (title `Delete "<name>"?`, Cancel/Delete); palette commands `New deck` and `Delete deck: <name>`; `fs:allow-remove` granted.

- [ ] Failing tests: dialog open when pendingDeleteDeckId set, Delete -> confirmDeleteDeck, Cancel -> cancelDeleteDeck; palette "New deck" -> createDeck, "Delete deck: X" -> requestDeleteDeck.
- [ ] Run - RED.
- [ ] Implement + add `fs:allow-remove`.
- [ ] Run - GREEN.
- [ ] Commit (`feat: AC-007/008/010 delete dialog + palette + fs remove`)

## Edge cases handled

- Blank rename -> keep old name (Task 3, AC-006).
- Unique default names via `uniqueDeckName` (Task 2, AC-002).
- Delete active-tab deck -> `pruneTabsToDecks` + active fallback (Task 3, AC-009).
- Unknown-id remove -> no-op (Task 1, AC-011).
- Rename does not re-slug (keeps file + review state stable) - existing `save`
  behavior, asserted in Task 3.

## Tests to write (min one per AC)

- AC-001 sidebar "+" (Task 5), AC-002 uniqueDeckName (Task 2), AC-003/004
  context menu + inline rename (Task 5), AC-005/006 rename persist/blank (Task
  3), AC-007/008 delete dialog (Task 6), AC-009 tab prune (Task 3), AC-010
  palette (Task 6), AC-011 store remove (Task 1), AC-012 verified live at 375px
  in Phase 4.

## Risks

- Long-press context menu flaky in Android webview: mitigated by palette
  New/Delete commands (pointer-free) and header "+" (AC-012, E-8).
- Radix ContextMenu focus teardown vs inline-rename blur (purerequest hit this):
  mirror its `readyRef` settle guard in the rename input.
