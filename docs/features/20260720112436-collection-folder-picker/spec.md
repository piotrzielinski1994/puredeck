# F7 - Choose the collection folder (custom deck storage path)

Feature folder: `docs/features/20260720112436-collection-folder-picker/`
Branch: `20260720112436-collection-folder-picker`

## Overview

Let the user store decks in **any folder on disk**, not only the app-data
`collections/` directory. A new **Storage** section in Settings shows the
current deck folder and, on desktop, offers a native folder picker plus a
"Reset to default" action. Picking a folder reloads the deck list in place.

This is the **filesystem** data-source method. A future feature (F8) adds a
**Google Drive** method (real Drive API + OAuth) using the same
`CollectionStore` seam; it is out of scope here.

### Why

- `collectionPath` already exists in `Settings` and is plumbed into
  `createTauriCollectionStore(collectionPath)`, but nothing ever sets it and
  there is no UI. The backend accepts a custom root; the front door is missing.
- Users want their decks in a real, visible, backup-able location (Dropbox,
  iCloud Drive, a git repo, a synced Google Drive folder) rather than buried in
  the OS app-data sandbox.

## Scope

**In scope**

1. `Settings > Storage` section: shows current deck folder; desktop shows a
   folder picker + reset; mobile shows a read-only path with a
   "desktop-only" note.
2. Native folder picker via `@tauri-apps/plugin-dialog`.
3. Persist the picked absolute path in `settings.collectionPath`
   (already-defined field).
4. Runtime fs access to the picked path survives app restarts
   (`tauri-plugin-persisted-scope`).
5. Live reload: changing the folder re-creates the collection store, reloads
   decks, and prunes open deck/study tabs that no longer resolve.
6. Reset to default clears `collectionPath` (back to app-data `collections/`).

**Out of scope (YAGNI / later)**

- Google Drive / any cloud sync (future F8).
- Moving or copying existing decks between folders (decided: just switch).
- Watching the folder for external file changes.
- Multiple collection folders at once.

## Data model

No new persisted shape. Reuses the existing optional field:

```ts
type Settings = {
  // ...
  collectionPath?: string; // absolute path to the deck folder; unset = app-data collections/
};
```

`collectionPath` set    -> decks load from `<collectionPath>` directly.
`collectionPath` unset  -> decks load from `appDataDir()/collections` (current default).

## Seed behavior change

Today an empty deck root seeds **all three** demo decks. This feature changes
the seed to **exactly one** demo deck (the first, "Spanish") for **any** empty
root - both first-run app-data and a freshly picked empty folder. Existing seed
tests are updated to match.

## Acceptance criteria

- AC-001: A `Storage` sub-tab appears in Settings alongside Theme and Shortcuts.
- AC-002: The Storage section displays the current deck folder: the absolute
  `collectionPath` when set, otherwise a "Default app data folder" label.
- AC-003 (desktop): A "Choose folder" button opens a native directory picker;
  selecting a directory saves its absolute path to `settings.collectionPath`.
- AC-004 (desktop): Cancelling the picker leaves `collectionPath` unchanged.
- AC-005 (desktop): A "Reset to default" control is shown **only** when a custom
  `collectionPath` is set; activating it clears `collectionPath`.
- AC-006: After the folder changes (pick or reset), the deck list reloads from
  the new folder in place - no app restart required.
- AC-007: After a reload, open deck/study tabs whose deck no longer exists in
  the new folder are closed; the Settings tab and still-valid tabs remain.
- AC-008: An empty deck root (picked folder or first-run app-data) is seeded
  with exactly one demo deck ("Spanish"), which then reads back.
- AC-009 (mobile, viewport < 768px): The Storage section shows the current
  folder read-only with a "Choosing a folder is desktop-only" note and no
  picker/reset controls.
- AC-010: A picked folder remains readable/writable after the app restarts
  (persisted fs scope), so decks in it load on next launch.

## User test cases

- TC-001 (happy, AC-001/AC-002): Open Settings, click Storage -> section shows
  "Default app data folder" and a "Choose folder" button. Maps to AC-001,
  AC-002.
- TC-002 (happy, AC-003/AC-006/AC-008): On desktop pick an empty folder ->
  path saved, deck list reloads showing the single "Spanish" demo deck. Maps to
  AC-003, AC-006, AC-008.
- TC-003 (happy, AC-003/AC-006): Pick a folder that already contains deck JSON
  -> those decks load, no demo seeded. Maps to AC-003, AC-006, AC-008.
- TC-004 (cancel, AC-004): Open picker, cancel -> `collectionPath` and deck list
  unchanged. Maps to AC-004.
- TC-005 (reset, AC-005/AC-006): With a custom path set, "Reset to default" is
  visible; activate it -> `collectionPath` cleared, decks reload from app-data.
  Maps to AC-005, AC-006.
- TC-006 (reset hidden, AC-005): With no custom path, "Reset to default" is not
  rendered. Maps to AC-005.
- TC-007 (tab prune, AC-007): Open a deck tab in folder A, switch to empty
  folder B -> the deck tab (deck absent in B) closes; Settings tab stays. Maps
  to AC-007.
- TC-008 (seed one, AC-008): Loading an empty root yields exactly one deck named
  "Spanish". Maps to AC-008.
- TC-009 (mobile, AC-009): At < 768px the Storage section renders the read-only
  path + desktop-only note and no buttons. Maps to AC-009.

## UI states

| State   | Behavior                                                                 |
| ------- | ------------------------------------------------------------------------ |
| Default | Path label "Default app data folder"; "Choose folder" only (no Reset).   |
| Custom  | Path label shows absolute path; "Choose folder" + "Reset to default".    |
| Picking | Native OS dialog open (blocking); no in-app spinner needed.              |
| Cancel  | No state change.                                                         |
| Mobile  | Read-only path + "desktop-only" note; no controls.                       |

### Wireframes (desktop)

Custom path set:

```
[ Theme ] [ Shortcuts ] [ Storage ]
+--------------------------------------------------------------+
| Storage                                                      |
| Where your decks are stored on disk.                         |
|                                                              |
|  Folder                                                      |
|  +--------------------------------------------------+        |
|  | /Users/me/Decks                                  |        |
|  +--------------------------------------------------+        |
|                                                              |
|  [ Choose folder ]   [ Reset to default ]                    |
|                                                              |
|  Decks reload from the new folder right away. An empty       |
|  folder gets one demo deck.                                  |
+--------------------------------------------------------------+
```

Default (no custom path) - Reset absent:

```
+--------------------------------------------------------------+
| Storage                                                      |
| Where your decks are stored on disk.                         |
|                                                              |
|  Folder                                                      |
|  +--------------------------------------------------+        |
|  | Default app data folder                          |        |
|  +--------------------------------------------------+        |
|                                                              |
|  [ Choose folder ]                                           |
+--------------------------------------------------------------+
```

Mobile (< 768px) - read-only, no controls:

```
+----------------------------------+
| Storage                          |
| Where your decks are stored.     |
|                                  |
|  Folder                          |
|  +----------------------------+  |
|  | Default app data folder    |  |
|  +----------------------------+  |
|                                  |
|  Choosing a folder is            |
|  desktop-only.                   |
+----------------------------------+
```

## Edge cases

- E-1 (empty pick): Picked folder is empty -> seed one demo deck ("Spanish"),
  then load it.
- E-2 (cancel): Picker returns `null` -> no-op.
- E-3 (multi-select): Force single-select (`multiple: false`); if an array is
  returned, ignore it / treat as cancel.
- E-4 (same path re-picked): Picking the current path is a no-op reload (no
  crash, idempotent).
- E-5 (unreadable/deleted path on next launch): `load` catches errors and falls
  back to the default demo (existing error path preserved).
- E-6 (open tab prune): Deck/study tabs referencing decks absent in the new
  folder are closed; active tab falls back to a remaining tab or none.
- E-7 (mobile has no picker): Tauri dialog offers no folder picker on
  Android/iOS -> section is read-only there (AC-009), never calls `open`.

## Dependencies

- **New runtime deps**: `@tauri-apps/plugin-dialog` (folder picker),
  `tauri-plugin-persisted-scope` (Rust) so runtime fs scope for the picked path
  survives restarts.
- **Rust**: register `tauri_plugin_dialog::init()` and
  `tauri_plugin_persisted_scope::init()` in `lib.rs`.
- **Capabilities**: add `dialog:default` (or `dialog:allow-open`); the fs scope
  for the picked path is granted at runtime by the dialog `open` call and kept
  by persisted-scope, so no static `$HOME/**` widening is added.
- **Frontend**: `Settings > Storage` section, a `saveCollectionPath` settings
  mutator, and a workspace-context change that re-inits the store when
  `collectionPath` changes.

## Non-goals / platform notes

- Desktop-first feature. Mobile degrades to a read-only path (AC-009) because
  Tauri's dialog has no folder picker on Android/iOS. Deck management on mobile
  remains via in-app CRUD (backlog F3), not a folder picker.
