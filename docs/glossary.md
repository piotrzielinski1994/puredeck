# Glossary

Ubiquitous-language terms for PureDeck. One entry per domain concept: what it IS (not what it does), plus an `_Avoid_:` line listing aliases not to use. Domain terms only - not general programming concepts. `pz-implement` appends here as terms get sharpened.

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
