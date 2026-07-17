# PureDeck

A keyboard-driven, file-based desktop flashcards app - an open alternative to Anki.

Built as a Tauri 2 desktop shell (Rust backend, native webview) with a React 19 + TypeScript frontend, the TanStack stack (Router/Query/Hotkeys), and shadcn/ui on Tailwind CSS v4. The UI is a requi-style workspace shell: a resizable, collapsible deck sidebar beside a tabbed content area (deck / study / settings), with a persisted theme (light/dark/system).

## Prerequisites

- **Node.js** - version pinned in [.nvmrc](.nvmrc) (24). This machine manages node via `mise`; run `mise use` or `eval "$(mise activate bash)"` before npm.
- **Rust** - stable toolchain (`rustc`/`cargo`), required by Tauri.
- **Tauri OS prerequisites** - platform build tools per the [Tauri 2 prerequisites guide](https://v2.tauri.app/start/prerequisites/) (on macOS: Xcode Command Line Tools).

## Setup

```bash
nvm use          # or: mise use
npm install
```

## Commands

| Command | Description |
| --- | --- |
| `npm start` | Launch the native desktop app (`tauri dev`). |
| `npm run dev` | Vite dev server only (browser, no native shell). |
| `npm run build` | Typecheck + build the frontend bundle. |
| `npm run tauri build` | Build the distributable desktop app. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run lint` | ESLint over the repo. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run format` | Prettier write over `src`/`tests`. |

## Repo layout

```
src/                    React app: main entry, router, routes, components, lib
src-tauri/              Tauri desktop shell (Rust backend, tauri.conf.json, commands)
tests/                  Vitest setup + smoke specs
public/                 static assets served by Vite
docs/                   spec/plan per feature, ADR, learnings, glossary
```
