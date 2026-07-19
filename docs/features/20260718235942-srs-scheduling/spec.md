# F2 - Spaced-repetition scheduling (FSRS, real SRS)

Backlog: [.pzielinski/todos.md](../../../.pzielinski/todos.md) F2
Task file: [.pzielinski/F2/F2.md](../../../.pzielinski/F2/F2.md)

> **Supersedes the SM-2 draft of this feature.** Anki's actual default scheduler is **FSRS-6**
> (since Anki 25.07), so "behave exactly like Anki" means FSRS, not SM-2. This spec replaces
> the SM-2 scheduler with FSRS-6 via the `ts-fsrs` library. Reverses ADR 2026-07-19 (SM-2)
> and the day-granularity part of ADR 2026-07-17.

## Overview

Make study grading real using **FSRS-6** - the algorithm Anki ships - via `ts-fsrs`
(v5.4.1, MIT, zero runtime deps, maintained by the same org as Anki's Rust engine). Each
card keeps an FSRS memory state (stability, difficulty, due, state, reps, lapses); grading
one of four ratings (Again/Hard/Good/Easy) runs `ts-fsrs` to compute the next state and a
review-log entry. Per-card state persists to a separate review-state store; the full review
history (revlog) persists append-only to a separate review-log store. The study session
shows only due cards and ends with "All caught up".

Faithful-to-Anki choices: FSRS-6 default parameters (21 weights), desired retention 0.9,
max interval 36500 days, 4 rating buttons, interval **fuzz ON** (seeded for deterministic
tests), and the **short-term learning-steps path ON** with sub-day (datetime) due dates.

Out of scope: the FSRS parameter **optimizer** (training custom weights from the revlog) -
default weights only; the revlog is stored now so an optimizer can train later (F5+).

## Acceptance Criteria

- AC-001: A `gradeReview(scheduler, card, rating, now)` wrapper drives `ts-fsrs` FSRS-6:
  given a card's FSRS state (or a fresh card for a never-seen card) + a rating + the current
  instant, it returns the next FSRS `Card` (updated stability, difficulty, due, state, reps,
  lapses, last_review) and a review-log entry. The scheduler is configured with FSRS-6
  defaults: the 21-weight `default_w`, `request_retention` 0.9, `maximum_interval` 36500.
- AC-002: All four ratings are supported (Again=1, Hard=2, Good=3, Easy=4) and produce
  distinct next states from the same input; Again is the only lapse and increments `lapses`
  for a card in the Review state; over a graduated card, Easy yields a later `due` than Good,
  Good later than Hard.
- AC-003: Scheduling is deterministic under seeded fuzz - `enable_fuzz: true` with a card-id
  seed strategy - so the same (card, rating, now) always yields the same `due` (Anki-style
  jitter present, but reproducible in tests).
- AC-004: Per-card FSRS state persists to a separate `ReviewStore` (`review-state.json`),
  keyed by card id, with Date fields serialized as ISO strings; on load, ISO strings are
  revived to Dates and corrupt/partial entries are dropped/defaulted without throwing. The
  `Card`/`Deck` content model and deck JSON files are unchanged.
- AC-005: The full review history persists append-only to a separate `RevlogStore`
  (`review-log.json`): every grade appends one entry tagged with the card id
  (`{ cid, rating, state, due, stability, difficulty, elapsed_days, last_elapsed_days,
  scheduled_days, learning_steps, review }`). Corrupt persisted history is tolerated.
- AC-006: The study session shows only due cards - a card is due if it has no FSRS state
  (new) or its `due <= now`, compared at datetime (sub-day) granularity, in deck order.
- AC-007: Grading advances the session. A card whose new `due` still falls within the
  current session day (learning steps keep it due today) returns to the back of the session
  queue; a card scheduled for a later day leaves the session. When no session cards remain,
  `StudyView` shows an "All caught up" completion state.
- AC-008: `StudyView` renders four grade buttons (Again/Hard/Good/Easy) after the card is
  flipped; clicking one calls `onGrade(cardId, rating)` and persists via the workspace.

## User Test Cases

- TC-001 new card + Good -> reps 1, stability>0, a log entry returned; new-card path uses a
  fresh FSRS card. (AC-001)
- TC-002 four ratings from the same graduated card -> four distinct `due`s with
  due(Easy) > due(Good) > due(Hard); Again increments lapses and is the lapse. (AC-002)
- TC-003 determinism: grade the same (card, rating, now) twice with the seeded scheduler ->
  identical `due`. (AC-003)
- TC-004 review-store round-trip: save a map of FSRS cards, load -> Dates revived, equal
  state; a later `load()` returns the saved cards. (AC-004)
- TC-005 mergeReviews over corrupt/partial/orphan persisted data -> drops invalid, revives
  valid, never throws. (AC-004)
- TC-006 revlog append: two grades -> `load()` returns both entries in order, each tagged
  with its card id. (AC-005)
- TC-007 mergeRevlog over corrupt data -> returns only well-formed entries, no throw. (AC-005)
- TC-008 buildStudyQueue with new / due-now / future cards (datetime) -> only new+due, deck
  order. (AC-006)
- TC-009 all future-due -> empty queue -> completion at mount. (AC-006/007)
- TC-010 StudyView completion: grade every due card until none remain today -> "All caught
  up", no grade buttons. (AC-007)
- TC-011 StudyView requeue-vs-drop: a card whose new due is still today is re-shown later
  this session; one graduated to a future day is not. (AC-007)
- TC-012 StudyView renders 4 buttons; clicking Easy calls onGrade(cardId, "Easy"/4). (AC-008)
- TC-013 gradeCard via context: persists the scheduled card to reviewStore AND appends a
  revlog entry to revlogStore; exposes updated `reviews`. (AC-004/005)

## UI States

| State                   | Behavior                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Loading                 | Existing async load; queue built once decks + reviews loaded.       |
| Empty (deck no cards)   | Existing "No cards to study." (unchanged).                          |
| Empty (cards, none due) | "All caught up" completion.                                         |
| Success                 | Due card shown; grade reschedules (FSRS) + persists state + revlog; advances. |

## Data Model

FSRS state and log come from `ts-fsrs` (not hand-defined):

```ts
import type { Card, ReviewLog } from "ts-fsrs";
// Card = { due: Date; stability; difficulty; elapsed_days; scheduled_days;
//          reps; lapses; learning_steps; state: State; last_review?: Date }
type ReviewMap = Record<string /*cardId*/, Card>;   // persisted with ISO date strings
type RevlogEntry = { cid: string } & ReviewLog;     // one per grade
type Revlog = RevlogEntry[];                         // append-only history
```

Ratings: `Rating.Again=1 / Hard=2 / Good=3 / Easy=4` (ts-fsrs enum). Scheduler params:
`w = default_w` (21 weights, w20=0.1542 decay), `request_retention = 0.9`,
`maximum_interval = 36500`, `enable_fuzz = true` (seeded via card-id strategy),
`enable_short_term = true`, default learning/relearning steps. `now` is injected (`Date`)
so scheduling/queue are deterministic in tests. `Card`/`Deck` content model unchanged.

## Edge Cases

- E-1: New card (no FSRS state) is always due; grading it creates its state.
- E-2: Again over a Review-state card -> Relearning, lapses+1, due minutes away (same day).
- E-3: New card graded Good -> learning step (due +10min, same day) -> stays in session
  until it graduates (Anki learning-steps behaviour).
- E-4: All cards scheduled future -> completion state, empty session.
- E-5: Corrupt/partial persisted FSRS card or revlog entry -> defaulted/dropped, no crash.
- E-6: Orphan review/revlog entry (card deleted via F1) -> tolerated; queue built from deck.
- E-7: Determinism - fuzz seeded per card id; no unseeded RNG or bare `Date` inside pure fns.
- E-8: Sub-day due - a card due later today (learning) is not due "now" for the queue but
  re-appears in-session per AC-007.

## Dependencies

- Adds runtime dependency `ts-fsrs` (first SRS dep; MIT, zero runtime deps).
- Reverses ADR 2026-07-19 (SM-2) and the day-granularity of ADR 2026-07-17.
- Reuses F1's writable-store seam pattern (separate stores mirror keymap.json).
- Unblocks F5 (stats/optimizer train on the revlog).
