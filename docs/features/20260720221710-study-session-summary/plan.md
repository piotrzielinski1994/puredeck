# F5 - Plan (how) - study session progress + completion summary

Spec: [spec.md](spec.md) | Feature folder: `docs/features/20260720221710-study-session-summary/`

> Frontend-only. Builds entirely inside the existing `StudyView` (F2). No store, no Rust, no new
> prop, no scheduling change. Adds ephemeral session-scoped grade tallies + two render changes:
> the progress readout (active) and the completion summary (done).

## Approach

Track session stats as ephemeral React state inside `StudyView`, incremented on the exact event
that already calls `onGrade`. Two render sites consume it:

- **Progress readout** - replaces the `{queue.length} due` line at the top of the active-session
  view with reviewed + remaining counts.
- **Completion summary** - the current "All caught up" block branches on `reviewed > 0`: with
  reviews it renders the summary card (reviewed total, per-rating breakdown, accuracy); with zero
  reviews it keeps the existing plain "All caught up / No cards due for review." message.

Stats are pure-derivable from the tally, so accuracy is computed inline (no new module). The
tally shape is a small `Record<Grade, number>` seeded to all-zero; `reviewed` is its sum but
kept as an explicit counter for clarity. Reset happens for free: `StudyView` is keyed by
`deck.id` in `main.tsx`, so a new deck = fresh mount = zeroed stats (E-5).

### Design gate verdict

Evaluated pz-ddd, pz-archetypes, pz-codebase-design - **none applies**. No domain model / no
consistency boundary (ephemeral UI counter), no recurring domain archetype (not
accounting/inventory/etc.), no new module interface or seam (stats live inside one existing
component, derived from an event already handled). Recorded in Decision Log.

## File Structure

| File | C/M/D | Responsibility |
| ---- | ----- | -------------- |
| `src/components/workspace/study-view.tsx` | Modify | add session-stats state; increment in `grade()`; render progress readout (active) + summary card (done) |
| `tests/study-view.test.tsx` | Modify | add F5 progress + summary + accuracy + summary-only-after-work cases |

No other files change. `main.tsx`, workspace context, stores, `queue.ts`, `fsrs.ts` untouched.

## Task breakdown

### Task 1: Session stats state + progress readout + completion summary

**Files:** Modify `src/components/workspace/study-view.tsx`; Test `tests/study-view.test.tsx`.

**Interfaces:**
- Consumes: existing `StudyView` props (`deck`, `reviews`, `onGrade`, `now`), `Grade`/`Rating`
  from `@/lib/study/fsrs`. No new prop.
- Produces: no exported symbol change - `StudyView`'s signature is unchanged (AC-006). All new
  state is internal.

Internal shape:
```ts
type Tally = Record<Grade, number>;
const ZERO_TALLY: Tally = { [Rating.Again]: 0, [Rating.Hard]: 0, [Rating.Good]: 0, [Rating.Easy]: 0 };
// state: const [tally, setTally] = useState<Tally>(ZERO_TALLY);
// reviewed = tally sum; accuracy = reviewed === 0 ? 0 : Math.round(((reviewed - tally[Rating.Again]) / reviewed) * 100)
```

Increment site: inside existing `grade(value)`, alongside the `onGrade` call, bump
`tally[value]`. Render branches:
- active (`card` present): progress readout showing reviewed + remaining (`queue.length`).
- done (`!card`): `reviewed > 0` -> summary card; else existing plain message.

- [ ] Write failing tests (progress-at-start, progress-advances, breakdown, requeue-counts-twice,
      accuracy, summary-only-after-work, empty-deck-unchanged, completion-shows-summary)
- [ ] Run, confirm RED for the right reason
- [ ] Add stats state + increment + two render changes (minimal)
- [ ] Run, confirm GREEN + full suite green
- [ ] Refactor (extract summary/readout blocks only if it reads better; no premature helpers)
- [ ] Commit (`feat(F5): AC-001..006 study session progress + completion summary`)

## Cross-cutting notes

- **Edge cases** (from spec): E-1 guard summary on `reviewed > 0` not queue-empty; E-2 requeue
  counts each grade; E-3 accuracy divide-by-zero guarded; E-4 all-Again -> 0%; E-5 remount
  resets (keyed by deck.id); E-6 single card -> reviewed 1, summary shown.
- **Tests** (one per AC min + edge TCs): TC-001..008 from spec map onto the 8 test cases above.
- **No comments** in code (repo rule). **No `any`** - `Grade` is the ts-fsrs union `1|2|3|4`.

## Acceptance Verification

- AC-001 (progress readout) -> TC-001, TC-002
- AC-002 (rating tally) -> TC-003, TC-004
- AC-003 (summary reviewed + breakdown + accuracy) -> TC-003, TC-004, TC-005, TC-008
- AC-004 (no summary at mount, 0 grades) -> TC-006
- AC-005 (empty deck unchanged) -> TC-007
- AC-006 (no new prop / no persistence / no scheduling change) -> unchanged `StudyView` signature
  + existing F2 tests (requeue/drop/completion) stay green

Final gate: fresh verifier runs lint + typecheck + full `npm test`; maps each AC to a
non-tautological test; drives the running app to confirm the readout + summary render (visual
change - not className-only) at desktop and ~375px mobile width; confirms F2 behaviour
(requeue/drop/all-caught-up) not regressed.

## Risks

- Accuracy rounding: half-percent cases could read oddly; spec pins `Math.round` to whole
  percent - assert exact expected value in TC-005 (75%).
- Regressing F2's "All caught up at mount" path: the summary must gate on `reviewed > 0`, not on
  empty queue - TC-006 guards this; keep the existing F2 mount-completion tests green.

## Outcome (implemented + verified 2026-07-21)

Delivered on branch `20260720221710-study-session-summary`. All ACs met, 325 tests green
(18 in study-view.test.tsx incl. E-4 all-Again added post-verify), tsc + lint (0 errors) clean.
Live-verified in the running app at desktop and 375px mobile: active readout "reviewed N · M
left" and completion summary (per-rating breakdown + accuracy%) render correctly, layout intact,
F2 behaviour not regressed. Screenshots: `.pzielinski/F5/verify-{active,summary}-{desktop,mobile-375}.png`.

| AC | Test (tests/study-view.test.tsx) |
| -- | -------------------------------- |
| AC-001 | "should show reviewed 0 and 2 remaining..." / "should show reviewed 1 and 1 remaining..." |
| AC-002 | "should break down the ratings as Again 1 Hard 0 Good 1 Easy 0..." / "should count a same-day requeued card graded twice as two reviews..." |
| AC-003 | breakdown + "should show the completion summary and hide the card..." (100%) + "should report accuracy 75 percent..." + "should report accuracy 0 percent... every card graded Again" (E-4) |
| AC-004 | "should show no summary if the queue is empty at mount with zero grades" |
| AC-005 | "should show no progress readout or summary if the deck has no cards" |
| AC-006 | unchanged `StudyView` signature; all pre-existing F2 tests stay green |
