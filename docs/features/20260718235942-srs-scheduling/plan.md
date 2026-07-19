# F2 - Plan (how) - FSRS-6

Spec: [spec.md](spec.md) | Task file: [.pzielinski/F2/F2.md](../../../.pzielinski/F2/F2.md)

> Supersedes the SM-2 plan. Deletes `scheduler.ts` (SM-2), replaces the scheduler core with a
> thin `ts-fsrs` wrapper, adds a revlog store, widens grades to 4, moves due to datetime.

## Approach

`ts-fsrs` owns the algorithm; the repo owns thin, testable seams around it:

- **fsrs wrapper** (`src/lib/study/fsrs.ts`) - constructs the FSRS-6 scheduler once with our
  params (default_w, retention 0.9, max 36500, fuzz on + seeded, short-term on) and exposes
  `createScheduler()`, `gradeReview(scheduler, card, rating, now) -> { card, log }`,
  `newCard(now)`, plus the `Rating`/`Card`/`ReviewLog` re-exports. Deep, small interface over
  the library; the one place library types touch the app.
- **queue** (`src/lib/study/queue.ts`) - pure `buildStudyQueue(deck, reviews, now)` +
  `isDue(card, now)` at datetime granularity + `nowDate()` helper.
- **review-store** (state) + **revlog-store** (history) - two ports, each with in-memory +
  tauri LazyStore adapters + factory, mirroring the settings-store trio. `mergeReviews`
  revives ISO->Date and validates; `mergeRevlog` validates the history array.
- **wiring** - workspace context loads `reviews`, exposes `gradeCard(cardId, rating)` that
  runs `gradeReview`, updates state, appends a revlog entry, and persists both. StudyView
  renders 4 buttons, builds the due session queue, requeues same-day cards, shows completion.

## File Structure

| File | C/M/D | Responsibility |
| ---- | ----- | -------------- |
| `package.json` | Modify | add `ts-fsrs` dependency |
| `src/lib/study/scheduler.ts` | **Delete** | SM-2 core removed (superseded) |
| `src/lib/study/fsrs.ts` | Create | FSRS-6 scheduler factory + `gradeReview` + `newCard` + type re-exports |
| `src/lib/study/queue.ts` | Modify | datetime `isDue` + `buildStudyQueue` + `nowDate` (was ISO-date) |
| `src/lib/study/review-store.ts` | Modify | `ReviewMap = Record<string,Card>`; `mergeReviews` revives Date + validates |
| `src/lib/study/in-memory-review-store.ts` | Modify | unchanged shape, new `ReviewMap` type |
| `src/lib/study/tauri-review-store.ts` | Modify | serialize/rev ive via `mergeReviews` |
| `src/lib/study/revlog-store.ts` | Create | `RevlogStore` port + `RevlogEntry`/`Revlog` types + `mergeRevlog` |
| `src/lib/study/in-memory-revlog-store.ts` | Create | in-memory adapter |
| `src/lib/study/tauri-revlog-store.ts` | Create | LazyStore `review-log.json` adapter |
| `src/lib/study/revlog-store-factory.ts` | Create | `isTauri()` env-branch |
| `src/lib/study/review-store-factory.ts` | Keep | unchanged |
| `src/components/workspace/workspace-context.tsx` | Modify | load reviews; `gradeCard` -> schedule + state + revlog persist |
| `src/components/workspace/study-view.tsx` | Modify | 4 buttons; datetime due-queue; same-day requeue; completion |
| `src/components/workspace/main.tsx` | Modify | pass reviews + gradeCard |
| tests | C/M | fsrs.test.ts, review-store/revlog-store, study-queue, study-view, workspace-grade |

## Execution Order (TDD, one commit per task)

1. **Task 0 - dep + delete SM-2**: add ts-fsrs, delete scheduler.ts + its tests -> folded into Task 1.
2. **Task 1 - fsrs wrapper** (TC-001/002/003) -> `feat(F2): AC-001/002/003 FSRS-6 scheduler via ts-fsrs`
3. **Task 2 - queue datetime** (TC-008/009) -> `feat(F2): AC-006 datetime due-queue`
4. **Task 3 - review-store (FSRS Card) + revlog-store** (TC-004..007) -> `feat(F2): AC-004/005 FSRS state + revlog stores`
5. **Task 4 - context wiring** (TC-013) -> `feat(F2): AC-004/005 gradeCard schedules + persists state + revlog`
6. **Task 5 - StudyView 4 buttons + completion + requeue** (TC-010/011/012) -> `feat(F2): AC-007/008 study 4-grade queue + completion`

Each task: test-writer subagent RED -> main GREEN -> refactor -> commit.

## Acceptance Verification

- AC-001/002/003 -> tests/fsrs.test.ts (uses seeded scheduler; ts-fsrs is exercised, not mocked)
- AC-004 -> tests/review-store.test.ts (round-trip + mergeReviews)
- AC-005 -> tests/revlog-store.test.ts (append + mergeRevlog)
- AC-006 -> tests/study-queue.test.ts
- AC-007/008 -> tests/study-view.test.tsx
- AC-004/005 wiring -> tests/workspace-grade.test.tsx

Final gate: fresh verifier runs lint + typecheck + full `npm test`; maps each AC to a
non-tautological test; probes E-1..E-8; confirms determinism (run scheduling twice).

## Out of Scope (deferred)

- FSRS parameter optimizer (train weights from revlog) - default weights only; revlog stored
  for a future optimizer (F5+).
- Deck-level FSRS settings UI (per-deck retention/steps) - global defaults for now.
- Migrating existing SM-2 `review-state.json` data - SM-2 was never merged/shipped, no
  migration needed; any dev-local file is discarded by `mergeReviews` validation.

## Risks

- ts-fsrs Date fields must round-trip through JSON: persist ISO, revive via `mergeReviews`
  (TypeConvert-style) on load; a raw JSON.parse leaves strings and breaks `.next()`.
- Seeded fuzz determinism depends on the card-id seed strategy being set on the scheduler;
  a missing seed -> non-deterministic tests. Set it in `createScheduler()`, assert in TC-003.
- ts-fsrs semver (5.4.1) != algorithm version (FSRS-6): pin the dependency; note in ADR.
