# puredeck

Briefing for Claude Code. Read [README.md](README.md) first - setup, commands, repo layout. This file lists conventions and the non-obvious bits not visible from reading individual files.

## Platform targets (mobile is a first-class target)

puredeck must be usable on mobile - **especially Android** - not just desktop. Tauri 2 supports mobile targets, so treat phone/tablet as a shipping platform, not an afterthought:

- **Responsive by default.** Every layout must degrade gracefully to a narrow, touch-first viewport. The requi-style resizable sidebar-beside-content shell assumes a wide screen and a pointer; on a phone it must collapse to a single-column, stack/drawer, or tab-switched layout. Never ship a screen that only works at desktop widths.
- **Touch-first interaction.** Hit targets must be finger-sized; do not rely on hover, right-click, or a physical keyboard for any core action. Every keyboard shortcut needs an on-screen affordance (button/menu) that reaches the same action, since a phone has no `Mod+K`.
- **No desktop-only assumptions.** Features that lean on the filesystem (e.g. the `collections/` directory, hand-editing JSON), a menu bar, window chrome, or multi-window must have a mobile-viable path or degrade cleanly. Check the Android/iOS story before wiring a desktop-only API.
- When building or reviewing any UI, verify it works at a phone breakpoint (~360-400px wide) with touch, not only in the desktop webview.

## Communication

- Keep replies short and to the point. No filler, no pleasantries, no recap of what the user just said.
- Status updates fit in one or two sentences.

## Running the app

- Always shut the app down when finished - never leave it running in the background.
- `TaskStop` (or killing `npm start`) only stops the `npm`/`tauri dev`/`vite` node procs; the spawned native `target/debug/puredeck` window keeps running detached. Kill all: `pkill -f "target/debug/puredeck"` AND `pkill -f "node_modules/.bin/tauri"` AND `pkill -f "puredeck/node_modules/.bin/vite"`, then confirm with `pgrep -fl "tauri dev|target/debug/puredeck"`.

## Learning from conversation

If during a session you learn something project-specific that future-you would otherwise have to re-derive - a non-obvious convention the user prefers, a constraint that bit us, a gotcha worth recording - append it to [docs/learnings.md](docs/learnings.md). Examples: formatting rules the user repeated, gotchas that broke a hook/CI, naming conventions enforced via review.

For architectural trade-offs (significant, costly-to-reverse, or contested choices) use [docs/adr.md](docs/adr.md) instead - that's a separate log.

Don't add: one-off task context, debugging notes, things obvious from the code itself, or anything that would fit better in [README.md](README.md). Don't ask permission for small additions - just keep the file tight and the diff visible in the next commit.

## Features

- Each feature lives in its own folder: `docs/features/<timestamp>-<slug>/`.
  - `<timestamp>` = `YYYYMMDDHHMMSS` (creation time). `<slug>` = short kebab-case name.
  - Example: `docs/features/20260717015300-bootstrap/`.
- Every feature folder holds two files:
  - `spec.md` - what + why. Follows the spec template structure (overview, acceptance criteria, user test cases, data model, edge cases, dependencies).
  - `plan.md` - how. Follows the plan template structure (task breakdown, execution order, file changes, acceptance verification).
- Adding a new feature:
  1. Create the folder with current timestamp + slug.
  2. Write `spec.md` first. Get it approved before planning.
  3. Write `plan.md` from the approved spec.
  4. Log any significant choices made while specing to [docs/adr.md](docs/adr.md).
- Branch naming: when working on a feature (not a quick fix), the branch name must match the feature's folder name under `docs/features/` exactly (e.g. folder `20260618223203-layout` -> branch `20260618223203-layout`). Quick fixes are exempt.

## Architectural Decisions

- Log only significant, costly-to-reverse or contested decisions to [docs/adr.md](docs/adr.md).
- Significant = changes architecture/data model, hard to undo later, or had real alternatives debated. NOT routine config (script aliases, package manager, default lib options).

## Before committing

- Check whether the change makes README.md or CLAUDE.md drift:
  - New script / removed dependency / renamed module -> update README.
  - New convention or gotcha that future-you would miss -> add to CLAUDE.md (or docs/learnings.md).
  - Removed feature or file referenced in either doc -> remove the reference.
- No duplicates between README.md and CLAUDE.md. Each fact lives in exactly one place:
  - README.md = onboarding facts a human needs to run the app: install steps, commands, repo layout sketch.
  - CLAUDE.md = working rules for an agent editing this repo: conventions, gotchas, "how to add a feature", invariants.
  - If a fact would fit both, put it in CLAUDE.md and link from README only if a human reader needs the pointer.
- If neither doc needs to change, say so explicitly in the pre-commit summary so it's a deliberate decision, not an oversight.

## TDD

Write code red-green-refactor:

1. Red - add a failing test that pins the behaviour you want. Run the relevant suite and confirm it fails for the right reason (not a typo, not a missing import).
2. Green - write the smallest production change that makes it pass. No speculative branches, no helper extraction yet.
3. Refactor - once green, clean up names, extract duplication, tighten types. Tests stay green throughout.

Two test layers, pick the one that owns the behaviour:
- Frontend (React/TS) -> `npm test` (Vitest).
- Rust backend / Tauri commands -> `cargo test` in `src-tauri/`.

Don't skip red. A test that's never seen failing is a test you can't trust. Don't refactor on red - get to green first, then improve.
