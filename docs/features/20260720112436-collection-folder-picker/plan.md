# F7 - Plan: Choose the collection folder

From approved [spec.md](spec.md). TDD, red-green-refactor per task.

## Approach

Reuse the existing `CollectionStore` seam and the already-defined
`settings.collectionPath` field. Nothing new in the domain model; the work is
structural (pz-codebase-design):

1. A **single starter set** (`SEED_DECKS` = one deck, "Spanish") replaces the
   3-deck seed everywhere a root is empty.
2. A **`saveCollectionPath`** settings mutator (set / clear).
3. **Live reload** in `WorkspaceProvider`: the collection store is re-created
   (via `useMemo` keyed on `collectionPath`) whenever the path changes; a pure
   `pruneTabsToDecks` helper drops open tabs whose deck vanished.
4. A **`Storage`** settings section with a native folder picker
   (`@tauri-apps/plugin-dialog`), read-only on mobile.
5. **Rust plumbing**: register `tauri-plugin-dialog` +
   `tauri-plugin-persisted-scope` so the picked path stays in fs scope across
   restarts.

Design pattern: the collection store stays a **deep module** behind
`load/save`; only its *construction* (which root) becomes reactive. Tab pruning
is a pure function (return value, no side effect) so it is unit-testable.

## File Structure

```
src/lib/workspace/demo-data.ts            MOD  add SEED_DECKS = [DEMO_DECKS[0]]
src/lib/workspace/tauri-collection.ts     MOD  seed + error-fallback use SEED_DECKS
src/lib/workspace/in-memory-collection.ts MOD  seed-on-empty uses SEED_DECKS
src/lib/workspace/collection-store-factory.ts MOD non-Tauri pre-seed uses SEED_DECKS
src/lib/workspace/model.ts                MOD  add pure pruneTabsToDecks(openTabIds, deckIds)
src/lib/settings/settings-context.tsx     MOD  add saveCollectionPath(path?) mutator
src/components/workspace/workspace-context.tsx MOD useMemo store keyed on collectionPath + prune stale tabs after load
src/components/settings/storage-section.tsx NEW StorageSection component (picker/reset/read-only)
src/components/workspace/settings-view.tsx MOD  add "storage" sub-tab -> StorageSection
src-tauri/Cargo.toml                       MOD  + tauri-plugin-dialog, tauri-plugin-persisted-scope
src-tauri/src/lib.rs                       MOD  register both plugins
src-tauri/capabilities/default.json        MOD  + dialog:default
package.json                               MOD  + @tauri-apps/plugin-dialog
tests/collection-store.test.ts             MOD  seed assertions -> SEED_DECKS (1 deck)
tests/collection-seed.test.ts              NEW  SEED_DECKS = 1 "Spanish" everywhere
tests/settings-collection-path.test.ts     NEW  saveCollectionPath set/clear
tests/tab-prune.test.ts                    NEW  pruneTabsToDecks unit
tests/workspace-reload.test.tsx            NEW  path change -> reload + prune (AC-006/AC-007)
tests/storage-section.test.tsx             NEW  Storage UI (AC-001/002/003/004/005/006/009)
```

## Task breakdown

### Task 1: Single-deck seed (`SEED_DECKS`)

**Files:** Modify `demo-data.ts`, `tauri-collection.ts`,
`in-memory-collection.ts`, `collection-store-factory.ts`. Test:
`tests/collection-seed.test.ts` (new) + update `tests/collection-store.test.ts`
(lines 148-169, 211-217).

**Interfaces:**
- Produces: `export const SEED_DECKS: Deck[]` (= `[DEMO_DECKS[0]]`, the "Spanish"
  deck). All empty-root seed paths and the fs error-fallback use `SEED_DECKS`;
  `DEMO_DECKS` stays as the full catalog it derives from.
- Consumes: existing `DEMO_DECKS`, `seedFileMap`.

- [ ] Write failing tests: empty in-memory root seeds exactly one deck named
      "Spanish"; `createCollectionStore()` (non-Tauri) returns exactly that one
      deck; re-seed is idempotent (1 file, no growth).
- [ ] Run, confirm RED (current code seeds 3).
- [ ] Add `SEED_DECKS`; swap seed + fallback references from `DEMO_DECKS` to
      `SEED_DECKS`.
- [ ] Run, confirm GREEN (incl. updated `collection-store.test.ts`).
- [ ] Commit `feat(F7): AC-008 seed one demo deck for any empty root`.

### Task 2: `saveCollectionPath` settings mutator

**Files:** Modify `settings-context.tsx`. Test:
`tests/settings-collection-path.test.ts` (new).

**Interfaces:**
- Produces: `saveCollectionPath(path: string | undefined): void` on the settings
  context value; a string sets `settings.collectionPath`, `undefined` clears it.
- Consumes: existing `update` reducer, `Settings.collectionPath` field.

- [ ] Write failing tests: calling with a path persists it; calling with
      `undefined` removes it (loads back as default).
- [ ] Run, confirm RED (mutator absent).
- [ ] Add mutator to context value + type.
- [ ] Run, confirm GREEN.
- [ ] Commit `feat(F7): AC-003 add saveCollectionPath settings mutator`.

### Task 3: Live reload + tab prune

**Files:** Modify `model.ts` (pure helper), `workspace-context.tsx`. Tests:
`tests/tab-prune.test.ts` (new, unit), `tests/workspace-reload.test.tsx` (new,
integration).

**Interfaces:**
- Produces: `pruneTabsToDecks(openTabIds: string[], deckIds: Set<string>): string[]`
  - keeps `SETTINGS_TAB_ID` and any tab whose resolved deck id (`studyDeckId`
    for study tabs, the id itself for deck tabs) is in `deckIds`; preserves
    order.
- Consumes: `settings.collectionPath` (Task 2 writes it), `SETTINGS_TAB_ID`,
  `isStudyTabId`, `studyDeckId`, `saveOpenTabs`.
- Change: `collectionStore` becomes
  `useMemo(() => store ?? createCollectionStore(settings.collectionPath),
  [store, settings.collectionPath])`. After each load (when `decksProp` absent),
  compute pruned open tabs from loaded deck ids; if changed, `saveOpenTabs`
  with a valid next-active (kept active id, else first pruned, else null).

- [ ] Write failing tests: `pruneTabsToDecks` keeps Settings + valid deck/study
      tabs, drops absent ones, preserves order (unit); integration: mount with
      injected store A + open deck tab, change `collectionPath` -> store B
      (empty -> 1 "Spanish") -> deck list swaps and the stale deck tab closes,
      Settings tab stays (AC-006/AC-007).
- [ ] Run, confirm RED.
- [ ] Add helper + `useMemo` store + post-load prune.
- [ ] Run, confirm GREEN.
- [ ] Commit `feat(F7): AC-006 AC-007 reload decks and prune tabs on folder change`.

### Task 4: Storage settings section UI

**Files:** New `src/components/settings/storage-section.tsx`; modify
`settings-view.tsx` (add `"storage"` to `Section`, a Storage sub-tab, render
`StorageSection`). Test: `tests/storage-section.test.tsx` (new).

**Interfaces:**
- Consumes: `useSettings().settings.collectionPath` + `saveCollectionPath`
  (Task 2), `useIsMobile`, `isTauri`, `open` from `@tauri-apps/plugin-dialog`.
- Behavior: shows path label (absolute path or "Default app data folder");
  desktop shows "Choose folder" (calls `open({directory:true,multiple:false})`;
  a string result -> `saveCollectionPath(result)`; `null`/array -> no-op) and,
  only when a custom path is set, "Reset to default" (`saveCollectionPath(undefined)`);
  mobile shows read-only label + "Choosing a folder is desktop-only", no buttons.

- [ ] Write failing tests (mock `@tauri-apps/plugin-dialog` `open`): Storage
      sub-tab renders (AC-001); default label + no Reset (AC-002/AC-005/TC-006);
      choosing a folder saves path (AC-003/TC-002); cancel = no-op (AC-004);
      custom path shows Reset, clears on click (AC-005/TC-005); mobile (mock
      `useIsMobile` true) shows read-only note, no buttons (AC-009/TC-009).
- [ ] Run, confirm RED.
- [ ] Build `StorageSection` + wire the sub-tab; guards over nesting, no `any`.
- [ ] Run, confirm GREEN.
- [ ] Commit `feat(F7): AC-001 AC-002 AC-005 AC-009 Storage settings section + folder picker`.

### Task 5: Tauri plugin plumbing (native, no unit test)

**Files:** Modify `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`,
`src-tauri/capabilities/default.json`, `package.json`.

**Interfaces:**
- Produces: `dialog` JS plugin available to the frontend; picked-path fs scope
  persisted across restarts (AC-010).
- Register `tauri_plugin_dialog::init()` and
  `tauri_plugin_persisted_scope::init()` in `lib.rs`; add `dialog:default` to
  capabilities; add `@tauri-apps/plugin-dialog` to `package.json` +
  the two crates to `Cargo.toml`.

- [ ] Add deps (`cargo add` in `src-tauri`, `npm i @tauri-apps/plugin-dialog`).
- [ ] Register plugins + capability.
- [ ] `cargo build` in `src-tauri` succeeds; `npm run build` + `npm test` green.
- [ ] Live smoke: `npm start`, pick a folder, confirm decks reload; restart,
      confirm the folder still loads (AC-010).
- [ ] Commit `feat(F7): AC-010 register dialog + persisted-scope plugins`.

## Edge cases (from spec)

- Empty pick -> seed one "Spanish" (Task 1, E-1).
- Cancel picker (`null`) -> no-op (Task 4, E-2).
- Array result (multi) -> ignored (Task 4, E-3).
- Re-pick same path -> idempotent reload (Task 3, E-4).
- Unreadable/deleted path next launch -> `load` catch falls back to `SEED_DECKS`
  (Task 1 + existing catch, E-5).
- Stale open tabs -> pruned (Task 3, E-6).
- Mobile has no picker -> section never calls `open` (Task 4, E-7).

## Tests to write (>= one per AC)

| AC | Test |
| -- | ---- |
| AC-001 | storage-section: Storage sub-tab renders |
| AC-002 | storage-section: default label / custom path label |
| AC-003 | storage-section: choose folder saves path (dialog mocked) |
| AC-004 | storage-section: cancel leaves path unchanged |
| AC-005 | storage-section: Reset visible only with custom path, clears it |
| AC-006 | workspace-reload: path change reloads deck list |
| AC-007 | workspace-reload + tab-prune: stale tabs closed |
| AC-008 | collection-seed: empty root -> one "Spanish" |
| AC-009 | storage-section: mobile read-only, no controls |
| AC-010 | live smoke (native; persisted-scope) - manual, Task 5 |

## Verification (Phase 4)

Fresh verifier subagent: `npm run lint`, `npm run typecheck`, full `npm test`,
`cargo build` in `src-tauri`; adversarial edge probe; AC->test table. Then live
`npm start` folder-pick + restart smoke for AC-010. Coverage threshold: none.
