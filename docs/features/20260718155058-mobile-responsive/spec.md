# Mobile-Responsive Shell - Spec

Source design: [.pzielinski/specs/2026-07-18-mobile-responsive-design.md](../../../.pzielinski/specs/2026-07-18-mobile-responsive-design.md)

## Overview

The workspace shell is desktop-only: a drag-resizable deck sidebar beside a tabbed content area, driven by pointer + `Mod+B`/`Mod+K`. CLAUDE.md makes mobile (especially Android) a first-class target. This feature makes the shell usable at a phone breakpoint (~360-400px) with touch: sidebar collapses to a hamburger-opened drawer, the tab strip scrolls horizontally, keyboard-only actions gain on-screen buttons, and hit targets are finger-sized. Desktop is unchanged.

## Acceptance Criteria

- AC-001: At viewport `<768px`, the deck sidebar is not inline; a hamburger button opens it as a drawer overlay. Tapping a deck opens it and closes the drawer.
- AC-002: At `<768px`, a visible button opens the command palette (no keyboard).
- AC-003: At `>=768px`, the shell is the current resizable sidebar + tabbed content; drag-resize and persisted width unchanged.
- AC-004: The tab strip scrolls horizontally when tabs overflow at narrow width.
- AC-005: On mobile, sidebar deck rows, study grade buttons, and the hamburger/palette buttons have >=44px touch targets.
- AC-006: Content (`Main`/`ActiveSurface`) and its hotkeys mount exactly once - never double-registered - in either mode.
- AC-007: `useIsMobile()` reflects the media query, reacts to viewport crossing 768px, and returns `false` when `matchMedia` is absent.

## Test Cases

- TC-001 (happy, AC-007): mock `matchMedia` matches=true -> hook returns true; matches=false -> false.
- TC-002 (reactive, AC-007): fire media `change` event -> hook re-renders with new value.
- TC-003 (guard, AC-007): `window.matchMedia` undefined -> hook returns false, no throw.
- TC-004 (happy, AC-001): mobile viewport -> hamburger visible, sidebar not inline; click hamburger -> deck list shown; click deck -> drawer closed + deck tab open.
- TC-005 (happy, AC-002): mobile viewport -> palette button visible; click -> command palette opens.
- TC-006 (regression, AC-003): desktop viewport -> `ResizablePanelGroup` + resize separator present.
- TC-007 (regression, AC-006 / AC-002): `Mod+K` still opens the palette after state is lifted to context (shell-router test stays green).
- TC-008 (guard, AC-006): in mobile mode, the `flip-card`/`toggle-sidebar` hotkey action registers once (no duplicate Main mount).
- TC-009 (edge, AC-005): mobile sidebar rows / grade buttons carry the min-height touch class.

## UI States

| State | Behavior |
| --- | --- |
| Desktop (`>=768px`) | Current `ResizablePanelGroup`; drawer + top bar absent. |
| Mobile (`<768px`) | Top bar (hamburger, brand, palette button) over `Main`; sidebar in a closed drawer. |
| Drawer open | Left slide-over overlays content with the deck list; scrim behind. |
| Empty decks | Drawer shows existing "No decks yet" copy. |

## Data Model

No persisted-data change. `useIsMobile()` derives from `matchMedia`; palette open-state moves from `ShellPalette` local state to a root `PaletteContext` (in-memory only).

## Edge Cases

- Resize crossing 768px mid-session -> branch swaps; transient view state (study index) resets (acceptable; branches never co-mounted).
- Drawer open then resize to desktop -> desktop branch ignores drawer state; next mobile entry starts closed.
- `matchMedia` absent -> desktop default, no throw.

## Dependencies

- Existing: `@radix-ui/react-dialog` (drawer), `@tanstack/react-hotkeys`, Tailwind v4. No new dependency.
