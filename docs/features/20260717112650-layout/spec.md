# Spec: Layout - App Shell (requi-mirrored)

**Version:** 0.1.0
**Created:** 2026-07-17
**Status:** Draft
**Approved wireframe:** [wireframe.html](./wireframe.html) (interactive; requi/dbui design system)

## 1. Overview

Replace the bootstrap's top-nav + route-per-page chrome with a **requi-style desktop app shell**:
a resizable, collapsible **Sidebar** (deck list) beside a **Main** area whose content is driven by an
in-app **tab strip** (not routes). Adds a **ThemeProvider** (light/dark/system, persisted) and a
pluggable **settings store** (Tauri `plugin-store` in the app, in-memory in dev/test) so layout state
survives restart.

This feature is **shell only**. The three content surfaces - Deck view, Study, Settings - render as
**scaffolds** (static demo data, no real persistence, no spaced-repetition). Real Card/Deck storage and
the study algorithm arrive in later features. Design system, tokens, and component patterns mirror `requi`
verbatim (radius 0, neutral OKLCH, `bg-accent` + `inset primary` active state, full-bleed panes, flush
bar actions).

### User Story

As a PureDeck user, I want a persistent app shell with a deck sidebar and tabbed content, so I can keep
several decks (and Study/Settings) open at once, resize and collapse the sidebar, and switch the app
theme - with all of that surviving a restart.

## 2. Acceptance Criteria

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-001 | App renders a horizontal resizable split: **Sidebar** (left, default 20%, min 12% / max 40%) `│` drag handle `│` **Main**. Dragging the handle resizes; sizes use `react-resizable-panels` via a `ui/resizable` wrapper mirrored from requi. | Must |
| AC-002 | Sidebar is **collapsible**: a toggle (and `Mod+B`) hides the sidebar panel so Main fills the width; toggling again restores it. Collapsed state is persisted. | Must |
| AC-003 | Sidebar shows the **"PureDeck" brand header** (`h-9`, `border-b`, `bg-muted/30`, brand text only - no action icons) over a **deck list** (static scaffold decks, name only, `bg-accent` on hover/selected - no counts/dots/icons). Clicking a deck opens it as a Main tab and selects it. | Must |
| AC-004 | Main has a **tab strip** (`h-9`, `border-b`, `bg-muted/30`): open-deck tabs + a Study tab + a Settings tab. Tabs **switch** (click), **close** (× per tab), **reorder** (drag, dnd-kit), and a **new-tab** (`+`) affordance exists. Active tab = `bg-accent` + `shadow-[inset_0_-2px_0_0_var(--primary)]`; inactive = `text-muted-foreground`. | Must |
| AC-005 | **Deck view** surface = a pane-toolbar (`items-stretch`, no padding: deck title + card count in a padded cell, an icon-only **Study** action filled `bg-primary`, `h-full`, `border-l`, flush to the right edge) over a **full-bleed editable key/value grid** glued to the pane edges (columns `front │ back │ delete`, `border-t border-l`, cells `border-r border-b`, `h-9` mono inputs, trailing blank row to add). Scaffold: rows are static demo cards. | Must |
| AC-006 | **Study** surface = centered flashcard showing the **front**; clicking it or pressing **Space** flips to reveal the **back**; grade buttons **Again / Hard / Good** appear only after flip and advance to the next card. A `Card N / M` progress label shows. Scaffold: static card sequence, no scheduling. | Must |
| AC-007 | **Settings** surface = a **sub-tab bar** (`Theme`, `Shortcuts`) where **each section is its own pane** (never stacked). Theme pane = segmented **Light / Dark / System** control (requi filled/outline button group). Shortcuts pane = static read-only list of bindings. | Must |
| AC-008 | **ThemeProvider**: mode is `light` \| `dark` \| `system`; `system` resolves via `matchMedia('(prefers-color-scheme: dark)')` and reacts to OS changes; the resolved mode toggles the `.dark` class on `<html>`. Changing mode in the Theme pane updates the UI immediately. | Must |
| AC-009 | **Persistence**: a pluggable `SettingsStore` (`load`/`save`) backs layout state. In the packaged app it uses `@tauri-apps/plugin-store`; in dev-browser/tests it uses an in-memory store (env-branched). Persisted: panel layout sizes, `sidebarCollapsed`, `theme.mode`, open tab ids + active tab id. State reloads on next launch. | Must |
| AC-010 | **Empty state**: when no deck/Study/Settings tab is open, Main shows a "No deck open" empty state (centered), not a blank pane. | Must |
| AC-011 | **Single route + tabs**: the router serves exactly one path (`/`) rendering the shell; `/settings` is no longer a route (Settings is a tab). The `Mod+K` command palette opens surfaces as **tabs** (Open Settings, Open Study, go to a deck) instead of navigating routes. | Must |
| AC-012 | Lint + typecheck + full test suite pass: `npm run lint`, `npm run typecheck`, `npm test` exit 0. No `any`. | Should |

## 3. User Test Cases

### TC-001 (happy path): Shell renders with sidebar + main
**Precondition:** App launched (in-memory store).
**Steps:** Observe the initial render.
**Expected:** A `region`/`complementary` sidebar labelled with the brand and a deck list renders on the left; a Main area with a tab strip renders on the right, split by a resize handle.
**Maps to:** AC-001, AC-003.

### TC-002 (happy path): Resize the sidebar
**Precondition:** Shell rendered.
**Steps:** Drag the handle left/right; reload the app.
**Expected:** Sidebar width changes within min/max bounds; the new size is restored after reload.
**Maps to:** AC-001, AC-009.

### TC-003: Collapse and restore the sidebar
**Precondition:** Shell rendered, sidebar visible.
**Steps:** Trigger the collapse toggle (or `Mod+B`); observe; trigger again.
**Expected:** Sidebar hides and Main fills width; collapsed state persists across reload; toggling again restores it.
**Maps to:** AC-002, AC-009.

### TC-004 (happy path): Open, switch, close, reorder tabs
**Precondition:** Shell rendered.
**Steps:** Click two decks (opens two tabs); click a tab to switch; drag one tab past the other; click a tab's ×.
**Expected:** Two deck tabs open; clicking switches the active tab (active styling moves); drag reorders; × closes the tab and activates a neighbour.
**Maps to:** AC-004.

### TC-005: Deck view renders the card grid scaffold
**Precondition:** A deck tab is active.
**Steps:** Observe the deck view.
**Expected:** A pane-toolbar with the deck title + count and a flush icon-only Study action; below it a full-bleed grid of `front │ back │ delete` rows plus a trailing blank row. Grid is glued to the pane edges (no outer padding).
**Maps to:** AC-005.

### TC-006 (happy path): Study flip + grade
**Precondition:** A Study tab is active.
**Steps:** Observe the front; press Space (or click the card); observe; click "Good".
**Expected:** Front shows first with grades hidden; flip reveals the back and shows Again/Hard/Good; grading advances to the next card and re-hides the back.
**Maps to:** AC-006.

### TC-007: Settings sections are separate panes
**Precondition:** Settings tab active.
**Steps:** Observe the Theme pane; click the "Shortcuts" sub-tab.
**Expected:** Theme pane shows only the Light/Dark/System control (Shortcuts content not visible); clicking "Shortcuts" swaps to the shortcuts list and hides the theme control.
**Maps to:** AC-007.

### TC-008 (happy path): Theme mode switch
**Precondition:** Settings > Theme pane, mode = System.
**Steps:** Click "Light"; then "Dark".
**Expected:** `<html>` loses/gains the `.dark` class accordingly and the UI recolors immediately; the selected mode persists across reload.
**Maps to:** AC-008, AC-009.

### TC-009 (edge): System mode follows OS + reacts to change
**Precondition:** Theme mode = System, OS in dark.
**Steps:** Observe; flip the OS `prefers-color-scheme` (simulated via matchMedia in tests).
**Expected:** Resolved mode tracks the OS preference; a live OS change updates `.dark` without a reload.
**Maps to:** AC-008.

### TC-010 (edge): Empty state when nothing is open
**Precondition:** Shell rendered, then all tabs closed.
**Steps:** Close every tab.
**Expected:** Main shows the "No deck open" empty state, not a blank pane.
**Maps to:** AC-010.

### TC-011: Command palette opens tabs, not routes
**Precondition:** Shell rendered.
**Steps:** Press `Mod+K`; run "Open Settings".
**Expected:** The palette lists tab-opening commands; running one opens/activates the Settings tab (URL/route unchanged - there is only `/`).
**Maps to:** AC-011.

### TC-012 (edge): Persisted state reload is resilient to garbage
**Precondition:** Store contains a malformed/partial settings blob.
**Steps:** Load the app.
**Expected:** Missing/invalid fields fall back to defaults (merge), the app renders, no crash.
**Maps to:** AC-009.

## 4. UI States

| State | Behavior |
| ----- | -------- |
| Loading | Settings load is async; until it resolves the shell renders nothing (or a bare frame) - no flash of unstyled/route content. |
| Empty | No open tabs -> Main "No deck open" empty state. Empty deck list -> sidebar shows a muted "No decks yet" line (scaffold ships static decks, so mainly the tab-empty state matters). |
| Error | A store `load`/`save` failure is swallowed to defaults (load) / logged (save); the app never crashes on persistence errors. |
| Success | Sidebar + tabbed Main render; resize/collapse/theme/tabs all work and persist. |

ASCII wireframes below capture each surface; the interactive source of truth is [wireframe.html](./wireframe.html).

### Shell + Deck view (active tab)
```
+----------------------+---+----------------------------------------+
| PureDeck             | H | [Spanish][Study: Spanish][Settings][+]  |
+----------------------+ A +----------------------------------------+
| Spanish              | N | Spanish   42 cards              [Study] |  <- pane toolbar (flush action)
| Capitals             | D +----------------------------------------+
| Verbs                | L | front            | back           | [x] |  <- full-bleed grid, glued
|                      | E | hola             | hello          | [x] |
|                      |   | gato             | cat            | [x] |
|                      |   | front            | back           |     |  <- trailing blank row
+----------------------+---+----------------------------------------+
```

### Study (flipped)
```
+----------------------+---+----------------------------------------+
| PureDeck             | H | [Spanish][Study: Spanish][Settings][+]  |
+----------------------+ A +----------------------------------------+
| Spanish              | N |               Card 3 / 42               |
| Capitals             | D |        +-----------------------+        |
| Verbs                | L |        |  gato                 |        |
|                      | E |        |  -------------------  |        |
|                      |   |        |         cat           |        |
|                      |   |        +-----------------------+        |
|                      |   |      [ Again ] [ Hard ] [ Good ]        |
+----------------------+---+----------------------------------------+
```

### Settings (Theme pane) - Shortcuts is a separate sub-tab
```
+----------------------+---+----------------------------------------+
| PureDeck             | H | [Spanish][Settings][+]                  |
+----------------------+ A +----------------------------------------+
| Spanish              | N | Theme | Shortcuts                       |  <- sub-tab bar
| Capitals             | D +----------------------------------------+
| Verbs                | L | Theme                                   |
|                      | E | Choose the app appearance...            |
|                      |   | [ Light ][ Dark ][ System ]             |
+----------------------+---+----------------------------------------+
```

## 5. Data Model

No persisted domain entities. Application/UI state shapes only:

### Settings (persisted via `SettingsStore`)
| Field | Type | Description |
|-------|------|-------------|
| version | `1` | Schema version for future migration. |
| layouts | `Partial<Record<PanelGroupKey, PanelLayout>>` | Persisted panel sizes per group (`PanelGroupKey = "workspace"`). |
| sidebarCollapsed | `boolean` | Whether the sidebar panel is hidden. |
| openTabIds | `string[]` | Ordered ids of open tabs (deck ids + synthetic Settings/Study ids). |
| activeTabId | `string \| null` | Currently active tab. |
| theme | `{ mode: "light" \| "dark" \| "system" }` | Theme mode (no per-token overrides this round). |

### Workspace (session state, in `WorkspaceProvider` - not persisted beyond openTabIds/activeTabId)
| Field | Type | Description |
|-------|------|-------------|
| decks | `Deck[]` (scaffold) | Static demo decks: `{ id, name, cards: Card[] }`. |
| selectedDeckId | `string \| null` | Sidebar selection. |

Real `Card`/`Deck` persistence (see [glossary](../../glossary.md)) is a later feature; here they are static scaffold data typed to the glossary terms.

## 6. Edge Cases

| # | Case | Handling |
|---|------|----------|
| E-1 | Malformed/partial persisted settings | `mergeSettings(DEFAULT_SETTINGS, persisted)` coerces to a valid shape; unknown fields dropped, missing filled. |
| E-2 | Store `save` fails (disk/permission) | Error caught + logged; in-memory state stays authoritative; no crash. |
| E-3 | Close the active tab | Activate the nearest neighbour (right, else left); if none, `activeTabId = null` -> empty state. |
| E-4 | Reorder drag with no move (drop on self) | No-op; order unchanged. |
| E-5 | Sidebar dragged below min / above max | Clamped by `minSize`/`maxSize` on the panel. |
| E-6 | Collapse while a resize is mid-flight | Collapse wins; persisted layout is preserved and restored on expand. |
| E-7 | `matchMedia` unavailable (jsdom) | `getPrefersDark()` returns false; `system` resolves to light; no throw (tests stub matchMedia). |
| E-8 | Persisted `activeTabId` references a tab not in `openTabIds` | Falls back to the first open tab, else null. |
| E-9 | Empty deck list | Sidebar shows a muted "No decks yet"; opening is impossible until a deck exists (scaffold ships decks). |

## 7. Dependencies

New runtime deps (versions mirrored from `requi`):
- `react-resizable-panels` `^4.11.2` - the split engine (wrapped by `ui/resizable.tsx`).
- `@dnd-kit/core` `^6.3.1`, `@dnd-kit/sortable` `^10.0.0`, `@dnd-kit/utilities` `^3.2.2` - tab reorder.
- `@tauri-apps/plugin-store` `^2.4.3` (JS) + `tauri-plugin-store = "2"` (Rust) - persistence.
- `lucide-react` (already present) - icons (GraduationCap, X, Plus, GripVertical).

Rust: register `tauri_plugin_store::Builder` in `src-tauri/src/lib.rs`; add `store:default` to the window capability.

## 8. Out of Scope

- Real Card/Deck persistence, CRUD, import/export - later feature (this ships static scaffold data).
- Spaced-repetition / scheduling algorithm - Study is a static flip demo.
- Per-token theme color overrides + JSON editor (requi has these) - only mode switching here.
- Sidebar tree: nesting/folders, drag-reorder, rename, context menus - flat static click-to-open list only.
- Shortcut recording/rebinding - Shortcuts pane is a static read-only list.
- Env selector, bottom Console panel, request/response panes (requi HTTP-specific) - excluded.

## 9. Infrastructure Prerequisites

| Category | Requirement |
|----------|-------------|
| Environment variables | N/A |
| Registry images | N/A |
| Cloud quotas | N/A |
| Network reachability | npm registry (install new deps); crates.io (Rust plugin-store) |
| CI status | N/A |
| External secrets | N/A |
| Database migrations | N/A (settings `version` field reserved for future settings-shape migration) |

**Verification before implementation:** `npm install` of the new JS deps and a `cargo build` in `src-tauri/` after adding `tauri-plugin-store` both succeed locally (Rust toolchain already verified in bootstrap: rustc 1.97).

## 10. Revision History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-07-17 | Initial Layout shell spec; approved interactive wireframe; mirrors `requi` design system + workspace/settings/theme patterns. |
