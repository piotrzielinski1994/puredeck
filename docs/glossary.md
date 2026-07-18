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
The per-[[Card]] scheduling record the SRS keeps: ease, interval (days), consecutive-correct reps, and the due date. Persisted separately from card content, keyed by card id.
_Avoid_: progress, history, stats, srs data.

### Grade
The learner's self-rated recall on a reviewed [[Card]] - one of `Again`, `Hard`, `Good` - fed to the scheduler to compute the next [[Review state]]. Maps to SM-2 quality Again=2 / Hard=3 / Good=4.
_Avoid_: rating, score, answer, difficulty.

### Due
A [[Card]] is *due* when it has no [[Review state]] (new) or its stored due date is on/before today. The study session studies only due cards.
_Avoid_: pending, ready, scheduled.

### Scheduler
The pure SM-2 function that maps a [[Review state]] + a [[Grade]] + today to the next review state. Owns all interval/ease math; holds no IO or time of its own.
_Avoid_: algorithm, planner, srs engine.
