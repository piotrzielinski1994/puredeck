import { describe, expect, it } from "vitest";
import {
  newDeck,
  uniqueDeckName,
  withCardAdded,
  withCardEdited,
  withCardRemoved,
  withDeckRemoved,
  withDeckUpserted,
} from "@/lib/workspace/deck-ops";
import type { Deck } from "@/lib/workspace/model";

function makeDeck(): Deck {
  return {
    id: "es",
    name: "Spanish",
    cards: [
      { id: "c1", front: "hola", back: "hello" },
      { id: "c2", front: "gato", back: "cat" },
    ],
  };
}

describe("withCardEdited (TC-007 / AC-001)", () => {
  it("should return a deck whose target card carries the patched front", () => {
    const deck = makeDeck();

    const next = withCardEdited(deck, "c1", { front: "buenos" });

    expect(next.cards.find((card) => card.id === "c1")).toEqual({
      id: "c1",
      front: "buenos",
      back: "hello",
    });
  });

  it("should patch only the fields present in the patch, leaving others intact", () => {
    const deck = makeDeck();

    const next = withCardEdited(deck, "c2", { back: "feline" });

    expect(next.cards.find((card) => card.id === "c2")).toEqual({
      id: "c2",
      front: "gato",
      back: "feline",
    });
  });

  it("should leave non-target cards unchanged", () => {
    const deck = makeDeck();

    const next = withCardEdited(deck, "c1", { front: "buenos" });

    expect(next.cards.find((card) => card.id === "c2")).toEqual({
      id: "c2",
      front: "gato",
      back: "cat",
    });
  });

  it("should not mutate the input deck or its cards", () => {
    const deck = makeDeck();
    const pristine = makeDeck();

    withCardEdited(deck, "c1", { front: "buenos" });

    expect(deck).toEqual(pristine);
  });
});

describe("withCardAdded (TC-007 / AC-004)", () => {
  it("should append a new card carrying the given front and back", () => {
    const deck = makeDeck();

    const next = withCardAdded(deck, "perro", "dog");

    expect(next.cards).toHaveLength(deck.cards.length + 1);
    const added = next.cards[next.cards.length - 1];
    expect(added.front).toBe("perro");
    expect(added.back).toBe("dog");
  });

  it("should assign the new card a fresh non-empty id differing from existing ids", () => {
    const deck = makeDeck();

    const next = withCardAdded(deck, "perro", "dog");
    const added = next.cards[next.cards.length - 1];

    expect(typeof added.id).toBe("string");
    expect(added.id.length).toBeGreaterThan(0);
    expect(deck.cards.map((card) => card.id)).not.toContain(added.id);
  });

  it("should not mutate the input deck or its cards", () => {
    const deck = makeDeck();
    const pristine = makeDeck();

    withCardAdded(deck, "perro", "dog");

    expect(deck).toEqual(pristine);
  });
});

describe("withCardRemoved (TC-007 / AC-003)", () => {
  it("should return a deck without the removed card", () => {
    const deck = makeDeck();

    const next = withCardRemoved(deck, "c1");

    expect(next.cards.map((card) => card.id)).toEqual(["c2"]);
  });

  it("should not mutate the input deck or its cards", () => {
    const deck = makeDeck();
    const pristine = makeDeck();

    withCardRemoved(deck, "c1");

    expect(deck).toEqual(pristine);
  });
});

describe("uniqueDeckName (AC-002 / TC-001 / E-3)", () => {
  it("should return the base unchanged if it is not already taken", () => {
    expect(uniqueDeckName("New Deck", new Set<string>())).toBe("New Deck");
  });

  it("should append 2 if the base name is already taken", () => {
    expect(uniqueDeckName("New Deck", new Set(["New Deck"]))).toBe(
      "New Deck 2",
    );
  });

  it("should skip taken suffixes and pick the next free number", () => {
    expect(
      uniqueDeckName("New Deck", new Set(["New Deck", "New Deck 2"])),
    ).toBe("New Deck 3");
  });
});

describe("withDeckUpserted (AC-005)", () => {
  it("should replace the matching deck by id and keep list length", () => {
    const decks: Deck[] = [
      { id: "a", name: "Alpha", cards: [] },
      { id: "b", name: "Beta", cards: [] },
    ];

    const next = withDeckUpserted(decks, {
      id: "b",
      name: "Renamed",
      cards: [{ id: "x", front: "f", back: "b" }],
    });

    expect(next).toHaveLength(2);
    expect(next.find((deck) => deck.id === "b")).toEqual({
      id: "b",
      name: "Renamed",
      cards: [{ id: "x", front: "f", back: "b" }],
    });
  });

  it("should append the deck if no existing deck shares its id", () => {
    const decks: Deck[] = [{ id: "a", name: "Alpha", cards: [] }];

    const next = withDeckUpserted(decks, { id: "c", name: "Gamma", cards: [] });

    expect(next.map((deck) => deck.id)).toEqual(["a", "c"]);
  });

  it("should not mutate the input list", () => {
    const decks: Deck[] = [{ id: "a", name: "Alpha", cards: [] }];
    const pristine: Deck[] = [{ id: "a", name: "Alpha", cards: [] }];

    withDeckUpserted(decks, { id: "c", name: "Gamma", cards: [] });

    expect(decks).toEqual(pristine);
  });
});

describe("withDeckRemoved (AC-008)", () => {
  it("should filter out the deck with the matching id", () => {
    const decks: Deck[] = [
      { id: "a", name: "Alpha", cards: [] },
      { id: "b", name: "Beta", cards: [] },
    ];

    expect(withDeckRemoved(decks, "a").map((deck) => deck.id)).toEqual(["b"]);
  });

  it("should return an equal list if the id is not present", () => {
    const decks: Deck[] = [{ id: "a", name: "Alpha", cards: [] }];

    expect(withDeckRemoved(decks, "missing").map((deck) => deck.id)).toEqual([
      "a",
    ]);
  });
});

describe("newDeck (AC-001)", () => {
  it("should build a deck carrying the given name with no cards", () => {
    const deck = newDeck("Fresh");

    expect(deck.name).toBe("Fresh");
    expect(deck.cards).toEqual([]);
  });

  it("should assign a fresh non-empty id and distinct ids across calls", () => {
    const first = newDeck("A");
    const second = newDeck("B");

    expect(typeof first.id).toBe("string");
    expect(first.id.length).toBeGreaterThan(0);
    expect(first.id).not.toBe(second.id);
  });
});
