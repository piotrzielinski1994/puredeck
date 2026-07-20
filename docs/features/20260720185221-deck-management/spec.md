# F3 - Deck management (create / rename / delete decks in-app)

Feature folder: `docs/features/20260720185221-deck-management/`
Branch: `20260720185221-deck-management`

## Overview

Let the user **create, rename, and delete whole decks** from the UI. Today decks
only appear by hand-dropping a JSON file into the collection folder; the sidebar
lists decks but offers no add/remove/rename affordance. On mobile (a first-class
target) there is no filesystem to hand-edit, so this is the only viable way to
manage decks on a phone.

The interaction mirrors the sibling `purerequest` repo: a per-row **context
menu** (right-click / long-press / Shift+F10) exposing **Rename** and **Delete**,
inline rename in the sidebar row, and a **destructive confirm dialog** for
delete. Creating a deck also comes from a **context menu on the deck-list area**
(right-click empty space -> **New deck**, matching how purerequest creates
requests/folders), which makes an empty deck and drops straight into inline
rename. The command palette also gets **New deck** and **Delete deck: <name>**
entries so every action is reachable without a pointer.

### Why

- No UI path to create/rename/delete a deck exists ([tauri-collection.ts](../../../src/lib/workspace/tauri-collection.ts), [sidebar.tsx](../../../src/components/workspace/sidebar.tsx)).
- The writable `CollectionStore` seam (`load` + `save`) already exists (shipped
  with F1). `save(deck)` **already** creates a new file for a new deck id and
  rewrites the same file for an existing id - so create and rename need no new
  store method. Only **delete** requires a new `remove(deckId)` method.
- Mobile has no file access, so in-app deck management is the only path there.

## Scope

**In scope**

1. Sidebar per-deck **context menu** (Radix ContextMenu) with **Rename** and
   **Delete**, reachable by right-click, long-press, and keyboard (Shift+F10 /
   ContextMenu key) - `purerequest` parity.
2. **Inline rename** in the sidebar row: the row becomes a text input; Enter
   commits, Escape cancels, blur commits.
3. Deck-list **context menu** with **New deck** (right-click the deck list /
   empty space, purerequest parity): creates an empty deck with a unique default
   name ("New Deck"), opens it as a tab, and immediately begins inline rename.
4. **Delete confirm dialog** (destructive): "Delete "<name>"?" -> removes the
   deck file, prunes any open deck/study tabs for it.
5. **Command palette** entries: `New deck` and `Delete deck: <name>` per deck.
   (Rename stays sidebar-only - inline editing has no meaning in a palette; a
   palette "rename" would need its own dialog, out of scope.)
6. `CollectionStore.remove(deckId)` added to the seam, implemented in the Tauri
   (file delete), in-memory (map delete), and factory stores.
7. `fs:allow-remove` capability + `@tauri-apps/plugin-fs` `remove` wired for
   the delete path.
8. Works at the phone breakpoint: the deck-list and per-row context menus live
   inside the deck drawer; the New-deck and Delete palette commands give a
   pointer-free path.

**Out of scope (YAGNI / later)**

- Deck import (`.apkg` / CSV / TSV) - that is F6.
- Reordering / nesting decks, folders, drag-and-drop (puredeck has a flat deck
  list, not a tree).
- Duplicate deck.
- Multi-select delete (puredeck sidebar has single selection only).
- Renaming from the palette (needs its own dialog; sidebar inline covers it).
- Undo after delete.

## Data model

No new persisted shape. A `Deck` is unchanged:

```ts
type Deck = { id: string; name: string; cards: Card[] };
```

New store method on the existing seam:

```ts
type CollectionStore = {
  load: () => Promise<Deck[]>;
  save: (deck: Deck) => Promise<void>;   // existing: create (new id) + update (same id)
  remove: (deckId: string) => Promise<void>;  // NEW: delete the deck's file
};
```

- **Create**: `save(newDeck)` with a fresh `crypto.randomUUID()` id and empty
  `cards`. The Tauri store already allocates a unique slug for an unknown id.
- **Rename**: `save({ ...deck, name })`. The id is unchanged, so the store
  rewrites the **same slug file** (slug does not follow the name - a rename does
  not move the file; consistent with existing F1 behavior). New JSON contains
  the new `name`.
- **Delete**: `remove(deck.id)` deletes the backing file; the store forgets the
  slug mapping.

## Acceptance criteria

- AC-001: Right-clicking the deck list (empty space) opens a context menu with
  **New deck**; choosing it creates a new empty deck, opens it as the active
  tab, and puts its sidebar row into inline-rename mode.
- AC-002: A newly created deck has a unique name; creating repeatedly yields
  "New Deck", "New Deck 2", "New Deck 3", ... (no name collision).
- AC-003: Right-clicking (or long-press / Shift+F10 on) a deck row opens a
  context menu with **Rename** and **Delete** items.
- AC-004: Choosing **Rename** turns the row into a text input pre-filled with
  the current name and selected; **Enter** or **blur** commits the new name,
  **Escape** cancels and restores the original.
- AC-005: Committing a rename persists the new name (a reload shows it) and
  keeps the deck's id, cards, and review state intact (same backing file).
- AC-006: Committing a rename to an empty/whitespace-only name is rejected: the
  deck keeps its previous name (no blank decks).
- AC-007: Choosing **Delete** opens a destructive confirm dialog titled
  `Delete "<deck name>"?`; **Cancel** dismisses it with no change.
- AC-008: Confirming delete removes the deck from the sidebar and deletes its
  backing file (a reload does not show it).
- AC-009: Deleting a deck that has an open deck tab and/or study tab closes
  those tabs (they are pruned; the active tab falls back to a surviving tab).
- AC-010: The command palette lists **New deck** (creates + opens, same as
  AC-001 but without auto-rename focus requirement) and **Delete deck: <name>**
  per existing deck (opens the same confirm dialog).
- AC-011: `CollectionStore.remove(deckId)` deletes the matching file in the
  Tauri store and the matching entry in the in-memory store; calling it for an
  unknown id is a no-op (does not throw).
- AC-012: All create/rename/delete affordances are reachable and usable at a
  360-400px phone width inside the deck drawer, and via the palette without a
  pointer.

## User test cases

- TC-001 (happy - create): Right-click the deck list -> New deck -> a new "New
  Deck" row appears, is opened as the active tab, and is in rename mode. Maps
  to: AC-001, AC-002.
- TC-002 (happy - rename): Right-click "Spanish" -> Rename -> type "Espanol" ->
  Enter -> sidebar shows "Espanol"; reload -> still "Espanol", cards unchanged.
  Maps to: AC-003, AC-004, AC-005.
- TC-003 (edge - blank rename): Rename "Spanish" -> clear the field -> Enter ->
  row reverts to "Spanish". Maps to: AC-006.
- TC-004 (cancel rename): Rename "Spanish" -> type "x" -> Escape -> row still
  "Spanish". Maps to: AC-004.
- TC-005 (happy - delete): Right-click "Capitals" -> Delete -> confirm dialog ->
  Delete -> "Capitals" gone from sidebar; reload -> still gone. Maps to:
  AC-007, AC-008.
- TC-006 (cancel delete): Delete "Capitals" -> Cancel -> "Capitals" still
  present. Maps to: AC-007.
- TC-007 (delete open deck): Open "Capitals" (deck + study tabs) -> delete it ->
  both tabs close, active tab falls back to a surviving tab. Maps to: AC-009.
- TC-008 (palette): Mod+K -> "New deck" creates+opens; Mod+K -> "Delete deck:
  Verbs" -> confirm -> gone. Maps to: AC-010.
- TC-009 (store remove): in-memory store with two decks -> `remove(idA)` ->
  `load()` returns only deck B; `remove("missing")` -> no throw, both remain.
  Maps to: AC-011.
- TC-010 (mobile): At 375px, open the drawer -> long-press the deck list -> New
  deck; long-press a row -> Rename/Delete; palette "New deck"/"Delete deck"
  reachable. Maps to: AC-012.

## UI States

| State   | Behavior                                                                 |
| ------- | ------------------------------------------------------------------------ |
| Loading | Existing "No decks yet" / deck list unchanged; no new loading UI.        |
| Empty   | Zero decks: "No decks yet. Right-click here to create one." - the deck-list context menu still creates one. |
| Renaming| The target row is a focused, pre-selected text input; others unchanged.  |
| Confirm | Delete dialog open, deck list dimmed behind the modal overlay.           |
| Error   | Store write/delete failure is logged (console) and swallowed; the        |
|         | optimistic UI state stands (matches existing `save` error handling).     |

## Edge cases

- E-1: Rename to empty / whitespace-only -> rejected, keep old name (AC-006).
- E-2: Rename to a name that slugs identically to another deck -> allowed; the
  file keeps its own (already-unique) slug, so no collision (rename does not
  re-slug). Two decks may share a display name.
- E-3: Create when the default "New Deck" already exists -> numeric suffix
  ("New Deck 2") so the row and any future slug stay unique (AC-002).
- E-4: Delete the deck backing the active tab -> tabs pruned, active falls back
  (AC-009), reusing the existing `pruneTabsToDecks` + `neighbourAfterClose`.
- E-5: Delete an unknown / already-removed id -> no-op, no throw (AC-011).
- E-6: Delete the **last** deck -> sidebar shows "No decks yet"; no re-seed
  happens on the same session (re-seed only fires on a fresh `load()` of an
  empty root, which is the existing behavior - not triggered by delete).
- E-7: Rename while a study session is open on that deck -> the deck object is
  replaced by id in state; the open study tab keeps working (same id).
- E-8: Long-press context menu unreliable in the Android webview -> the palette
  "New deck" / "Delete deck" commands give a pointer-free fallback (AC-012).

## Dependencies

- **`@radix-ui/react-context-menu`** - not yet installed (puredeck has only
  `react-dialog`). `purerequest` uses the `radix-ui` umbrella package for its
  `ContextMenu`; puredeck will add the standalone `@radix-ui/react-context-menu`
  to match its existing per-primitive dependency style (`@radix-ui/react-dialog`,
  `@radix-ui/react-slot`). A `src/components/ui/context-menu.tsx` wrapper is
  added, mirroring purerequest's.
- **`fs:allow-remove`** capability in `src-tauri/capabilities/default.json` -
  the delete path calls `@tauri-apps/plugin-fs` `remove`, which is not currently
  granted (only read-dir/read/write/mkdir/exists are).
- Existing seam: `CollectionStore` (`load`/`save`), `slugify`/`uniqueSlug`,
  `pruneTabsToDecks`, `Dialog`/`Button` UI, `useToast`.

## Infrastructure Prerequisites

| Category              | Requirement |
| --------------------- | ----------- |
| Environment variables | N/A |
| Registry images       | N/A |
| Cloud quotas          | N/A |
| Network reachability  | N/A |
| CI status             | N/A |
| External secrets      | N/A |
| Database migrations   | N/A |

Verification: `npm install` adds `@radix-ui/react-context-menu`; the
`fs:allow-remove` grant is a static capability edit verified by the delete
working in the running desktop app.

## AC traceability (implemented + verified)

| AC | Test(s) |
| -- | ------- |
| AC-001 | workspace-deck-crud "createDeck adds+opens+flags rename"; sidebar-deck-crud "New deck via deck-list context menu creates a row" |
| AC-002 | deck-ops "uniqueDeckName" (base / append 2 / skip taken) |
| AC-003 | sidebar-deck-crud "context menu shows Rename + Delete" |
| AC-004 | sidebar-deck-crud "input pre-filled" / "Enter commits" / "Escape restores" / "blur commits" |
| AC-005 | workspace-deck-crud "renameDeck persists name, keeps id+cards" |
| AC-006 | workspace-deck-crud "blank rename keeps previous name" |
| AC-007 | delete-deck-dialog "title names pending deck" / "Cancel keeps deck" |
| AC-008 | delete-deck-dialog "Delete removes deck" |
| AC-009 | workspace-deck-crud "deleteDeck prunes deck+study tabs, active fallback" |
| AC-010 | palette-deck-crud "New deck creates+opens" / "lists Delete deck" / "Delete deck opens dialog" |
| AC-011 | collection-remove "drops matching deck" / "unknown id no-op" (in-memory); Tauri path by inspection + live verify |
| AC-012 | live Phase-4 verify at 375px (drawer deck-list + row context menus + palette reachable) |

Status: all ACs PASS. Gates: lint 0 errors, typecheck clean, 316 vitest tests
pass, cargo 5 pass. Verified live (desktop + 375px) via Playwright; screenshots
in `.pzielinski/DECK-MGMT/`.

Note: AC-011 Tauri `remove` has no unit test (mirrors the repo's existing
in-memory-only store test convention); correct by inspection (early-return on
unknown id, `removeFile` by slug, `slugById.delete`) and live delete.
