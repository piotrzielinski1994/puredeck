import { describe, expect, it } from "vitest";
import {
  COLLECTION_FORMAT,
  COLLECTION_VERSION,
  parseCollectionFile,
  serializeCollection,
} from "@/lib/deck/import-export/collection-file";
import type { Deck } from "@/lib/workspace/model";

const deckSpanish: Deck = {
  id: "spanish",
  name: "Spanish",
  cards: [
    { id: "es1", front: "hola", back: "hello" },
    { id: "es2", front: "gato", back: "cat" },
  ],
};

const deckCapitals: Deck = {
  id: "capitals",
  name: "Capitals",
  cards: [{ id: "cap1", front: "France", back: "Paris" }],
};

const emptyDeck: Deck = { id: "empty", name: "Empty", cards: [] };

const gnarlyDeck: Deck = {
  id: "gnarly",
  name: 'Gnarly "quotes" & \\backslashes\\',
  cards: [
    {
      id: "g1",
      front: '# Title ą\n\n- 日本語 item\n- with "quotes" and \\ and tabs',
      back: 'multiline **markdown**\n```code```\nąęółżćń 日本語 "quoted" \\ literal',
    },
  ],
};

function validEnvelope(): Record<string, unknown> {
  return {
    format: "puredeck-collection",
    version: 1,
    decks: [JSON.parse(JSON.stringify(deckSpanish))],
  };
}

function expectRejected(raw: string): void {
  const result = parseCollectionFile(raw);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.message.length).toBeGreaterThan(0);
  }
}

describe("collection file envelope constants (AC-001)", () => {
  it("should declare the puredeck-collection format marker at version 1", () => {
    expect(COLLECTION_FORMAT).toBe("puredeck-collection");
    expect(COLLECTION_VERSION).toBe(1);
  });
});

describe("serializeCollection envelope and order (AC-001 / TC-001)", () => {
  it("should wrap a multi-deck collection in a puredeck-collection v1 envelope preserving deck order", () => {
    const raw = serializeCollection([deckSpanish, deckCapitals]);
    const parsed = JSON.parse(raw);

    expect(parsed.format).toBe("puredeck-collection");
    expect(parsed.version).toBe(1);
    expect(parsed.decks).toHaveLength(2);
    expect(parsed.decks.map((deck: { id: string }) => deck.id)).toEqual([
      "spanish",
      "capitals",
    ]);
    expect(parsed.decks.map((deck: { name: string }) => deck.name)).toEqual([
      "Spanish",
      "Capitals",
    ]);
  });

  it("should keep every card carrying exactly id, front, and back inside the decks array", () => {
    const parsed = JSON.parse(serializeCollection([deckSpanish]));
    const [deck] = parsed.decks;

    expect(deck.name).toBe("Spanish");
    expect(deck.cards).toEqual(deckSpanish.cards);
    for (const card of deck.cards) {
      expect(Object.keys(card).sort()).toEqual(["back", "front", "id"]);
    }
  });
});

describe("serializeCollection scheduling exclusion (AC-002 / TC-002)", () => {
  it("should emit no scheduling fields even when studied deck objects carry them upstream", () => {
    const studied = [
      {
        ...deckSpanish,
        cards: deckSpanish.cards.map((card) => ({
          ...card,
          stability: 5.5,
          difficulty: 4.5,
          due: "2026-08-22T00:00:00.000Z",
          state: 2,
          reps: 7,
          lapses: 1,
        })),
      },
    ] as unknown as Deck[];

    const raw = serializeCollection(studied);

    for (const token of [
      "stability",
      "difficulty",
      '"due"',
      '"state"',
      '"reps"',
      '"lapses"',
    ]) {
      expect(raw).not.toContain(token);
    }
    const parsed = JSON.parse(raw);
    for (const card of parsed.decks[0].cards) {
      expect(Object.keys(card)).toHaveLength(3);
    }
  });
});

describe("serialize/parse round-trip (AC-003 / TC-003)", () => {
  it("should parse serialized collections back into a deep-equal deck list across boundary fixtures", () => {
    const sources: Deck[][] = [
      [],
      [emptyDeck],
      [gnarlyDeck],
      [deckSpanish, deckCapitals, gnarlyDeck],
    ];

    for (const source of sources) {
      expect(parseCollectionFile(serializeCollection(source))).toEqual({
        ok: true,
        decks: source,
      });
    }
  });

  it("should re-export byte-identical content after a full round-trip", () => {
    const source = [deckSpanish, emptyDeck, gnarlyDeck];
    const first = serializeCollection(source);

    const parsed = parseCollectionFile(first);
    if (!parsed.ok) {
      throw new Error(`fixture failed to parse: ${parsed.message}`);
    }

    expect(serializeCollection(parsed.decks)).toBe(first);
  });
});

describe("parseCollectionFile validation (AC-006 / TC-006 / TC-007 / TC-008)", () => {
  it("should reject unparseable JSON with an explanatory message", () => {
    expectRejected("{ not json at all");
  });

  it("should reject a root that is not a JSON object such as an array", () => {
    expectRejected(JSON.stringify([deckSpanish]));
    expectRejected(JSON.stringify("just a string"));
    expectRejected(JSON.stringify(42));
  });

  it("should reject a payload whose format marker is wrong", () => {
    const payload = validEnvelope();
    payload.format = "some-other-app";
    expectRejected(JSON.stringify(payload));
  });

  it("should reject a payload whose format marker is missing", () => {
    const payload = validEnvelope();
    delete payload.format;
    expectRejected(JSON.stringify(payload));
  });

  it("should reject a payload whose version is wrong", () => {
    const payload = validEnvelope();
    payload.version = 2;
    expectRejected(JSON.stringify(payload));
  });

  it("should reject a payload whose version is missing", () => {
    const payload = validEnvelope();
    delete payload.version;
    expectRejected(JSON.stringify(payload));
  });

  it("should reject a deck that misses id, name, or cards", () => {
    for (const key of ["id", "name", "cards"]) {
      const payload = validEnvelope();
      const decks = payload.decks as Array<Record<string, unknown>>;
      delete decks[0][key];
      expectRejected(JSON.stringify(payload));
    }
  });

  it("should reject a card that misses id, front, or back", () => {
    for (const key of ["id", "front", "back"]) {
      const payload = validEnvelope();
      const decks = payload.decks as Array<{
        cards: Array<Record<string, unknown>>;
      }>;
      delete decks[0].cards[0][key];
      expectRejected(JSON.stringify(payload));
    }
  });
});

describe("empty collection boundary (AC-008 / TC-010)", () => {
  it("should serialize an empty collection to a valid file with an empty decks array and parse it back as none", () => {
    const raw = serializeCollection([]);

    expect(JSON.parse(raw).decks).toEqual([]);
    expect(parseCollectionFile(raw)).toEqual({ ok: true, decks: [] });
  });
});
