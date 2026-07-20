# F5 - Study session progress + completion summary

Backlog: [.pzielinski/todos.md](../../../.pzielinski/todos.md) F5
Feature folder: `docs/features/20260720221710-study-session-summary/`

> **Partial supersession note.** The original F5 backlog entry ("a study session never ends -
> loops forever, no cards-remaining/reviewed count, no summary") predates F2. F2 (FSRS) already
> shipped the finish line: `StudyView` builds a due-only queue, drops graded cards, and shows an
> "All caught up" completion state (AC-007). What remains, and what this spec delivers, is the
> **feedback** half: a live in-session progress readout and an Anki-style end-of-session summary
> (cards reviewed + per-rating breakdown + accuracy). No scheduling behaviour changes.

## Overview

Give the learner a sense of progress during a study session and a summary of what they got
through when it ends. During the session, replace the bare `{queue.length} due` line with a
progress readout: how many cards reviewed so far and how many remain. When the session ends
(queue empties after at least one grade), replace the plain "All caught up" text with a
completion **summary card** modelled on Anki's end-of-session screen: total cards reviewed and
a breakdown by rating (Again / Hard / Good / Easy), plus a recall accuracy percentage.

Session stats are **session-scoped** and **ephemeral** - they live only for the lifetime of one
`StudyView` mount (one deck's study session) and are not persisted. The durable review history
already lives in the revlog store (F2); this feature does not read or write it. A "reviewed"
counts each grade submitted, so a card that is graded, requeued the same day (learning step),
and graded again counts twice - matching how Anki counts reviews.

Out of scope: all-time / cross-session stats, per-deck history, streaks, retention curves,
charts, and time-spent - those would read the persisted revlog and belong to a later stats
feature, not F5. Time-spent is omitted (no session-start timestamp plumbing; YAGNI).

## Acceptance Criteria

- AC-001: During an active session, `StudyView` shows a live progress readout with the number
  of cards **reviewed** this session and the number **remaining** in the session queue. Before
  the first grade it reads reviewed 0. Each grade increments reviewed by 1; remaining reflects
  the current queue length (which may rise when a card is requeued same-day, or fall when a card
  graduates out).
- AC-002: `StudyView` tallies each submitted grade by rating (Again / Hard / Good / Easy) for
  the duration of the session. The tally increments on the same event that calls `onGrade`, so a
  requeued-then-regraded card contributes to the tally each time it is graded.
- AC-003: When the session queue empties **after at least one grade this session**, `StudyView`
  shows a completion **summary** that reports: total cards reviewed, the count for each of the
  four ratings, and an accuracy percentage. Accuracy = (reviewed - Again count) / reviewed,
  rounded to a whole percent; it is the share of grades that were not "Again" (recalled).
- AC-004: When the session queue is empty **at mount** (nothing was due, zero grades this
  session), `StudyView` shows the existing plain "All caught up / No cards due for review"
  message with **no** summary card and **no** stats - a summary appears only when the learner
  actually reviewed something.
- AC-005: The empty-deck state ("No cards to study.") is unchanged and shows no progress readout
  and no summary.
- AC-006: The summary and progress readout add no new props to `StudyView`, no new persistence,
  and no change to the grading/scheduling flow (`onGrade`, queue build, requeue-vs-drop) - stats
  are derived from grade events inside `StudyView`.

## User Test Cases

- TC-001 (progress at start): mount with 2 due cards, no grades yet -> readout shows reviewed 0
  and 2 remaining. Maps to: AC-001
- TC-002 (progress advances): grade the first card (drops to next day) -> readout shows reviewed
  1 and 1 remaining. Maps to: AC-001
- TC-003 (breakdown tally): grade card 1 Good (drops) and card 2 Again (drops) -> at completion
  the summary shows reviewed 2, Good 1, Again 1, Hard 0, Easy 0. Maps to: AC-002, AC-003
- TC-004 (requeue counts twice): grade card 1 Again where its new due is still today (requeued),
  then grade it again Good (drops), then grade card 2 Good (drops) -> summary shows reviewed 3
  (Again 1, Good 2). Maps to: AC-002, AC-003
- TC-005 (accuracy): grade 3 cards Good and 1 card Again (all drop) -> summary reviewed 4,
  accuracy 75%. Maps to: AC-003
- TC-006 (summary only after work): mount with the only card scheduled for a future day (zero
  due) -> plain "All caught up" message, no "reviewed"/breakdown/accuracy text. Maps to: AC-004
- TC-007 (empty deck unchanged): deck with no cards -> "No cards to study.", no progress readout,
  no summary. Maps to: AC-005
- TC-008 (completion after grading all): grade every due card until none remain today -> summary
  card is shown; the four grade buttons are gone and no card front is shown. Maps to: AC-003

## UI States

| State                        | Behavior                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Empty (deck has no cards)    | Existing "No cards to study." - unchanged, no progress, no summary. (AC-005)              |
| Caught up at mount (0 due)   | Existing "All caught up / No cards due for review." - no summary card. (AC-004)          |
| Active (card shown)          | Card + (after flip) 4 grade buttons + progress readout "reviewed N | M left". (AC-001)   |
| Completed (>=1 grade, 0 due) | Summary card: "reviewed N", per-rating breakdown, accuracy %. No card, no grade buttons.  |

### ASCII wireframes

Active session (progress readout replaces the old "N due" line):

```
+-----------------------------------------+
|                                         |
|   reviewed 1  |  1 left                 |   <- progress readout (top)
|                                         |
|      +---------------------------+      |
|      |                           |      |
|      |          hola             |      |   <- card front
|      |         ---------         |      |
|      |          hello            |      |   <- card back (after flip)
|      |                           |      |
|      +---------------------------+      |
|                                         |
|   [ Again ] [ Hard ] [ Good ] [ Easy ]  |   <- grade buttons (after flip)
|                                         |
+-----------------------------------------+
```

Completion summary (after grading every due card, >=1 grade this session):

```
+-----------------------------------------+
|                                         |
|            All caught up                |   <- heading (kept)
|      You reviewed 4 cards today.        |
|                                         |
|      Again  1     Hard   0              |
|      Good   3     Easy   0              |
|                                         |
|            Accuracy  75%                |
|                                         |
+-----------------------------------------+
```

## Data Model

No persisted model change. Session stats are ephemeral component state inside `StudyView`:

```ts
type SessionStats = {
  reviewed: number;                    // total grades this session
  byRating: Record<Grade, number>;     // Again/Hard/Good/Easy tallies (Grade = 1|2|3|4)
};
// accuracy = reviewed === 0 ? 0 : Math.round(((reviewed - byRating[Rating.Again]) / reviewed) * 100)
```

`Grade`, `Rating` come from `@/lib/study/fsrs` (already imported by `StudyView`). No new store,
no new `StudyView` prop, no revlog read.

## Edge Cases

- E-1: Zero due at mount -> no summary (AC-004); distinguishes "nothing was due" from "you
  finished a session". Guard on `reviewed > 0`, not on queue emptiness alone.
- E-2: Requeued same-day card graded twice -> counts as 2 reviews and 2 rating tallies (Anki
  counts reviews, not unique cards). (AC-002/TC-004)
- E-3: Accuracy with reviewed 0 -> not shown (only the caught-up-at-mount path reaches empty
  queue with reviewed 0); guard division by zero regardless.
- E-4: All grades were "Again" -> accuracy 0%; summary still shown.
- E-5: Deck changes / StudyView remounts (keyed by `deck.id` in `main.tsx`) -> stats reset to
  zero for the new session (fresh mount = fresh session). No cross-deck carryover.
- E-6: Single due card graded to a future day -> reviewed 1, remaining 0, summary shown.

## Dependencies

- Builds on F2 (FSRS): reuses the existing due-queue, requeue-vs-drop, and "All caught up"
  completion path in `StudyView`. No scheduling change.
- No new runtime dependency. No Rust / Tauri change. Frontend-only.
- Mobile: summary + progress are plain text blocks in the existing centered flex column; degrade
  to a narrow viewport with no new interaction. Touch unaffected (no new controls beyond text).
