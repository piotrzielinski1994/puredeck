import { describe, expect, it } from "vitest";
import { createCollectionStore } from "@/lib/workspace/collection-store-factory";
import { SEED_DECKS } from "@/lib/workspace/demo-data";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import type { Deck } from "@/lib/workspace/model";

function names(decks: Deck[]): string[] {
  return decks.map((deck) => deck.name);
}

describe("SEED_DECKS starter set (AC-008 / E-1)", () => {
  it("should expose exactly one demo deck named Spanish", () => {
    expect(SEED_DECKS).toHaveLength(1);
    expect(SEED_DECKS[0].name).toBe("Spanish");
  });
});

describe("createInMemoryCollectionStore empty seed (AC-008 / E-1)", () => {
  it("should seed exactly one Spanish deck if the root is empty", async () => {
    const store = createInMemoryCollectionStore();

    const decks = await store.load();

    expect(decks).toHaveLength(1);
    expect(names(decks)).toEqual(["Spanish"]);
  });

  it("should write exactly one file and not grow the map on a repeated load", async () => {
    const files: Record<string, string> = {};
    const store = createInMemoryCollectionStore(files);

    await store.load();
    const afterFirst = Object.keys(files).length;
    await store.load();
    const afterSecond = Object.keys(files).length;

    expect(afterFirst).toBe(1);
    expect(afterSecond).toBe(1);
  });
});

describe("createCollectionStore factory fallback (E-5)", () => {
  it("should return exactly one Spanish deck in a non-Tauri env", async () => {
    const decks = await createCollectionStore().load();

    expect(decks).toHaveLength(1);
    expect(names(decks)).toEqual(["Spanish"]);
  });
});
