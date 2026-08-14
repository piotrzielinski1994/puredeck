# puredeck

A keyboard-driven, file-based desktop flashcards app - an open alternative to Anki.

Built as a Tauri 2 desktop shell (Rust backend, native webview) with a React 19 + TypeScript
frontend, the TanStack stack (Router/Query/Hotkeys), and shadcn/ui on Tailwind CSS v4. The UI is a
requi-style workspace shell: a resizable, collapsible deck sidebar beside a tabbed content area
(deck / study / settings), with a persisted theme (light/dark/system, plus per-mode color
customization). Below a 768px viewport it switches to a touch-first mobile layout - a top bar with
a hamburger-opened deck drawer and a command-palette button - so it works on phones (Android/iOS),
not just desktop.

Desktop builds include an in-app auto-updater (Settings > Updates): on launch and via "Check for
updates" the app checks `puredeck/releases/latest` for a newer version, downloads the signed
update package and relaunches. The updater backend is desktop-only; mobile targets keep shipping
through the normal store/app releases.

## Prerequisites

- **Node.js** - version pinned in [mise.toml](mise.toml) (24). This machine manages node via `mise`; run `mise use` or `eval "$(mise activate bash)"` before npm.
- **Rust** - stable toolchain (`rustc`/`cargo`), required by Tauri.
- **Tauri OS prerequisites** - platform build tools per the [Tauri 2 prerequisites guide](https://v2.tauri.app/start/prerequisites/) (on macOS: Xcode Command Line Tools).

## Setup

```bash
mise install     # installs the pinned Node toolchain
npm install
```

## Commands

| Command | Description |
| --- | --- |
| `npm start` | Run the app in development (`tauri dev`). |
| `npm run tauri build` | Build the distributable desktop bundle. |

Building a release bundle with updater artifacts requires the signing keypair:
`TAURI_SIGNING_PRIVATE_KEY` (the private key string or `TAURI_SIGNING_PRIVATE_KEY_PATH`) and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The keypair lives in the private config dir
(`programs/tauri/puredeck.key` + `.pub`), and CI reads the key from the GitHub repo secrets
(`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).

## Where your data lives

All app state is JSON under the OS app-data dir:

- `settings.json` - layout, theme, app preferences.
- `keymap.json` - keyboard shortcut overrides (editable in Settings > Shortcuts).
- `collections/<deck-slug>.json` - one file per deck (id, name, cards). Read on launch; hand-editable.
- `review-state.json` - per-card SRS scheduling state.
- `review-log.json` - append-only grade history.

Cards and whole decks are managed in-app (add / edit / delete / rename / create); deleting a deck
removes its file. On desktop the deck folder is configurable in Settings > Storage (any path).
