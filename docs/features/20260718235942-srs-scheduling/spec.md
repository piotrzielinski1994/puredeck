# F2 - Spaced-repetition scheduling (real SRS)

Backlog: [.pzielinski/todos.md](../../../.pzielinski/todos.md) F2
Task file: [.pzielinski/F2/F2.md](../../../.pzielinski/F2/F2.md)

## Overview

Study grading is currently fake: all three buttons (Again/Hard/Good) call one `grade()`
that advances the card index modulo deck length - the grade is ignored and no review state
persists. This makes puredeck a card viewer, not a learning tool.

Make grading real via classic **SM-2** scheduling. A pure scheduler computes each card's
next interval, ease, and due date from the grade. Per-card review state persists to a
**separate** review-state store keyed by card id (deck files stay content-only). The study
session shows only **due** cards (Anki-style) and ends with an "All caught up" completion
state instead of looping forever.

Follows Anki defaults. Full sub-minute learning-step timers (1m/10m) are out of scope;
persistence is day-granularity and "learning" collapses to in-session requeue for `Again`.
Session-completion progress stats beyond "all caught up" remain F5.

## Acceptance Criteria

- AC-001: A pure `schedule(state, grade, today)` applies SM-2. Correct grades advance `reps`
  and grow `intervalDays` (reps 0 -> 1, reps 1 -> 6, else `round(interval * ease)`), set
  `due = today + intervalDays`, update `ease` via the SM-2 formula floored at 1.3, and never
  mutate the input.
- AC-002: The grade value changes the result - Again/Hard/Good from the same state produce
  measurably different review states.
- AC-003: `Again` resets `reps=0`, `intervalDays=0`, keeps `due=today`; `ease` still
  penalised (floored 1.3).
- AC-004: Per-card review state persists to a separate `ReviewStore` port
  (`review-state.json` in-app, in-memory in dev/test), keyed by card id; `Card`/`Deck` model
  and deck JSON unchanged.
- AC-005: The study session shows only due cards, in deck order (due = no review state OR
  `due <= today`).
- AC-006: `Again` re-queues the card to the end of the current in-session queue; `Hard`/`Good`
  remove it from the session.
- AC-007: When no due cards remain, `StudyView` shows an "All caught up" completion state.
- AC-008: Review state round-trips through the store; corrupt/partial persisted entries are
  defaulted/ignored (no crash); orphan entries for deleted cards are tolerated.

## User Test Cases

- TC-001 new-card + Good -> reps 1, interval 1, due today+1, ease 2.5. (AC-001/002)
- TC-002 interval growth: Good at reps 1 -> 6; Good at reps 2/interval 6/ease 2.5 -> 15. (AC-001)
- TC-003 new-card + Hard -> interval 1, ease penalised (~2.36) != Good. (AC-001/002)
- TC-004 review card + Again -> reps 0, interval 0, due today, ease penalised. (AC-001/002/003)
- TC-005 repeated Again never drops ease below 1.3. (AC-001/003)
- TC-006 schedule returns new object; input unchanged. (AC-001)
- TC-007 buildStudyQueue returns only new + due cards, deck order. (AC-005)
- TC-008 all future-due -> empty queue. (AC-005/007)
- TC-009 StudyView: flip+Good twice over two due cards -> "All caught up", no grade buttons. (AC-005/006/007)
- TC-010 StudyView: Again on card 1 -> card 2 next, card 1 re-shown before completion. (AC-006)
- TC-011 store save then load returns equal map. (AC-004/008)
- TC-012 load over corrupt/partial data drops invalid, defaults missing, no throw. (AC-008)
- TC-013 gradeCard via context saves updated map + updates exposed reviews. (AC-004/008)

## UI States

| State                     | Behavior                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| Loading                   | Existing async load; queue built once decks + reviews loaded.       |
| Empty (deck no cards)     | Existing "No cards to study." (unchanged).                          |
| Empty (cards, none due)   | "All caught up" completion (new).                                   |
| Success                   | Due card shown; grade reschedules + persists; advances to next due. |

## Data Model

```ts
type Grade = "Again" | "Hard" | "Good";
type CardReview = { ease: number; intervalDays: number; reps: number; due: string /*ISO date*/ };
type ReviewMap = Record<string /*cardId*/, CardReview>;
```

Default new card: `{ ease: 2.5, intervalDays: 0, reps: 0, due: today }`. SM-2 quality map
Again=2 / Hard=3 / Good=4. `today` injected as ISO `YYYY-MM-DD` (lexicographic ==
chronological). `Card`/`Deck` model unchanged; deck JSON content-only.

## Edge Cases

- E-1: New card (no review entry) is always due.
- E-2: Ease floored at 1.3 under repeated Again.
- E-3: Again keeps card due today + re-queued this session.
- E-4: All cards future-due -> completion state, empty session.
- E-5: Corrupt/partial persisted review entry -> defaulted, no crash.
- E-6: Orphan review entry (card deleted via F1) -> tolerated; queue is built from deck cards.
- E-7: `schedule` is pure - never mutates input, no `Date` inside (time injected).

## Dependencies

- Builds on F1's writable-store infra pattern (separate-store seam mirrors keymap.json).
- Unblocks F5 (session completion/stats build on the queue + completion state).
- Algorithm choice (SM-2) logged to [docs/adr.md](../../adr.md).
