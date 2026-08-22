import type { Card, Deck } from "@/lib/workspace/model";

export const COLLECTION_FORMAT = "puredeck-collection";
export const COLLECTION_VERSION = 1;

export type CollectionParseResult =
  | { ok: true; decks: Deck[] }
  | { ok: false; message: string };

type StoredCard = Pick<Card, "id" | "front" | "back">;

type StoredDeck = { id: string; name: string; cards: StoredCard[] };

function toStoredCard(card: Card): StoredCard {
  return { id: card.id, front: card.front, back: card.back };
}

function toStoredDeck(deck: Deck): StoredDeck {
  return {
    id: deck.id,
    name: deck.name,
    cards: deck.cards.map(toStoredCard),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reject(message: string): CollectionParseResult {
  return { ok: false, message };
}

function parseStoredDeck(value: unknown): Deck | string {
  if (!isRecord(value)) {
    return "deck is not an object";
  }
  const { id, name, cards } = value;
  if (typeof id !== "string") {
    return "deck is missing a string id";
  }
  if (typeof name !== "string") {
    return "deck is missing a string name";
  }
  if (!Array.isArray(cards)) {
    return "deck is missing a cards array";
  }
  const parsedCards: StoredCard[] = [];
  for (const card of cards) {
    if (!isRecord(card)) {
      return "card is not an object";
    }
    const { id: cardId, front, back } = card;
    if (typeof cardId !== "string") {
      return "card is missing a string id";
    }
    if (typeof front !== "string") {
      return "card is missing a string front";
    }
    if (typeof back !== "string") {
      return "card is missing a string back";
    }
    parsedCards.push({ id: cardId, front, back });
  }
  return { id, name, cards: parsedCards };
}

export function serializeCollection(decks: Deck[]): string {
  const payload = {
    format: COLLECTION_FORMAT,
    version: COLLECTION_VERSION,
    decks: decks.map(toStoredDeck),
  };
  return JSON.stringify(payload, null, 2);
}

export function parseCollectionFile(raw: string): CollectionParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return reject("File is not valid JSON.");
  }
  if (!isRecord(parsed)) {
    return reject("File content is not a JSON object.");
  }
  if (parsed.format !== COLLECTION_FORMAT) {
    return reject(
      "File is not a puredeck collection export (format marker mismatch).",
    );
  }
  if (
    typeof parsed.version !== "number" ||
    parsed.version !== COLLECTION_VERSION
  ) {
    return reject("Unsupported puredeck collection version.");
  }
  if (!Array.isArray(parsed.decks)) {
    return reject("Collection file is missing a decks array.");
  }
  const decks: Deck[] = [];
  for (const entry of parsed.decks) {
    const deck = parseStoredDeck(entry);
    if (typeof deck === "string") {
      return reject(`Invalid collection file: ${deck}.`);
    }
    decks.push(deck);
  }
  return { ok: true, decks };
}
