import { describe, expect, it } from "vitest";
import {
  type CollectionStore,
  serializeDeck,
} from "@/lib/workspace/collection";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import type { Deck } from "@/lib/workspace/model";

type RemovableStore = CollectionStore & {
  remove: (deckId: string) => Promise<void>;
};

const deckA: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};

const deckB: Deck = {
  id: "b",
  name: "Beta",
  cards: [{ id: "b1", front: "dos", back: "two" }],
};

function makeStore(): RemovableStore {
  return createInMemoryCollectionStore({
    alpha: serializeDeck(deckA),
    beta: serializeDeck(deckB),
  }) as RemovableStore;
}

describe("createInMemoryCollectionStore remove (AC-011 / TC-009)", () => {
  it("should drop the matching deck so a later load returns only the survivor", async () => {
    const store = makeStore();

    await store.remove("a");
    const decks = await store.load();

    expect(decks.map((deck) => deck.id)).toEqual(["b"]);
  });

  it("should keep every deck and not throw if the id is unknown", async () => {
    const store = makeStore();

    await store.remove("missing");
    const decks = await store.load();

    expect(decks.map((deck) => deck.id).sort()).toEqual(["a", "b"]);
  });
});
