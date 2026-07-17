# Learnings

Project-specific conventions, gotchas, and constraints worth recording so future-you (human or agent) doesn't re-derive them. Append-only. For architectural trade-offs use [adr.md](adr.md) instead.

## Entries

<!-- Format: one bullet per learning. Date prefix optional. -->

- `nvm` on this machine is shimmed to `mise`; node is managed by mise (`.nvmrc` pins 24). In non-interactive bash, activate first: `eval "$(mise activate bash)"` then `mise exec -- <cmd>` to get node 24.
- TanStack Hotkeys split: `@tanstack/hotkeys` is the framework-agnostic core (no React hook). The React `useHotkey`/`useHotkeys` + `HotkeysProvider` live in `@tanstack/react-hotkeys`. Install the adapter, not the core.
- Hotkey strings are case-sensitive in the typed union: use uppercase keys, e.g. `"Mod+K"` not `"Mod+k"`.
- Under jsdom the hotkeys lib resolves `Mod` to `Control` (test platform reports non-mac), so hotkey tests fire `{Control>}k{/Control}`, not Meta.
- `npm create tauri-app` can't target a non-empty dir: scaffold in a temp dir, then copy `src-tauri/` + vite/ts configs + `index.html` in, then rewrite identity (Cargo `name`, `tauri.conf.json` productName/identifier, `main.rs` `_lib` ref).
- jsdom has no `ResizeObserver`, no `Element.prototype.scrollIntoView`, and no `window.matchMedia`; radix + cmdk need them. No-op stubs live in `tests/setup.ts`.
- Under jsdom `@tanstack/react-hotkeys` `detectPlatform()` resolves to non-mac, so `Mod` maps to `Control`. Test the `Mod+K` palette by firing `fireEvent.keyDown(document, { key: "k", code: "KeyK", ctrlKey: true })` - the real global-hotkey path (HotkeysProvider -> useHotkey) opens the palette in jsdom, no fallback needed.
- The Vite dev port is 1433 (not the tauri-template default 1420) in BOTH `vite.config.ts` `server.port` and `tauri.conf.json` `build.devUrl` - they must match or the Tauri webview loads a blank page.
- `@tanstack/react-hotkeys` `useHotkey` degrades gracefully WITHOUT a `HotkeysProvider` (`useDefaultHotkeysOptions` is `useContext(...)?.defaultOptions ?? {}`), so components using it (e.g. StudyView `Space`, Main `Mod+B`) are unit-mountable in isolation - no provider wrapper needed in their tests.
- TDD ordering with subagents: spawn the RED test-writer subagent and let it finish (confirm red) BEFORE writing the production code. Running them in parallel means the tests never see red in the working tree - the writer finds the modules already present and has to reconstruct red in a throwaway worktree, which defeats the gate.
- Persistence store is env-branched via `isTauri()` from `@tauri-apps/plugin-store`-adjacent `@tauri-apps/api/core`: `createSettingsStore()` returns the `plugin-store` adapter in the native app and an in-memory one everywhere else (dev-browser + jsdom tests), mirroring requi. Tests that need Tauri absent can `vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), isTauri: () => false }))`.
