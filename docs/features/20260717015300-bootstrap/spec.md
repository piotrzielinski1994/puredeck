# Spec: Bootstrap - Tauri + React + TanStack Scaffold

**Version:** 0.1.0
**Created:** 2026-07-17
**Status:** Draft

## 1. Overview

Stand up an empty, runnable desktop application that will become an Anki alternative (a
file-based flashcards app). This feature delivers **scaffold only** - no study/spaced-repetition
features yet. The goal is a clean, conventionally-structured project that future features can
build on without re-litigating tooling choices. Layout and tooling mirror the `requi` repo.

Stack:
- **Tauri 2.x** - desktop shell (Rust backend, webview frontend)
- **React 19 + TypeScript** - UI
- **Vite** - frontend build/dev server
- **TanStack Router** - routing (code-based)
- **TanStack Query** - async/server state
- **TanStack Table** - data grids
- **TanStack Form** - forms
- **TanStack Hotkeys** (`@tanstack/react-hotkeys`, alpha) - keybindings
- **shadcn/ui + Tailwind CSS v4** - components + styling
- **npm** - package manager

### User Story

As a developer on this project, I want a runnable Tauri + React + TanStack scaffold with
routing, query, table, form, keybindings, and a design system wired up, so that future
flashcard features start from a consistent foundation instead of boilerplate setup.

## 2. Acceptance Criteria

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-001 | `npm install` succeeds from a clean checkout with no peer-dependency errors | Must |
| AC-002 | `npm start` (alias for `tauri dev`) launches a native desktop window rendering the React app | Must |
| AC-003 | TanStack Router serves at least 2 routes (`/` home, `/settings`) with a shared layout and working in-app navigation | Must |
| AC-004 | TanStack Query is provided app-wide via `QueryClientProvider`; a demo query invoking a Tauri command resolves and renders | Must |
| AC-005 | A demo TanStack Table renders static rows (placeholder deck/card list) | Must |
| AC-006 | A demo TanStack Form renders with one validated field and a submit handler (add-card placeholder) | Must |
| AC-007 | A global keybinding (`Mod+K`) is registered via TanStack Hotkeys (`useHotkey`) and triggers a visible action | Must |
| AC-008 | shadcn/ui is initialized; at least one shadcn component (Button) renders styled via Tailwind | Must |
| AC-009 | `npm run build` (frontend) and `npm run tauri build` produce a bundle without errors | Should |
| AC-010 | Lint + typecheck pass: `npm run lint` and `npm run typecheck` exit 0 | Should |
| AC-011 | A Tauri command `greet(name)` exists in Rust and is callable from the frontend (proves IPC) | Should |

## 3. User Test Cases

### TC-001 (happy path): App launches and renders home route

**Precondition:** Clean checkout, `npm install` done, Rust toolchain installed.
**Steps:** Run `npm start`; wait for the native window; observe the home route.
**Expected:** Window opens, home page renders a heading and a shadcn Button. No console errors.
**Maps to:** AC-002, AC-008.

### TC-002 (happy path): Navigation between routes works

**Precondition:** App running on home route.
**Steps:** Click the "Settings" nav link; observe the route change; navigate back to home.
**Expected:** Route changes to `/settings`, settings content renders, back returns to `/`.
**Maps to:** AC-003.

### TC-003 (happy path): Tauri IPC demo query resolves

**Precondition:** App running.
**Steps:** On the home route, observe the greeting block backed by a TanStack Query calling the `greet` Tauri command.
**Expected:** Greeting text from the Rust backend renders (proves IPC + Query wiring).
**Maps to:** AC-004, AC-011.

### TC-004 (happy path): Global keybinding fires

**Precondition:** App running on any route.
**Steps:** Press `Cmd+K` (macOS) / `Ctrl+K` (Win/Linux).
**Expected:** A placeholder command-palette dialog toggles open.
**Maps to:** AC-007.

### TC-005: Demo table renders placeholder rows

**Precondition:** App running on the home route.
**Steps:** Observe the demo table.
**Expected:** Static deck/card rows render; an empty-state row shows when given no rows.
**Maps to:** AC-005.

### TC-006: Demo form validates + submits

**Precondition:** App running on the home route.
**Steps:** Submit the add-card form empty, then with a value.
**Expected:** Empty submit shows a validation message; valid submit calls the handler.
**Maps to:** AC-006.

## 4. UI States

| State | Behavior |
| ----- | -------- |
| Loading | Query demo shows a "Loading..." placeholder while the command resolves. |
| Empty | Demo table shows an "empty" row state when given no rows. |
| Error | Query error renders an inline error message (no crash). |
| Success | Greeting + table + form render normally. |

### Layout

- Root layout: top nav (Home, Settings) + content outlet.
- Command palette: hidden dialog toggled by the global hotkey.

## 5. Data Model

No domain entities in this feature. Only placeholder/demo shapes:

### DemoCardRow (placeholder for a future card list)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Row id |
| deck | string | Yes | Deck name placeholder |
| front | string | Yes | Card front (prompt) |
| back | string | Yes | Card back (answer) |

Real data model (Card, Deck - see [glossary](../../glossary.md)) arrives with future features.

## 6. Edge Cases

| # | Case | Handling |
|---|------|----------|
| E-1 | Rust toolchain missing | `npm start` fails fast with a clear message (documented in README). |
| E-2 | Unknown route navigated | Router renders a 404 / not-found route. |
| E-3 | `greet` command rejects | Query enters error state, inline message shown, app stays alive. |
| E-4 | Demo table given no rows | Renders an empty-state row, not a blank grid. |
| E-5 | Add-card form submitted empty | Field validation blocks submit, shows a message. |

## 7. Dependencies

- Node.js (version pinned via `.nvmrc`), Rust stable toolchain + platform Tauri prerequisites, npm.
- New libs: Tauri 2, React 19, Vite, `@tanstack/react-router`/`react-query`/`react-table`/`react-form`/`react-hotkeys`, shadcn/ui, Tailwind v4, Vitest + Testing Library.

## 8. Out of Scope

- Any real flashcard feature (decks, cards, review/spaced-repetition, persistence, import/export).
- CI (added in a later feature).
- E2E tests (Vitest + RTL only this round).

## 9. Infrastructure Prerequisites

| Category | Requirement |
|----------|-------------|
| Environment variables | N/A |
| Registry images | N/A |
| Cloud quotas | N/A |
| Network reachability | npm registry reachable for install |
| CI status | N/A (CI added in a later feature) |
| External secrets | N/A |
| Database migrations | N/A |

**Verification before implementation:** Confirm Rust toolchain (`rustc --version`), Node via `mise`/`nvm use`, and Tauri OS prerequisites are installed before running `tauri dev`. (Verified 2026-07-17: node 24.18, rust 1.97, Xcode CLT present.)

## 10. Revision History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-07-17 | Initial scaffold spec, adapted from the `requi` bootstrap. |
