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
