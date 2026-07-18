# F2 - Plan (how)

Spec: [spec.md](spec.md) | Task file: [.pzielinski/F2/F2.md](../../../.pzielinski/F2/F2.md)

## Approach

Pure core + thin IO adapters + one context method:

- **Scheduler** (`src/lib/study/scheduler.ts`) - deep pure module. `schedule(state, grade,
  today) -> state'` hides all SM-2 math behind a 1-function interface. No seam (nothing
  varies inside). Time injected via `today` for determinism.
- **Queue** (`src/lib/study/queue.ts`) - pure `buildStudyQueue(deck, reviews, today)` +
  `isDue` + `todayIso()`.
- **ReviewStore** (`review-store.ts` + 2 adapters + factory) - real seam, mirrors the
  SettingsStore trio and the keymap.json-separate-from-settings.json pattern. Persists a
  `ReviewMap` keyed by card id to `review-state.json`.
- **Wiring** - workspace context loads `reviews` alongside decks and exposes
  `gradeCard(cardId, grade)`; StudyView builds a session queue of due cards, reschedules on
  grade, requeues on Again, and shows "All caught up" when empty.

## File Structure

| File | Create/Modify | Responsibility |
| ---- | ------------- | -------------- |
| `src/lib/study/scheduler.ts` | Create | Pure SM-2 `schedule` + `defaultReview` + `Grade`/`CardReview`/`ReviewMap` types + constants |
| `src/lib/study/queue.ts` | Create | Pure `buildStudyQueue` + `isDue` + `todayIso` |
| `src/lib/study/review-store.ts` | Create | `ReviewStore` port + `mergeReviews` validation |
| `src/lib/study/in-memory-review-store.ts` | Create | In-memory adapter |
| `src/lib/study/tauri-review-store.ts` | Create | `LazyStore("review-state.json")` adapter |
| `src/lib/study/review-store-factory.ts` | Create | `isTauri()` env-branch factory |
| `src/components/workspace/workspace-context.tsx` | Modify | Load `reviews`; expose `reviews` + `gradeCard` |
| `src/components/workspace/study-view.tsx` | Modify | Due-queue session; completion state; grade wiring; requeue |
| `src/components/workspace/main.tsx` | Modify | Pass `reviews` + `gradeCard` into StudyView |
| `tests/scheduler.test.ts` | Create | TC-001..006 |
| `tests/study-queue.test.ts` | Create | TC-007/008 |
| `tests/review-store.test.ts` | Create | TC-011/012 |
| `tests/study-view.test.tsx` | Modify | TC-009/010 + rework existing to due-queue model |
| context grade test | Create/extend | TC-013 |

## Execution Order (TDD, one commit per task/AC)

1. **Task 1 - scheduler** (TC-001..006) -> `feat(F2): AC-001/002/003 SM-2 scheduler`
2. **Task 2 - queue** (TC-007/008) -> `feat(F2): AC-005 due-card study queue`
3. **Task 3 - ReviewStore** (TC-011/012) -> `feat(F2): AC-004/008 ReviewStore port + adapters`
4. **Task 4 - context wiring** (TC-013) -> `feat(F2): AC-004 gradeCard in workspace context`
5. **Task 5 - StudyView** (TC-009/010) -> `feat(F2): AC-005/006/007 study queue + completion`

Each task: test-writer subagent writes RED -> main writes GREEN -> refactor -> commit.

## Acceptance Verification

- AC-001/002/003 -> tests/scheduler.test.ts (TC-001..006)
- AC-005 -> tests/study-queue.test.ts (TC-007/008) + StudyView due render
- AC-004/008 -> tests/review-store.test.ts (TC-011/012) + context test (TC-013)
- AC-006/007 -> tests/study-view.test.tsx (TC-009/010)

Final gate: fresh verifier subagent runs lint + typecheck + full `npm test`, maps each AC to
a non-tautological test, probes edge cases E-1..E-7.

## Out of Scope (deferred)

- Sub-minute Anki learning steps / intra-session timers (day-granularity only).
- Session progress stats beyond "all caught up" (F5).
- Pruning orphan review entries after card delete (tolerated, not pruned).
