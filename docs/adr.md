# Architectural Decisions - PureDeck

Append-only log of architectural and design decisions made during development.

## Format

Each entry follows this structure:

| Date | Decision | Rationale |
|------|----------|-----------|
| {YYYY-MM-DD} | {What was decided} | {Why this choice was made} |

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-17 | Desktop shell via Tauri 2 (not Electron) | Smaller bundle, native webview, Rust backend; core platform choice, expensive to swap. Mirrors the `requi` repo's proven stack. |
| 2026-07-17 | Adopt TanStack ecosystem (Router/Query/Table/Form/Hotkeys) | Single coherent stack; permeates the whole frontend architecture. Reuses the pattern validated in `requi`. |
| 2026-07-17 | Keybindings via `@tanstack/react-hotkeys` despite alpha status | Official TanStack lib chosen over stable alternatives; alpha = API-churn risk, isolated behind the command-palette component. |
| 2026-07-17 | Code-based TanStack Router routes (not file-based) | Fewer build plugins for a scaffold; revisit if the route tree grows. |
| 2026-07-17 | App shell drives content by in-app tabs, not routes: single `/` route + `WorkspaceContext` (Settings/Study/decks are tabs, `/settings` route removed) | Mirrors `requi`; enables multiple decks open at once + close/reorder. Reverses the bootstrap's route-per-page direction (supersedes the "revisit as the tree grows" note above) - costly to unwind once features hang off the tab model. |
| 2026-07-17 | Persist layout/theme via a pluggable `SettingsStore` port: `@tauri-apps/plugin-store` in-app, in-memory in dev/test (env-branched) | Deep seam with two real adapters; keeps dev-browser + jsdom deterministic and packaged app durable. Mirrors `requi`. |
| 2026-07-17 | Decks persist as one-file-per-deck on disk (`collections/<slug>.json`) behind a read-only `CollectionStore` port (`load` only, no `save`); demo decks seeded to disk once on first run | Plain hand-editable/back-up-able JSON, no hidden state; read-only mirrors `requi`'s workspace-config deferral (in-app CRUD is a later feature). Costly to unwind once decks live on disk. Uses `@tauri-apps/plugin-fs` because `LazyStore` can't enumerate a directory. |
| 2026-07-17 | Keyboard bindings behind a shortcut-action registry + pure resolver + `useActionHotkeys`; overrides persisted to a separate `keymap.json` store file | Registry is the single source of the action list; overrides are device-syncable on their own and kept out of settings.json. Single-binding (`actionId -> string`) not requi's multi-binding array - only 3 actions, widen later if needed. |
