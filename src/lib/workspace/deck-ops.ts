import type { Card, Deck } from "@/lib/workspace/model";

export function newDeck(name: string): Deck {
  return { id: crypto.randomUUID(), name, cards: [] };
}

export function uniqueDeckName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    return base;
  }
  const nextSuffix = (start: number): string => {
    const candidate = `${base} ${start}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
    return nextSuffix(start + 1);
  };
  return nextSuffix(2);
}

export function withDeckUpserted(decks: Deck[], deck: Deck): Deck[] {
  const exists = decks.some((existing) => existing.id === deck.id);
  if (!exists) {
    return [...decks, deck];
  }
  return decks.map((existing) => (existing.id === deck.id ? deck : existing));
}

export function withDeckRemoved(decks: Deck[], id: string): Deck[] {
  return decks.filter((deck) => deck.id !== id);
}

export function withCardEdited(
  deck: Deck,
  cardId: string,
  patch: Partial<Pick<Card, "front" | "back">>,
): Deck {
  return {
    ...deck,
    cards: deck.cards.map((card) =>
      card.id === cardId ? { ...card, ...patch } : card,
    ),
  };
}

export function withCardAdded(deck: Deck, front: string, back: string): Deck {
  return {
    ...deck,
    cards: [...deck.cards, { id: crypto.randomUUID(), front, back }],
  };
}

export function withCardRemoved(deck: Deck, cardId: string): Deck {
  return {
    ...deck,
    cards: deck.cards.filter((card) => card.id !== cardId),
  };
}
