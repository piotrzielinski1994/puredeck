# Spec: User Config - Collections on Disk + Persisted Keymap (requi-mirrored)

**Version:** 0.1.0
**Created:** 2026-07-17
**Status:** Draft

## 1. Overview

Give puredeck real on-disk persistence for two config surfaces, mirroring how `requi` split its
config across separate feature-slices, adapted to the flashcards domain:

1. **Collections on disk** (`collections/<deck-slug>.json`) - each deck is one JSON file in a
   `collections/` directory under the OS app-data dir. On launch the app **reads** the directory
   and the sidebar reflects the decks it finds. If the directory is empty/absent on first run, the
   built-in demo decks are **seeded to disk once**. This is the requi `workspace-config` analog:
   **read-only, hand-editable files** - there is no in-app deck/card editing yet (that is a later
   feature, same deferral as requi deferred in-app config editing).

2. **Persisted keymap** (`keymap.json`) - the three already-wired actions (open command palette,
   flip card, toggle sidebar) move behind a **shortcut action registry** + **resolver** +
   `useActionHotkeys` hook. User overrides live in `keymap.json` and are honored on launch;
   missing/invalid entries fall back to the registry default. This is the requi `keyboard-shortcuts`
   analog **minus the in-app recorder UI** - rebinding is by hand-editing `keymap.json` for now
   (the Settings > Shortcuts pane shows the *effective* bindings read-only). An in-app key recorder
   is a later feature (same deferral pattern requi used for the console toggle).

The existing **`settings.json`** surface (panel layout, sidebar-collapsed, open tabs, theme mode)
already shipped in the layout feature; this feature only **extends** it with a `shortcuts` override
map and a `collectionPath` pointer, and **splits** the keymap into its own `keymap.json` store file
(mirroring requi's `settings.json` / `keymap.json` split).

### The three stores (matches requi's split)

| File | Owns | Reachable how |
| ---- | ---- | ------------- |
| `settings.json` | version, layouts, sidebarCollapsed, openTabIds, activeTabId, theme.mode, `collectionPath` | already wired; extended here |
| `keymap.json` | `shortcuts` override map (actionId -> hotkey string) | new store split |
| `collections/<slug>.json` | one deck per file (id, name, cards) | new fs port |

### User Story

As a puredeck user, I want my decks stored as plain JSON files I can hand-edit and back up, and my
keyboard bindings remembered across launches, so the app reopens with the decks I have on disk and
the shortcuts I configured, without hidden state.

## 2. Acceptance Criteria

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-001 | On launch the app reads `collections/*.json` from the app-data dir via a `CollectionStore` port; each valid file becomes a deck in the sidebar. Decks survive a restart. | Must |
| AC-002 | First run with no `collections/` dir (or an empty one) **seeds the demo decks to disk once** (one `<slug>.json` per demo deck), then loads them. A subsequent launch reads the seeded files and does **not** re-seed. | Must |
| AC-003 | A malformed/partial deck file (invalid JSON, missing `name`/`cards`, wrong types) is **skipped** (dropped, not crashed); valid files still load. Cards with non-string front/back are dropped from that deck. | Must |
| AC-004 | Each deck file's stem is a **slug** derived from the deck name (`slugify`); slugs are **de-duplicated** within the collection so two same-named decks never collide on one file. | Must |
| AC-005 | All deck access goes through a `CollectionStore` port; the test suite runs against an **in-memory fake** with no Tauri/fs runtime. | Must |
| AC-006 | When Tauri/fs is unavailable (dev-browser mode), the store returns the **demo decks** (no disk read, no throw) so the app still renders. | Should |
| AC-007 | A **shortcut action registry** (pure data: id, name, description, `defaultHotkey`) is the single source of the action list. The three in-scope actions are `open-command-palette` (`Mod+K`), `flip-card` (`Space`), `toggle-sidebar` (`Mod+B`). | Must |
| AC-008 | A **resolver** merges registry defaults + persisted overrides into an effective binding map, dropping unknown action ids and invalid/non-normalizable hotkeys. | Must |
| AC-009 | A user override in `keymap.json` is honored on launch: the action fires on the overridden hotkey and **not** on the registry default. Overrides persist via the `SettingsStore` port (written to `keymap.json`). | Must |
| AC-010 | The three actions are wired via a `useActionHotkeys(handlers)` hook reading the effective bindings (not hard-coded `useHotkey("Mod+K")` calls); pressing an effective binding runs its action (palette toggles, card flips, sidebar toggles). | Must |
| AC-011 | A corrupt/partial/hand-edited `shortcuts` map in `keymap.json` falls back per action to the registry default (unknown ids + non-string/invalid hotkeys dropped); no crash. | Must |
| AC-012 | The Settings > Shortcuts pane lists **every registry action** with a human-readable label of its **current effective binding** (`formatForDisplay`), replacing today's hard-coded static list. Read-only (no recorder). | Must |
| AC-013 | `npm run lint`, `npm run typecheck`, `npm test` exit 0. No `any`. `cargo test` exits 0 (plugin registration compiles). | Must |

## 3. User Test Cases

### TC-001 (happy path): Decks load from disk
**Precondition:** In-memory `CollectionStore` seeded with two valid deck files.
**Steps:** Mount the workspace over that store.
**Expected:** Both decks appear in the sidebar; opening one shows its cards.
**Maps to:** AC-001, AC-005.

### TC-002 (first run): Seed on empty
**Precondition:** In-memory store with an empty collection dir.
**Steps:** Run the load path.
**Expected:** The demo decks are written to the store (one file per deck), then returned. Re-running the load path finds the files and does not write again.
**Maps to:** AC-002.

### TC-003 (corrupt): Malformed deck file skipped
**Precondition:** Store has one valid deck file + one invalid (bad JSON) + one partial (missing `cards`).
**Steps:** Run the load path.
**Expected:** Only the valid deck loads; the invalid + partial are skipped; no throw. A deck with a card missing `back` keeps its other cards, drops the bad card.
**Maps to:** AC-003.

### TC-004 (slug): Duplicate names get unique slugs
**Precondition:** Seeding two decks both named "Spanish".
**Steps:** Seed to the store.
**Expected:** File stems are `spanish.json` and `spanish-2.json`; both decks load.
**Maps to:** AC-004.

### TC-005 (dev fallback): No fs -> demo decks
**Precondition:** `createCollectionStore()` resolved in a non-Tauri env.
**Steps:** Call `load`.
**Expected:** Returns the demo decks; no throw, no disk access.
**Maps to:** AC-006.

### TC-006 (registry): Action list is registry-driven
**Precondition:** Registry module imported.
**Steps:** Read `SHORTCUT_ACTIONS`.
**Expected:** Contains exactly the three in-scope actions with their default hotkeys; ids are unique.
**Maps to:** AC-007.

### TC-007 (resolve): Overrides + garbage
**Precondition:** overrides = `{ "flip-card": "Enter", "bogus-id": "X", "toggle-sidebar": "" }`.
**Steps:** `resolveShortcuts(overrides)`.
**Expected:** `flip-card -> ["Enter"]`; `toggle-sidebar` falls back to default (empty string invalid); `open-command-palette -> [default]`; `bogus-id` absent.
**Maps to:** AC-008, AC-011.

### TC-008 (round-trip): Override survives restart
**Precondition:** In-memory `SettingsStore`.
**Steps:** Save a `shortcuts` override for `flip-card`, re-create the provider over the same store, load.
**Expected:** The reloaded settings carry the override; the resolver yields the overridden binding.
**Maps to:** AC-009.

### TC-009 (wiring): Effective binding fires action
**Precondition:** Provider with `flip-card` overridden to `Enter`.
**Steps:** Mount a component using `useActionHotkeys({ "flip-card": handler })`; press `Enter`; press `Space`.
**Expected:** `handler` runs on `Enter`, not on `Space`.
**Maps to:** AC-010.

### TC-010 (settings render): Shortcuts pane lists effective bindings
**Precondition:** Settings > Shortcuts pane rendered under a provider.
**Steps:** Read the rendered rows.
**Expected:** One row per registry action, each showing the action name + its effective binding label; no hard-coded list.
**Maps to:** AC-012.

## 4. UI States

| State | Behavior |
| ----- | -------- |
| Loading | Collection read is async; until decks resolve the workspace renders its existing shell (sidebar may show the empty "No decks yet" line briefly). |
| First run / empty | No `collections/` dir -> seed demo decks to disk, then load. |
| Corrupt | Per-file: malformed deck files are skipped; valid decks still render. |
| Restored | Files present -> sidebar lists on-disk decks; open-tab state from `settings.json` restores as before. |
| Shortcuts pane | Read-only list of every action + its effective binding (`formatForDisplay`). No recorder controls. |

## 5. Data Model

### Deck file on disk (`collections/<slug>.json`)

Reuses the existing in-memory `Deck`/`Card` (`src/lib/workspace/model.ts`) verbatim - one deck per file:

```jsonc
{
  "id": "spanish",
  "name": "Spanish",
  "cards": [
    { "id": "es-1", "front": "hola", "back": "hello" }
  ]
}
```

### CollectionStore port (the only surface the app depends on)

```ts
type CollectionStore = {
  load: () => Promise<Deck[]>;          // never throws; seeds-then-reads on first run; skips corrupt files
  // No save() in this feature - decks are read-only + hand-edited (see Out of Scope).
};
```

Two adapters: a Tauri fs adapter (`@tauri-apps/plugin-fs`, reads/enumerates `collections/*.json`,
seeds demo decks once) and an in-memory fake (`Record<slug, string>` file map) for tests/dev.

### Settings extension (`settings.ts`)

```ts
type ShortcutActionId = "open-command-palette" | "flip-card" | "toggle-sidebar";
type ShortcutOverrides = Partial<Record<ShortcutActionId, string>>;

type Settings = {
  version: 1;
  layouts: Partial<Record<PanelGroupKey, PanelLayout>>;
  sidebarCollapsed: boolean;
  openTabIds: string[];
  activeTabId: string | null;
  theme: ThemeSettings;
  shortcuts: ShortcutOverrides;   // NEW - fed to keymap.json on save
  collectionPath?: string;        // NEW - where collections/ lives; default under app-data
};
```

`DEFAULT_SETTINGS.shortcuts = {}`; `collectionPath` absent -> adapter derives `<appData>/collections`.

### Shortcut registry (`shortcuts/registry.ts`)

```ts
type ShortcutAction = {
  id: ShortcutActionId;
  name: string;
  description: string;
  defaultHotkey: string;   // "Mod+K", "Space", "Mod+B"
};
const SHORTCUT_ACTIONS: readonly ShortcutAction[];
```

## 6. Edge Cases

| # | Case | Handling |
|---|------|----------|
| E-1 | No `collections/` dir (first run) | Adapter seeds demo decks once, then reads |
| E-2 | Empty `collections/` dir | Same as E-1: seed once, then read (dir exists but no `*.json`) |
| E-3 | Corrupt JSON in a deck file | Skip that file; keep others; no throw |
| E-4 | Partial deck (missing name/cards, or a bad card row) | Drop invalid deck; within a valid deck drop bad card rows |
| E-5 | Two decks same name | `slugify` + `uniqueSlug` -> `spanish.json`, `spanish-2.json` |
| E-6 | Tauri/fs unavailable (dev-browser) | `load` returns demo decks; no disk access, no throw |
| E-7 | `shortcuts` override = `""` or invalid hotkey | Dropped by resolver; action falls back to registry default |
| E-8 | `shortcuts` override for unknown action id | Dropped by merge + resolver |
| E-9 | `shortcuts` override = valid non-default (e.g. `flip-card: "Enter"`) | Effective binding is `Enter`; default `Space` no longer fires |
| E-10 | Non-`.json` files in `collections/` | Ignored by the `*.json` enumeration filter |

## 7. Dependencies

New:
- npm: `@tauri-apps/plugin-fs` (v2).
- Cargo: `tauri-plugin-fs = "2"`, registered in `lib.rs`.
- Capability: add `fs:default` (+ scoped read/write of the app-data `collections` dir) to
  `src-tauri/capabilities/default.json`.

Reused (already present): `@tauri-apps/plugin-store` (settings/keymap files), `@tanstack/hotkeys`
(`normalizeHotkey`/`validateHotkey`/`formatForDisplay`), `@tanstack/react-hotkeys` (`useHotkeys`).

## 8. Out of Scope

- **In-app deck/card editing** (add/rename/delete decks or cards, write-back to disk). Decks are
  read-only + hand-edited this feature (`CollectionStore` has no `save`). A later feature adds CRUD.
- **In-app key recorder UI** (record/rebind/reset/conflict in Settings). Rebinding is by hand-editing
  `keymap.json`; the pane is read-only. Later feature.
- **Folder/nested collections, inheritance, config resolution** (requi's per-folder config). puredeck
  decks are flat - a collection is a single directory of deck files.
- **Folder picker / changing `collectionPath` from the UI.** Hand-edit `settings.json`.
- **Spaced-repetition scheduling / study state persistence** - decks carry only cards, no review data.
- Schema migrations beyond `version` + per-field default merge.

## 9. Revision History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-07-17 | Initial draft |
