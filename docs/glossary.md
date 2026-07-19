# Glossary

Ubiquitous-language terms for puredeck. One entry per domain concept: what it IS (not what it does), plus an `_Avoid_:` line listing aliases not to use. Domain terms only - not general programming concepts. `pz-implement` appends here as terms get sharpened.

## Terms

<!-- Format:
### Term
One-or-two-sentence definition of what it IS.
_Avoid_: alias1, alias2
-->

### Card
A single unit of study: a front (prompt) and a back (answer) that a learner reviews.
_Avoid_: note, item, flashcard (use "card").

### Deck
A named, ordered collection of cards that are studied together.
_Avoid_: collection, set, pack.

### Collection
The on-disk persistence root: a directory (`collections/`) holding one JSON file per deck (`<deck-slug>.json`). "Collection" names the *storage location for all decks*, never a single deck (that is a [[Deck]]).
_Avoid_: workspace, library, vault, folder (use "collection" for the decks directory).

### Slug
The filesystem-safe identifier derived from a deck name (lowercase, non-alphanumerics to `-`), used as the deck's on-disk file stem (`<slug>.json`) and de-duplicated within a collection.
_Avoid_: filename, key, path.

### Review state
The per-[[Card]] FSRS memory record the [[Scheduler]] keeps: stability, difficulty, due instant, card state (New/Learning/Review/Relearning), reps, and lapses. Persisted separately from card content, keyed by card id (Date fields as ISO strings). This is the `ts-fsrs` `Card` type.
_Avoid_: progress, srs data, ease/interval (SM-2 terms - FSRS uses stability/difficulty).

### Grade
The learner's self-rated recall on a reviewed [[Card]] - one of `Again`, `Hard`, `Good`, `Easy` - fed to the [[Scheduler]] to compute the next [[Review state]]. FSRS rating codes Again=1 / Hard=2 / Good=3 / Easy=4; `Again` is the only lapse.
_Avoid_: score, answer, difficulty (difficulty is an FSRS state variable, not the grade).

### Due
A [[Card]] is *due* when it has no [[Review state]] (new) or its stored due instant is at/before now, compared at datetime (sub-day) granularity. The study session studies only due cards.
_Avoid_: pending, ready, scheduled.

### Scheduler
The FSRS-6 engine (from the `ts-fsrs` library) that maps a [[Review state]] + a [[Grade]] + the current instant to the next review state and a [[Revlog]] entry. Owns all stability/difficulty/interval math; the repo wraps it behind a thin `fsrs.ts` seam with injected time.
_Avoid_: algorithm, planner, srs engine, SM-2.

### Revlog
The append-only review history: one entry per [[Grade]] (rating, prior state, stability/difficulty, elapsed/scheduled days, review instant), tagged with the [[Card]] id. Persisted separately (`review-log.json`); feeds future stats and FSRS parameter optimization, never the current scheduling decision.
_Avoid_: log, audit, history table.
