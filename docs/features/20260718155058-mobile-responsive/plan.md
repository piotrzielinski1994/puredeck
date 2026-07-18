# Mobile-Responsive Shell - Plan

Coverage threshold: none (no vitest coverage gate configured).

Design gate verdict: pz-ddd N/A (no domain model/aggregates - pure UI/presentation), pz-archetypes N/A (no accounting/inventory/etc. shape), pz-codebase-design APPLIES (new hook + shell + context interfaces; run deletion test on each, keep seams shallow-justified).

## File Structure

| File | Kind | Responsibility |
| --- | --- | --- |
| `src/lib/responsive/use-is-mobile.ts` | Create | `useIsMobile()` - subscribe to `matchMedia("(max-width: 767px)")`, return boolean. |
| `src/lib/palette/palette-context.tsx` | Create | `PaletteProvider` + `usePalette()` - own `{ isOpen, setOpen }`. |
| `src/components/workspace/mobile-shell.tsx` | Create | Mobile top bar (hamburger, brand, palette btn) + `Main` + `Sidebar` drawer. |
| `src/components/workspace/workspace-layout.tsx` | Modify | Branch on `useIsMobile()`: desktop `ResizablePanelGroup` vs `MobileShell`. |
| `src/components/workspace/sidebar.tsx` | Modify | Optional `onNavigate?()` fired on deck pick; mobile touch min-height on rows. |
| `src/components/workspace/study-view.tsx` | Modify | Grade buttons `min-h-11` on mobile. |
| `src/routes/__root.tsx` | Modify | Wrap in `PaletteProvider`; `ShellPalette` reads context. |
| `tests/use-is-mobile.test.ts` | Create | TC-001..003. |
| `tests/mobile-shell.test.tsx` | Create | TC-004,005,008,009. |
| (existing) `tests/shell-router.test.tsx` | Keep green | TC-007 (Mod+K after lift). |
| (existing) `tests/layout-shell.test.tsx` | Keep green | TC-006 (desktop regression). |

## Tasks

### Task 1: `useIsMobile()` hook
**Files:** Create `src/lib/responsive/use-is-mobile.ts`; Test `tests/use-is-mobile.test.ts`.
**Interfaces:** Produces `useIsMobile(): boolean`. Consumes `window.matchMedia`.
- [ ] RED: TC-001..003.
- [ ] GREEN: `useState` seeded from `matchMedia().matches` (guard undefined -> false), `useEffect` subscribing to `change`, cleanup on unmount.

### Task 2: `PaletteContext`
**Files:** Create `src/lib/palette/palette-context.tsx`; Modify `src/routes/__root.tsx`.
**Interfaces:** Produces `PaletteProvider`, `usePalette(): { isOpen: boolean; setOpen: (open: boolean) => void }`. `ShellPalette` consumes it; `Mod+K` toggles `setOpen((o)=>!o)` -> expose toggle via `setOpen` + reading `isOpen`.
- [ ] RED: TC-007 (shell-router Mod+K stays green after refactor).
- [ ] GREEN: lift `isPaletteOpen` from `ShellPalette` into provider; wrap `Outlet`+`ShellPalette` in `PaletteProvider`.

### Task 3: `MobileShell`
**Files:** Create `src/components/workspace/mobile-shell.tsx`; Test `tests/mobile-shell.test.tsx`.
**Interfaces:** Consumes `Main`, `Sidebar` (with `onNavigate`), `usePalette`, radix `Dialog`. Produces `<MobileShell/>`.
- [ ] RED: TC-004,005,008.
- [ ] GREEN: top bar + `Main` (once) + drawer `Dialog` holding `Sidebar onNavigate={close}`; hamburger toggles local open-state; palette btn -> `usePalette().setOpen(true)`.

### Task 4: Wire branch + touch sizing
**Files:** Modify `workspace-layout.tsx`, `sidebar.tsx`, `study-view.tsx`; Test in `mobile-shell.test.tsx` (TC-009) + `layout-shell.test.tsx` regression (TC-006).
**Interfaces:** Consumes `useIsMobile`, `MobileShell`. `Sidebar` gains `onNavigate?: () => void`.
- [ ] RED: TC-006 (desktop still resizable), TC-009 (touch classes).
- [ ] GREEN: `WorkspaceLayout` branches on `useIsMobile()`; `Sidebar` fires `onNavigate` on pick + `min-h-11` mobile rows; grade buttons `min-h-11` mobile.

## Approach & key decisions

- JS media hook not pure CSS - `ResizablePanelGroup` can't morph to a drawer via CSS without double-mounting content (double hotkey / duplicate study state). One tree per branch.
- Drawer = styled `@radix-ui/react-dialog` left slide-over (dep present, no new UI-kit file needed beyond inline use).
- Palette state lifted to context so `Mod+K` and the mobile button share one dialog.
- Desktop branch untouched -> existing tests green with the global `matches:false` stub.

## Edge cases (from spec)

- `matchMedia` absent -> false (guard).
- Resize crossing breakpoint -> branch swap, transient state reset (acceptable).
- Drawer open + resize to desktop -> desktop ignores drawer state.

## Tests

One test per AC minimum + edge/guard TCs listed above. Mobile tests locally re-stub `matchMedia` to `matches:true` (theme.test pattern); desktop tests rely on the global `matches:false` stub. Stress: full suite >=20x + touched isolated >=15x before any merge (async-load flake class per learnings).

## AC traceability

| AC | Test | File |
| --- | --- | --- |
| AC-001 | MobileShell drawer (3 tests, TC-004) | tests/mobile-shell.test.tsx |
| AC-002 | palette button opens shared palette (TC-005) | tests/mobile-shell.test.tsx |
| AC-003 | desktop resizable + separator (TC-006) | tests/layout-shell.test.tsx |
| AC-004 | tab strip overflow-x-auto (TC-011) | tests/mobile-shell.test.tsx |
| AC-005 | sidebar rows + grade btns + top-bar btns min-h-11 (TC-009, TC-010) | tests/mobile-shell.test.tsx |
| AC-006 | single Main mount (TC-008) | tests/mobile-shell.test.tsx |
| AC-007 | useIsMobile true/false/reactive/guard (TC-001..003) | tests/use-is-mobile.test.ts |

## Status

Implemented + verified. Full suite 103 pass, typecheck + lint clean. Stress: full 20/20, isolated 15/15, zero flakes. NOT committed (awaiting user approval per CLAUDE.local).
